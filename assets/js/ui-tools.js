// The Tools menu and its dialogs. Every result is built with DOM nodes and text, never parsed as HTML.
import { copyWithFeedback } from './announce.js';
import { INTEGRATION_BY_ID } from './integrations.js';
import { CUSTOM_KINDS, sanitizeState } from './state.js';
import { importPolicy, explainViolation } from './parse.js';
import { scanBlade } from './blade-scan.js';
import { encodeShare, decodeHash, bookmarkletSource, describeShared } from './share.js';
import { resourcesFromDocument, proposeConfig, gradeHeaders, inertHtml } from './discover.js';
import { headerValue } from './formats.js';
import { track } from './analytics.js';
import { $, $$, el } from './dom.js';

const KIND_LABELS = { script: 'Scripts', style: 'Styles', img: 'Images', font: 'Fonts', frame: 'Frames', connect: 'Connections', media: 'Media', form: 'Form targets' };
const BLADE_LABELS = { 'inline-script': '<script> without nonce', 'inline-style': '<style> without nonce', handler: 'on* handler', 'style-attr': 'style="" attribute', 'js-url': 'javascript: URL' };

let opener = null;

function open(name, from) {
  const dialog = $(`#tool-${name}`);
  opener = from ?? opener ?? document.activeElement;
  dialog.showModal();
  track('open_tool', { tool: name });
  return dialog;
}

function message(container, text, cls = 'tool-msg') {
  container.replaceChildren(el('p', { class: cls }, text));
}

const integrationName = id => INTEGRATION_BY_ID[id]?.name ?? id;

// Merges a proposal into the config: integrations are added, custom hosts appended, nothing else changes.
function mergeProposal(store, integrations, custom) {
  store.update(s => Object.assign(s, sanitizeState({
    ...s,
    integrations: [...s.integrations, ...integrations],
    custom: Object.fromEntries(CUSTOM_KINDS.map(k => [k, [...s.custom[k], ...(custom[k] ?? [])]])),
  })));
}

// A checklist of proposed integrations and hosts with one apply button. Used by discovery and site scans.
function renderProposal(container, proposal, page, applyAction, onApply) {
  const hosts = CUSTOM_KINDS.filter(k => proposal.custom[k].length);
  const intro = page ? el('p', { class: 'tool-msg' }, 'Found on ', el('strong', {}, page), '.') : null;
  const ints = proposal.integrations.length
    ? el('fieldset', { class: 'tool-fieldset' }, el('legend', {}, 'Services'),
      ...proposal.integrations.map(id => el('label', { class: 'tool-check' },
        el('input', { type: 'checkbox', checked: true, dataset: { int: id } }), integrationName(id))))
    : el('p', { class: 'tool-msg' }, 'No known services found.');
  const custom = hosts.length
    ? el('fieldset', { class: 'tool-fieldset' }, el('legend', {}, 'Other hosts'),
      ...hosts.flatMap(k => proposal.custom[k].map(url => el('label', { class: 'tool-check' },
        el('input', { type: 'checkbox', checked: true, dataset: { kind: k, url } }), el('code', {}, url), ` ${KIND_LABELS[k]}`))))
    : null;
  const extra = [
    proposal.sameOrigin ? el('p', { class: 'tool-note' }, `${proposal.sameOrigin} same-origin resource${proposal.sameOrigin === 1 ? '' : 's'} already covered by 'self'.`) : null,
    proposal.unsorted?.length ? el('p', { class: 'tool-note' }, `Not sure where these belong: ${proposal.unsorted.join(' ')}`) : null,
    proposal.inline ? el('p', { class: 'tool-note' }, `${proposal.inline.scripts} inline script${proposal.inline.scripts === 1 ? '' : 's'} and ${proposal.inline.styles} inline style${proposal.inline.styles === 1 ? '' : 's'} without a nonce. Use Find inline code on your templates.`) : null,
  ];
  const apply = el('button', { type: 'button', class: 'cbtn cbtn-primary', dataset: { action: applyAction } }, 'Use these sources');
  apply.addEventListener('click', () => {
    const integrations = $$('input[data-int]', container).filter(i => i.checked).map(i => i.dataset.int);
    const picked = Object.fromEntries(CUSTOM_KINDS.map(k => [k, []]));
    $$('input[data-kind]', container).filter(i => i.checked).forEach(i => picked[i.dataset.kind].push(i.dataset.url));
    onApply(integrations, picked);
  });
  container.replaceChildren(...[intro, ints, custom, ...extra, el('div', { class: 'tool-actions' }, apply)].filter(Boolean));
}

