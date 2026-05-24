import assert from 'assert';
import { canonicalUrl, getArticleUrl, deduplicateItems } from '../utils/dedup.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ─── canonicalUrl ────────────────────────────────────────────────────────────

console.log('\ncanonicalUrl');

test('strips UTM params', () => {
  const url = 'https://techcrunch.com/article?utm_source=rss&utm_medium=feed';
  assert.strictEqual(canonicalUrl(url), 'https://techcrunch.com/article');
});

test('strips multiple tracking params', () => {
  const url = 'https://example.com/post?fbclid=abc&gclid=xyz&id=1';
  assert.strictEqual(canonicalUrl(url), 'https://example.com/post?id=1');
});

test('removes www. prefix', () => {
  assert.strictEqual(
    canonicalUrl('https://www.example.com/page'),
    'https://example.com/page'
  );
});

test('normalizes http to https', () => {
  assert.strictEqual(
    canonicalUrl('http://example.com/page'),
    'https://example.com/page'
  );
});

test('removes trailing slash', () => {
  assert.strictEqual(
    canonicalUrl('https://example.com/page/'),
    'https://example.com/page'
  );
});

test('removes fragment', () => {
  assert.strictEqual(
    canonicalUrl('https://example.com/page#section'),
    'https://example.com/page'
  );
});

test('two equivalent URLs produce same key', () => {
  const a = 'http://www.arxiv.org/abs/2406.07612?utm_source=rss#abstract';
  const b = 'https://arxiv.org/abs/2406.07612';
  assert.strictEqual(canonicalUrl(a), canonicalUrl(b));
});

test('sorts remaining query params for consistency', () => {
  const a = 'https://example.com/page?b=2&a=1';
  const b = 'https://example.com/page?a=1&b=2';
  assert.strictEqual(canonicalUrl(a), canonicalUrl(b));
});

test('returns null for null input', () => {
  assert.strictEqual(canonicalUrl(null), null);
});

test('returns input for malformed URL', () => {
  assert.strictEqual(canonicalUrl('not-a-url'), 'not-a-url');
});

// ─── getArticleUrl ────────────────────────────────────────────────────────────

console.log('\ngetArticleUrl');

test('Reddit link post → external_url', () => {
  const item = {
    source: 'reddit',
    url: 'https://reddit.com/r/MachineLearning/comments/abc',
    external_url: 'https://arxiv.org/abs/2406.07612',
  };
  assert.strictEqual(getArticleUrl(item), 'https://arxiv.org/abs/2406.07612');
});

test('Reddit self-post (external_url is reddit) → url', () => {
  const item = {
    source: 'reddit',
    url: 'https://reddit.com/r/MachineLearning/comments/abc',
    external_url: 'https://www.reddit.com/r/MachineLearning/comments/abc',
  };
  assert.strictEqual(getArticleUrl(item), item.url);
});

test('Reddit item without external_url → url', () => {
  const item = {
    source: 'reddit',
    url: 'https://reddit.com/r/MachineLearning/comments/abc',
  };
  assert.strictEqual(getArticleUrl(item), item.url);
});

test('HN item → url (article)', () => {
  const item = {
    source: 'hackernews',
    url: 'https://arxiv.org/abs/2406.07612',
    hn_url: 'https://news.ycombinator.com/item?id=123',
  };
  assert.strictEqual(getArticleUrl(item), 'https://arxiv.org/abs/2406.07612');
});

test('RSS item → link', () => {
  const item = {
    source: 'rss',
    link: 'https://techcrunch.com/article',
    url: undefined,
  };
  assert.strictEqual(getArticleUrl(item), 'https://techcrunch.com/article');
});

test('generic item falls back to url', () => {
  const item = { source: 'api', url: 'https://example.com/thing' };
  assert.strictEqual(getArticleUrl(item), 'https://example.com/thing');
});

// ─── deduplicateItems ─────────────────────────────────────────────────────────

console.log('\ndeduplicateItems');

const mkRss = (link, summaryLen = 100) => ({
  id: `rss_${link}`,
  source: 'rss',
  sourceName: 'TechCrunch',
  link,
  engagement: {},
  summary: 'x'.repeat(summaryLen),
});

const mkReddit = (external_url, upvotes = 500) => ({
  id: `reddit_${external_url}`,
  source: 'reddit',
  sourceName: 'r/MachineLearning',
  url: 'https://reddit.com/r/MachineLearning/comments/abc',
  external_url,
  engagement: { upvotes, comments: 50 },
  metadata: { score: upvotes },
});

const mkHn = (url, points = 300) => ({
  id: `hn_${url}`,
  source: 'hackernews',
  sourceName: 'Hacker News',
  url,
  hn_url: 'https://news.ycombinator.com/item?id=1',
  engagement: { points, comments: 100 },
  metadata: { score: points },
});

