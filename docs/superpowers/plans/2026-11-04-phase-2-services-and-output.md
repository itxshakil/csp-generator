# Phase 2: Service-Based Config and Better Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-directive toggles with a catalog of integrations, stack and hosting toggles, and generate an explained, environment-aware policy in five output formats.

**Architecture:** Pure modules do all the work and are covered by `node --test`: `integrations.js` (catalog data), `sources.js` (source validation and collapsing), `state.js` (state shape, presets, sanitizing, v1 migration), `policy.js` (state plus environment to directives with reasons, size, score), `formats.js` (Laravel and other output text), `checklist.js` (checklist items and the Markdown summary).
DOM code is split into `ui.js` (boot, state, persistence), `ui-config.js` (config panel) and `ui-output.js` (output tabs).
Modules stay flat in `assets/js/` because `import_map_json()` only globs that folder.

**Tech Stack:** PHP 8.5, vanilla JS ES modules, Node 22 `node --test`, plain PHP test runner, `php -l` for generated PHP. No npm, no package.json, no composer.

**Spec:** `docs/superpowers/specs/2026-11-04-generator-overhaul-design.md` (section "Phase 2", "Environment model", "Browser support").

## Global Constraints

- Zero build tooling: no npm, package.json, composer, bundler.
- No em dash characters in copy, comments, generated output or commit messages. Use "-".
- No commented-out code. No silent catch blocks.
- Conventional commits, no agent co-author line.
- `./scripts/check.sh` exits 0 before every commit.
- Our own page keeps its strict CSP: no inline handlers, no `style=""`, widths and similar set through the CSSOM. Every value from state renders through `textContent` or `escapeHtml`.
- Environment is an output axis: one config, a Production / Local switch on the Header and Other formats tabs, default Production. The score grades production only.
- Presets: Strict, Standard, Rollout (Standard plus report-only). Local Dev preset removed.
- `'unsafe-eval'` and `style-src-attr 'unsafe-inline'` appear only when the user or a selected option needs them, always with the reason shown.
- Size meter: bytes of the full header line, amber above 4096, red above 8192.
- Source reasons are never reachable only by hover: the Header tab has an expandable "Why each source" list.
- Branch `phase-2-services-and-output`, cut from `phase-1-bug-fixes`. The PR targets `phase-1-bug-fixes` until PR #3 merges, then `main`.

## Review Focus

1. A returning visitor with v1 saved state (`{local, tawk, ga, tags:{script:[...]}}` under `csp-state`) gets an equivalent v2 config, never an empty output. Pinned in Task 2 (`migrateV1` tests).
2. Wildcard collapsing never drops a host it does not cover: different scheme, different port, the bare apex (`*.example.com` does not cover `example.com`). Pinned in Task 1.
3. User text that reaches generated PHP, nginx or Apache config (custom sources, embed path patterns, embed origins) can never break out of a string literal. Pinned in Task 2 (embed path validation) and Task 5 (`php -l` with hostile-looking but valid values).
4. Every integration selected at once: output stays well formed, size meter goes red, nothing throws. Pinned in Task 4.
5. Local-only sources (Vite, Debugbar) never appear in the production policy, and `upgrade-insecure-requests` never appears in the local one. Pinned in Task 3.

---

### Task 1: Integration catalog and source helpers

**Files:**
- Create: `assets/js/integrations.js`, `assets/js/sources.js`
- Modify: `assets/js/policy.js` (move `normalizeOrigin`, `normalizeSource`, `wsOrigin`, `MAX_TAGS` to `sources.js`, re-import)
- Test: `tests/js/integrations.test.js`, `tests/js/sources.test.js`

**Interfaces:**
- Produces in `sources.js`: `normalizeOrigin(raw) -> {value, error}`, `normalizeSource(raw) -> {value, error, warning}`, `wsOrigin(origin) -> string`, `MAX_TAGS = 50`, `collapseSources(list: string[]) -> string[]`, `covers(wildcard: string, source: string) -> boolean`.
- Produces in `integrations.js`:
  - `CATEGORIES`: ordered `[{id, label}]` with ids `payments, analytics, chat, media, realtime, cdn, bot, errors` and labels `Payments`, `Analytics and ads`, `Chat and support`, `Maps and media`, `Realtime`, `CDNs and fonts`, `Bot protection`, `Error tracking`.
  - `INTEGRATIONS`: `[{id, name, category, docs, sources: {[kind]: [[source, reason]]}, needs?: {unsafeEval?, inlineStyleAttrs?, workerBlob?}: string reasons, note?: string}]`, `kind` in `script, style, font, img, media, frame, connect, form, worker`.
  - `INTEGRATION_BY_ID`: object keyed by id.
  - `STACK`: `[{id, name, desc, localOnly?: true}]` ids `vite, livewire, inertia, alpine, alpineCsp, filament, debugbar, telescope, horizon, pulse`.
  - `HOSTING`: `[{id, name, desc}]` ids `cloudflare, hostinger, nginxProxy`.

