const statusEl = document.getElementById('status')!;
const landingEl = document.getElementById('landing')!;
const exampleUrlEl = document.getElementById('example-url')!;
const traceUrlInput = document.getElementById('trace-url') as HTMLInputElement;
const viewBtn = document.getElementById('view-btn')!;
const themeToggle = document.getElementById('theme-toggle')!;
const themeIcon = themeToggle.querySelector('.theme-icon')!;
const themeText = themeToggle.querySelector('.theme-text')!;
const artifactsListEl = document.getElementById('artifacts-list')!;
const recentUrlsEl = document.getElementById('recent-urls')!;
const tokenInput = document.getElementById('circleci-token') as HTMLInputElement;
const saveTokenBtn = document.getElementById('save-token-btn')!;
const clearTokenBtn = document.getElementById('clear-token-btn')!;
const tokenStatusEl = document.getElementById('token-status')!;

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

interface RecentUrl {
  url: string;
  title: string;
  type: 'job' | 'artifact';
  timestamp: number;
}

const RECENT_URLS_KEY = 'fxtrace_recent_urls';
const MAX_RECENT_URLS = 8;
const CIRCLECI_TOKEN_KEY = 'fxtrace_circleci_token';

// Current artifacts for filtering
let currentArtifacts: CircleCIArtifact[] = [];
let currentJobUrl: string | undefined;

// Token management
function getStoredToken(): string | null {
  return localStorage.getItem(CIRCLECI_TOKEN_KEY);
}

function saveToken(token: string) {
  localStorage.setItem(CIRCLECI_TOKEN_KEY, token);
  updateTokenStatus();
}

function clearToken() {
  localStorage.removeItem(CIRCLECI_TOKEN_KEY);
  tokenInput.value = '';
  updateTokenStatus();
}

function updateTokenStatus() {
  const token = getStoredToken();
  if (token) {
    tokenStatusEl.className = 'token-status';
    tokenStatusEl.innerHTML = '<span>Token configured - private repos supported</span>';
  } else {
    tokenStatusEl.className = 'token-status no-token';
    tokenStatusEl.innerHTML = '<span>No token configured - only public repos supported</span>';
  }
}

// Initialize token UI
function initTokenUI() {
  updateTokenStatus();

  saveTokenBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (token) {
      saveToken(token);
      tokenInput.value = '';
    }
  });

  clearTokenBtn.addEventListener('click', () => {
    clearToken();
  });

  tokenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveTokenBtn.click();
    }
  });
}

// Recent URLs management
function getRecentUrls(): RecentUrl[] {
  try {
    const stored = localStorage.getItem(RECENT_URLS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentUrls(urls: RecentUrl[]) {
  localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(urls));
}

function addRecentUrl(url: string, title: string, type: 'job' | 'artifact') {
  const urls = getRecentUrls();

  // Remove existing entry for this URL
  const filtered = urls.filter(u => u.url !== url);

  // Add new entry at the beginning
  filtered.unshift({
    url,
    title,
    type,
    timestamp: Date.now(),
  });

  // Keep only the most recent entries
  saveRecentUrls(filtered.slice(0, MAX_RECENT_URLS));
  renderRecentUrls();
}

function removeRecentUrl(url: string) {
  const urls = getRecentUrls().filter(u => u.url !== url);
  saveRecentUrls(urls);
  renderRecentUrls();
}

function clearRecentUrls() {
  localStorage.removeItem(RECENT_URLS_KEY);
  renderRecentUrls();
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function renderRecentUrls() {
  const urls = getRecentUrls();

  if (urls.length === 0) {
    recentUrlsEl.classList.add('hidden');
    recentUrlsEl.innerHTML = '';
    return;
  }

  recentUrlsEl.classList.remove('hidden');

  const itemsHtml = urls.map((item, index) => `
    <button class="recent-item" data-url="${item.url}" data-index="${index}">
      <span class="recent-item-icon">${item.type === 'job' ? '📋' : '📦'}</span>
      <span class="recent-item-info">
        <span class="recent-item-title">${item.title}</span>
        <span class="recent-item-meta">${formatTimeAgo(item.timestamp)}</span>
      </span>
      <span class="recent-item-remove" data-url="${item.url}" title="Remove">×</span>
    </button>
  `).join('');

  recentUrlsEl.innerHTML = `
    <div class="recent-header">
      <h3>Recent</h3>
      <button class="clear-history-btn" id="clear-history-btn">Clear all</button>
    </div>
    <div class="recent-items">
      ${itemsHtml}
    </div>
  `;

  // Add click handlers
  recentUrlsEl.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Check if the click was on the remove button
      const target = e.target as HTMLElement;
      if (target.classList.contains('recent-item-remove')) {
        e.stopPropagation();
        const url = target.getAttribute('data-url');
        if (url) removeRecentUrl(url);
        return;
      }

      const url = item.getAttribute('data-url');
      if (url) {
        traceUrlInput.value = url;
        hideArtifactsList();
        handleUrl(url);
      }
    });
  });

  document.getElementById('clear-history-btn')?.addEventListener('click', clearRecentUrls);
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

