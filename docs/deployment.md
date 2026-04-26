# Deployment & Scheduling

## Prerequisites

```bash
npm install -g pm2
```

## First-time setup

```bash
# 1. Clone and install
git clone <repo> && cd social-automation
npm install
cp .env.example .env   # fill in API keys

# 2. Register cron + survive reboots
npm run pm2:setup
# pm2:setup runs: pm2 start → pm2 save → pm2 startup
# pm2 startup prints a command — run it as root/sudo to enable boot hook
```

## Cron schedule

Defined in `ecosystem.config.cjs`:

```
0 6 * * *   →  daily at 6:00 AM (server local time)
```

To change the schedule, edit `ecosystem.config.cjs` then:

```bash
pm2 restart ecosystem.config.cjs
pm2 save
```

## Process lifecycle

| Status    | Meaning                        |
|-----------|--------------------------------|
| `online`  | Scrape in progress             |
| `stopped` | Last scrape finished (normal)  |
| `errored` | Process crashed (check logs)   |

`autorestart: false` — PM2 does not loop on exit. Process goes `stopped`
after each run; cron re-launches it at next scheduled tick.

## Common commands

```bash
npm run pm2:status    # list processes
npm run pm2:logs      # tail live logs
npm run pm2:restart   # run now (outside cron schedule)
npm run pm2:stop      # cancel a running scrape
```

## Logs

| File                    | Contents              |
|-------------------------|-----------------------|
| `logs/pm2-out.log`      | Scrape progress/stats |
| `logs/pm2-error.log`    | Warnings and errors   |

Log rotation (recommended for production):

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 7
```
