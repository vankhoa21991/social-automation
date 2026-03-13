/**
 * Newsletter Model
 * Manages newsletter campaigns
 */

import fs from 'fs/promises';
import path from 'path';
import { generateId } from '../utils/helpers.js';
import { IterativeWorkflow } from '../../writing-agents/core/iterative-workflow.js';

const NEWSLETTERS_FILE = path.join(process.cwd(), 'src/newsletter/data/newsletters.json');

class Newsletter {
  constructor(data) {
    this.id = data.id || generateId('news');
    this.title = data.title;
    this.subject = data.subject;
    this.previewText = data.previewText || '';
    this.content = data.content; // HTML content
    this.textContent = data.textContent || ''; // Plain text version
    this.status = data.status || 'draft'; // draft, scheduled, sending, sent
    this.scheduledAt = data.scheduledAt || null;
    this.sentAt = data.sentAt || null;
    this.stats = data.stats || {
      recipients: 0,
      sent: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0
    };
    this.tags = data.tags || []; // Segment tags
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.metadata = data.metadata || {};
  }

  /**
   * Load all newsletters from file
   */
  static async loadAll() {
    try {
      const data = await fs.readFile(NEWSLETTERS_FILE, 'utf-8');
      const newsletters = JSON.parse(data);
      return newsletters.map(n => new Newsletter(n));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save all newsletters to file
   */
  static async saveAll(newsletters) {
    const data = newsletters.map(n => ({
      id: n.id,
      title: n.title,
      subject: n.subject,
      previewText: n.previewText,
      content: n.content,
      textContent: n.textContent,
      status: n.status,
      scheduledAt: n.scheduledAt,
      sentAt: n.sentAt,
      stats: n.stats,
      tags: n.tags,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      metadata: n.metadata
    }));
    await fs.mkdir(path.dirname(NEWSLETTERS_FILE), { recursive: true });
    await fs.writeFile(NEWSLETTERS_FILE, JSON.stringify(data, null, 2));
  }

  /**
   * Find newsletter by ID
   */
  static async findById(id) {
    const newsletters = await Newsletter.loadAll();
    return newsletters.find(n => n.id === id);
  }

  /**
   * Get newsletters by status
   */
  static async findByStatus(status) {
    const newsletters = await Newsletter.loadAll();
    return newsletters.filter(n => n.status === status);
  }

  /**
   * Get scheduled newsletters that are due
   */
  static async getDueNewsletters() {
    const newsletters = await Newsletter.loadAll();
    const now = new Date();
    return newsletters.filter(n =>
      n.status === 'scheduled' &&
      new Date(n.scheduledAt) <= now
    );
  }

  /**
   * Create new newsletter
   */
  static async create(data) {
    const newsletters = await Newsletter.loadAll();
    const newsletter = new Newsletter(data);
    newsletters.push(newsletter);
    await Newsletter.saveAll(newsletters);
    return newsletter;
  }

  /**
   * Update newsletter
   */
  async save() {
    const newsletters = await Newsletter.loadAll();
    const index = newsletters.findIndex(n => n.id === this.id);
    this.updatedAt = new Date().toISOString();

    if (index !== -1) {
      newsletters[index] = this;
    } else {
      newsletters.push(this);
    }

    await Newsletter.saveAll(newsletters);
    return this;
  }

  /**
   * Delete newsletter
   */
  async delete() {
    const newsletters = await Newsletter.loadAll();
    const filtered = newsletters.filter(n => n.id !== this.id);
    await Newsletter.saveAll(filtered);
  }

  /**
   * Generate newsletter from trending data
   */
  static async generateFromTrending(date, options = {}) {
    const { maxItems = 5, title = 'AI Trends Newsletter' } = options;

    // Load trending data
    const trendingFile = path.join(process.cwd(), `data/${date}/trending.json`);
    const trendingData = JSON.parse(await fs.readFile(trendingFile, 'utf-8'));

    // Select top items
    const items = trendingData.items.slice(0, maxItems);

    // Generate HTML content
    const content = Newsletter.generateHTMLContent(items);

    // Create newsletter
    const newsletter = await Newsletter.create({
      title: `${title} - ${date}`,
      subject: `${title} - ${date}`,
      previewText: `Top ${maxItems} AI trends from ${date}`,
      content: content,
      textContent: Newsletter.generateTextContent(items),
      metadata: {
        generatedFrom: 'trending',
        date: date,
        itemCount: items.length
      }
    });

    return newsletter;
  }

  /**
   * Generate AI-enhanced newsletter using Writer-Critic agents
   */
  static async generateIterative(date, options = {}) {
    const {
      maxItems = 5,
      title = 'AI-Enhanced Analysis',
      maxIterations = 3,
      qualityThreshold = 8,
      verbose = true
    } = options;

    // Load trending data
    const trendingFile = path.join(process.cwd(), `data/${date}/trending.json`);
    const trendingData = JSON.parse(await fs.readFile(trendingFile, 'utf-8'));

    // Select top items
    const items = trendingData.items.slice(0, maxItems);

    if (verbose) {
      console.log(`\n🤖 Generating AI-enhanced newsletter from ${date}`);
      console.log(`   Articles: ${items.length}`);
      console.log(`   Max iterations: ${maxIterations}`);
      console.log(`   Quality threshold: ${qualityThreshold}/10`);
    }

    // Initialize workflow
    const workflow = new IterativeWorkflow({
      maxIterations,
      qualityThreshold,
      verbose
    });

    // Run iterative writing process
    const result = await workflow.run(items, { verbose });

    // Create newsletter from finalized draft
    const newsletter = await Newsletter.create({
      title: `${title} - ${date}`,
      subject: result.draft.subject || `${title} - ${date}`,
      previewText: result.draft.previewText || `AI-enhanced newsletter from ${date}`,
      content: result.draft.htmlContent,
      textContent: result.draft.textContent,
      metadata: {
        generatedFrom: 'iterative-ai',
        date: date,
        itemCount: items.length,
        iterations: result.iterations,
        qualityScore: result.qualityScore,
        isSatisfactory: result.isSatisfactory,
        maxIterationsReached: result.maxIterationsReached
      }
    });

    if (verbose) {
      console.log(`\n✅ AI-enhanced newsletter created: ${newsletter.id}`);
    }

    return newsletter;
  }

  /**
   * Generate HTML content from items
   */
  static generateHTMLContent(items) {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Trends Newsletter</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a2332 0%, #2d3436 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #faf9f7; padding: 30px; }
    .item { background: white; border-left: 4px solid #d4a574; padding: 20px; margin-bottom: 20px; border-radius: 4px; }
    .item-title { font-size: 18px; font-weight: bold; margin: 0 0 10px 0; color: #1a2332; }
    .item-meta { font-size: 12px; color: #6b9b9a; margin-bottom: 10px; }
    .item-summary { line-height: 1.6; }
    .item-link { display: inline-block; margin-top: 10px; color: #d4a574; text-decoration: none; font-weight: bold; }
    .footer { background: #1a2332; color: white; padding: 20px; text-align: center; font-size: 14px; border-radius: 0 0 8px 8px; }
    .stats { background: #e8f4f8; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 AI Trends Newsletter</h1>
    <p>Your weekly dose of AI insights</p>
  </div>

  <div class="content">
    <div class="stats">
      <strong>📊 This week's top stories:</strong> ${items.length} trending topics from Reddit, Hacker News, and LinkedIn
    </div>

`;

    items.forEach((item, index) => {
      html += `
    <div class="item">
      <h2 class="item-title">${index + 1}. ${item.title}</h2>
      <div class="item-meta">
        ${item.sources.join(' • ')} • Score: ${item.score}
      </div>
      <div class="item-summary">
        ${item.summary ? item.summary.substring(0, 300) + (item.summary.length > 300 ? '...' : '') : 'No summary available'}
      </div>
      <a href="${item.url}" class="item-link">Read more →</a>
    </div>
`;
    });

    html += `
  </div>

  <div class="footer">
    <p>You received this email because you subscribed to AI Keytake's newsletter.</p>
    <p>
      <a href="{{unsubscribe_url}}" style="color: #d4a574;">Unsubscribe</a> •
      <a href="{{web_version_url}}" style="color: #d4a574;">View in browser</a>
    </p>
    <p>© 2026 AI Keytake. All rights reserved.</p>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate plain text content from items
   */
  static generateTextContent(items) {
    let text = `AI TRENDS NEWSLETTER
=====================

Your weekly dose of AI insights

This week's top stories: ${items.length} trending topics

`;

    items.forEach((item, index) => {
      text += `
${index + 1}. ${item.title}
${'='.repeat(60)}
Source: ${item.sources.join(', ')}
Score: ${item.score}

${item.summary ? item.summary.substring(0, 500) + (item.summary.length > 500 ? '...' : '') : 'No summary available'}

Read more: ${item.url}

`;
    });

    text += `
--
You received this email because you subscribed to AI Keytake's newsletter.
Unsubscribe: {{unsubscribe_url}}
© 2026 AI Keytake. All rights reserved.
`;

    return text;
  }

  /**
   * Update stats
   */
  async updateStats(type) {
    if (type === 'sent') this.stats.sent++;
    else if (type === 'opened') this.stats.opened++;
    else if (type === 'clicked') this.stats.clicked++;
    else if (type === 'bounced') this.stats.bounced++;
    else if (type === 'unsubscribed') this.stats.unsubscribed++;

    await this.save();
  }

  /**
   * Mark as sent
   */
  async markAsSent() {
    this.status = 'sent';
    this.sentAt = new Date().toISOString();
    await this.save();
  }

  /**
   * Schedule newsletter
   */
  async schedule(scheduledAt) {
    this.status = 'scheduled';
    this.scheduledAt = scheduledAt;
    await this.save();
  }
}

export default Newsletter;
