/**
 * Email Sender Utility
 * Handles email sending via various providers
 */

import nodemailer from 'nodemailer';
import createLogger from '../../utils/logger.js';

const logger = createLogger('EmailSender');

class EmailSender {
  constructor(config) {
    this.config = config;
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    if (this.initialized) return;

    if (this.config.provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure || false,
        auth: {
          user: this.config.smtp.user,
          pass: this.config.smtp.pass
        }
      });
    } else if (this.config.provider === 'sendgrid') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: this.config.sendgrid.apiKey
        }
      });
    } else if (this.config.provider === 'console') {
      // Console mode for testing - no actual email sending
      this.transporter = {
        sendMail: async (mailOptions) => {
          logger.info('📧 [EMAIL]', mailOptions);
          return { messageId: 'console-' + Date.now() };
        }
      };
    } else {
      throw new Error(`Unknown email provider: ${this.config.provider}`);
    }

    this.initialized = true;
    logger.info(`Email sender initialized with provider: ${this.config.provider}`);
  }

  /**
   * Send email
   */
  async send(to, subject, html, text, options = {}) {
    await this.initialize();

    const mailOptions = {
      from: options.from || this.config.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      html: html,
      text: text,
      ...options
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.success(`Email sent to ${to}: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send newsletter to multiple recipients
   */
  async sendNewsletter(newsletter, subscribers, options = {}) {
    const results = {
      total: subscribers.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Process in batches to avoid overwhelming the server
    const batchSize = options.batchSize || 50;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      const promises = batch.map(async (subscriber) => {
        // Replace placeholders in content
        const personalizedHtml = this._personalizeContent(
          newsletter.content,
          subscriber
        );
        const personalizedText = this._personalizeContent(
          newsletter.textContent,
          subscriber
        );

        const result = await this.send(
          subscriber.email,
          newsletter.subject,
          personalizedHtml,
          personalizedText,
          options
        );

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            email: subscriber.email,
            error: result.error
          });
        }

        // Small delay between sends to avoid rate limiting
        await this._delay(options.delay || 100);

        return result;
      });

      await Promise.all(promises);

      // Log progress
      logger.info(`Batch ${Math.floor(i / batchSize) + 1} completed: ${results.sent}/${results.total} sent`);

      // Delay between batches
      if (i + batchSize < subscribers.length) {
        await this._delay(options.batchDelay || 1000);
      }
    }

    return results;
  }

  /**
   * Personalize content with subscriber data
   */
  _personalizeContent(content, subscriber) {
    return content
      .replace(/\{\{email\}\}/g, subscriber.email)
      .replace(/\{\{name\}\}/g, subscriber.name || subscriber.email.split('@')[0])
      .replace(/\{\{unsubscribe_url\}\}/g, `https://aikeytake.com/unsubscribe?email=${subscriber.email}`)
      .replace(/\{\{web_version_url\}\}/g, `https://aikeytake.com/newsletter/${subscriber.id}`);
  }

  /**
   * Delay helper
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verify connection
   */
  async verify() {
    await this.initialize();
    try {
      await this.transporter.verify();
      logger.success('Email connection verified');
      return true;
    } catch (error) {
      logger.error('Email connection failed:', error.message);
      return false;
    }
  }

  /**
   * Close connection
   */
  async close() {
    if (this.transporter && this.transporter.close) {
      await this.transporter.close();
    }
  }
}

// Create singleton instance
let emailSender = null;

/**
 * Get email sender instance
 */
export function getEmailSender(config) {
  if (!emailSender) {
    emailSender = new EmailSender(config);
  }
  return emailSender;
}

export default EmailSender;
