# Newsletter Module

A comprehensive email newsletter system integrated with the social-automation project.

## Features

- **Subscriber Management**: Add, import, export, and manage newsletter subscribers
- **Newsletter Creation**: Create newsletters manually or generate from trending data
- **Email Sending**: Send newsletters via SMTP, SendGrid, or console (for testing)
- **Scheduling**: Schedule newsletters for future delivery
- **Analytics**: Track opens, clicks, bounces, and unsubscribes
- **CLI Interface**: Full command-line interface for management

## Installation

Install dependencies:

```bash
npm install
```

## Configuration

Set environment variables in `.env`:

```bash
# Email Provider (smtp, sendgrid, or console)
EMAIL_PROVIDER=smtp

# Sender information
EMAIL_FROM=AI Keytake <noreply@aikeytake.com>

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SendGrid Configuration (if using SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
```

## CLI Usage

### Show Help

```bash
npm run newsletter help
```

### Subscriber Management

```bash
# Show statistics
npm run newsletter:stats

# List all subscribers
npm run newsletter:subscribers

# Add a subscriber
npm run newsletter:add user@example.com "John Doe"

# Unsubscribe a subscriber
npm run newsletter unsubscribe user@example.com

# Import subscribers from CSV
npm run newsletter import subscribers.csv

# Export subscribers to CSV
npm run newsletter export
```

### Newsletter Management

```bash
# List all newsletters
npm run newsletter:subscribers list

# Create a new newsletter
npm run newsletter create "My Newsletter Title"

# Generate newsletter from trending data
npm run newsletter generate 2026-03-12

# Schedule newsletter for sending
npm run newsletter schedule <newsletter-id> "2026-03-15T10:00:00Z"

# Send newsletter
npm run newsletter send <newsletter-id>

# Test send to a single email
npm run newsletter test <newsletter-id> test@example.com

# Show newsletter details
npm run newsletter show <newsletter-id>

# Delete newsletter
npm run newsletter delete <newsletter-id>
```

## CSV Import Format

The CSV file should have the following format:

```csv
email,name,tags
user1@example.com,John Doe,tech;ai
user2@example.com,Jane Smith,business
```

## Programmatic Usage

```javascript
import NewsletterService from './src/newsletter/api/newsletter-service.js';

const service = new NewsletterService(config);

// Add subscriber
await service.addSubscriber({
  email: 'user@example.com',
  name: 'John Doe',
  tags: ['tech', 'ai']
});

// Generate newsletter from trending
const newsletter = await service.generateFromTrending('2026-03-12', {
  maxItems: 5,
  title: 'AI Trends Newsletter'
});

// Send newsletter
await service.sendNewsletter(newsletter.id);
```

## Directory Structure

```
src/newsletter/
├── api/
│   └── newsletter-service.js    # Main service
├── models/
│   ├── subscriber.js             # Subscriber model
│   └── newsletter.js             # Newsletter model
├── utils/
│   ├── helpers.js                # Helper functions
│   └── email-sender.js           # Email sending utility
├── workers/
│   └── (future: queue workers)
├── templates/
│   └── (future: email templates)
├── data/
│   ├── subscribers.json          # Subscriber storage
│   └── newsletters.json          # Newsletter storage
├── cli.js                         # CLI interface
└── README.md                      # This file
```

## Email Templates

Newsletters are generated automatically from trending data with responsive HTML templates. You can customize the templates in:

- `src/newsletter/models/newsletter.js` - `generateHTMLContent()` method

## Future Enhancements

- [ ] Web dashboard for newsletter management
- [ ] Advanced segmentation and targeting
- [ ] A/B testing
- [ ] Web version hosting
- [ ] Open/click tracking via pixel tracking
- [ ] Unsubscribe page
- [ ] Bounce handling
- [ ] Queue system for bulk sending
- [ ] Newsletter templates library

## License

MIT
