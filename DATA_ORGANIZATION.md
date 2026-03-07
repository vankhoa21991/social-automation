# 📅 Data Organization by Day

**How scraped data is organized in daily folders**

---

## 📁 Folder Structure

```
data/
├── 2025-03-06/                    # Today's scraped data
│   ├── trending.json              # Top 20 trending (all sources)
│   ├── reddit.json                # All Reddit items
│   ├── hackernews.json            # All HN items
│   ├── rss.json                   # All RSS items
│   ├── linkedin.json              # All LinkedIn items (if enabled)
│   └── all.json                   # Everything combined
│
├── 2025-03-05/                    # Yesterday's data
│   ├── trending.json
│   ├── reddit.json
│   ├── hackernews.json
│   ├── rss.json
│   └── all.json
│
├── 2025-03-04/                    # Day before
│   └── ...
│
├── 2025-03-03/
├── 2025-03-02/
├── 2025-03-01/
│
└── archive/                       # Older data (by week)
    ├── week-2025-03-04/
    ├── week-2025-02-25/
    └── ...
```

---

## 📄 File Contents

### trending.json
Top 20 trending items from all sources, ranked by combined score.

```json
{
  "date": "2025-03-06",
  "generated_at": "2025-03-06T10:00:00Z",
  "total_items": 20,
  "items": [
    {
      "rank": 1,
      "score": 4750,
      "sources": ["reddit", "hackernews"],
      "title": "GPT-5 Release Confirmed by OpenAI",
      "url": "https://reddit.com/r/...",
      "summary": "OpenAI has officially confirmed...",
      "keywords": ["GPT-5", "OpenAI", "LLM"],
      "engagement": {
        "upvotes": 4500,
        "comments": 823,
        "points": 250
      }
    },
    {
      "rank": 2,
      "score": 3200,
      "sources": ["reddit"],
      "title": "Google's New Gemini Model Beats GPT-4",
      "url": "https://reddit.com/r/...",
      "summary": "Google announced...",
      "keywords": ["Gemini", "Google", "GPT-4"],
      "engagement": {
        "upvotes": 3200,
        "comments": 412,
        "points": 0
      }
    }
  ]
}
```

### reddit.json
All items scraped from Reddit.

```json
{
  "date": "2025-03-06",
  "source": "reddit",
  "total_items": 47,
  "items": [
    {
      "id": "reddit_abc123",
      "subreddit": "MachineLearning",
      "title": "GPT-5 Release Confirmed",
      "content": "Full post content...",
      "url": "https://reddit.com/r/...",
      "author": "user123",
      "posted_at": "2025-03-06T08:00:00Z",
      "scraped_at": "2025-03-06T10:00:00Z",
      "engagement": {
        "upvotes": 4500,
        "comments": 823,
        "awards": 5
      },
      "age_hours": 2
    }
  ]
}
```

### hackernews.json
All items scraped from Hacker News.

```json
{
  "date": "2025-03-06",
  "source": "hackernews",
  "total_items": 12,
  "items": [
    {
      "id": "hn_456",
      "title": "GPT-5 Release Confirmed",
      "url": "https://openai.com/blog/...",
      "hn_url": "https://news.ycombinator.com/item?id=456",
      "author": "founder123",
      "posted_at": "2025-03-06T07:30:00Z",
      "scraped_at": "2025-03-06T10:00:00Z",
      "engagement": {
        "points": 250,
        "comments": 156
      },
      "age_hours": 2.5
    }
  ]
}
```

### rss.json
All items scraped from RSS feeds.

```json
{
  "date": "2025-03-06",
  "source": "rss",
  "total_items": 25,
  "items": [
    {
      "id": "rss_openai_001",
      "feed": "OpenAI Blog",
      "feed_url": "https://openai.com/blog/rss.xml",
      "title": "Introducing GPT-5",
      "content": "We are excited to announce...",
      "url": "https://openai.com/blog/gpt5",
      "published_at": "2025-03-06T06:00:00Z",
      "scraped_at": "2025-03-06T10:00:00Z",
      "age_hours": 4
    }
  ]
}
```

### all.json
Combined data from all sources.

```json
{
  "date": "2025-03-06",
  "generated_at": "2025-03-06T10:00:00Z",
  "total_items": 84,
  "sources": {
    "reddit": 47,
    "hackernews": 12,
    "rss": 25
  },
  "top_topics": [
    "GPT-5",
    "Google Gemini",
    "AI Regulation",
    "Open Source LLMs"
  ],
  "items": [
    {
      "id": "unique_id",
      "source": "reddit",
      "title": "...",
      "url": "...",
      "score": 4500,
      "scraped_at": "2025-03-06T10:00:00Z"
    }
  ]
}
```

---

## 🔄 Daily Workflow

