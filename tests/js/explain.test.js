import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainViolation } from '../../assets/js/parse.js';
import { DEFAULT_STATE, PRESETS, sanitizeState } from '../../assets/js/state.js';

const S = sanitizeState({ ...structuredClone(DEFAULT_STATE), ...PRESETS.strict });

test('Chrome: refused to load a script', () => {
  const r = explainViolation(`Refused to load the script 'https://js.stripe.com/v3/' because it violates the following Content Security Policy directive: "script-src 'self' 'nonce-abc'". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.`, S);
  assert.equal(r.ok, true);
  assert.equal(r.directive, 'script-src');
  assert.equal(r.kind, 'script');
  assert.equal(r.blocked, 'https://js.stripe.com/v3/');
  assert.deepEqual(r.fix, { type: 'integration', id: 'stripe' });
  assert.ok(r.plain.includes('Stripe'));
});

test('Chrome: refused to connect to a websocket suggests Tawk.to', () => {
  const r = explainViolation(`Refused to connect to 'wss://vsa12.tawk.to/s/?k=1' because it violates the following Content Security Policy directive: "connect-src 'self'".`, S);
  assert.equal(r.kind, 'connect');
  assert.deepEqual(r.fix, { type: 'integration', id: 'tawk' });
});

test('Chrome: inline script suggests the nonce, not unsafe-inline', () => {
  const r = explainViolation(`Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'nonce-abc'". Either the 'unsafe-inline' keyword, a hash ('sha256-x='), or a nonce ('nonce-...') is required to enable inline execution.`, S);
  assert.equal(r.fix.type, 'inline');
  assert.ok(r.fix.advice.includes('nonce'));
  assert.ok(!r.fix.advice.includes("add 'unsafe-inline'"));
});

test('Chrome: eval', () => {
  const r = explainViolation(`Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: "script-src 'self'".`, S);
  assert.equal(r.fix.type, 'eval');
});

test('Firefox console message with curly quotes', () => {
  const r = explainViolation('Content-Security-Policy: The page’s settings blocked the loading of a resource (img-src) at https://i.ytimg.com/vi/x/0.jpg because it violates the following directive: “img-src \'self\' data:”', S);
  assert.equal(r.directive, 'img-src');
  assert.equal(r.kind, 'img');
  assert.deepEqual(r.fix, { type: 'integration', id: 'youtube' });
});

test('Safari console message', () => {
  const r = explainViolation('Refused to load https://cdn.example.com/a.js because it does not appear in the script-src directive of the Content Security Policy.', S);
  assert.equal(r.directive, 'script-src');
  assert.deepEqual(r.fix, { type: 'custom', kind: 'script', value: 'https://cdn.example.com' });
});

test('report-uri body', () => {
  const r = explainViolation(JSON.stringify({ 'csp-report': { 'document-uri': 'https://app.com/', 'violated-directive': 'frame-src', 'effective-directive': 'frame-src', 'blocked-uri': 'https://player.vimeo.com/video/1' } }), S);
  assert.equal(r.directive, 'frame-src');
  assert.deepEqual(r.fix, { type: 'integration', id: 'vimeo' });
});

test('Reporting API list and single body', () => {
  const body = { documentURL: 'https://app.com/', effectiveDirective: 'style-src-elem', blockedURL: 'https://fonts.googleapis.com/css2?family=Inter' };
  for (const input of [[{ type: 'csp-violation', body }], body]) {
    const r = explainViolation(JSON.stringify(input), S);
    assert.equal(r.kind, 'style');
    assert.deepEqual(r.fix, { type: 'integration', id: 'google-fonts' });
  }
});

test('an extension block is noise', () => {
  const r = explainViolation(JSON.stringify({ 'csp-report': { 'violated-directive': 'script-src', 'blocked-uri': 'chrome-extension://abc/x.js' } }), S);
  assert.equal(r.fix.type, 'noise');
});

test('a blocked host already allowed says the policy has since changed', () => {
  const withStripe = sanitizeState({ ...S, integrations: ['stripe'] });
  const r = explainViolation(`Refused to load the script 'https://js.stripe.com/v3/' because it violates the following Content Security Policy directive: "script-src 'self'".`, withStripe);
  assert.equal(r.fix.type, 'none');
});

test('a javascript: blocked-uri is reported as text, never as a fix value', () => {
  const r = explainViolation(JSON.stringify({ 'csp-report': { 'violated-directive': 'script-src', 'blocked-uri': 'javascript:alert(1)' } }), S);
  assert.equal(r.ok, true);
  assert.notEqual(r.fix.type, 'custom');
  assert.notEqual(r.fix.type, 'integration');
});

test('garbage gives ok: false with a helpful error', () => {
  for (const g of ['', 'hello', '{"a":1}', '[1,2]']) {
    const r = explainViolation(g, S);
    assert.equal(r.ok, false, g);
    assert.ok(r.error.length > 10);
  }
});
