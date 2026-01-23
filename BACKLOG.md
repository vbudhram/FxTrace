# FxTrace Product Backlog

This file contains the product backlog for FxTrace, managed by the Product Owner agent.
Run `/product-owner` to scan for improvements and generate new PRD entries.

**Last Updated:** 2026-01-23
**Total Items:** 14 (4 completed, 10 remaining)

---

## Backlog Items

---

## Bulk Trace Viewing

**Priority:** P2 (Medium)
**Effort:** M (Medium, 1-3 days)
**Status:** Proposed

### Problem Statement
When debugging a test suite failure, users often need to view multiple related traces. Currently they must click each one individually, wait for it to load, then return to select the next.

### Proposed Solution
Add multi-select capability to open several traces in separate tabs simultaneously.

### Requirements
- [ ] Add checkbox to each artifact item
- [ ] "Select All" / "Deselect All" buttons
- [ ] "Open Selected" button appears when items selected
- [ ] Opens each trace in a new tab
- [ ] Limit to reasonable number (e.g., 10) to prevent browser overload
- [ ] Visual indicator of selected state

### Technical Notes
- May trigger popup blocker - need user gesture per tab or inform user
- Consider sequential opening with small delay
- Remember selection state if user navigates away and back

### Success Metrics
- Users can open multiple traces with single action
- Reduced clicks for multi-trace debugging sessions

---

## GitHub Actions Artifact Support

**Priority:** P2 (Medium)
**Effort:** L (Large, >3 days)
**Status:** Proposed

### Problem Statement
Many teams have migrated from CircleCI to GitHub Actions. These users cannot use FxTrace to view their Playwright traces.

### Proposed Solution
Extend FxTrace to support GitHub Actions artifact URLs in addition to CircleCI.

### Requirements
- [ ] Detect GitHub Actions artifact URLs
- [ ] Parse workflow run ID and artifact info from URL
- [ ] Integrate with GitHub API to list/fetch artifacts
- [ ] Handle GitHub's artifact download format (zip containing files)
- [ ] Support both public repos and authenticated access
- [ ] Update UI to indicate supported platforms

### Technical Notes
- GitHub API requires different authentication (PAT vs CircleCI token)
- Artifact downloads are zipped differently than CircleCI
- May need to extract trace.zip from artifact.zip
- Consider renaming project if scope expands significantly

### Success Metrics
- GitHub Actions users can view Playwright traces
- Same UX quality as CircleCI flow

---

## URL Shortener for Sharing

**Priority:** P2 (Medium)
**Effort:** M (Medium, 1-3 days)
**Status:** Proposed

### Problem Statement
Shareable FxTrace URLs are very long (contain full CircleCI URL encoded). These are unwieldy in Slack, emails, and bug reports.

### Proposed Solution
Generate short URLs that redirect to the full FxTrace URL. Store mappings in a simple KV store.

### Requirements
- [ ] "Get Short Link" button next to Share button
- [ ] Generate unique short code (e.g., fxtrace.vercel.app/s/abc123)
- [ ] Redirect short URLs to full FxTrace URL
- [ ] Set reasonable TTL (e.g., 30 days) matching artifact expiry
- [ ] Copy short URL to clipboard with feedback

### Technical Notes
- Could use Vercel KV or similar serverless KV store
- Short codes: 6-8 alphanumeric characters
- Consider rate limiting to prevent abuse
- No need for custom short URLs (complexity not worth it)

### Success Metrics
- URLs are under 50 characters
- Short URLs work reliably within TTL period

---

## Loading Progress Indicator

**Priority:** P2 (Medium)
**Effort:** S (Small, <1 day)
**Status:** Proposed

### Problem Statement
Large trace files (50MB+) can take 10-30 seconds to validate. Users see only a spinner with no indication of progress, leading to uncertainty about whether the request is working.

### Proposed Solution
Show download progress during artifact validation using fetch streaming or Content-Length headers.

### Requirements
- [ ] Display progress percentage during HEAD/GET request
- [ ] Show file size if available from Content-Length
- [ ] Animate progress bar smoothly
- [ ] Fall back to spinner if progress unavailable
- [ ] Show "Validating..." then "Redirecting..." stages

