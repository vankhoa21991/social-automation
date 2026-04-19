# Open Source Preparation Design

**Date:** 2026-04-19
**Status:** Approved
**Type:** Repo cleanup for open source release

---

## Goal

Prepare `social-automation` for public GitHub release. Make it easy for others to run, understand, and contribute.

---

## Changes

### 1. LinkedIn KOL Profiles — Configurable via Env Var

**Problem:** Hardcoded absolute path `/home/vankhoa/projects/aikeytake/workspace/marketing/linkedin_kol_clean.json` in `config/sources.json`.

**Solution:**
- Copy full file → `data/linkedin_kol_full.json` (gitignored, local use only)
- Create `data/linkedin_kol_sample.json` with ~10 sample entries (committed)
- `config/sources.json` reads `process.env.LINKEDIN_KOL_PROFILES_FILE`, falls back to `./data/linkedin_kol_sample.json`

**Implementation:**
- Update `config/sources.json` to use env var for `linkedin.profilesFile`
- Update `.gitignore` to exclude `data/linkedin_kol_full.json`

### 2. Clean `.env.example`

**Problem:** `.env.example` contains unused vars (posting-related: Twitter posting, LinkedIn posting, image generation, schedules).

**Solution:** Keep only vars the scraper actually uses:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BRIGHTDATA_API_KEY=your_brightdata_api_key_here
BRIGHTDATA_ZONE=mcp_unlocker
LINKEDIN_KOL_PROFILES_FILE=./data/linkedin_kol_sample.json
```

### 3. Add `LICENSE` File

**Solution:** Add MIT license file:
```
MIT License
Copyright (c) 2026 @aikeytake
[standard MIT text]
```

### 4. Update `.gitignore`

Add:
```
data/linkedin_kol_full.json
data/playwright-profile/
```

### 5. Add `CONTRIBUTING.md`

Simple guide covering:
- How to add RSS feeds
- How to add new source types
- How to run tests locally
- Code style notes

### 6. Polish `README.md`

Updates:
- Clearer "what it does" headline
- Quick start (3 commands)
- Architecture diagram (text-based)
- List of supported sources
- Clear "configuration needed" section

---

## Files Changed

| File | Action |
|------|--------|
| `config/sources.json` | Read `LINKEDIN_KOL_PROFILES_FILE` env var for `linkedin.profilesFile` |
| `.env.example` | Remove unused vars, add `LINKEDIN_KOL_PROFILES_FILE` |
| `.gitignore` | Add `data/linkedin_kol_full.json`, `data/playwright-profile/` |
| `data/linkedin_kol_full.json` | Copy of full KOL list (new file, gitignored) |
| `data/linkedin_kol_sample.json` | ~10 sample entries (new file, committed) |
| `LICENSE` | MIT license file (new) |
| `CONTRIBUTING.md` | Contribution guide (new) |
| `README.md` | Polish for open source |

---

## What Stays the Same

- Repo name: `@aikeytake/social-automation`
- MIT license in `package.json`
- All source code
- All existing functionality

---

## Verification

After changes:
1. `npm install` works
2. `npm run scrape` works (with sample data)
3. `git status` shows only intended files added
4. No hardcoded paths remain
5. README clearly explains setup
