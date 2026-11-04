// The config panel. Builds its rows from the catalog and keeps them in sync with the store.
import { CATEGORIES, INTEGRATIONS, INTEGRATION_BY_ID, STACK, HOSTING } from './integrations.js';
import { CUSTOM_KINDS, MAX_EMBEDS, normalizeEmbedPath, normalizeEmbedOrigin } from './state.js';
import { normalizeOrigin, normalizeSource, MAX_TAGS } from './sources.js';
import { needsFor } from './policy.js';
import { track } from './analytics.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const KIND_LABELS = {
  script: 'script-src', style: 'style-src', img: 'img-src', font: 'font-src', frame: 'frame-src',
  connect: 'connect-src', media: 'media-src', form: 'form-action', worker: 'worker-src',
};
const KIND_PLACEHOLDERS = {
  script: 'https://cdn.example.com', style: 'https://cdn.example.com', img: 'https://images.example.com', font: 'https://fonts.example.com',
  frame: 'https://video.example.com', connect: 'https://api.example.com', media: 'https://media.example.com', form: 'https://pay.example.com',
};
const NEED_LABELS = { unsafeEval: "needs 'unsafe-eval'", inlineStyleAttrs: 'needs inline style attributes', workerBlob: 'needs blob: workers' };

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

// A labelled on/off switch row. The returned row carries `.toggle` and an optional `.trow-needs` slot.
function switchRow(cls, id, name, desc) {
  const descId = `desc-${cls}-${id}`;
  return el('div', { class: `trow ${cls}`, dataset: { id } },
    el('div', { class: 'trow-info' },
      el('div', { class: 'trow-name' }, name),
      ...(desc ? [el('div', { class: 'trow-desc', id: descId }, desc)] : []),
      el('div', { class: 'trow-needs' })),
    el('button', { type: 'button', class: 'toggle', role: 'switch', 'aria-checked': 'false', 'aria-label': name, ...(desc ? { 'aria-describedby': descId } : {}) }));
}

const setSwitch = (row, on) => {
  row.querySelector('.toggle').classList.toggle('on', on);
  row.querySelector('.toggle').setAttribute('aria-checked', String(on));
};

const integrationSummary = i => Object.keys(i.sources).map(k => KIND_LABELS[k]).join(', ');

