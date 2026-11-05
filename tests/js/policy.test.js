import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDirectives, policyString, needsFor, skippedPaths, REPORT_PATH, REPORT_GROUP, ENVS } from '../../assets/js/policy.js';
import { DEFAULT_STATE, PRESETS, sanitizeState } from '../../assets/js/state.js';
import { INTEGRATIONS, STACK, HOSTING } from '../../assets/js/integrations.js';

export const preset = (name, extra = {}) => sanitizeState({ ...structuredClone(DEFAULT_STATE), ...PRESETS[name], ...extra });
const dir = (dirs, name) => dirs.find(d => d.name === name)?.sources ?? [];
const names = dirs => dirs.map(d => d.name);

test('constants', () => {
  assert.deepEqual(ENVS, ['production', 'local']);
  assert.equal(REPORT_PATH, '/csp-violation-report');
  assert.equal(REPORT_GROUP, 'csp-endpoint');
});

test('strict preset production policy is exact', () => {
  assert.equal(policyString(buildDirectives(preset('strict'))),
    "default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'nonce-{$nonce}'; style-src-attr 'none'; font-src 'self' data:; img-src 'self' data:; frame-src 'self'; connect-src 'self'; manifest-src 'self'; form-action 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp-violation-report; report-to csp-endpoint");
});

test('reporting off drops report-uri and report-to', () => {
  const pol = policyString(buildDirectives(preset('strict', { reporting: false })));
  assert.ok(!pol.includes('report-uri'));
  assert.ok(!pol.includes('report-to'));
});

test('local env adds Vite and drops upgrade-insecure-requests', () => {
  const dirs = buildDirectives(preset('strict', { viteOrigin: 'https://app.test:5173' }), 'local');
  for (const name of ['script-src', 'style-src', 'connect-src']) assert.ok(dir(dirs, name).includes('https://app.test:5173'), name);
  assert.ok(dir(dirs, 'connect-src').includes('wss://app.test:5173'));
  assert.ok(!names(dirs).includes('upgrade-insecure-requests'));
});

test('default Vite origin is localhost:5173 over ws', () => {
  const dirs = buildDirectives(preset('strict'), 'local');
  assert.ok(dir(dirs, 'script-src').includes('http://localhost:5173'));
  assert.ok(dir(dirs, 'connect-src').includes('ws://localhost:5173'));
});

test('production never contains the Vite origin or local-only sources', () => {
  const all = preset('strict', { stack: STACK.map(s => s.id), viteOrigin: 'https://app.test:5173' });
  const prod = policyString(buildDirectives(all, 'production'));
  assert.ok(!prod.includes('app.test'));
  assert.ok(prod.includes('upgrade-insecure-requests'));
});

test('local env without the vite stack has no Vite origin', () => {
  const pol = policyString(buildDirectives(preset('strict', { stack: [] }), 'local'));
  assert.ok(!pol.includes('localhost:5173'));
});

test('GA4 gets every endpoint gtag uses', () => {
  const dirs = buildDirectives(preset('strict', { integrations: ['ga4'] }));
  assert.ok(dir(dirs, 'script-src').includes('https://www.googletagmanager.com'));
  for (const name of ['connect-src', 'img-src']) {
    for (const host of ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com']) {
      assert.ok(dir(dirs, name).includes(host), `${name} ${host}`);
    }
  }
});

test('Tawk.to gets every directive its widget needs', () => {
  const dirs = buildDirectives(preset('strict', { integrations: ['tawk'] }));
  for (const name of ['script-src', 'style-src', 'font-src', 'img-src', 'media-src', 'frame-src', 'connect-src']) {
    assert.ok(dir(dirs, name).includes('https://*.tawk.to'), name);
  }
  assert.ok(dir(dirs, 'connect-src').includes('wss://*.tawk.to'));
});

test('a host shared by two integrations appears once', () => {
  const dirs = buildDirectives(preset('strict', { integrations: ['ga4', 'gtm'] }));
  assert.equal(dir(dirs, 'script-src').filter(s => s === 'https://www.googletagmanager.com').length, 1);
});

test('media-src only appears when something needs it', () => {
  assert.ok(!names(buildDirectives(preset('standard'))).includes('media-src'));
  assert.ok(names(buildDirectives(preset('strict', { custom: { media: ['https://v.example.com'] } }))).includes('media-src'));
});

test('style-src-elem only appears when it differs from style-src', () => {
  assert.ok(!names(buildDirectives(preset('standard'))).includes('style-src-elem'));
});