Catalog ids and starting sources (verify each against its `docs` URL with WebFetch at build time; change sources to match the vendor, keep ids):

| id | name | category | starting sources | needs |
|---|---|---|---|---|
| stripe | Stripe | payments | script `js.stripe.com`, `*.js.stripe.com`; frame same + `hooks.stripe.com`; connect `api.stripe.com`; img `*.stripe.com` | - |
| paypal | PayPal | payments | script, frame, connect, img `*.paypal.com`; script, img `*.paypalobjects.com` | per docs |
| ga4 | Google Analytics 4 | analytics | current `SERVICE_SOURCES.ga` | - |
| gtm | Google Tag Manager | analytics | current `SERVICE_SOURCES.gtm`; note: custom JavaScript variables need `'unsafe-eval'`, custom HTML tags need the nonce | - |
| google-ads | Google Ads | analytics | script `www.googleadservices.com`, `googleads.g.doubleclick.net`, `www.google.com`; img, connect same + `td.doubleclick.net`; frame `td.doubleclick.net`; note on country `www.google.<tld>` | - |
| meta-pixel | Meta Pixel | analytics | script `connect.facebook.net`; img, connect, frame `www.facebook.com` | - |
| microsoft-uet | Microsoft Advertising (UET) | analytics | script, img, connect `bat.bing.com`; img, connect `c.bing.com` | - |
| clarity | Microsoft Clarity | analytics | script `www.clarity.ms`, `*.clarity.ms`; connect, img `*.clarity.ms`, `c.bing.com` | - |
| hotjar | Hotjar | analytics | `*.hotjar.com` in script, style, font, img, frame, connect; connect `*.hotjar.io`, `wss://*.hotjar.com` | per docs |
| plausible | Plausible | analytics | script, connect `plausible.io` | - |
| fathom | Fathom | analytics | script, img, connect `cdn.usefathom.com` | - |
| tawk | Tawk.to | chat | current `SERVICE_SOURCES.tawk` | per docs |
| crisp | Crisp | chat | script, style, font `client.crisp.chat`; img `client.crisp.chat`, `image.crisp.chat`, `storage.crisp.chat`; connect `client.relay.crisp.chat`, `wss://client.relay.crisp.chat`, `storage.crisp.chat`; media `client.crisp.chat` | per docs |
| intercom | Intercom | chat | script `widget.intercom.io`, `js.intercomcdn.com`; connect `*.intercom.io`, `wss://*.intercom.io`, `uploads.intercomcdn.com`, `uploads.intercomusercontent.com`; img `*.intercomcdn.com`, `static.intercomassets.com`, `uploads.intercomusercontent.com`; font `js.intercomcdn.com`, `fonts.intercomcdn.com`; media `js.intercomcdn.com`; frame `intercom-sheets.com`, `www.intercom-reporting.com` | per docs |
| google-maps | Google Maps | media | script, img, connect `*.googleapis.com`, `*.gstatic.com`, `*.google.com`; img `*.ggpht.com`, `*.googleusercontent.com`; frame `*.google.com`; font `fonts.gstatic.com`; style `fonts.googleapis.com` | workerBlob |
| youtube | YouTube | media | frame `www.youtube-nocookie.com`, `www.youtube.com`; img `i.ytimg.com` | - |
| vimeo | Vimeo | media | frame `player.vimeo.com`; img `i.vimeocdn.com` | - |
| pusher | Pusher or Laravel Reverb | realtime | script `js.pusher.com`; connect `*.pusher.com`, `wss://*.pusher.com`; note: Reverb on another host needs its `wss://` origin under Advanced connect-src | - |
| google-fonts | Google Fonts | cdn | current `SERVICE_SOURCES.gfonts` | - |
| bunny-fonts | Bunny Fonts | cdn | style, font `fonts.bunny.net` | - |
| jsdelivr | jsDelivr | cdn | script, style `cdn.jsdelivr.net` | - |
| cdnjs | cdnjs | cdn | current `SERVICE_SOURCES.cdnjs` | - |
| unpkg | unpkg | cdn | script, style `unpkg.com` | - |
| recaptcha | reCAPTCHA | bot | script `www.google.com`, `www.gstatic.com`; frame `www.google.com`, `recaptcha.google.com`; connect `www.google.com` | - |
| turnstile | Cloudflare Turnstile | bot | script, frame `challenges.cloudflare.com` | - |
| hcaptcha | hCaptcha | bot | `hcaptcha.com`, `*.hcaptcha.com` in script, frame, style, connect | - |
| sentry | Sentry | errors | script `js.sentry-cdn.com`, `browser.sentry-cdn.com`; connect `*.ingest.sentry.io`, `*.ingest.us.sentry.io`, `*.ingest.de.sentry.io` | workerBlob (session replay) |

