# Phase 3: Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the seven browser tools from the spec (import, explain a violation, Blade scanner, discovery bookmarklet, share link, scan my site, check deployed headers) and the locked-down `scan.php` fetch endpoint behind them.

**Architecture:** Each tool's logic is a pure module covered by `node --test`: `parse.js` (import a header, explain a violation), `blade-scan.js`, `share.js` (share links and bookmarklet payloads), `discover.js` (resources to proposed config, header grading).
`ui-tools.js` opens each tool in a native `<dialog>` from one "Tools" control in the config header.
`scan.php` uses `lib/fetch-guard.php`, whose URL, IP and redirect rules are covered by the PHP test runner with an injected resolver and transport, so no test touches the network.

**Tech Stack:** PHP 8.5 with ext-curl, vanilla JS ES modules, Node 22 `node --test`, plain PHP test runner, Playwright for E2E. No npm, no composer.

**Spec:** `docs/superpowers/specs/2026-11-04-generator-overhaul-design.md` (sections "Phase 3 - tools", "The fetch endpoint (`scan.php`)", "Anti-goals").

## Global Constraints

- Zero build tooling. No em dash in copy, comments, output or commits. No commented-out code, no silent catch blocks.
- Conventional commits, no agent co-author line. `./scripts/check.sh` exits 0 before every commit.
- Our page keeps its strict CSP: no inline handlers, no `style=""`, everything from user input rendered with `textContent` or `escapeHtml`.
- Everything except "Scan my site" and "Check deployed headers" runs in the browser and works offline.
- Untrusted input (pasted headers, reports, Blade files, share hashes, bookmarklet payloads, fetched HTML) never executes and never reaches state without `sanitizeState` or the source validators.
- Fetched HTML is parsed with `DOMParser` (`text/html`), which never runs scripts, and is never inserted into our page.
- `scan.php`, verbatim from the spec:
  - POST with JSON `{url}` only, `Origin` must be the site origin, JSON responses only, `X-Content-Type-Options: nosniff`.
  - `http` and `https` only, ports 80 and 443 only, no credentials in the URL, host length capped (253).
  - Reject when any A or AAAA record is private, loopback, link-local, reserved, multicast, or an IPv4-mapped (and NAT64, 6to4, Teredo) equivalent.
  - Connect to the validated IP via `CURLOPT_RESOLVE`; follow at most 3 redirects manually, validating every hop.
  - GET only, 5 second total timeout, 1 MB body cap enforced while streaming, no cookies, fixed user agent `CSP-Generator-Scanner/1.0 (+https://csp-generator.shakiltech.com)`.
  - Rate limit 20 requests per hour per hashed IP. No logging of URLs or responses.
  - Returns status, final URL, redirect chain, response headers (as a list, duplicates kept), and the HTML truncated at the cap.
- Privacy copy becomes: the generator runs in your browser and nothing you configure is sent anywhere, except a URL you explicitly ask us to scan.
- Branch `phase-3-tools`, cut from `phase-2-services-and-output`. The PR targets that branch until #4 merges.

## Review Focus

1. A URL that resolves (or redirects) to a private address in any spelling: `http://127.1`, `http://0x7f000001`, `http://[::ffff:127.0.0.1]`, `http://169.254.169.254`, a public host that 302s to `http://localhost`, a host with one public and one private A record. Every one is refused. Pinned in Task 5.
2. Hostile pasted input (a header containing `<img onerror>`, a report JSON with a `javascript:` blocked-uri, a share hash with extra keys or 1 MB of data): rendered as text or dropped, never executed, never stored unsanitized. Pinned in Tasks 1, 2, 4 and the Task 9 E2E.
3. A pasted header that uses a keyword or directive the generator does not model (`'strict-dynamic'`, `sandbox`, `trusted-types`, hash sources): kept and shown to the user, never silently lost. Pinned in Task 1.
4. A slow or huge site (10 MB page, never-ending stream, 4 redirects): the scan stops at the cap or the timeout with a clear message. Pinned in Task 5 with the fake transport.
5. A Blade file with a nonce-carrying script, a JSON-LD block, and an `x-on:click` Alpine attribute: none flagged, while `onclick`, `style=""` and `javascript:` are. Pinned in Task 3.

---

### Task 1: Import an existing header

**Files:**
- Create: `assets/js/parse.js`
- Test: `tests/js/parse.test.js`

