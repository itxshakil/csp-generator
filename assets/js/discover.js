// Turns what a live page loads into a proposed config, and grades a site's live security headers.
// Works on any document-like object, so the browser passes a DOMParser document and the tests a fake.
import { INTEGRATIONS } from './integrations.js';
import { findIntegration, parsePolicy } from './parse.js';
import { covers, urlOrigin } from './sources.js';
import { CUSTOM_KINDS } from './state.js';
import { sizeLevel } from './policy.js';

const PRELOAD_AS = { script: 'script', style: 'style', font: 'font', image: 'img', fetch: 'connect', audio: 'media', video: 'media', document: 'frame' };
const EXECUTABLE = new Set(['', 'text/javascript', 'application/javascript', 'module', 'importmap']);
// Two services share one host; the path tells them apart.
const PATH_HINTS = [[/^https:\/\/www\.googletagmanager\.com\/gtag\//, 'ga4'], [/^https:\/\/www\.googletagmanager\.com\/gtm\.js/, 'gtm']];


export function resourcesFromDocument(doc, baseUrl) {
  const found = new Map();
  const add = (value, type) => {
    const o = value ? urlOrigin(value.trim(), baseUrl) : null;
    if (!o) return;
    const key = `${type} ${o.origin}`;
    const hint = PATH_HINTS.find(([re]) => re.test(o.href))?.[1];
    if (!found.has(key) || hint) found.set(key, { url: o.origin, type, ...(hint ? { hint } : {}) });
  };
  const all = sel => [...doc.querySelectorAll(sel)];
  const srcset = v => (v ?? '').split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean);

  all('script[src]').forEach(el => add(el.getAttribute('src'), 'script'));
  all('link[rel~=stylesheet][href]').forEach(el => add(el.getAttribute('href'), 'style'));
  all('link[rel~=preload][href]').forEach(el => add(el.getAttribute('href'), PRELOAD_AS[el.getAttribute('as')] ?? 'connect'));
  all('link[rel~=modulepreload][href]').forEach(el => add(el.getAttribute('href'), 'script'));
  all('img[src]').forEach(el => add(el.getAttribute('src'), 'img'));
  all('img[srcset]').forEach(el => srcset(el.getAttribute('srcset')).forEach(u => add(u, 'img')));
  all('source[src]').forEach(el => add(el.getAttribute('src'), 'media'));
  all('source[srcset]').forEach(el => srcset(el.getAttribute('srcset')).forEach(u => add(u, 'img')));
  all('video[src]').forEach(el => add(el.getAttribute('src'), 'media'));
  all('audio[src]').forEach(el => add(el.getAttribute('src'), 'media'));
  all('iframe[src]').forEach(el => add(el.getAttribute('src'), 'frame'));
  all('form[action]').forEach(el => add(el.getAttribute('action'), 'form'));

  const inline = {
    scripts: all('script').filter(el => !el.hasAttribute('src') && !el.hasAttribute('nonce') && EXECUTABLE.has((el.getAttribute('type') ?? '').trim().toLowerCase())).length,
    styles: [...all('style'), ...all('x-csp-style')].filter(el => !el.hasAttribute('nonce')).length,
  };
  return { resources: [...found.values()], inline };
}

const OPEN_TAG = /<([a-zA-Z][\w:.-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)(\s*\/?)>/g;
const ATTR = /(\s+)([^\s=>/]+)((?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)/g;

// Chromium applies our page's CSP to documents built with DOMParser and reports their inline styles as
// violations, although nothing is applied. Renaming style elements and attributes first keeps the parse
// silent; resourcesFromDocument still counts the renamed elements.
export function inertHtml(html) {
  return String(html ?? '')
    .replace(OPEN_TAG, (tag, name, attrs, end) => {
      const renamed = name.toLowerCase() === 'style' ? 'x-csp-style' : name;
      const safeAttrs = attrs.replace(ATTR, (a, space, key, value) => (key.toLowerCase() === 'style' ? `${space}data-csp-style${value}` : a));
      return `<${renamed}${safeAttrs}${end}>`;
    })
    .replace(/<\/style\s*>/gi, '</x-csp-style>');
}

const KINDS = ['script', 'style', 'font', 'img', 'media', 'frame', 'connect', 'form', 'worker'];

export function proposeConfig(resources, pageOrigin) {
  const chosen = new Set();
  const custom = Object.fromEntries(CUSTOM_KINDS.map(k => [k, []]));
  const unsorted = [];
  const explainedBy = (kind, url) => INTEGRATIONS.some(i => chosen.has(i.id) && (i.sources[kind] ?? []).some(([s]) => s === url || covers(s, url)));

  const outside = resources.filter(r => r.url !== pageOrigin);
  const sameOrigin = resources.length - outside.length;
  // Hints and direct matches first, so later resources can be explained by an integration already chosen.
  for (const r of outside) {
    if (r.hint) { chosen.add(r.hint); continue; }
    if (explainedBy(r.type, r.url)) continue;
    const kinds = r.type === 'other' ? KINDS : [r.type];
    const match = kinds.map(k => findIntegration(k, r.url)).find(Boolean);
    if (match) chosen.add(match.id);
  }
  for (const r of outside) {
    const kinds = r.type === 'other' ? KINDS : [r.type];
    if (kinds.some(k => explainedBy(k, r.url))) continue;
    if (CUSTOM_KINDS.includes(r.type)) {
      if (!custom[r.type].includes(r.url)) custom[r.type].push(r.url);
    } else if (!unsorted.includes(r.url)) {
      unsorted.push(r.url);
    }
  }
  return { integrations: INTEGRATIONS.map(i => i.id).filter(id => chosen.has(id)), custom, sameOrigin, unsorted };
}

// ── Grading live headers ────────────────────────────────────────────────────
const normalizeNonce = s => (/^'nonce-[^']*'$/i.test(s) ? "'nonce'" : s);
const bytes = text => new TextEncoder().encode(text).length;

function diffPolicies(live, generated) {
  const a = parsePolicy(live).directives;
  const b = parsePolicy(generated).directives;
  const names = [...new Set([...a.map(d => d.name), ...b.map(d => d.name)])];
  const findings = [];
  for (const name of names) {
    const liveSources = (a.find(d => d.name === name)?.sources ?? []).map(normalizeNonce);
    const genSources = (b.find(d => d.name === name)?.sources ?? []).map(normalizeNonce);
    const onlyLive = liveSources.filter(s => !genSources.includes(s));
    const onlyGen = genSources.filter(s => !liveSources.includes(s));
    const presence = !a.some(d => d.name === name) ? 'missing from the live policy' : !b.some(d => d.name === name) ? 'only in the live policy' : '';
    if (!onlyLive.length && !onlyGen.length && !presence) continue;
    const parts = [
      presence,
      onlyLive.length ? `live also allows ${onlyLive.join(' ')}` : '',
      onlyGen.length ? `generated also allows ${onlyGen.join(' ')}` : '',
    ].filter(Boolean);
    findings.push({ id: `diff-${name}`, level: 'warn', text: `${name}: ${parts.join('; ')}.` });
  }
  return findings.length ? findings : [{ id: 'diff-none', level: 'ok', text: 'The live policy matches the generated Production policy.' }];
}

export function gradeHeaders(headers, generated) {
  const get = name => headers.filter(([n]) => n.toLowerCase() === name).map(([, v]) => v);
  const out = [];
  const add = (id, level, text) => out.push({ id, level, text });
  const csp = get('content-security-policy');
  const reportOnly = get('content-security-policy-report-only');

  if (!csp.length && !reportOnly.length) add('csp-missing', 'bad', 'No Content-Security-Policy header. Injected scripts run unchecked.');
  else if (!csp.length) add('csp-report-only', 'warn', 'Only a report-only policy is sent, so nothing is blocked yet.');
  else add('csp-present', 'ok', 'A Content-Security-Policy header is sent.');
  if (csp.length > 1) add('csp-duplicate', 'warn', `${csp.length} Content-Security-Policy headers are sent. Browsers enforce every one, so a resource must pass all of them. A host or CDN may be adding its own.`);

  const policy = csp[0] ?? reportOnly[0];
  if (policy) {
    const level = sizeLevel(bytes(`content-security-policy: ${policy}`));
    add('csp-size', { ok: 'ok', warn: 'warn', over: 'bad' }[level], level === 'ok' ? 'The policy header is a safe size.' : 'The policy header is large enough that some proxies reject it (4 KB is a common buffer).');
    out.push(...diffPolicies(policy, generated));
  }

  if (get('x-powered-by').length) add('x-powered-by', 'bad', `X-Powered-By reveals "${get('x-powered-by')[0]}". Remove it (header_remove('X-Powered-By') or expose_php = Off).`);
  const server = get('server')[0];
  if (server && /\d/.test(server)) add('server-version', 'warn', `The Server header reveals a version ("${server}"). Hide the version number.`);
  if (get('strict-transport-security').length) add('hsts', 'ok', 'Strict-Transport-Security is set.');
  else add('hsts', 'warn', 'No Strict-Transport-Security header, so the first visit can be downgraded to http.');
  if (get('x-content-type-options').some(v => v.trim().toLowerCase() === 'nosniff')) add('nosniff', 'ok', 'X-Content-Type-Options: nosniff is set.');
  else add('nosniff', 'warn', 'X-Content-Type-Options: nosniff is missing.');
  if (get('referrer-policy').length) add('referrer-policy', 'ok', 'Referrer-Policy is set.');
  else add('referrer-policy', 'warn', 'No Referrer-Policy header. Use strict-origin-when-cross-origin.');
  return out;
}
