import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeShare, decodeHash, sanitizeResources, bookmarkletSource, encodePayload } from '../../assets/js/share.js';
import { CUSTOM_KINDS } from '../../assets/js/state.js';
import { preset } from './helpers.js';
import { INTEGRATIONS, STACK, HOSTING } from '../../assets/js/integrations.js';

const KITCHEN = preset('rollout', {
  integrations: INTEGRATIONS.map(i => i.id), stack: STACK.map(s => s.id), hosting: HOSTING.map(h => h.id),
  custom: Object.fromEntries(CUSTOM_KINDS.map(k => [k, [`https://${k}.example.com`]])),
  embeds: [{ path: 'widget/*', origins: ['https://p.example.com'] }], fullPageCache: true, inlineStyleAttrs: true,
  viteOrigin: 'https://app.test:5173', rollout: { reportOnlyFrom: '2026-11-04', enforceFrom: '2026-11-18' },
});

test('share round-trips the kitchen sink state', () => {
  assert.deepEqual(decodeHash('#' + encodeShare(KITCHEN)), { type: 'config', state: KITCHEN });
});

test('share round-trips the default state', () => {
  assert.deepEqual(decodeHash('#' + encodeShare(preset('strict'))), { type: 'config', state: preset('strict') });
});

test('share links stay short', () => {
  assert.ok(encodeShare(preset('standard')).length < 200, encodeShare(preset('standard')));
});

test('decodeHash drops unknown keys and invalid values', () => {
  const evil = { integrations: ['stripe', 'nope'], custom: { script: ['<img src=x onerror=alert(1)>', 'ok.com'] }, __proto__x: 1, evil: true };
  const r = decodeHash('#' + encodePayload('c', evil));
  assert.equal(r.type, 'config');
  assert.deepEqual(r.state.integrations, ['stripe']);
  assert.deepEqual(r.state.custom.script, ['https://ok.com']);
  assert.equal('evil' in r.state, false);
});

test('decodeHash rejects oversized hashes, empty ones and junk', () => {
  assert.equal(decodeHash('#c=' + 'A'.repeat(17000)).type, 'error');
  assert.deepEqual(decodeHash(''), { type: 'none' });
  assert.deepEqual(decodeHash('#section-2'), { type: 'none' });
  assert.equal(decodeHash('#c=%%%not-base64').type, 'error');
  assert.equal(decodeHash('#c=' + Buffer.from('{not json').toString('base64url')).type, 'error');
  assert.equal(decodeHash('#c=' + Buffer.from('[1,2]').toString('base64url')).type, 'error');
});

test('discover payloads decode to sanitized resources', () => {
  const r = decodeHash('#' + encodePayload('discover', { p: 'https://shop.example.com', r: [{ u: 'https://js.stripe.com', t: 'script' }, { u: 'javascript:alert(1)', t: 'script' }, { u: 'https://x.com', t: 'evil' }] }));
  assert.deepEqual(r, { type: 'discover', page: 'https://shop.example.com', resources: [{ url: 'https://js.stripe.com', type: 'script' }, { url: 'https://x.com', type: 'other' }] });
});

test('sanitizeResources keeps 500 at most and drops javascript: and data: URLs', () => {
  const many = Array.from({ length: 700 }, (_, i) => ({ u: `https://h${i}.example.com/a.js`, t: 'script' }));
  assert.equal(sanitizeResources(many).length, 500);
  assert.deepEqual(sanitizeResources([{ u: 'data:image/png;base64,x', t: 'img' }, { u: 'javascript:x', t: 'script' }, 'junk', null]), []);
  assert.deepEqual(sanitizeResources([{ u: 'https://a.com/x.js', t: 'script' }, { u: 'https://a.com/y.js', t: 'script' }]), [{ url: 'https://a.com', type: 'script' }]);
});

test('bookmarkletSource is a single-line javascript: URL under 2000 characters that parses', () => {
  const src = bookmarkletSource('https://csp-generator.shakiltech.com');
  assert.ok(src.startsWith('javascript:'));
  assert.ok(!src.includes('\n'));
  assert.ok(src.length < 2000, String(src.length));
  assert.doesNotThrow(() => new Function(decodeURIComponent(src.slice('javascript:'.length))));
  assert.ok(decodeURIComponent(src).includes('"https://csp-generator.shakiltech.com/#discover="'));
});

import { describeShared } from '../../assets/js/share.js';

test('I4: describeShared lists every change a shared config makes, custom hosts first', () => {
  const lines = describeShared(preset('strict', {
    integrations: ['stripe'], reportOnly: true, reporting: false, inlineStyleAttrs: true,
    custom: { script: ['https://evil.example'], connect: ['https://api.example.com'] },
    embeds: [{ path: 'w/*', origins: ['https://p.example.com'] }],
  }));
  const text = lines.join('\n');
  assert.ok(lines[0].includes('https://evil.example') && lines[0].includes('script-src'), lines[0]);
  for (const want of ['https://api.example.com', 'Stripe', 'report-only', 'Reporting off', 'inline style attributes', '/w/*']) assert.ok(text.includes(want), want);
});

test('I4: describeShared of a plain preset says so', () => {
  assert.deepEqual(describeShared(preset('strict')), ['No services, custom hosts or special settings.']);
});
