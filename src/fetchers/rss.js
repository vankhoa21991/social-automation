import Parser from 'rss-parser';
import crypto from 'crypto';
import createLogger from '../utils/logger.js';

const logger = createLogger('RSSFetcher');
const parser = new Parser();

export default async function rssFetch(config) {
  const feeds = config.rssFeeds.filter(f => f.enabled);
  logger.info(`Fetching from ${feeds.length} RSS feeds`);

  const allItems = [];
  const maxAge = config.filtering?.maxAgeHours || 48;
  const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000);

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url);

      for (const item of parsed.items) {
        const pubDate = new Date(item.pubDate);

        // Skip old items
        if (pubDate < cutoff) continue;

        allItems.push({
          id: crypto.createHash('md5').update(item.link).digest('hex'),
          source: 'rss',
          sourceName: feed.name,
          category: feed.category,
          title: item.title,
          link: item.link,
          content: item.contentSnippet || item.content || '',
          summary: (item.contentSnippet || item.content || '').substring(0, 200),
          pubDate: item.pubDate,
          author: item.creator || item.author || feed.name,
          scraped_at: new Date().toISOString(),
          age_hours: Math.floor((Date.now() - pubDate.getTime()) / (1000 * 60 * 60))
        });
      }

      logger.debug(`Fetched items from ${feed.name}`);
    } catch (error) {
      logger.error(`Failed to fetch ${feed.name}: ${error.message}`);
    }
  }

  logger.success(`Fetched ${allItems.length} total items`);
  return allItems;
}
