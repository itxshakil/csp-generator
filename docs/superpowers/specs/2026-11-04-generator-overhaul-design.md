# CSP Generator overhaul - design

## Intent

The generator should take a Laravel developer from "our pentest flagged a missing CSP" to an enforced, working policy without getting stuck.
Today it builds a header string, but users still get stuck on the hard parts: finding out what their site loads, getting third-party services right, fixing inline code, reading violation reports, and checking the result after deploy.
The production middleware this tool came from (`SecureHeadersMiddleware` in the neurax-host app) shows that real policies are shaped by services (Stripe, GA4, Meta Pixel, chat widgets), by the header size budget, and by environment-specific sources.
The overhaul moves the generator to that model and adds browser-side tools for each sticking point.

## Goals

- Fix every correctness bug listed in Phase 1, including the site's own missing security headers.
- Configure by service, not by directive, with per-directive custom domains still available.
- Generate output that is correct, explained, and complete enough to paste and ship.
- Help users discover what their site loads, import an existing policy, understand violations, find inline code, and verify the deployed headers.
- A less cluttered, accessible, modern UI with polished micro-interactions.

## Non-goals

- No composer package (tracked in GitHub issue #2, revisited once the generator gets traction).
- No hosted violation reporting, accounts, or email reminders and alerts.
- No new stored user data. The existing PDF signup keeps storing name and email in `data/emails.csv`, and the signup form says so.
- No PHP output for frameworks other than Laravel. Framework-agnostic formats (nginx, Apache, meta tag) are in scope.
- No manual light/dark toggle. Dark mode stays automatic by design.
- No build tooling, npm, or package.json.

## Anti-goals

- The site must not ship a weaker CSP than it recommends. It dogfoods a strict nonce-based policy.
- The fetch endpoint must never become an open proxy or an SSRF vector.
- No output that silently breaks a user's app (for example Vite in local dev, or GA4 missing endpoints).
- No claims in copy that the product does not do (the feature grid currently promises a reporting pipeline that is not generated).
- No dark patterns around the PDF signup.

## Constraints

- Plain PHP 8.x on Hostinger shared hosting behind its hcdn CDN, Apache with `.htaccess`.
- Zero build step. Whatever ships is what the browser runs.
- Must work offline as a PWA for everything except the fetch-based tools.
- Hostinger's CDN adds its own `content-security-policy: upgrade-insecure-requests` header. Our policy must stay correct when intersected with it.
- GA4 and Microsoft Clarity stay on the site (they are used for product decisions). Copy must be honest about them.

## Decisions made with the user

- Generator only for now. A package comes later if there is traction (issue #2).
- Build a server-side fetch endpoint for "scan my site" and "check my deployed headers", locked down against SSRF and abuse.
- Ship in phases, starting with bug fixes.

## Architecture

Keep zero build tooling, but split the 1100-line `index.php` so the policy logic can be tested and the site can run under a strict CSP:

- `index.php`: markup, per-request nonce, security headers, JSON-LD.
- `assets/app.css`: all styles.
- `assets/js/*.js`: native ES modules loaded with `<script type="module" nonce>`.
  - `integrations.js`: the service catalog (data only).
  - `policy.js`: state to directives, header string, byte size, score. Pure functions.
  - `formats.js`: every output format. Pure functions.
  - `parse.js`: import an existing header, explain a violation, decode share links. Pure functions.
  - `blade-scan.js`: inline-code finder. Pure functions.
  - `ui.js`: DOM wiring, the only module that touches the page.
- `scan.php` plus `lib/fetch-guard.php`: the fetch endpoint and its URL and IP validation.
- Tests use only built-in runners: `node --test tests/js/` for pure modules, and `php tests/php/run.php` for the fetch guard.
- No inline event handlers anywhere (they would need `'unsafe-inline'`). All wiring uses `addEventListener`.

## Environment model (builder's call)

- Environment is an output axis, not a config option.
  One config describes the app.
  The Vite dev server origin and other local-only sources live in a "Local development" settings group (Vite host and port, Debugbar, Telescope).
- The Header tab and the Other formats tab have a Production / Local switch, defaulting to Production.
- The Laravel middleware emits both, branching on `app()->environment('local')`.
- `upgrade-insecure-requests` is emitted in production only.
- Presets are Strict, Standard, and Rollout (Standard plus report-only).
  The old Local Dev preset is removed, because local sources are now always generated alongside production.
- The score grades the production policy only, so there is no "local dev on" deduction.
- Saved state from the old version (localStorage key `csp-state`) is migrated once: old `local: true` maps to nothing, old toggles map to the matching integrations, old custom tags map to the advanced custom domains.

## Browser support (builder's call)

- Baseline: current Chrome, Edge, Firefox and Safari.
- Every Phase 4 feature is progressive enhancement and must degrade to a working, readable page.
- Source reasons are never reachable only through a tooltip.
  The Header tab also has an expandable "Why each source" list that works without popovers or anchor positioning.
- Tooltips use the Popover API, with anchor positioning where supported and a simple fixed placement below the trigger otherwise.
- The manual end-to-end pass covers Chrome and Safari, and Firefox for Phase 4.

## Phase 1 - bug fixes and site headers

1. `index.php` sends its own headers on every request: a strict nonce-based CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` plus `frame-ancestors 'none'`, and removes `X-Powered-By`.
   The policy allows only what the page uses: self, GA4 and Clarity endpoints, and Google Fonts (until self-hosted).
   It uses `report-to` with a `Reporting-Endpoints` header plus `report-uri` pointing to a small `csp-report.php` that logs to `data/csp-reports.log` (gitignored, size capped, rate limited).
2. The local policy adds the Vite dev server origin to `script-src`, `style-src` and `connect-src` (`ws:` and `wss:`), with a configurable host and port (default `localhost:5173`, Herd users can enter `https://app.test:5173`).
   Phase 1 ships this inside the current UI as a Vite host field shown when Local development is on. The full environment model lands in Phase 2.
3. GA4 adds `https://www.googletagmanager.com` to script-src, and `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` to connect-src and img-src.
4. Tawk.to adds the full source set from neurax-host (script, style, font, img, media, frame, connect including `wss://*.tawk.to`).
5. `style-src-attr` becomes a choice: `'none'` (default, strictest) or `'unsafe-inline'`, with an explanation that many widgets (PayPal, Tawk, Stripe) set style attributes.
6. Tag values are escaped for the context they render in. No string-built `onclick` attributes. Values restored from storage go through the same validation as typed values.
7. The visible FAQ and the FAQ JSON-LD are generated from one PHP array so they cannot drift.
8. README repository links point to `itxshakil/csp-generator`.
9. Privacy copy reads: the generator runs in your browser, nothing you configure is sent anywhere, except a URL you explicitly ask us to scan. Anonymous usage stats via GA4 and Clarity. Generated output and tag inputs carry `data-clarity-mask`.
10. Feature grid copy only lists what is generated.

## Phase 2 - service-based config and better output

### Config panel

- A search box and a categorized list of integrations: Payments, Analytics and ads, Chat and support, Maps and media, Realtime, CDNs and fonts, Bot protection, Error tracking.
- Initial catalog, each entry listing every directive it needs, with a one-line reason per source:
  Stripe, PayPal, Google Analytics 4, Google Tag Manager, Google Ads, Meta Pixel, Microsoft UET and Clarity, Hotjar, Plausible, Fathom, Tawk.to, Crisp, Intercom, Google Maps, YouTube, Vimeo, Google Fonts, Bunny Fonts, jsDelivr, cdnjs, unpkg, reCAPTCHA, Cloudflare Turnstile, hCaptcha, Sentry, Laravel Reverb or Pusher.
- Selected integrations show as chips at the top of the list.
- "Advanced" section keeps per-directive custom domains for script, style, img, font, frame, connect, media, form-action.
- Stack toggles: Vite, Livewire 3, Inertia (Ziggy `@routes(nonce:)`), Alpine (standard build needs `'unsafe-eval'`, the CSP build does not), Filament, Debugbar, Telescope, Horizon, Pulse.
  Toggles change output and checklist items, not just text.
- Hosting toggles: Cloudflare (adds `static.cloudflareinsights.com`, warns about Rocket Loader and email obfuscation), Hostinger (warns about the CDN's extra CSP header), behind nginx proxy (adds the `proxy_buffer_size` note to the size meter).
- "Full-page cache" toggle: shows the stale-nonce warning and generates the alternative (hash-based policy guidance, or a nonce-replacement middleware sketch).
- Embedding exceptions: rows of path pattern plus allowed origins, used for `frame-ancestors` and `X-Frame-Options`.
- Presets (Strict, Standard, Rollout) become a segmented control in the config header.

### Policy

- Directives added: `form-action`, `worker-src 'self' blob:` (when a service needs it), `media-src`, `manifest-src 'self'`, `report-to`.
- `style-src-elem` is emitted only when it differs from `style-src`, to save header bytes.
- `'unsafe-eval'` appears only when a selected option needs it, with the reason shown.
- Sources are deduplicated, and a wildcard host replaces the specific hosts it covers.
- Header size meter: bytes of the full header line, amber above 4 KB (nginx-proxy-manager default buffer), red above 8 KB.
- Score is rebuilt from explicit rules with a visible list of what lowered it: `'unsafe-eval'`, `'unsafe-inline'` in style-src-attr, known bypass hosts in script-src (jsDelivr, cdnjs, unpkg, `*.googleapis.com`), wildcard hosts, report-only on, reporting off.

### Output tabs

1. **Header**: the policy with score, size meter, and a list of directives where each source has its reason on hover or focus.
2. **Laravel**: environment-aware middleware with a reason comment per source, `bootstrap/app.php` registration, Blade snippets per enabled stack, report route and controller with extension-noise filtering, and a Pest test (header present, nonce differs per request, size under budget, no `'unsafe-inline'` in script-src).
3. **Other formats**: spatie/laravel-csp Policy class, nginx `add_header`, Apache `Header set`, `<meta http-equiv>` (with its limits stated: no `frame-ancestors`, no reporting).
4. **Checklist**: real checkboxes the user ticks, saved in localStorage, items driven by the config.
5. **Summary**: Markdown summary for a pentest or audit (each directive, each source and why, rollout dates the user enters), with copy and download.

The Reference tab is removed. Its content moves into the reason tooltips.

## Phase 3 - tools

All tools sit behind one "Tools" control in the config header, each opening in a native `<dialog>`.

1. **Import**: paste a CSP header. Known services are recognized and toggled on, the rest go into the advanced custom domains, and unknown directives are kept and shown.
2. **Explain a violation**: paste a browser console message or a report JSON body. The tool names the blocked resource and directive, says why in plain English, matches a known service if it can, and offers a one-click fix.
3. **Blade scanner**: paste one or more Blade files. It lists inline `<script>` and `<style>` without a nonce, `on*=` handlers, `style=""`, and `javascript:` URLs, with line numbers and a suggested fix per item. Nothing leaves the browser.
4. **Discovery bookmarklet**: a draggable link. On the user's own site it collects resource origins from `performance.getEntriesByType('resource')` and later `securitypolicyviolation` events, then opens the generator with the result in the URL hash. The generator shows the found origins, grouped by inferred directive, with matched services selected.
5. **Share link**: the config is encoded in the URL hash (never sent to a server). Decoding validates against the known schema and drops anything unknown.
6. **Scan my site** (uses `scan.php`): fetches the page HTML and headers. The browser parses the HTML with `DOMParser` (no script execution) and proposes sources, the same way Import does.
7. **Check deployed headers** (uses `scan.php`): grades the live security headers, compares the live CSP with the generated one, and flags duplicate CSP headers, a leaked `X-Powered-By` or `Server` version, missing HSTS, and header size.

## The fetch endpoint (`scan.php`)

- POST with JSON `{url}` only, `Origin` must be the site origin, JSON responses only, `X-Content-Type-Options: nosniff`.
- Accepts `http` and `https` only, ports 80 and 443 only, no credentials in the URL, host length capped.
- Resolves the host and rejects the request if any A or AAAA record is private, loopback, link-local, reserved, multicast, or IPv4-mapped equivalents.
- Connects to the validated IP via `CURLOPT_RESOLVE` so DNS rebinding cannot swap the address after the check.
- Follows at most 3 redirects manually, validating every hop again.
- GET only, 5 second total timeout, 1 MB body cap enforced while streaming, no cookies sent or stored, fixed generic user agent naming the tool.
- Rate limit per hashed IP (default 20 requests per hour), using the same file-lock pattern as `save-email.php`.
- Does not log URLs or responses.
- Returns status, final URL, the redirect chain, response headers, and the HTML (truncated at the cap).
- `.htaccess` keeps `lib/` and `data/` unreachable over HTTP.
  The live host ignores the current `.htaccess` header rules, so the blocking is verified against production after deploy, and `lib/` files also exit immediately when requested directly.

## Phase 4 - UI and micro-interactions

- Shorter hero (one line plus subline). The hero tags and the "Free Tool" pill are removed.
- Presets move into the config header. The PDF signup moves below the features.
- Emoji icons replaced with inline SVG.
- FAQ uses `<details name="faq">` with `interpolate-size: allow-keywords` for animated height.
- Tooltips use the Popover API with CSS anchor positioning, open on hover, focus and tap.
- Output tab and preset changes use same-document View Transitions, skipped under `prefers-reduced-motion`.
- Colors use `light-dark()` with `color-scheme: light dark`.
- Added tags and checklist rows animate in with `@starting-style`.
- Toggles are `role="switch"` with `aria-checked`. Tabs follow the ARIA tablist pattern with arrow keys. Section headers are buttons with `aria-expanded`.
- Sources added or removed by the last change briefly highlight in the output.
- Copy buttons morph to a check icon and announce through an `aria-live` region.
- Keyboard shortcuts: `1` to `5` switch tabs, `c` copies the active output, `/` focuses integration search. Shown in a small help popover.
- Reset shows an undo toast for 6 seconds.
- On narrow screens a sticky bottom bar shows grade and size and jumps to the output.
- The signup is a real `<form>` with a text error message, the name field is removed, and a line under the button says the email is stored to send the guide and occasional CSP updates.
- Fonts are self-hosted (Inter and JetBrains Mono woff2 subsets), removing Google Fonts from the site's own CSP.
- `sw.js` cache version bumped and the new assets added to the shell.

## Testing

- `node --test tests/js/` covers policy building, formats, the score, size, import parsing, violation explaining, share-link decoding, and the Blade scanner.
- `php tests/php/run.php` covers the fetch guard: allowed and rejected URLs, private and reserved IPs including IPv6 and mapped forms, redirect re-validation.
- `php -l` on every PHP file.
- Each phase ends with a manual end-to-end pass in the browser on Herd (`csp-generator.test`), light and dark, desktop and narrow, with the browser console checked for CSP violations on our own page.

## Delivery

- One branch and one pull request per phase, with small conventional commits inside each.

## Left to the builder

- Exact visual design within the existing palette and type.
- Exact source lists per integration, verified against each vendor's current CSP documentation at build time.
- Score weights, as long as every deduction is listed for the user.
- Wording of reasons, warnings and checklist items.
