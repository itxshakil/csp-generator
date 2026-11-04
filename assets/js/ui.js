// DOM wiring. The only module that touches the page.
import { DEFAULT_STATE, PRESETS, TAG_DIRS, TOGGLE_KEYS, buildDirectives, policyString, score, grade, normalizeOrigin } from './policy.js';
import { track, clarityTag } from './analytics.js';
import { escapeHtml, highlightPolicy } from './highlight.js';

const STORAGE_KEY = 'csp-state';

const S = structuredClone(DEFAULT_STATE);
let currentTab = 'header';
let currentPreset = 'strict';
let lastGrade = '';
const formStartedAt = Date.now();

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  } catch (e) {
    console.warn('Could not save settings to localStorage', e);
  }
}

// ── Toggles, presets, tags ──────────────────────────────────────────────────
function syncToggles() {
  TOGGLE_KEYS.forEach(k => $('#t-' + k)?.classList.toggle('on', Boolean(S[k])));
  syncVite();
}

function syncVite() {
  $('#vite-block').classList.toggle('is-hidden', !S.local);
  const inp = $('#vite-origin');
  if (document.activeElement !== inp) inp.value = S.viteOrigin;
}

function onViteInput(e) {
  const { value, error } = normalizeOrigin(e.target.value);
  const msg = $('#vite-msg');
  e.target.setAttribute('aria-invalid', String(Boolean(error)));
  msg.textContent = error ? `${error} Still using ${S.viteOrigin}.` : '';
  if (!value || value === S.viteOrigin) return;
  S.viteOrigin = value;
  render();
  saveState();
}

function renderTags() {
  TAG_DIRS.forEach(dir => {
    const list = $('#tags-' + dir);
    if (!list) return;
    list.replaceChildren(...S.tags[dir].map(val => {
      const chip = document.createElement('span');
      chip.className = 'dtag';
      chip.append(val);
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'dtag-x';
      x.textContent = '×';
      x.setAttribute('aria-label', `Remove ${val}`);
      x.addEventListener('click', () => removeTag(dir, val));
      chip.append(x);
      return chip;
    }));
  });
}

function markPreset(name) {
  $$('.preset').forEach(c => c.classList.toggle('active', c.dataset.preset === name));
}

function applyPreset(name) {
  currentPreset = name;
  Object.assign(S, PRESETS[name]);
  S.tags = structuredClone(DEFAULT_STATE.tags);
  syncToggles();
  renderTags();
  markPreset(name);
  render();
  saveState();
  track('select_preset', { preset: name });
  clarityTag('preset', name);
}

function toggle(key) {
  S[key] = !S[key];
  $('#t-' + key).classList.toggle('on', S[key]);
  if (key === 'local') syncVite();
  currentPreset = '';
  markPreset('');
  render();
  saveState();
  track('toggle_feature', { feature: key, enabled: S[key] });
}

function addTag(dir, raw) {
  const val = raw.trim().replace(/,$/, '');
  if (!val || val.length <= 3 || S.tags[dir].includes(val)) return;
  S.tags[dir].push(val);
  renderTags();
  render();
  saveState();
}

function removeTag(dir, val) {
  S.tags[dir] = S.tags[dir].filter(v => v !== val);
  renderTags();
  render();
  saveState();
}

function onTagKey(e) {
  const inp = e.target;
  const dir = inp.dataset.dir;
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTag(dir, inp.value);
    inp.value = '';
  } else if (e.key === 'Backspace' && !inp.value && S.tags[dir].length) {
    removeTag(dir, S.tags[dir][S.tags[dir].length - 1]);
  }
}

// ── Output ──────────────────────────────────────────────────────────────────
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));

function copyEl(id, btn) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('ok');
    setTimeout(() => { btn.textContent = original; btn.classList.remove('ok'); }, 1800);
    track('copy_output', { element: id });
  }, err => {
    btn.textContent = 'Copy failed';
    console.error('Clipboard write failed', err);
  });
}

function download(id, name) {
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(document.getElementById(id).innerText);
  a.download = name;
  a.click();
  track('download_middleware');
}

function scoreBar(cls, pct, extraClass = '') {
  return `<div class="score-track ${extraClass}"><div class="score-fill ${cls}" data-width="${pct}"></div></div>`;
}

