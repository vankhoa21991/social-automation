import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import createLogger from '../utils/logger.js';

const logger = createLogger('TwitterFetcher');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROFILE_DIR = path.join(__dirname, '../../data/playwright-profile');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function validateProfile(profileDir) {
  if (!fs.existsSync(profileDir)) {
    return 'browser profile not found';
  }
  // A valid Chromium profile always contains a Default directory
  if (!fs.existsSync(path.join(profileDir, 'Default'))) {
    return 'browser profile is incomplete or empty';
  }
  return null; // valid
}

export default async function twitterFetch(config) {
  const cfg = config.trendingSources?.twitter;
  if (!cfg?.enabled) return [];

  const profileDir = cfg.profileDir || DEFAULT_PROFILE_DIR;
  const profileError = validateProfile(profileDir);
  if (profileError) {
    logger.warn(`Twitter skipped: ${profileError}`);
    logger.warn('Run: npm run setup:twitter');
    return [];
  }

  // Randomise visit order
  const accounts = [...(cfg.accounts || [])].sort(() => Math.random() - 0.5);
  const minLikes = cfg.minLikes || 0;
  const maxPerAccount = cfg.maxTweetsPerAccount || 10;
  const maxAgeHours = cfg.maxAgeHours || 24;
  const cutoff = new Date(Date.now() - maxAgeHours * 3600000);

  let context;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      channel: 'chrome',
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
      viewport: { width: 1280, height: 800 },
    });

    const page = context.pages()[0] ?? await context.newPage();
    await sleep(5000);

    // Land on X home first so the search box is available
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('[data-testid="SearchBox_Search_Input"], [aria-label="Search query"]', { timeout: 15000 });
    await sleep(2000);

    const allItems = [];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        logger.info(`Scraping @${account}...`);
        const tweets = await scrapeAccount(page, account, maxPerAccount, minLikes, cutoff);
        allItems.push(...tweets);
        logger.debug(`  → ${tweets.length} tweets from @${account}`);
      } catch (err) {
        logger.error(`Failed @${account}: ${err.message}`);
      }

      // Rate limit: random 20-30s between accounts
      if (i < accounts.length - 1) {
        const wait = 20000 + Math.random() * 10000;
        logger.debug(`  Waiting ${Math.round(wait / 1000)}s before next account...`);
        await sleep(wait);
      }
    }

    logger.success(`Fetched ${allItems.length} tweets from ${accounts.length} accounts`);
    return allItems;
  } finally {
    if (context) await context.close();
  }
}

async function navigateViaSearch(page, account) {
  // Click the search box
  await page.click('[data-testid="SearchBox_Search_Input"], [aria-label="Search query"]');
  await sleep(800 + Math.random() * 400);

  // Type account name with human-like delay
  await page.keyboard.type(account, { delay: 80 + Math.random() * 60 });
  await sleep(1500);

  // Wait for dropdown results
  await page.waitForSelector('[data-testid="TypeaheadUser"]', { timeout: 8000 });

  // Find the result whose username matches the account
  const matched = await page.evaluate((account) => {
    const results = [...document.querySelectorAll('[data-testid="TypeaheadUser"]')];
    for (const el of results) {
      const handle = el.querySelector('[tabindex="-1"] span')?.innerText?.toLowerCase() || '';
      if (handle.includes(account.toLowerCase())) {
        el.click();
        return true;
      }
    }
    // Fall back to first result
    if (results[0]) { results[0].click(); return true; }
    return false;
  }, account);

  if (!matched) throw new Error(`No search result found for @${account}`);
  await page.waitForLoadState('domcontentloaded');
  await sleep(1500);
}

async function scrollAndWait(page, times = 3) {
  for (let i = 0; i < times; i++) {
    await page.mouse.wheel(0, 400 + Math.random() * 300);
    await sleep(600 + Math.random() * 400);
  }
}

async function scrapeAccount(page, account, limit, minLikes, cutoff) {
  await navigateViaSearch(page, account);
  await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });
  await sleep(1500);

  // Scroll to load more tweets naturally
  await scrollAndWait(page, 3);

  const rawTweets = await page.evaluate((limit) => {
    const articles = [...document.querySelectorAll('article[data-testid="tweet"]')].slice(0, limit);

    return articles.map(article => {
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl?.innerText?.trim() || '';

      const timeEl = article.querySelector('time');
      const link = timeEl?.closest('a')?.href || '';
      const date = timeEl?.getAttribute('datetime') || '';

      const parseCount = (testId) => {
        const el = article.querySelector(`[data-testid="${testId}"]`);
        const label = el?.getAttribute('aria-label') || '';
        const m = label.match(/(\d[\d,]*)/);
        return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
      };

      return {
        text,
        link,
        date,
        likes: parseCount('like'),
        replies: parseCount('reply'),
        retweets: parseCount('retweet'),
      };
    });
  }, limit);

  return rawTweets
    .filter(t => t.link && t.text && t.likes >= minLikes && (!t.date || new Date(t.date) >= cutoff))
    .map(t => ({
      id: crypto.createHash('md5').update(t.link).digest('hex'),
      source: 'twitter',
      sourceName: `@${account}`,
      category: 'social',
      title: t.text.substring(0, 100) + (t.text.length > 100 ? '…' : ''),
      link: t.link,
      url: t.link,
      content: t.text,
      summary: t.text.substring(0, 200),
      author: account,
      pubDate: t.date || new Date().toISOString(),
      scraped_at: new Date().toISOString(),
      age_hours: t.date
        ? Math.floor((Date.now() - new Date(t.date).getTime()) / 3600000)
        : 0,
      tags: [],
      engagement: {
        upvotes: t.likes,
        comments: t.replies,
        retweets: t.retweets,
      },
      metadata: {
        score: t.likes,
      },
    }));
}
