import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, DEFAULT_STATE, buildDirectives, policyString, score, grade } from '../../assets/js/policy.js';

const withPreset = (name, extra = {}) => ({ ...structuredClone(DEFAULT_STATE), ...PRESETS[name], ...extra });

test('strict preset matches the pre-split output', () => {
  assert.equal(policyString(buildDirectives(withPreset('strict'))),
    "default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'nonce-{$nonce}'; style-src-elem 'self' 'nonce-{$nonce}'; style-src-attr 'none'; font-src 'self' data:; img-src 'self' data:; frame-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /api/csp-violation-report");
});

test('standard preset score and grade', () => {
  assert.equal(score(withPreset('standard')), 100);
  assert.deepEqual(grade(100), { label: 'A+', cls: 'grade-a' });
});

import { normalizeOrigin, wsOrigin } from '../../assets/js/policy.js';

const dir = (dirs, name) => dirs.find(d => d.name === name)?.sources ?? [];

test('normalizeOrigin adds a scheme and strips paths', () => {
  assert.equal(normalizeOrigin('localhost:5173').value, 'http://localhost:5173');
  assert.equal(normalizeOrigin('127.0.0.1:5173').value, 'http://127.0.0.1:5173');
  assert.equal(normalizeOrigin('https://app.test:5173/').value, 'https://app.test:5173');
  assert.equal(normalizeOrigin('app.test').value, 'https://app.test');
  assert.equal(normalizeOrigin('https://app.test:5173/@vite/client?x=1').value, 'https://app.test:5173');
});

test('normalizeOrigin rejects garbage', () => {
  for (const bad of ['not a host', '', "'self'", 'ftp://x.com', 'https://', '<b>']) {
    const r = normalizeOrigin(bad);
    assert.equal(r.value, null, bad);
    assert.ok(r.error, bad);
  }
});

test('wsOrigin maps http to ws and https to wss', () => {
  assert.equal(wsOrigin('http://localhost:5173'), 'ws://localhost:5173');
  assert.equal(wsOrigin('https://app.test:5173'), 'wss://app.test:5173');
});

test('local mode allows the Vite dev server for scripts, styles and HMR', () => {
  const dirs = buildDirectives(withPreset('strict', { local: true, viteOrigin: 'https://app.test:5173' }));
  for (const name of ['script-src', 'style-src', 'style-src-elem']) assert.ok(dir(dirs, name).includes('https://app.test:5173'), name);
  assert.ok(dir(dirs, 'connect-src').includes('wss://app.test:5173'));
  assert.ok(dir(dirs, 'connect-src').includes('https://app.test:5173'));
  assert.ok(!policyString(dirs).includes('localhost'));
});

test('production mode never includes the Vite dev server', () => {
  const dirs = buildDirectives(withPreset('strict', { local: false, viteOrigin: 'https://app.test:5173' }));
  assert.ok(!policyString(dirs).includes('app.test'));
});

test('default Vite origin is localhost:5173', () => {
  const dirs = buildDirectives(withPreset('strict', { local: true }));
  assert.ok(dir(dirs, 'script-src').includes('http://localhost:5173'));
  assert.ok(dir(dirs, 'connect-src').includes('ws://localhost:5173'));
});
