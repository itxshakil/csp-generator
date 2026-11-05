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

test('GA4 gets every endpoint gtag uses', () => {
  const dirs = buildDirectives(withPreset('strict', { ga: true }));
  assert.ok(dir(dirs, 'script-src').includes('https://www.googletagmanager.com'));
  for (const name of ['connect-src', 'img-src']) {
    for (const host of ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com']) {
      assert.ok(dir(dirs, name).includes(host), `${name} ${host}`);
    }
  }
});

test('Tawk.to gets every directive its widget needs', () => {
  const dirs = buildDirectives(withPreset('strict', { tawk: true }));
  for (const name of ['script-src', 'style-src', 'font-src', 'img-src', 'media-src', 'frame-src']) {
    assert.ok(dir(dirs, name).includes('https://*.tawk.to'), name);
  }
  assert.ok(dir(dirs, 'connect-src').includes('https://*.tawk.to'));
  assert.ok(dir(dirs, 'connect-src').includes('wss://*.tawk.to'));
  assert.ok(dir(dirs, 'img-src').includes('https://tawk.link'));
});

test('a host shared by two services appears once', () => {
  const dirs = buildDirectives(withPreset('strict', { ga: true, gtm: true }));
  assert.equal(dir(dirs, 'script-src').filter(s => s === 'https://www.googletagmanager.com').length, 1);
});

test('media-src only appears when a service needs it', () => {
  assert.equal(dir(buildDirectives(withPreset('standard')), 'media-src').length, 0);
});

test("style-src-attr defaults to 'none'", () => {
  assert.deepEqual(dir(buildDirectives(withPreset('strict')), 'style-src-attr'), ["'none'"]);
});

test("allowing inline style attributes sets 'unsafe-inline' and lowers the score", () => {
  const off = withPreset('strict');
  const on = withPreset('strict', { inlineStyleAttrs: true });
  assert.deepEqual(dir(buildDirectives(on), 'style-src-attr'), ["'unsafe-inline'"]);
  assert.ok(score(on) < score(off));
});

import { normalizeSource, sanitizeState } from '../../assets/js/policy.js';

test('normalizeSource reduces URLs to origins', () => {
  assert.equal(normalizeSource('cdn.example.com/lib.js').value, 'https://cdn.example.com');
  assert.equal(normalizeSource('https://cdn.example.com/').value, 'https://cdn.example.com');
  assert.equal(normalizeSource('https://api.example.com:8443/v1?x=1').value, 'https://api.example.com:8443');
  assert.equal(normalizeSource('wss://ws.example.com').value, 'wss://ws.example.com');
  assert.equal(normalizeSource('https://*.example.com').value, 'https://*.example.com');
  assert.equal(normalizeSource('*.example.com').value, 'https://*.example.com');
});

test('normalizeSource rejects keywords, wildcards and junk', () => {
  for (const bad of ["'unsafe-inline'", '*', 'https://*', 'ftp://x.com', 'javascript:alert(1)', '<img src=x>', "a.com'", 'a b.com', '']) {
    const r = normalizeSource(bad);
    assert.equal(r.value, null, bad);
    assert.ok(r.error, bad);
  }
});

test('normalizeSource accepts insecure schemes with a warning', () => {
  const r = normalizeSource('http://x.com');
  assert.equal(r.value, 'http://x.com');
  assert.ok(r.warning);
  assert.ok(normalizeSource('ws://x.com').warning);
  assert.equal(normalizeSource('https://x.com').warning, null);
});

test('sanitizeState keeps only valid stored values', () => {
  const s = sanitizeState({
    ga: 'yes', tawk: true, viteOrigin: 'javascript:alert(1)', evil: true,
    tags: { script: ['<img src=x onerror=alert(1)>', "a.com'", 'ok.com'], nope: ['x.com'], img: 'not-an-array' },
  });
  assert.equal(s.ga, false);
  assert.equal(s.tawk, true);
  assert.equal(s.viteOrigin, DEFAULT_STATE.viteOrigin);
  assert.equal('evil' in s, false);
  assert.deepEqual(s.tags.script, ['https://ok.com']);
  assert.deepEqual(s.tags.img, []);
  assert.equal('nope' in s.tags, false);
});

test('sanitizeState falls back to defaults for garbage', () => {
  assert.deepEqual(sanitizeState('garbage'), DEFAULT_STATE);
  assert.deepEqual(sanitizeState(null), DEFAULT_STATE);
  assert.deepEqual(sanitizeState([1, 2]), DEFAULT_STATE);
});

test('sanitizeState caps and de-duplicates tag lists', () => {
  const many = Array.from({ length: 80 }, (_, i) => `h${i}.example.com`);
  const s = sanitizeState({ tags: { connect: [...many, 'h0.example.com'] } });
  assert.equal(s.tags.connect.length, 50);
  assert.equal(new Set(s.tags.connect).size, 50);
});

test('sanitizeState does not share tag arrays with DEFAULT_STATE', () => {
  const s = sanitizeState({});
  s.tags.script.push('https://x.com');
  assert.deepEqual(DEFAULT_STATE.tags.script, []);
});

// Chromium's URL parser percent-encodes "*" in hostnames (Node and WebKit do not).
function withChromiumUrl(fn) {
  const NativeURL = globalThis.URL;
  globalThis.URL = class extends NativeURL {
    get hostname() { return super.hostname.replace(/\*/g, '%2A'); }
  };
  try { return fn(); } finally { globalThis.URL = NativeURL; }
}

test('wildcard sources survive a Chromium-style URL parser', () => {
  withChromiumUrl(() => {
    assert.equal(normalizeSource('*.stripe.com').value, 'https://*.stripe.com');
    assert.equal(normalizeSource('https://*.example.com/path').value, 'https://*.example.com');
    assert.equal(normalizeSource('wss://*.tawk.to').value, 'wss://*.tawk.to');
    assert.deepEqual(sanitizeState({ tags: { script: ['https://*.stripe.com'] } }).tags.script, ['https://*.stripe.com']);
    assert.ok(normalizeSource('https://*').error);
    assert.ok(normalizeSource('https://a.*.com').error);
  });
});
