// The output panel: five tabs rendered from pure modules. Every value from state goes through escapeHtml.
import { buildDirectives, headerName, headerBytes, sizeLevel, scorePolicy, grade, SIZE_CLASS, SIZE_WARN, SIZE_OVER, REPORT_GROUP, REPORT_PATH } from './policy.js';
import * as F from './formats.js';
import { checklistItems, summaryMarkdown, CHECKLIST_KEY } from './checklist.js';
import { escapeHtml, highlightDirectives } from './highlight.js';
import { initTooltips } from './tooltip.js';
import { withTransition } from './motion.js';
import { sourceDiff, removedNote } from './diff.js';
import { copyWithFeedback } from './announce.js';
import { iconSvg } from './icons.js';
import { track, clarityTag } from './analytics.js';
import { $, $$, markNew } from './dom.js';
import { OUTPUT_TABS as TABS } from './shortcuts.js';

let tab = 'header';
let env = 'production';
let lastGrade = '';
let lastChecklist = null;
// The policy of the shown environment before the last change, so the Header tab can show what changed.
let previous = null;
// A secret token for the nginx sub_filter placeholder, fresh per visit. Letters and digits only.
const NGINX_TOKEN = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join('');
// Plain text behind every Copy and Download button, keyed by block id, so copies never pick up markup.
const texts = new Map();

function loadChecked() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch (e) {
    console.warn('Ignoring unreadable checklist state', e);
    return {};
  }
}

function saveChecked(checked) {
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checked));
  } catch (e) {
    console.warn('Could not save the checklist', e);
  }
}

// ── Building blocks ─────────────────────────────────────────────────────────
function copyButton(id, what) {
  return `<button type="button" class="cbtn cbtn-copy" data-copy="${id}" data-copy-what="${escapeHtml(what)}"><span class="cbtn-icon">${iconSvg('copy')}</span><span class="cbtn-label">Copy</span></button>`;
}

function codeBlock(id, title, text, download) {
  texts.set(id, text);
  const dl = download ? `<button type="button" class="cbtn" data-download="${id}" data-filename="${escapeHtml(download)}">Download</button>` : '';
  return `
    <div class="code-block">
      <div class="code-hdr">
        <span class="code-title">${escapeHtml(title)}</span>
        <div class="code-actions">${copyButton(id, title)}${dl}</div>
      </div>
      <pre id="pre-${id}">${escapeHtml(text)}</pre>
    </div>`;
}

function envSwitch() {
  const btn = (value, label) => `<button type="button" role="radio" data-env="${value}" aria-checked="${env === value}">${label}</button>`;
  return `<div class="out-toolbar"><div class="seg" role="radiogroup" aria-label="Environment">${btn('production', 'Production')}${btn('local', 'Local')}</div></div>`;
}

const bar = (cls, pct, extra = '') => `<div class="score-track ${extra}"><div class="score-fill ${cls}" data-width="${pct}"></div></div>`;

function callout(level, html) {
  return `<p class="callout callout-${level}">${html}</p>`;
}

