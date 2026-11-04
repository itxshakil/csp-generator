import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, INTEGRATIONS, INTEGRATION_BY_ID, STACK, HOSTING } from '../../assets/js/integrations.js';
import { normalizeSource } from '../../assets/js/sources.js';

const KINDS = ['script', 'style', 'font', 'img', 'media', 'frame', 'connect', 'form', 'worker'];
const allSources = i => Object.entries(i.sources).flatMap(([kind, list]) => list.map(([source, reason]) => ({ kind, source, reason })));

test('the catalog has the 27 planned ids', () => {
  assert.deepEqual(INTEGRATIONS.map(i => i.id).sort(), [
    'stripe', 'paypal', 'ga4', 'gtm', 'google-ads', 'meta-pixel', 'microsoft-uet', 'clarity', 'hotjar', 'plausible', 'fathom',
    'tawk', 'crisp', 'intercom', 'google-maps', 'youtube', 'vimeo', 'pusher', 'google-fonts', 'bunny-fonts', 'jsdelivr',
    'cdnjs', 'unpkg', 'recaptcha', 'turnstile', 'hcaptcha', 'sentry',
  ].sort());
});

test('categories are the eight planned ones', () => {
  assert.deepEqual(CATEGORIES.map(c => c.id), ['payments', 'analytics', 'chat', 'media', 'realtime', 'cdn', 'bot', 'errors']);
});

test('every integration has a unique id, a known category, a docs URL and at least one source', () => {
  const cats = new Set(CATEGORIES.map(c => c.id));
  assert.equal(new Set(INTEGRATIONS.map(i => i.id)).size, INTEGRATIONS.length);
  for (const i of INTEGRATIONS) {
    assert.ok(i.name, i.id);
    assert.ok(cats.has(i.category), i.id);
    assert.match(i.docs, /^https:\/\//, i.id);
    assert.ok(allSources(i).length > 0, i.id);
    for (const kind of Object.keys(i.sources)) assert.ok(KINDS.includes(kind), `${i.id} ${kind}`);
    assert.equal(INTEGRATION_BY_ID[i.id], i);
  }
});

test('every source is a normalized host source or blob: or data:', () => {
  for (const i of INTEGRATIONS) {
    for (const { source } of allSources(i)) {
      assert.ok(['blob:', 'data:'].includes(source) || normalizeSource(source).value === source, `${i.id} ${source}`);
    }
  }
});

test('every source has a non-empty reason without an em dash', () => {
  for (const i of INTEGRATIONS) {
    for (const { source, reason } of allSources(i)) {
      assert.ok(typeof reason === 'string' && reason.trim(), `${i.id} ${source}`);
      assert.ok(!reason.includes('—'), `${i.id} ${source}`);
    }
  }
});

test('needs values are non-empty reasons', () => {
  for (const i of [...INTEGRATIONS, ...STACK]) {
    for (const [key, reason] of Object.entries(i.needs ?? {})) {
      assert.ok(['unsafeEval', 'inlineStyleAttrs', 'workerBlob'].includes(key), `${i.id} ${key}`);
      assert.ok(typeof reason === 'string' && reason.trim(), `${i.id} ${key}`);
    }
  }
});

test('stack and hosting ids are the planned ones', () => {
  assert.deepEqual(STACK.map(s => s.id), ['vite', 'livewire', 'inertia', 'alpine', 'alpineCsp', 'filament', 'debugbar', 'telescope', 'horizon', 'pulse']);
  assert.deepEqual(HOSTING.map(h => h.id), ['cloudflare', 'hostinger', 'nginxProxy']);
  assert.ok(STACK.find(s => s.id === 'debugbar').localOnly);
});
