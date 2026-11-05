import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortcutFor } from '../../assets/js/shortcuts.js';

const page = { tagName: 'BODY', isContentEditable: false };
const key = (k, extra = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, target: page, ...extra });

test('number keys switch output tabs', () => {
  assert.deepEqual(shortcutFor(key('1'), false), { type: 'tab', tab: 'header' });
  assert.deepEqual(shortcutFor(key('2'), false), { type: 'tab', tab: 'laravel' });
  assert.deepEqual(shortcutFor(key('5'), false), { type: 'tab', tab: 'summary' });
  assert.equal(shortcutFor(key('6'), false), null);
  assert.equal(shortcutFor(key('9'), false), null);
});

test('c copies, / searches, ? shows help', () => {
  assert.deepEqual(shortcutFor(key('c'), false), { type: 'copy' });
  assert.deepEqual(shortcutFor(key('/'), false), { type: 'search' });
  assert.deepEqual(shortcutFor(key('?'), false), { type: 'help' });
  assert.equal(shortcutFor(key('C'), false), null, 'Shift+C is not a shortcut');
});

test('typing in a field never triggers a shortcut', () => {
  for (const target of [{ tagName: 'INPUT', type: 'text' }, { tagName: 'INPUT', type: 'date' }, { tagName: 'INPUT', type: 'checkbox' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { tagName: 'DIV', isContentEditable: true }]) {
    assert.equal(shortcutFor(key('1', { target }), false), null, JSON.stringify(target));
    assert.equal(shortcutFor(key('/', { target }), false), null);
  }
});

test('modifier keys and open dialogs turn shortcuts off', () => {
  assert.equal(shortcutFor(key('c', { metaKey: true }), false), null);
  assert.equal(shortcutFor(key('c', { ctrlKey: true }), false), null);
  assert.equal(shortcutFor(key('1', { altKey: true }), false), null);
  assert.equal(shortcutFor(key('1'), true), null);
});
