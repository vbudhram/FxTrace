# FxTrace - Specification Document

## Problem Statement

Users want to view Playwright trace files (.zip) stored as CircleCI build artifacts using Playwright's trace viewer at `trace.playwright.dev`. However, directly passing CircleCI artifact URLs to `trace.playwright.dev?trace=<url>` fails due to CORS restrictions.

### Root Cause

1. **CORS Blocking**: CircleCI artifact URLs (e.g., `output.circle-artifacts.com`) do not include `Access-Control-Allow-Origin` headers that permit `trace.playwright.dev` to fetch them.
2. **Mixed Content**: During local development, `trace.playwright.dev` (HTTPS) cannot fetch from `localhost` (HTTP) due to browser security policies.

## Solution Architecture

Build a lightweight proxy service that:
1. Accepts a CircleCI artifact URL as a query parameter
2. Fetches the artifact server-side (bypassing browser CORS)
3. Returns the artifact with proper CORS headers
4. Redirects the user to `trace.playwright.dev` with the proxied URL

### Technology Stack

- **Frontend**: Vite + TypeScript (minimal, just handles redirect logic)
- **Backend**: Vercel Serverless Functions (handles proxy)
- **Deployment**: Vercel (provides HTTPS, serverless functions, CDN)

## User Flow

```
1. User visits: https://your-app.vercel.app?url=<circleci-artifact-url>
2. Frontend constructs proxy URL: /api/proxy?url=<encoded-circleci-url>
3. Frontend redirects to: https://trace.playwright.dev/?trace=<full-proxy-url>
4. trace.playwright.dev fetches trace via our proxy
5. Proxy fetches from CircleCI, returns with CORS headers
6. User sees trace in Playwright's viewer
```

## Project Structure

```
circleci-trace-viewer/
├── src/
│   └── main.ts              # Client-side redirect logic
├── api/
│   └── proxy.ts             # Vercel serverless function (CORS proxy)
├── index.html               # Landing page
├── package.json
├── vite.config.ts           # Vite config with dev proxy + HTTPS
├── tsconfig.json
├── vercel.json              # Vercel deployment config
└── .gitignore
```

## File Specifications

### 1. `package.json`

```json
{
  "name": "circleci-trace-viewer",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@vitejs/plugin-basic-ssl": "^1.1.0",
    "typescript": "^5.3.3",
    "vite": "^5.4.2"
  },
  "dependencies": {
    "@vercel/node": "^3.0.0"
  }
}
```

**Key Dependencies:**
- `@vitejs/plugin-basic-ssl`: Enables HTTPS in local development (required to avoid mixed content errors when testing with trace.playwright.dev)
- `@vercel/node`: Types and runtime for Vercel serverless functions

### 2. `src/main.ts` - Frontend Redirect Logic

**Purpose**: Read the `?url=` query parameter and redirect to trace.playwright.dev with the proxied URL.

**Key Logic**:
```typescript
const params = new URLSearchParams(window.location.search);
const traceUrl = params.get('url');

// Construct proxy URL (our serverless function)
const proxyUrl = `${window.location.origin}/api/proxy?url=${encodeURIComponent(traceUrl)}`;

// Redirect to Playwright trace viewer
const playwrightUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(proxyUrl)}`;
window.location.href = playwrightUrl;
```

**Error Handling**:
- Show error if no `url` parameter provided
- Validate URL format before redirecting
- Display usage instructions on landing page

### 3. `api/proxy.ts` - Vercel Serverless Proxy

**Purpose**: Fetch CircleCI artifacts and return them with CORS headers.

**Critical Implementation Details**:

1. **CORS Headers** (required for trace.playwright.dev to fetch):
   ```typescript
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
   ```

2. **Handle CORS Preflight**:
   ```typescript
   if (req.method === 'OPTIONS') {
     res.setHeader('Access-Control-Allow-Origin', '*');
     res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
     return res.status(200).end();
   }
   ```

3. **Security - Allowlist Domains** (prevent open proxy abuse):
   ```typescript
   const allowedHosts = ['output.circle-artifacts.com', 'circleci.com'];
   if (!allowedHosts.some(host => parsedUrl.hostname.endsWith(host))) {
     return res.status(403).json({ error: 'Only CircleCI artifact URLs allowed' });
   }
   ```

4. **Stream Response** (handle large trace files):
   ```typescript
   const arrayBuffer = await response.arrayBuffer();
   const buffer = Buffer.from(arrayBuffer);
   res.status(200).send(buffer);
   ```

5. **Forward Content-Type**:
   ```typescript
   const contentType = response.headers.get('content-type');
   if (contentType) res.setHeader('Content-Type', contentType);
   ```

### 4. `vite.config.ts` - Development Configuration

**Two Critical Plugins**:

1. **`basicSsl()`**: Enables HTTPS locally to avoid mixed content blocking
2. **`devProxyPlugin()`**: Mimics the Vercel serverless function locally

**Why Dev Proxy is Needed**:
- Vercel serverless functions only work when deployed
- Local development needs the same `/api/proxy` endpoint
- The plugin intercepts `/api/proxy` requests and handles them in-process

```typescript
function devProxyPlugin(): Plugin {
  return {
    name: 'dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/proxy')) {
          return next();
        }
        // ... fetch and proxy logic identical to api/proxy.ts
      });
    }
  };
}
```

### 5. `vercel.json` - Deployment Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/proxy.ts": {
      "maxDuration": 60
    }
  }
}
```