function renderHeaderTab(dirs, pol, sc, sm, hn) {
  return `
    <div class="score-row">
      <span class="score-label">Policy strength</span>
      <span class="score-chip ${sm.cls}">${sm.label} · ${sc}/100</span>
    </div>
    ${scoreBar(sm.cls, sc)}
    <div class="code-block">
      <div class="code-hdr">
        <span class="code-title">${hn}</span>
        <div class="code-actions"><button type="button" class="cbtn" data-copy="pre-hdr">Copy</button></div>
      </div>
      <pre id="pre-hdr">${highlightPolicy(pol)}</pre>
    </div>
    <div class="code-block">
      <div class="code-hdr"><span class="code-title">Directive breakdown</span></div>
      <pre>${dirs.map(d => `<span class="sk">${pad(d.name, 24)}</span> <span class="sv">${d.sources.length ? escapeHtml(d.sources.join(' ')) : '(flag)'}</span>`).join('\n')}</pre>
    </div>`;
}

function renderPhpTab(dirs, hn) {
  const policyLines = dirs.map(d => {
    const v = d.sources.length ? `"${d.name} ${d.sources.join(' ')}"` : `'${d.name}'`;
    return `        ${escapeHtml(v)},`;
  }).join('\n');
  const php = `<span class="sc">private bool $allowReporting;</span>

<span class="sc">public function __construct()
{
    $this->allowReporting = !app()->environment(['local', 'testing']);
}</span>

public function handle(Request $request, Closure $next): Response
{
    $nonce = base64_encode(random_bytes(16));
    View::share(<span class="sn">'cspNonce'</span>, $nonce);
    Vite::useCspNonce($nonce); <span class="sc">// Don't skip this — @vite() needs it</span>

    $response = $next($request);

    $this->addContentSecurityPolicy($response, $nonce, $request);
    <span class="sc">// ... addClickjackingProtection, addStrictTransportSecurity, etc.</span>

    return $response;
}

protected function addContentSecurityPolicy(Response $response, string $nonce, Request $request): void
{
    $isLocal = app()->environment('local');

    $policy = [
${policyLines}
    ];

    $response->headers->set(<span class="sn">'${hn}'</span>, implode(<span class="sn">'; '</span>, $policy));
}`;
  return `
    <div class="code-block">
      <div class="code-hdr">
        <span class="code-title">SecureHeadersMiddleware.php</span>
        <div class="code-actions">
          <button type="button" class="cbtn" data-copy="pre-php">Copy</button>
          <button type="button" class="cbtn" data-download="pre-php" data-filename="SecureHeadersMiddleware.php">Download</button>
        </div>
      </div>
      <pre id="pre-php">${php}</pre>
    </div>
    <div class="code-block">
      <div class="code-hdr"><span class="code-title">Blade — nonce usage</span><div class="code-actions"><button type="button" class="cbtn" data-copy="pre-blade">Copy</button></div></div>
      <pre id="pre-blade">@vite(['resources/js/app.js'])  <span class="sc">{{-- nonce auto-handled --}}</span>
&lt;script nonce=<span class="sn">"{{ $cspNonce }}"</span>&gt;...&lt;/script&gt;
&lt;style  nonce=<span class="sn">"{{ $cspNonce }}"</span>&gt;...&lt;/style&gt;${S.livewire ? `
@livewireScriptConfig(['nonce' => $cspNonce])  <span class="sc">{{-- Livewire v3 --}}</span>` : ''}</pre>
    </div>`;
}

