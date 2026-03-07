# 📋 Master Plan: AI Agent Content Research Tool

**Project:** Content Research & Aggregation Tool for AI Agents
**Purpose:** Provide AI agents with organized, scraped content from multiple sources
**Last Updated:** 2025-03-06
**Version:** 3.0 (Simplified - Agent-Focused)

---

## 🎯 Executive Summary

**What this tool IS:**
- A data scraping and organization tool
- An MCP (Model Context Protocol) server for AI agents
- A content aggregator that feeds AI agents
- Simple, efficient, agent-friendly

**What this tool is NOT:**
- ❌ Automated social media posting system
- ❌ Scheduled content generator
- ❌ Complex publishing pipeline
- ❌ Auto-publisher to social platforms

**The Philosophy:**
> "Let the AI agents do what they're good at (writing, creativity), while this tool handles the boring work (scraping, organizing, storing data)."

---

## 🚀 System Purpose

### The Problem
- AI agents need fresh, relevant content to create social media posts
- Manual research is time-consuming
- Multiple sources are hard to track
- Data needs to be organized and accessible

### The Solution
A simple tool that:
1. **Scrapes** content from multiple sources (RSS, Reddit, HN, LinkedIn)
2. **Organizes** the data effectively
3. **Stores** it in a structured format
4. **Exposes** it to AI agents via MCP or simple API

### The Workflow
```
┌─────────────────────────────────────────────────────────┐
│                   DATA SOURCES                           │
│  RSS Feeds │ Reddit │ Hacker News │ LinkedIn │ Twitter  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CONTENT SCRAPER TOOL                        │
│  • Fetches from all sources                              │
│  • Deduplicates and filters                              │
│  • Scores by engagement                                  │
│  • Stores in JSON                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            ORGANIZED DATA STORAGE                        │
│  • Trending items (scored)                               │
│  • Categorized by topic                                  │
│  • Timestamped for freshness                             │
│  • Easy to query/filter                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              AI AGENT (Claude, etc.)                     │
│  • Queries data for specific topics                      │
│  • Reads organized content                               │
│  • Writes creative posts                                 │
│  • Adds business angle                                   │
│  • Creates engaging copy                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Features

### 1. Data Scraping (COMPLETE)

#### ✅ RSS Feeds
```bash
# Fetch from RSS feeds
npm run scrape:rss

# Sources:
- TechCrunch AI
- OpenAI Blog
- Anthropic News
- Google AI Blog
- arXiv AI/ML
- MIT Technology Review
- And more...
```

#### ✅ Reddit
```bash
# Fetch from Reddit
npm run scrape:reddit

# Subreddits:
- r/MachineLearning
- r/artificial
- r/ArtificialIntelligence
- r/deeplearning
- r/OpenAI
- r/LocalLLaMA
- r/singularity
```

#### ✅ Hacker News
```bash
# Fetch from Hacker News
npm run scrape:hn

# Filters by AI keywords
- AI, machine learning, GPT, LLM
- OpenAI, Anthropic, Google AI
```

#### ✅ LinkedIn (Optional)
```bash
# Fetch from LinkedIn KOLs
npm run scrape:linkedin

# Requires BrightData setup
```

### 2. Data Organization (COMPLETE)

#### Automatic Organization
- **Deduplication**: Same story across sources = 1 entry
- **Scoring**: By engagement (upvotes, points, comments)
- **Categorization**: By topic and keywords
- **Timestamping**: Track freshness
- **Source tracking**: Know where it came from

#### Data Organization by Day

The tool automatically creates dated folders and organized files:

```
data/
├── 2025-03-06/                    # Today's folder
│   ├── trending.json              # Top 20 trending (all sources combined)
│   ├── reddit.json                # All Reddit items
│   ├── hackernews.json            # All HN items
│   ├── rss.json                   # All RSS items
│   ├── linkedin.json              # All LinkedIn items (if enabled)
│   └── all.json                   # Everything combined
│
├── 2025-03-05/                    # Yesterday
│   ├── trending.json
│   ├── reddit.json
│   └── ...
│
├── 2025-03-04/                    # Day before
│   └── ...
│
└── archive/
    ├── week-2025-03-04/           # Archived by week
    ├── week-2025-02-25/
    └── ...
