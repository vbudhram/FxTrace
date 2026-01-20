import { defineConfig, Plugin } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Dev proxy plugin to mimic Vercel serverless functions locally
function devProxyPlugin(): Plugin {
  return {
    name: 'dev-proxy',
    configureServer(server) {
      // Handle /api/artifacts endpoint
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/artifacts')) {
          return next();
        }

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        const urlParams = new URL(req.url, 'http://localhost').searchParams;
        const project = urlParams.get('project');
        const job = urlParams.get('job');
        const token = urlParams.get('token');

        if (!project || !job) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing required parameters: project and job' }));
          return;
        }

        const projectSlug = project.replace(/^github\//, 'gh/');

        try {
          const apiUrl = `https://circleci.com/api/v2/project/${projectSlug}/${job}/artifacts`;
          const headers: Record<string, string> = { 'Accept': 'application/json' };
          if (token) {
            headers['Circle-Token'] = token;
          }
          const response = await fetch(apiUrl, { headers });

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');

          if (!response.ok) {
            res.statusCode = response.status;
            res.end(JSON.stringify({ error: `CircleCI API error: ${response.status}` }));
            return;
          }

          const data = await response.json();
          const traceArtifacts = data.items.filter((artifact: { path: string }) =>
            artifact.path.endsWith('.zip') &&
            (artifact.path.includes('trace') || artifact.path.includes('playwright'))
          );

          res.end(JSON.stringify({
            traces: traceArtifacts,
            all: data.items,
            job,
            project: projectSlug,
          }));
        } catch (err) {
          console.error('Artifacts API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err) }));
        }
      });

      // Handle /api/proxy endpoint
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
        const token = urlParams.get('token');

        if (!targetUrl) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        try {
          const headers: Record<string, string> = { 'User-Agent': 'CircleCI-Trace-Viewer-Proxy/1.0' };
          if (token) {
            headers['Circle-Token'] = token;
          }
          const response = await fetch(targetUrl, { headers });

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
