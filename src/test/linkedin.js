/**
 * Isolated LinkedIn Browser fetcher test.
 * Run: npm run test:linkedin
 */

import dotenv from 'dotenv';
import defaultConfig from '../../config/sources.js';
import linkedinBrowserFetch from '../fetchers/linkedin_browser.js';

dotenv.config();

const allAccounts = defaultConfig.linkedin_browser?.accounts || [];
const testAccounts = allAccounts.sort(() => Math.random() - 0.5).slice(0, 2);

const config = {
  ...defaultConfig,
  linkedin_browser: { ...defaultConfig.linkedin_browser, enabled: true, accounts: testAccounts },
};

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
