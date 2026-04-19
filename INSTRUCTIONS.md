# Instructions

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your API keys:
- `ANTHROPIC_API_KEY` — optional, for writing agents
- `BRIGHTDATA_API_KEY` — required for LinkedIn KOL scraping via BrightData SERP

## Quick Start

```bash
npm run scrape
```

Results saved to `data/YYYY-MM-DD/`.

## Browser-Based Sources (Twitter / LinkedIn)

Twitter and LinkedIn scraping uses Playwright with a shared browser session. No API keys needed.

### One-Time Setup

```bash
npm run setup:twitter
```

This opens a Chrome window. Log in to Twitter and LinkedIn in that window. The session is saved automatically. Close when done.

Re-run this when you see auth errors.

### Run Scraper

```bash
npm run scrape              # All sources including Twitter/LinkedIn
npm run test:twitter       # Test Twitter only (isolated)
npm run test:linkedin      # Test LinkedIn browser only (isolated)
```

## Query Data

```bash
npm run query trending           # View trending items
npm run query topic GPT          # Search by topic
npm run query fresh 6           # Items from last 6 hours
npm run query search "AI"       # Search content
npm run query source reddit     # By source
npm run query compare 2026-04-01 2026-04-02  # Compare days
```

## Output

Each scrape creates `data/YYYY-MM-DD/`:

| File | Description |
|------|-------------|
| `trending.json` | Top 20 items ranked by engagement |
| `all.json` | All items from all sources |
| `rss.json` | RSS feed items |
| `reddit.json` | Reddit posts |
| `hackernews.json` | Hacker News stories |
| `twitter.json` | Twitter posts |
| `linkedin_browser.json` | LinkedIn posts (Playwright) |
| `linkedin.json` | LinkedIn KOL posts (BrightData) |

## Configuration

### Add RSS Feed

Edit `config/sources.js`:

```js
rssFeeds: [
  // ... existing feeds
  { name: "My Blog", url: "https://example.com/feed.xml", category: "ai-news", enabled: true }
]
```

### Enable Twitter

```js
trendingSources: {
  twitter: {
    enabled: true,
    accounts: ["AndrewYNg", "ylecun", "OpenAI"],
    minLikes: 100,
    maxTweetsPerAccount: 5,
    maxAgeHours: 24
  }
}
```

### Enable LinkedIn Browser

```js
linkedin_browser: {
  enabled: true,
  accounts: ["julienchaumond"],
  maxPostsPerAccount: 5,
  maxAgeHours: 48
}
```

### LinkedIn KOL Profiles

The KOL list defaults to `data/linkedin_kol_sample.json` (10 sample profiles). For local development with the full list:

```bash
# Set in .env
LINKEDIN_KOL_PROFILES_FILE=./data/linkedin_kol_full.json
```

The full file at `data/linkedin_kol_full.json` is gitignored — it contains your personal KOL list.

## Troubleshooting

### Twitter/LinkedIn returns 0 items

Re-run the login setup:
```bash
npm run setup:twitter
```

### LinkedIn KOL returns 0 items

Check your BrightData configuration:
```bash
cat logs/*.log | grep -i linkedin
```

### RSS feeds failing

Some feeds go down temporarily. The scraper logs errors and continues.
