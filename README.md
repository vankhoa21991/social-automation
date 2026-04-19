# Social Automation

AI/tech news aggregator that scrapes multiple sources and outputs structured JSON for AI agents to consume.

## What It Does

Scrapes from 17+ sources:
- **RSS feeds**: OpenAI, Anthropic, Claude, Google AI, DeepMind, HuggingFace, arXiv, and more
- **Reddit**: 7 AI subreddits (MachineLearning, artificial, OpenAI, etc.)
- **Hacker News**: AI-filtered stories with 50+ points
- **Twitter/X**: Via Playwright browser (login session required)
- **LinkedIn**: Browser-based scraping or BrightData SERP API
- **Generic APIs**: REST/GraphQL with configurable JSONPath mapping

Outputs ranked trending items, ready for AI agents to turn into content.

## Quick Start

```bash
npm install
cp .env.example .env
# Add your API keys to .env
npm run scrape
```

Results saved to `data/YYYY-MM-DD/`.

## Configuration

Edit `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-...      # Optional: for writing agents
BRIGHTDATA_API_KEY=...            # Required for LinkedIn KOL scraping
BRIGHTDATA_ZONE=mcp_unlocker
LINKEDIN_KOL_PROFILES_FILE=./data/linkedin_kol_sample.json
```

## Commands

```bash
npm run scrape              # Scrape all sources
npm run query trending      # View trending items
npm run query topic GPT     # Search by topic
npm run query fresh 6       # Items from last 6 hours
npm run setup:twitter      # Setup Twitter/LinkedIn browser login
```

## Output

```
data/YYYY-MM-DD/
├── trending.json    # Top 20 items ranked by engagement
├── all.json         # All items combined
├── rss.json         # RSS feed items
├── reddit.json       # Reddit posts
├── hackernews.json   # Hacker News stories
└── ...
```

## Architecture

```
config/sources.js        # All source configuration
       ↓
src/index.js             # Main orchestrator
       ↓
src/fetchers/
├── rss.js              # RSS feeds
├── reddit.js            # Reddit
├── hackernews.js        # Hacker News
├── twitter.js           # Twitter/X (Playwright)
├── linkedin_browser.js  # LinkedIn (Playwright)
├── linkedin.js          # LinkedIn (BrightData)
└── api.js              # Generic REST/GraphQL
       ↓
data/YYYY-MM-DD/*.json   # Daily output
```

## License

MIT
