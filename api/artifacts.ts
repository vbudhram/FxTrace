import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CircleCIArtifact {
  path: string;
  node_index: number;
  url: string;
}

interface CircleCIArtifactsResponse {
  items: CircleCIArtifact[];
  next_page_token: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { project, job, token } = req.query;

  if (!project || !job) {
    return res.status(400).json({
      error: 'Missing required parameters: project and job'
    });
  }

  // Get optional CircleCI token for private repos
  const circleciToken = typeof token === 'string' ? token : undefined;

  // Validate project format (should be like "gh/mozilla/fxa" or "github/mozilla/fxa")
  const projectSlug = String(project).replace(/^github\//, 'gh/');

  if (!projectSlug.match(/^gh\/[\w-]+\/[\w-]+$/)) {
    return res.status(400).json({
      error: 'Invalid project format. Expected: gh/org/repo or github/org/repo'
    });
  }

  const jobNumber = String(job);
  if (!jobNumber.match(/^\d+$/)) {
    return res.status(400).json({
      error: 'Invalid job number. Expected a numeric value.'
    });
  }

  try {
    const apiUrl = `https://circleci.com/api/v2/project/${projectSlug}/${jobNumber}/artifacts`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Add authorization header if token provided (for private repos)
    if (circleciToken) {
      headers['Circle-Token'] = circleciToken;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          error: 'Job not found. The job may have expired or the URL is incorrect.'
        });
      }
      return res.status(response.status).json({
        error: `CircleCI API error: ${response.status} ${response.statusText}`
      });
    }

    const data: CircleCIArtifactsResponse = await response.json();

    // Filter for trace zip files
    const traceArtifacts = data.items.filter(artifact =>
      artifact.path.endsWith('.zip') &&
      (artifact.path.includes('trace') || artifact.path.includes('playwright'))
    );

    // Return all artifacts but highlight traces
    return res.status(200).json({
      traces: traceArtifacts,
      all: data.items,
      job: jobNumber,
      project: projectSlug,
    });

  } catch (err) {
    console.error('Error fetching artifacts:', err);
    return res.status(500).json({
      error: `Failed to fetch artifacts: ${err}`
    });
  }
}
