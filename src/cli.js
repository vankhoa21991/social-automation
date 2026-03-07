import dotenv from 'dotenv';
import createLogger from './utils/logger.js';
import storage from './utils/storage.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger('CLI');

async function showQueue() {
  const items = storage.getQueueItems();

  if (items.length === 0) {
    console.log('\n📭 Queue is empty\n');
    return;
  }

  console.log(`\n📥 Queue (${items.length} items):\n`);

  items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.title}`);
    console.log(`   Source: ${item.sourceName} | Score: ${item.processing?.relevanceScore || 0}`);
    console.log(`   Status: ${item.status}`);
    console.log(`   Added: ${new Date(item.queuedAt).toLocaleString()}`);
    console.log();
  });
}

async function showDrafts() {
  const drafts = storage.readAll('drafts');

  if (drafts.length === 0) {
    console.log('\n📝 No drafts available\n');
    return;
  }

  console.log(`\n📝 Drafts (${drafts.length} items):\n`);

  drafts.forEach((draft, index) => {
    console.log(`${index + 1}. ${draft.title}`);
    console.log(`   Source: ${draft.sourceName} | Tags: ${draft.tags?.join(', ') || 'N/A'}`);
    console.log(`   Summary: ${draft.summary?.substring(0, 80)}...`);
    console.log(`   Created: ${new Date(draft.processedAt).toLocaleString()}`);
    console.log();
  });
}

async function showDraft(id) {
  const draft = storage.read('drafts', id);

  if (!draft) {
    console.log(`\n❌ Draft ${id} not found\n`);
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📝 Draft: ${draft.title}`);
  console.log('='.repeat(80));
  console.log(`\n📊 Source: ${draft.sourceName}`);
  console.log(`🔗 Link: ${draft.link}`);
  console.log(`📅 Published: ${new Date(draft.pubDate).toLocaleString()}`);
  console.log(`🏷️  Tags: ${draft.tags?.join(', ') || 'N/A'}`);

  console.log(`\n💡 Summary:`);
  console.log(`   ${draft.summary}`);

  console.log(`\n📌 Suggested Titles:`);
  draft.suggestedTitles?.forEach((title, i) => {
    console.log(`   ${i + 1}. ${title}`);
  });

  console.log(`\n✍️  Rewritten Content:`);
  console.log('─'.repeat(80));
  console.log(draft.rewrittenContent);
  console.log('─'.repeat(80));

  console.log(`\n📄 Original Content:`);
  console.log('─'.repeat(80));
  console.log(draft.content?.substring(0, 500) + '...');
  console.log('─'.repeat(80));

  console.log();
}

async function approveDraft(id) {
  const draft = storage.read('drafts', id);

  if (!draft) {
    console.log(`\n❌ Draft ${id} not found\n`);
    return;
  }

  // Move to published
  draft.status = 'approved';
  draft.approvedAt = new Date().toISOString();
  storage.write('published', id, draft);
  storage.delete('drafts', id);

  console.log(`\n✅ Draft "${draft.title.substring(0, 50)}..." approved for publishing\n`);
}

async function deleteItem(type, id) {
  if (storage.exists(type, id)) {
    storage.delete(type, id);
    console.log(`\n🗑️  Item ${id} deleted from ${type}\n`);
  } else {
    console.log(`\n❌ Item ${id} not found in ${type}\n`);
  }
}

async function showPublished() {
  const items = storage.readAll('published');

  if (items.length === 0) {
    console.log('\n✅ No published items yet\n');
    return;
  }

  console.log(`\n✅ Published (${items.length} items):\n`);

  items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.title}`);
    console.log(`   Published: ${new Date(item.approvedAt).toLocaleString()}`);
    console.log(`   Status: ${item.status}`);
    console.log();
  });
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'queue':
      await showQueue();
      break;

    case 'drafts':
      await showDrafts();
      break;

    case 'draft':
      if (!arg) {
        console.log('\n❌ Please provide a draft ID\n');
        process.exit(1);
      }
      await showDraft(arg);
      break;

    case 'approve':
      if (!arg) {
        console.log('\n❌ Please provide a draft ID to approve\n');
        process.exit(1);
      }
      await approveDraft(arg);
      break;

    case 'delete':
      if (!arg) {
        console.log('\n❌ Please provide item type (queue/drafts/published) and ID\n');
        process.exit(1);
      }
      const type = process.argv[3];
      const id = process.argv[4];
      await deleteItem(type, id);
      break;

    case 'published':
      await showPublished();
      break;

    default:
      console.log(`
Usage: node src/cli.js [command] [arguments]

Commands:
  queue              - Show all queued items
  drafts             - Show all drafts
  draft <id>         - Show full draft content
  approve <id>       - Approve draft for publishing
  delete <type> <id> - Delete item (queue/drafts/published)
  published          - Show all published items

Examples:
  node src/cli.js queue
  node src/cli.js drafts
  node src/cli.js draft 1234567890-abc
  node src/cli.js approve 1234567890-abc
  node src/cli.js delete drafts 1234567890-abc
      `);
  }
}

main().catch(console.error);
