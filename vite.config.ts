import { defineConfig, Plugin } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Dev proxy plugin to mimic Vercel serverless function locally
function devProxyPlugin(): Plugin {
  return {
    name: 'dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/proxy')) {
          return next();
        }

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
          res.statusCode = 200;
          res.end();
          return;
        }

        const urlParams = new URL(req.url, 'http://localhost').searchParams;
        const targetUrl = urlParams.get('url');

        if (!targetUrl) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        try {
          const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'CircleCI-Trace-Viewer-Proxy/1.0' }
          });

          if (!response.ok) {
            res.statusCode = response.status;
            res.end(JSON.stringify({ error: `Failed to fetch: ${response.statusText}` }));
            return;
          }

          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

          const contentType = response.headers.get('content-type');
          if (contentType) res.setHeader('Content-Type', contentType);

          const contentLength = response.headers.get('content-length');
          if (contentLength) res.setHeader('Content-Length', contentLength);

          const buffer = Buffer.from(await response.arrayBuffer());
          res.end(buffer);
        } catch (err) {
          console.error('Proxy error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [basicSsl(), devProxyPlugin()],
  build: {
    outDir: 'dist'
  },
  server: {
    fs: {
      strict: false
    }
  }
})