function renderChecklistTab() {
  const items = [
    { t: 'ok', tx: '<strong>Vite::useCspNonce($nonce)</strong> called before $next($request)' },
    { t: 'ok', tx: '<strong>View::share(\'cspNonce\', $nonce)</strong> in middleware' },
    { t: 'ok', tx: 'All inline <strong>&lt;script&gt;</strong> blocks have <strong>nonce="{{ $cspNonce }}"</strong>' },
    { t: 'ok', tx: 'All inline <strong>&lt;style&gt;</strong> blocks have <strong>nonce="{{ $cspNonce }}"</strong>' },
    { t: S.livewire ? 'ok' : 'info', tx: S.livewire
      ? '<strong>@livewireScripts([\'nonce\' => $cspNonce])</strong> or <strong>@livewireScriptConfig</strong> — nonce passed'
      : 'Livewire not enabled — if you add it, pass the nonce to <strong>@livewireScripts</strong>' },
    { t: 'ok', tx: '<strong>onclick=""</strong> and event handler attributes removed from templates' },
    { t: 'ok', tx: '<strong>style=""</strong> attributes replaced with CSS classes' },
    { t: S.reporting ? 'ok' : 'warn', tx: S.reporting
      ? 'Violation report route live with <strong>middleware(\'throttle:5\')</strong>'
      : 'Reporting is off — enable it to catch misconfigurations' },
    { t: !S.local ? 'ok' : 'warn', tx: S.local
      ? '<strong>Local dev mode is on</strong> — turn this off before deploying'
      : 'Production mode — localhost WebSocket not in connect-src' },
    { t: S.reportonly ? 'warn' : 'ok', tx: S.reportonly
      ? '<strong>Report-only</strong> — nothing is blocked yet. Run 1–2 weeks then enforce.'
      : 'Enforcement mode active' },
    { t: 'info', tx: 'Verify headers at <strong>securityheaders.com</strong> after deploying' },
  ];
  const done = items.filter(i => i.t === 'ok').length;
  const cls = done === items.length ? 'grade-ready' : 'grade-partial';
  return `
    <div class="score-row">
      <span class="score-label">Readiness</span>
      <span class="score-chip ${cls}">${done}/${items.length} ready</span>
    </div>
    ${scoreBar(cls, Math.round(done / items.length * 100), 'score-track--chk')}
    <div class="chk-list">
      ${items.map(i => `
      <div class="chk-row">
        <div class="chk-icon ${i.t}">${i.t === 'ok' ? '✓' : i.t === 'warn' ? '!' : '→'}</div>
        <div class="chk-text">${i.tx}</div>
      </div>`).join('')}
    </div>`;
}

