# Instructions: Social Automation — Content Research Tool

**Project:** Content scraping & aggregation for AI agents
**Last Updated:** 2026-03-07
**Version:** 2.0

---

## What This Tool Does

Scrapes AI/tech content from multiple sources and stores it as structured JSON. AI agents then read this data to create posts, research topics, or track industry trends.

**Sources:**
- 17 RSS feeds (including OpenAI, Anthropic, Claude, Google AI, arXiv, etc.)
- Reddit (7 AI subreddits)
- Hacker News (AI-filtered, 50+ points)
- LinkedIn KOL posts (via BrightData SERP)

**Output:** Structured JSON files in `data/YYYY-MM-DD/`

---

## The Only Command

```bash
npm run scrape
```

That's it. Run this whenever you need fresh data.

---

## Quick Start

```bash
cd /home/vankhoa/projects/social-automation
npm run scrape
```

**Expected output:**
```
🔄 Starting scrape cycle...
📰 Fetching from RSS feeds...
✅ RSS: 35 items
📱 Fetching from Reddit...
✅ Reddit: 17 items
📰 Fetching from Hacker News...
✅ Hacker News: 8 items
💼 Fetching from LinkedIn...
✅ LinkedIn: 12 items
✅ Generated: trending.json (20 items)
✅ Generated: all.json (72 items)
✨ Scraping complete: 72 total items
```

---

## Output Files