export function initConfig(store) {
  const toggleIn = (key, id) => store.update(s => {
    s[key] = s[key].includes(id) ? s[key].filter(x => x !== id) : [...s[key], id];
  });

  // ── Integrations ──
  const list = $('#int-list');
  for (const cat of CATEGORIES) {
    const items = INTEGRATIONS.filter(i => i.category === cat.id);
    const group = el('div', { class: 'int-cat', dataset: { cat: cat.id } }, el('h3', { class: 'int-cat-title' }, cat.label));
    for (const i of items) group.append(switchRow('int-row', i.id, i.name, integrationSummary(i)));
    list.append(group);
  }
  list.addEventListener('click', e => {
    const row = e.target.closest('.int-row');
    if (!row || !e.target.closest('.toggle')) return;
    const on = !store.state.integrations.includes(row.dataset.id);
    toggleIn('integrations', row.dataset.id);
    track('toggle_integration', { integration: row.dataset.id, enabled: on });
  });

  const search = $('#int-search');
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const group of $$('.int-cat', list)) {
      const label = CATEGORIES.find(c => c.id === group.dataset.cat).label.toLowerCase();
      let groupShown = 0;
      for (const row of $$('.int-row', group)) {
        const hit = !q || INTEGRATION_BY_ID[row.dataset.id].name.toLowerCase().includes(q) || label.includes(q);
        row.hidden = !hit;
        if (hit) groupShown++;
      }
      group.hidden = groupShown === 0;
      shown += groupShown;
    }
    $('#int-empty').hidden = shown > 0;
  };
  search.addEventListener('input', filter);

  $('#int-chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip && e.target.closest('button')) toggleIn('integrations', chip.dataset.id);
  });

  // ── Stack, hosting, local, reporting ──
  const stackList = $('#stack-list');
  STACK.filter(s => !s.localOnly).forEach(s => stackList.append(switchRow('stack-row', s.id, s.name, s.desc)));
  const localList = $('#local-list');
  STACK.filter(s => s.localOnly).forEach(s => localList.append(switchRow('stack-row', s.id, s.name, s.desc)));
  const hostingList = $('#hosting-list');
  HOSTING.forEach(h => hostingList.append(switchRow('hosting-row', h.id, h.name, h.desc)));
  hostingList.append(switchRow('flag-row', 'fullPageCache', 'Full-page cache', 'Pages are cached as HTML (for example spatie/laravel-responsecache), so nonces need replacing per response'));
  const reportingList = $('#reporting-list');
  reportingList.append(
    switchRow('flag-row', 'reportOnly', 'Report-only mode', 'Reports violations without blocking anything. Run it for one to two weeks first'),
    switchRow('flag-row', 'reporting', 'Violation reporting', `Browsers send blocked-resource reports to your endpoint`));
  $('#style-attrs-row').append(switchRow('flag-row', 'inlineStyleAttrs', 'Allow inline style attributes', "Sets style-src-attr 'unsafe-inline'. Turn on only if something breaks without it"));

  document.querySelector('.config').addEventListener('click', e => {
    const toggle = e.target.closest('.toggle');
    if (!toggle) return;
    const row = toggle.closest('.trow');
    if (row.classList.contains('stack-row')) toggleIn('stack', row.dataset.id);
    else if (row.classList.contains('hosting-row')) toggleIn('hosting', row.dataset.id);
    else if (row.classList.contains('flag-row')) store.update(s => { s[row.dataset.id] = !s[row.dataset.id]; });
    else return;
    track('toggle_feature', { feature: row.dataset.id });
  });

  // ── Vite origin ──
  const vite = $('#vite-origin');
  vite.addEventListener('input', () => {
    const { value, error } = normalizeOrigin(vite.value);
    vite.setAttribute('aria-invalid', String(Boolean(error)));
    $('#vite-msg').textContent = error ? `${error} Still using ${store.state.viteOrigin}.` : '';
    if (value && value !== store.state.viteOrigin) store.update(s => { s.viteOrigin = value; });
  });
  vite.addEventListener('blur', () => { if (vite.getAttribute('aria-invalid') !== 'true') vite.value = store.state.viteOrigin; });

  // ── Custom domains ──
  const customList = $('#custom-list');
  for (const kind of CUSTOM_KINDS) {
    customList.append(el('div', { class: 'dir-block' },
      el('div', { class: 'dir-lbl' }, el('span', { class: 'dir-name' }, KIND_LABELS[kind]), el('span', { class: 'dir-hint' }, 'Enter to add')),
      el('div', { class: 'tag-wrap', 'data-clarity-mask': 'true' },
        el('div', { class: 'tags-list', id: `tags-${kind}` }),
        el('input', { class: 'tag-inp', placeholder: KIND_PLACEHOLDERS[kind], dataset: { kind }, 'aria-label': `Add a ${KIND_LABELS[kind]} host`, 'aria-describedby': `msg-${kind}`, autocomplete: 'off', spellcheck: 'false' })),
      el('p', { class: 'field-msg', id: `msg-${kind}`, 'aria-live': 'polite' })));
  }
  const showTagMessage = (kind, text, isError) => {
    const msg = $(`#msg-${kind}`);
    msg.textContent = text ?? '';
    msg.classList.toggle('is-error', Boolean(isError));
    $(`.tag-inp[data-kind="${kind}"]`).setAttribute('aria-invalid', String(Boolean(isError)));
  };
  // Returns true when the input was consumed (added, or already present).
  const addTag = (kind, raw) => {
    if (!raw.trim()) return true;
    const { value, error, warning } = normalizeSource(raw);
    if (error) { showTagMessage(kind, error, true); return false; }
    if (store.state.custom[kind].includes(value)) { showTagMessage(kind, `${value} is already in the list.`, false); return true; }
    if (store.state.custom[kind].length >= MAX_TAGS) { showTagMessage(kind, `You can add up to ${MAX_TAGS} hosts here.`, true); return false; }
    store.update(s => { s.custom[kind] = [...s.custom[kind], value]; });
    showTagMessage(kind, warning ?? (value !== raw.trim() ? `Added as ${value}.` : ''), false);
    return true;
  };
  const removeTag = (kind, value) => store.update(s => { s.custom[kind] = s.custom[kind].filter(v => v !== value); });
  customList.addEventListener('keydown', e => {
    const inp = e.target.closest('.tag-inp');
    if (!inp) return;
    const kind = inp.dataset.kind;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (addTag(kind, inp.value)) inp.value = '';
    } else if (e.key === 'Backspace' && !inp.value && store.state.custom[kind].length) {
      removeTag(kind, store.state.custom[kind].at(-1));
    }
  });
  customList.addEventListener('click', e => {
    const x = e.target.closest('.dtag-x');
    if (x) { removeTag(x.dataset.kind, x.dataset.value); return; }
    const wrap = e.target.closest('.tag-wrap');
    if (wrap) $('.tag-inp', wrap).focus();
  });

  // ── Embedding exceptions ──
  const embedMsg = (text, isError) => {
    $('#embed-msg').textContent = text;
    $('#embed-msg').classList.toggle('is-error', isError);
  };
  $('[data-action="add-embed"]').addEventListener('click', () => {
    const path = normalizeEmbedPath($('#embed-path').value);
    if (path.error) { embedMsg(path.error, true); return; }
    const parts = $('#embed-origin').value.split(/[\s,]+/).filter(Boolean);
    if (!parts.length) { embedMsg('Enter at least one site, for example https://partner.com.', true); return; }
    const origins = [];
    for (const part of parts) {
      const o = normalizeEmbedOrigin(part);
      if (o.error) { embedMsg(`${part}: ${o.error}`, true); return; }
      origins.push(o.value);
    }
    const existing = store.state.embeds.find(e => e.path === path.value);
    if (!existing && store.state.embeds.length >= MAX_EMBEDS) { embedMsg(`You can add up to ${MAX_EMBEDS} paths.`, true); return; }
    store.update(s => {
      const row = s.embeds.find(e => e.path === path.value);
      if (row) row.origins = [...new Set([...row.origins, ...origins])].slice(0, 10);
      else s.embeds.push({ path: path.value, origins: [...new Set(origins)].slice(0, 10) });
    });
    $('#embed-path').value = '';
    $('#embed-origin').value = '';
    embedMsg(existing ? `Added to ${path.value}.` : '', false);
  });
  $('#embeds-list').addEventListener('click', e => {
    const x = e.target.closest('[data-remove-embed]');
    if (x) store.update(s => { s.embeds = s.embeds.filter(row => row.path !== x.dataset.removeEmbed); });
  });

  // ── Presets, reset, sections ──
  $$('[data-preset]').forEach(b => b.addEventListener('click', () => store.applyPreset(b.dataset.preset)));
  $('[data-action="reset"]').addEventListener('click', () => store.applyPreset(store.preset || 'strict'));
  $$('[data-section]').forEach(head => head.addEventListener('click', () => {
    const open = $('#sec-' + head.dataset.section).classList.toggle('open');
    head.setAttribute('aria-expanded', String(open));
  }));

  store.onChange(() => sync(store));
}