function renderReferenceTab() {
  const rows = [
    ['default-src', '\'self\'', 'Fallback for any type not explicitly listed'],
    ['script-src', '\'self\' + nonce', 'JavaScript execution. No nonce = blocked.'],
    ['style-src', '\'self\' + nonce', 'CSS base fallback. Also governs @import rules.'],
    ['style-src-elem', '\'self\' + nonce', 'link rel=stylesheet tags and style blocks.'],
    ['style-src-attr', '\'none\'', 'Inline style= attributes. Always block.'],
    ['font-src', '\'self\' data:', 'Font files.'],
    ['img-src', '\'self\' data:', 'Image loading.'],
    ['frame-src', '\'self\'', 'iframe sources.'],
    ['connect-src', '\'self\'', 'fetch(), XHR, WebSockets, SSE.'],
    ['object-src', '\'none\'', 'Browser plugins. Always block.'],
    ['base-uri', '\'self\'', 'Prevents base href injection.'],
    ['frame-ancestors', '\'none\'', 'Clickjacking protection.'],
    ['upgrade-insecure-requests', '(flag)', 'Auto-upgrade HTTP to HTTPS.'],
  ];
  const links = [
    ['MDN CSP Reference', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy'],
    ['Grade your headers', 'https://securityheaders.com'],
    ['CSP Evaluator', 'https://csp-evaluator.withgoogle.com'],
    ['Violation reporting', 'https://report-uri.com'],
    ['Spatie laravel-csp', 'https://github.com/spatie/laravel-csp'],
  ];
  return `
    <div class="code-block">
      <div class="code-hdr"><span class="code-title">Directive reference</span></div>
      <table class="dir-table"><tbody>
        ${rows.map(([k, v, d]) => `<tr><td>${k}</td><td>${v}</td><td>${d}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="code-block">
      <div class="code-hdr"><span class="code-title">Useful links</span></div>
      <pre class="link-list">${links.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">↗ ${l}</a>`).join('')}</pre>
    </div>`;
}

function render() {
  const dirs = buildDirectives(S);
  const pol = policyString(dirs);
  const sc = score(S);
  const sm = grade(sc);
  if (sm.label !== lastGrade) {
    lastGrade = sm.label;
    track('policy_score', { score: sc, grade: sm.label });
    clarityTag('score_grade', sm.label);
  }
  const hn = S.reportonly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  const body = $('#out-body');

  if (currentTab === 'header') body.innerHTML = renderHeaderTab(dirs, pol, sc, sm, hn);
  else if (currentTab === 'php') body.innerHTML = renderPhpTab(dirs, hn);
  else if (currentTab === 'checklist') body.innerHTML = renderChecklistTab();
  else body.innerHTML = renderReferenceTab();

  // Widths go through the CSSOM: style="" attributes are blocked by our own style-src-attr 'none'.
  $$('[data-width]', body).forEach(el => { el.style.width = el.dataset.width + '%'; });

  const cnt = $('#count-scripts');
  if (cnt) {
    const n = ['jsdelivr', 'cdnjs', 'tawk', 'ga', 'gtm'].filter(k => S[k]).length + S.tags.script.length;
    cnt.textContent = n || '';
    cnt.classList.toggle('is-hidden', !n);
  }
}

function setTab(t) {
  currentTab = t;
  $$('.otab').forEach(el => el.classList.toggle('active', el.dataset.tab === t));
  render();
  track('switch_tab', { tab: t });
}

// ── Guide form ──────────────────────────────────────────────────────────────
async function submitGuide(btn) {
  const emailEl = $('#g-email');
  const email = emailEl.value;
  const name = $('#g-name').value || 'Friend';
  const pot = $('#g-pot').value;
  if (!email || !email.includes('@')) {
    emailEl.classList.add('is-invalid');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const res = await fetch('/save-email.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pot, ts: formStartedAt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Request failed');
  } catch (e) {
    console.error('Guide signup failed', e);
    btn.disabled = false;
    btn.textContent = 'Send me the PDF →';
    emailEl.classList.add('is-invalid');
    return;
  }
  $('#guide-form').classList.add('is-hidden');
  $('#guide-success').classList.remove('is-hidden');
  track('guide_signup');
  clarityTag('lead', 'true');
}

// ── Wiring ──────────────────────────────────────────────────────────────────
function wire() {
  $$('[data-preset]').forEach(el => el.addEventListener('click', () => applyPreset(el.dataset.preset)));
  $('[data-action="reset"]').addEventListener('click', () => applyPreset(currentPreset || 'strict'));
  $$('[data-section]').forEach(el => el.addEventListener('click', () => $('#sec-' + el.dataset.section).classList.toggle('open')));
  $$('[data-toggle]').forEach(el => el.addEventListener('click', () => toggle(el.dataset.toggle)));
  $$('.tag-wrap').forEach(w => w.addEventListener('click', () => $('.tag-inp', w).focus()));
  $$('.tag-inp').forEach(inp => inp.addEventListener('keydown', onTagKey));
  $('#vite-origin').addEventListener('input', onViteInput);
  $('#vite-origin').addEventListener('blur', e => { if (e.target.getAttribute('aria-invalid') !== 'true') e.target.value = S.viteOrigin; });
  $$('.faq-q').forEach(b => b.addEventListener('click', () => b.closest('.faq-item').classList.toggle('open')));
  $$('[data-tab]').forEach(el => el.addEventListener('click', () => setTab(el.dataset.tab)));
  $('[data-action="submit-guide"]').addEventListener('click', e => submitGuide(e.currentTarget));
  $('#out-body').addEventListener('click', e => {
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) copyEl(copyBtn.dataset.copy, copyBtn);
    const dlBtn = e.target.closest('[data-download]');
    if (dlBtn) download(dlBtn.dataset.download, dlBtn.dataset.filename);
  });
}

function restore() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn('localStorage unavailable', e);
    return false;
  }
  if (!raw) return false;
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch (e) {
    console.warn('Ignoring unreadable saved settings', e);
    return false;
  }
  Object.keys(S).forEach(k => {
    if (k === 'tags') { if (saved.tags) Object.assign(S.tags, saved.tags); }
    else if (saved[k] !== undefined) S[k] = saved[k];
  });
  currentPreset = '';
  markPreset('');
  syncToggles();
  renderTags();
  render();
  return true;
}

wire();
if (!restore()) applyPreset('strict');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker registration failed', err));
  });
}
