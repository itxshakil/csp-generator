import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as F from '../../assets/js/formats.js';
import { buildDirectives } from '../../assets/js/policy.js';
import { CUSTOM_KINDS } from '../../assets/js/state.js';
import { preset } from './helpers.js';
import { INTEGRATIONS, STACK, HOSTING } from '../../assets/js/integrations.js';

const KITCHEN = preset('strict', {
  integrations: INTEGRATIONS.map(i => i.id), stack: STACK.map(s => s.id), hosting: HOSTING.map(h => h.id),
  custom: Object.fromEntries(CUSTOM_KINDS.map(k => [k, ['https://*.x-y.example.com:8443', `https://${k}.example.com`]])),
  embeds: [{ path: 'widget/*', origins: ['https://partner.example.com'] }, { path: 'embed', origins: ['https://a.example.com', 'https://b.example.com'] }],
  fullPageCache: true, viteOrigin: 'https://app.test:5173',
});
const STATES = { strict: preset('strict'), standard: preset('standard'), rollout: preset('rollout'), kitchen: KITCHEN };

const PHP_FILES = ['laravelMiddleware', 'reportController', 'pestTest', 'nonceReplacementMiddleware', 'spatiePreset'];

test('generated PHP files pass php -l', () => {
  const dir = mkdtempSync(join(tmpdir(), 'csp-php-'));
  try {
    for (const [label, state] of Object.entries(STATES)) {
      for (const fn of PHP_FILES) {
        const file = join(dir, `${label}-${fn}.php`);
        writeFileSync(file, F[fn](state));
        execFileSync('php', ['-l', file], { stdio: 'pipe' });
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Runs the generated middleware's policy() under a stub Laravel, so the PHP really produces the policy we show.
function runMiddlewarePolicy(state, env) {
  const dir = mkdtempSync(join(tmpdir(), 'csp-run-'));
  try {
    const src = F.laravelMiddleware(state);
    const stub = `<?php
namespace Illuminate\\Http { class Request {} }
namespace Illuminate\\Support\\Facades { class View {} class Vite {} }
namespace Symfony\\Component\\HttpFoundation { class Response {} }
namespace App\\Http\\Middleware { class ReplaceCachedCspNonce { static function placeholder() { return 'P'; } } }
namespace { function app() { return new class { function environment($e) { return $e === '${env}'; } }; } }
`;
    writeFileSync(join(dir, 'stub.php'), stub);
    writeFileSync(join(dir, 'mw.php'), src);
    writeFileSync(join(dir, 'run.php'), `<?php require 'stub.php'; require 'mw.php';
$m = new App\\Http\\Middleware\\SecureHeadersMiddleware();
$r = new ReflectionMethod($m, 'policy');
echo $r->invoke($m, 'NONCE', null);`);
    return execFileSync('php', [join(dir, 'run.php')], { cwd: dir, encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the middleware builds exactly the policy the Header tab shows, in both environments', () => {
  for (const state of Object.values(STATES)) {
    for (const env of ['production', 'local']) {
      const expected = F.headerValue(state, env).replaceAll('{$nonce}', 'NONCE');
      assert.equal(runMiddlewarePolicy(state, env), expected, env);
    }
  }
});

test('the middleware puts a reason comment on every source line', () => {
  const src = F.laravelMiddleware(KITCHEN);
  const sourceLines = src.split('\n').filter(l => /^\s+(['"]).*\1,/.test(l) && !l.includes('=>'));
  assert.ok(sourceLines.length > 50);
  for (const l of sourceLines) assert.match(l, /, \/\/ \S/, l);
});

test('local-only sources appear only inside the local branch', () => {
  const src = F.laravelMiddleware(KITCHEN);
  for (const l of src.split('\n').filter(l => l.includes('app.test:5173'))) assert.match(l, /^ {20}'/, l);
});

test('embeds and skipped dashboards reach the middleware', () => {
  const src = F.laravelMiddleware(KITCHEN);
  assert.ok(src.includes("'widget/*' => ['https://partner.example.com'],"));
  assert.ok(src.includes("'telescope*'"));
  assert.ok(src.includes('ReplaceCachedCspNonce::placeholder()'));
  assert.ok(!F.laravelMiddleware(STATES.strict).includes('ReplaceCachedCspNonce'));
});

test('meta tag omits frame-ancestors and reporting and uses the Blade nonce', () => {
  const meta = F.metaTag(STATES.standard, 'production');
  assert.ok(!/frame-ancestors|report-uri|report-to/.test(meta.split('\n').filter(l => l.startsWith('<meta')).join('')));
  assert.ok(meta.includes("'nonce-{{ $cspNonce }}'"));
});

test('apache output contains no nonce; nginx output uses $request_id', () => {
  assert.ok(!F.apacheConfig(STATES.standard, 'production').includes('nonce-'));
  assert.ok(F.nginxConfig(STATES.standard, 'production', 'Tok3nSecret').includes("'nonce-$request_id'"));
});

test('report-only state uses the Report-Only header name in server formats', () => {
  for (const fn of ['laravelMiddleware', 'pestTest']) assert.ok(F[fn](STATES.rollout).includes('Content-Security-Policy-Report-Only'), fn);
  for (const fn of ['nginxConfig', 'apacheConfig']) assert.ok(F[fn](STATES.rollout, 'production', 'Tok3nSecret').includes('Content-Security-Policy-Report-Only'), fn);
  assert.ok(F.metaTag(STATES.rollout, 'production').includes('cannot be report-only'));
});

test('spatie preset uses directive constants and nonces', () => {
  const src = F.spatiePreset(STATES.standard);
  assert.ok(src.includes('implements Preset'));
  assert.ok(src.includes('->addNonce(Directive::SCRIPT)'));
  assert.ok(src.includes("Directive::STYLE, [Keyword::SELF, 'https://fonts.googleapis.com']"));
});

test('blade snippets follow the stack', () => {
  assert.ok(F.bladeSnippets(preset('strict', { stack: ['vite', 'livewire', 'inertia'] })).includes("@livewireScriptConfig(['nonce' => $cspNonce])"));
  assert.ok(F.bladeSnippets(preset('strict', { stack: ['inertia'] })).includes('@routes(nonce: $cspNonce)'));
  assert.ok(!F.bladeSnippets(preset('strict')).includes('@livewire'));
});

test('bootstrap registers the nonce replacement before the page cache only when needed', () => {
  assert.ok(F.laravelBootstrap(KITCHEN).includes('ReplaceCachedCspNonce'));
  assert.ok(!F.laravelBootstrap(STATES.strict).includes('ReplaceCachedCspNonce'));
});

test('report route matches the policy', () => {
  assert.ok(F.reportRoute().includes("Route::post('/csp-violation-report'"));
});

test('no output contains an em dash', () => {
  for (const state of Object.values(STATES)) {
    const all = [...PHP_FILES.map(fn => F[fn](state)), F.laravelBootstrap(state), F.bladeSnippets(state), F.reportRoute(),
      F.nginxConfig(state, 'production', 'Tok3nSecret'), F.apacheConfig(state, 'local'), F.metaTag(state, 'production')].join('\n');
    assert.ok(!all.includes('—'));
  }
});

// ── Final review fixes ──────────────────────────────────────────────────────
test('C1: sources in a different order per environment do not hang and still match the Header tab', () => {
  const states = [
    preset('strict', { custom: { script: ['https://cdn.example.com', 'http://localhost:5173'] } }),
    preset('strict', { custom: { connect: ['http://localhost:5173', 'ws://localhost:5173'] } }),
  ];
  for (const state of states) {
    for (const env of ['production', 'local']) {
      assert.equal(runMiddlewarePolicy(state, env), F.headerValue(state, env).replaceAll('{$nonce}', 'NONCE'), env);
    }
  }
});

test('C2: the cached-page placeholder is a secret derived from the app key, and headers are always rewritten', () => {
  const src = F.nonceReplacementMiddleware();
  assert.ok(!src.includes("'csp-nonce-placeholder'"), 'no public constant');
  assert.ok(src.includes("config('app.key')"));
  assert.ok(F.laravelMiddleware(KITCHEN).includes('ReplaceCachedCspNonce::placeholder()'));
  const body = src.slice(src.indexOf('public function handle'));
  assert.ok(body.indexOf('self::HEADERS') < body.indexOf('str_contains($content'), 'headers rewritten before the body check');
});

test('C2: nginx uses the secret placeholder it is given, never a public one', () => {
  const out = F.nginxConfig(STATES.standard, 'production', 'Zq7k2m9x');
  assert.ok(out.includes("sub_filter 'Zq7k2m9x' $request_id;"));
  assert.ok(!out.includes('CSP_NONCE'));
  assert.throws(() => F.nginxConfig(STATES.standard, 'production', 'x"; evil'), /placeholder/);
});

test('I2: HSTS has no includeSubDomains by default', () => {
  assert.ok(F.laravelMiddleware(STATES.strict).includes("'max-age=31536000'"));
  assert.ok(!F.laravelMiddleware(STATES.strict).includes("'max-age=31536000; includeSubDomains'"));
});

test('I3: the Pest size budget follows the size meter', () => {
  assert.ok(F.pestTest(STATES.strict).includes('toBeLessThanOrEqual(8192)'));
  assert.ok(F.pestTest(preset('strict', { hosting: ['nginxProxy'] })).includes('toBeLessThanOrEqual(4096)'));
});

test('I4: spatie output tells the user about embeds and dashboards it cannot express', () => {
  const src = F.spatiePreset(KITCHEN);
  assert.ok(src.includes('/widget/*'));
  assert.ok(src.includes('telescope'));
});

test('C2: ReplaceCachedCspNonce really swaps the secret placeholder in headers and body, and nothing else', () => {
  const dir = mkdtempSync(join(tmpdir(), 'csp-nonce-'));
  try {
    writeFileSync(join(dir, 'mw.php'), F.nonceReplacementMiddleware());
    writeFileSync(join(dir, 'run.php'), `<?php
namespace Illuminate\\Http { class Request {} }
namespace Symfony\\Component\\HttpFoundation {
  class Bag { public array $h = []; function has($k) { return isset($this->h[$k]); } function get($k) { return $this->h[$k] ?? null; } function set($k, $v) { $this->h[$k] = $v; } }
  class Response { public Bag $headers; public function __construct(public $content) { $this->headers = new Bag(); } function getContent() { return $this->content; } function setContent($c) { $this->content = $c; } }
}
namespace { function config($k) { return 'base64:test-app-key'; } }
namespace {
  require 'mw.php';
  $p = App\\Http\\Middleware\\ReplaceCachedCspNonce::placeholder();
  $make = function ($body) use ($p) { $r = new Symfony\\Component\\HttpFoundation\\Response($body); $r->headers->set('Content-Security-Policy', "script-src 'nonce-$p'"); return $r; };
  $mw = new App\\Http\\Middleware\\ReplaceCachedCspNonce();
  $a = $mw->handle(new Illuminate\\Http\\Request(), fn () => $make("<script nonce=\\"$p\\"></script><script nonce=\\"csp-nonce-placeholder\\"></script>"));
  $b = $mw->handle(new Illuminate\\Http\\Request(), fn () => $make('no inline code'));
  echo json_encode(['p' => $p, 'aBody' => $a->content, 'aHdr' => $a->headers->get('Content-Security-Policy'), 'bHdr' => $b->headers->get('Content-Security-Policy')]);
}`);
    const r = JSON.parse(execFileSync('php', [join(dir, 'run.php')], { cwd: dir, encoding: 'utf8' }));
    assert.match(r.p, /^[0-9a-f]{64}$/);
    const nonce = r.aHdr.match(/'nonce-([^']+)'/)[1];
    assert.notEqual(nonce, r.p);
    assert.ok(r.aBody.includes(`nonce="${nonce}"`), 'body rewritten with the header nonce');
    assert.ok(r.aBody.includes('nonce="csp-nonce-placeholder"'), 'a guessed public string is not rewritten');
    assert.ok(!r.bHdr.includes(r.p), 'header rewritten even when the body has no placeholder');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
