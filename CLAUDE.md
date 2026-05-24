# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Content research and aggregation tool that scrapes AI/tech news from multiple sources and stores structured JSON for AI agents to consume. This is a Node.js CLI tool (not a web application).

## Common Commands

### Content Scraping

```bash
# Scrape all sources (RSS, Reddit, Hacker News, LinkedIn, Twitter)
npm run scrape

# Alternative:
node src/index.js scrape
```

Output saved to `data/YYYY-MM-DD/`:
- `trending.json` - Top 20 trending items ranked by engagement (max 5 per source)
- `all.json` - All items combined from all sources
- `{source}.json` - Per-source data (rss, reddit, hackernews, linkedin, twitter, linkedin_browser, api)

**Scoring:** Items ranked by engagement (upvotes + points*2 + comments*0.5). RSS items score by summary length. Source diversity: max 5 items per source.

### Query Data

```bash
# Interactive query mode
npm run query

# Query subcommands:
npm run query trending           # Show trending items
npm run query topic GPT          # Search by topic
npm run query fresh 6            # Items from last N hours
npm run query search "AI"       # Search content
npm run query source reddit      # Get by source
npm run query compare 2026-04-01 2026-04-02  # Compare two days
```

### Testing

```bash
# Run dedup unit tests (30 tests)
npm run test:dedup
```

### Browser-Based Sources (Playwright)

```bash
# Setup Twitter/LinkedIn login session (one-time)
npm run setup:twitter

# Test Twitter scraper (isolated, no files written)
npm run test:twitter

# Test LinkedIn browser scraper (isolated, no files written)
npm run test:linkedin
```

---

## Architecture

### Content Scraping Flow

```
config/sources.json (configuration)
        ↓
src/index.js (orchestrator)
        ↓
src/fetchers/
├── rss.js              # 24 RSS feeds
├── reddit.js           # 15 AI subreddits (min 100 upvotes)
├── hackernews.js       # HN AI-filtered stories (min 50 points)
├── linkedin.js         # LinkedIn KOL via BrightData SERP
├── linkedin_browser.js # LinkedIn via Playwright browser
├── twitter.js          # Twitter/X via Playwright browser
└── api.js              # Generic REST/GraphQL API sources
        ↓
data/YYYY-MM-DD/*.json (daily output)
```

### Key Files

- `src/index.js` - Main orchestrator, exports `scrape()` function
- `src/query.js` - DataQuery class for reading/analyzing scraped data
- `src/cli.js` - CLI for queue/drafts/published management
- `src/utils/dedup.js` - URL normalization and cross-source deduplication
- `src/utils/logger.js` - Color-coded logger
- `src/utils/storage.js` - JSON file storage utility

---

## Configuration

### Source Configuration (`config/sources.json`)

- **rssFeeds**: 24 RSS sources with categories (ai-news, company-news, research, etc.)
- **trendingSources.reddit**: 15 AI subreddits with minScore and maxAge filters
- **trendingSources.hackernews**: AI keyword filtering with minPoints threshold
- **trendingSources.twitter**: X accounts, minLikes, maxTweetsPerAccount (disabled by default)
- **linkedin_browser**: Profile slugs, maxPostsPerAccount, maxAgeHours
- **linkedin**: KOL profiles file path, batch size, enrichment settings (via BrightData)
- **apiSources**: Generic REST/GraphQL sources with JSONPath mappings

### Environment Variables (`.env`)

```bash
# Content scraping
BRIGHTDATA_API_KEY=...         # Required for LinkedIn KOL scraping
BRIGHTDATA_ZONE=mcp_unlocker   # BrightData zone name

# Browser sources (Twitter/LinkedIn via Playwright)
# Uses shared Playwright profile at data/playwright-profile/
```

### LinkedIn KOL Configuration

LinkedIn KOL profiles stored at:
```
/home/vankhoa/projects/aikeytake/workspace/marketing/linkedin_kol_clean.json
```

Path configured in `config/sources.json` under `linkedin.profilesFile`.

---

## Data Models

### Scraped Item Structure

```json
{
  "id": "unique_id",
  "source": "rss|reddit|hackernews|linkedin|twitter|api",
  "sourceName": "Source Name",
  "category": "ai-news|company-news|research",
  "title": "Article Title",
  "url": "https://...",
  "summary": "Content summary...",
  "content": "Full content...",
  "pubDate": "2026-04-19T10:00:00Z",
  "age_hours": 24,
  "engagement": {
    "upvotes": 4500,
    "comments": 823
  },
  "scraped_at": "2026-04-19T10:00:00Z"
}
```

### Trending Item Structure

```json
{
  "rank": 1,
  "score": 4750,
  "sources": ["reddit", "hackernews"],
  "title": "Article Title",
  "url": "https://...",
  "summary": "...",
  "keywords": ["AI", "GPT"],
  "engagement": { "upvotes": 4500, "comments": 823 }
}
```

---

## Important Design Decisions

1. **No Vercel Deployment** - This is a Node.js CLI tool, not a web application. Uses `dotenv` for config.

2. **Daily Data Organization** - Each scrape run creates/overwrites `data/YYYY-MM-DD/` folder.

3. **ES Modules** - Project uses `"type": "module"` in package.json. All imports use `.js` extensions.

4. **Playwright for Twitter/LinkedIn** - Browser-based sources share a profile at `data/playwright-profile/`. Run `npm run setup:twitter` once to authenticate.

5. **BrightData for LinkedIn KOL** - Requires BrightData SERP API with zone `mcp_unlocker`.

6. **Supabase Support** - `scrape()` accepts `toSupabase` option to save results to Supabase database.

7. **Cross-Source Dedup** - After all fetchers run, `deduplicateItems()` normalizes URLs (strip UTM params, www., force https) and merges items pointing to the same article. Highest-scored item wins; `_dedup_entries` records all contributing `{source, sourceName}` pairs. Stats logged: `N scraped → N dupes removed → N total`.

---

## Dependencies

- `rss-parser` - RSS feed parsing
- `axios` - HTTP requests
- `cheerio` - HTML parsing
- `@supabase/supabase-js` - Supabase integration (optional)
