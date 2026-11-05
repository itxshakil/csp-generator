import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOrigin, normalizeSource, wsOrigin, covers, collapseSources } from '../../assets/js/sources.js';

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
    assert.ok(normalizeSource('https://*').error);
    assert.ok(normalizeSource('https://a.*.com').error);
  });
});

test('covers matches subdomains of the same scheme and port only', () => {
  assert.equal(covers('https://*.example.com', 'https://a.example.com'), true);
  assert.equal(covers('https://*.example.com', 'https://a.b.example.com'), true);
  assert.equal(covers('https://*.example.com', 'https://example.com'), false);
  assert.equal(covers('https://*.example.com', 'http://a.example.com'), false);
  assert.equal(covers('https://*.example.com', 'https://a.example.com:8443'), false);
  assert.equal(covers('https://*.example.com:8443', 'https://a.example.com:8443'), true);
  assert.equal(covers('https://*.example.com', 'https://notexample.com'), false);
  assert.equal(covers('https://*.example.com', 'https://*.a.example.com'), true);
  assert.equal(covers('https://*.a.example.com', 'https://*.example.com'), false);
  assert.equal(covers("'self'", 'https://a.example.com'), false);
});

test('collapseSources drops hosts a wildcard covers and keeps order', () => {
  assert.deepEqual(
    collapseSources(["'self'", 'https://www.google.com', 'https://*.google.com', 'https://google.com']),
    ["'self'", 'https://*.google.com', 'https://google.com'],
  );
});

test('collapseSources deduplicates keywords and schemes', () => {
  assert.deepEqual(collapseSources(["'self'", "'self'", 'data:', 'data:']), ["'self'", 'data:']);
});