```

#### File Structure

Each daily folder contains:

**trending.json** - Top trending items from all sources
```json
{
  "date": "2025-03-06",
  "generated_at": "2025-03-06T10:00:00Z",
  "items": [
    {
      "rank": 1,
      "score": 4750,
      "sources": ["reddit", "hackernews"],
      "title": "GPT-5 Release Confirmed",
      "url": "https://...",
      "summary": "..."
    }
  ]
}
```

**reddit.json** - All Reddit items
```json
{
  "date": "2025-03-06",
  "source": "reddit",
  "items": [
    {
      "id": "reddit_abc123",
      "subreddit": "MachineLearning",
      "title": "...",
      "upvotes": 4500,
      "comments": 823,
      "url": "..."
    }
  ]
}
```

**all.json** - Combined data from all sources
```json
{
  "date": "2025-03-06",
  "total_items": 84,
  "sources": {
    "reddit": 47,
    "hackernews": 12,
    "rss": 25
  },
  "items": [...]
}
```

### 3. Agent Access (TO BUILD)

#### Option A: MCP Server (Recommended)
```javascript
// Exposes tools to AI agents
mcp-server/
├── tools/
│   ├── scrape-all.js       # Scrape all sources
│   ├── get-trending.js     # Get trending items
│   ├── get-by-topic.js     # Get items by topic
│   ├── get-fresh.js        # Get items from last N hours
│   └── search.js           # Search content
└── index.js                # MCP server
```

#### Option B: Simple CLI
```bash
# Get trending items
npm run get:trending

# Get items by topic
npm run get:topic --topic=GPT

# Get fresh items (last 6 hours)
npm run get:fresh --hours=6

# Search content
npm run search --query="automation"
```

#### Option C: Simple API
```javascript
// Lightweight Express server
GET /api/trending          # Get trending items
GET /api/topic/:topic      # Get by topic
GET /api/fresh/:hours      # Get by freshness
GET /api/search?q=query    # Search content
```

---

## 📁 Simplified Project Structure

```
social-automation/
├── src/
│   ├── scrapers/              # Data source scrapers
│   │   ├── rss.js            # RSS feed scraper
│   │   ├── reddit.js         # Reddit scraper
│   │   ├── hackernews.js     # Hacker News scraper
│   │   └── linkedin.js       # LinkedIn scraper
│   │
│   ├── processors/           # Data processing
│   │   ├── dedupe.js         # Deduplication
│   │   ├── score.js          # Engagement scoring
│   │   ├── categorize.js     # Topic categorization
│   │   └── filter.js         # Age/quality filters
│   │
│   ├── storage/              # Data management
│   │   ├── save.js           # Save to JSON
│   │   ├── load.js           # Load from JSON
│   │   └── query.js          # Query/filter data
│   │
│   ├── mcp/                  # MCP server (if using MCP)
│   │   ├── server.js         # MCP server
│   │   └── tools/            # MCP tools
│   │
│   └── cli.js                # Simple CLI interface
│
├── data/
│   ├── 2025-03-06/           # Today's scraped data
│   │   ├── trending.json     # Top trending items
│   │   ├── reddit.json       # Reddit items
│   │   ├── hackernews.json   # HN items
│   │   ├── rss.json          # RSS items
│   │   └── all.json          # All items combined
│   ├── 2025-03-05/           # Yesterday's data
│   ├── 2025-03-04/           # Previous day
│   └── archive/              # Older data (weekly folders)
│
├── config/
│   └── sources.json          # Source configuration
│
├── .env                      # API keys (minimal)
├── package.json
├── MASTER_PLAN.md            # This file
├── INSTRUCTIONS.md           # Usage instructions
└── README.md
```

---

## 🔄 Daily Workflow (Organized by Day)

### 📅 Monday - Research & Planning

**Morning (9:00 AM)**
```bash
# 1. Scrape fresh data for the week
npm run fetch

# 2. Review what's trending
npm run queue

