import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_KINDS, DEFAULT_STATE, PRESETS, PRESET_LABELS, MAX_EMBEDS, normalizeEmbedPath, sanitizeState, migrateV1 } from '../../assets/js/state.js';

test('default state shape', () => {
  assert.equal(DEFAULT_STATE.v, 2);
  assert.deepEqual(DEFAULT_STATE.stack, ['vite']);
  assert.deepEqual(Object.keys(DEFAULT_STATE.custom), CUSTOM_KINDS);
  assert.deepEqual(CUSTOM_KINDS, ['script', 'style', 'img', 'font', 'frame', 'connect', 'media', 'form']);
  assert.deepEqual(DEFAULT_STATE.rollout, { reportOnlyFrom: '', enforceFrom: '' });
});

test('presets are strict, standard and rollout', () => {
  assert.deepEqual(Object.keys(PRESETS), ['strict', 'standard', 'rollout']);
  assert.deepEqual(PRESET_LABELS, { strict: 'Strict', standard: 'Standard', rollout: 'Rollout' });
  assert.deepEqual(PRESETS.standard.integrations, ['google-fonts', 'ga4']);
  assert.equal(PRESETS.rollout.reportOnly, true);
  assert.deepEqual({ ...PRESETS.rollout, reportOnly: false }, PRESETS.standard);
});

test('sanitizeState of junk returns DEFAULT_STATE', () => {
  for (const junk of [null, [], 'x', 42]) assert.deepEqual(sanitizeState(junk), DEFAULT_STATE);
  assert.deepEqual(sanitizeState({ v: 2, integrations: 'stripe' }).integrations, []);
});

test('sanitizeState does not share arrays with DEFAULT_STATE', () => {
  const s = sanitizeState({ v: 2 });
  s.custom.script.push('https://x.com');
  s.stack.push('livewire');
  assert.deepEqual(DEFAULT_STATE.custom.script, []);
  assert.deepEqual(DEFAULT_STATE.stack, ['vite']);
});

test('sanitizeState keeps only known ids, deduplicated, in catalog order', () => {
  const s = sanitizeState({ v: 2, integrations: ['tawk', 'nope', 'stripe', 'tawk'], stack: ['pulse', 'x', 'vite'], hosting: ['nginxProxy', 'cloudflare', '__proto__'] });
  assert.deepEqual(s.integrations, ['stripe', 'tawk']);
  assert.deepEqual(s.stack, ['vite', 'pulse']);
  assert.deepEqual(s.hosting, ['cloudflare', 'nginxProxy']);
});

test('sanitizeState validates booleans and the Vite origin', () => {
  const s = sanitizeState({ v: 2, reportOnly: 'yes', reporting: false, fullPageCache: true, viteOrigin: 'javascript:alert(1)' });
  assert.equal(s.reportOnly, false);
  assert.equal(s.reporting, false);
  assert.equal(s.fullPageCache, true);
  assert.equal(s.viteOrigin, DEFAULT_STATE.viteOrigin);
});

test('sanitizeState validates custom sources and caps them at 50', () => {
  const many = Array.from({ length: 80 }, (_, i) => `h${i}.example.com`);
  const s = sanitizeState({ v: 2, custom: { script: ['<img src=x onerror=alert(1)>', "a.com'", 'ok.com'], form: [...many, 'h0.example.com'], nope: ['x.com'], img: 'no' } });
  assert.deepEqual(s.custom.script, ['https://ok.com']);
  assert.equal(s.custom.form.length, 50);
  assert.deepEqual(s.custom.img, []);
  assert.equal('nope' in s.custom, false);
});

test('sanitizeState validates rollout dates', () => {
  const s = sanitizeState({ v: 2, rollout: { reportOnlyFrom: '2026-11-04', enforceFrom: 'tomorrow' } });
  assert.deepEqual(s.rollout, { reportOnlyFrom: '2026-11-04', enforceFrom: '' });
  assert.equal(sanitizeState({ v: 2, rollout: { reportOnlyFrom: '2026-13-45' } }).rollout.reportOnlyFrom, '');
});

test('normalizeEmbedPath accepts Laravel path patterns only', () => {
  assert.equal(normalizeEmbedPath('/widget/*').value, 'widget/*');
  assert.equal(normalizeEmbedPath('embed').value, 'embed');
  assert.equal(normalizeEmbedPath(' embed/v1.2_x-y ').value, 'embed/v1.2_x-y');
  for (const bad of ['', '/', "x'; DROP", 'a b', '../x', 'a/../b', 'x"y', 'x\\y', 'a'.repeat(101)]) {
    const r = normalizeEmbedPath(bad);
    assert.equal(r.value, null, bad);
    assert.ok(r.error, bad);
  }
});

test('sanitizeState keeps valid embeds only', () => {
  const embeds = [
    { path: '/widget/*', origins: ['https://partner.com', 'javascript:x', 'partner2.com'] },
    { path: '../x', origins: ['https://a.com'] },
    { path: 'none', origins: ['nope nope'] },
    ...Array.from({ length: 12 }, (_, i) => ({ path: `p${i}`, origins: ['https://a.com'] })),
  ];
  const s = sanitizeState({ v: 2, embeds });
  assert.equal(s.embeds.length, MAX_EMBEDS);
  assert.deepEqual(s.embeds[0], { path: 'widget/*', origins: ['https://partner.com', 'https://partner2.com'] });
  assert.ok(s.embeds.every(e => e.path !== 'none' && e.path !== '../x'));
});

test('embed origins are capped at 10 and must be https', () => {
  const s = sanitizeState({ v: 2, embeds: [{ path: 'w', origins: ['http://a.com', ...Array.from({ length: 12 }, (_, i) => `https://o${i}.com`)] }] });
  assert.equal(s.embeds[0].origins.length, 10);
  assert.ok(s.embeds[0].origins.every(o => o.startsWith('https://')));
});

const V1 = {
  local: true, jsdelivr: true, cdnjs: false, tawk: true, gfonts: true, ga: true, gtm: false, livewire: true,
  reportonly: true, reporting: false, inlineStyleAttrs: true, viteOrigin: 'https://app.test:5173',
  tags: { script: ['https://a.com'], connect: ['https://api.b.com'] },
};

test('migrateV1 maps old toggles to integrations and stack', () => {
  const s = migrateV1(V1);
  assert.equal(s.v, 2);
  assert.deepEqual(s.integrations, ['ga4', 'tawk', 'google-fonts', 'jsdelivr']);
  assert.deepEqual(s.stack, ['vite', 'livewire']);
  assert.equal(s.reportOnly, true);
  assert.equal(s.reporting, false);
  assert.equal(s.inlineStyleAttrs, true);
  assert.equal(s.viteOrigin, 'https://app.test:5173');
  assert.deepEqual(s.custom.script, ['https://a.com']);
  assert.deepEqual(s.custom.connect, ['https://api.b.com']);
});

test('sanitizeState routes input without v: 2 through migrateV1', () => {
  assert.deepEqual(sanitizeState(V1), migrateV1(V1));
});

test('migrateV1 drops hostile old values', () => {
  const s = migrateV1({ ga: 'yes', tags: { script: ['<img src=x>'] }, viteOrigin: 'javascript:alert(1)' });
  assert.deepEqual(s.integrations, []);
  assert.deepEqual(s.custom.script, []);
  assert.equal(s.viteOrigin, DEFAULT_STATE.viteOrigin);
});
