import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceDiff, removedNote } from '../../assets/js/diff.js';
import { buildDirectives } from '../../assets/js/policy.js';
import { highlightDirectives } from '../../assets/js/highlight.js';
import { DEFAULT_STATE, sanitizeState } from '../../assets/js/state.js';

const state = integrations => sanitizeState({ ...structuredClone(DEFAULT_STATE), integrations });
const BASE = buildDirectives(state([]));
const STRIPE = buildDirectives(state(['stripe']));

test('the first render has nothing to highlight', () => {
  assert.deepEqual(sourceDiff(null, BASE), { added: new Set(), removed: [] });
});

test('turning a service on marks its sources as added', () => {
  const { added, removed } = sourceDiff(BASE, STRIPE);
  assert.ok(added.has('script-src https://js.stripe.com'));
  assert.ok(added.has('frame-src https://js.stripe.com'));
  assert.ok(![...added].some(k => k.startsWith('default-src')));
  assert.deepEqual(removed, []);
});

test('turning it off lists its sources as removed', () => {
  const { added, removed } = sourceDiff(STRIPE, BASE);
  assert.equal(added.size, 0);
  assert.ok(removed.includes('script-src https://js.stripe.com'));
});

test('nonce sources are ignored', () => {
  const a = [{ name: 'script-src', sources: ["'self'", "'nonce-a'"], reasons: {} }];
  const b = [{ name: 'script-src', sources: ["'self'", "'nonce-b'"], reasons: {} }];
  assert.deepEqual(sourceDiff(a, b), { added: new Set(), removed: [] });
});

test('added sources get a highlight class, others do not', () => {
  const html = highlightDirectives(STRIPE, new Set(['script-src https://js.stripe.com']));
  assert.match(html, /<span class="su src-added"[^>]*>https:\/\/js\.stripe\.com<\/span>/);
  assert.equal((html.match(/src-added/g) ?? []).length, 1);
});

test('the removed note names up to five sources, then counts the rest', () => {
  assert.equal(removedNote([]), '');
  assert.equal(removedNote(['script-src https://a.com', 'frame-src https://a.com', 'img-src https://b.com']), 'Removed: https://a.com, https://b.com');
  const many = ['1', '2', '3', '4', '5', '6', '7'].map(n => `img-src https://${n}.com`);
  assert.equal(removedNote(many), 'Removed: https://1.com, https://2.com, https://3.com, https://4.com, https://5.com and 2 more');
});