### Morning (9:00 AM)

```bash
# 1. Scrape today's data
npm run scrape

# Output:
# ✅ Created folder: data/2025-03-06/
# ✅ Saved: trending.json (20 items)
# ✅ Saved: reddit.json (47 items)
# ✅ Saved: hackernews.json (12 items)
# ✅ Saved: rss.json (25 items)
# ✅ Saved: all.json (84 items)

# 2. View today's trending
cat data/2025-03-06/trending.json | jq

# 3. Share with AI agent
"Read data/2025-03-06/trending.json and create a LinkedIn post about the top story"
```

### Midday (12:00 PM)

```bash
# 1. Check for updates
npm run scrape

# This will update today's files:
# data/2025-03-06/trending.json (updated)
# data/2025-03-06/reddit.json (updated)
# etc.

# 2. Compare with morning
diff data/2025-03-06/trending.json.09:00.json data/2025-03-06/trending.json
```

### Afternoon (3:00 PM)

```bash
# 1. Compare with yesterday
cat data/2025-03-06/trending.json | jq '.items[0:5]'
cat data/2025-03-05/trending.json | jq '.items[0:5]'

# 2. Spot changes
"What's new today that wasn't trending yesterday?"
```

---

## 📊 Comparing Days

### View Trending Progression

```bash
# Last 7 days of trending
for day in {0..6}; do
  date=$(date -d "$day days ago" +%Y-%m-%d)
  echo "=== $date ==="
  cat data/$date/trending.json | jq '.items[0:3].title'
  echo
done
```

### Track Topic Evolution

```bash
# How a topic changed over the week
grep -r "GPT-5" data/*/trending.json | jq
```

---

## 🗄️ Archiving

### Weekly Archive

```bash
# Run every Sunday
# Move last 7 days to archive

week_start=$(date -d "7 days ago" +%Y-%m-%d)
archive_folder="archive/week-$week_start"

mkdir -p "$archive_folder"
mv data/2025-03-* "$archive_folder/"
```

### Archive Structure

```
archive/
├── week-2025-03-04/
│   ├── 2025-03-04/
│   ├── 2025-03-05/
│   ├── 2025-03-06/
│   └── summary.json
│
├── week-2025-02-25/
│   └── ...
│
└── summary.json               # All-time summary
```

---

## 🔍 Querying Data by Day

### Get Today's Data

```bash
# Today's trending
cat data/$(date +%Y-%m-%d)/trending.json

# Today's Reddit items
cat data/$(date +%Y-%m-%d)/reddit.json
```

### Get Yesterday's Data

```bash
# Yesterday's trending
cat data/$(date -d "yesterday" +%Y-%m-%d)/trending.json
```

### Get Last 7 Days

```bash
# Last 7 days of trending items
for i in {0..6}; do
  day=$(date -d "$i days ago" +%Y-%m-%d)
  cat data/$day/trending.json
done
```

### Filter by Score

```bash
# Items with score > 1000 from today
cat data/$(date +%Y-%m-%d)/all.json | jq '.items[] | select(.score > 1000)'
```

---

## 📈 Benefits of Day-Based Organization

### 1. Easy Navigation
- Know exactly where today's data is
- Quick comparison with previous days
- Simple archiving

### 2. Fresh Data Always
- Each day gets a clean slate
- No confusion about old vs new
- Easy to see what's fresh

### 3. Historical Tracking
- See how trends evolve
- Compare day-to-day changes
- Track topic momentum

### 4. Agent-Friendly
- AI agents can easily request "today's trending"
- Simple file paths
- Consistent structure

### 5. Backup & Archive
- Easy to backup specific days
- Weekly archiving is simple
- Can delete old data easily

---

## 🎯 Common Commands

### Daily Commands

```bash
# Scrape today's data
npm run scrape

# View today's trending
cat data/$(date +%Y-%m-%d)/trending.json | jq

# Compare with yesterday
diff <(cat data/$(date +%Y-%m-%d)/trending.json) \
     <(cat data/$(date -d "yesterday" +%Y-%m-%d)/trending.json)
```

### Weekly Commands

```bash
# Summary of the week
find data/ -name "trending.json" -mtime -7 -exec cat {} \; | jq '.items | length'

# Archive last week
mv data/2025-03-* archive/week-2025-03-04/
```

---

## 📝 Summary

**Data is organized by date:**
- Each day gets its own folder: `data/YYYY-MM-DD/`
- Files are organized by source: `trending.json`, `reddit.json`, etc.
- Easy to find today's data, yesterday's data, or any specific day
- Simple to compare days and track trends over time

**Perfect for:**
- AI agents requesting "today's trending stories"
- Comparing today vs yesterday
- Tracking how trends evolve
- Weekly/monthly analysis

---

**Last Updated:** 2025-03-06
