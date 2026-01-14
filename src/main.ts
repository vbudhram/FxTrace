const statusEl = document.getElementById('status')!;
const landingEl = document.getElementById('landing')!;
const exampleUrlEl = document.getElementById('example-url')!;
const traceUrlInput = document.getElementById('trace-url') as HTMLInputElement;
const viewBtn = document.getElementById('view-btn')!;
const themeToggle = document.getElementById('theme-toggle')!;
const themeIcon = themeToggle.querySelector('.theme-icon')!;
const themeText = themeToggle.querySelector('.theme-text')!;
const artifactsListEl = document.getElementById('artifacts-list')!;

interface CircleCIArtifact {
  path: string;
  node_index: number;
  url: string;
}

interface ArtifactsResponse {
  traces: CircleCIArtifact[];
  all: CircleCIArtifact[];
  job: string;
  project: string;
}

interface ParsedJobUrl {
  project: string;
  job: string;
}

// Theme management
function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): 'light' | 'dark' | null {
  return localStorage.getItem('theme') as 'light' | 'dark' | null;
}

function getCurrentTheme(): 'light' | 'dark' {
  const stored = getStoredTheme();
  if (stored) return stored;
  return getSystemTheme();
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark';
  }
}

function initTheme() {
  const stored = getStoredTheme();
  if (stored) {
    applyTheme(stored);
  } else {
    // Use system preference, apply class for CSS matching
    const systemTheme = getSystemTheme();
    if (systemTheme === 'dark') {
      document.body.classList.add('system-dark');
    }
    applyTheme(systemTheme);
  }
}

function toggleTheme() {
  const current = getCurrentTheme();
  const newTheme = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  document.body.classList.remove('system-dark');
  applyTheme(newTheme);
}

// Initialize theme immediately
initTheme();

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!getStoredTheme()) {
    const newTheme = e.matches ? 'dark' : 'light';
    document.body.classList.toggle('system-dark', e.matches);
    applyTheme(newTheme);
  }
});

// Theme toggle click handler
themeToggle.addEventListener('click', toggleTheme);

// URL type detection
function parseCircleCIJobUrl(url: string): ParsedJobUrl | null {
  // Match URLs like:
  // https://app.circleci.com/pipelines/github/mozilla/fxa/66156/workflows/xxx/jobs/633381
  // https://app.circleci.com/pipelines/gh/mozilla/fxa/66156/workflows/xxx/jobs/633381
  const jobUrlPattern = /app\.circleci\.com\/pipelines\/(github|gh)\/([^/]+)\/([^/]+)\/\d+\/workflows\/[^/]+\/jobs\/(\d+)/;
  const match = url.match(jobUrlPattern);

  if (match) {
    const [, vcs, org, repo, job] = match;
    return {
      project: `${vcs}/${org}/${repo}`,
      job,
    };
  }
  return null;
}

function isArtifactUrl(url: string): boolean {
  return url.includes('circle-artifacts.com') || url.includes('circleci.com/gh/');
}

function hideArtifactsList() {
  artifactsListEl.classList.add('hidden');
  artifactsListEl.innerHTML = '';
}