All files saved to `data/YYYY-MM-DD/` (today's date folder):

| File | Description |
|------|-------------|
| `trending.json` | Top 20 items ranked by engagement score — **start here** |
| `all.json` | Every item from all sources combined |
| `rss.json` | RSS feed items only |
| `reddit.json` | Reddit posts only |
| `hackernews.json` | Hacker News stories only |
| `linkedin.json` | LinkedIn KOL posts only |

### trending.json structure

```json
{
  "date": "2026-03-07",
  "total_items": 20,
  "items": [
    {
      "rank": 1,
      "score": 4500,
      "title": "GPT-5 Released by OpenAI",
      "url": "https://...",
      "summary": "...",
      "sources": ["reddit", "r/MachineLearning"],
      "engagement": { "upvotes": 4500, "comments": 823 }
    }
  ]
}
```

### all.json structure

```json
{
  "date": "2026-03-07",
  "total_items": 72,
  "sources": { "rss": 35, "reddit": 17, "hackernews": 8, "linkedin": 12 },
  "items": [
    {
      "id": "abc123",
      "source": "rss",
      "sourceName": "Claude Blog",
      "category": "company-news",
      "title": "Common workflow patterns for AI agents",
      "link": "https://claude.com/blog/...",
      "content": "...",
      "summary": "...",
      "pubDate": "2026-03-05T00:00:00Z",
      "author": "Claude Blog",
      "age_hours": 48,
      "scraped_at": "2026-03-07T10:00:00Z"
    }
  ]
}
```

---

## Configuration

### Environment Variables (`.env`)

```bash
ANTHROPIC_API_KEY=sk-ant-...      # Claude API key
BRIGHTDATA_API_KEY=...            # Required for LinkedIn scraping
BRIGHTDATA_ZONE=mcp_unlocker     # BrightData zone (default: mcp_unlocker)
```

### Sources (`config/sources.json`)

**RSS Feeds — 17 sources:**

| Name | Category |
|------|----------|
| TechCrunch AI | ai-news |
| The Gradient | ai-research |
| MIT Technology Review AI | tech-news |
| OpenAI Blog | company-news |
| Anthropic Blog | company-news |
| Claude Blog | company-news |
| Google AI Blog | company-news |
| DeepMind Blog | research |
| Hugging Face Blog | ml-frameworks |
| Meta Engineering | company-engineering |
| Netflix Tech Blog | company-engineering |
| AWS Machine Learning Blog | cloud-ai |
| Microsoft AI Blog | company-news |
| NVIDIA Technical Blog | company-engineering |
| LinkedIn Engineering | company-engineering |
| arXiv AI (cs.AI) | research-papers |
| arXiv Machine Learning (cs.LG) | research-papers |

**Reddit — 7 subreddits** (min 100 upvotes, max 24h old):
`MachineLearning`, `artificial`, `ArtificialIntelligence`, `deeplearning`, `OpenAI`, `LocalLLaMA`, `singularity`

**Hacker News** — keyword-filtered, min 50 points

**LinkedIn** — top 20 KOLs from `workspace/marketing/linkedin_kol_clean.json`, scraped via BrightData Google SERP

---

## Adding/Changing Sources

### Add an RSS feed

Edit `config/sources.json` under `rssFeeds`:

```json
{
  "name": "My Blog",
  "url": "https://example.com/feed.xml",
  "category": "ai-news",
  "enabled": true
}
```

### Disable an RSS feed

Set `"enabled": false` for that feed.

### Change LinkedIn KOL limit

```json
"linkedin": {
  "limit": 30
}
```

### Add a Reddit subreddit

Add to `trendingSources.reddit.subreddits` array.

### Add a Hacker News keyword

Add to `trendingSources.hackernews.keywords` array.

---

## Reading the Data

```bash
# Today's trending items (titles only)
cat data/$(date +%Y-%m-%d)/trending.json | jq '.items[] | "\(.rank). \(.title)"'

# All items from LinkedIn
cat data/$(date +%Y-%m-%d)/linkedin.json | jq '.items[] | {author: .sourceName, title, link}'

# Filter all items by keyword
cat data/$(date +%Y-%m-%d)/all.json | jq '[.items[] | select(.title | test("GPT|Claude|Anthropic"; "i"))]'

# Items from a specific source
cat data/$(date +%Y-%m-%d)/all.json | jq '[.items[] | select(.source == "rss") | select(.sourceName == "Claude Blog")]'

# Sort by age (newest first)
cat data/$(date +%Y-%m-%d)/all.json | jq '[.items[] | select(.age_hours != null)] | sort_by(.age_hours)'
```

---

## Common AI Agent Workflows

### Daily content briefing

```
Read data/$(date +%Y-%m-%d)/trending.json and summarize the top 5 AI stories from today.
```

### LinkedIn post creation

```
Read data/$(date +%Y-%m-%d)/trending.json and create a LinkedIn post in French about the most impactful AI story. Target audience: local business owners in southern France.
```

### Competitive intelligence

```
Read data/$(date +%Y-%m-%d)/all.json and summarize everything related to Anthropic and Claude published in the last 48 hours.
```

### KOL content analysis

```
Read data/$(date +%Y-%m-%d)/linkedin.json and identify the main themes that AI thought leaders are discussing today.
```

---

## Troubleshooting

### LinkedIn returns 0 items

1. Check logs for the specific error: `cat logs/*.log | grep -i linkedin`
2. Verify the KOL file exists: `ls /home/vankhoa/projects/aikeytake/workspace/marketing/linkedin_kol_clean.json`
3. Confirm the `mcp_unlocker` zone exists in your BrightData account dashboard
4. Check the KOL file path in `config/sources.json` → `linkedin.profilesFile`

### An RSS feed fails

Normal — some feeds go down. The scraper logs the error and continues. Check:
```bash
cat logs/*.log | grep ERROR
```

### No data folder for today

```bash
npm run scrape
ls data/$(date +%Y-%m-%d)/
```

### Stale data

Just re-run — output is overwritten each time for the same date:
```bash
npm run scrape
```

---

## Project Structure

```
social-automation/
├── src/
│   ├── fetchers/
│   │   ├── rss.js          # 17 RSS feeds
│   │   ├── reddit.js       # 7 AI subreddits
│   │   ├── hackernews.js   # HN top stories
│   │   └── linkedin.js     # LinkedIn via BrightData SERP
│   ├── utils/
│   │   └── logger.js
│   ├── cli.js
│   └── index.js            # Main orchestrator (npm run scrape)
├── config/
│   └── sources.json        # All source configuration
├── data/
│   └── YYYY-MM-DD/
│       ├── trending.json   # Top 20 ranked items
│       ├── all.json        # All items combined
│       ├── rss.json
│       ├── reddit.json
│       ├── hackernews.json
│       └── linkedin.json
├── logs/                   # Scrape logs
├── .env                    # API keys
├── .env.example            # Template
└── package.json
```

---

## Summary

1. Run `npm run scrape`
2. Read `data/YYYY-MM-DD/trending.json` (or `all.json` for full depth)
3. Feed the data to an AI agent to create content
