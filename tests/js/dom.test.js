import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceKeyed } from '../../assets/js/dom.js';

const node = key => ({ key, classes: new Set(), classList: { add(c) { this.owner.classes.add(c); } } });
const make = keys => keys.map(k => { const n = node(k); n.classList.owner = n; return n; });
const container = () => ({ dataset: {}, children: [], replaceChildren(...n) { this.children = n; } });
const keyOf = n => n.key;

test('the first render marks nothing as new', () => {
  const c = container();
  replaceKeyed(c, make(['a', 'b']), keyOf);
  assert.deepEqual(c.children.map(n => n.classes.has('is-new')), [false, false]);
});

test('later renders mark only the items that were not there before', () => {
  const c = container();
  replaceKeyed(c, make(['a', 'b']), keyOf);
  replaceKeyed(c, make(['a', 'c', 'b']), keyOf);
  assert.deepEqual(c.children.map(n => n.classes.has('is-new')), [false, true, false]);
});
