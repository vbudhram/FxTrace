const statusEl = document.getElementById('status')!;
const landingEl = document.getElementById('landing')!;
const exampleUrlEl = document.getElementById('example-url')!;
const traceUrlInput = document.getElementById('trace-url') as HTMLInputElement;
const viewBtn = document.getElementById('view-btn')!;

function showStatus(message: string, type: 'redirecting' | 'error') {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML = message;
  statusEl.classList.remove('hidden');
}

function redirectToTrace(traceUrl: string) {
  // Validate it looks like a URL
  try {
    new URL(traceUrl);
  } catch {
    showStatus(`Invalid URL: <code>${traceUrl}</code>`, 'error');
    return;
  }

  // Hide landing, show status
  landingEl.classList.add('hidden');
  showStatus(`Redirecting to Playwright Trace Viewer...<br><br>Trace: <code>${traceUrl}</code>`, 'redirecting');

  // Construct the proxy URL
  const proxyUrl = `${window.location.origin}/api/proxy?url=${encodeURIComponent(traceUrl)}`;

  // Construct the Playwright trace viewer URL
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
