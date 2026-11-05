import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePolicy, importPolicy } from '../../assets/js/parse.js';
import { headerValue } from '../../assets/js/formats.js';
import { headerName } from '../../assets/js/policy.js';
import { CUSTOM_KINDS } from '../../assets/js/state.js';
import { preset } from './helpers.js';


test('parsePolicy reads a bare value, a header line, a report-only line and a meta tag', () => {
  const value = "default-src 'self'; script-src 'self' https://a.com";
  const expected = [{ name: 'default-src', sources: ["'self'"] }, { name: 'script-src', sources: ["'self'", 'https://a.com'] }];
  assert.deepEqual(parsePolicy(value), { reportOnly: false, directives: expected });
  assert.deepEqual(parsePolicy(`Content-Security-Policy: ${value}`), { reportOnly: false, directives: expected });
  assert.deepEqual(parsePolicy(`content-security-policy-report-only:  ${value};`), { reportOnly: true, directives: expected });
  assert.deepEqual(parsePolicy(`<meta http-equiv="Content-Security-Policy" content="${value}">`), { reportOnly: false, directives: expected });
});

test('duplicate directives keep the first, names are lowercased', () => {
  assert.deepEqual(parsePolicy('Script-Src https://a.com; script-src https://b.com').directives, [{ name: 'script-src', sources: ['https://a.com'] }]);
});

test("importPolicy round-trips the generator's own output", () => {
  const states = [
    preset('standard'),
    preset('rollout', {
      integrations: ['stripe', 'tawk', 'google-maps'],
      custom: Object.fromEntries(CUSTOM_KINDS.map(k => [k, [`https://${k}.example.com`]])),
    }),
  ];
  for (const s of states) {
    const r = importPolicy(`${headerName(s)}: ${headerValue(s)}`);
    assert.deepEqual(r.state.integrations, s.integrations);
    assert.equal(r.state.reportOnly, s.reportOnly);
    assert.equal(r.state.reporting, s.reporting);
    assert.deepEqual(r.state.custom, s.custom);
  }
});

test('a partial integration is not matched; its hosts go to custom', () => {
  const r = importPolicy("script-src 'self' https://js.stripe.com");
  assert.deepEqual(r.matched, []);
  assert.deepEqual(r.state.custom.script, ['https://js.stripe.com']);
});

test('unknown directives and keywords are kept', () => {
  const r = importPolicy("script-src 'self' 'strict-dynamic' 'sha256-abc='; sandbox allow-forms; trusted-types default");
  const flat = r.unknown.map(u => `${u.directive} ${u.sources.join(' ')}`.trim());
  assert.ok(flat.includes("script-src 'strict-dynamic' 'sha256-abc='"), JSON.stringify(flat));
  assert.ok(flat.includes('sandbox allow-forms'));
  assert.ok(flat.includes('trusted-types default'));
});

test('hostile input never reaches state', () => {
  const r = importPolicy('script-src https://a.com <img src=x onerror=alert(1)>');
  assert.deepEqual(r.state.custom.script, ['https://a.com']);
  assert.ok(r.unknown.some(u => u.sources.some(s => s.includes('onerror'))));
});

test("style-src-attr 'unsafe-inline' sets inline style attributes; unsafe-eval adds a note", () => {
  const r = importPolicy("script-src 'self' 'unsafe-eval'; style-src-attr 'unsafe-inline'");
  assert.equal(r.state.inlineStyleAttrs, true);
  assert.ok(r.notes.some(n => n.includes("'unsafe-eval'")));
});

test('script-src-elem and child-src map to their kinds', () => {
  const r = importPolicy('script-src-elem https://s.example.com; child-src https://f.example.com');
  assert.deepEqual(r.state.custom.script, ['https://s.example.com']);
  assert.deepEqual(r.state.custom.frame, ['https://f.example.com']);
});

test('reporting and report-only are read back', () => {
  assert.equal(importPolicy("default-src 'self'").state.reporting, false);
  assert.equal(importPolicy("default-src 'self'; report-uri /x").state.reporting, true);
});

test('I3: host sources without a scheme are read as https and matched', () => {
  const r = importPolicy("script-src 'self' www.googletagmanager.com cdn.example.com; img-src *.google-analytics.com *.analytics.google.com *.googletagmanager.com; connect-src *.google-analytics.com *.analytics.google.com *.googletagmanager.com");
  assert.deepEqual(r.matched, ['ga4']);
  assert.deepEqual(r.state.custom.script, ['https://cdn.example.com']);
  assert.deepEqual(r.unknown, []);
});

test("I3: GitHub-style scheme-less hosts go to custom, not unknown", () => {
  const r = importPolicy("default-src 'none'; connect-src 'self' api.github.com github.githubassets.com; img-src 'self' data: avatars.githubusercontent.com");
  assert.deepEqual(r.state.custom.connect, ['https://api.github.com', 'https://github.githubassets.com']);
  assert.deepEqual(r.state.custom.img, ['https://avatars.githubusercontent.com']);
});

test('I3: two policies joined by a comma import the first, with a note', () => {
  const r = importPolicy("script-src 'self' a.example.com, default-src 'self'; img-src b.example.com");
  assert.deepEqual(r.state.custom.script, ['https://a.example.com']);
  assert.deepEqual(r.state.custom.img, []);
  assert.ok(r.notes.some(n => n.includes('more than one policy')));
  assert.ok(!JSON.stringify(r.unknown).includes(','));
});
