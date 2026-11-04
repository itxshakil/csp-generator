import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scorePolicy, headerBytes, headerName, sizeLevel, buildDirectives, policyString } from '../../assets/js/policy.js';
import { DEFAULT_STATE, PRESETS, sanitizeState } from '../../assets/js/state.js';
import { INTEGRATIONS, STACK, HOSTING } from '../../assets/js/integrations.js';

const preset = (name, extra = {}) => sanitizeState({ ...structuredClone(DEFAULT_STATE), ...PRESETS[name], ...extra });
const ids = r => r.deductions.map(d => d.id);

test('strict scores 100 with no deductions', () => {
  assert.deepEqual(scorePolicy(preset('strict')), { score: 100, deductions: [] });
});

test('standard scores 100', () => {
  assert.equal(scorePolicy(preset('standard')).score, 100);
});

test('rollout deducts report-only', () => {
  const r = scorePolicy(preset('rollout'));
  assert.deepEqual(ids(r), ['report-only']);
  assert.equal(r.score, 80);
});

test('jsdelivr and unpkg deduct 10 each as bypass hosts', () => {
  const r = scorePolicy(preset('strict', { integrations: ['jsdelivr', 'unpkg'] }));
  assert.deepEqual(ids(r), ['bypass-host', 'bypass-host']);
  assert.equal(r.score, 80);
  assert.ok(r.deductions[0].label.includes('cdn.jsdelivr.net'));
});

test('bypass hosts are capped at 30', () => {
  const r = scorePolicy(preset('strict', { integrations: ['jsdelivr', 'unpkg', 'cdnjs', 'google-maps'] }));
  assert.equal(r.deductions.filter(d => d.id === 'bypass-host').reduce((a, d) => a + d.points, 0), 30);
});

test('livewire deducts unsafe-eval and the label mentions Livewire', () => {
  const r = scorePolicy(preset('strict', { stack: ['livewire'] }));
  assert.deepEqual(ids(r), ['unsafe-eval']);
  assert.equal(r.deductions[0].points, 25);
  assert.ok(r.deductions[0].label.includes('Livewire'));
});

test('inline style attributes deduct 10', () => {
  assert.deepEqual(scorePolicy(preset('strict', { inlineStyleAttrs: true })).deductions.map(d => [d.id, d.points]), [['style-attr', 10]]);
});

test('other wildcard script hosts deduct 5 each, capped at 15', () => {
  const r = scorePolicy(preset('strict', { custom: { script: ['*.a.com', '*.b.com', '*.c.com', '*.d.com'] } }));
  assert.equal(r.deductions.filter(d => d.id === 'wildcard').reduce((a, d) => a + d.points, 0), 15);
});

test('reporting off deducts 15', () => {
  assert.deepEqual(scorePolicy(preset('strict', { reporting: false })).deductions.map(d => [d.id, d.points]), [['no-reporting', 15]]);
});

test('score never goes below 0', () => {
  const all = preset('strict', {
    integrations: INTEGRATIONS.map(i => i.id), stack: STACK.map(s => s.id), hosting: HOSTING.map(h => h.id),
    reportOnly: true, reporting: false, inlineStyleAttrs: true,
  });
  assert.equal(scorePolicy(all).score, 0);
});

test('local-only options never affect the score', () => {
  assert.equal(scorePolicy(preset('strict', { stack: ['vite', 'debugbar'] })).score, 100);
});

test('headerName follows report-only', () => {
  assert.equal(headerName(preset('strict')), 'Content-Security-Policy');
  assert.equal(headerName(preset('rollout')), 'Content-Security-Policy-Report-Only');
});

test('headerBytes counts the full header line in UTF-8 bytes', () => {
  const s = preset('strict');
  const line = `Content-Security-Policy: ${policyString(buildDirectives(s))}`;
  assert.equal(headerBytes(s), Buffer.byteLength(line, 'utf8'));
  assert.ok(headerBytes(s, 'local') > headerBytes(s), 'local adds Vite');
});

test('sizeLevel boundaries', () => {
  assert.equal(sizeLevel(4096), 'ok');
  assert.equal(sizeLevel(4097), 'warn');
  assert.equal(sizeLevel(8192), 'warn');
  assert.equal(sizeLevel(8193), 'over');
});

test('every integration at once yields a large header without throwing', () => {
  const custom = { script: Array.from({ length: 50 }, (_, i) => `https://cdn${i}.example-long-host-name.com`), connect: Array.from({ length: 50 }, (_, i) => `https://api${i}.example-long-host-name.com`) };
  const all = preset('strict', { integrations: INTEGRATIONS.map(i => i.id), stack: STACK.map(s => s.id), hosting: HOSTING.map(h => h.id), custom });
  assert.notEqual(sizeLevel(headerBytes(all)), 'ok');
});
