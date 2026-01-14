# FxTrace

A lightweight tool for viewing Playwright traces from CircleCI artifacts. Built for the [Firefox Accounts](https://github.com/mozilla/fxa) team.

## The Problem

Playwright's trace viewer at [trace.playwright.dev](https://trace.playwright.dev) can load remote traces via URL, but CircleCI artifacts lack the CORS headers needed for browser-based fetching. This means you can't just paste a CircleCI artifact URL into the trace viewer.

## The Solution

FxTrace acts as a CORS proxy. Pass it your CircleCI trace URL, and it redirects you to trace.playwright.dev with a working proxied URL.

## Usage

```
https://fxtrace.vercel.app?url=<your-circleci-trace-url>
```

### Example

```
https://fxtrace.vercel.app?url=https://output.circle-artifacts.com/output/job/abc123/artifacts/0/trace.zip
```

This redirects to:
```
https://trace.playwright.dev/?trace=https://fxtrace.vercel.app/api/proxy?url=...
```

And your trace loads in Playwright's viewer.

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    FxTrace      │────▶│  trace.play-    │────▶│   FxTrace       │
│    Landing      │     │  wright.dev     │     │   /api/proxy    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │                 │
                                                │   CircleCI      │
                                                │   Artifacts     │
                                                │                 │
                                                └─────────────────┘
```

1. You visit FxTrace with your CircleCI trace URL
2. FxTrace validates the artifact exists
3. FxTrace redirects to trace.playwright.dev
4. Playwright fetches the trace via FxTrace's proxy
5. The proxy fetches from CircleCI and returns with CORS headers
6. Your trace loads in the viewer

## Error Handling

FxTrace validates that the artifact exists before redirecting. If the trace file is missing or expired, you'll see a friendly error message instead of a broken trace viewer.

## Local Development

```bash
# Install dependencies
npm install

# Run dev server (HTTPS enabled for trace.playwright.dev compatibility)
npm run dev

# Visit https://localhost:5173
```

## Deployment

Deploy to Vercel:

```bash
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Tech Stack

- **Vite** - Frontend build tool
- **TypeScript** - Type safety
- **Vercel Serverless Functions** - CORS proxy

## Security

The proxy only accepts URLs from CircleCI domains (`output.circle-artifacts.com`, `circleci.com`) to prevent abuse as an open proxy.

## License

MPL-2.0
