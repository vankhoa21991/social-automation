# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Schema validation: `validateItem()` drops malformed items (missing title, url, or source) before writing `all.json` and `trending.json`

## [2.1.0] - 2026-04-24

### Added
- PM2 process supervision with daily cron schedule (`ecosystem.config.cjs`)
- Exponential backoff retry logic on all fetchers (RSS, Reddit, HN, LinkedIn, API)
- `npm run pm2:*` convenience scripts

### Fixed
- Removed self-referential `@aikeytake/social-automation` dependency from `package.json`

## [2.0.2] - 2026-04-19

### Added
- `LINKEDIN_KOL_PROFILES_FILE` env var — LinkedIn KOL path now fully configurable
- Sample LinkedIn KOL list (`data/linkedin_kol_sample.json`, 10 entries) for local dev
- MIT license, contributing guide, usage instructions

### Fixed
- RSS items now included in `trending.json` (previously excluded by engagement filter)

## [2.0.1] - 2026-04-12

### Added
- 25 new RSS feeds from tech company blogs and AI newsletters
- `scrape()` exported as library function with optional Supabase support
- Generic REST/GraphQL API source (`src/fetchers/api.js`) with JSONPath mapping
- Product Hunt source

### Fixed
- Browser fetchers (Playwright) lazy-loaded to avoid bundling issues

## [2.0.0] - 2026-03-22

### Added
- Twitter/X scraping via Playwright browser (no API key required)
- LinkedIn browser scraping via Playwright (no API key required)
- Shared Playwright profile for persistent login sessions

## [1.0.0] - 2026-03-07

### Added
- Initial release: content research and aggregation tool for AI agents
- RSS feeds (17 sources), Reddit (7 subreddits), Hacker News with AI filtering
- LinkedIn KOL scraping via BrightData SERP API
- Engagement-based ranking with source diversity (max 5 per source)
- Daily output: `trending.json`, `all.json`, per-source JSON files
- Interactive query CLI (`npm run query`)