**Key Settings**:
- `maxDuration: 60`: Allow 60 seconds for large trace files (default is 10s)
- `outputDirectory: dist`: Vite builds to `dist/`

### 6. `index.html` - Landing Page

Simple HTML page that:
- Shows loading state while processing
- Displays error messages with usage instructions
- Shows "Redirecting..." message when successful

## Key Technical Learnings

### 1. CORS Cannot Be Bypassed Client-Side
- Browsers enforce CORS; you cannot add headers to third-party responses
- Solution: Server-side proxy that fetches and re-serves with correct headers

### 2. Mixed Content Blocking
- HTTPS pages cannot fetch HTTP resources
- Local development on `http://localhost` fails when redirecting to `https://trace.playwright.dev`
- Solution: Use `@vitejs/plugin-basic-ssl` to run local dev on HTTPS

### 3. Vercel Serverless Functions
- Place functions in `/api/` directory with `.ts` extension
- They don't run locally with `vite dev` - need custom middleware
- Use `VercelRequest` and `VercelResponse` types from `@vercel/node`

### 4. URL Encoding
- The trace URL must be double-encoded when passed through the chain:
  - Original: `https://circleci.com/artifact.zip`
  - In our URL: `?url=https%3A%2F%2Fcircleci.com%2Fartifact.zip`
  - In playwright URL: `?trace=https%3A%2F%2Four-app%2Fapi%2Fproxy%3Furl%3Dhttps%253A%252F%252F...`

### 5. Security Considerations
- **Domain Allowlist**: Only proxy requests to known CircleCI domains
- **No Open Proxy**: Prevents abuse as a general-purpose CORS proxy
- **Public Artifacts Only**: This solution works for public CircleCI projects; private projects would need authentication token handling

## Deployment Steps

### Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
cd circleci-trace-viewer
vercel

# Follow prompts, get URL like: https://circleci-trace-viewer.vercel.app
```

### Usage After Deployment

```
https://your-app.vercel.app?url=https://output.circle-artifacts.com/output/job/xxx/artifacts/0/path/to/trace.zip
```

## Local Development

```bash
# Install dependencies
npm install

# Run dev server (HTTPS enabled)
npm run dev

# Visit https://localhost:5173?url=<trace-url>
# Accept the self-signed certificate warning
```

## Testing Checklist

1. [ ] Local dev server starts on HTTPS
2. [ ] `/api/proxy` endpoint returns 200 with CORS headers
3. [ ] Redirect to trace.playwright.dev works
4. [ ] Trace loads and displays correctly in Playwright viewer
5. [ ] Non-CircleCI URLs are rejected with 403
6. [ ] Missing URL parameter shows helpful error

## Potential Enhancements

1. **Private Repository Support**: Add CircleCI API token input for private artifacts
2. **Artifact Browser**: List available artifacts from a CircleCI job URL
3. **Caching**: Cache traces temporarily to reduce repeated fetches
4. **URL Shortener**: Generate short URLs for sharing traces
