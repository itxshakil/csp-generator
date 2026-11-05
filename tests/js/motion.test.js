import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTransition, prefersReducedMotion } from '../../assets/js/motion.js';

const win = reduced => ({ matchMedia: q => ({ matches: reduced && q === '(prefers-reduced-motion: reduce)' }) });

test('reduced motion is read from the media query', () => {
  assert.equal(prefersReducedMotion(win(true)), true);
  assert.equal(prefersReducedMotion(win(false)), false);
  assert.equal(prefersReducedMotion({}), false);
});

test('without View Transitions the update runs once, directly', () => {
  let calls = 0;
  withTransition(() => calls++, {}, win(false));
  assert.equal(calls, 1);
});

test('under reduced motion the update runs directly, without a transition', () => {
  let calls = 0;
  let started = 0;
  const doc = { startViewTransition: fn => { started++; fn(); } };
  withTransition(() => calls++, doc, win(true));
  assert.deepEqual([calls, started], [1, 0]);
});

test('with View Transitions and motion allowed the update runs inside one', () => {
  let calls = 0;
  let given;
  const doc = { startViewTransition(fn) { given = fn; fn(); } };
  const update = () => calls++;
  withTransition(update, doc, win(false));
  assert.equal(given, update);
  assert.equal(calls, 1);
});