test('same URL from two RSS feeds → 1 item', () => {
  const items = [
    mkRss('https://arxiv.org/abs/1234'),
    { ...mkRss('https://arxiv.org/abs/1234'), sourceName: 'Other Feed' },
  ];
  const result = deduplicateItems(items);
  assert.strictEqual(result.length, 1);
});

test('Reddit + HN linking same article → 1 item', () => {
  const url = 'https://arxiv.org/abs/2406.07612';
  const items = [mkReddit(url), mkHn(url)];
  const result = deduplicateItems(items);
  assert.strictEqual(result.length, 1);
});

test('winner keeps highest-scored item (HN wins over low-Reddit)', () => {
  const url = 'https://arxiv.org/abs/2406.07612';
  const reddit = mkReddit(url, 10);   // score: 10 upvotes
  const hn = mkHn(url, 500);          // score: 500*2 = 1000
  const result = deduplicateItems([reddit, hn]);
  assert.strictEqual(result[0].source, 'hackernews');
});

test('winner keeps highest-scored item (Reddit wins over low-HN)', () => {
  const url = 'https://arxiv.org/abs/2406.07612';
  const reddit = mkReddit(url, 5000);
  const hn = mkHn(url, 10);
  const result = deduplicateItems([reddit, hn]);
  assert.strictEqual(result[0].source, 'reddit');
});

test('dedup group attaches _dedup_entries with source+sourceName pairs', () => {
  const url = 'https://arxiv.org/abs/2406.07612';
  const result = deduplicateItems([mkReddit(url), mkHn(url)]);
  const entries = result[0]._dedup_entries;
  assert.ok(Array.isArray(entries));
  assert.strictEqual(entries.length, 2);
  assert.ok(entries.some(e => e.source === 'reddit'));
  assert.ok(entries.some(e => e.source === 'hackernews'));
});

test('_dedup_entries interleaved format: [source1, name1, source2, name2]', () => {
  const url = 'https://arxiv.org/abs/2406.07612';
  const result = deduplicateItems([mkReddit(url), mkHn(url)]);
  const entries = result[0]._dedup_entries;
  const flat = entries.flatMap(e => [e.source, e.sourceName]);
  assert.deepStrictEqual(flat, ['reddit', 'r/MachineLearning', 'hackernews', 'Hacker News']);
});

test('two RSS feeds: _dedup_entries has both feed names', () => {
  const url = 'https://arxiv.org/abs/1234';
  const feed1 = mkRss(url);
  const feed2 = { ...mkRss(url), id: 'rss_other', sourceName: 'arXiv Machine Learning' };
  const result = deduplicateItems([feed1, feed2]);
  const entries = result[0]._dedup_entries;
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].sourceName, 'TechCrunch');
  assert.strictEqual(entries[1].sourceName, 'arXiv Machine Learning');
});

test('different articles not merged', () => {
  const items = [
    mkRss('https://techcrunch.com/article-a'),
    mkRss('https://techcrunch.com/article-b'),
    mkHn('https://arxiv.org/abs/9999'),
  ];
  const result = deduplicateItems(items);
  assert.strictEqual(result.length, 3);
});

test('UTM variants of same URL deduplicated', () => {
  const base = mkRss('https://techcrunch.com/article');
  const utmVersion = mkHn('https://techcrunch.com/article?utm_source=hn');
  const result = deduplicateItems([base, utmVersion]);
  assert.strictEqual(result.length, 1);
});

test('www. variant deduplicated', () => {
  const a = mkRss('https://example.com/post');
  const b = mkHn('https://www.example.com/post');
  const result = deduplicateItems([a, b]);
  assert.strictEqual(result.length, 1);
});

test('Reddit self-post not merged with HN article', () => {
  const hnArticle = mkHn('https://arxiv.org/abs/2406.07612');
  const redditSelf = {
    ...mkReddit('https://www.reddit.com/r/ML/comments/abc'),
    external_url: 'https://www.reddit.com/r/ML/comments/abc',
  };
  const result = deduplicateItems([hnArticle, redditSelf]);
  assert.strictEqual(result.length, 2);
});

test('item with no URL passes through unchanged', () => {
  const noUrl = { id: 'x', source: 'linkedin', title: 'Post' };
  const result = deduplicateItems([noUrl, mkHn('https://example.com/a')]);
  assert.strictEqual(result.length, 2);
  assert.ok(result.some(i => i.id === 'x'));
});

test('_dupCount reflects removed item count', () => {
  const url = 'https://arxiv.org/abs/2406.07612';
  const result = deduplicateItems([mkReddit(url), mkHn(url), mkRss(url)]);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result._dupCount, 2);
});

test('_dupCount zero when no duplicates', () => {
  const items = [mkRss('https://a.com'), mkHn('https://b.com')];
  const result = deduplicateItems(items);
  assert.strictEqual(result._dupCount, 0);
});

// ─── summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
