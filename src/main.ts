const statusEl = document.getElementById('status')!;
const landingEl = document.getElementById('landing')!;
const exampleUrlEl = document.getElementById('example-url')!;
const traceUrlInput = document.getElementById('trace-url') as HTMLInputElement;
const viewBtn = document.getElementById('view-btn')!;

function showStatus(message: string, type: 'redirecting' | 'error' | 'loading') {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML = message;
  statusEl.classList.remove('hidden');
}

function showLanding() {
  landingEl.classList.remove('hidden');
}

async function redirectToTrace(traceUrl: string) {
  // Validate it looks like a URL
  try {
    new URL(traceUrl);
  } catch {
    showStatus(`Invalid URL: <code>${traceUrl}</code>`, 'error');
    return;
  }

  // Hide landing, show loading status
  landingEl.classList.add('hidden');
  showStatus(`Checking artifact...<br><br>URL: <code>${traceUrl}</code>`, 'loading');

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
      showLanding();
      return;
    }
  } catch (err) {
    showStatus(`Failed to reach artifact: ${err}<br><br>URL: <code>${traceUrl}</code>`, 'error');
    showLanding();
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
}

main();