function sync(store) {
  const s = store.state;
  const needs = needsFor(s, 'local');

  $$('.int-row').forEach(row => {
    const on = s.integrations.includes(row.dataset.id);
    setSwitch(row, on);
    const itemNeeds = INTEGRATION_BY_ID[row.dataset.id].needs ?? {};
    $('.trow-needs', row).textContent = on ? Object.keys(itemNeeds).map(k => NEED_LABELS[k]).join(' · ') : '';
  });
  $('#int-chips').replaceChildren(...s.integrations.map(id => el('span', { class: 'chip', dataset: { id } },
    INTEGRATION_BY_ID[id].name,
    el('button', { type: 'button', class: 'chip-x', 'aria-label': `Remove ${INTEGRATION_BY_ID[id].name}` }, '×'))));
  const count = $('#count-integrations');
  count.textContent = s.integrations.length || '';
  count.classList.toggle('is-hidden', !s.integrations.length);

  $$('.stack-row').forEach(row => {
    setSwitch(row, s.stack.includes(row.dataset.id));
    const itemNeeds = STACK.find(x => x.id === row.dataset.id).needs ?? {};
    const shown = s.stack.includes(row.dataset.id) && !(row.dataset.id === 'alpine' && s.stack.includes('alpineCsp'));
    $('.trow-needs', row).textContent = shown ? Object.keys(itemNeeds).map(k => NEED_LABELS[k]).join(' · ') : '';
  });
  $('.stack-row[data-id="alpineCsp"]').hidden = !s.stack.includes('alpine');
  $$('.hosting-row').forEach(row => setSwitch(row, s.hosting.includes(row.dataset.id)));
  $$('.flag-row').forEach(row => setSwitch(row, Boolean(s[row.dataset.id])));

  const required = needs.inlineStyleAttrs.map(r => r.split(':')[0]);
  $('#style-attrs-required').textContent = required.length ? `Required by ${required.join(', ')}, so style-src-attr allows inline styles whatever this switch says.` : '';

  const vite = $('#vite-origin');
  if (document.activeElement !== vite) vite.value = s.viteOrigin;
  $('#vite-block').hidden = !s.stack.includes('vite');

  for (const kind of CUSTOM_KINDS) {
    $(`#tags-${kind}`).replaceChildren(...s.custom[kind].map(value => el('span', { class: 'dtag' }, value,
      el('button', { type: 'button', class: 'dtag-x', dataset: { kind, value }, 'aria-label': `Remove ${value}` }, '×'))));
  }
  $('#embeds-list').replaceChildren(...s.embeds.map(e => el('li', { class: 'embed-row' },
    el('code', { class: 'code-plain' }, `/${e.path}`), ' ', el('span', { class: 'embed-origins' }, e.origins.join(' ')),
    el('button', { type: 'button', class: 'dtag-x', dataset: { removeEmbed: e.path }, 'aria-label': `Remove /${e.path}` }, '×'))));

  $$('[data-preset]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.preset === store.preset)));
}
