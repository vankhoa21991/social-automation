/**
 * Isolated Twitter fetcher test.
 * Run: npm run test:twitter
 *
 * Runs only the Twitter fetcher against the accounts in config/sources.json
 * and prints results without writing any data files.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import twitterFetch from '../fetchers/twitter.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../config/sources.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Force enable for the test even if disabled in config
config.trendingSources.twitter = { ...config.trendingSources.twitter, enabled: true };

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