async function postScan(url) {
  let res;
  try {
    // The server stops after 5 seconds, but a slow DNS answer can hold it longer; never leave the user waiting.
    res = await fetch('/scan.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(15000) });
  } catch (e) {
    console.warn('Scan request failed', e);
    return { ok: false, error: e.name === 'TimeoutError' ? 'The scan took too long. Try again in a moment.' : 'Could not reach the scanner. Check your connection.' };
  }
  try {
    return await res.json();
  } catch (e) {
    console.warn('Scan response was not JSON', e);
    return { ok: false, error: `The scanner answered with HTTP ${res.status}.` };
  }
}

export function initTools(store) {
  const toolsBtn = $('[data-action="tools"]');
  toolsBtn.addEventListener('click', () => open('menu', toolsBtn));
  $$('[data-tool]').forEach(b => b.addEventListener('click', () => {
    $('#tool-menu').close();
    open(b.dataset.tool, toolsBtn);
  }));
  $$('.tool-dialog').forEach(d => {
    d.addEventListener('close', () => {
      // Moving from the menu to a tool must not steal focus back.
      if (!$$('.tool-dialog').some(x => x.open)) opener?.focus();
    });
    // A click on the backdrop lands on the dialog element itself.
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
  });

  // ── Import ──
  let imported = null;
  $('[data-action="import-read"]').addEventListener('click', () => {
    const result = $('#import-result');
    imported = importPolicy($('#import-text').value);
    const hosts = CUSTOM_KINDS.filter(k => imported.custom[k].length);
    if (!imported.matched.length && !hosts.length && !imported.unknown.length) {
      message(result, 'No policy found. Paste the header value, the full header line, or the <meta> tag.');
      imported = null;
      return;
    }
    const apply = el('button', { type: 'button', class: 'cbtn cbtn-primary', dataset: { action: 'import-apply' } }, 'Use this config');
    result.replaceChildren(
      el('p', { class: 'tool-msg' }, imported.matched.length ? `Services: ${imported.matched.map(integrationName).join(', ')}.` : 'No known services.'),
      hosts.length ? el('ul', { class: 'tool-list-plain' }, ...hosts.map(k => el('li', {}, `${KIND_LABELS[k]}: `, el('code', {}, imported.custom[k].join(' '))))) : null,
      imported.unknown.length ? el('div', { class: 'tool-warn' }, el('p', {}, 'Not modelled here, so not carried over. Keep these in mind:'),
        el('ul', {}, ...imported.unknown.map(u => el('li', {}, el('code', {}, `${u.directive} ${u.sources.join(' ')}`.trim()))))) : null,
      ...imported.notes.map(n => el('p', { class: 'tool-note' }, n)),
      el('p', { class: 'tool-note' }, `Mode: ${imported.state.reportOnly ? 'report-only' : 'enforced'}, reporting ${imported.state.reporting ? 'on' : 'off'}.`),
      el('div', { class: 'tool-actions' }, apply),
    );
    apply.addEventListener('click', () => {
      const s = imported.state;
      store.update(st => Object.assign(st, sanitizeState({ ...st, integrations: s.integrations, custom: s.custom, reportOnly: s.reportOnly, reporting: s.reporting, inlineStyleAttrs: s.inlineStyleAttrs })));
      track('import_policy', { services: s.integrations.length });
      $('#tool-import').close();
    });
  });

  // ── Explain ──
  $('[data-action="explain"]').addEventListener('click', () => {
    const result = $('#explain-result');
    const r = explainViolation($('#explain-text').value, store.state);
    if (!r.ok) { message(result, r.error); return; }
    const fix = r.fix;
    const parts = [
      el('p', { class: 'tool-msg' }, r.plain),
      el('dl', { class: 'tool-facts' },
        el('dt', {}, 'Directive'), el('dd', {}, el('code', {}, r.directive)),
        el('dt', {}, 'Blocked'), el('dd', {}, el('code', {}, r.blocked || '(none)'))),
    ];
    if (fix.advice) parts.push(el('p', { class: 'tool-note' }, fix.advice));
    if (fix.type === 'integration' || fix.type === 'custom') {
      const label = fix.type === 'integration' ? `Turn on ${integrationName(fix.id)}` : `Allow ${fix.value} in ${KIND_LABELS[fix.kind].toLowerCase()}`;
      const btn = el('button', { type: 'button', class: 'cbtn cbtn-primary', dataset: { action: 'explain-fix' } }, label);
      btn.addEventListener('click', () => {
        if (fix.type === 'integration') mergeProposal(store, [fix.id], {});
        else mergeProposal(store, [], { [fix.kind]: [fix.value] });
        message(result, 'Done. The output now allows it.');
        track('explain_fix', { type: fix.type });
      });
      parts.push(el('div', { class: 'tool-actions' }, btn));
    }
    result.replaceChildren(...parts);
  });

  // ── Blade scanner ──
  let findings = [];
  const renderFindings = () => {
    const result = $('#blade-result');
    $('[data-action="blade-copy"]').hidden = !findings.length;
    if (!findings.length) { message(result, 'Nothing found. Every inline script and style carries a nonce.'); return; }
    result.replaceChildren(
      el('p', { class: 'tool-msg' }, `${findings.length} item${findings.length === 1 ? '' : 's'} to fix.`),
      el('div', { class: 'tool-table-wrap' }, el('table', { class: 'tool-table' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Where'), el('th', {}, 'What'), el('th', {}, 'Fix'))),
        el('tbody', {}, ...findings.map(f => el('tr', { class: 'finding' },
          el('td', {}, `${f.file}:${f.line}`),
          el('td', {}, BLADE_LABELS[f.kind], el('code', { class: 'tool-snippet' }, f.snippet)),
          el('td', {}, f.fix)))))));
  };
  $('[data-action="blade-scan"]').addEventListener('click', async () => {
    findings = [];
    const text = $('#blade-text').value;
    if (text.trim()) findings.push(...scanBlade(text, 'pasted'));
    for (const file of $('#blade-files').files) {
      try {
        findings.push(...scanBlade(await file.text(), file.name));
      } catch (e) {
        console.warn(`Could not read ${file.name}`, e);
        findings.push({ file: file.name, line: 0, kind: 'handler', snippet: '', fix: 'This file could not be read.' });
      }
    }
    renderFindings();
    track('blade_scan', { findings: findings.length });
  });
  $('[data-action="blade-copy"]').addEventListener('click', e => {
    const md = ['| Where | What | Snippet | Fix |', '|---|---|---|---|',
      ...findings.map(f => `| ${f.file}:${f.line} | ${BLADE_LABELS[f.kind]} | \`${f.snippet.replace(/[|`]/g, ' ')}\` | ${f.fix} |`)].join('\n');
    copyWithFeedback(e.currentTarget, md, 'Findings');
  });

  // ── Bookmarklet ──
  const link = $('#bookmarklet-link');
  link.href = bookmarkletSource(location.origin);
  link.addEventListener('click', e => {
    e.preventDefault();
    $('#bookmarklet-msg').textContent = 'Drag this link to your bookmarks bar, then click the bookmark on your own site.';
  });

  // ── Share ──
  $('[data-tool="share"]').addEventListener('click', () => {
    $('#share-url').value = `${location.origin}/#${encodeShare(store.state)}`;
  });
  $('[data-action="share-copy"]').addEventListener('click', e => {
    copyWithFeedback(e.currentTarget, $('#share-url').value, 'Link').then(ok => { if (ok) track('share_link'); });
  });

  // ── Scan and header check (need the network) ──
  const syncOnline = () => {
    $$('[data-offline-note]').forEach(n => { n.hidden = navigator.onLine; });
    $$('[data-action="scan"], [data-action="check-headers"]').forEach(b => { b.disabled = !navigator.onLine; });
  };
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);
  syncOnline();

  const runScan = async (input, button, result, onResult) => {
    const url = input.value.trim();
    if (!url) { message(result, 'Enter the URL of a page on your site.'); return; }
    button.disabled = true;
    message(result, 'Fetching…');
    const data = await postScan(url);
    button.disabled = !navigator.onLine;
    if (!data.ok) { message(result, data.error ?? 'The scan failed.', 'tool-msg tool-error'); return; }
    onResult(data);
  };
  const summary = data => el('p', { class: 'tool-msg' }, `HTTP ${data.status} from `, el('code', {}, data.finalUrl),
    data.redirects.length ? ` after ${data.redirects.length} redirect${data.redirects.length === 1 ? '' : 's'}` : '',
    data.truncated ? ' (page cut at 1 MB)' : '', '.');

  $('[data-action="scan"]').addEventListener('click', e => {
    const result = $('#scan-result');
    runScan($('#scan-url'), e.currentTarget, result, data => {
      // DOMParser builds an inert document: no scripts run and nothing is fetched.
      const doc = new DOMParser().parseFromString(inertHtml(data.html), 'text/html');
      const { resources, inline } = resourcesFromDocument(doc, data.finalUrl);
      const proposal = { ...proposeConfig(resources, new URL(data.finalUrl).origin), inline };
      const box = el('div');
      result.replaceChildren(summary(data), box);
      renderProposal(box, proposal, null, 'scan-apply', (ints, custom) => {
        mergeProposal(store, ints, custom);
        message(result, 'Added. The page only shows what loads without interaction, so also try the bookmarklet.');
      });
      track('scan_site');
    });
  });

  $('[data-action="check-headers"]').addEventListener('click', e => {
    const result = $('#headers-result');
    runScan($('#headers-url'), e.currentTarget, result, data => {
      const grades = gradeHeaders(data.headers, headerValue(store.state, 'production'));
      result.replaceChildren(summary(data), el('ul', { class: 'grade-list' },
        ...grades.map(g => el('li', { class: `grade-item grade-item-${g.level}` }, el('span', { class: 'grade-badge' }, g.level === 'ok' ? 'OK' : g.level === 'warn' ? 'Check' : 'Fix'), g.text))));
      track('check_headers');
    });
  });

  // ── Links that carry data in the hash ──
  const hash = decodeHash(location.hash);
  if (hash.type === 'none') return;
  history.replaceState(null, '', location.pathname + location.search);
  if (hash.type === 'error') {
    message($('#shared-result'), hash.error, 'tool-msg tool-error');
    $('[data-action="load-shared"]').hidden = true;
    open('shared', toolsBtn);
  } else if (hash.type === 'config') {
    $('#shared-result').replaceChildren(
      el('p', { class: 'tool-msg' }, 'This replaces your current settings. Check what the link changes, because anyone can make one:'),
      el('ul', { class: 'tool-list-plain shared-changes' }, ...describeShared(hash.state).map(line => el('li', {}, line))));
    $('[data-action="load-shared"]').addEventListener('click', () => {
      store.update(s => Object.assign(s, hash.state));
      track('load_shared');
      $('#tool-shared').close();
    }, { once: true });
    open('shared', toolsBtn);
  } else if (hash.type === 'discover') {
    const proposal = proposeConfig(hash.resources, hash.page);
    renderProposal($('#discover-result'), proposal, hash.page, 'discover-apply', (ints, custom) => {
      mergeProposal(store, ints, custom);
      $('#tool-discover').close();
    });
    open('discover', toolsBtn);
  }
}
