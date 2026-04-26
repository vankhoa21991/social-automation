module.exports = {
  apps: [
    {
      name: 'social-scrape',
      script: 'src/index.js',
      args: 'scrape',
      interpreter: 'node',

      // Run daily at 6am; do not auto-restart on exit or crash
      cron_restart: '0 6 * * *',
      autorestart: false,
      watch: false,

      max_memory_restart: '500M',

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,

      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