// ── Tabs ────────────────────────────────────────────────────────────────────
// `diff` is what the last change did; renders that no change caused (tab or environment switch) pass none.
function renderHeader(s, diff) {
  const dirs = buildDirectives(s, env);
  const note = diff ? removedNote(diff.removed) : '';
  const { score, deductions } = scorePolicy(s, env === 'production' ? dirs : undefined);
  const g = grade(score);
  const bytes = headerBytes(s, env, dirs);
  const level = sizeLevel(bytes);
  const sizeCls = SIZE_CLASS[level];
  const name = headerName(s);
  const value = F.headerValue(s, env, dirs);
  texts.set('hdr', value);
  const reportingLine = `${REPORT_GROUP}="${REPORT_PATH}"`;
  if (s.reporting) texts.set('rep', reportingLine);

  const sizeNote = level === 'over'
    ? `Above ${SIZE_OVER} bytes many servers and proxies reject the response. Drop integrations you do not use or collapse hosts into wildcards.`
    : level === 'warn' || s.hosting.includes('nginxProxy')
      ? `nginx's default <code>proxy_buffer_size</code> is 4 KB (nginx-proxy-manager uses it too). Above that it returns 502: raise the buffer or trim the policy.`
      : '';

  const warnings = [
    s.fullPageCache ? callout('warn', 'Full-page cache is on: cached pages would reuse one nonce for every visitor. Use the <code>ReplaceCachedCspNonce</code> middleware from the Laravel tab.') : '',
    s.hosting.includes('hostinger') ? callout('warn', "Hostinger's CDN can add its own <code>content-security-policy</code> header. Browsers enforce every CSP header they get, so check the live response.") : '',
    env === 'local' ? callout('info', 'Local output: never deploy this one. It allows the Vite dev server and skips <code>upgrade-insecure-requests</code>.') : '',
  ].join('');

  const why = dirs.filter(d => d.sources.length).map(d => `
      <h4>${escapeHtml(d.name)}</h4>
      <ul>${d.sources.map(src => `<li><code>${escapeHtml(src)}</code>: ${escapeHtml(d.reasons[src].join('; '))}</li>`).join('')}</ul>`).join('');

  return `
    ${envSwitch()}
    <div class="score-row">
      <span class="score-label">Policy strength (production)</span>
      <span class="score-chip ${g.cls}">${g.label} · ${score}/100</span>
    </div>
    ${bar(g.cls, score)}
    <div id="deductions" class="deductions"${deductions.length ? '' : ' hidden'}>
      <p class="deductions-title">What lowered the score</p>
      <ul>${deductions.map(d => `<li><span>${escapeHtml(d.label)}</span><span class="deductions-pts">-${d.points}</span></li>`).join('')}</ul>
    </div>
    <div id="size-meter" class="size-meter" data-level="${level}">
      <div class="score-row">
        <span class="score-label">Header size</span>
        <span class="score-chip ${sizeCls}">${bytes.toLocaleString('en')} bytes</span>
      </div>
      ${bar(sizeCls, Math.min(100, Math.round(bytes / SIZE_OVER * 100)))}
      ${sizeNote ? `<p class="size-note">${sizeNote}</p>` : ''}
    </div>
    ${warnings}
    <div class="code-block">
      <div class="code-hdr">
        <span class="code-title">${escapeHtml(name)}</span>
        <div class="code-actions">${copyButton('hdr', name)}</div>
      </div>
      <pre id="pre-hdr">${highlightDirectives(dirs, diff?.added)}</pre>
    </div>
    ${note ? `<p class="change-note">${escapeHtml(note)}</p>` : ''}
    ${s.reporting ? `
    <div class="code-block">
      <div class="code-hdr">
        <span class="code-title">Reporting-Endpoints</span>
        <div class="code-actions">${copyButton('rep', 'Reporting-Endpoints')}</div>
      </div>
      <pre id="pre-rep" aria-label="Reporting-Endpoints: ${escapeHtml(reportingLine)}"><span class="sk">Reporting-Endpoints:</span> <span class="sv">${escapeHtml(reportingLine)}</span></pre>
    </div>` : ''}
    <details class="why">
      <summary>Why each source</summary>
      ${why}
    </details>`;
}

function renderLaravel(s) {
  return [
    codeBlock('mw', 'app/Http/Middleware/SecureHeadersMiddleware.php', F.laravelMiddleware(s), 'SecureHeadersMiddleware.php'),
    codeBlock('boot', 'bootstrap/app.php', F.laravelBootstrap(s)),
    codeBlock('blade', 'Blade', F.bladeSnippets(s)),
    ...(s.reporting ? [
      codeBlock('route', 'routes/web.php', F.reportRoute()),
      codeBlock('ctrl', 'app/Http/Controllers/CspReportController.php', F.reportController(), 'CspReportController.php'),
    ] : []),
    codeBlock('pest', 'tests/Feature/SecurityHeadersTest.php', F.pestTest(s), 'SecurityHeadersTest.php'),
    ...(s.fullPageCache ? [codeBlock('nonce', 'app/Http/Middleware/ReplaceCachedCspNonce.php', F.nonceReplacementMiddleware(), 'ReplaceCachedCspNonce.php')] : []),
  ].join('');
}

function renderFormats(s) {
  return envSwitch() + [
    codeBlock('spatie', 'spatie/laravel-csp preset', F.spatiePreset(s), 'AppCspPreset.php'),
    codeBlock('nginx', 'nginx', F.nginxConfig(s, env, NGINX_TOKEN)),
    codeBlock('apache', 'Apache', F.apacheConfig(s, env)),
    codeBlock('meta', '<meta> tag (Blade)', F.metaTag(s, env)),
  ].join('');
}

// Backticks in checklist text mark code. Everything is escaped first.
const withCode = text => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');

function renderChecklist(s) {
  const items = checklistItems(s);
  const checked = loadChecked();
  const done = items.filter(i => checked[i.id]).length;
  const cls = done === items.length ? 'grade-ready' : 'grade-partial';
  return `
    <div class="score-row">
      <span class="score-label">Readiness</span>
      <span class="score-chip ${cls}">${done}/${items.length} done</span>
    </div>
    ${bar(cls, Math.round(done / items.length * 100), 'score-track--chk')}
    <ul class="chk-list">
      ${items.map(i => `
      <li class="chk-row chk-${i.level}">
        <input type="checkbox" id="chk-${escapeHtml(i.id)}" data-check-id="${escapeHtml(i.id)}"${checked[i.id] ? ' checked' : ''}>
        <label class="chk-text" for="chk-${escapeHtml(i.id)}">${withCode(i.text)}</label>
      </li>`).join('')}
    </ul>`;
}

