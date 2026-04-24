/**
 * Smoke tests — no network calls, no API keys required.
 * Run: node src/test.js
 */

import assert from 'assert/strict';
import { validateItem } from './utils/validate.js';
import defaultConfig from '../config/sources.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// --- validateItem ---

console.log('\nvalidateItem');

await test('accepts item with url', () => {
  assert.ok(validateItem({ title: 'Hello', url: 'https://example.com', source: 'rss' }));
});

await test('accepts item with link instead of url', () => {
  assert.ok(validateItem({ title: 'Hello', link: 'https://example.com', source: 'reddit' }));
});

await test('rejects null', () => {
  assert.equal(validateItem(null), false);
});

await test('rejects missing title', () => {
  assert.equal(validateItem({ url: 'https://example.com', source: 'rss' }), false);
});

await test('rejects blank title', () => {
  assert.equal(validateItem({ title: '   ', url: 'https://example.com', source: 'rss' }), false);
});

await test('rejects missing url and link', () => {
  assert.equal(validateItem({ title: 'Hello', source: 'rss' }), false);
});

await test('rejects missing source', () => {
  assert.equal(validateItem({ title: 'Hello', url: 'https://example.com' }), false);
});

// --- config ---

console.log('\nconfig');

await test('rssFeeds is non-empty array', () => {
  assert.ok(Array.isArray(defaultConfig.rssFeeds) && defaultConfig.rssFeeds.length > 0);
});

await test('each RSS feed has name and url', () => {
  for (const feed of defaultConfig.rssFeeds) {
    assert.ok(feed.name, `missing name: ${JSON.stringify(feed)}`);
    assert.ok(feed.url, `missing url: ${feed.name}`);
  }
});

await test('reddit config has enabled flag', () => {
  assert.ok('enabled' in defaultConfig.trendingSources.reddit);
});

await test('hackernews config has enabled flag', () => {
  assert.ok('enabled' in defaultConfig.trendingSources.hackernews);
});

// --- summary ---

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