function getJobTitleFromUrl(url: string): string {
  const parsed = parseCircleCIJobUrl(url);
  if (parsed) {
    const parts = parsed.project.split('/');
    return `${parts[1]}/${parts[2]} #${parsed.job}`;
  }
  return url.substring(0, 50) + '...';
}

function isArtifactUrl(url: string): boolean {
  return url.includes('circle-artifacts.com') || url.includes('circleci.com/gh/');
}

function hideArtifactsList() {
  artifactsListEl.classList.add('hidden');
  artifactsListEl.innerHTML = '';
  currentArtifacts = [];
  currentJobUrl = undefined;
}

interface ParsedTraceInfo {
  testName: string;
  testSuite: string | null;
  testType: string | null;
  severity: string | null;
  retry: string | null;
  retryNum: number; // 0 for original, 1+ for retries
  fileName: string;
  groupKey: string; // Unique key for grouping (test without retry)
}

interface ArtifactGroup {
  primary: CircleCIArtifact;
  retries: CircleCIArtifact[];
  info: ParsedTraceInfo;
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
  const retryMatch = lastDir.match(/[-_](retry(\d+))$/i);
  const retry = retryMatch ? retryMatch[1] : null;
  const retryNum = retryMatch ? parseInt(retryMatch[2], 10) : 0;

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

  // Create a group key for combining retries (path without retry suffix)
  // Use the raw path structure for more reliable matching
  const pathWithoutRetry = lastDir.replace(/[-_]retry\d+$/i, '');
  const groupKey = pathWithoutRetry.toLowerCase();

  return { testName, testSuite, testType, severity, retry, retryNum, fileName, groupKey };
}

function filterArtifacts(artifacts: CircleCIArtifact[], query: string): CircleCIArtifact[] {
  if (!query.trim()) return artifacts;

  const lowerQuery = query.toLowerCase();
  return artifacts.filter(artifact => {
    const info = parseTracePath(artifact.path);
    const searchText = [
      info.testName,
      info.testSuite,
      info.testType,
      info.severity ? `S${info.severity}` : '',
      info.retry,
      artifact.path,
    ].filter(Boolean).join(' ').toLowerCase();

    return searchText.includes(lowerQuery);
  });
}

function groupArtifacts(artifacts: CircleCIArtifact[]): ArtifactGroup[] {
  const groups = new Map<string, ArtifactGroup>();

  for (const artifact of artifacts) {
    const info = parseTracePath(artifact.path);
    const existing = groups.get(info.groupKey);

    if (!existing) {
      groups.set(info.groupKey, {
        primary: artifact,
        retries: [],
        info,
      });
    } else {
      // Determine if this is the primary (original) or a retry
      if (info.retryNum === 0) {
        // This is the original, move current primary to retries if it's a retry
        if (existing.info.retryNum > 0) {
          existing.retries.push(existing.primary);
          existing.primary = artifact;
          existing.info = info;
        } else {
          // Both are originals (shouldn't happen), keep first
          existing.retries.push(artifact);
        }
      } else {
        // This is a retry
        existing.retries.push(artifact);
      }
    }
  }

  // Sort retries within each group by retry number
  for (const group of groups.values()) {
    group.retries.sort((a, b) => {
      const infoA = parseTracePath(a.path);
      const infoB = parseTracePath(b.path);
      return infoA.retryNum - infoB.retryNum;
    });
  }

  return Array.from(groups.values());
}