# 3. Identify top themes for the week
cat data/queue/*.json | jq '[.[] | select(.metadata.score > 100)]'
```

**Midday (12:00 PM)**
```bash
# 4. Feed to AI agent
"Analyze the trending data and identify the top 3 AI themes for this week"

# 5. Plan content calendar
"Create a content plan for Mon-Sun based on these trends"
```

**Afternoon (3:00 PM)**
```bash
# 6. Generate first week's content
"Write Monday's LinkedIn post about the #1 trending story"

# 7. Create content for the week
"Generate 7 posts (one for each day) based on the trends"
```

---

### 📅 Tuesday - Content Generation

**Morning (9:00 AM)**
```bash
# 1. Check for fresh updates
npm run fetch

# 2. Review Monday's performance
"Which topics from Monday got the most engagement?"

# 3. Refresh Tuesday's content
"Update Tuesday's post with any new developments"
```

**Midday (12:00 PM)**
```bash
# 4. Generate variations
"Create 3 different versions of Tuesday's post:
- Professional/serious
- Casual/friendly
- Educational"
```

**Afternoon (3:00 PM)**
```bash
# 5. Prepare social media
"Create Twitter thread version of Tuesday's post"

# 6. Generate hashtags
"Suggest 10 relevant hashtags for Tuesday's content"
```

---

### 📅 Wednesday - Mid-Week Review

**Morning (9:00 AM)**
```bash
# 1. Scrape fresh data
npm run fetch

# 2. Compare with Monday's trends
"How have the trending topics changed since Monday?"

# 3. Identify emerging stories
"Are there any new trending stories that weren't on Monday's list?"
```

**Midday (12:00 PM)**
```bash
# 4. Weekly roundup
"Create a 'This Week in AI' summary post combining Mon-Wed trends"

# 5. Case study content
"Turn the #2 trending story into a case study format"
```

**Afternoon (3:00 PM)**
```bash
# 6. Community engagement
"Generate 5 discussion questions based on this week's trends"

# 7. Interactive content
"Create a poll idea based on the most controversial AI topic"
```

---

### 📅 Thursday - Deep Dives

**Morning (9:00 AM)**
```bash
# 1. Scrape fresh data
npm run fetch

# 2. Select a deep-dive topic
"From the trending data, which topic deserves a detailed explanation?"

# 3. Research mode
cat data/queue/*.json | jq '[.[] | select(.title | contains("GPT"))]'
```

**Midday (12:00 PM)**
```bash
# 4. Educational content
"Write an 'Explain Like I'm 5' post about the chosen topic"

# 5. Technical deep-dive
"Create a more technical version for the community page"
```

**Afternoon (3:00 PM)**
```bash
# 6. Myth-busting
"Identify common misconceptions about this topic and create a myth-busting post"

# 7. FAQ content
"Generate 5 FAQ items based on this week's trends"
```

---

### 📅 Friday - Weekly Summary

**Morning (9:00 AM)**
```bash
# 1. Final scrape of the week
npm run fetch

# 2. Week-over-week comparison
"Compare this week's trends with last week's trends"
```

**Midday (12:00 PM)**
```bash
# 3. Weekly roundup
"Create a comprehensive 'Top 5 AI Stories This Week' post"

# 4. Winners & losers
"Which technologies gained momentum? Which declined?"
```

**Afternoon (3:00 PM)**
```bash
# 5. Weekend content
"Create lighter, weekend-appropriate content based on trends"

# 6. Look ahead
"Based on this week's trends, what should we watch next week?"
```

---

### 📅 Saturday - Light Content

**Morning (10:00 AM)**
```bash
# 1. Quick scrape check
npm run fetch

# 2. Fun facts
"Extract interesting/fun facts from this week's trending data"

# 3. Trivia
"Create AI-themed trivia based on the trends"
```

**Afternoon (2:00 PM)**
```bash
# 4. Weekend reading
"Create a 'Weekend Reading' list from the best long-form content"

# 5. Community highlights
"Highlight the most interesting community discussions"
```

---

### 📅 Sunday - Planning for Next Week

**Morning (10:00 AM)**
```bash
# 1. Archive this week's data
mkdir -p data/archive/week-$(date +%Y-%m-%d)
mv data/queue/*.json data/archive/week-$(date +%Y-%m-%d)/

# 2. Fresh scrape for next week
npm run fetch
```

**Midday (12:00 PM)**
```bash
# 3. Weekly review
"Summarize the key AI developments from this week"

# 4. Performance analysis
"Which types of content performed best this week?"
```

**Afternoon (3:00 PM)**
```bash
# 5. Next week planning
"Based on current trends, what should we focus on next week?"

# 6. Content calendar
"Draft a content plan for Mon-Fri of next week"
```

---

## 🔄 Quick Daily Workflow (For Busy Days)

**When You're Short on Time**

```bash
# 15-Minute Routine
npm run fetch                                    # 2 min
npm run queue | head -20                         # 3 min
"Write a post about the #1 trending story"      # 10 min
```

**When You Have More Time**

```bash
# 1-Hour Deep Dive
npm run fetch                                    # 2 min
Review all trending items                        # 10 min
Select top 3 stories                             # 5 min
Generate content for all 3                       # 30 min
Review and refine                               # 13 min
```

---

## 🎯 Implementation Schedule (Day-by-Day)

### Week 1: Simplify & Organize

**Day 1: Cleanup**
- [ ] Remove unused scheduling code
- [ ] Remove auto-publishing code
- [ ] Remove daily post generators
- [ ] Keep only scraping functionality

**Day 2: Simplify Data Structure**
- [ ] Standardize JSON format
- [ ] Remove unnecessary fields
- [ ] Add source tracking
- [ ] Improve metadata

**Day 3: Build Query CLI**
- [ ] `npm run query --trending`
- [ ] `npm run query --topic=NAME`
- [ ] `npm run query --fresh=HOURS`
- [ ] `npm run query --search=QUERY`

**Day 4: Documentation**
- [ ] Update README
- [ ] Create agent guide
- [ ] Add examples
- [ ] Create quick start

**Day 5: Testing & Bug Fixes**
- [ ] Test all scrapers
- [ ] Fix any bugs
- [ ] Test query CLI
- [ ] Performance check

**Day 6-7: Buffer/Polish**
- [ ] Refine based on testing
- [ ] Add error handling
- [ ] Improve logging

---

### Week 2: MCP Server (Optional)

**Day 8: MCP Setup**
- [ ] Initialize MCP server
- [ ] Basic server structure
- [ ] Tool registration

**Day 9: Scraping Tools**
- [ ] MCP tool: `scrape_all()`
- [ ] MCP tool: `scrape_rss()`
- [ ] MCP tool: `scrape_reddit()`
- [ ] MCP tool: `scrape_hn()`

**Day 10: Query Tools**
- [ ] MCP tool: `get_trending()`
- [ ] MCP tool: `get_by_topic()`
- [ ] MCP tool: `get_fresh()`
- [ ] MCP tool: `search()`

**Day 11: Integration**
- [ ] Test with Claude
- [ ] Test with other agents
- [ ] Fix issues

**Day 12-14: Polish**
- [ ] Error handling
- [ ] Rate limiting
- [ ] Documentation

---

### Week 3: Optimization & Enhancements

**Day 15: Performance**
- [ ] Optimize scraping speed
- [ ] Add caching
- [ ] Parallel requests
- [ ] Batch processing

**Day 16: Data Quality**
- [ ] Better deduplication
- [ ] Improved scoring
- [ ] Smart categorization
- [ ] Spam filtering

**Day 17: User Experience**
- [ ] Better error messages
- [ ] Progress indicators
- [ ] Colored output
- [ ] Summary statistics

**Day 18: More Sources**
- [ ] Twitter/X integration
- [ ] YouTube channels
- [ ] More RSS feeds
- [ ] News API

**Day 19-21: Testing**
- [ ] Comprehensive testing
- [ ] Load testing
- [ ] Bug fixes
- [ ] Documentation updates

---

### Week 4: Advanced Features (Optional)

**Day 22: Trending Detection**
- [ ] Velocity tracking
- [ ] Emerging topics
- [ ] Trend predictions
- [ ] Hot right now

**Day 23: Analytics**
- [ ] Engagement tracking
- [ ] Source performance
- [ ] Topic trends
- [ ] Weekly reports

**Day 24: Export Features**
- [ ] Export to CSV
- [ ] Export to Markdown
- [ ] Generate reports
- [ ] Email summaries

**Day 25: Automation Helpers**
- [ ] Watch mode
- [ ] Auto-scrape on timer
- [ ] Webhook support
- [ ] API endpoints

**Day 26-28: Final Polish**
- [ ] All features complete
- [ ] Full documentation
- [ ] Examples & tutorials
- [ ] Release preparation

---

## 🛠️ Configuration

### Minimal Environment Variables

```bash
# Only needed for LinkedIn scraping (optional)
BRIGHTDATA_API_KEY=          # If using LinkedIn

# Optional: Rate limiting
RATE_LIMIT_DELAY=1000        # ms between requests
MAX_REQUESTS_PER_MINUTE=60
```

### Source Configuration (config/sources.json)

```json
{
  "rss": [
    {
      "name": "TechCrunch AI",
      "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
      "enabled": true
    },
    {
      "name": "OpenAI Blog",
      "url": "https://openai.com/blog/rss.xml",
      "enabled": true
    }
  ],
  "reddit": {
    "enabled": true,
    "subreddits": [
      "MachineLearning",
      "artificial",
      "OpenAI"
    ],
    "limit": 50
  },
  "hackernews": {
    "enabled": true,
    "keywords": ["AI", "machine learning", "GPT"],
    "limit": 30
  },
  "filters": {
    "min_score": 100,
    "max_age_hours": 24,
    "deduplicate": true
  }
}
```

---

## 📊 Data Models

### Scraped Item
```json
{
  "id": "reddit_abc123",
  "title": "GPT-5 Release Confirmed by OpenAI",
  "summary": "OpenAI has officially confirmed...",
  "url": "https://reddit.com/r/...",
  "source": "reddit",
  "source_name": "r/MachineLearning",
  "score": 4500,
  "engagement": {
    "upvotes": 4500,
    "comments": 823
  },
  "topic": "GPT-5",
  "keywords": ["GPT", "OpenAI", "LLM"],
  "timestamp": "2025-03-06T10:00:00Z",
  "age_hours": 2
}
```

### Deduplicated Item
```json
{
  "id": "merged_123",
  "title": "GPT-5 Release Confirmed",
  "summary": "Combined from multiple sources...",
  "sources": [
    {
      "name": "reddit",
      "url": "https://reddit.com/...",
      "score": 4500
    },
    {
      "name": "hackernews",
      "url": "https://news.ycombinator.com/...",
      "score": 250
    }
  ],
  "combined_score": 4750,
  "topic": "GPT-5",
  "timestamp": "2025-03-06T10:00:00Z"
}
```

---

## 🎯 Success Metrics

### Technical
- **Scraping speed**: <30 seconds for all sources
- **Data freshness**: <1 hour old
- **Deduplication accuracy**: >95%
- **Uptime**: >99%

### Data Quality
- **Relevant items**: >80% of scraped content
- **Trending accuracy**: Matches Reddit/HN front pages
- **Source diversity**: 3+ sources per topic
- **Engagement correlation**: Scored items actually get engagement

### Agent Experience
- **Easy to query**: Simple CLI/API
- **Well-organized**: Logical categorization
- **Fast response**: <1 second query time
- **Clear data**: Understandable structure

---

## 🚀 Quick Start for Agents

### 1. Setup
```bash
cd /home/vankhoa/projects/social-automation
npm install
```

### 2. Configure
```bash
# Edit sources if needed
nano config/sources.json
```

### 3. Use
```bash
# Scrape all sources
npm run scrape:all

# Get trending items
npm run get:trending

# Get by topic
npm run get:topic --topic=GPT

# Get fresh items
npm run get:fresh --hours=6
```

### 4. Query
```bash
# Interactive query mode
npm run query

> Show me trending AI news
> What's hot about GPT?
> Stories from last 6 hours
```

---

## 📋 Today's Tasks (Daily Checklist)

### Morning Checklist ✅
```bash
□ Run: npm run fetch
□ Check: npm run queue
□ Review: Top 5 trending items
□ Identify: Today's main theme
```

### Midday Tasks ✅
```bash
□ Generate content with AI agent
□ Create multiple versions (A/B test)
□ Prepare hashtags
□ Draft engagement questions
```

### Afternoon Tasks ✅
```bash
□ Review and refine content
□ Add French translation
□ Create image prompts
□ Schedule/post content
```

### End of Day ✅
```bash
□ Backup today's data
□ Note what worked well
□ Plan tomorrow's focus
□ Archive completed items
```

---

## 🔄 Daily Workflow

### For AI Agent
```
1. Scrape fresh data
   npm run scrape:all

2. Query for what's needed
   npm run get:trending --limit=10

3. Receive organized data
   [Array of scored, deduped items]

4. Generate creative content
   (Agent does this part)

5. Done! No publishing automation needed
```

### For Human
```
1. Morning scrape
   npm run scrape:all

2. Review trending
   npm run get:trending

3. Share with AI agent
   "Here's what's trending today, write a post about..."

4. Agent creates content

5. Review and post manually
   (Human does this part)
```

---

## 🎯 What This Tool Doesn't Do

### Intentionally NOT Included

❌ **No automated writing**
- AI agents are better at creativity
- This tool focuses on data, not content

❌ **No scheduling**
- Run it when you need data
- No cron jobs needed

❌ **No auto-publishing**
- Human oversight is important
- Quality over automation

❌ **No complex queues**
- Simple JSON storage
- No database needed

❌ **No web dashboard**
- CLI is faster
- Agents don't need GUIs

---

## 📋 Implementation Checklist

### Core Functionality
- [x] RSS scraper
- [x] Reddit scraper
- [x] Hacker News scraper
- [x] Deduplication logic
- [x] Scoring system
- [x] JSON storage

### Agent Interface
- [ ] MCP server setup
- [ ] Simple CLI
- [ ] Query interface
- [ ] Agent documentation

### Polish
- [ ] Error handling
- [ ] Rate limiting
- [ ] Tests
- [ ] Documentation

---

## 🎯 Next Steps

### Immediate (This Week)
1. ✅ Keep existing scrapers
2. ✅ Simplify data structure
3. [ ] Remove unnecessary features (scheduling, auto-publishing)
4. [ ] Build simple query interface
5. [ ] Create agent-friendly documentation

### Short-term (Next 2 Weeks)
1. Build MCP server
2. Add query tools
3. Test with AI agents
4. Optimize performance

### Long-term (Optional)
1. Add more sources
2. Improve categorization
3. Add trending detection
4. Build simple web UI (if needed)

---

## 📝 Summary

**This is a research tool, not a publishing platform.**

The goal is to:
1. Scrape data from multiple sources
2. Organize it effectively
3. Make it easy to query
4. Let AI agents handle the creative work

**Simple, focused, agent-friendly.**

---

## 🗓️ Week-at-a-Glance

### Monday
- **Focus**: Research & Planning
- **Scrape**: Full data refresh
- **Output**: Content calendar for the week

### Tuesday
- **Focus**: Content Generation
- **Scrape**: Update check
- **Output**: Tuesday's content + variations

### Wednesday
- **Focus**: Mid-Week Review
- **Scrape**: Fresh updates
- **Output**: Weekly roundup, case studies

### Thursday
- **Focus**: Deep Dives
- **Scrape**: Topic research
- **Output**: Educational content, FAQs

### Friday
- **Focus**: Weekly Summary
- **Scrape**: Final weekly scrape
- **Output**: Top 5 stories, weekend preview

### Saturday
- **Focus**: Light Content
- **Scrape**: Quick check
- **Output**: Fun facts, trivia, highlights

### Sunday
- **Focus**: Planning Next Week
- **Scrape**: Archive & refresh
- **Output**: Next week's plan, weekly review

---

## 🎯 Daily Success Metrics

### Daily Goals
- ✅ Scraped fresh data
- ✅ Reviewed trending items
- ✅ Created 1-3 quality posts
- ✅ Engaged with audience

### Weekly Goals
- ✅ 7-10 posts published
- ✅ Covered trending topics
- ✅ Maintained consistency
- ✅ Grew engagement

### Monthly Goals
- ✅ 30-40 posts published
- ✅ Identified top-performing content
- ✅ Refined content strategy
- ✅ Built audience

---

**Version:** 3.0 (Simplified)
**Last Updated:** 2025-03-06
**Focus:** Agent Tool, Not Automated Platform
