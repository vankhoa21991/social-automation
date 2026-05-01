/**
 * Isolated Twitter fetcher test.
 * Run: npm run test:twitter
 *
 * Runs only the Twitter fetcher against 2 accounts from config/sources.js
 * and prints results without writing any data files.
 */

import dotenv from 'dotenv';
import defaultConfig from '../../config/sources.js';
import twitterFetch from '../fetchers/twitter.js';

dotenv.config();

const allAccounts = defaultConfig.trendingSources?.twitter?.accounts || [];
const testAccounts = allAccounts.sort(() => Math.random() - 0.5).slice(0, 2);

const config = {
  ...defaultConfig,
  trendingSources: {
    ...defaultConfig.trendingSources,
    twitter: { ...defaultConfig.trendingSources.twitter, enabled: true, accounts: testAccounts },
  },
};

const tw = config.trendingSources.twitter;
console.log(`\nAccounts: ${tw.accounts?.join(', ')}`);
console.log(`Max per account: ${tw.maxTweetsPerAccount}`);
console.log(`Min likes: ${tw.minLikes}\n`);

const items = await twitterFetch(config);

if (items.length === 0) {
  console.log('No items returned.');
} else {
  console.log(`\n✅ ${items.length} tweets fetched:\n`);
  items.forEach((item, i) => {
    console.log(`${i + 1}. [${item.sourceName}] 👍 ${item.engagement.upvotes}`);
    console.log(`   ${item.title}`);
    console.log(`   ${item.url}`);
    console.log();
  });
}
