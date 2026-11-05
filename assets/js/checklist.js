// Config-driven checklist and the Markdown audit summary. Text only: backticks mark code, the UI renders them.
import { INTEGRATION_BY_ID } from './integrations.js';
import { buildDirectives, headerName, scorePolicy, skippedPaths, REPORT_PATH, SIZE_WARN } from './policy.js';

export const CHECKLIST_KEY = 'csp-checklist';

export function checklistItems(state) {
  const items = [];
  const add = (id, level, text) => items.push({ id, level, text });
  const stack = id => state.stack.includes(id);
  const host = id => state.hosting.includes(id);

  if (stack('vite')) add('vite-nonce', 'todo', 'Call `Vite::useCspNonce($nonce)` before `$next($request)` so `@vite` tags carry the nonce');
  add('blade-nonce', 'todo', 'Add `nonce="{{ $cspNonce }}"` to every inline `<script>` and `<style>`, and move `onclick=""` handlers into script files');
  if (stack('livewire') || stack('filament')) add('livewire-nonce', 'todo', "Pass the nonce to Livewire: `@livewireScriptConfig(['nonce' => $cspNonce])`");
  if (stack('inertia')) add('inertia-routes', 'todo', 'Pass the nonce to Ziggy: `@routes(nonce: $cspNonce)`');
  if (stack('alpineCsp')) add('alpine-csp', 'todo', "Import Alpine from `@alpinejs/csp`. It has no arrow functions, template literals or globals in expressions");
  else if (stack('alpine')) add('alpine-csp', 'info', "Switch to `@alpinejs/csp` to drop `'unsafe-eval'` if your expressions are simple");
  if (stack('filament')) add('filament-style', 'warn', "Filament needs `'unsafe-inline'` in `style-src-attr` and `'unsafe-eval'` in `script-src`. Consider a separate, looser policy for the panel path only");
  if (skippedPaths(state).length) add('dashboards-skip', 'info', `No CSP is sent on ${skippedPaths(state).map(p => '`/' + p.replace('*', '') + '`').join(', ')}. Keep those dashboards behind authentication`);
  if (stack('debugbar')) add('debugbar', 'info', 'Debugbar 4.3+ reads `Vite::cspNonce()`. On older versions call `Debugbar::getJavascriptRenderer()->setCspNonce($nonce)`');

  if (host('cloudflare')) {
    add('cloudflare-rocket', 'warn', 'Turn off Cloudflare Rocket Loader: it rewrites script tags and drops their nonce');
    add('cloudflare-email', 'warn', 'Turn off Cloudflare Email Address Obfuscation, or allow its decoder script: it injects a script without your nonce');
  }
  if (host('hostinger')) add('hostinger-header', 'warn', "Hostinger's CDN can add its own `content-security-policy` header. Browsers enforce both, so check the live headers with `curl -sI`");
  if (host('nginxProxy')) add('nginx-buffer', 'warn', `Keep the header under ${SIZE_WARN} bytes or raise \`proxy_buffer_size\`: nginx returns 502 when response headers outgrow it`);
  if (state.fullPageCache) add('full-page-cache', 'warn', 'Register `ReplaceCachedCspNonce` outside your page cache so cached pages get a fresh nonce on every response');

  for (const id of state.integrations) {
    const note = INTEGRATION_BY_ID[id].note;
    if (note) add(`integration-${id}`, 'info', `${INTEGRATION_BY_ID[id].name}: ${note}`);
  }

  if (state.reporting) add('report-route', 'todo', `Register the \`${REPORT_PATH}\` route and \`CspReportController\`, then watch the log for real violations`);
  if (state.reportOnly) add('report-only-window', 'warn', 'Report-only blocks nothing. Run it for one to two weeks, fix what the reports show, then enforce');
  else add('enforce', 'todo', 'Deploy to staging first and click through every page with the browser console open');
  add('verify-headers', 'info', 'After deploying, check the live headers at securityheaders.com');
  return items;
}

const dateOrNotSet = v => v || 'not set';

export function summaryMarkdown(state) {
  const directives = buildDirectives(state, 'production');
  const { score, deductions } = scorePolicy(state);
  const lines = [
    '# Content Security Policy summary',
    '',
    `- Header: \`${headerName(state)}\``,
    `- Mode: ${state.reportOnly ? 'report-only (violations are reported, nothing is blocked)' : 'enforced'}`,
    `- Reporting: ${state.reporting ? `on, to \`${REPORT_PATH}\`` : 'off'}`,
    `- Score: ${score}/100`,
    '',
    '## Rollout',
    '',
    `- Report-only from: ${dateOrNotSet(state.rollout.reportOnlyFrom)}`,
    `- Enforced from: ${dateOrNotSet(state.rollout.enforceFrom)}`,
    '',
    '## Directives',
  ];
  for (const d of directives) {
    lines.push('', `### ${d.name}`, '');
    if (!d.sources.length) lines.push('- No value (flag directive)');
    for (const s of d.sources) for (const r of d.reasons[s]) lines.push(`- \`${s}\`: ${r}`);
  }
  if (deductions.length) {
    lines.push('', '## What lowers the score', '');
    for (const d of deductions) lines.push(`- ${d.label} (-${d.points})`);
  }
  const open = checklistItems(state).filter(i => i.level !== 'info');
  if (open.length) {
    lines.push('', '## Open items', '');
    for (const i of open) lines.push(`- [ ] ${i.text}`);
  }
  return lines.join('\n') + '\n';
}
