/**
 * Newsletter CLI Commands
 * Command-line interface for newsletter management
 */

import 'dotenv/config';
import NewsletterService from './api/newsletter-service.js';
import createLogger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('NewsletterCLI');

// Load configuration
const config = {
  email: {
    provider: process.env.EMAIL_PROVIDER || 'console',
    from: process.env.EMAIL_FROM || 'AI Keytake <noreply@aikeytake.com>',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY
    }
  }
};

const service = new NewsletterService(config);

/**
 * Show help
 */
function showHelp() {
  console.log(`
Newsletter CLI - Manage your email newsletters

Commands:
  newsletter:help                    Show this help message
  newsletter:stats                   Show newsletter statistics
  newsletter:subscribers             List all subscribers
  newsletter:add <email> [name]      Add new subscriber
  newsletter:unsubscribe <email>     Unsubscribe subscriber
  newsletter:import <file>           Import subscribers from CSV
  newsletter:export                  Export subscribers to CSV
  newsletter:list                    List all newsletters
  newsletter:create <title>          Create new newsletter
  newsletter:generate <date>         Generate newsletter from trending data
  newsletter:schedule <id> <date>    Schedule newsletter for sending
  newsletter:send <id>               Send newsletter
  newsletter:test <id> <email>       Test send newsletter to email
  newsletter:show <id>               Show newsletter details
  newsletter:delete <id>             Delete newsletter

Examples:
  node src/newsletter/cli.js stats
  node src/newsletter/cli.js add user@example.com "John Doe"
  node src/newsletter/cli.js generate 2026-03-12
  node src/newsletter/cli.js send news_1234567890_abc123
  node src/newsletter/cli.js test news_1234567890_abc123 test@example.com

Environment Variables:
  EMAIL_PROVIDER=smtp|sendgrid|console
  EMAIL_FROM=sender@example.com
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-password
`);
}

/**
 * Show statistics
 */
async function showStats() {
  try {
    const stats = await service.getStats();

    console.log('\n📊 Newsletter Statistics\n');
    console.log('Subscribers:');
    console.log(`  Total: ${stats.subscribers.total}`);
    console.log(`  Active: ${stats.subscribers.active}`);
    console.log(`  Unsubscribed: ${stats.subscribers.unsubscribed}`);
    console.log(`  Bounced: ${stats.subscribers.bounced}`);

    console.log('\nNewsletters:');
    console.log(`  Total: ${stats.newsletters.total}`);
    console.log(`  Draft: ${stats.newsletters.draft}`);
    console.log(`  Scheduled: ${stats.newsletters.scheduled}`);
    console.log(`  Sent: ${stats.newsletters.sent}`);

    if (stats.recentNewsletters.length > 0) {
      console.log('\nRecent Newsletters:');
      stats.recentNewsletters.forEach(n => {
        console.log(`  ${n.title}`);
        console.log(`    Sent: ${n.sentAt}`);
        console.log(`    Stats: ${n.stats.sent} sent, ${n.stats.opened} opened`);
      });
    }
  } catch (error) {
    logger.error(`Failed to show stats: ${error.message}`);
  }
}

/**
 * List subscribers
 */
async function listSubscribers() {
  try {
    const subscribers = await service.getSubscribers();

    console.log('\n📋 Subscribers\n');
    if (subscribers.length === 0) {
      console.log('No subscribers found');
      return;
    }

    subscribers.forEach(s => {
      console.log(`${s.email} ${s.name ? `(${s.name})` : ''} - ${s.status}`);
      if (s.tags.length > 0) {
        console.log(`  Tags: ${s.tags.join(', ')}`);
      }
    });
  } catch (error) {
    logger.error(`Failed to list subscribers: ${error.message}`);
  }
}

/**
 * Add subscriber
 */
async function addSubscriber(email, name = '') {
  try {
    const subscriber = await service.addSubscriber({
      email,
      name
    });

    console.log(`\n✅ Subscriber added:`);
    console.log(`  Email: ${subscriber.email}`);
    console.log(`  Name: ${subscriber.name || 'N/A'}`);
    console.log(`  ID: ${subscriber.id}`);
  } catch (error) {
    logger.error(`Failed to add subscriber: ${error.message}`);
  }
}

/**
 * Unsubscribe subscriber
 */
async function unsubscribeSubscriber(email) {
  try {
    const subscriber = await service.unsubscribeSubscriber(email);
    console.log(`\n✅ Unsubscribed: ${email}`);
  } catch (error) {
    logger.error(`Failed to unsubscribe: ${error.message}`);
  }
}

/**
 * Import subscribers from CSV
 */
async function importSubscribers(file) {
  try {
    const content = await fs.readFile(file, 'utf-8');
    await service.importSubscribers(content);
    console.log(`\n✅ Subscribers imported from ${file}`);
  } catch (error) {
    logger.error(`Failed to import subscribers: ${error.message}`);
  }
}

/**
 * Export subscribers to CSV
 */
async function exportSubscribers() {
  try {
    const csv = await service.exportSubscribers();
    const outFile = path.join(process.cwd(), `subscribers_export_${Date.now()}.csv`);
    await fs.writeFile(outFile, csv);
    console.log(`\n✅ Subscribers exported to ${outFile}`);
  } catch (error) {
    logger.error(`Failed to export subscribers: ${error.message}`);
  }
}

/**
 * List newsletters
 */
async function listNewsletters() {
  try {
    const newsletters = await service.getNewsletters();

    console.log('\n📰 Newsletters\n');
    if (newsletters.length === 0) {
      console.log('No newsletters found');
      return;
    }

    newsletters.forEach(n => {
      console.log(`${n.id} - ${n.title}`);
      console.log(`  Status: ${n.status}`);
      console.log(`  Created: ${n.createdAt}`);
      if (n.scheduledAt) console.log(`  Scheduled: ${n.scheduledAt}`);
      if (n.sentAt) console.log(`  Sent: ${n.sentAt}`);
    });
  } catch (error) {
    logger.error(`Failed to list newsletters: ${error.message}`);
  }
}