function renderSummary(s) {
  const md = summaryMarkdown(s);
  return `
    <div class="rollout">
      <label>Report-only from <input class="text-inp" type="date" id="rollout-from" value="${escapeHtml(s.rollout.reportOnlyFrom)}"></label>
      <label>Enforced from <input class="text-inp" type="date" id="rollout-enforce" value="${escapeHtml(s.rollout.enforceFrom)}"></label>
    </div>
    ${codeBlock('summary', 'csp-summary.md', md, 'csp-summary.md')}`;
}

const RENDERERS = { header: renderHeader, laravel: renderLaravel, formats: renderFormats, checklist: renderChecklist, summary: renderSummary };

// ── Wiring ──────────────────────────────────────────────────────────────────
function copy(id, btn) {
  copyWithFeedback(btn, texts.get(id), btn.dataset.copyWhat).then(ok => { if (ok) track('copy_output', { element: id }); });
}

function download(id, name) {
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(texts.get(id));
  a.download = name;
  a.click();
  track('download_output', { file: name });
}

export function initOutput(store) {
  const body = $('#out-body');
  initTooltips(body, $('#src-tip'));

  const render = (diff = null) => {
    texts.clear();
    body.innerHTML = RENDERERS[tab](store.state, diff);
    // Widths go through the CSSOM: style="" attributes are blocked by our own style-src-attr 'none'.
    $$('[data-width]', body).forEach(el => { el.style.width = el.dataset.width + '%'; });
    // Only checklist rows that a config change added animate in, not every row on every render.
    lastChecklist = tab === 'checklist' ? markNew(lastChecklist, $$('.chk-row', body), r => $('[data-check-id]', r).dataset.checkId) : null;
  };

  const setTab = (next, focus = false) => {
    if (next === tab) {
      if (focus) $(`#tab-${next}`).focus();
      return;
    }
    withTransition(() => {
      tab = next;
      $$('.otab').forEach(t => {
        const on = t.dataset.tab === next;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      body.setAttribute('aria-labelledby', `tab-${next}`);
      render();
    });
    track('switch_tab', { tab: next });
  };

  $$('.otab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
  $('.out-tabs').addEventListener('keydown', e => {
    const focused = e.target.closest('.otab')?.dataset.tab;
    const i = TABS.indexOf(focused ?? tab);
    const next = { ArrowRight: TABS[(i + 1) % TABS.length], ArrowLeft: TABS[(i - 1 + TABS.length) % TABS.length], Home: TABS[0], End: TABS.at(-1) }[e.key];
    if (!next) return;
    e.preventDefault();
    setTab(next, true);
  });

  body.addEventListener('click', e => {
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) copy(copyBtn.dataset.copy, copyBtn);
    const dlBtn = e.target.closest('[data-download]');
    if (dlBtn) download(dlBtn.dataset.download, dlBtn.dataset.filename);
    const envBtn = e.target.closest('[data-env]');
    if (envBtn && envBtn.dataset.env !== env) {
      env = envBtn.dataset.env;
      previous = buildDirectives(store.state, env);
      render();
      track('switch_env', { env });
    }
  });
  body.addEventListener('change', e => {
    const box = e.target.closest('[data-check-id]');
    if (!box) return;
    const checked = loadChecked();
    if (box.checked) checked[box.dataset.checkId] = true;
    else delete checked[box.dataset.checkId];
    saveChecked(checked);
    render();
    $(`[data-check-id="${CSS.escape(box.dataset.checkId)}"]`, body)?.focus();
  });
  // Date inputs only refresh the summary text, so the field being edited keeps focus.
  body.addEventListener('input', e => {
    const key = { 'rollout-from': 'reportOnlyFrom', 'rollout-enforce': 'enforceFrom' }[e.target.id];
    if (!key) return;
    const value = /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : '';
    // Rollout dates are not part of the policy, so they keep the selected preset.
    store.update(st => { st.rollout[key] = value; }, store.preset);
  });

  store.onChange(() => {
    const next = buildDirectives(store.state, env);
    const diff = sourceDiff(previous, next);
    previous = next;
    const g = grade(scorePolicy(store.state, env === 'production' ? next : undefined).score).label;
    if (g !== lastGrade) {
      lastGrade = g;
      track('policy_score', { grade: g });
      clarityTag('score_grade', g);
    }
    const active = document.activeElement;
    if (tab === 'summary' && active && body.contains(active) && active.type === 'date') {
      const md = summaryMarkdown(store.state);
      texts.set('summary', md);
      $('#pre-summary', body).textContent = md;
      return;
    }
    render(diff);
  });

  return {
    setTab: next => setTab(next, true),
    // Copies the first block of the visible tab, the one a person most likely wants.
    copyActive: () => {
      const btn = $('[data-copy]', body);
      if (btn) copy(btn.dataset.copy, btn);
    },
  };
}
