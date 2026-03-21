/**
 * One-time Twitter/X login setup.
 * Run: npm run setup:twitter
 *
 * SETUP STEPS:
 *   1. Run this script — a real Chrome window will open
 *   2. Log in to your X account manually
 *      ⚠️  Use a dedicated scraping account, NOT your personal account
 *   3. Once on the home feed, close the browser window to save the session
 *   4. Enable Twitter in config/sources.json: trendingSources.twitter.enabled = true
 *   5. Add the accounts you want to scrape to the "accounts" array in the same config
 *
 * SESSION:
 *   - Saved to data/playwright-profile/ and reused automatically on each scrape
 *   - Re-run this script if you see auth errors (sessions last several weeks)
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(__dirname, '../../data/playwright-profile');

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  channel: 'chrome',
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
});

const page = context.pages()[0] ?? await context.newPage();
await new Promise(r => setTimeout(r, 5000));
await page.goto('https://x.com');

console.log('Please log in to X (Twitter) in the browser window.');
console.log('Once you reach the home feed, close the browser window to save the session.\n');

await context.waitForEvent('close', { timeout: 300000 })
  .catch(() => {});

await context.close();
console.log(`\nSession saved to ${PROFILE_DIR}`);
