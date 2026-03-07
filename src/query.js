import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DataQuery {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
  }

  getTodayFolder() {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.dataDir, today);
  }

  getDateFolder(dateStr) {
    return path.join(this.dataDir, dateStr);
  }

  loadTrending(dateStr = null) {
    const folder = dateStr ? this.getDateFolder(dateStr) : this.getTodayFolder();
    const filePath = path.join(folder, 'trending.json');

    if (!fs.existsSync(filePath)) {
      console.error(`❌ No trending data found for ${dateStr || 'today'}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  loadAll(dateStr = null) {
    const folder = dateStr ? this.getDateFolder(dateStr) : this.getTodayFolder();
    const filePath = path.join(folder, 'all.json');

    if (!fs.existsSync(filePath)) {
      console.error(`❌ No data found for ${dateStr || 'today'}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  // Query: Get trending items
  getTrending(limit = 20, dateStr = null) {
    const data = this.loadTrending(dateStr);
    if (!data) return [];

    return data.items.slice(0, limit);
  }

  // Query: Get by topic
  getByTopic(topic, dateStr = null) {
    const data = this.loadAll(dateStr);
    if (!data) return [];

    const lowerTopic = topic.toLowerCase();
    return data.items.filter(item => {
      const title = (item.title || '').toLowerCase();
      const summary = (item.summary || item.content || '').toLowerCase();
      const keywords = (item.keywords || item.tags || []).map(k => k.toLowerCase());

      return title.includes(lowerTopic) ||
             summary.includes(lowerTopic) ||
             keywords.some(k => k.includes(lowerTopic));
    });
  }

  // Query: Get fresh items (last N hours)
  getFresh(hours = 24, dateStr = null) {
    const data = this.loadAll(dateStr);
    if (!data) return [];

    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    return data.items.filter(item => {
      const itemTime = new Date(item.pubDate || item.created_at || item.scraped_at).getTime();
      return itemTime > cutoffTime;
    });
  }

  // Query: Search
  search(query, dateStr = null) {
    const data = this.loadAll(dateStr);
    if (!data) return [];

    const lowerQuery = query.toLowerCase();
    return data.items.filter(item => {
      const title = (item.title || '').toLowerCase();
      const content = (item.content || item.summary || '').toLowerCase();

      return title.includes(lowerQuery) || content.includes(lowerQuery);
    });
  }

  // Query: Get by source
  getBySource(source, dateStr = null) {
    const folder = dateStr ? this.getDateFolder(dateStr) : this.getTodayFolder();
    const filePath = path.join(folder, `${source}.json`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ No data found for source: ${source}`);
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return data.items || [];
  }

  // Query: Compare two days
  compareDays(date1, date2) {
    const data1 = this.loadTrending(date1);
    const data2 = this.loadTrending(date2);

    if (!data1 || !data2) {
      console.error('❌ Could not load data for comparison');
      return null;
    }

    const titles1 = new Set(data1.items.map(i => i.title));
    const titles2 = new Set(data2.items.map(i => i.title));

    const newToday = [...titles2].filter(t => !titles1.has(t));
    const goneToday = [...titles1].filter(t => !titles2.has(t));

    return {
      new: newToday,
      gone: goneToday,
      common: [...titles1].filter(t => titles2.has(t))
    };
  }

  // Display: Show trending items
  displayTrending(items, limit = 10) {
    console.log('\n📊 Trending Items:\n');
    items.slice(0, limit).forEach((item, index) => {
      console.log(`${index + 1}. ${item.title || 'No title'}`);
      console.log(`   Score: ${item.score || item.combined_score || 'N/A'}`);
      console.log(`   Sources: ${(item.sources || [item.source]).join(', ')}`);
      console.log(`   URL: ${item.url || item.link || 'N/A'}`);
      console.log();
    });
  }

  // Display: Show by topic
  displayByTopic(items, topic) {
    console.log(`\n🔍 Items about "${topic}":\n`);
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title || 'No title'}`);
      console.log(`   Source: ${item.source || 'N/A'}`);
      console.log(`   URL: ${item.url || item.link || 'N/A'}`);
      console.log();
    });
  }

  // Display: Show search results
  displaySearchResults(items, query) {
    console.log(`\n🔎 Search results for "${query}":\n`);
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title || 'No title'}`);
      console.log(`   Source: ${item.source || 'N/A'}`);
      if (item.summary) {
        console.log(`   Summary: ${item.summary.substring(0, 100)}...`);
      }
      console.log();
    });
  }

  // Display: Show comparison
  displayComparison(comparison, date1, date2) {
    console.log(`\n📅 Comparison: ${date1} vs ${date2}\n`);

    if (comparison.new.length > 0) {
      console.log('✨ New today:');
      comparison.new.slice(0, 5).forEach(title => {
        console.log(`  + ${title}`);
      });
      console.log();
    }

    if (comparison.gone.length > 0) {
      console.log('📉 Gone today:');
      comparison.gone.slice(0, 5).forEach(title => {
        console.log(`  - ${title}`);
      });
      console.log();
    }

    console.log(`🔄 Common: ${comparison.common.length} items`);
  }
}

// CLI interface
async function main() {
  const query = new DataQuery();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: npm run query [command] [options]

Commands:
  trending           Show today's trending items
  trending [date]    Show trending for specific date (YYYY-MM-DD)
  topic [name]       Get items by topic
  fresh [hours]      Get items from last N hours (default: 24)
  search [query]     Search content
  source [name]      Get items by source (reddit, hackernews, rss)
  compare [d1] [d2]  Compare two days

Options:
  --limit=N          Limit results (default: 10)
  --date=YYYY-MM-DD  Use specific date

Examples:
  npm run query trending
  npm run query trending --limit=5
  npm run query topic GPT
  npm run query fresh 6
  npm run query search "openai"
  npm run query source reddit
  npm run query compare 2025-03-05 2025-03-06
    `);
    return;
  }

  const command = args[0];
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 10;
  const dateArg = args.find(a => a.startsWith('--date='))?.split('=')[1];

  switch (command) {
    case 'trending': {
      const items = query.getTrending(limit, dateArg);
      query.displayTrending(items, limit);
      break;
    }

    case 'topic': {
      const topic = args[1];
      if (!topic) {
        console.error('❌ Please provide a topic name');
        return;
      }
      const items = query.getByTopic(topic, dateArg);
      query.displayByTopic(items, topic);
      break;
    }

    case 'fresh': {
      const hours = parseInt(args[1]) || 24;
      const items = query.getFresh(hours, dateArg);
      console.log(`\n⏰ Items from last ${hours} hours:\n`);
      items.slice(0, limit).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title || 'No title'}`);
        console.log(`   Age: ${item.age_hours || 'N/A'} hours`);
        console.log(`   Source: ${item.source || 'N/A'}`);
        console.log();
      });
      break;
    }

    case 'search': {
      const searchQuery = args[1];
      if (!searchQuery) {
        console.error('❌ Please provide a search query');
        return;
      }
      const items = query.search(searchQuery, dateArg);
      query.displaySearchResults(items, searchQuery);
      break;
    }

    case 'source': {
      const source = args[1];
      if (!source) {
        console.error('❌ Please provide a source name (reddit, hackernews, rss)');
        return;
      }
      const items = query.getBySource(source, dateArg);
      console.log(`\n📰 Items from ${source}:\n`);
      items.slice(0, limit).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title || 'No title'}`);
        console.log(`   Score: ${item.metadata?.score || item.engagement?.upvotes || 'N/A'}`);
        console.log(`   URL: ${item.url || item.link || 'N/A'}`);
        console.log();
      });
      break;
    }

    case 'compare': {
      const date1 = args[1];
      const date2 = args[2];
      if (!date1 || !date2) {
        console.error('❌ Please provide two dates to compare (YYYY-MM-DD YYYY-MM-DD)');
        return;
      }
      const comparison = query.compareDays(date1, date2);
      if (comparison) {
        query.displayComparison(comparison, date1, date2);
      }
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "npm run query" to see available commands');
  }
}

main().catch(console.error);

export default DataQuery;