function renderArtifactItems(artifacts: CircleCIArtifact[]) {
  const itemsContainer = artifactsListEl.querySelector('.artifacts-items');
  if (!itemsContainer) return;

  if (artifacts.length === 0) {
    itemsContainer.innerHTML = `
      <div class="no-artifacts">
        <p>No traces match your filter.</p>
      </div>
    `;
    return;
  }

  const groups = groupArtifacts(artifacts);

  const listHtml = groups.map((group, groupIndex) => {
    const { primary, retries, info } = group;
    const hasRetries = retries.length > 0;

    // Build metadata tags (without retry for primary)
    const tags: string[] = [];
    if (info.testSuite) tags.push(info.testSuite);
    if (info.testType) tags.push(info.testType);
    if (info.severity) tags.push(`S${info.severity}`);

    const metaHtml = tags.map(tag => `<span class="artifact-tag">${tag}</span>`).join('');

    // Retry indicator
    const retryBadge = hasRetries
      ? `<span class="retry-badge" title="${retries.length} retry attempt${retries.length > 1 ? 's' : ''}">${retries.length} retry</span>`
      : '';

    // Build retries HTML
    const retriesHtml = hasRetries ? `
      <div class="artifact-retries hidden" data-group="${groupIndex}">
        ${retries.map((retry, retryIndex) => {
          const retryInfo = parseTracePath(retry.path);
          return `
            <button class="artifact-item artifact-retry-item" data-url="${retry.url}" data-retry="${retryIndex}">
              <span class="artifact-icon">🔄</span>
              <span class="artifact-info">
                <span class="artifact-name">${retryInfo.retry || `Retry ${retryIndex + 1}`}</span>
              </span>
              <span class="artifact-arrow">→</span>
            </button>
          `;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="artifact-group" data-group="${groupIndex}">
        <div class="artifact-group-header">
          <button class="artifact-item artifact-primary" data-url="${primary.url}" data-group="${groupIndex}">
            <span class="artifact-icon">${hasRetries ? '⚠️' : '📦'}</span>
            <span class="artifact-info">
              <span class="artifact-name">${info.testName}</span>
              <span class="artifact-meta">${metaHtml}${retryBadge}</span>
            </span>
            <span class="artifact-arrow">→</span>
          </button>
          ${hasRetries ? `<button class="retry-toggle" data-group="${groupIndex}" title="Show retries">▼</button>` : ''}
        </div>
        ${retriesHtml}
      </div>
    `;
  }).join('');

  itemsContainer.innerHTML = listHtml;

  // Add click handlers for primary items
  itemsContainer.querySelectorAll('.artifact-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking on retry toggle
      if ((e.target as HTMLElement).classList.contains('retry-toggle')) return;

      const url = item.getAttribute('data-url');
      if (url) {
        const proxyUrl = `${window.location.origin}/api/proxy?url=${encodeURIComponent(url)}`;
        const playwrightUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(proxyUrl)}`;
        window.open(playwrightUrl, '_blank');
      }
    });
  });

  // Add click handlers for retry toggles
  itemsContainer.querySelectorAll('.retry-toggle').forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const groupIndex = toggle.getAttribute('data-group');
      const retriesContainer = itemsContainer.querySelector(`.artifact-retries[data-group="${groupIndex}"]`);
      if (retriesContainer) {
        const isHidden = retriesContainer.classList.toggle('hidden');
        (toggle as HTMLButtonElement).textContent = isHidden ? '▼' : '▲';
        (toggle as HTMLButtonElement).title = isHidden ? 'Show retries' : 'Hide retries';
      }
    });
  });
}

function showArtifactsList(artifacts: CircleCIArtifact[], jobUrl?: string) {
  currentArtifacts = artifacts;
  currentJobUrl = jobUrl;

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

  const shareButtonHtml = jobUrl ? `
    <button class="share-job-btn" id="share-job-btn" title="Copy shareable link">
      <span class="share-icon">🔗</span>
      <span class="share-text">Share</span>
    </button>
  ` : '';

  artifactsListEl.innerHTML = `
    <div class="search-filter">
      <input type="text" id="artifact-search" placeholder="Filter traces by name, suite, or severity..." />
    </div>
    <div class="artifacts-header">
      <div class="artifacts-header-left">
        <h3>Trace Files Found</h3>
        <span class="artifacts-count">${artifacts.length} trace${artifacts.length !== 1 ? 's' : ''}</span>
      </div>
      ${shareButtonHtml}
    </div>
    <div class="artifacts-items">
    </div>
  `;

  // Render initial items
  renderArtifactItems(artifacts);

  // Add search filter handler
  const searchInput = document.getElementById('artifact-search') as HTMLInputElement;
  let debounceTimer: number;

  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      const filtered = filterArtifacts(currentArtifacts, searchInput.value);
      renderArtifactItems(filtered);

      // Update count
      const countEl = artifactsListEl.querySelector('.artifacts-count');
      if (countEl) {
        const total = currentArtifacts.length;
        const shown = filtered.length;
        countEl.textContent = shown === total
          ? `${total} trace${total !== 1 ? 's' : ''}`
          : `${shown} of ${total} traces`;
      }
    }, 150);
  });

  // Add share button handler
  if (jobUrl) {
    const shareBtn = document.getElementById('share-job-btn');
    shareBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const shareUrl = `${window.location.origin}?url=${encodeURIComponent(jobUrl)}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        shareBtn.classList.add('copied');
        setTimeout(() => shareBtn.classList.remove('copied'), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        shareBtn.classList.add('copied');
        setTimeout(() => shareBtn.classList.remove('copied'), 2000);
      }
    });
  }
}