**Interfaces:**
- Consumes: `INTEGRATIONS`, `sanitizeState`, `DEFAULT_STATE`, `CUSTOM_KINDS`, `normalizeSource`.
- Produces:
  - `parsePolicy(text) -> {reportOnly: boolean, directives: [{name, sources: string[]}]}`: accepts a bare value, `Content-Security-Policy: ...`, `Content-Security-Policy-Report-Only: ...`, or a `<meta http-equiv content="...">` tag. Directive names lowercased, duplicate directives keep the first (as browsers do).
  - `importPolicy(text) -> {state, matched: string[], custom: {[kind]: string[]}, unknown: [{directive, sources}], notes: string[]}`.

Rules:
- An integration matches when every source of its `script` list (or, without one, of its first kind) appears in the matching directive, directly or through a wildcard that covers it. Matched integrations go into `state.integrations`, and every source they explain is consumed.
- Remaining host sources go to `custom` by directive (`script-src`, `script-src-elem` to script; `style-src`, `style-src-elem` to style; `img-src`, `font-src`, `frame-src` and `child-src` to frame, `connect-src`, `media-src`, `form-action`).
- `'unsafe-eval'` in script-src adds a note naming the stack options that need it; `style-src-attr 'unsafe-inline'` sets `inlineStyleAttrs`; `report-uri` or `report-to` sets `reporting`; the header name sets `reportOnly`.
- Everything else (unknown directives, `'strict-dynamic'`, hashes, `'unsafe-inline'` in script-src, `http:`, `*`) goes to `unknown`, shown to the user.
- The returned `state` always goes through `sanitizeState`.

- [ ] **Step 1: Write the failing tests**
  - `parsePolicy reads a bare value, a header line, a report-only line and a meta tag`.
  - `importPolicy round-trips the generator's own output`: for `standard` and a state with stripe, tawk, google-maps and custom hosts in every kind, `importPolicy(headerValue(state)).state` has the same `integrations`, `reportOnly`, `reporting` and `custom` as the original.
  - `a partial integration is not matched; its hosts go to custom` (only `https://js.stripe.com` in script-src).
  - `unknown directives and keywords are kept`: `sandbox allow-forms`, `trusted-types default`, `script-src 'strict-dynamic' 'sha256-abc='` all appear in `unknown`.
  - `hostile input never reaches state`: a header with `script-src https://a.com <img src=x onerror=alert(1)>` yields `custom.script` `['https://a.com']` and the rest in `unknown`.
  - `duplicate directives keep the first`.

- [ ] **Step 2:** Run `node --test tests/js/parse.test.js`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `./scripts/check.sh`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat: import an existing CSP header`.

---

### Task 2: Explain a violation

**Files:**
- Modify: `assets/js/parse.js`
- Test: `tests/js/explain.test.js`

**Interfaces:**
- Produces: `explainViolation(text, state) -> {ok: true, blocked, directive, kind, plain: string, integration: string|null, fix: Fix} | {ok: false, error: string}` where `Fix` is one of `{type: 'integration', id}`, `{type: 'custom', kind, value}`, `{type: 'inline', advice}`, `{type: 'eval', advice}`, `{type: 'noise', advice}`, `{type: 'none', advice}`.

Inputs it understands:
- Chrome console: `Refused to load the script 'https://x.com/a.js' because it violates the following Content Security Policy directive: "script-src 'self'". ...` (also `Refused to execute inline script`, `Refused to apply inline style`, `Refused to connect to`, `Refused to frame`, `Refused to evaluate a string as JavaScript`).
- Firefox console: `Content-Security-Policy: The page's settings blocked the loading of a resource (script-src-elem) at https://x.com/a.js because it violates the following directive: "script-src 'self'"` (curly or straight quotes).
- Safari console: `Refused to load https://x.com/a.js because it does not appear in the script-src directive of the Content Security Policy.`
- Report bodies: `{"csp-report": {...}}`, a Reporting API list `[{"type": "csp-violation", "body": {...}}]`, or a single body object.

Rules: the blocked URL's origin is matched against the catalog (an integration whose sources cover it in that directive's kind gives `{type: 'integration'}`); `inline` and `eval` blocked values get advice (add the nonce, or the stack option / CSP build); extension schemes give `noise`; anything else gives `{type: 'custom', kind, value: origin}`. `plain` is one or two sentences of plain English.

