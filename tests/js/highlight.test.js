import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightPolicy } from '../../assets/js/highlight.js';

const text = html => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const POLICY = "default-src 'self'; script-src 'self' 'nonce-{$nonce}' https://cdn.jsdelivr.net https://*.tawk.to; style-src-attr 'none'; connect-src 'self' wss://*.tawk.to; upgrade-insecure-requests; report-uri /api/csp-violation-report";

test('highlighting never changes the text', () => {
  assert.equal(text(highlightPolicy(POLICY)), POLICY);
});

test('each part gets its class', () => {
  const html = highlightPolicy(POLICY);
  assert.ok(html.includes('<span class="sk">script-src</span>'));
  assert.ok(html.includes('<span class="sv">\'self\'</span>'));
  assert.ok(html.includes('<span class="sb">\'none\'</span>'));
  assert.ok(html.includes('<span class="sn">\'nonce-{$nonce}\'</span>'));
  assert.ok(html.includes('<span class="su">https://*.tawk.to</span>'));
  assert.ok(html.includes('<span class="su">wss://*.tawk.to</span>'));
  assert.ok(html.includes('<span class="su">/api/csp-violation-report</span>'));
  assert.ok(html.includes('<span class="sk">upgrade-insecure-requests</span>'));
});

test('user values are escaped', () => {
  const html = highlightPolicy('img-src https://x.com/<img>');
  assert.ok(!html.includes('<img>'));
  assert.equal(text(html), 'img-src https://x.com/<img>');
});
