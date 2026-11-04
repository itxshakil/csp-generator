import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanBlade } from '../../assets/js/blade-scan.js';

const kinds = r => r.map(f => `${f.line}:${f.kind}`);

test('finds each kind with its line number', () => {
  const blade = [
    '<x-layout>',                                   // 1
    '<script>window.x = 1</script>',                // 2
    '<style>.a{color:red}</style>',                 // 3
    '<button onclick="go()">Go</button>',           // 4
    '<div style="color:red">x</div>',               // 5
    '<a href="javascript:void(0)">x</a>',           // 6
    '<form action="javascript:send()"></form>',     // 7
    '<script type="module">import x from "y"</script>', // 8
  ].join('\n');
  assert.deepEqual(kinds(scanBlade(blade)), ['2:inline-script', '3:inline-style', '4:handler', '5:style-attr', '6:js-url', '7:js-url', '8:inline-script']);
});

test('nothing safe is flagged', () => {
  const blade = [
    '<script nonce="{{ $cspNonce }}">window.ok = 1</script>',
    '<script type="application/ld+json">{"@context":"https://schema.org"}</script>',
    '<script src="/app.js"></script>',
    '<style nonce="{{ $cspNonce }}">.a{}</style>',
    '<button x-on:click="open = true" @click="go" wire:click="save">x</button>',
    '<div :style="{ color: c }" x-bind:style="s">x</div>',
    '<a href="https://example.com/javascript:x">x</a>',
    '<input data-onclick="x">',
  ].join('\n');
  assert.deepEqual(scanBlade(blade), []);
});

test('a multi-line tag reports the line where it starts', () => {
  const blade = 'a\n<script\n  type="module"\n>\nrun()\n</script>';
  assert.deepEqual(kinds(scanBlade(blade)), ['2:inline-script']);
});

test('Blade and HTML comments are skipped but keep line numbers', () => {
  const blade = '{{-- <script>bad()</script>\n<b onclick="x"> --}}\n<!-- <div style="a"> -->\n<i onmouseover="y">';
  assert.deepEqual(kinds(scanBlade(blade)), ['4:handler']);
});

test('attributes in single quotes and without quotes are found; > inside quotes does not end the tag', () => {
  const blade = `<img onerror='a()' src=x>\n<div title="a > b" style=color:red>`;
  assert.deepEqual(kinds(scanBlade(blade)), ['1:handler', '2:style-attr']);
});

test('fix text points at the right remedy and results carry file and snippet', () => {
  const r = scanBlade('<script>x()</script>\n<b onclick="y()">', 'resources/views/app.blade.php');
  assert.ok(r[0].fix.includes('nonce'));
  assert.ok(r[1].fix.includes('addEventListener'));
  assert.equal(r[0].file, 'resources/views/app.blade.php');
  assert.equal(r[1].snippet, '<b onclick="y()">');
});

test('snippets are capped at 120 characters', () => {
  const r = scanBlade(`<b onclick="${'x'.repeat(300)}">`);
  assert.ok(r[0].snippet.length <= 120);
});
