import axios from 'axios';
import createLogger from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const logger = createLogger('RedditFetcher');

export default async function redditFetch(config) {
  const redditConfig = config.trendingSources?.reddit;
  if (!redditConfig?.enabled) {
    return [];
  }

  const subreddits = redditConfig.subreddits || [];
  const minScore = redditConfig.minScore || 100;
  const maxAge = parseInt(redditConfig.maxAge) || 24;
  const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000);

  logger.info(`Fetching top posts from ${subreddits.length} subreddits...`);

  const allItems = [];

  for (const subreddit of subreddits) {
    try {
      const response = await withRetry(
        () => axios.get(
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`,
          { headers: { 'User-Agent': 'AI-Keytake-Scraper/1.0' } }
        ),
        { retries: 3, baseDelay: 1000, onRetry: (a, t) => logger.warn(`r/${subreddit} retry ${a}/${t}`) }
      );

      const posts = response.data.data.children;

      for (const post of posts) {
        try {
          const data = post.data;
          const created = new Date(data.created_utc * 1000);
          if (isNaN(created.getTime())) continue;

          // Skip old posts
          if (created < cutoff) continue;

          // Skip low-score posts
          if (data.score < minScore) continue;

          // Skip NSFW
          if (data.over_18) continue;

          allItems.push({
            id: `reddit_${data.id}`,
            source: 'reddit',
            sourceName: `r/${subreddit}`,
            title: data.title,
            content: data.selftext || '',
            summary: (data.selftext || '').substring(0, 200),
            url: `https://reddit.com${data.permalink}`,
            external_url: data.url,
            author: data.author,
            posted_at: new Date(data.created_utc * 1000).toISOString(),
            scraped_at: new Date().toISOString(),
            age_hours: Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60)),
            engagement: {
              upvotes: data.score,
              comments: data.num_comments,
              ratio: data.upvote_ratio
            },
            metadata: {
              score: data.score,
              is_self: data.is_self,
              is_video: data.is_video
            }
          });
        } catch (err) {
          logger.debug(`r/${subreddit}: post error: ${err.message}`);
        }
      }

      logger.debug(`Fetched from r/${subreddit}`);
    } catch (error) {
      logger.error(`Error fetching r/${subreddit}: ${error.message}`);
    }
  }

  logger.success(`Fetched ${allItems.length} total posts from Reddit`);
  return allItems;
}
