import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, DEFAULT_STATE, buildDirectives, policyString, score, grade } from '../../assets/js/policy.js';

const withPreset = (name, extra = {}) => ({ ...structuredClone(DEFAULT_STATE), ...PRESETS[name], ...extra });

test('strict preset matches the pre-split output', () => {
  assert.equal(policyString(buildDirectives(withPreset('strict'))),
    "default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'nonce-{$nonce}'; style-src-elem 'self' 'nonce-{$nonce}'; style-src-attr 'none'; font-src 'self' data:; img-src 'self' data:; frame-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /api/csp-violation-report");
});

test('standard preset score and grade', () => {
  assert.equal(score(withPreset('standard')), 100);
  assert.deepEqual(grade(100), { label: 'A+', cls: 'grade-a' });
});
