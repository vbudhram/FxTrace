# CLAUDE.md

This file provides guidance for Claude Code when working with the FxTrace codebase.

## Project Overview

FxTrace is a lightweight CORS proxy for viewing Playwright trace files (.zip) stored as CircleCI build artifacts. It enables trace.playwright.dev to load traces from CircleCI by proxying requests with proper CORS headers.

**Live URL:** https://fxtrace.vercel.app

## Tech Stack

- **Frontend:** Vanilla TypeScript, Vite 5.4.2
- **Backend:** Vercel Serverless Functions (Node.js)
- **Deployment:** Vercel

## Project Structure

```
src/main.ts          # Client-side logic (all frontend code)
api/proxy.ts         # CORS proxy serverless function
api/artifacts.ts     # CircleCI API integration for listing artifacts
index.html           # Landing page with embedded CSS
vite.config.ts       # Vite config with dev proxy plugin
```

## Commands

```bash
npm run dev      # Start HTTPS dev server at https://localhost:5173
npm run build    # TypeScript compile + Vite build → dist/
npm run preview  # Preview production build
```

## Development Notes

- Dev server uses HTTPS (self-signed cert) because trace.playwright.dev requires HTTPS
- `vite.config.ts` contains a custom plugin that emulates Vercel serverless functions locally
- All frontend code is in a single file (`src/main.ts`) - no framework
- Styles are embedded in `index.html`, not in separate CSS files

## Architecture

Two user flows:
1. **Direct artifact URL:** User pastes CircleCI artifact URL → validates → redirects to trace.playwright.dev with proxied URL
2. **Job URL:** User pastes CircleCI job URL → fetches artifact list via API → user selects trace → opens in trace.playwright.dev

## Code Conventions

- Strict TypeScript with no unused variables/parameters
- Interface-first design for data structures
- Pure functions where possible
- CSS classes follow BEM-like naming (`.artifact-item`, `.artifact-meta`)
- Dark mode via `[data-theme="dark"]` CSS attribute selector

## Git Commits

- Do NOT add `Co-Authored-By` lines to commit messages
- Use concise, descriptive commit messages
- Follow conventional commit style when appropriate

## Key Patterns

- **Domain allowlist:** Proxy only accepts CircleCI domains (security)
- **Trace metadata parsing:** Extracts test name, suite, severity from artifact paths
- **Theme persistence:** Uses localStorage with system preference fallback
- **Clipboard paste detection:** Auto-submits when valid URL is pasted

## Testing Locally

1. Run `npm run dev`
2. Accept the self-signed certificate warning
3. Paste a CircleCI artifact URL or job URL to test

## Custom Skills

### `/product-owner`
Product Owner agent that scans the codebase for improvement opportunities and generates PRDs.
- Analyzes UX, features, technical debt, and documentation
- Outputs PRD entries to `BACKLOG.md`
- Prioritizes by impact and effort

## Documentation

- `README.md` - User-facing documentation
- `SPEC.md` - Technical specification with architecture details
- `BACKLOG.md` - Product backlog with PRD entries
