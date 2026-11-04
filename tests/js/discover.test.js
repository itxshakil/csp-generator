import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resourcesFromDocument, proposeConfig, gradeHeaders } from '../../assets/js/discover.js';

// A tiny stand-in for a DOMParser document: elements are {tag, attrs, text}.
function fakeDoc(elements) {
  const matches = (el, sel) => {
    const m = /^([a-z]+)(.*)$/.exec(sel);
    if (el.tag !== m[1]) return false;
    for (const [, attr, op, val] of m[2].matchAll(/\[([a-z-]+)(?:(~?=)([a-z|]+))?\]/g)) {
      const v = el.attrs[attr];
      if (v === undefined) return false;
      if (op === '~=' && !val.split('|').some(x => v.split(/\s+/).includes(x))) return false;
      if (op === '=' && v !== val) return false;
    }
    return true;
  };
  return {
    querySelectorAll: selector => selector.split(',').map(s => s.trim()).flatMap(s => elements.filter(el => matches(el, s)))
      .filter((el, i, all) => all.indexOf(el) === i)
      .map(el => ({ tagName: el.tag.toUpperCase(), getAttribute: a => el.attrs[a] ?? null, hasAttribute: a => a in el.attrs, textContent: el.text ?? '' })),
  };
}

const DOC = fakeDoc([
  { tag: 'script', attrs: { src: 'https://js.stripe.com/v3/' } },
  { tag: 'script', attrs: { src: '/app.js' } },
  { tag: 'script', attrs: {}, text: 'inline()' },
  { tag: 'script', attrs: { nonce: 'x' }, text: 'ok()' },
  { tag: 'script', attrs: { type: 'application/ld+json' }, text: '{}' },
  { tag: 'script', attrs: { src: 'https://www.googletagmanager.com/gtag/js?id=G-1', async: '' } },
  { tag: 'link', attrs: { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter' } },
  { tag: 'link', attrs: { rel: 'preload', as: 'font', href: 'https://fonts.gstatic.com/s/inter.woff2' } },
  { tag: 'link', attrs: { rel: 'icon', href: 'https://cdn.example.com/favicon.ico' } },
  { tag: 'img', attrs: { src: 'https://images.example.com/a.png', srcset: 'https://cdn2.example.com/a.png 2x, /b.png 3x' } },
  { tag: 'iframe', attrs: { src: 'https://www.youtube-nocookie.com/embed/x' } },
  { tag: 'video', attrs: { src: 'https://media.example.com/v.mp4' } },
  { tag: 'source', attrs: { src: 'https://media2.example.com/v.webm' } },
  { tag: 'form', attrs: { action: 'https://pay.example.com/checkout' } },
  { tag: 'style', attrs: {}, text: '.a{}' },
  { tag: 'a', attrs: { href: 'javascript:void(0)' } },
]);

test('resourcesFromDocument reads every resource-bearing element and counts inline code', () => {
  const { resources, inline } = resourcesFromDocument(DOC, 'https://shop.example.org/page');
  const flat = resources.map(r => `${r.type} ${r.url}`);
  for (const want of [
    'script https://js.stripe.com', 'script https://shop.example.org', 'script https://www.googletagmanager.com',
    'style https://fonts.googleapis.com', 'font https://fonts.gstatic.com', 'img https://images.example.com', 'img https://cdn2.example.com',
    'frame https://www.youtube-nocookie.com', 'media https://media.example.com', 'media https://media2.example.com', 'form https://pay.example.com',
  ]) assert.ok(flat.includes(want), `${want} in ${JSON.stringify(flat)}`);
  assert.ok(!flat.some(f => f.includes('favicon') || f.includes('javascript')));
  assert.deepEqual(inline, { scripts: 1, styles: 1 });
});

test('proposeConfig recognises services, drops same-origin, and sends the rest to custom', () => {
  const { resources } = resourcesFromDocument(DOC, 'https://shop.example.org/page');
  const p = proposeConfig(resources, 'https://shop.example.org');
  assert.deepEqual(p.integrations, ['stripe', 'ga4', 'youtube', 'google-fonts']);
  assert.equal(p.sameOrigin, 2, 'the /app.js script and the /b.png srcset image');
  assert.deepEqual(p.custom.img, ['https://images.example.com', 'https://cdn2.example.com']);
  assert.deepEqual([...p.custom.media].sort(), ['https://media.example.com', 'https://media2.example.com']);
  assert.deepEqual(p.custom.form, ['https://pay.example.com']);
  assert.deepEqual(p.custom.script, []);
});

test('proposeConfig treats "other" resources by trying every kind, and ignores unknown leftovers', () => {
  const p = proposeConfig([{ url: 'https://widget.intercom.io', type: 'other' }, { url: 'https://x.example.com', type: 'other' }], 'https://a.com');
  assert.deepEqual(p.integrations, ['intercom']);
  assert.deepEqual(p.unsorted, ['https://x.example.com']);
});

const GENERATED = "default-src 'self'; script-src 'self' 'nonce-{$nonce}' https://js.stripe.com; upgrade-insecure-requests";
const ids = r => r.map(f => `${f.level} ${f.id}`);

test('gradeHeaders flags duplicates, leaks, missing headers and size', () => {
  const r = gradeHeaders([
    ['content-security-policy', "default-src 'self'; script-src 'self' 'nonce-abc'"],
    ['content-security-policy', 'upgrade-insecure-requests'],
    ['x-powered-by', 'PHP/8.1.2'],
    ['server', 'nginx/1.25.3'],
  ], GENERATED);
  const got = ids(r);
  for (const want of ['warn csp-duplicate', 'bad x-powered-by', 'warn server-version', 'warn hsts', 'warn nosniff', 'warn referrer-policy']) {
    assert.ok(got.includes(want), `${want} in ${JSON.stringify(got)}`);
  }
});

test('gradeHeaders reports a missing CSP as bad', () => {
  assert.ok(ids(gradeHeaders([], GENERATED)).includes('bad csp-missing'));
});

test('gradeHeaders diffs the live policy against the generated one, ignoring nonce values', () => {
  const r = gradeHeaders([
    ['content-security-policy', "default-src 'self'; script-src 'self' 'nonce-Zx9' https://cdn.old.com; upgrade-insecure-requests"],
    ['strict-transport-security', 'max-age=31536000'], ['x-content-type-options', 'nosniff'], ['referrer-policy', 'no-referrer'], ['server', 'cloudflare'],
  ], GENERATED);
  const diff = r.find(f => f.id === 'diff-script-src');
  assert.ok(diff.text.includes('https://cdn.old.com'));
  assert.ok(diff.text.includes('https://js.stripe.com'));
  assert.ok(!r.some(f => f.id === 'server-version'));
  assert.ok(r.some(f => f.level === 'ok' && f.id === 'hsts'));
});

test('gradeHeaders says when the live policy matches', () => {
  const r = gradeHeaders([['content-security-policy', GENERATED.replace('{$nonce}', 'abc')]], GENERATED);
  assert.ok(r.some(f => f.id === 'diff-none' && f.level === 'ok'));
});

test('gradeHeaders flags an oversized policy', () => {
  const big = "default-src 'self'; img-src " + Array.from({ length: 300 }, (_, i) => `https://h${i}.example-long-host.com`).join(' ');
  assert.ok(gradeHeaders([['content-security-policy', big]], GENERATED).some(f => f.id === 'csp-size' && f.level !== 'ok'));
});