- [ ] **Step 1: Write the failing tests** with one fixture per input format above, asserting `directive`, `kind`, `blocked`, `fix`; plus:
  - `a Tawk.to websocket block suggests the Tawk.to integration`.
  - `an inline script block suggests the nonce, not unsafe-inline`.
  - `an extension block is noise`.
  - `a blocked host already allowed in state says the policy has since changed` (`fix.type === 'none'`).
  - `garbage gives ok: false with a helpful error`.
  - `a javascript: blocked-uri is reported as text, never as a fix value`.
- [ ] **Step 2:** Run `node --test tests/js/explain.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `./scripts/check.sh`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat: explain CSP violation messages and reports`.

---

### Task 3: Blade scanner

**Files:**
- Create: `assets/js/blade-scan.js`
- Test: `tests/js/blade-scan.test.js`

**Interfaces:**
- Produces: `scanBlade(text, file = 'template.blade.php') -> [{file, line, kind, snippet, fix}]`, `kind` in `inline-script`, `inline-style`, `handler`, `style-attr`, `js-url`. `snippet` is the trimmed source line, at most 120 characters.

Rules: a tag-level scan (regex over `<tag ...>` openings with a quoted-attribute-aware pattern, tracking line numbers):
- `<script>` without `src` and without `nonce` whose `type` is absent or a JavaScript MIME type or `module` (so `application/ld+json`, `text/template` and `importmap` with a nonce are fine).
- `<style>` without `nonce`.
- Any `on[a-z]+=` attribute (not `x-on:`, `@click`, `wire:`).
- `style=` attributes (not `:style`, `x-bind:style`).
- `href`, `src`, `action`, `formaction` values starting with `javascript:`.
- Blade comments `{{-- --}}` and HTML comments are skipped.

- [ ] **Step 1: Write the failing tests:** one fixture per kind with exact line numbers; the Review Focus 5 fixture flags nothing; a multi-line `<script\n  type="module">` reports the line where the tag starts; `{{-- <script>bad</script> --}}` is skipped; `fix` text names the nonce for scripts and styles and `addEventListener` for handlers.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `./scripts/check.sh`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat: find inline code in Blade templates`.

---

### Task 4: Share links and discovery payloads

**Files:**
- Create: `assets/js/share.js`
- Test: `tests/js/share.test.js`

**Interfaces:**
- Produces:
  - `encodeShare(state) -> string` (`c=` plus base64url of compact JSON; keys with default values omitted).
  - `decodeHash(hash) -> {type: 'config', state} | {type: 'discover', resources} | {type: 'none'} | {type: 'error', error}`. Accepts `#c=...` and `#discover=...`. Rejects hashes over 16 KB. `state` goes through `sanitizeState`; resources through `sanitizeResources`.
  - `sanitizeResources(raw) -> [{url, type}]`: at most 500 entries, `url` must normalize with `normalizeSource` or be a same-page path, `type` one of `script, style, img, font, media, frame, connect, other`.
  - `bookmarkletSource(appOrigin) -> string`: the `javascript:` URL. It reads `performance.getEntriesByType('resource')` and the `navigation` entry, maps `initiatorType` to a type, keeps unique origins, also records `securitypolicyviolation` events for 3 seconds, then opens `${appOrigin}/#discover=<payload>` in a new tab.

