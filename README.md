# Social Automation — Content Research Tool

Scrapes AI/tech content from multiple sources and stores structured JSON for AI agents to consume.

## Quick Start

```bash
cd /home/vankhoa/projects/social-automation
npm install
npm run scrape
```

Output saved to `data/YYYY-MM-DD/`:

| File | Contents |
|------|----------|
| `trending.json` | Top 20 trending items ranked by engagement |
| `all.json` | All items from all sources combined |
| `rss.json` | RSS feed items |
| `reddit.json` | Reddit posts |
| `hackernews.json` | Hacker News stories |
| `linkedin.json` | LinkedIn KOL posts (via BrightData) |
| `twitter.json` | Twitter/X posts (via Playwright) |
| `linkedin_browser.json` | LinkedIn posts (via Playwright) |

---

## Sources

### RSS Feeds (17 sources)
TechCrunch AI, The Gradient, MIT Technology Review AI, OpenAI Blog, Anthropic Blog, Claude Blog, Google AI Blog, DeepMind Blog, Hugging Face Blog, Meta Engineering, Netflix Tech Blog, AWS ML Blog, Microsoft AI Blog, NVIDIA Blog, LinkedIn Engineering, arXiv AI (cs.AI), arXiv ML (cs.LG)

### Reddit
7 AI subreddits: MachineLearning, artificial, ArtificialIntelligence, deeplearning, OpenAI, LocalLLaMA, singularity
- Minimum 100 upvotes
- Maximum 24 hours old

### Hacker News
- AI/ML/LLM keyword filtering
- Minimum 50 points

### LinkedIn
Two modes:
1. **KOL via BrightData SERP** - Scrapes top KOLs from configured list
2. **Browser via Playwright** - Direct profile scraping without API

### Twitter/X (Browser)
- Uses Playwright to scrape real browser session
- Requires one-time login setup
- Minimum likes configurable

---

## Commands

### Scrape All Sources
```bash
npm run scrape
```

### Query Data
```bash
npm run query trending           # Today's trending items
npm run query topic GPT          # Items about a topic
npm run query fresh 6            # Last N hours
npm run query search "AI"        # Search content
npm run query source reddit       # By source
npm run query compare 2026-04-01 2026-04-02  # Compare days
```

### Browser Sources Setup
```bash
npm run setup:twitter   # One-time login (opens Chrome window)
npm run test:twitter    # Test Twitter scraper
npm run test:linkedin   # Test LinkedIn browser scraper
```

---

## Configuration

### Environment Variables (.env)

```bash
BRIGHTDATA_API_KEY=...         # LinkedIn KOL scraping
BRIGHTDATA_ZONE=mcp_unlocker   # BrightData zone
```

### Adding RSS Feeds

Edit `config/sources.json`:

```json
{
  "rssFeeds": [
    {
      "name": "My Blog",
      "url": "https://example.com/feed.xml",
      "category": "ai-news",
      "enabled": true
    }
  ]
}
```

### Enabling Twitter/X

Edit `config/sources.json`:

```json
"trendingSources": {
  "twitter": {
    "enabled": true,
    "accounts": ["AndrewYNg", "ylecun", "OpenAI"],
    "minLikes": 100,
    "maxTweetsPerAccount": 5,
    "maxAgeHours": 24
  }
}
```

### Enabling LinkedIn Browser

```json
"linkedin_browser": {
  "enabled": true,
  "accounts": ["julienchaumond"],
  "maxPostsPerAccount": 5,
  "maxAgeHours": 48
}
```

---

## Output Storage

Each scrape creates/overwrites `data/YYYY-MM-DD/`:

**Per-source files:**
```
data/2026-04-19/
├── rss.json              # RSS feed items
├── reddit.json           # Reddit posts
├── hackernews.json      # Hacker News stories
├── linkedin.json        # LinkedIn KOL (BrightData)
├── twitter.json         # Twitter/X posts
├── linkedin_browser.json # LinkedIn (Playwright)
├── api.json             # Generic API sources
├── all.json             # All items combined
└── trending.json        # Top 20 ranked by score
```

**Scoring:** Items are ranked by engagement (upvotes, points, comments) with source diversity (max 5 items per source). RSS items score by summary length since they lack engagement metrics.

**Supabase option:** Pass `toSupabase: true` to `scrape()` to also save normalized items to `newsletter_items` table.

---

## Project Structure

```
social-automation/
├── src/
│   ├── fetchers/
│   │   ├── rss.js              # RSS feeds
│   │   ├── reddit.js           # Reddit
│   │   ├── hackernews.js       # Hacker News
│   │   ├── linkedin.js         # LinkedIn KOL (BrightData)
│   │   ├── linkedin_browser.js # LinkedIn (Playwright)
│   │   ├── twitter.js          # Twitter/X (Playwright)
│   │   └── api.js              # Generic API sources
│   ├── utils/
│   │   ├── logger.js           # Color-coded logger
│   │   └── storage.js          # JSON file storage
│   ├── index.js                # Main scraper
│   ├── query.js                # DataQuery class
│   └── cli.js                  # CLI interface
├── config/
│   └── sources.json            # Source configuration
├── data/
│   ├── YYYY-MM-DD/             # Daily output
│   └── playwright-profile/      # Browser session cache
├── logs/                       # Scrape logs
└── package.json
```

---

## Troubleshooting

### LinkedIn returns 0 items
1. Check logs: `cat logs/*.log | grep -i linkedin`
2. Verify KOL file exists: `ls /home/vankhoa/projects/aikeytake/workspace/marketing/linkedin_kol_clean.json`
3. Confirm BrightData zone exists

### Twitter/LinkedIn auth errors
Re-run setup: `npm run setup:twitter` and log in again

### RSS feed fails
Some feeds go down temporarily — scraper logs errors and continues

### No data for today
```bash
npm run scrape
ls data/$(date +%Y-%m-%d)/
```
