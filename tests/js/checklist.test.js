import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checklistItems, summaryMarkdown, CHECKLIST_KEY } from '../../assets/js/checklist.js';
import { buildDirectives } from '../../assets/js/policy.js';
import { DEFAULT_STATE, PRESETS, sanitizeState } from '../../assets/js/state.js';
import { INTEGRATIONS, STACK, HOSTING } from '../../assets/js/integrations.js';

const preset = (name, extra = {}) => sanitizeState({ ...structuredClone(DEFAULT_STATE), ...PRESETS[name], ...extra });
const ids = s => checklistItems(s).map(i => i.id);
const KITCHEN = preset('strict', { integrations: INTEGRATIONS.map(i => i.id), stack: STACK.map(s => s.id), hosting: HOSTING.map(h => h.id), fullPageCache: true });

test('storage key', () => assert.equal(CHECKLIST_KEY, 'csp-checklist'));

test('strict produces the core items and nothing stack-specific', () => {
  assert.deepEqual(ids(preset('strict', { stack: [] })), ['blade-nonce', 'report-route', 'enforce', 'verify-headers']);
  assert.deepEqual(ids(preset('strict')), ['vite-nonce', 'blade-nonce', 'report-route', 'enforce', 'verify-headers']);
});

test('each stack and hosting option adds its item', () => {
  const cases = {
    livewire: ['stack', 'livewire', 'livewire-nonce'], filament: ['stack', 'filament', 'filament-style'],
    inertia: ['stack', 'inertia', 'inertia-routes'], alpineCsp: ['stack', 'alpineCsp', 'alpine-csp'],
    telescope: ['stack', 'telescope', 'dashboards-skip'], debugbar: ['stack', 'debugbar', 'debugbar'],
    cloudflare: ['hosting', 'cloudflare', 'cloudflare-rocket'], cloudflareEmail: ['hosting', 'cloudflare', 'cloudflare-email'],
    hostinger: ['hosting', 'hostinger', 'hostinger-header'], nginxProxy: ['hosting', 'nginxProxy', 'nginx-buffer'],
  };
  for (const [label, [key, id, item]] of Object.entries(cases)) {
    assert.ok(ids(preset('strict', { [key]: [id] })).includes(item), label);
  }
  assert.ok(ids(preset('strict', { fullPageCache: true })).includes('full-page-cache'));
});

test('report-only replaces enforce with the report-only window; reporting off drops the route', () => {
  assert.ok(ids(preset('rollout')).includes('report-only-window'));
  assert.ok(!ids(preset('rollout')).includes('enforce'));
  assert.ok(!ids(preset('strict', { reporting: false })).includes('report-route'));
});

test('integrations with a note get an item', () => {
  assert.ok(ids(preset('strict', { integrations: ['gtm'] })).includes('integration-gtm'));
  assert.ok(!ids(preset('strict', { integrations: ['stripe'] })).some(i => i.startsWith('integration-')));
});

test('ids are unique and items are well formed for the kitchen sink state', () => {
  const items = checklistItems(KITCHEN);
  assert.equal(new Set(items.map(i => i.id)).size, items.length);
  for (const i of items) {
    assert.ok(['todo', 'warn', 'info'].includes(i.level), i.id);
    assert.ok(i.text && !i.text.includes('—'), i.id);
    assert.equal((i.text.match(/`/g) ?? []).length % 2, 0, `balanced backticks in ${i.id}`);
  }
});

test('summary lists every production source with its reason and the rollout dates', () => {
  const s = preset('standard', { rollout: { reportOnlyFrom: '2026-11-04', enforceFrom: '2026-11-18' } });
  const md = summaryMarkdown(s);
  for (const d of buildDirectives(s, 'production')) {
    assert.ok(md.includes(`### ${d.name}`), d.name);
    for (const src of d.sources) {
      for (const reason of d.reasons[src]) assert.ok(md.includes(`\`${src}\`: ${reason}`), `${d.name} ${src}`);
    }
  }
  assert.ok(md.includes('2026-11-04'));
  assert.ok(md.includes('2026-11-18'));
  assert.ok(md.includes('Content-Security-Policy'));
});

test('summary says "not set" for empty dates and lists score deductions', () => {
  const md = summaryMarkdown(preset('rollout'));
  assert.equal((md.match(/not set/g) ?? []).length, 2);
  assert.ok(md.includes('Report-only mode'));
});
