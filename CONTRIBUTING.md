# Contributing to Social Automation

## Getting Started

```bash
git clone https://github.com/aikeytake/social-automation.git
cd social-automation
npm install
cp .env.example .env
# Edit .env with your API keys
npm run scrape
```

## Adding RSS Feeds

Edit `config/sources.js` (or `config/sources.json` for published npm package):

```js
rssFeeds: [
  // ... existing feeds
  { name: "My AI Blog", url: "https://example.com/feed.xml", category: "ai-news", enabled: true }
]
```

## Adding New Source Types

1. Create a new fetcher in `src/fetchers/` (e.g., `src/fetchers/mysource.js`)
2. Export a default async function that takes `config` and returns an array of items
3. Import and call it in `src/index.js`
4. Add to the sources count in `src/index.js`

Item shape:
```js
{
  id: "unique_id",
  source: "mysource",
  sourceName: "My Source",
  title: "Article Title",
  url: "https://...",
  summary: "...",
  content: "...",
  pubDate: "2026-04-19T10:00:00Z",
  engagement: { upvotes: 100, comments: 5 }
}
```

## Testing

```bash
npm run scrape          # Full pipeline
npm run test:twitter   # Test Twitter scraper only
npm run test:linkedin  # Test LinkedIn browser scraper only
npm run query trending # View results
```

## Code Style

- ES modules (`import`/`export`)
- `.js` extensions in imports
- Async/await for async operations
- Descriptive variable names