### Technical Notes
- HEAD requests return Content-Length but no body progress
- Could do partial GET with Range header to test connectivity
- Progress API available via `response.body.getReader()`

### Success Metrics
- Users see meaningful progress for large files
- Reduced perception of slowness

---

## Browser Extension

**Priority:** P3 (Low)
**Effort:** L (Large, >3 days)
**Status:** Proposed

### Problem Statement
Users must copy CircleCI URLs, navigate to FxTrace, and paste. A browser extension could streamline this to one click directly from CircleCI.

### Proposed Solution
Create a browser extension that adds a "View in FxTrace" button to CircleCI artifact pages.

### Requirements
- [ ] Chrome extension (primary)
- [ ] Firefox extension (secondary)
- [ ] Detect CircleCI artifact pages
- [ ] Add "View Trace" button near .zip artifacts
- [ ] One-click opens FxTrace with URL pre-filled
- [ ] Optional: inject directly into CircleCI UI

### Technical Notes
- Manifest V3 for Chrome
- Content script to detect and modify CircleCI pages
- Could use declarativeContent for performance
- Consider permissions scope carefully

### Success Metrics
- One-click trace viewing from CircleCI
- Reduced context switching

---

## Extract CSS to Separate File

**Priority:** P3 (Low)
**Effort:** S (Small, <1 day)
**Status:** Proposed

### Problem Statement
All CSS is currently embedded in index.html (~450 lines). This makes the HTML file hard to navigate and prevents CSS caching independently of HTML.

### Proposed Solution
Move CSS to a separate `styles.css` file that Vite bundles and caches separately.

### Requirements
- [ ] Create `src/styles.css` with all current styles
- [ ] Import in main.ts or add link tag
- [ ] Ensure dark mode and all responsive styles work
- [ ] Verify build output is optimized
- [ ] No visual regression

### Technical Notes
- Vite handles CSS imports natively
- Could split into multiple files (base, components, themes) but likely overkill
- CSS will be hashed and cached by CDN