- [ ] **Step 1: Write the failing tests:**
  - `share round-trips the kitchen sink state`.
  - `share links stay short`: the standard preset encodes under 200 characters.
  - `decodeHash drops unknown keys and invalid values`, `rejects oversized hashes`, `returns none for an empty hash`, `returns error for bad base64 or JSON`.
  - `sanitizeResources keeps 500 at most and drops javascript: and data: URLs`.
  - `bookmarkletSource is a single-line javascript: URL under 2000 characters that parses as JavaScript` (`new Function(decodeURIComponent(src.slice(11)))` does not throw).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `./scripts/check.sh`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat: share links and discovery payloads`.

---

### Task 5: Fetch guard

**Files:**
- Create: `lib/fetch-guard.php`, `lib/rate-limit.php` (move `report_rate_limited` here as `rate_limited(string $file, string $key, int $max, int $window): bool`; `csp-report.php` uses it)
- Test: `tests/php/FetchGuardTest.php`

**Interfaces:**
- Produces:
  - `scan_url_error(string $url): ?string`: scheme, port, credentials, host length, IP-literal-in-host checks. Null when acceptable.
  - `is_public_ip(string $ip): bool`: false for IPv4 `0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.0/24, 192.0.2/24, 192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4, 255.255.255.255`, IPv6 `::, ::1, fc00::/7, fe80::/10, ff00::/8, 2001:db8::/32, 100::/64`, and for `::ffff:0:0/96`, `64:ff9b::/96`, `2002::/16` and Teredo `2001::/32` when the embedded IPv4 is not public.
  - `resolve_public_ip(string $host, callable $resolver): array{ip: ?string, error: ?string}`: `$resolver($host)` returns a list of IPs; refuses an empty list or any non-public IP; IP-literal hosts are checked directly (`inet_pton`, which also normalizes `127.1` style forms after `gethostbyname`-free parsing).
  - `guarded_fetch(string $url, callable $resolver, callable $transport): array`: loops at most 4 requests (1 + 3 redirects), validating each URL and resolving each host; `$transport(string $url, string $ip): array{status, headers: list<array{0: string, 1: string}>, body: string, truncated: bool, error: ?string}`; relative `Location` resolved against the current URL. Returns `{ok, error, status, finalUrl, redirects: list<string>, headers, html, truncated}`.
  - `curl_transport(string $url, string $ip): array`: GET, `CURLOPT_RESOLVE` pinned to `$ip`, no redirects, `CURLOPT_TIMEOUT` 5, `CURLOPT_PROTOCOLS` http and https, no cookie file, the fixed user agent, write callback that stops at 1 MB and sets `truncated`.
- The file 404s when requested directly, like the other `lib/` files.

- [ ] **Step 1: Write the failing tests** (no network):
  - Every Review Focus 1 spelling refused; `https://example.com` with a fake resolver returning `93.184.215.14` accepted.
  - `user:pass@`, `ftp:`, `:8080`, a 254-character host, an empty host refused with distinct messages.
  - Mixed records (`['93.184.215.14', '10.0.0.1']`) refused.
  - A fake transport that 302s to `http://localhost/` is stopped at the second hop; a chain of 4 redirects stops with "Too many redirects"; a relative `Location: /next` is followed on the same host.
  - The transport receives the validated IP (assert the fake was called with it).
  - `rate_limited` allows 20 then refuses the 21st within the window, and resets after it (inject time through a `$now` parameter).
- [ ] **Step 2:** `php tests/php/run.php`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `./scripts/check.sh`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat: SSRF-safe fetch guard and shared rate limiter`.

---

### Task 6: `scan.php` endpoint

**Files:**
- Create: `scan.php`
- Modify: `.htaccess` (pass-through for `scan.php`), `lib/site-headers.php` if needed
- Test: `tests/php/ScanEndpointTest.php` (drives a `handle_scan(array $server, string $body, callable $resolver, callable $transport, string $rateFile): array{status: int, body: array}` function so the endpoint logic is testable without a web server)

Rules: 405 for non-POST; 403 when `Origin` is not `request_origin()`; 415 when the content type is not JSON; 400 for bad JSON or a missing `url`; 429 when rate limited; 422 with the guard's message when refused; 502 with a short message when the fetch fails; 200 with the guard result otherwise. Always `Content-Type: application/json`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`. No logging.

- [ ] **Step 1: Write the failing tests** for each status above.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `handle_scan` in `lib/scan-endpoint.php` and a thin `scan.php` that wires real `$_SERVER`, `php://input`, `dns_get_record`-based resolver and `curl_transport`.
- [ ] **Step 4:** `./scripts/check.sh`, then a manual check against Herd: `curl -s -X POST https://csp-generator.test/scan.php -H 'Origin: https://csp-generator.test' -H 'Content-Type: application/json' -d '{"url":"https://example.com"}' | head -c 300` returns status 200 JSON, and `{"url":"http://127.0.0.1"}` returns 422.
- [ ] **Step 5:** Commit `feat: scan.php endpoint`.

---

### Task 7: Discovery and header grading

**Files:**
- Create: `assets/js/discover.js`
- Test: `tests/js/discover.test.js`

**Interfaces:**
- Produces:
  - `resourcesFromDocument(doc, baseUrl) -> [{url, type}]`: works on anything with `querySelectorAll` and `getAttribute` (a `DOMParser` document in the browser, a small fake in tests). Reads `script[src]`, `link[rel~=stylesheet][href]`, `link[rel~=preload|modulepreload][href]` (type from `as`), `img[src]`, `img[srcset]`, `source[src]`, `iframe[src]`, `video[src]`, `audio[src]`, `form[action]`, and inline `<script>`/`<style>` counts without a nonce.
  - `proposeConfig(resources, pageOrigin) -> {integrations: string[], custom: {[kind]: string[]}, sameOrigin: number}`: same matching as `importPolicy`, same-origin resources dropped (covered by `'self'`).
  - `gradeHeaders(headers: list<[name, value]>, generated: string) -> [{id, level: 'ok'|'warn'|'bad', text}]`: CSP present, duplicate CSP headers (warn, says browsers enforce both), `X-Powered-By` present (bad), `Server` with a version number (warn), HSTS present, `X-Content-Type-Options`, `Referrer-Policy`, CSP header size (via `sizeLevel`), and a per-directive diff against the generated policy (sources only live, sources only generated).

