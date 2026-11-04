// Reading untrusted text: existing policies and violation messages. Pure functions, no DOM.
import { INTEGRATIONS } from './integrations.js';
import { normalizeSource, covers } from './sources.js';
import { CUSTOM_KINDS, DEFAULT_STATE, sanitizeState } from './state.js';

// ── Parsing a policy ────────────────────────────────────────────────────────
const HEADER_PREFIX = /^\s*content-security-policy(-report-only)?\s*:\s*/i;
const META = /<meta\b[^>]*\bcontent\s*=\s*(["'])([\s\S]*?)\1/i;

export function parsePolicy(text) {
  let value = String(text ?? '').trim();
  let reportOnly = false;
  const meta = META.exec(value);
  if (meta) value = meta[2];
  const prefix = HEADER_PREFIX.exec(value);
  if (prefix) {
    reportOnly = Boolean(prefix[1]);
    value = value.slice(prefix[0].length);
  }
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

// Sources a policy allows for a kind, following the default-src fallback.
function sourcesFor(directives, kind) {
  const found = KIND_DIRECTIVES[kind].map(n => directives.find(d => d.name === n)).filter(Boolean);
  if (found.length) return found.flatMap(d => d.sources);
  if (FALLS_BACK_TO_DEFAULT.has(kind)) return directives.find(d => d.name === 'default-src')?.sources ?? [];
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
    for (const s of d.sources) {
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
        leftover.push(s);
      }
    }
    if (leftover.length) unknown.push({ directive: d.name, sources: leftover });
  }

  const state = sanitizeState({
    ...structuredClone(DEFAULT_STATE),
    integrations: matched, reportOnly, reporting, inlineStyleAttrs, custom,
  });
  return { state, matched, custom: state.custom, unknown, notes };
}
