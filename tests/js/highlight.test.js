import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightDirectives, escapeHtml } from '../../assets/js/highlight.js';
import { buildDirectives, policyString } from '../../assets/js/policy.js';
import { DEFAULT_STATE, sanitizeState } from '../../assets/js/state.js';

const text = html => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const STATE = sanitizeState({ ...structuredClone(DEFAULT_STATE), integrations: ['tawk'], stack: ['livewire'] });
const DIRS = buildDirectives(STATE);

test('highlighting never changes the text', () => {
  assert.equal(text(highlightDirectives(DIRS)), policyString(DIRS));
});

test('each part gets its class', () => {
  const html = highlightDirectives(DIRS);
  assert.match(html, /<span class="sk">script-src<\/span>/);
  assert.match(html, /<span class="sv" tabindex="0" data-tip="[^"]*">&#39;self&#39;<\/span>/);
  assert.match(html, /<span class="sb" tabindex="0" data-tip="[^"]*">&#39;none&#39;<\/span>/);
  assert.match(html, /<span class="sb" tabindex="0" data-tip="[^"]*">&#39;unsafe-eval&#39;<\/span>/);
  assert.match(html, /<span class="sn" tabindex="0" data-tip="[^"]*">&#39;nonce-\{\$nonce\}&#39;<\/span>/);
  assert.match(html, /<span class="su" tabindex="0" data-tip="[^"]*">wss:\/\/\*\.tawk\.to<\/span>/);
  assert.match(html, /<span class="sk">upgrade-insecure-requests<\/span>/);
});

test('each source carries its reasons for the tooltip, not a title', () => {
  const html = highlightDirectives(DIRS);
  assert.ok(html.includes('data-tip="Tawk.to: Live chat connection"'));
  assert.ok(!html.includes('title='));
});

test('a source with several reasons lists them all, one per line', () => {
  const html = highlightDirectives([{ name: 'img-src', sources: ['https://a.com'], reasons: { 'https://a.com': ['One: x', 'Two: y'] } }]);
  assert.ok(html.includes('data-tip="One: x\nTwo: y"'));
});

test('a source without reasons is plain text, not a focus stop', () => {
  const html = highlightDirectives([{ name: 'img-src', sources: ['https://a.com'], reasons: {} }]);
  assert.equal(html, '<span class="sk">img-src</span> <span class="su">https://a.com</span>');
});

test('values and reasons are escaped', () => {
  const html = highlightDirectives([{ name: 'img-src', sources: ['https://x.com/<img>'], reasons: { 'https://x.com/<img>': ['a "b" <c>'] } }]);
  assert.ok(!html.includes('<img>'));
  assert.ok(!html.includes('"b"'));
  assert.equal(text(html), 'img-src https://x.com/<img>');
});

test('escapeHtml escapes quotes for attributes', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;');
});
