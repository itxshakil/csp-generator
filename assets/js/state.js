// The config shape, presets, and the only way untrusted input (localStorage, share links) becomes state.
import { INTEGRATIONS, STACK, HOSTING } from './integrations.js';
import { normalizeOrigin, normalizeSource, MAX_TAGS } from './sources.js';

export const CUSTOM_KINDS = ['script', 'style', 'img', 'font', 'frame', 'connect', 'media', 'form'];
export const MAX_EMBEDS = 10;
const MAX_EMBED_ORIGINS = 10;

export const DEFAULT_STATE = Object.freeze({
  v: 2,
  integrations: [],
  stack: ['vite'],
  hosting: [],
  reportOnly: false,
  reporting: true,
  inlineStyleAttrs: false,
  fullPageCache: false,
  viteOrigin: 'http://localhost:5173',
  custom: Object.fromEntries(CUSTOM_KINDS.map(k => [k, []])),
  embeds: [],
  rollout: { reportOnlyFrom: '', enforceFrom: '' },
});

const STANDARD = { integrations: ['google-fonts', 'ga4'], stack: ['vite'], reportOnly: false, reporting: true, inlineStyleAttrs: false };

export const PRESETS = {
  strict: { integrations: [], stack: ['vite'], reportOnly: false, reporting: true, inlineStyleAttrs: false },
  standard: STANDARD,
  rollout: { ...STANDARD, reportOnly: true },
};

export const PRESET_LABELS = { strict: 'Strict', standard: 'Standard', rollout: 'Rollout' };

// A preset sets the policy choices (integrations, stack, reporting, custom hosts) and keeps the facts about
// your environment (hosting, full-page cache, embedding exceptions, Vite host, rollout dates).
// `reset` starts from scratch instead.
export function applyPreset(state, name, { reset = false } = {}) {
  const base = reset ? structuredClone(DEFAULT_STATE) : structuredClone(state);
  return { ...base, ...structuredClone(PRESETS[name]), custom: structuredClone(DEFAULT_STATE.custom) };
}

const BOOLEAN_KEYS = ['reportOnly', 'reporting', 'inlineStyleAttrs', 'fullPageCache'];
const EMBED_PATH = /^[A-Za-z0-9_./*-]{1,100}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isObject = v => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const unique = list => [...new Set(list)];

// Keeps only ids from the catalog, in catalog order, so output is stable whatever order they were picked in.
function pickIds(raw, catalog) {
  const wanted = new Set(Array.isArray(raw) ? raw.filter(v => typeof v === 'string') : []);
  return catalog.map(item => item.id).filter(id => wanted.has(id));
}

function sources(list, limit = MAX_TAGS) {
  return unique((Array.isArray(list) ? list : []).map(v => normalizeSource(v).value).filter(Boolean)).slice(0, limit);
}

function validDate(v) {
  if (typeof v !== 'string' || !DATE.test(v)) return '';
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : '';
}

// Laravel's $request->is() pattern: no leading slash, no spaces, quotes or parent segments.
export function normalizeEmbedPath(raw) {
  const value = String(raw ?? '').trim().replace(/^\/+/, '');
  const fail = error => ({ value: null, error });
  if (!value) return fail('Enter a path, for example widget/*.');
  if (!EMBED_PATH.test(value)) return fail('Use letters, numbers, / . _ - and * only, up to 100 characters.');
  if (value.split('/').includes('..')) return fail('A path cannot contain "..".');
  return { value, error: null };
}

export function normalizeEmbedOrigin(raw) {
  const { value, error } = normalizeOrigin(raw);
  if (error) return { value: null, error };
  if (!value.startsWith('https://')) return { value: null, error: 'Embedding sites must use https://.' };
  return { value, error: null };
}

function embeds(list) {
  return (Array.isArray(list) ? list : [])
    .filter(isObject)
    .map(e => ({
      path: normalizeEmbedPath(e.path).value,
      origins: unique((Array.isArray(e.origins) ? e.origins : []).map(o => normalizeEmbedOrigin(o).value).filter(Boolean)).slice(0, MAX_EMBED_ORIGINS),
    }))
    .filter(e => e.path && e.origins.length)
    .slice(0, MAX_EMBEDS);
}

export function sanitizeState(raw) {
  if (!isObject(raw)) return structuredClone(DEFAULT_STATE);
  if (raw.v !== 2) return migrateV1(raw);
  const state = structuredClone(DEFAULT_STATE);
  state.integrations = pickIds(raw.integrations, INTEGRATIONS);
  state.stack = pickIds(raw.stack, STACK);
  state.hosting = pickIds(raw.hosting, HOSTING);
  for (const key of BOOLEAN_KEYS) if (typeof raw[key] === 'boolean') state[key] = raw[key];
  state.viteOrigin = normalizeOrigin(raw.viteOrigin).value ?? DEFAULT_STATE.viteOrigin;
  const custom = isObject(raw.custom) ? raw.custom : {};
  for (const kind of CUSTOM_KINDS) state.custom[kind] = sources(custom[kind]);
  state.embeds = embeds(raw.embeds);
  const rollout = isObject(raw.rollout) ? raw.rollout : {};
  state.rollout = { reportOnlyFrom: validDate(rollout.reportOnlyFrom), enforceFrom: validDate(rollout.enforceFrom) };
  return state;
}

const V1_INTEGRATIONS = { jsdelivr: 'jsdelivr', cdnjs: 'cdnjs', tawk: 'tawk', gfonts: 'google-fonts', ga: 'ga4', gtm: 'gtm' };
const V1_TAG_KINDS = ['script', 'style', 'img', 'frame', 'connect'];

// The pre-Phase 2 shape: flat boolean toggles plus `tags`. `local` has no equivalent: local output is always generated.
export function migrateV1(raw) {
  const old = isObject(raw) ? raw : {};
  const on = key => old[key] === true;
  const tags = isObject(old.tags) ? old.tags : {};
  return sanitizeState({
    v: 2,
    integrations: Object.entries(V1_INTEGRATIONS).filter(([key]) => on(key)).map(([, id]) => id),
    stack: ['vite', ...(on('livewire') ? ['livewire'] : [])],
    hosting: [],
    reportOnly: on('reportonly'),
    reporting: typeof old.reporting === 'boolean' ? old.reporting : DEFAULT_STATE.reporting,
    inlineStyleAttrs: on('inlineStyleAttrs'),
    viteOrigin: old.viteOrigin,
    custom: Object.fromEntries(V1_TAG_KINDS.map(k => [k, tags[k]])),
  });
}
