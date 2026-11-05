import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeBelow } from '../../assets/js/tooltip.js';

const VIEW = { width: 1280, height: 800 };

test('the tooltip sits centred below its trigger', () => {
  const trigger = { top: 100, bottom: 120, left: 500, width: 100 };
  assert.deepEqual(placeBelow(trigger, { width: 200, height: 60 }, VIEW), { top: 126, left: 450 });
});

test('the tooltip stays inside a narrow viewport on the right', () => {
  const trigger = { top: 100, bottom: 120, left: 300, width: 20 };
  assert.deepEqual(placeBelow(trigger, { width: 200, height: 60 }, { width: 320, height: 640 }), { top: 126, left: 112 });
});

test('the tooltip stays inside the viewport on the left', () => {
  const trigger = { top: 100, bottom: 120, left: 0, width: 20 };
  assert.equal(placeBelow(trigger, { width: 200, height: 60 }, VIEW).left, 8);
});

test('the tooltip flips above a trigger near the bottom', () => {
  const trigger = { top: 760, bottom: 780, left: 500, width: 100 };
  assert.equal(placeBelow(trigger, { width: 200, height: 60 }, VIEW).top, 760 - 60 - 6);
});
