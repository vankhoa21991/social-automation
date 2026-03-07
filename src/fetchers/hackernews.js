import axios from 'axios';
import createLogger from '../utils/logger.js';

const logger = createLogger('HackerNewsFetcher');

export default async function hnFetch(config) {
  const hnConfig = config.trendingSources?.hackernews;
  if (!hnConfig?.enabled) {
    return [];
  }

  const keywords = hnConfig.keywords || [];
  const minPoints = hnConfig.minPoints || 50;
  const maxAge = 48; // hours
  const limit = hnConfig.limit || 30;
  const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000);

  logger.info('Fetching top stories from Hacker News...');

  const allItems = [];

  try {
    // Get top story IDs
    const { data: topIds } = await axios.get(
      'https://hacker-news.firebaseio.com/v0/topstories.json'
    );

    // Fetch story details
    for (const id of topIds.slice(0, limit * 2)) {
      try {
        const { data } = await axios.get(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );

        const created = new Date(data.time * 1000);

        // Skip old stories
        if (created < cutoff) continue;

        // Skip low-score stories
        if ((data.score || 0) < minPoints) continue;

        // Check keyword relevance
        const searchText = (data.title + ' ' + (data.text || '')).toLowerCase();
        const hasKeyword = keywords.some(kw =>
          searchText.includes(kw.toLowerCase())
        );

        if (!hasKeyword) continue;

        allItems.push({
          id: `hn_${id}`,
          source: 'hackernews',
          sourceName: 'Hacker News',
          title: data.title,
          content: data.text || '',
          summary: (data.text || '').substring(0, 200),
          url: data.url || `https://news.ycombinator.com/item?id=${id}`,
          hn_url: `https://news.ycombinator.com/item?id=${id}`,
          author: data.by,
          posted_at: new Date(data.time * 1000).toISOString(),
          scraped_at: new Date().toISOString(),
          age_hours: Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60)),
          engagement: {
            points: data.score || 0,
            comments: data.descendants || 0
          },
          metadata: {
            score: data.score || 0,
            type: data.type
          }
        });
      } catch (error) {
        logger.debug(`Failed to fetch story ${id}`);
      }

      if (allItems.length >= limit) break;
    }

    logger.success(`Fetched ${allItems.length} stories from Hacker News`);
  } catch (error) {
    logger.error(`Error fetching HN stories: ${error.message}`);
  }

  return allItems;
}
