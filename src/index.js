import dotenv from 'dotenv';
import createLogger from './utils/logger.js';
import rssFetch from './fetchers/rss.js';
import redditFetch from './fetchers/reddit.js';
import hnFetch from './fetchers/hackernews.js';
import apiFetch from './fetchers/api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import defaultConfig from '../config/sources.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger('Main');

/**
 * Scrape function - exports for library use.
 * @param {Object} options
 * @param {boolean} options.toSupabase - Save results to Supabase
 * @param {string} options.supabaseUrl - Supabase URL
 * @param {string} options.supabaseKey - Supabase service key
 * @param {boolean} options.saveToFilesystem - Save to local files (default: true)
 */
async function scrape(options = {}) {
  const {
    toSupabase = false,
    supabaseUrl,
    supabaseKey,
    saveToFilesystem = true,
  } = options;

  const config = loadConfig();
  const today = getDateString();
  const results = {
    date: today,
    scraped_at: new Date().toISOString(),
    sources: {},
    items: [],
  };

  // Initialize Supabase if needed
  let supabase = null;
  if (toSupabase && supabaseUrl && supabaseKey) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
  }

  // RSS Feeds
  if (config.rssFeeds && config.rssFeeds.length > 0) {
    logger.info('📰 Fetching from RSS feeds...');
    try {
      const rssItems = await rssFetch(config);
      results.sources.rss = rssItems.length;
      results.items.push(...rssItems);
      if (saveToFilesystem) await saveSourceData('rss', rssItems, today);
      logger.success(`✅ RSS: ${rssItems.length} items`);
    } catch (error) {
      logger.error(`RSS fetch failed: ${error.message}`);
      results.sources.rss = 0;
    }
  }

  // Reddit
  if (config.trendingSources?.reddit?.enabled) {
    logger.info('📱 Fetching from Reddit...');
    try {
      const redditItems = await redditFetch(config);
      results.sources.reddit = redditItems.length;
      results.items.push(...redditItems);
      if (saveToFilesystem) await saveSourceData('reddit', redditItems, today);
      logger.success(`✅ Reddit: ${redditItems.length} items`);
    } catch (error) {
      logger.error(`Reddit fetch failed: ${error.message}`);
      results.sources.reddit = 0;
    }
  }

  // Hacker News
  if (config.trendingSources?.hackernews?.enabled) {
    logger.info('📰 Fetching from Hacker News...');
    try {
      const hnItems = await hnFetch(config);
      results.sources.hackernews = hnItems.length;
      results.items.push(...hnItems);
      if (saveToFilesystem) await saveSourceData('hackernews', hnItems, today);
      logger.success(`✅ Hacker News: ${hnItems.length} items`);
    } catch (error) {
      logger.error(`Hacker News fetch failed: ${error.message}`);
      results.sources.hackernews = 0;
    }
  }

  // Generic API sources
  for (const source of (config.apiSources || [])) {
    if (!source.enabled) continue;
    logger.info(`🔌 Fetching from ${source.name}...`);
    try {
      const items = await apiFetch(source);
      results.sources[source.id] = items.length;
      results.items.push(...items);
      if (saveToFilesystem) await saveSourceData(source.id, items, today);
      logger.success(`✅ ${source.name}: ${items.length} items`);
    } catch (error) {
      logger.error(`${source.name} fetch failed: ${error.message}`);
      results.sources[source.id] = 0;
    }
  }

  // Save to Supabase if requested
  if (supabase) {
    await saveToSupabase(supabase, results.items, today);
  }

  // Generate combined files (filesystem only)
  if (saveToFilesystem && results.items.length > 0) {
    await generateCombinedFiles(results, today);
  }

  const totalItems = Object.values(results.sources).reduce((a, b) => a + b, 0);
  logger.success(`✨ Scraping complete: ${totalItems} total items`);

  return results;
}

function loadConfig(optionsConfig) {
  // Allow config override (for testing or custom sources), otherwise use bundled default
  return optionsConfig || defaultConfig;
}

function getDateString() {
  return new Date().toISOString().split('T')[0];
}

