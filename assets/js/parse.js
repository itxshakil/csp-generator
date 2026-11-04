// Reading untrusted text: existing policies and violation messages. Pure functions, no DOM.
import { INTEGRATIONS } from './integrations.js';
import { normalizeSource, covers } from './sources.js';
import { CUSTOM_KINDS, DEFAULT_STATE, sanitizeState } from './state.js';
import { buildDirectives } from './policy.js';

// ── Parsing a policy ────────────────────────────────────────────────────────
const HEADER_PREFIX = /^\s*content-security-policy(-report-only)?\s*:\s*/i;
const META = /<meta\b[^>]*\bcontent\s*=\s*(["'])([\s\S]*?)\1/i;

// The policy text from a bare value, a header line or a <meta> tag, plus whether it is report-only.
function extractValue(text) {
  let value = String(text ?? '').trim();
  let reportOnly = false;
  const meta = META.exec(value);
  if (meta) value = meta[2];
  const prefix = HEADER_PREFIX.exec(value);
  if (prefix) {
    reportOnly = Boolean(prefix[1]);
    value = value.slice(prefix[0].length);
  }
  return { value, reportOnly };
}

// A comma separates two policies sent in one header; only the first is read.
export function parsePolicy(text) {
  const extracted = extractValue(text);
  const value = extracted.value.split(',')[0];
  const reportOnly = extracted.reportOnly;
  const directives = [];
  for (const part of value.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/).filter(Boolean);
    if (!name) continue;
    const lower = name.toLowerCase();
    // Browsers ignore a repeated directive, so the first one wins.
    if (directives.some(d => d.name === lower)) continue;
    directives.push({ name: lower, sources });
  }
  return { reportOnly, directives };
}

// ── Importing a policy into a config ────────────────────────────────────────
// Which directives carry each kind of source, in lookup order.
const KIND_DIRECTIVES = {
  script: ['script-src', 'script-src-elem'], style: ['style-src', 'style-src-elem'], font: ['font-src'], img: ['img-src'],
  media: ['media-src'], frame: ['frame-src', 'child-src'], connect: ['connect-src'], form: ['form-action'], worker: ['worker-src'],
};
const DIRECTIVE_KIND = Object.fromEntries(Object.entries(KIND_DIRECTIVES).flatMap(([kind, names]) => names.map(n => [n, kind])));
const FALLS_BACK_TO_DEFAULT = new Set(['script', 'style', 'font', 'img', 'media', 'frame', 'connect', 'worker']);
// Sources the generator itself always emits, so they never count as custom.
const BASE = {
  script: ["'self'"], style: ["'self'"], font: ["'self'", 'data:'], img: ["'self'", 'data:'],
  media: ["'self'"], frame: ["'self'"], connect: ["'self'"], form: ["'self'"], worker: ["'self'"],
};
// Directives the generator writes itself, with the values it writes.
const MANAGED = {
  'default-src': ["'self'"], 'object-src': ["'none'"], 'base-uri': ["'self'"], 'frame-ancestors': ["'none'"],
  'manifest-src': ["'self'"], 'upgrade-insecure-requests': [], 'style-src-attr': ["'none'", "'unsafe-inline'"],
};
const isNonce = s => /^'nonce-[^']*'$/i.test(s);
const SCHEMELESS_HOST = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/\S*)?$/i;

// CSP allows hosts without a scheme ("cdn.example.com"); they mean the page's scheme, which is https in production.
function canonical(source) {
  if (!SCHEMELESS_HOST.test(source)) return source;
  return normalizeSource(`https://${source}`).value ?? source;
}

// Sources a policy allows for a kind, following the default-src fallback.
function sourcesFor(directives, kind) {
  const found = KIND_DIRECTIVES[kind].map(n => directives.find(d => d.name === n)).filter(Boolean);
  if (found.length) return found.flatMap(d => d.sources).map(canonical);
  if (FALLS_BACK_TO_DEFAULT.has(kind)) return (directives.find(d => d.name === 'default-src')?.sources ?? []).map(canonical);
  return [];
}

const allowedIn = (list, source) => list.includes(source) || list.some(s => covers(s, source));

const integrationSources = i => Object.entries(i.sources).flatMap(([kind, list]) => list.map(([source]) => [kind, source]));

// True when every source of `a` is the same as, or covered by, a source `b` has for that kind.
function explains(b, a) {
  const theirs = integrationSources(b);
  return integrationSources(a).every(([kind, s]) => theirs.some(([k, t]) => k === kind && (t === s || covers(t, s))));
}

// Integrations whose every source is allowed by the policy, minus those another match already explains
// (Tawk.to brings jsDelivr and Google Fonts hosts; Google Maps wildcards cover reCAPTCHA).
export function matchIntegrations(directives) {
  const candidates = INTEGRATIONS.filter(i => integrationSources(i).every(([kind, s]) => allowedIn(sourcesFor(directives, kind), s)));
  return candidates
    .filter(i => !candidates.some(other => other !== i && explains(other, i) && !explains(i, other)))
    .map(i => i.id);
}

