# Phase 1: Bug Fixes and Site Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every Phase 1 bug from the spec and make the site ship the strict CSP it recommends, after splitting `index.php` into testable plain files.

**Architecture:** `index.php` keeps markup and sends headers through `lib/site-headers.php`.
CSS moves to `assets/app.css`, JS to native ES modules in `assets/js/` (`policy.js` pure logic, `ui.js` DOM wiring, `analytics.js` GA4 and Clarity loaders).
No inline scripts, inline handlers or `style=""` attributes remain, so the site runs under `style-src-attr 'none'` and a nonce-based `script-src`.

**Tech Stack:** PHP 8.5, vanilla JS ES modules, Node 22 built-in `node --test`, plain PHP test runner. No npm, no package.json, no composer.

**Spec:** `docs/superpowers/specs/2026-11-04-generator-overhaul-design.md`

## Global Constraints

- Zero build tooling: no npm, package.json, composer, bundler.
- No em dash characters in any copy, comments, or commit messages. Use "-".
- No commented-out code. No silent catch blocks: every `catch` either handles the error visibly or rethrows.
- Commits are conventional (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), no agent co-author line.
- Check command, run before every commit: `./scripts/check.sh` (created in Task 1). It must exit 0.
- Domain: `https://csp-generator.shakiltech.com`. Local: `https://csp-generator.test` (Herd).
- Dark mode stays automatic only.
- Work on branch `phase-1-bug-fixes`, one PR at the end.

## Review Focus

1. A returning visitor's localStorage holds the old state shape, or a tag containing quotes or `<img onerror>`: the page must load, render the value as inert text or drop it, and never execute it. Pinned in Task 6 (`sanitizeState` tests) and Task 1 E2E.
2. A Vite origin typed as `localhost:5173`, `https://app.test:5173/`, or `app.test`: normalized to a scheme plus host plus port origin, with the WebSocket form derived from it (`https` to `wss`). Pinned in Task 3.
3. A custom domain typed with a path, trailing slash, `http:`, `*`, or a keyword like `'unsafe-inline'`: normalized to an origin, or rejected with a visible message, never inserted raw. Pinned in Task 6.
4. Any leftover inline handler, inline script or `style=""` in our own markup breaks the page silently under our new CSP. Pinned in Task 2 (`index.php` render test) and the E2E console check in Task 8.
5. `csp-report.php` gets junk, oversized or flooding requests: bodies over 16 KB are rejected, the log stops growing at 1 MB, per-IP rate limit applies. Pinned in Task 2.

---

### Task 1: Split index.php into plain files with no behavior change

**Files:**
- Create: `assets/app.css` (all of `index.php:43-339`)
- Create: `assets/js/policy.js`, `assets/js/ui.js`, `assets/js/analytics.js`
- Create: `scripts/check.sh`, `tests/js/policy.test.js`, `tests/php/run.php`
- Modify: `index.php` (remove `<style>`, both inline `<script>` blocks, every `onclick`/`onkeydown`/`onload` attribute, every `style="..."` attribute)

