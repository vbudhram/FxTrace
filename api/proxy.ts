import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { url, token } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Get optional CircleCI token for private repos
  const circleciToken = typeof token === 'string' ? token : undefined;

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Only allow CircleCI artifact URLs for security
  const allowedHosts = [
    'output.circle-artifacts.com',
    'circleci.com',
  ];

  if (!allowedHosts.some(host => parsedUrl.hostname.endsWith(host))) {
    return res.status(403).json({
      error: 'Only CircleCI artifact URLs are allowed',
      allowedHosts
    });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'CircleCI-Trace-Viewer-Proxy/1.0',
    };

    // Add authorization header if token provided (for private repos)
    if (circleciToken) {
      headers['Circle-Token'] = circleciToken;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch artifact: ${response.statusText}`
      });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // Forward content type
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Forward content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the response body
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Failed to proxy request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