All hosts are `https://`. "per docs" means set `needs.inlineStyleAttrs` only if the vendor's CSP page requires `'unsafe-inline'` for styles, and record that in the reason.

- [ ] **Step 1: Write the failing tests**

`tests/js/integrations.test.js`:
- `every integration has a unique id, a known category, a docs URL and at least one source`.
- `every source is a normalized host source or blob: or data:`: for each `[source]`, `normalizeSource(source).value === source` or `['blob:', 'data:'].includes(source)`.
- `every source has a non-empty reason without an em dash`.
- `the catalog has the 27 ids from the plan` (assert the exact id list above).
- `needs values are non-empty reasons`.

`tests/js/sources.test.js`:
- `covers matches one leftmost label of the same scheme and port`: `covers('https://*.example.com', 'https://a.example.com') === true`; false for `https://example.com`, `http://a.example.com`, `https://a.example.com:8443`, `https://a.b.example.com` is true (CSP wildcards match any depth of subdomain).
- `collapseSources drops hosts a wildcard covers and keeps order`: `collapseSources(["'self'", 'https://www.google.com', 'https://*.google.com', 'https://google.com'])` deep-equals `["'self'", 'https://*.google.com', 'https://google.com']`.
- `collapseSources deduplicates keywords and schemes`: `["'self'", "'self'", 'data:', 'data:']` gives `["'self'", 'data:']`.
- Move the existing `normalizeOrigin` and `normalizeSource` tests from `policy.test.js` here, importing from `sources.js`.

- [ ] **Step 2: Run to verify they fail**

Run: `node --test 'tests/js/*.test.js'`
Expected: FAIL, cannot find module `integrations.js` / `sources.js`.

- [ ] **Step 3: Implement `sources.js` and `integrations.js`**

`covers(w, s)`: both parse as `scheme://*.host[:port]` and `scheme://host[:port]`; true when schemes and ports are equal and `s` host ends with `'.' + wildcardHost`.
`collapseSources`: `unique`, then drop any non-wildcard host covered by a wildcard in the list.
Fill the catalog from the table after checking each vendor page, one reason per source (for example `Stripe.js`, `Payment Element iframes`, `3D Secure redirects`).

- [ ] **Step 4: Run to verify they pass**

