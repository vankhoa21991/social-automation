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
const rand = (base, spread) => base + (Math.random() * spread * 2 - spread);

class RateLimitError extends Error {
  constructor(reason) {
    super(`Rate limited: ${reason}`);
    this.name = 'RateLimitError';
  }
}

function validateProfile(profileDir) {
  if (!fs.existsSync(profileDir)) return 'browser profile not found';
  if (!fs.existsSync(path.join(profileDir, 'Default'))) return 'browser profile is incomplete';
  return null;
}

async function detectRateLimit(page) {
  const url = page.url();
  if (url.includes('/authwall') || url.includes('/checkpoint') || url.includes('/challenge')) {
    return `blocked redirect: ${url}`;
  }
  const reason = await page.evaluate(() => {
    const body = document.body?.innerText || '';
    if (body.includes("Let's do a quick security check")) return 'security check prompt';
    if (body.includes('suspicious activity')) return 'suspicious activity warning';
    if (body.includes('Too many requests')) return 'too many requests';
    if (body.includes('verify you')) return 'verification required';
    // Ignore invisible reCAPTCHA (size=invisible) — it's LinkedIn's background bot check, not blocking
    const captchaFrame = [...document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="arkoselabs"], iframe[title*="challenge"]')]
      .find(f => !f.src.includes('size=invisible'));
    if (captchaFrame) return `captcha challenge: ${captchaFrame.src.substring(0, 100)}`;
    return null;
  });
  return reason;
}

async function humanMouseMove(page) {
  await page.mouse.move(
    200 + Math.random() * 800,
    150 + Math.random() * 500,
    { steps: Math.floor(8 + Math.random() * 15) }
  );
}

async function humanType(page, text) {
  for (const char of text) {
    await page.keyboard.type(char);
    await sleep(rand(80, 45));
  }
}

async function humanScroll(page, scrollCount = 4, scrollPx = 450) {
  for (let i = 0; i < scrollCount; i++) {
    if (i > 0 && Math.random() < 0.25) {
      await page.mouse.wheel(0, -(40 + Math.random() * 60));
      await sleep(rand(350, 150));
    }
    await page.mouse.wheel(0, rand(scrollPx, scrollPx * 0.3));
    await sleep(rand(1200, 400));
    if (Math.random() < 0.4) await humanMouseMove(page);
  }
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

  // Accounts already shuffled for random order
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
    await sleep(rand(3000, 500));

    const allItems = [];

    for (let i = 0; i < accounts.length; i++) {
      const { slug, name } = accounts[i];
      try {
        logger.info(`Scraping ${name} (${slug}) via search...`);
        const posts = await scrapeAccount(page, slug, name, maxPerAccount, cutoff);
        allItems.push(...posts);
        logger.debug(`  → ${posts.length} posts from ${name}`);
      } catch (err) {
        if (err.name === 'RateLimitError') {
          logger.warn(`Rate limit on ${name}: ${err.message}. Stopping.`);
          break;
        }
        logger.error(`Failed ${name}: ${err.message}`);
      }

      if (i < accounts.length - 1) {
        const wait = rand(delay, delay * 0.3);
        logger.debug(`  Waiting ${Math.round(wait / 1000)}s before next account...`);
        await sleep(wait);
      }
    }

    logger.success(`Fetched ${allItems.length} posts from ${accounts.length} LinkedIn accounts`);
    return allItems;
  } finally {
    if (context) await context.close();
  }
}