- [ ] **Step 1: Write the failing tests** with a fake document, covering each selector, srcset parsing, same-origin dropping, Stripe and GA4 recognition from their script URLs, and each `gradeHeaders` rule including duplicates (`[['content-security-policy', 'a'], ['content-security-policy', 'upgrade-insecure-requests']]`).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `./scripts/check.sh`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat: propose a config from a page and grade live headers`.

---

### Task 8: Tools UI

**Files:**
- Modify: `index.php` (Tools button in the config header, one `<dialog>` per tool), `assets/app.css`, `assets/js/ui.js` (hash handling on load)
- Create: `assets/js/ui-tools.js`
- Test: E2E `scratchpad/e2e/tools.js`

Behavior:
- A "Tools" button in the config header opens a small menu (`<dialog>` used as a sheet) listing the seven tools; each opens its own `<dialog>` with a close button, `Esc` closes, focus returns to the trigger.
- **Import:** textarea, "Read policy" shows matched integrations, custom hosts and unknown items, then "Use this config" applies it (clears the preset).
- **Explain:** textarea, shows the plain-English result and one button for the fix (toggles the integration, adds the custom host, or links to the relevant checklist advice).
- **Blade scanner:** textarea plus a file input accepting several `.blade.php` files read with `FileReader`; results table with file, line, kind, snippet (as text), fix. Copy results as Markdown.
- **Bookmarklet:** a draggable link built from `bookmarkletSource(location.origin)` with instructions; it is never clickable on our page (click handler `preventDefault` and explains to drag it).
- **Share:** read-only input with the link and a Copy button; the hash never reaches the server.
- **Scan my site:** URL input, posts to `/scan.php`, shows status, final URL, redirects, then the proposed config (via `DOMParser` and `discover.js`) with "Use these sources". Error and rate-limit messages shown inline. Offline: the button is disabled with a note.
- **Check deployed headers:** URL input, same endpoint, shows `gradeHeaders` results against the current Production policy.
- On load, `decodeHash(location.hash)`: `config` asks "Load the shared config? This replaces your current settings." in a dialog; `discover` opens the discovery result dialog with found origins grouped by type and the proposed integrations preselected. The hash is cleared with `history.replaceState` afterwards.
- Footer privacy copy updated per Global Constraints.

- [ ] **Step 1: Write the failing E2E** covering: import of the Header tab's own Standard output reproduces Standard; explaining a Chrome message for `https://js.stripe.com` offers Stripe and applying it adds it; the Blade scanner flags `onclick` on line 3 of a pasted file and renders `<img onerror>` in a snippet as text; the share link loaded in a new page reproduces the config after confirming; a `#discover=` payload with a Stripe script URL preselects Stripe; scanning `http://127.0.0.1` shows the refusal message; scanning `https://example.com` returns a result; header check of `https://example.com` lists findings; dialogs close with `Esc` and return focus; zero CSP violations and console errors.
- [ ] **Step 2:** Run `node scratchpad/e2e/tools.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `./scripts/check.sh` and all E2E scripts. Expected: pass.
- [ ] **Step 5:** Commit `feat: tools for import, violations, Blade, discovery, sharing and scanning`.

---

### Task 9: Copy, service worker and end-to-end pass

**Files:** `index.php` (features and FAQ entries for the tools), `lib/faq.php`, `README.md`, `sw.js` (`csp-v4`; never cache `scan.php`)

- [ ] **Step 1:** Update copy so every claim matches what exists, including the privacy line.
- [ ] **Step 2:** Bump the SW cache and make sure POSTs and `scan.php` bypass it.
- [ ] **Step 3:** Run every E2E script in Chromium and WebKit, light and dark, 1280, 390 and 320 px; review the screenshots of every dialog and fix anything that looks off. Run the offline script: all browser-only tools work offline, scan tools show the offline note.
- [ ] **Step 4:** Commit `docs: describe the tools and bump the offline cache`.
- [ ] **Step 5:** Open the PR against `phase-2-services-and-output` (or `main` if #4 has merged).