async function saveSourceData(source, items, today) {
  try {
    const todayFolder = path.join(__dirname, '../data', today);
    if (!fs.existsSync(todayFolder)) {
      fs.mkdirSync(todayFolder, { recursive: true });
    }
    const filePath = path.join(todayFolder, `${source}.json`);
    const data = {
      date: today,
      source: source,
      total_items: items.length,
      scraped_at: new Date().toISOString(),
      items: items
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    // Vercel ephemeral filesystem - ignore write errors when saving to filesystem
    if (err.code !== 'ENOENT' && err.code !== 'EACCES') {
      logger.warn(`saveSourceData skipped: ${err.message}`);
    }
  }
}

async function saveToSupabase(supabase, items, date) {
  // Normalize items to standard format
  const normalizedItems = items.map(item => ({
    title: item.title,
    url: item.url || item.link,
    summary: item.summary || item.content?.substring(0, 300) || '',
    source: item.source,
    source_detail: item.sourceName || item.source,
    published_at: item.pubDate || item.publishedAt || new Date().toISOString(),
    category: item.category || 'general',
    engagement: item.engagement || item.metadata || { upvotes: 0, comments: 0 },
    date: date,
    scraped_at: new Date().toISOString(),
  }));

  // Clear old items for this date
  await supabase.from('newsletter_items').delete().eq('date', date);

  // Insert new items
  const { error } = await supabase.from('newsletter_items').insert(normalizedItems);
  if (error) {
    logger.error(`Supabase insert failed: ${error.message}`);
    throw error;
  }
  logger.success(`✅ Saved ${normalizedItems.length} items to Supabase`);
}

async function generateCombinedFiles(results, today) {
  try {
    const todayFolder = path.join(__dirname, '../data', today);

    // Load all source files
    const allItems = [];
    let sourceFiles = [];
    try {
      sourceFiles = fs.readdirSync(todayFolder)
        .filter(f => f.endsWith('.json') && f !== 'all.json' && f !== 'trending.json');
    } catch {
      // Folder may not exist - skip loading
      sourceFiles = [];
    }
    for (const file of sourceFiles) {
      try {
        const filePath = path.join(todayFolder, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        allItems.push(...(data.items || []));
      } catch {
        // Skip unreadable files
      }
    }

    // Filter malformed items before ranking
    const validItems = allItems.filter(item => {
      if (!validateItem(item)) {
        logger.warn(`Dropped malformed item: ${String(item?.title || item?.url || JSON.stringify(item)).substring(0, 80)}`);
        return false;
      }
      return true;
    });

    // Save all.json
    const allData = {
      date: today,
      generated_at: new Date().toISOString(),
      total_items: validItems.length,
      sources: results.sources,
      items: validItems
    };
    fs.writeFileSync(path.join(todayFolder, 'all.json'), JSON.stringify(allData, null, 2));

    // Generate trending.json (top 20 by score with source diversity)
    // RSS items are included even without engagement metrics (they have rich summaries)
    const scoredItems = validItems
      .filter(item =>
        item.metadata?.score ||
        item.engagement?.upvotes ||
        item.engagement?.points ||
        item.source === 'rss'  // include RSS items (they have editorial content, not just engagement)
      )
      .map(item => ({ ...item, combined_score: calculateScore(item) }))
      .sort((a, b) => b.combined_score - a.combined_score);

    // Apply source diversity: max 5 items per source
    const trendingBySource = {};
    const finalTrending = [];
    for (const item of scoredItems) {
      const source = item.source || 'unknown';
      if (!trendingBySource[source]) trendingBySource[source] = 0;
      if (trendingBySource[source] < 5) {
        trendingBySource[source]++;
        finalTrending.push(item);
      }
      if (finalTrending.length >= 20) break;
    }

    const trendingData = {
      date: today,
      generated_at: new Date().toISOString(),
      total_items: finalTrending.length,
      items: finalTrending.map((item, index) => ({
        rank: index + 1,
        score: item.combined_score,
        sources: getItemSources(item),
        title: item.title,
        url: item.url || item.link,
        summary: extractSummary(item),
        keywords: extractKeywords(item),
        engagement: item.engagement || item.metadata || {}
      }))
    };

    fs.writeFileSync(path.join(todayFolder, 'trending.json'), JSON.stringify(trendingData, null, 2));
    logger.success(`✅ Generated: trending.json (${finalTrending.length} items)`);
  } catch (err) {
    // Vercel ephemeral filesystem - ignore write errors
    if (err.code !== 'ENOENT' && err.code !== 'EACCES') {
      logger.warn(`generateCombinedFiles skipped: ${err.message}`);
    }
  }
}

function validateItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (!item.title || typeof item.title !== 'string' || !item.title.trim()) return false;
  const url = item.url || item.link;
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  if (!item.source || typeof item.source !== 'string') return false;
  return true;
}

function calculateScore(item) {
  let score = 0;
  if (item.engagement?.upvotes) score += item.engagement.upvotes;
  if (item.engagement?.points) score += item.engagement.points * 2;
  if (item.engagement?.comments) score += item.engagement.comments * 0.5;
  if (item.metadata?.score) score += item.metadata.score;

  // RSS items have no engagement metrics — use summary length as quality proxy
  // Longer summaries = more editorial content = higher quality source
  if (item.source === 'rss' && score === 0) {
    const summary = item.summary || item.content || '';
    score = Math.min(summary.length * 2, 500); // cap at 500 to stay below typical engagement scores
  }

  return Math.round(score);
}

function getItemSources(item) {
  const sources = [item.source];
  if (item.sourceName) sources.push(item.sourceName);
  return sources;
}

function extractSummary(item) {
  if (item.summary) return item.summary;
  if (item.content) return item.content.substring(0, 200) + '...';
  return '';
}

function extractKeywords(item) {
  if (item.keywords) return item.keywords;
  if (item.tags) return item.tags;
  return [];
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'scrape';

  switch (command) {
    case 'scrape':
      await scrape({ saveToFilesystem: true });
      process.exit(0);

    default:
      console.log(`
Usage: npm run scrape OR node src/index.js scrape

Commands:
  scrape    - Scrape all sources and save to today's folder

Output will be saved to: data/YYYY-MM-DD/
  - trending.json    Top 20 trending items
  - reddit.json      All Reddit items
  - hackernews.json  All HN items
  - rss.json         All RSS items
  - all.json         All items combined
      `);
  }
}

main().catch(console.error);

export { scrape };
export default { scrape };
