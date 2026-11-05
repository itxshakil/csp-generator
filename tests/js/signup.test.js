import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailError } from '../../assets/js/signup.js';

test('a blank email asks for one', () => {
  assert.equal(emailError(''), 'Enter your email address.');
  assert.equal(emailError('   '), 'Enter your email address.');
});

test('a malformed email says so', () => {
  assert.equal(emailError('me@home'), 'That does not look like an email address.');
  assert.equal(emailError('a b@c.co'), 'That does not look like an email address.');
});

test('a valid email has no error, spaces around it are fine', () => {
  assert.equal(emailError('you@yourapp.com'), '');
  assert.equal(emailError('  a@b.co  '), '');
});
