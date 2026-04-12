/**
 * Isolated LinkedIn Browser fetcher test.
 * Run: npm run test:linkedin
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import linkedinBrowserFetch from '../fetchers/linkedin_browser.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/sources.json'), 'utf-8'));

config.linkedin_browser = { ...config.linkedin_browser, enabled: true };

const cfg = config.linkedin_browser;
console.log(`\nAccounts: ${cfg.accounts?.join(', ')}`);
console.log(`Max per account: ${cfg.maxPostsPerAccount}`);
console.log(`Max age hours: ${cfg.maxAgeHours}\n`);

const items = await linkedinBrowserFetch(config);

if (items.length === 0) {
  console.log('No items returned.');
} else {
  console.log(`\n✅ ${items.length} posts fetched:\n`);
  items.forEach((item, i) => {
    console.log(`${i + 1}. [${item.sourceName}] 👍 ${item.engagement.upvotes} | ${item.metadata.timeAgo}`);
    console.log(`   ${item.title}`);
    console.log(`   ${item.url}`);
    console.log();
  });
}
