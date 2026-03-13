/**
 * Cache Manager
 * Caches LLM responses to reduce API costs and improve performance
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import createLogger from '../../utils/logger.js';

const logger = createLogger('CacheManager');

class CacheManager {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      cacheDir: options.cacheDir || path.join(process.cwd(), '.cache/writing-agents'),
      ttl: options.ttl || 7 * 24 * 60 * 60 * 1000, // 7 days default
      maxSize: options.maxSize || 1000, // Max cached entries
      ...options
    };

    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      saves: 0,
      evictions: 0
    };

    this.initialized = false;
  }

  /**
   * Initialize cache manager
   */
  async init() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.options.cacheDir, { recursive: true });
      await this.loadFromFile();
      this.initialized = true;
      logger.debug('Cache manager initialized');
    } catch (error) {
      logger.warn('Failed to initialize cache:', error.message);
    }
  }

  /**
   * Generate cache key from prompt and options
   */
  generateKey(prompt, options = {}) {
    const data = JSON.stringify({ prompt, options });
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Get cached response
   */
  async get(prompt, options = {}) {
    if (!this.options.enabled) return null;

    await this.init();

    const key = this.generateKey(prompt, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.debug('Cache miss:', key);
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.options.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug('Cache entry expired:', key);
      return null;
    }

    this.stats.hits++;
    logger.debug('Cache hit:', key);
    return entry.response;
  }

  /**
   * Set cached response
   */
  async set(prompt, response, options = {}) {
    if (!this.options.enabled) return;

    await this.init();

    const key = this.generateKey(prompt, options);

    // Evict oldest if at max size
    if (this.cache.size >= this.options.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });

    this.stats.saves++;

    // Periodically save to disk
    if (this.stats.saves % 10 === 0) {
      await this.saveToFile();
    }
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      saves: 0,
      evictions: 0
    };
    await this.saveToFile();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(1) : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Load cache from file
   */
  async loadFromFile() {
    try {
      const cacheFile = path.join(this.options.cacheDir, 'cache.json');
      const data = await fs.readFile(cacheFile, 'utf-8');
      const loaded = JSON.parse(data);

      // Restore cache entries
      for (const [key, entry] of Object.entries(loaded)) {
        // Skip expired entries
        if (Date.now() - entry.timestamp <= this.options.ttl) {
          this.cache.set(key, entry);
        }
      }

      logger.debug(`Loaded ${this.cache.size} cache entries from disk`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.debug('No cache file found, starting fresh');
      }
    }
  }

  /**
   * Save cache to file
   */
  async saveToFile() {
    try {
      const cacheFile = path.join(this.options.cacheDir, 'cache.json');
      const data = Object.fromEntries(this.cache);
      await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
      logger.debug(`Saved ${this.cache.size} cache entries to disk`);
    } catch (error) {
      logger.warn('Failed to save cache to disk:', error.message);
    }
  }

  /**
   * Clean expired entries
   */
  async cleanExpired() {
    await this.init();

    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      await this.saveToFile();
      logger.info(`Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }
}

// Singleton instance
let instance = null;

/**
 * Get cache manager instance
 */
export function getCacheManager(options) {
  if (!instance) {
    instance = new CacheManager(options);
  }
  return instance;
}

export default CacheManager;