export function importPolicy(text) {
  const { reportOnly, directives } = parsePolicy(text);
  const several = extractValue(text).value.includes(',');
  const matched = matchIntegrations(directives);
  const explained = new Set(INTEGRATIONS.filter(i => matched.includes(i.id)).flatMap(i => integrationSources(i).map(([kind, s]) => `${kind} ${s}`)));
  const custom = Object.fromEntries(CUSTOM_KINDS.map(k => [k, []]));
  const unknown = [];
  const notes = [];
  let inlineStyleAttrs = false;
  let reporting = false;

  for (const d of directives) {
    if (d.name === 'report-uri' || d.name === 'report-to') { reporting = true; continue; }
    if (d.name in MANAGED) {
      if (d.name === 'style-src-attr' && d.sources.includes("'unsafe-inline'")) inlineStyleAttrs = true;
      const extra = d.sources.filter(s => !MANAGED[d.name].includes(s));
      if (extra.length) unknown.push({ directive: d.name, sources: extra });
      continue;
    }
    const kind = DIRECTIVE_KIND[d.name];
    if (!kind) { unknown.push({ directive: d.name, sources: d.sources }); continue; }
    const leftover = [];
    for (const raw of d.sources) {
      const s = canonical(raw);
      if (BASE[kind].includes(s) || isNonce(s) || explained.has(`${kind} ${s}`)) continue;
      if (kind === 'script' && s === "'unsafe-eval'") {
        notes.push("'unsafe-eval' found. Turn on the stack option that needs it (Livewire 3, Alpine, Filament) or Google Maps, or remove it.");
        continue;
      }
      if (kind === 'worker' && s === 'blob:') continue;
      const { value } = normalizeSource(s);
      if (value === s && CUSTOM_KINDS.includes(kind)) {
        if (!custom[kind].includes(value)) custom[kind].push(value);
      } else {
        leftover.push(raw);
      }
    }
    if (leftover.length) unknown.push({ directive: d.name, sources: leftover });
  }

  if (several) notes.push('This text holds more than one policy (separated by a comma). Only the first was read; browsers enforce every one.');
  const state = sanitizeState({
    ...structuredClone(DEFAULT_STATE),
    integrations: matched, reportOnly, reporting, inlineStyleAttrs, custom,
  });
  return { state, matched, custom: state.custom, unknown, notes };
}

// ── Explaining a violation ──────────────────────────────────────────────────
const NOISE_SCHEMES = ['chrome-extension:', 'moz-extension:', 'safari-web-extension:', 'safari-extension:', 'about:'];
const KIND_NOUN = { script: 'script', style: 'stylesheet or style', font: 'font', img: 'image', media: 'media file', frame: 'frame', connect: 'connection', form: 'form submission', worker: 'worker' };
const VERB_KIND = [[/script/i, 'script'], [/style ?sheet|style/i, 'style'], [/font/i, 'font'], [/image/i, 'img'], [/media/i, 'media'], [/connect/i, 'connect'], [/frame/i, 'frame'], [/worker/i, 'worker'], [/form/i, 'form']];

const firstToken = s => String(s ?? '').trim().split(/\s+/)[0].toLowerCase();

// Pulls {directive, blocked, verb} out of a console message or a report body. Null when it is neither.
function readViolation(text) {
  const t = String(text ?? '').trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    let data;
    try {
      data = JSON.parse(t);
    } catch {
      return null;
    }
    const body = Array.isArray(data)
      ? data.find(r => r && r.type === 'csp-violation' && r.body && typeof r.body === 'object')?.body
      : (data && typeof data['csp-report'] === 'object' ? data['csp-report'] : data);
    if (!body || typeof body !== 'object') return null;
    const directive = firstToken(body.effectiveDirective ?? body['effective-directive'] ?? body['violated-directive'] ?? body.violatedDirective);
    const blocked = String(body.blockedURL ?? body['blocked-uri'] ?? body.blockedURI ?? '');
    return directive ? { directive, blocked, verb: '' } : null;
  }
  const chrome = /Refused to ([a-z ]+?)(?: '([^']*)')? because it violates the following Content Security Policy directive: "([^"]+)"/i.exec(t);
  if (chrome) {
    const verb = chrome[1];
    const blocked = /inline/i.test(verb) ? 'inline' : /evaluate|eval/i.test(verb) ? 'eval' : (chrome[2] ?? '');
    return { directive: firstToken(chrome[3]), blocked, verb };
  }
  if (/Refused to evaluate a string as JavaScript/i.test(t)) {
    const d = /directive: "([^"]+)"/i.exec(t);
    return { directive: firstToken(d?.[1] ?? 'script-src'), blocked: 'eval', verb: 'evaluate' };
  }
  const firefox = /blocked the loading of a resource(?: \(([\w-]+)\))? at (\S+?)(?: \(\W?([\w-]+)\W?\))? because it violates the following directive: [“"]([^”"]+)[”"]/i.exec(t);
  if (firefox) {
    const at = firefox[2];
    return { directive: firstToken(firefox[1] ?? firefox[3] ?? firefox[4]), blocked: at === 'inline' ? 'inline' : at === 'eval' ? 'eval' : at, verb: '' };
  }
  const safari = /Refused to ([a-z ]+?) (\S+) because it does not appear in the ([\w-]+) directive/i.exec(t);
  if (safari) return { directive: safari[3].toLowerCase(), blocked: safari[2], verb: safari[1] };
  const safariInline = /Refused to (execute|apply) a (script|style)[^.]*'unsafe-inline' does not appear in the ([\w-]+) directive/i.exec(t);
  if (safariInline) return { directive: safariInline[3].toLowerCase(), blocked: 'inline', verb: safariInline[1] };
  return null;
}

