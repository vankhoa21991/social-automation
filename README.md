# Social Automation

> Scrape AI/tech content from 17+ sources — no Twitter or LinkedIn API keys needed. Outputs ranked, deduplicated JSON ready for AI agent consumption.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-2.1.0-blue)](package.json)

---

## Features

- **17+ sources** — RSS, Reddit, Hacker News, Twitter/X, LinkedIn (browser + BrightData)
- **Engagement scoring** — ranks by upvotes, points, comments with per-source diversity cap
- **No API keys for Twitter/LinkedIn** — Playwright browser sessions, login once
- **Daily JSON output** — structured for AI agent consumption
- **Visual dashboard** — trending cards, searchable table, word cloud
- **PM2 scheduling** — cron-based daily scrape, auto-restarts
- **Pluggable fetchers** — add new sources in one file

---

## Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Commands](#commands)
- [Output](#output)
- [Architecture](#architecture)
- [Dashboard](#dashboard)
- [Production (PM2)](#production-pm2)
- [Adding Sources](#adding-sources)
- [License](#license)

---

## Requirements

- Node.js 18+
- npm or pnpm
- BrightData account (LinkedIn KOL scraping only — optional)
- Anthropic API key (writing agents only — optional)

---

## Quick Start

```bash
git clone https://github.com/aikeytake/social-automation.git
cd social-automation
npm install
cp .env.example .env
# Edit .env with your keys
npm run scrape
```

Results saved to `data/YYYY-MM-DD/`.

### First-time browser setup (Twitter/LinkedIn)

```bash
npm run setup:twitter   # Opens browser — log in once, session cached
```

---

## Configuration

### Environment Variables (`.env`)

| Variable | Required | Description |
|---|---|---|
| `BRIGHTDATA_API_KEY` | For LinkedIn KOL | BrightData SERP API key |
| `BRIGHTDATA_ZONE` | For LinkedIn KOL | Zone name (default: `mcp_unlocker`) |
| `ANTHROPIC_API_KEY` | For writing agents | Claude API key |
| `LINKEDIN_KOL_PROFILES_FILE` | For LinkedIn KOL | Path to KOL profiles JSON |
| `DASHBOARD_PORT` | Optional | Dashboard port (default: `3737`) |

### Source Configuration (`config/sources.json`)

| Key | Description |
|---|---|
| `rssFeeds` | 17 RSS sources with categories and enable flags |
| `trendingSources.reddit` | 7 AI subreddits, minScore, maxAge |
| `trendingSources.hackernews` | Keyword filters, minPoints |
| `trendingSources.twitter` | X accounts, minLikes, maxTweetsPerAccount |
| `linkedin_browser` | Profile slugs, maxPostsPerAccount, maxAgeHours |
| `linkedin` | KOL file path, batch size, enrichment settings |
| `apiSources` | REST/GraphQL sources with JSONPath mappings |

---

## Commands

### Scraping

```bash
npm run scrape              # Scrape all enabled sources
```

### Querying

```bash
npm run query               # Interactive mode
npm run query trending      # Top 20 ranked items
npm run query topic GPT     # Search by topic keyword
npm run query fresh 6       # Items from last N hours
npm run query search "AI"   # Full-text search
npm run query source reddit # Filter by source
npm run query compare 2026-04-01 2026-04-02  # Compare two days
```

### Browser Sources

```bash
npm run setup:twitter       # One-time browser login (Twitter + LinkedIn)
npm run test:twitter        # Isolated Twitter test (no file writes)
npm run test:linkedin       # Isolated LinkedIn test (no file writes)
```

### Dashboard

```bash
npm run dashboard           # Serve dashboard at http://localhost:3737
```

---

## Output

```
data/YYYY-MM-DD/
├── trending.json      # Top 20 items ranked by engagement score
├── all.json           # All items from all sources
├── rss.json           # RSS feed items
├── reddit.json        # Reddit posts
├── hackernews.json    # Hacker News stories
├── twitter.json       # Twitter/X posts
├── linkedin.json      # LinkedIn (BrightData)
└── linkedin_browser.json  # LinkedIn (Playwright)
```

### Item schema

```json
{
  "id": "md5-of-url",
  "source": "rss|reddit|hackernews|linkedin|twitter|api",
  "sourceName": "Source Name",
  "category": "ai-news|company-news|research",
  "title": "Article Title",
  "url": "https://...",
  "summary": "Content summary",
  "pubDate": "2026-04-19T10:00:00Z",
  "age_hours": 24,
  "engagement": { "upvotes": 4500, "comments": 823 },
  "scraped_at": "2026-04-19T10:00:00Z"
}
```

### Engagement scoring

```
score = upvotes × 1 + hn_points × 2 + comments × 0.5
```

Max 5 items per source in `trending.json` for diversity.

---

## Architecture

```
config/sources.json          ← single source of truth for all config
        │
src/index.js                 ← ContentScraper orchestrator
        │
        ├── src/fetchers/rss.js              17 RSS feeds
        ├── src/fetchers/reddit.js           7 AI subreddits
        ├── src/fetchers/hackernews.js       HN AI-filtered stories
        ├── src/fetchers/twitter.js          Twitter/X via Playwright
        ├── src/fetchers/linkedin_browser.js LinkedIn via Playwright
        ├── src/fetchers/linkedin.js         LinkedIn via BrightData SERP
        └── src/fetchers/api.js              Generic REST/GraphQL
        │
data/YYYY-MM-DD/*.json       ← daily output
```

Each fetcher is an isolated async function. Errors in one fetcher don't stop the pipeline.

---

## Dashboard

```bash
npm run dashboard
# Open http://localhost:3737
```

| Tab | Description |
|---|---|
| **Trending** | Top 20 ranked cards — score bar, keywords, engagement |
| **All Items** | Searchable and filterable table of all scraped items |
| **Word Cloud** | Word frequency — filter by source and field |

Auto-loads most recent date under `data/`. Served by a lightweight built-in HTTP server (no extra dependencies).

---

## Production (PM2)

```bash
npm run pm2:setup       # Start, save process list, enable startup
npm run pm2:status      # Check status
npm run pm2:logs        # Tail logs
npm run pm2:restart     # Manual restart
```

Scheduled daily at **06:00** via `ecosystem.config.cjs`. Logs written to `logs/`.

---

## Adding Sources

### Add an RSS feed

Edit `config/sources.json`:

```json
{
  "name": "My AI Blog",
  "url": "https://example.com/feed.xml",
  "category": "ai-news",
  "enabled": true
}
```

### Add a new source type

1. Create `src/fetchers/mysource.js` — export an async function returning an array of items
2. Import and call it in `src/index.js`
3. Add config under a new key in `config/sources.json`

---

## License

MIT — see [LICENSE](LICENSE).