### Success Metrics
- Cleaner project structure
- Improved cacheability (CSS changes don't invalidate HTML cache)

---

## Direct Link Copy (Without Redirect)

**Priority:** P2 (Medium)
**Effort:** S (Small, <1 day)
**Status:** Proposed

### Problem Statement
Sometimes users want to copy a Playwright trace viewer URL to share with colleagues without actually opening the viewer. Currently they must visit the page, let it redirect, then copy from the browser.

### Proposed Solution
Add a "Copy Link" button next to each artifact that copies the full trace.playwright.dev URL directly.

### Requirements
- [ ] Add copy icon button next to each artifact item
- [ ] Copy full `trace.playwright.dev/?trace=...` URL to clipboard
- [ ] Visual feedback on copy (checkmark, "Copied!" text)
- [ ] Works alongside existing "open in new tab" behavior
- [ ] Keyboard shortcut: hold Shift + number to copy instead of open

### Technical Notes
- Reuse existing clipboard logic from share button
- URL construction already exists in click handler
- Consider tooltip showing the copied URL

### Success Metrics
- Users can share trace links without opening them
- Reduced unnecessary page loads

---

## Accessibility Improvements

**Priority:** P2 (Medium)
**Effort:** M (Medium, 1-3 days)
**Status:** Proposed

### Problem Statement
The current UI uses emoji icons which are not accessible to screen readers. There are no ARIA labels, and keyboard navigation beyond shortcuts is limited.

### Proposed Solution
Add proper accessibility support following WCAG 2.1 guidelines.

### Requirements
- [ ] Replace or supplement emoji icons with screen-reader accessible alternatives
- [ ] Add `aria-label` attributes to all interactive elements
- [ ] Add `role` attributes where semantic HTML isn't used
- [ ] Ensure focus states are clearly visible
- [ ] Add skip-to-content link
- [ ] Test with VoiceOver/NVDA
- [ ] Ensure color contrast meets AA standards

### Technical Notes
- Can use `aria-hidden="true"` on decorative emojis and add `sr-only` text
- Focus trap in shortcuts modal
- Announce dynamic content changes with `aria-live`

### Success Metrics
- Lighthouse accessibility score > 90
- Usable with screen reader
- All interactive elements keyboard accessible

---

## Favorites / Pinned Traces

**Priority:** P3 (Low)
**Effort:** S (Small, <1 day)
**Status:** Proposed

### Problem Statement
Power users often revisit the same traces repeatedly (e.g., a flaky test they're debugging). Recent URLs help, but they get pushed out by newer activity.

### Proposed Solution
Add ability to "star" or pin specific traces/jobs for quick access.

### Requirements
- [ ] Add star/pin button on artifact items and recent URLs
- [ ] Separate "Favorites" section that persists above Recent
- [ ] Favorites stored in localStorage
- [ ] Limit to 10-15 favorites
- [ ] Ability to unstar/remove favorites
- [ ] Favorites survive Recent URL clearing

### Technical Notes
- Separate localStorage key from recent URLs
- Could add optional labels/notes to favorites
- Consider drag-to-reorder

### Success Metrics
- Frequently accessed traces are one-click away
- User can maintain a curated list of important traces

---

## Mobile-Optimized View

**Priority:** P3 (Low)
**Effort:** M (Medium, 1-3 days)
**Status:** Proposed

### Problem Statement
Current UI is designed for desktop. On mobile devices, the layout may be cramped and touch targets too small.

### Proposed Solution
Add responsive CSS and touch-friendly interactions for mobile users.

### Requirements
- [ ] Responsive layout that works on phone screens (< 480px)
- [ ] Touch-friendly button sizes (min 44px tap targets)
- [ ] Collapsible sections on mobile
- [ ] Test on iOS Safari and Android Chrome
- [ ] Consider swipe gestures for artifact list

### Technical Notes
- CSS media queries for breakpoints
- Existing Vite setup handles responsive CSS
- Test with Chrome DevTools device emulation

### Success Metrics
- Usable on phone without zooming
- All functionality accessible on mobile
- No horizontal scrolling required

---

## Completed Items

### Recent URLs History (Completed 2026-01-20)

**Priority:** P1 (High) | **Effort:** S (Small)

Implemented localStorage-based recent URLs with:
- [x] Store last 8 URLs in localStorage with timestamps
- [x] Display "Recent" section below the URL input when history exists
- [x] Show job name/project extracted from URL for readability
- [x] Allow clearing individual items or entire history
- [x] Clicking a recent URL auto-submits it

---

### Search and Filter Artifacts (Completed 2026-01-20)

**Priority:** P1 (High) | **Effort:** S (Small)

Implemented real-time search filtering:
- [x] Add search input above artifact list (only visible when artifacts shown)
- [x] Filter artifacts as user types (debounced, 150ms)
- [x] Match against test name, suite path, and tags
- [x] Show "No matches" message when filter yields no results
- [x] Dynamic count updates ("3 of 10 traces")

---

### Private Repository Support (Completed 2026-01-20)

**Priority:** P1 (High) | **Effort:** M (Medium)

Implemented CircleCI token support:
- [x] Add "Private Repo" toggle/section in UI
- [x] Secure token input field (type=password)
- [x] Store token in localStorage (user's device only)
- [x] Pass token via Circle-Token header in API requests
- [x] Clear instructions with link to CircleCI token page
- [x] "Clear" button to remove stored credentials
- [x] Status indicator showing token state

---

### Keyboard Shortcuts (Completed 2026-01-23)

**Priority:** P2 (Medium) | **Effort:** S (Small)

Implemented keyboard navigation for power users:
- [x] `/` focuses the URL input field
- [x] `Escape` clears input and resets view
- [x] `1-9` keys select artifact by position when list is shown
- [x] `?` or `Cmd/Ctrl + /` shows keyboard shortcuts help overlay
- [x] Visual hint in footer: "Press ? for keyboard shortcuts"
- [x] Shortcuts disabled when typing in input fields
- [x] Full dark mode support for overlay
