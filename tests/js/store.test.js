import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../assets/js/store.js';

function setup() {
  const saved = [];
  const store = createStore({ save: s => saved.push(structuredClone(s)) });
  let notified = 0;
  store.onChange(() => notified++);
  store.applyPreset('standard');
  store.update(s => { s.integrations.push('stripe'); }, 'standard');
  return { store, saved, notified: () => notified };
}

test('update and applyPreset change state, keep the preset name and notify', () => {
  const { store, notified } = setup();
  assert.equal(store.preset, 'standard');
  assert.ok(store.state.integrations.includes('stripe'));
  assert.equal(notified(), 2);
});

test('reset then undo restores the state and the preset', () => {
  const { store, saved, notified } = setup();
  const before = structuredClone(store.state);
  store.reset();
  assert.ok(!store.state.integrations.includes('stripe'));
  assert.equal(store.canUndo, true);
  const calls = notified();
  const savesBefore = saved.length;
  assert.equal(store.undo(), true);
  assert.deepEqual(store.state, before);
  assert.equal(store.preset, 'standard');
  assert.equal(notified(), calls + 1);
  assert.equal(saved.length, savesBefore + 1, 'the restored state is saved');
  assert.equal(store.canUndo, false);
  assert.equal(store.undo(), false, 'only once');
});

test('a change after reset drops the undo, so newer work is never thrown away', () => {
  const { store } = setup();
  store.reset();
  store.update(s => { s.reporting = false; });
  assert.equal(store.canUndo, false);
  assert.equal(store.undo(), false);
  assert.equal(store.state.reporting, false);
});

test('the reset snapshot is a copy, not shared with the live state', () => {
  const { store } = setup();
  store.reset();
  store.state.integrations.push('paypal');
  store.undo();
  assert.ok(!store.state.integrations.includes('paypal'));
});

test('applyPreset reports the preset to the onPreset hook', () => {
  const names = [];
  const store = createStore({ save: () => {}, onPreset: n => names.push(n) });
  store.applyPreset('rollout');
  assert.deepEqual(names, ['rollout']);
});