async function scrapeAccount(page, slug, name, limit, cutoff) {
  // Step 1: LinkedIn feed home
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(rand(2000, 500));

  const homeRateLimit = await detectRateLimit(page);
  if (homeRateLimit) throw new RateLimitError(homeRateLimit);

  // Step 2: Click search bar and type name (slug → readable name)
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  await searchInput.click();
  await sleep(rand(500, 150));

  const searchTerm = name;
  await humanType(page, searchTerm);
  await sleep(rand(1200, 400));

  // Step 3: Find suggestion matching slug in dropdown, click it; fallback to search results page
  let clickedProfile = false;
  try {
    await page.waitForSelector('[class*="search-typeahead"] li', { timeout: 5000 });
    const suggestions = page.locator('[class*="search-typeahead"] li');
    const count = await suggestions.count();
    for (let i = 0; i < count; i++) {
      const html = await suggestions.nth(i).innerHTML();
      if (html.includes(`/in/${slug}`)) {
        await suggestions.nth(i).hover();
        await sleep(rand(300, 100));
        await suggestions.nth(i).click();
        clickedProfile = true;
        break;
      }
    }
  } catch {
    // dropdown didn't appear
  }

  if (!clickedProfile) {
    // Fallback: submit search, find profile link in results page
    logger.warn(`No dropdown match for ${slug}, falling back to search results page`);
    await page.keyboard.press('Enter');
    await sleep(rand(2500, 600));
    const profileLink = page.locator(`a[href*="/in/${slug}"]`).first();
    try {
      await profileLink.waitFor({ timeout: 10000 });
      await profileLink.hover();
      await sleep(rand(300, 100));
      await profileLink.click();
      await sleep(rand(2500, 600));
    } catch {
      throw new Error(`Profile /in/${slug} not found in search results`);
    }
  }

  await sleep(rand(2000, 500));

  const profileRateLimit = await detectRateLimit(page);
  if (profileRateLimit) throw new RateLimitError(profileRateLimit);

  // Verify correct profile loaded
  if (!page.url().includes(`/in/${slug}`)) {
    throw new Error(`Wrong profile loaded. Expected /in/${slug}, got: ${page.url()}`);
  }

  // Step 4: Scroll profile page to reveal Activity section, click "Show all" link
  await humanScroll(page, 2);
  await sleep(rand(800, 300));

  const activityLink = page.locator('a[href*="recent-activity/all"]').first();
  try {
    await activityLink.waitFor({ timeout: 10000 });
    await activityLink.hover();
    await sleep(rand(400, 150));
    await Promise.all([
      page.waitForURL('**/recent-activity/all**', { timeout: 15000 }),
      activityLink.click(),
    ]);
    await sleep(rand(5000, 600));
  } catch {
    logger.warn(`Activity link nav failed for ${slug}, navigating directly`);
    await page.goto(`https://www.linkedin.com/in/${slug}/recent-activity/all/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(rand(5000, 600));
  }

  const activityRateLimit = await detectRateLimit(page);
  if (activityRateLimit) throw new RateLimitError(activityRateLimit);

  if (!page.url().includes('recent-activity')) {
    logger.warn(`Unexpected URL after activity nav: ${page.url()}`);
  }

  // Step 5: Trigger lazy load with a small scroll, then wait for post elements
  // Two DOM variants:
  //   "carousel" — JS-rendered via "Show all" click (2026 hashed classes, no data-urn)
  //   "urn"      — direct URL navigation (old DOM, data-urn attributes present)
  const FEED_CAROUSEL_SEL = '[data-testid="carousel"][role="list"]';
  const URN_SEL = 'div[data-urn^="urn:li:activity"]';

  async function scroll2x() {
    await page.mouse.wheel(0, 300);
    await sleep(rand(1500, 400));
    await page.mouse.wheel(0, 300);
    await sleep(rand(1000, 300));
  }

  async function waitForPosts(preferUrn = false) {
    await scroll2x();
    const ordered = preferUrn
      ? [URN_SEL, FEED_CAROUSEL_SEL]
      : [FEED_CAROUSEL_SEL, URN_SEL];
    for (const sel of ordered) {
      try {
        await page.waitForSelector(sel, { timeout: 6000 });
        return sel;
      } catch { /* try next */ }
    }
    return null;
  }

  // let foundSelector = await waitForPosts(false);
  let foundSelector = false;

  if (!foundSelector) {
    logger.warn(`Posts not found after click, navigating directly to activity URL`);
    await page.goto(`https://www.linkedin.com/in/${slug}/recent-activity/all/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(rand(3000, 600));
    // Direct nav preserves data-urn DOM — try that first
    foundSelector = await waitForPosts(true);
  }

  if (!foundSelector) {
    const screenshotPath = path.join(__dirname, `../../data/debug-${slug}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    throw new Error(`No post elements found for ${slug}. Screenshot: ${screenshotPath}`);
  }

  await sleep(rand(1500, 400));
  // Slow, shallow scroll — just enough to reveal recent posts, not deep-load history
  await humanScroll(page, 2 + Math.floor(Math.random() * 2), 200);

  const postRateLimit = await detectRateLimit(page);
  if (postRateLimit) logger.warn(`Rate limit overlay on ${slug}: ${postRateLimit} — attempting extraction anyway`);

  // Step 6: Extract posts — handle both DOM variants
  const rawPosts = await page.evaluate((limit) => {
    // Variant A (2026 carousel DOM): [data-testid="carousel"][role="list"]
    const feedCarousel = [...document.querySelectorAll('[data-testid="carousel"]')]
      .find(c => c.getAttribute('role') === 'list' && c.querySelector('[aria-label*="Reaction"]'));

    if (feedCarousel) {
      const containers = [...feedCarousel.querySelectorAll('li[data-testid="carousel-child-container"]')]
        .slice(0, limit);

      return containers.map(el => {
        const actLink = el.querySelector('a[href*="feed/update/urn:li:activity"]');
        const link = actLink?.href || '';

        const pTexts = [...el.querySelectorAll('p')]
          .map(p => p.innerText?.trim())
          .filter(t => t && t.length > 30 && !/^\d+[\d,]*\s*(reaction|comment|repost)/i.test(t));
        const text = pTexts.join('\n').trim();

        // Time is in a hidden element — use textContent
        const rawContent = el.textContent || '';
        const timeMatch = rawContent.match(/(\d+\s*(?:mo|[hd wms]))\s*[•·]/i);
        const timeAgo = timeMatch ? timeMatch[1].trim() : '';

        const reactionSpan = [...el.querySelectorAll('span')]
          .find(s => /\d[\d,]*\s+reaction/i.test(s.innerText?.trim()));
        const reactions = reactionSpan
          ? parseInt(reactionSpan.innerText.replace(/[^0-9]/g, ''), 10) : 0;

        const commentSpan = [...el.querySelectorAll('span')]
          .find(s => /\d[\d,]*\s+comment/i.test(s.innerText?.trim()));
        const comments = commentSpan
          ? parseInt(commentSpan.innerText.replace(/[^0-9]/g, ''), 10) : 0;

        return { text, link, timeAgo, reactions, comments };
      });
    }

    // Variant B (direct URL nav, old DOM): div[data-urn^="urn:li:activity"]
    const containers = [...document.querySelectorAll('div[data-urn^="urn:li:activity"]')]
      .slice(0, limit);

    return containers.map(el => {
      const urn = el.getAttribute('data-urn');
      const link = urn ? `https://www.linkedin.com/feed/update/${urn}/` : '';

      const textEl = el.querySelector('.update-components-text, [class*="commentary"]');
      let text = textEl?.innerText?.trim() || '';
      if (!text) {
        const pTexts = [...el.querySelectorAll('p')]
          .map(p => p.innerText?.trim())
          .filter(t => t && t.length > 30 && !/^\d+[\d,]*\s*(reaction|comment|repost)/i.test(t));
        text = pTexts.join('\n').trim();
      }

      const timeEl = el.querySelector('.update-components-actor__sub-description');
      let timeAgo = timeEl?.innerText?.trim().split(/\s*[•\n]/)[0].trim() || '';
      if (!timeAgo) {
        const rawContent = el.textContent || '';
        const timeMatch = rawContent.match(/(\d+\s*(?:mo|[hd wms]))\s*[•·]/i);
        timeAgo = timeMatch ? timeMatch[1].trim() : '';
      }

      const reactionsEl = el.querySelector('.social-details-social-counts__reactions-count');
      let reactions = parseInt(reactionsEl?.innerText?.replace(/[^0-9]/g, '') || '0', 10);
      if (!reactions) {
        const reactionSpan = [...el.querySelectorAll('span')]
          .find(s => /\d[\d,]*\s+reaction/i.test(s.innerText?.trim()));
        reactions = reactionSpan ? parseInt(reactionSpan.innerText.replace(/[^0-9]/g, ''), 10) : 0;
      }

      const countsEl = el.querySelector('[class*="social-counts"]');
      const commentsMatch = countsEl?.innerText?.match(/(\d+)\s+comment/);
      let comments = commentsMatch ? parseInt(commentsMatch[1]) : 0;
      if (!comments) {
        const commentSpan = [...el.querySelectorAll('span')]
          .find(s => /\d[\d,]*\s+comment/i.test(s.innerText?.trim()));
        comments = commentSpan ? parseInt(commentSpan.innerText.replace(/[^0-9]/g, ''), 10) : 0;
      }

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
        sourceName: name,
        category: 'linkedin',
        title: p.text.substring(0, 100) + (p.text.length > 100 ? '…' : ''),
        link: p.link,
        url: p.link,
        content: p.text,
        summary: p.text.substring(0, 200),
        author: name,
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
