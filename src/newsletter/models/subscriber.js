/**
 * Subscriber Model
 * Manages newsletter subscribers
 */

import fs from 'fs/promises';
import path from 'path';

const SUBSCRIBERS_FILE = path.join(process.cwd(), 'src/newsletter/data/subscribers.json');

class Subscriber {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.email = data.email;
    this.name = data.name || '';
    this.tags = data.tags || [];
    this.status = data.status || 'active'; // active, unsubscribed, bounced
    this.subscribedAt = data.subscribedAt || new Date().toISOString();
    this.unsubscribedAt = data.unsubscribedAt || null;
    this.metadata = data.metadata || {};
  }

  generateId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load all subscribers from file
   */
  static async loadAll() {
    try {
      const data = await fs.readFile(SUBSCRIBERS_FILE, 'utf-8');
      const subscribers = JSON.parse(data);
      return subscribers.map(s => new Subscriber(s));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save all subscribers to file
   */
  static async saveAll(subscribers) {
    const data = subscribers.map(s => ({
      id: s.id,
      email: s.email,
      name: s.name,
      tags: s.tags,
      status: s.status,
      subscribedAt: s.subscribedAt,
      unsubscribedAt: s.unsubscribedAt,
      metadata: s.metadata
    }));
    await fs.mkdir(path.dirname(SUBSCRIBERS_FILE), { recursive: true });
    await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));
  }

  /**
   * Find subscriber by email
   */
  static async findByEmail(email) {
    const subscribers = await Subscriber.loadAll();
    return subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
  }

  /**
   * Find subscriber by ID
   */
  static async findById(id) {
    const subscribers = await Subscriber.loadAll();
    return subscribers.find(s => s.id === id);
  }

  /**
   * Add new subscriber
   */
  static async create(data) {
    const subscribers = await Subscriber.loadAll();

    // Check if email already exists
    const existing = await Subscriber.findByEmail(data.email);
    if (existing) {
      throw new Error(`Subscriber with email ${data.email} already exists`);
    }

    const subscriber = new Subscriber(data);
    subscribers.push(subscriber);
    await Subscriber.saveAll(subscribers);
    return subscriber;
  }

  /**
   * Unsubscribe subscriber
   */
  static async unsubscribe(email) {
    const subscribers = await Subscriber.loadAll();
    const subscriber = subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());

    if (!subscriber) {
      throw new Error(`Subscriber ${email} not found`);
    }

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date().toISOString();
    await Subscriber.saveAll(subscribers);
    return subscriber;
  }

  /**
   * Get active subscribers
   */
  static async getActive() {
    const subscribers = await Subscriber.loadAll();
    return subscribers.filter(s => s.status === 'active');
  }

  /**
   * Add tag to subscriber
   */
  async addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      const subscribers = await Subscriber.loadAll();
      const index = subscribers.findIndex(s => s.id === this.id);
      if (index !== -1) {
        subscribers[index] = this;
        await Subscriber.saveAll(subscribers);
      }
    }
  }

  /**
   * Remove tag from subscriber
   */
  async removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    const subscribers = await Subscriber.loadAll();
    const index = subscribers.findIndex(s => s.id === this.id);
    if (index !== -1) {
      subscribers[index] = this;
      await Subscriber.saveAll(subscribers);
    }
  }

  /**
   * Import subscribers from CSV
   */
  static async importFromCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const subscribers = await Subscriber.loadAll();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const data = {};

      headers.forEach((header, index) => {
        if (header === 'email') data.email = values[index];
        else if (header === 'name') data.name = values[index];
        else if (header === 'tags') data.tags = values[index] ? values[index].split(';') : [];
      });

      if (data.email) {
        const existing = subscribers.find(s => s.email.toLowerCase() === data.email.toLowerCase());
        if (!existing) {
          subscribers.push(new Subscriber(data));
        }
      }
    }

    await Subscriber.saveAll(subscribers);
    return subscribers;
  }

  /**
   * Export subscribers to CSV
   */
  static async exportToCSV() {
    const subscribers = await Subscriber.loadAll();
    const headers = ['email', 'name', 'tags', 'status', 'subscribedAt'];
    const rows = subscribers.map(s =>
      [s.email, s.name, s.tags.join(';'), s.status, s.subscribedAt].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

export default Subscriber;