test("style-src-attr defaults to 'none' and the user can allow inline style attributes", () => {
  assert.deepEqual(dir(buildDirectives(preset('strict')), 'style-src-attr'), ["'none'"]);
  assert.deepEqual(dir(buildDirectives(preset('strict', { inlineStyleAttrs: true })), 'style-src-attr'), ["'unsafe-inline'"]);
});

test("an option that needs inline style attributes sets 'unsafe-inline' and names itself", () => {
  const dirs = buildDirectives(preset('strict', { stack: ['filament'] }));
  const attr = dirs.find(d => d.name === 'style-src-attr');
  assert.deepEqual(attr.sources, ["'unsafe-inline'"]);
  assert.ok(attr.reasons["'unsafe-inline'"].some(r => r.startsWith('Filament')));
});

test("livewire adds 'unsafe-eval' with a reason; alpineCsp alone does not", () => {
  const lw = buildDirectives(preset('strict', { stack: ['livewire'] }));
  const script = lw.find(d => d.name === 'script-src');
  assert.ok(script.sources.includes("'unsafe-eval'"));
  assert.ok(script.reasons["'unsafe-eval'"][0].startsWith('Livewire 3'));
  assert.ok(!dir(buildDirectives(preset('strict', { stack: ['alpineCsp'] })), 'script-src').includes("'unsafe-eval'"));
});

test('alpineCsp suppresses the standard Alpine reason', () => {
  const n = needsFor(preset('strict', { stack: ['alpine', 'alpineCsp'] }));
  assert.deepEqual(n.unsafeEval, []);
});

test("google maps adds worker-src 'self' blob:; no worker-src without a need", () => {
  assert.deepEqual(dir(buildDirectives(preset('strict', { integrations: ['google-maps'] })), 'worker-src'), ["'self'", 'blob:']);
  assert.ok(!names(buildDirectives(preset('strict'))).includes('worker-src'));
});

test('custom form sources land in form-action', () => {
  assert.deepEqual(dir(buildDirectives(preset('strict', { custom: { form: ['https://pay.example.com'] } })), 'form-action'), ["'self'", 'https://pay.example.com']);
});

test('custom sources carry the "Added by you" reason', () => {
  const d = buildDirectives(preset('strict', { custom: { script: ['https://a.example.com'] } })).find(x => x.name === 'script-src');
  assert.deepEqual(d.reasons['https://a.example.com'], ['Added by you']);
});

test('cloudflare hosting adds the Web Analytics beacon', () => {
  const dirs = buildDirectives(preset('strict', { hosting: ['cloudflare'] }));
  assert.ok(dir(dirs, 'script-src').includes('https://static.cloudflareinsights.com'));
  assert.ok(dir(dirs, 'connect-src').includes('https://cloudflareinsights.com'));
});

test('a wildcard from one integration absorbs a specific host from another', () => {
  const script = buildDirectives(preset('strict', { integrations: ['recaptcha', 'google-maps'] })).find(d => d.name === 'script-src');
  assert.ok(script.sources.includes('https://*.google.com'));
  assert.ok(!script.sources.includes('https://www.google.com'));
  assert.ok(script.reasons['https://*.google.com'].some(r => r.startsWith('reCAPTCHA')), 'absorbed reasons are kept');
});

test('reasons exist for every source in every directive', () => {
  const kitchen = preset('strict', { integrations: INTEGRATIONS.map(i => i.id), stack: STACK.map(s => s.id), hosting: HOSTING.map(h => h.id) });
  for (const env of ['production', 'local']) {
    for (const d of buildDirectives(kitchen, env)) {
      for (const s of d.sources) assert.ok(d.reasons[s]?.length, `${env} ${d.name} ${s}`);
    }
  }
});

test('skippedPaths lists the selected dashboards', () => {
  assert.deepEqual(skippedPaths(preset('strict', { stack: ['telescope', 'pulse'] })), ['telescope*', 'pulse*']);
  assert.deepEqual(skippedPaths(preset('strict')), []);
});

test('directive order is fixed', () => {
  const kitchen = preset('strict', { integrations: INTEGRATIONS.map(i => i.id), stack: STACK.map(s => s.id), custom: { media: ['https://m.example.com'] } });
  assert.deepEqual(names(buildDirectives(kitchen)), [
    'default-src', 'script-src', 'style-src', 'style-src-attr', 'font-src', 'img-src', 'media-src', 'frame-src', 'connect-src',
    'worker-src', 'manifest-src', 'form-action', 'object-src', 'base-uri', 'frame-ancestors', 'upgrade-insecure-requests', 'report-uri', 'report-to',
  ]);
});