function kindOf(directive, verb) {
  if (DIRECTIVE_KIND[directive]) return DIRECTIVE_KIND[directive];
  if (directive === 'style-src-attr') return 'style';
  if (directive === 'script-src-attr') return 'script';
  return VERB_KIND.find(([re]) => re.test(verb))?.[1] ?? null;
}

function originOf(url) {
  try {
    const u = new URL(url);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) ? `${u.protocol}//${u.host}` : null;
  } catch {
    return null;
  }
}

// The most specific integration wins: a blocked player.vimeo.com frame is Vimeo, even though Intercom lists it too.
export function findIntegration(kind, origin) {
  const bySize = [...INTEGRATIONS].sort((a, b) => integrationSources(a).length - integrationSources(b).length);
  const exact = bySize.find(i => (i.sources[kind] ?? []).some(([s]) => s === origin));
  return exact ?? bySize.find(i => (i.sources[kind] ?? []).some(([s]) => covers(s, origin)));
}

export function explainViolation(text, state) {
  const v = readViolation(text);
  if (!v) return { ok: false, error: 'Paste a console message that starts with "Refused to" or "Content-Security-Policy:", or a violation report in JSON.' };
  const { directive, blocked } = v;
  const kind = kindOf(directive, v.verb);
  const noun = KIND_NOUN[kind] ?? 'resource';
  const base = { ok: true, blocked, directive, kind, integration: null };

  if (blocked === 'inline' || directive.endsWith('-attr')) {
    const attr = directive.endsWith('-attr');
    const advice = attr
      ? (kind === 'style'
        ? 'Move the style="" attribute into a CSS class, or set the style from JavaScript (element.style is allowed). Only if a widget needs it, allow inline style attributes under Advanced.'
        : 'Move the onclick="" style handler into a script file and attach it with addEventListener.')
      : `Add nonce="{{ $cspNonce }}" to the inline <${kind === 'style' ? 'style' : 'script'}> tag, or move its code into a file. If it is an on*= handler or style="" attribute, move it into a script file or a CSS class.`;
    return { ...base, plain: `The browser blocked inline ${kind === 'style' ? 'CSS' : 'JavaScript'} because ${directive} only runs code that carries your nonce.`, fix: { type: 'inline', advice } };
  }
  if (blocked === 'eval') {
    return {
      ...base,
      plain: `Something called eval() or new Function(), which ${directive} blocks without 'unsafe-eval'.`,
      fix: { type: 'eval', advice: "If it is Alpine, Livewire 3 or Filament, turn that option on under Stack (or switch to the @alpinejs/csp build). Otherwise find the library that evaluates strings: 'unsafe-eval' weakens the policy." },
    };
  }
  if (NOISE_SCHEMES.some(p => blocked.startsWith(p))) {
    return { ...base, plain: 'A browser extension tried to inject code into your page. Your policy blocked it, which is correct.', fix: { type: 'noise', advice: 'Ignore it. The generated report controller already drops extension reports.' } };
  }
  const origin = originOf(blocked);
  if (!origin || !kind) {
    return { ...base, plain: `The browser blocked ${blocked ? `"${blocked}"` : 'a resource'} under ${directive}.`, fix: { type: 'none', advice: blocked.startsWith('javascript:') ? 'A javascript: URL tried to run. Replace it with an event listener in a script file.' : 'Allow data: or blob: in this directive only if you know which code creates them.' } };
  }
  const prodSources = buildDirectives(state, 'production').find(d => d.name === (KIND_DIRECTIVES[kind]?.[0] ?? directive))?.sources ?? [];
  if (allowedIn(prodSources, origin)) {
    return { ...base, plain: `Your current config already allows ${origin} for ${KIND_DIRECTIVES[kind][0]}.`, fix: { type: 'none', advice: 'This report came from an older policy, another environment, or a cached page. Deploy the current policy and check again.' } };
  }
  const integration = findIntegration(kind, origin);
  if (integration) {
    return { ...base, integration: integration.id, plain: `The browser blocked a ${noun} from ${origin} because ${directive} does not allow it. It belongs to ${integration.name}.`, fix: { type: 'integration', id: integration.id } };
  }
  if (!CUSTOM_KINDS.includes(kind)) {
    return { ...base, plain: `The browser blocked a ${noun} from ${origin} because ${directive} does not allow it.`, fix: { type: 'none', advice: `Add ${origin} to ${directive} by hand if you trust it.` } };
  }
  return { ...base, plain: `The browser blocked a ${noun} from ${origin} because ${directive} does not allow it. If you trust this host, allow it.`, fix: { type: 'custom', kind, value: origin } };
}