Run: `./scripts/check.sh`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add assets/js tests/js
git commit -m "feat: add the integration catalog and source collapsing"
```

---

### Task 2: State v2, presets, sanitizing and v1 migration

**Files:**
- Create: `assets/js/state.js`
- Modify: `assets/js/policy.js` (remove `DEFAULT_STATE`, `PRESETS`, `TAG_DIRS`, `TOGGLE_KEYS`, `SERVICE_SOURCES`, `sanitizeState`)
- Test: `tests/js/state.test.js`

**Interfaces:**
- Consumes: `INTEGRATION_BY_ID`, `STACK`, `HOSTING`, `normalizeOrigin`, `normalizeSource`, `MAX_TAGS`.
- Produces:
  - `CUSTOM_KINDS = ['script', 'style', 'img', 'font', 'frame', 'connect', 'media', 'form']`
  - `DEFAULT_STATE`: `{ v: 2, integrations: [], stack: ['vite'], hosting: [], reportOnly: false, reporting: true, inlineStyleAttrs: false, fullPageCache: false, viteOrigin: 'http://localhost:5173', custom: {each CUSTOM_KIND: []}, embeds: [], rollout: { reportOnlyFrom: '', enforceFrom: '' } }`
  - `PRESETS`: `strict: {integrations: [], stack: ['vite'], reportOnly: false, reporting: true, inlineStyleAttrs: false}`, `standard: {integrations: ['google-fonts', 'ga4'], stack: ['vite'], reportOnly: false, reporting: true, inlineStyleAttrs: false}`, `rollout`: standard with `reportOnly: true`. Applying a preset also clears `custom`.
  - `PRESET_LABELS`: `{strict: 'Strict', standard: 'Standard', rollout: 'Rollout'}`
  - `MAX_EMBEDS = 10`, `normalizeEmbedPath(raw) -> {value, error}`
  - `sanitizeState(raw) -> State` (handles v2 and v1 input)
  - `migrateV1(raw) -> State`

- [ ] **Step 1: Write the failing tests**

- `sanitizeState of junk returns DEFAULT_STATE` for `null`, `[]`, `'x'`, `{v: 2, integrations: 'stripe'}`.
- `sanitizeState keeps only known integration, stack and hosting ids, deduplicated, in catalog order`.
- `sanitizeState validates custom sources and caps them at MAX_TAGS`: invalid values dropped.
- `sanitizeState validates rollout dates`: `'2026-11-04'` kept, `'tomorrow'` becomes `''`.
- `normalizeEmbedPath`: `'/widget/*'` gives `'widget/*'`; `'embed'` kept; rejects `''`, `"x'; DROP"`, `'a b'`, `'../x'`, a 101 character path. Allowed characters: `[A-Za-z0-9_./*-]`.
- `sanitizeState keeps at most MAX_EMBEDS embeds, each with a valid path and 1 to 10 https origins`; an embed with no valid origin is dropped.
- `migrateV1 maps old toggles to integrations`: `{local: true, jsdelivr: true, cdnjs: false, tawk: true, gfonts: true, ga: true, gtm: false, livewire: true, reportonly: true, reporting: false, inlineStyleAttrs: true, viteOrigin: 'https://app.test:5173', tags: {script: ['https://a.com'], connect: ['https://api.b.com']}}` gives integrations `['tawk', 'ga4', 'google-fonts', 'jsdelivr']` in catalog order, stack `['vite', 'livewire']`, `reportOnly: true`, `reporting: false`, `inlineStyleAttrs: true`, the Vite origin, and the custom tags in `custom.script` and `custom.connect`.
- `sanitizeState routes input without v: 2 through migrateV1`.

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/js/state.test.js`
Expected: FAIL, cannot find module `state.js`.

- [ ] **Step 3: Implement `state.js`**

Lists are filtered against the catalog and re-sorted into catalog order so output is stable.

- [ ] **Step 4: Run to verify they pass**

Run: `node --test tests/js/state.test.js`
Expected: PASS. (`policy.test.js` may fail until Task 3; do not commit until Task 3 Step 4.)

- [ ] **Step 5: Commit together with Task 3.**

---

### Task 3: Policy builder with environments and reasons

**Files:**
- Modify: `assets/js/policy.js`
- Test: `tests/js/policy.test.js` (rewrite)

**Interfaces:**
- Consumes: Task 1 and Task 2 exports.
- Produces:
  - `ENVS = ['production', 'local']`
  - `buildDirectives(state, env = 'production') -> [{name, sources: string[], reasons: {[source]: string[]}}]`
  - `policyString(directives) -> string` (unchanged)
  - `needsFor(state) -> {unsafeEval: string[], inlineStyleAttrs: string[], workerBlob: string[]}`: reasons, each prefixed with the option name, for example `Livewire 3: bundles Alpine, whose standard build evaluates expressions with new Function()`.
  - `skippedPaths(state) -> string[]`: `telescope*`, `horizon*`, `pulse*` for the selected dashboards.
  - `REPORT_PATH = '/csp-violation-report'`, `REPORT_GROUP = 'csp-endpoint'`

Rules:
- Order: `default-src, script-src, style-src, style-src-elem, style-src-attr, font-src, img-src, media-src, frame-src, connect-src, worker-src, manifest-src, form-action, object-src, base-uri, frame-ancestors, upgrade-insecure-requests, report-uri, report-to`.
- Base sources: script and style `'self'` + nonce; font and img `'self' data:`; media, frame, connect, manifest, form-action, base-uri `'self'`; object-src `'none'`; frame-ancestors `'none'`.
- Every source carries reasons: `'self'` "Your own origin", nonce "Inline scripts and styles you mark with the per-request nonce", each integration source its catalog reason prefixed with the integration name, custom sources "Added by you".
- Stack effects:
  - `vite`, local env only: Vite origin in script-src, style-src, connect-src, plus its `ws`/`wss` form in connect-src.
  - `livewire`, `alpine` (standard build), `filament`: `'unsafe-eval'` in script-src with the reason. `alpineCsp`: none, and it suppresses the Alpine reason.
  - `filament`: also adds `inlineStyleAttrs` need and `blob:` in img-src (file upload previews). Verify both against the Filament docs at build time.
  - `debugbar`: local only; add its needs as found in the laravel-debugbar README at build time (record the ruling).
  - `inertia`, `telescope`, `horizon`, `pulse`: no policy change (they change Laravel output and the checklist).
- Hosting `cloudflare`: `https://static.cloudflareinsights.com` in script-src, `https://cloudflareinsights.com` in connect-src.
- `style-src-attr` is `'unsafe-inline'` when `state.inlineStyleAttrs` or `needsFor(state).inlineStyleAttrs.length`, else `'none'`.
- `worker-src 'self' blob:` only when `workerBlob` needs exist.
- `media-src` only when it has more than `'self'`.
- `style-src-elem` only when its list differs from `style-src`.
- `upgrade-insecure-requests` in production only.
- Reporting on: `report-uri REPORT_PATH` and `report-to REPORT_GROUP`.
- Every source list goes through `collapseSources`.

- [ ] **Step 1: Write the failing tests (replace `policy.test.js`)**

Keep the GA4, Tawk.to and Vite tests, rewritten to the new state shape. Add:
- `strict preset production policy is exact`: `policyString(buildDirectives(preset('strict')))` equals
  `"default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'nonce-{$nonce}'; style-src-attr 'none'; font-src 'self' data:; img-src 'self' data:; frame-src 'self'; connect-src 'self'; manifest-src 'self'; form-action 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp-violation-report; report-to csp-endpoint"`.
- `local env adds Vite and drops upgrade-insecure-requests`; `production never contains the Vite origin or debugbar sources`.
- `local env without the vite stack has no Vite origin`.
- `livewire adds unsafe-eval with a reason; alpineCsp alone does not`.
- `google maps adds worker-src 'self' blob:`; `no worker-src without a worker need`.
- `an integration that needs inline style attributes sets style-src-attr 'unsafe-inline' and names itself in the reasons`.
- `custom form sources land in form-action`.
- `reasons exist for every source in every directive`.
- `a wildcard from one integration absorbs a specific host from another` (google-maps `*.google.com` absorbs recaptcha `www.google.com` in script-src).

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/js/policy.test.js`
Expected: FAIL on the new tests.

- [ ] **Step 3: Implement the rules above in `policy.js`**

- [ ] **Step 4: Run to verify they pass**

Run: `node --test 'tests/js/*.test.js'`
Expected: PASS. `ui.js` is broken until Task 7, so the page is not used until then; `./scripts/check.sh` still exits 0 because it only syntax-checks UI modules.

- [ ] **Step 5: Commit**

```bash
git add assets/js tests/js
git commit -m "feat: build the policy from integrations, stack and environment"
```

---

### Task 4: Header size and explained score

**Files:**
- Modify: `assets/js/policy.js`
- Test: `tests/js/score.test.js`

**Interfaces:**
- Produces:
  - `headerName(state) -> 'Content-Security-Policy' | 'Content-Security-Policy-Report-Only'`
  - `headerBytes(state, env = 'production') -> number`: UTF-8 bytes of `${headerName}: ${policyString(...)}`.
  - `sizeLevel(bytes) -> 'ok' | 'warn' | 'over'` (warn above 4096, over above 8192).
  - `scorePolicy(state) -> {score, deductions: [{id, label, points}]}` on the production policy; `score = max(0, 100 - sum)`.
  - `grade(n)` unchanged. Old `score(state)` removed.

Deductions: `unsafe-eval` 25 (label names what needs it); `style-attr` 10; `bypass-host` 10 per host in script-src among `https://cdn.jsdelivr.net`, `https://cdnjs.cloudflare.com`, `https://unpkg.com`, `https://*.googleapis.com`, capped at 30; `wildcard` 5 per other wildcard host in script-src, capped at 15; `report-only` 20; `no-reporting` 15.

- [ ] **Step 1: Write the failing tests**

- `strict scores 100 with no deductions`.
- `rollout deducts report-only`.
- `jsdelivr and unpkg deduct 10 each as bypass hosts`.
- `livewire deducts unsafe-eval and the label mentions Livewire`.
- `reporting off deducts 15`.
- `score never goes below 0` with every integration and stack item on, `reportOnly` and reporting off.
- `sizeLevel boundaries`: 4096 ok, 4097 warn, 8192 warn, 8193 over.
- `every integration at once yields an over-budget header without throwing`.
- `headerBytes counts multi-byte characters as bytes` (compare with `Buffer.byteLength`).

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/js/score.test.js`
Expected: FAIL, `scorePolicy` is not exported.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `./scripts/check.sh`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add assets/js tests/js
git commit -m "feat: explain the score and measure header size"
```

---

### Task 5: Output formats

**Files:**
- Create: `assets/js/formats.js`
- Test: `tests/js/formats.test.js`

**Interfaces:**
- Consumes: `buildDirectives`, `policyString`, `headerName`, `needsFor`, `skippedPaths`, `REPORT_PATH`, `REPORT_GROUP`, `INTEGRATION_BY_ID`.
- Produces (all return plain text, never HTML):
  - `laravelMiddleware(state) -> string`: full `app/Http/Middleware/SecureHeadersMiddleware.php`. Generates the nonce, calls `Vite::useCspNonce`, shares `cspNonce`, builds directives as a PHP array of arrays, one source per line with `// reason` comment, local-only sources inside `...($local ? [...] : [])`, `upgrade-insecure-requests` only when not local, skips CSP for `skippedPaths`, sets `Reporting-Endpoints` when reporting, sets `X-Frame-Options: DENY` except on embed paths, where `frame-ancestors` becomes `'self'` plus the embed origins. Also HSTS, nosniff, Referrer-Policy.
  - `laravelBootstrap() -> string`: the `bootstrap/app.php` `->withMiddleware(...)` snippet appending to the `web` group.
  - `bladeSnippets(state) -> string`: `@vite`, nonce on inline script and style, and per stack: `@livewireScriptConfig(['nonce' => $cspNonce])`, Inertia `@routes(nonce: $cspNonce)`, Alpine CSP build import.
  - `reportRoute() -> string`: `Route::post('/csp-violation-report', CspReportController::class)->middleware('throttle:30,1')->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class])->name('csp.report');`
  - `reportController() -> string`: full invokable controller; accepts `application/csp-report` and `application/reports+json` bodies, drops reports whose blocked or source URL starts with `chrome-extension:`, `moz-extension:`, `safari-web-extension:`, `safari-extension:` or `about:`, logs the rest with `Log::warning('CSP violation', ...)`, returns 204.
  - `pestTest(state) -> string`: header present, nonce differs between two requests, header under 4096 bytes, no `'unsafe-inline'` in script-src.
  - `nonceReplacementMiddleware() -> string`: emitted when `fullPageCache`; replaces a fixed placeholder nonce in cached HTML with a fresh one per response and sets the matching header.
  - `spatiePolicy(state) -> string`: a `spatie/laravel-csp` `Policy` class using `Directive::*` and `Keyword::*` constants and `addNonce`.
  - `nginxConfig(state, env) -> string`: `add_header ... always;` using `$request_id` as the nonce and `sub_filter` replacing a `CSP_NONCE` placeholder in HTML, with a comment explaining it.
  - `apacheConfig(state, env) -> string`: `Header always set ...` without the nonce source, with a comment that Apache cannot generate a per-request nonce, so inline scripts and styles must move to files.
  - `metaTag(state, env) -> string`: Blade `<meta http-equiv="Content-Security-Policy" content="... 'nonce-{{ $cspNonce }}' ...">` without `frame-ancestors`, `report-uri`, `report-to`, with a comment stating those limits.

- [ ] **Step 1: Write the failing tests**

- `generated PHP files pass php -l`: for `preset('strict')`, `preset('standard')`, and a "kitchen sink" state (every integration, stack and hosting item, custom sources in every kind including `https://*.x-y.example.com:8443`, two embeds with paths `widget/*` and `embed`, `fullPageCache: true`), write each of `laravelMiddleware`, `reportController`, `pestTest`, `nonceReplacementMiddleware`, `spatiePolicy` to a temp file and run `php -l` through `child_process.execFileSync`; assert exit 0.
- `the middleware contains each production source exactly once and local sources only inside the local branch`.
- `the middleware puts a reason comment on every source line`.
- `meta tag omits frame-ancestors and reporting`.
- `apache output contains no nonce`; `nginx output uses $request_id`.
- `report-only state uses the Report-Only header name in every format`.
- `no output contains an em dash`.

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/js/formats.test.js`
Expected: FAIL, cannot find module `formats.js`.

- [ ] **Step 3: Implement**

PHP string literals use single quotes; directive sources never contain `'` except keywords, which go through a `phpString(s)` helper that escapes `\` and `'`.

- [ ] **Step 4: Run to verify they pass**

Run: `./scripts/check.sh`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add assets/js/formats.js tests/js/formats.test.js
git commit -m "feat: generate Laravel, spatie, nginx, Apache and meta tag output"
```

---

### Task 6: Checklist and audit summary

**Files:**
- Create: `assets/js/checklist.js`
- Test: `tests/js/checklist.test.js`

**Interfaces:**
- Produces:
  - `checklistItems(state) -> [{id: string, text: string, level: 'todo' | 'warn' | 'info'}]`. `text` may contain backtick code spans; the UI renders them as `<code>` with `textContent`. Ids are stable strings (`vite-nonce`, `blade-nonce`, `livewire-nonce`, `inertia-routes`, `alpine-csp`, `filament-style`, `dashboards-skip`, `debugbar`, `cloudflare-rocket`, `cloudflare-email`, `hostinger-header`, `nginx-buffer`, `full-page-cache`, `report-route`, `report-only-window`, `enforce`, `verify-headers`, plus `integration-<id>` for integrations with a `note`).
  - `CHECKLIST_KEY = 'csp-checklist'`
  - `summaryMarkdown(state) -> string`: title, header name and mode, each production directive with each source and its reasons, the deductions, rollout dates (`reportOnlyFrom`, `enforceFrom`, `not set` when empty), and the open checklist items.

- [ ] **Step 1: Write the failing tests**

- `strict produces the core items and nothing stack-specific`.
- `each stack and hosting option adds its item` (table test over the ids above).
- `ids are unique for the kitchen sink state`.
- `summary lists every production source with its reason and the rollout dates`.
- `summary says "not set" for empty dates`.

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/js/checklist.test.js`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `./scripts/check.sh`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add assets/js/checklist.js tests/js/checklist.test.js
git commit -m "feat: config-driven checklist and audit summary"
```

---

### Task 7: Config panel

**Files:**
- Modify: `index.php` (replace the presets row and every config section), `assets/app.css`, `assets/js/ui.js`
- Create: `assets/js/ui-config.js`
- Test: `tests/php/SiteHeadersTest.php` (existing render test must stay green), E2E script in the scratchpad

**Interfaces:**
- Consumes: Tasks 1, 2, 3.
- Produces in `ui.js`: `state` (the live object), `update(mutator: (state) => void)` which mutates, sanitizes nothing (inputs are validated at entry), saves to `csp-state`, and calls the registered render callbacks; `onChange(fn)`.
- Produces in `ui-config.js`: `initConfig({state, update})`.

Markup and behavior:
- Config header: title, a segmented control (`role="radiogroup"`, three `<button role="radio" aria-checked>`: Strict, Standard, Rollout), Reset. Any manual change clears the selection.
- Sections, in order, using the existing collapsible section pattern:
  1. Integrations (open): search `<input type="search">` filtering by name and category, selected integrations as removable chips, then categories each with a heading and toggle rows. Each row shows the name and a one-line summary of the directives it touches; an integration with `needs` shows them under its name when selected.
  2. Stack: toggle rows from `STACK` minus `localOnly` items. `alpineCsp` row is shown only when `alpine` is on.
  3. Hosting: toggle rows from `HOSTING` plus "Full-page cache".
  4. Local development: Vite origin field (moved from Environment) and `debugbar`.
  5. Reporting: Report-only and Violation reporting toggles.
  6. Advanced (closed): custom domains for every `CUSTOM_KINDS` entry (existing tag input pattern, labels `script-src` ... `form-action`), "Allow inline style attributes" (shows "Required by: ..." and stays effectively on when something needs it), embedding exceptions (rows of path input plus origins tag input, add and remove buttons, validation messages via `aria-live`).
- `restore()` reads `csp-state` through `sanitizeState` (which migrates v1) and saves the result back once.
- The old `#t-local` toggle, presets row and Local Dev preset are removed.

- [ ] **Step 1: Write the failing E2E script** `scratchpad/e2e/config.js` (Playwright, Chromium and WebKit, `--ignore-certificate-errors`, `https://csp-generator.test`):
  - seeds a v1 state in localStorage, reloads, asserts the Tawk.to and GA4 chips are present and the output mentions `*.tawk.to`;
  - types `stri` in search and asserts only Stripe is visible;
  - toggles Stripe on and asserts `js.stripe.com` appears in the output;
  - clicks Rollout and asserts `aria-checked="true"` on it and `Content-Security-Policy-Report-Only` in the output;
  - adds an embed with path `../x` and asserts an error message, then `widget/*` and asserts it is accepted;
  - collects `securitypolicyviolation` events and console errors and asserts none.

- [ ] **Step 2: Run to verify it fails**

Run: `node scratchpad/e2e/config.js`
Expected: FAIL (old UI).

- [ ] **Step 3: Implement the markup, styles and `ui-config.js`**

Integration rows are built with `document.createElement` and `textContent`. Rows reuse `.trow` and `.toggle`; the segmented control gets new `.seg` styles in the existing palette.

- [ ] **Step 4: Run to verify it passes**

Run: `./scripts/check.sh && node scratchpad/e2e/config.js`
Expected: exit 0, E2E PASS in both engines.

- [ ] **Step 5: Commit**

```bash
git add index.php assets
git commit -m "feat: configure by integration, stack and hosting"
```

---

### Task 8: Output tabs

**Files:**
- Modify: `index.php` (tabs), `assets/app.css`, `assets/js/ui.js`
- Create: `assets/js/ui-output.js`

**Interfaces:**
- Consumes: Tasks 3 to 7.
- Produces: `initOutput({state, onChange})`.

Tabs: Header, Laravel, Other formats, Checklist, Summary. Reference tab removed.
- Header: Production / Local segmented switch; score chip, bar, and "What lowered the score" list from `deductions` (hidden when empty); size meter (bytes, bar, level class, the nginx proxy note when `nginxProxy`); the header line, and the `Reporting-Endpoints: csp-endpoint="/csp-violation-report"` line when reporting; warnings for `fullPageCache` and `hostinger`; a `<details>` "Why each source" list grouped by directive. In the highlighted policy each source span gets a `title` with its reasons.
- Laravel: code blocks for middleware, `bootstrap/app.php`, Blade, report route, report controller, Pest test, and the nonce replacement middleware when `fullPageCache`. Each with Copy and Download (file names: `SecureHeadersMiddleware.php`, `CspReportController.php`, `SecurityHeadersTest.php`, `ReplaceCachedCspNonce.php`).
- Other formats: the same environment switch, then spatie Policy class, nginx, Apache, meta tag, each with Copy.
- Checklist: real `<input type="checkbox">` per item, checked ids stored under `CHECKLIST_KEY`, readiness count from checked over total, `warn` items styled as warnings.
- Summary: two `<input type="date">` fields bound to `state.rollout`, the Markdown in a `<pre>`, Copy and Download (`csp-summary.md`).
- The environment switch value is UI state only (not saved), default Production.
- Text blocks render through `escapeHtml`; only `highlightPolicy` output and fixed markup use `innerHTML`.

- [ ] **Step 1: Write the failing E2E script** `scratchpad/e2e/output.js`:
  - each of the five tabs renders with no console error;
  - Local switch on the Header tab shows the Vite origin, Production does not;
  - selecting jsDelivr shows a "bypass" deduction;
  - selecting every integration turns the size meter red;
  - ticking a checklist item survives a reload;
  - Copy on the Header tab puts a string without `<` or `class=` on the clipboard (grant clipboard permissions);
  - zero `securitypolicyviolation` events.

- [ ] **Step 2: Run to verify it fails**

Run: `node scratchpad/e2e/output.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify it passes**

Run: `./scripts/check.sh && node scratchpad/e2e/config.js && node scratchpad/e2e/output.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add index.php assets
git commit -m "feat: explained header, Laravel, other formats, checklist and summary tabs"
```

---

### Task 9: Copy, service worker and end-to-end pass

**Files:**
- Modify: `index.php` (feature grid, meta descriptions, JSON-LD `featureList`), `lib/faq.php` (Vite answer no longer says "Turn on Local development above"; Livewire answer points to the Stack section), `README.md`, `sw.js` (`CACHE = 'csp-v3'`)
- Test: `tests/php/FaqTest.php` (stays green), all E2E scripts

- [ ] **Step 1: Update copy** so every claim matches what Phase 2 generates: integrations catalog, Production and Local output from one config, five output tabs, explained score, size meter. Remove claims about anything not generated.

- [ ] **Step 2: Bump the service worker cache** to `csp-v3`.

- [ ] **Step 3: Full E2E pass**

Run the Phase 1 scripts (`csp-check.js`, `offline.js`, `sw-nav.js`, `tags.js` updated to the new UI) plus `config.js` and `output.js` in Chromium and WebKit, and `shots.js` at 1280, 390 and 320 px in light and dark.
Expected: all pass, zero CSP violations, no horizontal overflow at 320 px. Review every screenshot and fix anything that looks off.

- [ ] **Step 4: Commit**

```bash
git add index.php lib/faq.php README.md sw.js
git commit -m "docs: describe the service-based generator and bump the offline cache"
```

- [ ] **Step 5: Open the PR** for `phase-2-services-and-output` against `phase-1-bug-fixes` (or `main` if PR #3 has merged), with a summary per task and the E2E results.