interface ParsedTraceInfo {
  testName: string;
  testSuite: string | null;
  testType: string | null;
  severity: string | null;
  retry: string | null;
  fileName: string;
}

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function parseTracePath(path: string): ParsedTraceInfo {
  const parts = path.split('/').filter(p => p && p !== '..' && p !== '.');
  const fileName = parts.pop() || 'trace.zip';

  // Try to extract test type (e.g., "functional", "integration")
  let testType: string | null = null;
  const testTypes = ['functional', 'integration', 'e2e', 'unit', 'smoke', 'regression'];
  for (const part of parts) {
    if (testTypes.includes(part.toLowerCase())) {
      testType = part.toLowerCase();
      break;
    }
  }

  // Get the last directory which contains the test info
  // Format: {suite}-severity-{N}-{hash}-{testname}[-local][-retry{N}]
  const lastDir = parts[parts.length - 1] || '';

  // Extract retry info (e.g., "retry1", "retry2")
  const retryMatch = lastDir.match(/[-_](retry\d+)$/i);
  const retry = retryMatch ? retryMatch[1] : null;

  // Remove retry suffix for cleaner parsing
  let testPart = retry ? lastDir.replace(/[-_]retry\d+$/i, '') : lastDir;

  // Extract severity (e.g., "severity-1", "severity-2")
  const severityMatch = testPart.match(/severity-(\d+)/i);
  const severity = severityMatch ? severityMatch[1] : null;

  // Parse the structure: {suite}-severity-{N}-{hash}-{testname}[-local]
  // Example: settings-avatar-severity-1-5148f-close-avatar-drop-down-menu-local
  let testSuite: string | null = null;
  let testName: string = lastDir;

  if (severityMatch) {
    // Everything before "severity" is the test suite
    // Format: settings-avatar → settings/avatar.spec.ts
    const beforeSeverity = testPart.split(/[-_]severity[-_]/i)[0];
    if (beforeSeverity) {
      // Convert "settings-avatar" to "settings/avatar.spec.ts"
      const suiteParts = beforeSeverity.split('-');
      if (suiteParts.length >= 2) {
        const dir = suiteParts.slice(0, -1).join('/');
        const file = suiteParts[suiteParts.length - 1];
        testSuite = `${dir}/${file}.spec.ts`;
      } else {
        testSuite = `${beforeSeverity}.spec.ts`;
      }
    }

    // Everything after severity-N-{hash} is the test name
    // Pattern: severity-{N}-{5char hash}-{test name}
    const afterSeverityMatch = testPart.match(/severity-\d+[-_]([a-f0-9]{4,6})[-_](.+)/i);
    if (afterSeverityMatch) {
      testName = afterSeverityMatch[2];
      // Remove trailing "-local" if present
      testName = testName.replace(/[-_]local$/i, '');
    }
  }

  // Convert test name to title case
  testName = toTitleCase(testName);

  // If we couldn't extract a good name, use the directory name
  if (!testName || testName.length < 3) {
    testName = toTitleCase(lastDir) || 'Trace';
  }

  return { testName, testSuite, testType, severity, retry, fileName };
}

function showArtifactsList(artifacts: CircleCIArtifact[]) {
  artifactsListEl.classList.remove('hidden');

  if (artifacts.length === 0) {
    artifactsListEl.innerHTML = `
      <div class="no-artifacts">
        <p>No trace files found in this job.</p>
        <p class="hint">Looking for <code>.zip</code> files containing "trace" or "playwright" in the path.</p>
      </div>
    `;
    return;
  }

  const listHtml = artifacts.map((artifact, index) => {
    const info = parseTracePath(artifact.path);

    // Build metadata tags
    const tags: string[] = [];
    if (info.testSuite) tags.push(info.testSuite);
    if (info.testType) tags.push(info.testType);
    if (info.severity) tags.push(`S${info.severity}`);
    if (info.retry) tags.push(info.retry);

    const metaHtml = tags.map(tag => `<span class="artifact-tag">${tag}</span>`).join('');

    return `
      <button class="artifact-item" data-url="${artifact.url}" data-index="${index}">
        <span class="artifact-icon">📦</span>
        <span class="artifact-info">
          <span class="artifact-name">${info.testName}</span>
          <span class="artifact-meta">${metaHtml}</span>
        </span>
        <span class="artifact-arrow">→</span>
      </button>
    `;
  }).join('');

  artifactsListEl.innerHTML = `
    <div class="artifacts-header">
      <h3>Trace Files Found</h3>
      <span class="artifacts-count">${artifacts.length} trace${artifacts.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="artifacts-items">
      ${listHtml}
    </div>
  `;

  // Add click handlers
  artifactsListEl.querySelectorAll('.artifact-item').forEach((item) => {
    item.addEventListener('click', () => {
      const url = item.getAttribute('data-url');
      if (url) {
        hideArtifactsList();
        redirectToTrace(url);
      }
    });
  });
}

