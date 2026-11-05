import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../assets/app.css', import.meta.url), 'utf8');
const root = /:root\s*\{([^}]*)\}/.exec(css)[1];

test('the page declares both color schemes', () => {
  assert.match(root, /color-scheme:\s*light dark/);
});

test('every palette color has a light and a dark value', () => {
  for (const name of ['bg', 'white', 'surface', 'border', 'border2', 'red', 'red-bg', 'red-border', 'dark', 'mid', 'light', 'light2', 'green', 'green-bg', 'amber', 'blue']) {
    assert.match(root, new RegExp(`--${name}:\\s*light-dark\\(`), `--${name}`);
  }
});

test('dark mode comes from light-dark(), not media queries', () => {
  assert.doesNotMatch(css, /prefers-color-scheme/);
});
