const statusEl = document.getElementById('status')!;
const landingEl = document.getElementById('landing')!;
const exampleUrlEl = document.getElementById('example-url')!;
const traceUrlInput = document.getElementById('trace-url') as HTMLInputElement;
const viewBtn = document.getElementById('view-btn')!;
const themeToggle = document.getElementById('theme-toggle')!;
const themeIcon = themeToggle.querySelector('.theme-icon')!;
const themeText = themeToggle.querySelector('.theme-text')!;

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
  exampleUrlEl.textContent = `${window.location.origin}?url=<circleci-trace-url>`;

  // Check for URL parameter
  const params = new URLSearchParams(window.location.search);
  const traceUrl = params.get('url');

  if (traceUrl) {
    // Auto-redirect if URL provided
    redirectToTrace(traceUrl);
    return;
  }

  // Handle form submission
  viewBtn.addEventListener('click', () => {
    const url = traceUrlInput.value.trim();
    if (!url) {
      showStatus('Please enter a CircleCI trace URL', 'error');
      return;
    }
    redirectToTrace(url);
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
    if (pastedText && pastedText.includes('circle-artifacts.com') && pastedText.includes('trace.zip')) {
      e.preventDefault();
      traceUrlInput.value = pastedText;
      traceUrlInput.focus();
      redirectToTrace(pastedText);
    }
  });
}

main();
