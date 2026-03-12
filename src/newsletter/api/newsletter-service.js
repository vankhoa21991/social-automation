/**
 * Newsletter Service
 * Main service for managing newsletters and subscribers
 */

import Subscriber from '../models/subscriber.js';
import Newsletter from '../models/newsletter.js';
import { getEmailSender } from '../utils/email-sender.js';
import createLogger from '../../utils/logger.js';

const logger = createLogger('NewsletterService');

class NewsletterService {
  constructor(config) {
    this.config = config;
    this.emailSender = getEmailSender(config.email || {});
  }

  // ========== Subscriber Management ==========

  /**
   * Add new subscriber
   */
  async addSubscriber(data) {
    try {
      const subscriber = await Subscriber.create(data);
      logger.success(`Subscriber added: ${subscriber.email}`);
      return subscriber;
    } catch (error) {
      logger.error(`Failed to add subscriber: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all subscribers
   */
  async getSubscribers(filters = {}) {
    let subscribers = await Subscriber.loadAll();

    if (filters.status) {
      subscribers = subscribers.filter(s => s.status === filters.status);
    }

    if (filters.tag) {
      subscribers = subscribers.filter(s => s.tags.includes(filters.tag));
    }

    return subscribers;
  }

  /**
   * Get subscriber by email
   */
  async getSubscriber(email) {
    return await Subscriber.findByEmail(email);
  }

  /**
   * Unsubscribe subscriber
   */
  async unsubscribeSubscriber(email) {
    try {
      const subscriber = await Subscriber.unsubscribe(email);
      logger.success(`Unsubscribed: ${email}`);
      return subscriber;
    } catch (error) {
      logger.error(`Failed to unsubscribe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import subscribers from CSV
   */
  async importSubscribers(csvContent) {
    try {
      const subscribers = await Subscriber.importFromCSV(csvContent);
      logger.success(`Imported ${subscribers.length} subscribers`);
      return subscribers;
    } catch (error) {
      logger.error(`Failed to import subscribers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export subscribers to CSV
   */
  async exportSubscribers() {
    try {
      const csv = await Subscriber.exportToCSV();
      logger.success('Exported subscribers to CSV');
      return csv;
    } catch (error) {
      logger.error(`Failed to export subscribers: ${error.message}`);
      throw error;
    }
  }

  // ========== Newsletter Management ==========

  /**
   * Create new newsletter
   */
  async createNewsletter(data) {
    try {
      const newsletter = await Newsletter.create(data);
      logger.success(`Newsletter created: ${newsletter.id}`);
      return newsletter;
    } catch (error) {
      logger.error(`Failed to create newsletter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get newsletter by ID
   */
  async getNewsletter(id) {
    return await Newsletter.findById(id);
  }

  /**
   * Get all newsletters
   */
  async getNewsletters(filters = {}) {
    let newsletters = await Newsletter.loadAll();

    if (filters.status) {
      newsletters = newsletters.filter(n => n.status === filters.status);
    }

    return newsletters;
  }

  /**
   * Update newsletter
   */
  async updateNewsletter(id, data) {
    try {
      const newsletter = await Newsletter.findById(id);
      if (!newsletter) {
        throw new Error(`Newsletter not found: ${id}`);
      }

      Object.assign(newsletter, data);
      await newsletter.save();
      logger.success(`Newsletter updated: ${id}`);
      return newsletter;
    } catch (error) {
      logger.error(`Failed to update newsletter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete newsletter
   */
  async deleteNewsletter(id) {
    try {
      const newsletter = await Newsletter.findById(id);
      if (!newsletter) {
        throw new Error(`Newsletter not found: ${id}`);
      }

      await newsletter.delete();
      logger.success(`Newsletter deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete newsletter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate newsletter from trending data
   */
  async generateFromTrending(date, options = {}) {
    try {
      const newsletter = await Newsletter.generateFromTrending(date, options);
      logger.success(`Newsletter generated from trending data: ${newsletter.id}`);
      return newsletter;
    } catch (error) {
      logger.error(`Failed to generate newsletter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule newsletter
   */
  async scheduleNewsletter(id, scheduledAt) {
    try {
      const newsletter = await Newsletter.findById(id);
      if (!newsletter) {
        throw new Error(`Newsletter not found: ${id}`);
      }

      await newsletter.schedule(scheduledAt);
      logger.success(`Newsletter scheduled: ${id} at ${scheduledAt}`);
      return newsletter;
    } catch (error) {
      logger.error(`Failed to schedule newsletter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send newsletter
   */
  async sendNewsletter(id, options = {}) {
    try {
      const newsletter = await Newsletter.findById(id);
      if (!newsletter) {
        throw new Error(`Newsletter not found: ${id}`);
      }

      // Get recipients
      let recipients;
      if (options.testEmail) {
        // Test mode - send to test email only
        recipients = [{ email: options.testEmail, name: 'Test Recipient' }];
      } else if (newsletter.tags && newsletter.tags.length > 0) {
        // Send to subscribers with matching tags
        const allSubscribers = await Subscriber.loadAll();
        recipients = allSubscribers.filter(s =>
          s.status === 'active' &&
          newsletter.tags.some(tag => s.tags.includes(tag))
        );
      } else {
        // Send to all active subscribers
        recipients = await Subscriber.getActive();
      }

      if (recipients.length === 0) {
        throw new Error('No recipients found');
      }

      logger.info(`Sending newsletter to ${recipients.length} recipients...`);

      // Update newsletter status
      newsletter.status = 'sending';
      await newsletter.save();

      // Send emails
      const results = await this.emailSender.sendNewsletter(
        newsletter,
        recipients,
        options
      );

      // Update newsletter stats
      newsletter.stats.recipients = results.total;
      newsletter.stats.sent = results.sent;
      newsletter.status = 'sent';
      await newsletter.markAsSent();

      logger.success(`Newsletter sent: ${results.sent}/${results.total} successful`);

      return {
        newsletter,
        results
      };
    } catch (error) {
      logger.error(`Failed to send newsletter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get due newsletters
   */
  async getDueNewsletters() {
    return await Newsletter.getDueNewsletters();
  }

  /**
   * Get stats
   */
  async getStats() {
    const subscribers = await Subscriber.loadAll();
    const newsletters = await Newsletter.loadAll();

    return {
      subscribers: {
        total: subscribers.length,
        active: subscribers.filter(s => s.status === 'active').length,
        unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
        bounced: subscribers.filter(s => s.status === 'bounced').length
      },
      newsletters: {
        total: newsletters.length,
        draft: newsletters.filter(n => n.status === 'draft').length,
        scheduled: newsletters.filter(n => n.status === 'scheduled').length,
        sent: newsletters.filter(n => n.status === 'sent').length
      },
      recentNewsletters: newsletters
        .filter(n => n.status === 'sent')
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
        .slice(0, 5)
        .map(n => ({
          id: n.id,
          title: n.title,
          sentAt: n.sentAt,
          stats: n.stats
        }))
    };
  }
}

export default NewsletterService;