**Interfaces:**
- Produces in `assets/js/policy.js` (pure, no DOM):
  - `export const PRESETS` (same three presets as today)
  - `export const DEFAULT_STATE` (equals today's initial `S`)
  - `export function buildDirectives(state) -> Array<{name: string, sources: string[]}>` (today's `buildDirs`, renamed fields `k`->`name`, `v`->`sources`)
  - `export function policyString(directives) -> string`
  - `export function score(state) -> number` and `export function grade(n) -> {label: string, cls: string}`
- Produces in `assets/js/ui.js`: the only module touching the DOM. Wires events with `addEventListener` using `data-action`, `data-key`, `data-tab`, `data-dir` attributes.
- Produces in `assets/js/analytics.js`: `export function track(event, params)`; loads gtag and Clarity exactly as today (`G-E8LV1M7ZXS`, `wnwlwuuhc3`).
- Produces `tests/php/run.php`: requires every `tests/php/*Test.php`, each file returns `array<string, callable>`; a test fails by throwing. Prints `PASS name` / `FAIL name: message`, exits 1 on any failure.
- Produces `scripts/check.sh`: `php -l` on every `*.php` and `lib/*.php`, `node --check` on every `assets/js/*.js`, `node --test tests/js/`, `php tests/php/run.php`. `set -euo pipefail`.

- [ ] **Step 1: Write the characterization test** in `tests/js/policy.test.js`

```js
test('strict preset matches the pre-split output', () => {
  const s = {...DEFAULT_STATE, ...PRESETS.strict};
  assert.equal(policyString(buildDirectives(s)),
    "default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'nonce-{$nonce}'; style-src-elem 'self' 'nonce-{$nonce}'; style-src-attr 'none'; font-src 'self' data:; img-src 'self' data:; frame-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /api/csp-violation-report");
});
test('standard preset score and grade', () => {
  const s = {...DEFAULT_STATE, ...PRESETS.standard};
  assert.equal(score(s), 100);
  assert.deepEqual(grade(100), {label: 'A+', cls: 'grade-a'});
});
```

Before writing it, confirm both expected values by running today's `buildDirs`/`score` in the browser console on the unmodified page.

- [ ] **Step 2: Run** `node --test tests/js/` - Expected: FAIL, module not found.
- [ ] **Step 3: Create the files and move code.** `index.php` loads `<link rel="stylesheet" href="/assets/app.css">` and `<script type="module" src="/assets/js/ui.js">` (nonce added in Task 2). Replace each `style="..."` attribute with a named class in `app.css`. Replace the font `preload ... onload` trick with a plain `<link rel="stylesheet">`. Tag chips are built with `createElement` and `textContent`, never `innerHTML` with user values.
- [ ] **Step 4: Run** `./scripts/check.sh` - Expected: all PASS.
- [ ] **Step 5: E2E.** Open `https://csp-generator.test`, click every preset, toggle, tab, add and remove tags, copy, download, FAQ, signup with an invalid email. Output must match the deployed site for the same clicks. Console has no errors.
- [ ] **Step 6: Commit** `refactor: split index.php into plain CSS and ES module files`

### Task 2: Site security headers and report endpoint

**Files:**
- Create: `lib/site-headers.php`, `lib/csp-report.php`, `csp-report.php`, `tests/php/SiteHeadersTest.php`, `tests/php/CspReportTest.php`
- Modify: `index.php` (top of file), `.htaccess` (allow `csp-report.php`, deny `lib/`), `.gitignore` (`data/csp-reports.log`)

**Interfaces:**
- Produces `site_nonce(): string` (base64 of 16 random bytes).
- Produces `site_csp(string $nonce, string $origin): string`.
- Produces `send_site_headers(string $nonce, string $origin): void`: sends CSP, `Reporting-Endpoints: csp="{$origin}/csp-report.php"`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=()`, `X-Frame-Options: DENY`, and calls `header_remove('X-Powered-By')`.
- Produces `append_report(string $body, string $logPath, int $maxBodyBytes = 16384, int $maxLogBytes = 1048576): bool` (false when rejected).
- Every `lib/*.php` file starts with `if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }`.

- [ ] **Step 1: Write failing tests.** `SiteHeadersTest.php`:
  - `site_csp('abc', 'https://x')` contains `script-src 'self' 'nonce-abc'`, `style-src-attr 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self' https://csp-generator.shakiltech.com`, `frame-ancestors 'none'`, `upgrade-insecure-requests`, `report-to csp`, `report-uri /csp-report.php`, and does not contain `unsafe-inline` or `unsafe-eval`.
  - Rendering `index.php` with output buffering produces HTML with no match for `/\son[a-z]+=/i`, no `style="`, and every `<script` without `type="application/ld+json"` carries `nonce="` matching the nonce in the sent CSP header.

  `CspReportTest.php`: a 20 KB body returns false and writes nothing; a valid JSON body appends one line; once the log is at 1 MB, `append_report` returns false and the size does not change; a non-JSON body returns false.
- [ ] **Step 2: Run** `php tests/php/run.php` - Expected: FAIL.
- [ ] **Step 3: Implement.** The site policy allows exactly what the page loads: `'self'`; Google Fonts (`https://fonts.googleapis.com` in style-src, `https://fonts.gstatic.com` in font-src); GA4 (`https://www.googletagmanager.com` script; `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` connect and img); Clarity (`https://www.clarity.ms https://*.clarity.ms` script, connect, img, plus `https://c.bing.com` img). `csp-report.php` accepts POST only with content type `application/csp-report` or `application/reports+json`, applies the 30 per hour per hashed IP limit using the `save-email.php` file-lock pattern (`data/csp-rate.json`), returns 204.
- [ ] **Step 4: Run** `./scripts/check.sh` - Expected: PASS.
- [ ] **Step 5: E2E.** `curl -sI https://csp-generator.test` shows every header above and no `X-Powered-By`. The browser console on the page shows zero CSP violations with GA4 and Clarity loading. `curl -sI https://csp-generator.test/lib/site-headers.php` returns 403 or 404.
- [ ] **Step 6: Commit** `feat: send a strict CSP and security headers from the site itself`

### Task 3: Vite dev server origin in the local policy

**Files:** Modify `assets/js/policy.js`, `assets/js/ui.js`, `index.php` (Vite origin field inside the Environment section, shown only when Local development is on). Test: `tests/js/policy.test.js`.

**Interfaces:**
- Adds `state.viteOrigin: string` (default `'http://localhost:5173'`) to `DEFAULT_STATE`.
- Produces `export function normalizeOrigin(raw: string) -> {value: string|null, error: string|null}`. Missing scheme means `http://` for `localhost` and `127.0.0.1`, else `https://`. Paths, queries and trailing slashes are removed.
- Produces `export function wsOrigin(origin: string) -> string` (`http` to `ws`, `https` to `wss`).

- [ ] **Step 1: Failing tests.**
  - `normalizeOrigin('localhost:5173').value === 'http://localhost:5173'`
  - `normalizeOrigin('https://app.test:5173/').value === 'https://app.test:5173'`
  - `normalizeOrigin('app.test').value === 'https://app.test'`
  - `normalizeOrigin('not a host').error` is a non-empty string
  - With `local: true, viteOrigin: 'https://app.test:5173'`: script-src, style-src and style-src-elem include `https://app.test:5173`; connect-src includes `wss://app.test:5173` and `https://app.test:5173`; no directive contains `localhost`.
  - With `local: false`: no directive contains the Vite origin.
- [ ] **Step 2: Run** `node --test tests/js/` - Expected: FAIL.
- [ ] **Step 3: Implement** and render the field. An invalid value shows the error under the field and the last valid value stays in use.
- [ ] **Step 4: Run** `./scripts/check.sh` - Expected: PASS.
- [ ] **Step 5: Commit** `fix: allow the Vite dev server in script and style sources in local mode`

### Task 4: Complete GA4 and Tawk.to source sets

**Files:** Modify `assets/js/policy.js`. Test: `tests/js/policy.test.js`.

**Interfaces:** Produces `export const SERVICE_SOURCES = {ga: {...}, gtm: {...}, tawk: {...}, jsdelivr: {...}, cdnjs: {...}, gfonts: {...}}`, each mapping directive name to a source array. `buildDirectives` merges them for enabled toggles and deduplicates while keeping first-seen order.

- [ ] **Step 1: Failing tests.**
  - `ga: true`: script-src has `https://www.googletagmanager.com`; connect-src and img-src each have `https://*.google-analytics.com`, `https://*.analytics.google.com`, `https://*.googletagmanager.com`.
  - `tawk: true`: script-src, style-src, font-src, img-src, media-src and frame-src each have `https://*.tawk.to`; connect-src has `https://*.tawk.to` and `wss://*.tawk.to`; img-src has `https://tawk.link`.
  - `ga: true, gtm: true`: `https://www.googletagmanager.com` appears exactly once in script-src.
- [ ] **Step 2: Run** - Expected: FAIL.
- [ ] **Step 3: Implement.** Add `media-src` to the directive list only when it has sources beyond `'self'`.
- [ ] **Step 4: Run** `./scripts/check.sh` - Expected: PASS.
- [ ] **Step 5: Commit** `fix: give GA4 and Tawk.to every source they load from`

### Task 5: style-src-attr choice

**Files:** Modify `assets/js/policy.js`, `assets/js/ui.js`, `index.php` (replace the fixed "always 'none'" note in the Styles section with a toggle "Allow inline style attributes", plus a short explanation that PayPal, Tawk and Stripe widgets set `style=""`). Also fix the feature card "Strict CSS directives" copy. Test: `tests/js/policy.test.js`.

**Interfaces:** Adds `state.inlineStyleAttrs: boolean` (default `false`).

- [ ] **Step 1: Failing tests.** Default gives `style-src-attr 'none'`; `inlineStyleAttrs: true` gives `style-src-attr 'unsafe-inline'`; `score` with it on is lower than with it off.
- [ ] **Step 2: Run** - Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `./scripts/check.sh` - Expected: PASS.
- [ ] **Step 5: Commit** `feat: let users allow inline style attributes with the trade-off explained`

### Task 6: Validate custom sources and sanitize stored state

**Files:** Modify `assets/js/policy.js`, `assets/js/ui.js`. Test: `tests/js/policy.test.js`.

**Interfaces:**
- Produces `export function normalizeSource(raw: string) -> {value: string|null, error: string|null, warning: string|null}`. Accepts `https://host[:port]`, `wss://host[:port]`, `*.host` subdomain wildcards (`https://*.example.com`), and bare hosts (prefixed `https://`). Strips paths, queries and trailing slashes. Rejects quoted keywords, a lone `*`, schemes other than http, https, ws, wss, and anything with whitespace, quotes or angle brackets. `http:` and `ws:` are accepted with a warning.
- Produces `export function sanitizeState(raw: unknown) -> state`. Starts from `DEFAULT_STATE`, copies only known boolean keys whose stored values are booleans, runs every stored tag through `normalizeSource` and drops failures, and caps each tag list at 50.

- [ ] **Step 1: Failing tests.**
  - `normalizeSource('cdn.example.com/lib.js').value === 'https://cdn.example.com'`
  - `normalizeSource("'unsafe-inline'").error` is set; `normalizeSource('*').error` is set
  - `normalizeSource('http://x.com').warning` is set and `.value === 'http://x.com'`
  - `sanitizeState({ga: 'yes', tags: {script: ['<img src=x onerror=alert(1)>', "a.com'", 'ok.com']}})` gives `ga === false` and `tags.script` equal to `['https://ok.com']`
  - `sanitizeState('garbage')` and `sanitizeState(null)` equal `DEFAULT_STATE`
- [ ] **Step 2: Run** - Expected: FAIL.
- [ ] **Step 3: Implement.** `ui.js` shows `error` or `warning` as text under the tag input, announced through an `aria-live="polite"` region. Restore runs `sanitizeState` on parsed localStorage. A `JSON.parse` failure is reported with `console.warn` and falls back to the strict preset.
- [ ] **Step 4: Run** `./scripts/check.sh` - Expected: PASS.
- [ ] **Step 5: E2E.** In DevTools, set `localStorage['csp-state']` to `{"tags":{"script":["<img src=x onerror=alert(1)>"]}}` and reload: no alert, no chip, and no console errors.
- [ ] **Step 6: Commit** `fix: validate custom sources and sanitize restored state`

### Task 7: One source for FAQ content and honest copy

**Files:**
- Create: `lib/faq.php`, `tests/php/FaqTest.php`
- Modify: `index.php` (FAQ section and FAQ JSON-LD, hero sub, feature grid, footer), `README.md` (repo links, privacy wording)

**Interfaces:** Produces `faq_items(): array<array{q: string, a_html: string}>` and `faq_jsonld(array $items): string` (answer text is `a_html` with tags stripped and entities decoded).

- [ ] **Step 1: Failing test.** For every item, `faq_jsonld` contains the question and the plain-text answer; the visible FAQ rendered by `index.php` contains the same questions in the same order.
- [ ] **Step 2: Run** `php tests/php/run.php` - Expected: FAIL.
- [ ] **Step 3: Implement.** Use the visible FAQ answers as the source of truth (the JSON-LD Livewire and Vite answers are the wrong ones). Copy changes:
  - Hero and README privacy line: "Runs in your browser. Nothing you configure is sent anywhere. Anonymous usage stats via Google Analytics and Microsoft Clarity."
  - Feature card "Violation reporting included" becomes "Violation reporting ready" with body: "Adds report-uri and report-to so browsers send blocked-resource reports to your endpoint."
  - Signup privacy line: "We store your email to send the guide and occasional CSP updates. Unsubscribe any time."
  - `data-clarity-mask="true"` on the output panel and every tag input wrapper.
  - README: every `github.com/shakil/laravel-csp-generator` becomes `github.com/itxshakil/csp-generator`; remove the "nothing sent anywhere" claim in favor of the privacy line above.
- [ ] **Step 4: Run** `./scripts/check.sh` - Expected: PASS.
- [ ] **Step 5: Commit** `fix: keep FAQ and structured data in sync and make copy match the product`

### Task 8: Service worker update and end-to-end pass

**Files:** Modify `sw.js`. 

- [ ] **Step 1: Update** `CACHE` to `'csp-v2'`, add `/assets/app.css`, `/assets/js/ui.js`, `/assets/js/policy.js`, `/assets/js/analytics.js` to `SHELL`. The navigation fallback must still serve `/` offline. Never cache `csp-report.php` or `save-email.php` (POST already skipped).
- [ ] **Step 2: Run** `./scripts/check.sh` - Expected: PASS.
- [ ] **Step 3: E2E on `https://csp-generator.test`** in Chrome and Safari, light and dark, at 1280px and 390px wide:
  - Console: zero CSP violations, zero errors, with GA4 and Clarity requests succeeding.
  - Every Review Focus item reproduced by hand behaves as described.
  - Local development on with Vite origin `https://csp-generator.test:5173`: the header shows it in script-src, style-src and connect-src as `wss://`.
  - DevTools offline mode after one visit: page loads and the generator works.
  - Fix any visual defect seen along the way.
- [ ] **Step 4: Commit** `chore: cache the split assets in the service worker`
- [ ] **Step 5: Open the PR** for `phase-1-bug-fixes` with a summary of each fix and the E2E results.
