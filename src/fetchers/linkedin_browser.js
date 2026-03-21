import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import createLogger from '../utils/logger.js';

const logger = createLogger('LinkedInBrowser');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROFILE_DIR = path.join(__dirname, '../../data/playwright-profile');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function validateProfile(profileDir) {
  if (!fs.existsSync(profileDir)) return 'browser profile not found';
  if (!fs.existsSync(path.join(profileDir, 'Default'))) return 'browser profile is incomplete';
  return null;
}

export default async function linkedinBrowserFetch(config) {
  const cfg = config.linkedin_browser;
  if (!cfg?.enabled) return [];

  const profileDir = cfg.profileDir || DEFAULT_PROFILE_DIR;
  const profileError = validateProfile(profileDir);
  if (profileError) {
    logger.warn(`LinkedIn Browser skipped: ${profileError}`);
    logger.warn('Run: npm run setup:twitter (same profile as Twitter)');
    return [];
  }

  const accounts = [...(cfg.accounts || [])].sort(() => Math.random() - 0.5);
  const maxPerAccount = cfg.maxPostsPerAccount || 5;
  const maxAgeHours = cfg.maxAgeHours || 48;
  const cutoff = new Date(Date.now() - maxAgeHours * 3600000);
  const delay = cfg.delayBetweenAccountsMs || 10000;

  let context;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      channel: 'chrome',
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
      viewport: { width: 1280, height: 900 },
    });

    const page = context.pages()[0] ?? await context.newPage();
    await sleep(3000);

    const allItems = [];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        logger.info(`Scraping linkedin.com/in/${account}...`);
        const posts = await scrapeAccount(page, account, maxPerAccount, cutoff);
        allItems.push(...posts);
        logger.debug(`  → ${posts.length} posts from ${account}`);
      } catch (err) {
        logger.error(`Failed ${account}: ${err.message}`);
      }

      if (i < accounts.length - 1) {
        const wait = delay + Math.random() * 5000;
        logger.debug(`  Waiting ${Math.round(wait / 1000)}s...`);
        await sleep(wait);
      }
    }

    logger.success(`Fetched ${allItems.length} posts from ${accounts.length} LinkedIn accounts`);
    return allItems;
  } finally {
    if (context) await context.close();
  }
}

async function scrapeAccount(page, slug, limit, cutoff) {
  const url = `https://www.linkedin.com/in/${slug}/recent-activity/all/`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for posts feed
  await page.waitForSelector('div[data-urn]', { timeout: 15000 });
  await sleep(2000);

  // Scroll to load more posts
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 500 + Math.random() * 300);
    await sleep(700 + Math.random() * 400);
  }

  const rawPosts = await page.evaluate((limit) => {
    const containers = [...document.querySelectorAll('div[data-urn^="urn:li:activity"]')]
      .slice(0, limit);

    return containers.map(el => {
      const urn = el.getAttribute('data-urn');

      // Post text
      const textEl = el.querySelector('.update-components-text, [class*="commentary"]');
      const text = textEl?.innerText?.trim() || '';

      // Construct post URL directly from urn
      const link = urn ? `https://www.linkedin.com/feed/update/${urn}/` : '';

      // Time ago — take first segment before " •" or newline
      const timeEl = el.querySelector('.update-components-actor__sub-description');
      const timeAgo = timeEl?.innerText?.trim().split(/\s*[•\n]/)[0].trim() || '';

      // Reactions count
      const reactionsEl = el.querySelector('.social-details-social-counts__reactions-count');
      const reactions = parseInt(reactionsEl?.innerText?.replace(/[^0-9]/g, '') || '0', 10);

      // Comments count — parse from social counts block
      const countsEl = el.querySelector('[class*="social-counts"]');
      const commentsMatch = countsEl?.innerText?.match(/(\d+)\s+comment/);
      const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0;

      return { text, link, timeAgo, reactions, comments };
    });
  }, limit);

  return rawPosts
    .filter(p => p.link && p.text)
    .filter(p => {
      if (!p.timeAgo) return true;
      const pubDate = parseTimeAgo(p.timeAgo);
      return !pubDate || pubDate >= cutoff;
    })
    .map(p => {
      const pubDate = parseTimeAgo(p.timeAgo) || new Date();
      return {
        id: crypto.createHash('md5').update(p.link).digest('hex'),
        source: 'linkedin_browser',
        sourceName: slug,
        category: 'linkedin',
        title: p.text.substring(0, 100) + (p.text.length > 100 ? '…' : ''),
        link: p.link,
        url: p.link,
        content: p.text,
        summary: p.text.substring(0, 200),
        author: slug,
        pubDate: pubDate.toISOString(),
        scraped_at: new Date().toISOString(),
        age_hours: Math.floor((Date.now() - pubDate.getTime()) / 3600000),
        tags: [],
        engagement: {
          upvotes: p.reactions,
          comments: p.comments,
        },
        metadata: {
          score: p.reactions,
          timeAgo: p.timeAgo,
        },
      };
    });
}

function parseTimeAgo(str) {
  if (!str) return null;
  const m = str.match(/(\d+)\s*(s|m|h|d|w|mo)/i);
  if (!m) return null;
  const n = parseInt(m[1]);
  const unit = m[2].toLowerCase();
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, mo: 2592000000 }[unit] || 0;
  return new Date(Date.now() - n * ms);
}