/**
 * Create newsletter
 */
async function createNewsletter(title) {
  try {
    const newsletter = await service.createNewsletter({
      title,
      subject: title,
      content: '<p>Your content here</p>',
      textContent: 'Your content here'
    });

    console.log(`\n✅ Newsletter created:`);
    console.log(`  ID: ${newsletter.id}`);
    console.log(`  Title: ${newsletter.title}`);
    console.log(`  Status: ${newsletter.status}`);
  } catch (error) {
    logger.error(`Failed to create newsletter: ${error.message}`);
  }
}

/**
 * Generate newsletter from trending data
 */
async function generateNewsletter(date) {
  try {
    const newsletter = await service.generateFromTrending(date, {
      maxItems: 5,
      title: 'AI Trends Newsletter'
    });

    console.log(`\n✅ Newsletter generated:`);
    console.log(`  ID: ${newsletter.id}`);
    console.log(`  Title: ${newsletter.title}`);
    console.log(`  Items: ${newsletter.metadata.itemCount}`);
    console.log(`  Status: ${newsletter.status}`);
  } catch (error) {
    logger.error(`Failed to generate newsletter: ${error.message}`);
  }
}

/**
 * Schedule newsletter
 */
async function scheduleNewsletter(id, scheduledAt) {
  try {
    const newsletter = await service.scheduleNewsletter(id, scheduledAt);
    console.log(`\n✅ Newsletter scheduled for: ${scheduledAt}`);
  } catch (error) {
    logger.error(`Failed to schedule newsletter: ${error.message}`);
  }
}

/**
 * Send newsletter
 */
async function sendNewsletter(id, testEmail = null) {
  try {
    const options = {};
    if (testEmail) {
      options.testEmail = testEmail;
      console.log(`\n🧪 Testing newsletter to: ${testEmail}`);
    }

    const { newsletter, results } = await service.sendNewsletter(id, options);

    console.log(`\n✅ Newsletter sent:`);
    console.log(`  Total recipients: ${results.total}`);
    console.log(`  Successful: ${results.sent}`);
    console.log(`  Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(e => {
        console.log(`  ${e.email}: ${e.error}`);
      });
    }
  } catch (error) {
    logger.error(`Failed to send newsletter: ${error.message}`);
  }
}

/**
 * Show newsletter details
 */
async function showNewsletter(id) {
  try {
    const newsletter = await service.getNewsletter(id);
    if (!newsletter) {
      console.log(`\n❌ Newsletter not found: ${id}`);
      return;
    }

    console.log('\n📰 Newsletter Details\n');
    console.log(`ID: ${newsletter.id}`);
    console.log(`Title: ${newsletter.title}`);
    console.log(`Subject: ${newsletter.subject}`);
    console.log(`Status: ${newsletter.status}`);
    console.log(`Created: ${newsletter.createdAt}`);
    if (newsletter.scheduledAt) console.log(`Scheduled: ${newsletter.scheduledAt}`);
    if (newsletter.sentAt) console.log(`Sent: ${newsletter.sentAt}`);
    console.log('\nStats:');
    console.log(`  Recipients: ${newsletter.stats.recipients}`);
    console.log(`  Sent: ${newsletter.stats.sent}`);
    console.log(`  Opened: ${newsletter.stats.opened}`);
    console.log(`  Clicked: ${newsletter.stats.clicked}`);
    console.log(`  Bounced: ${newsletter.stats.bounced}`);
    console.log(`  Unsubscribed: ${newsletter.stats.unsubscribed}`);
  } catch (error) {
    logger.error(`Failed to show newsletter: ${error.message}`);
  }
}

/**
 * Delete newsletter
 */
async function deleteNewsletter(id) {
  try {
    const newsletter = await service.getNewsletter(id);
    if (!newsletter) {
      console.log(`\n❌ Newsletter not found: ${id}`);
      return;
    }

    await service.deleteNewsletter(id);
    console.log(`\n✅ Newsletter deleted: ${id}`);
  } catch (error) {
    logger.error(`Failed to delete newsletter: ${error.message}`);
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'help':
      showHelp();
      break;
    case 'stats':
      await showStats();
      break;
    case 'subscribers':
      await listSubscribers();
      break;
    case 'add':
      await addSubscriber(args[0], args[1]);
      break;
    case 'unsubscribe':
      await unsubscribeSubscriber(args[0]);
      break;
    case 'import':
      await importSubscribers(args[0]);
      break;
    case 'export':
      await exportSubscribers();
      break;
    case 'list':
      await listNewsletters();
      break;
    case 'create':
      await createNewsletter(args.join(' '));
      break;
    case 'generate':
      await generateNewsletter(args[0]);
      break;
    case 'schedule':
      await scheduleNewsletter(args[0], args[1]);
      break;
    case 'send':
      await sendNewsletter(args[0]);
      break;
    case 'test':
      await sendNewsletter(args[0], args[1]);
      break;
    case 'show':
      await showNewsletter(args[0]);
      break;
    case 'delete':
      await deleteNewsletter(args[0]);
      break;
    default:
      console.log(`\n❌ Unknown command: ${command}`);
      showHelp();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  showHelp,
  showStats,
  listSubscribers,
  addSubscriber,
  unsubscribeSubscriber,
  importSubscribers,
  exportSubscribers,
  listNewsletters,
  createNewsletter,
  generateNewsletter,
  scheduleNewsletter,
  sendNewsletter,
  showNewsletter,
  deleteNewsletter
};