async function fetchJobArtifacts(jobInfo: ParsedJobUrl, originalUrl: string) {
  landingEl.classList.add('hidden');
  hideArtifactsList();
  showStatus(
    `<span class="spinner"></span>Fetching artifacts from job ${jobInfo.job}...`,
    'loading'
  );

  try {
    const token = getStoredToken();
    const apiUrl = `${window.location.origin}/api/artifacts?project=${encodeURIComponent(jobInfo.project)}&job=${encodeURIComponent(jobInfo.job)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
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

    // Add to recent URLs
    const title = getJobTitleFromUrl(originalUrl);
    addRecentUrl(originalUrl, title, 'job');

    // Show success status and artifact list
    statusEl.classList.add('hidden');
    showLanding();
    showArtifactsList(data.traces, originalUrl);

  } catch (err) {
    showStatus(`Failed to fetch artifacts: ${err}`, 'error');
    showLanding();
  }
}

function handleUrl(url: string) {
  // Check if it's a CircleCI job URL
  const jobInfo = parseCircleCIJobUrl(url);
  if (jobInfo) {
    fetchJobArtifacts(jobInfo, url);
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
  const token = getStoredToken();
  const proxyUrl = `${window.location.origin}/api/proxy?url=${encodeURIComponent(traceUrl)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

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

  // Add to recent URLs
  const fileName = traceUrl.split('/').pop() || 'trace.zip';
  addRecentUrl(traceUrl, fileName, 'artifact');

  // Artifact exists, redirect to Playwright
  showStatus(`Redirecting to Playwright Trace Viewer...<br><br>Trace: <code>${traceUrl}</code>`, 'redirecting');

  const playwrightUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(proxyUrl)}`;

  // Redirect after a brief delay so user sees what's happening
  setTimeout(() => {
    window.location.href = playwrightUrl;
  }, 500);
}

function main() {
  // Initialize token UI
  initTokenUI();

  // Render recent URLs
  renderRecentUrls();

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