async function fetchJobArtifacts(jobInfo: ParsedJobUrl) {
  landingEl.classList.add('hidden');
  hideArtifactsList();
  showStatus(
    `<span class="spinner"></span>Fetching artifacts from job ${jobInfo.job}...`,
    'loading'
  );

  try {
    const apiUrl = `${window.location.origin}/api/artifacts?project=${encodeURIComponent(jobInfo.project)}&job=${encodeURIComponent(jobInfo.job)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errorMsg = data.error || `Failed to fetch artifacts: ${response.status}`;
      showStatus(errorMsg, 'error');
      showLanding();
      return;
    }

    const data: ArtifactsResponse = await response.json();

    if (data.traces.length === 0) {
      showStatus(
        `No trace files found in job ${jobInfo.job}.<br><br>Found ${data.all.length} total artifact${data.all.length !== 1 ? 's' : ''}, but none appear to be Playwright traces.`,
        'error'
      );
      showLanding();
      return;
    }

    // Show success status and artifact list
    statusEl.classList.add('hidden');
    showLanding();
    showArtifactsList(data.traces);

  } catch (err) {
    showStatus(`Failed to fetch artifacts: ${err}`, 'error');
    showLanding();
  }
}

function handleUrl(url: string) {
  // Check if it's a CircleCI job URL
  const jobInfo = parseCircleCIJobUrl(url);
  if (jobInfo) {
    fetchJobArtifacts(jobInfo);
    return;
  }

  // Otherwise treat as artifact URL
  if (isArtifactUrl(url) || url.endsWith('.zip')) {
    redirectToTrace(url);
    return;
  }

  // Try to parse as URL and redirect anyway
  try {
    new URL(url);
    redirectToTrace(url);
  } catch {
    showStatus(`Invalid URL: <code>${url}</code>`, 'error');
    showLanding(url);
  }
}

function showStatus(message: string, type: 'redirecting' | 'error' | 'loading') {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML = message;
  statusEl.classList.remove('hidden');
}

function showLanding(prefillUrl?: string) {
  landingEl.classList.remove('hidden');
  if (prefillUrl) {
    traceUrlInput.value = prefillUrl;
  }
}

async function redirectToTrace(traceUrl: string) {
  // Validate it looks like a URL
  try {
    new URL(traceUrl);
  } catch {
    showStatus(`Invalid URL: <code>${traceUrl}</code>`, 'error');
    showLanding(traceUrl);
    return;
  }

  // Hide landing, show loading status with spinner
  landingEl.classList.add('hidden');
  showStatus(`<span class="spinner"></span>Checking artifact...<br><br>URL: <code>${traceUrl}</code>`, 'loading');

  // Construct the proxy URL
  const proxyUrl = `${window.location.origin}/api/proxy?url=${encodeURIComponent(traceUrl)}`;

  // Check if artifact exists with a HEAD request
  try {
    const response = await fetch(proxyUrl, { method: 'HEAD' });

    if (!response.ok) {
      const errorMsg = response.status === 404
        ? 'Artifact not found. The trace file may have expired or the URL is incorrect.'
        : `Failed to fetch artifact: ${response.status} ${response.statusText}`;
      showStatus(`${errorMsg}<br><br>URL: <code>${traceUrl}</code>`, 'error');
      showLanding(traceUrl);
      return;
    }
  } catch (err) {
    showStatus(`Failed to reach artifact: ${err}<br><br>URL: <code>${traceUrl}</code>`, 'error');
    showLanding(traceUrl);
    return;
  }

  // Artifact exists, redirect to Playwright
  showStatus(`Redirecting to Playwright Trace Viewer...<br><br>Trace: <code>${traceUrl}</code>`, 'redirecting');

  const playwrightUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(proxyUrl)}`;

  // Redirect after a brief delay so user sees what's happening
  setTimeout(() => {
    window.location.href = playwrightUrl;
  }, 500);
}

function main() {
  // Set example URL
  exampleUrlEl.textContent = `${window.location.origin}?url=<circleci-url>`;

  // Check for URL parameter
  const params = new URLSearchParams(window.location.search);
  const traceUrl = params.get('url');

  if (traceUrl) {
    // Auto-handle if URL provided
    handleUrl(traceUrl);
    return;
  }

  // Handle form submission
  viewBtn.addEventListener('click', () => {
    const url = traceUrlInput.value.trim();
    if (!url) {
      showStatus('Please enter a CircleCI URL', 'error');
      return;
    }
    hideArtifactsList();
    handleUrl(url);
  });

  // Handle enter key in input
  traceUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      viewBtn.click();
    }
  });

  // Handle paste anywhere on page - auto-submit if it's a CircleCI URL
  document.addEventListener('paste', (e) => {
    const pastedText = e.clipboardData?.getData('text')?.trim();
    if (!pastedText) return;

    // Check if it's a job URL or artifact URL
    const isJobUrl = parseCircleCIJobUrl(pastedText) !== null;
    const isArtifact = pastedText.includes('circle-artifacts.com');

    if (isJobUrl || isArtifact) {
      e.preventDefault();
      traceUrlInput.value = pastedText;
      traceUrlInput.focus();
      hideArtifactsList();
      handleUrl(pastedText);
    }
  });
}

main();
