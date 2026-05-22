import Parser from 'rss-parser';
import https from 'https';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import createLogger from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const logger = createLogger('RSSFetcher');
const parser = new Parser();
const parserNoSsl = new Parser({ requestOptions: { agent: new https.Agent({ rejectUnauthorized: false }) } });

const HTML_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' };

async function fetchHtml(feed) {
  const url = feed.htmlUrl || feed.url;
  const res = await axios.get(url, { headers: HTML_HEADERS, timeout: 15000 });
  const $ = cheerio.load(res.data);
  const { linkSelector, titleSelector } = feed.htmlSelectors;
  const seen = new Set();
  const items = [];
  const now = new Date().toISOString();

  $(linkSelector).each((i, el) => {
    const href = $(el).attr('href');
    if (!href || seen.has(href)) return;
    seen.add(href);
    const title = titleSelector
      ? $(el).find(titleSelector).first().text().trim() || $(el).text().trim()
      : $(el).text().trim();
    if (!title) return;
    const link = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;

    const $card = $(el).closest('li, article');
    const dateText = feed.htmlSelectors.dateSelector
      ? $card.find(feed.htmlSelectors.dateSelector).first().text().trim()
      : null;
    const pubDate = dateText ? new Date(dateText).toISOString() : now;
    const pubDateObj = new Date(pubDate);
    const age_hours = Math.floor((Date.now() - pubDateObj.getTime()) / (1000 * 60 * 60));

    items.push({
      id: crypto.createHash('md5').update(link).digest('hex'),
      source: 'rss',
      sourceName: feed.name,
      category: feed.category,
      title,
      link,
      content: '',
      summary: '',
      pubDate,
      author: feed.name,
      scraped_at: now,
      age_hours
    });
  });

  return items;
}

export default async function rssFetch(config) {
  const feeds = config.rssFeeds.filter(f => f.enabled);
  logger.info(`Fetching from ${feeds.length} RSS feeds`);

  const allItems = [];
  const maxAge = config.filtering?.maxAgeHours || 48;
  const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000);

  for (const feed of feeds) {
    try {
      if (feed.htmlSelectors) {
        const items = await fetchHtml(feed);
        allItems.push(...items);
        logger.debug(`Fetched ${items.length} items from ${feed.name} (HTML)`);
        continue;
      }

      const feedParser = feed.skipSslVerify ? parserNoSsl : parser;
      const parsed = await withRetry(
        () => feedParser.parseURL(feed.url),
        { retries: 3, baseDelay: 1000, onRetry: (a, t) => logger.warn(`${feed.name} retry ${a}/${t}`) }
      );

      for (const item of parsed.items) {
        try {
          if (!item.link) {
            logger.debug(`${feed.name}: item missing link, skipping`);
            continue;
          }
          const pubDate = new Date(item.pubDate);
          if (isNaN(pubDate.getTime())) {
            logger.debug(`${feed.name}: item has invalid date, skipping`);
            continue;
          }
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
        } catch (err) {
          logger.debug(`${feed.name}: item error: ${err.message}`);
        }
      }

      logger.debug(`Fetched items from ${feed.name}`);
    } catch (error) {
      logger.error(`Failed to fetch ${feed.name}: ${error.message}`);
    }
  }

  logger.success(`Fetched ${allItems.length} total items`);
  return allItems;
}
