import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsEnabled } from '../../assets/js/env.js';

test('analytics only on the production host', () => {
  assert.equal(analyticsEnabled('csp-generator.shakiltech.com', ''), true);
  assert.equal(analyticsEnabled('csp-generator.test', ''), false);
  assert.equal(analyticsEnabled('localhost', ''), false);
});

test('analytics can be forced on for testing', () => {
  assert.equal(analyticsEnabled('csp-generator.test', '?analytics=on'), true);
});
