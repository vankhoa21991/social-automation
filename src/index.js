import dotenv from 'dotenv';
import createLogger from './utils/logger.js';
import rssFetch from './fetchers/rss.js';
import redditFetch from './fetchers/reddit.js';
import hnFetch from './fetchers/hackernews.js';
import linkedinFetch from './fetchers/linkedin.js';
import apiFetch from './fetchers/api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger('Main');

class ContentScraper {
  constructor() {
    this.config = this.loadConfig();
    this.today = this.getTodayFolder();
  }

  loadConfig() {
    const configPath = path.join(__dirname, '../config/sources.json');
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  }

  getTodayFolder() {
    const today = new Date().toISOString().split('T')[0];
    return path.join(__dirname, '../data', today);
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.today)) {
      fs.mkdirSync(this.today, { recursive: true });
      logger.success(`✅ Created folder: ${this.today}`);
    }
  }

  async scrapeAll() {
    logger.info('🔄 Starting scrape cycle...');
    this.ensureDataDirectory();

    const results = {
      date: this.getDateString(),
      scraped_at: new Date().toISOString(),
      sources: {}
    };

    // RSS Feeds
    if (this.config.rssFeeds && this.config.rssFeeds.length > 0) {
      logger.info('📰 Fetching from RSS feeds...');
      try {
        const rssItems = await rssFetch(this.config);
        results.sources.rss = rssItems.length;
        await this.saveSourceData('rss', rssItems);
        logger.success(`✅ RSS: ${rssItems.length} items`);
      } catch (error) {
        logger.error(`RSS fetch failed: ${error.message}`);
        results.sources.rss = 0;
      }
    }

    // Reddit
    if (this.config.trendingSources?.reddit?.enabled) {
      logger.info('📱 Fetching from Reddit...');
      try {
        const redditItems = await redditFetch(this.config);
        results.sources.reddit = redditItems.length;
        await this.saveSourceData('reddit', redditItems);
        logger.success(`✅ Reddit: ${redditItems.length} items`);
      } catch (error) {
        logger.error(`Reddit fetch failed: ${error.message}`);
        results.sources.reddit = 0;
      }
    }

    // Hacker News
    if (this.config.trendingSources?.hackernews?.enabled) {
      logger.info('📰 Fetching from Hacker News...');
      try {
        const hnItems = await hnFetch(this.config);
        results.sources.hackernews = hnItems.length;
        await this.saveSourceData('hackernews', hnItems);
        logger.success(`✅ Hacker News: ${hnItems.length} items`);
      } catch (error) {
        logger.error(`Hacker News fetch failed: ${error.message}`);
        results.sources.hackernews = 0;
      }
    }

    // Generic API sources (configured in sources.json apiSources array)
    for (const source of (this.config.apiSources || [])) {
      if (!source.enabled) continue;
      logger.info(`🔌 Fetching from ${source.name}...`);
      try {
        const items = await apiFetch(source);
        results.sources[source.id] = items.length;
        await this.saveSourceData(source.id, items);
        logger.success(`✅ ${source.name}: ${items.length} items`);
      } catch (error) {
        logger.error(`${source.name} fetch failed: ${error.message}`);
        results.sources[source.id] = 0;
      }
    }

    // LinkedIn
    if (this.config.linkedin?.enabled) {
      logger.info('💼 Fetching from LinkedIn...');
      try {
        const linkedinItems = await linkedinFetch(this.config);
        results.sources.linkedin = linkedinItems.length;
        await this.saveSourceData('linkedin', linkedinItems);
        logger.success(`✅ LinkedIn: ${linkedinItems.length} items`);
      } catch (error) {
        logger.error(`LinkedIn fetch failed: ${error.message}`);
        results.sources.linkedin = 0;
      }
    }

    // Generate combined files
    await this.generateCombinedFiles(results);

    const totalItems = Object.values(results.sources).reduce((a, b) => a + b, 0);
    logger.success(`✨ Scraping complete: ${totalItems} total items`);

    return results;
  }

  async saveSourceData(source, items) {
    const filePath = path.join(this.today, `${source}.json`);

    const data = {
      date: this.getDateString(),
      source: source,
      total_items: items.length,
      scraped_at: new Date().toISOString(),
      items: items
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  async generateCombinedFiles(results) {
    const allItems = [];

    // Load all source files dynamically
    const sourceFiles = fs.readdirSync(this.today)
      .filter(f => f.endsWith('.json') && f !== 'all.json' && f !== 'trending.json');
    for (const file of sourceFiles) {
      const filePath = path.join(this.today, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      allItems.push(...(data.items || []));
    }

    // Save all.json
    const allData = {
      date: this.getDateString(),
      generated_at: new Date().toISOString(),
      total_items: allItems.length,
      sources: results.sources,
      items: allItems
    };
    fs.writeFileSync(
      path.join(this.today, 'all.json'),
      JSON.stringify(allData, null, 2)
    );

    // Generate trending.json (top 20 by score)
    const scoredItems = allItems
      .filter(item => item.metadata?.score || item.engagement?.upvotes || item.engagement?.points || 0)
      .map(item => ({
        ...item,
        combined_score: this.calculateScore(item)
      }))
      .sort((a, b) => b.combined_score - a.combined_score)
      .slice(0, 20);

    const trendingData = {
      date: this.getDateString(),
      generated_at: new Date().toISOString(),
      total_items: scoredItems.length,
      items: scoredItems.map((item, index) => ({
        rank: index + 1,
        score: item.combined_score,
        sources: this.getItemSources(item),
        title: item.title,
        url: item.url || item.link,
        summary: this.extractSummary(item),
        keywords: this.extractKeywords(item),
        engagement: item.engagement || item.metadata || {}
      }))
    };

    fs.writeFileSync(
      path.join(this.today, 'trending.json'),
      JSON.stringify(trendingData, null, 2)
    );

    logger.success(`✅ Generated: trending.json (${scoredItems.length} items)`);
    logger.success(`✅ Generated: all.json (${allItems.length} items)`);
  }

  calculateScore(item) {
    let score = 0;

    // Reddit upvotes
    if (item.engagement?.upvotes) {
      score += item.engagement.upvotes;
    }

    // Hacker News points
    if (item.engagement?.points) {
      score += item.engagement.points * 2; // Weight HN points higher
    }

    // Comments
    if (item.engagement?.comments) {
      score += item.engagement.comments * 0.5;
    }

    // Metadata score if exists
    if (item.metadata?.score) {
      score += item.metadata.score;
    }

    return Math.round(score);
  }

  getItemSources(item) {
    const sources = [item.source];
    if (item.sourceName) {
      sources.push(item.sourceName);
    }
    return sources;
  }

  extractSummary(item) {
    if (item.summary) return item.summary;
    if (item.content) {
      return item.content.substring(0, 200) + '...';
    }
    return '';
  }

  extractKeywords(item) {
    if (item.keywords) return item.keywords;
    if (item.tags) return item.tags;
    return [];
  }

  getDateString() {
    return new Date().toISOString().split('T')[0];
  }
}

// CLI interface
async function main() {
  const scraper = new ContentScraper();
  const command = process.argv[2] || 'scrape';

  switch (command) {
    case 'scrape':
      await scraper.scrapeAll();
      process.exit(0);
      break;

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

export default ContentScraper;
