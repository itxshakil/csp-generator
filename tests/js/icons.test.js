import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iconSvg } from '../../assets/js/icons.js';

const php = readFileSync(new URL('../../lib/icons.php', import.meta.url), 'utf8');

test('script icons draw the same shapes as the PHP icons', () => {
  for (const name of ['x', 'check', 'copy']) {
    const shape = new RegExp(`'${name}'\\s*=> '([^']+)'`).exec(php)[1];
    assert.ok(iconSvg(name).includes(shape), name);
  }
});

test('script icons are decorative', () => {
  assert.match(iconSvg('check', 'icon ok'), /^<svg class="icon ok" [^>]*aria-hidden="true" focusable="false"/);
  assert.throws(() => iconSvg('nope'), /Unknown icon/);
});
