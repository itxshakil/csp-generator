// Pure policy logic: state plus environment to directives, each source with the reasons it is there.
import { INTEGRATIONS, STACK, HOSTING } from './integrations.js';
import { normalizeOrigin, wsOrigin, collapseSources, covers } from './sources.js';
import { DEFAULT_STATE } from './state.js';

export const REPORT_PATH = '/csp-violation-report';
export const REPORT_GROUP = 'csp-endpoint';

const SELF = "'self'";
export const NONCE = "'nonce-{$nonce}'";
const UNSAFE_EVAL = "'unsafe-eval'";
const UNSAFE_INLINE = "'unsafe-inline'";
const DASHBOARDS = { telescope: 'telescope*', horizon: 'horizon*', pulse: 'pulse*' };

const BASE_REASONS = {
  [SELF]: 'Your own origin',
  [NONCE]: 'Inline scripts and styles you mark with the per-request nonce',
  'data:': 'Inline data: URLs, for example small icons and embedded fonts',
  "'none'": 'Nothing is allowed',
};

// Every catalog item (integration, stack, hosting) the state selects, filtered for the environment.
function selectedItems(state, env) {
  const pick = (catalog, ids) => catalog.filter(item => ids.includes(item.id));
  return [...pick(INTEGRATIONS, state.integrations), ...pick(STACK, state.stack), ...pick(HOSTING, state.hosting)]
    .filter(item => env === 'local' || !item.localOnly);
}

export function needsFor(state, env = 'production') {
  const needs = { unsafeEval: [], inlineStyleAttrs: [], workerBlob: [] };
  const alpineCsp = state.stack.includes('alpineCsp');
  for (const item of selectedItems(state, env)) {
    for (const [key, reason] of Object.entries(item.needs ?? {})) {
      if (key === 'unsafeEval' && item.id === 'alpine' && alpineCsp) continue;
      needs[key].push(`${item.name}: ${reason}`);
    }
  }
  return needs;
}

export function skippedPaths(state) {
  return Object.entries(DASHBOARDS).filter(([id]) => state.stack.includes(id)).map(([, path]) => path);
}

// Collects sources and reasons for one directive, then collapses wildcards and merges absorbed reasons.
class SourceList {
  constructor() { this.reasons = new Map(); }
  add(source, reason) {
    if (!this.reasons.has(source)) this.reasons.set(source, []);
    const list = this.reasons.get(source);
    if (!list.includes(reason)) list.push(reason);
    return this;
  }
  build(name) {
    const sources = collapseSources([...this.reasons.keys()]);
    const reasons = {};
    for (const s of sources) {
      reasons[s] = [...this.reasons.get(s)];
      if (!s.includes('://*.')) continue;
      for (const [other, otherReasons] of this.reasons) {
        if (other !== s && covers(s, other)) otherReasons.forEach(r => reasons[s].includes(r) || reasons[s].push(r));
      }
    }
    return { name, sources, reasons };
  }
}

const withBase = (...base) => base.reduce((list, s) => list.add(s, BASE_REASONS[s]), new SourceList());

export function buildDirectives(state, env = 'production') {
  const local = env === 'local';
  const items = selectedItems(state, env);
  const needs = needsFor(state, env);

  const lists = {
    script: withBase(SELF, NONCE), style: withBase(SELF, NONCE), font: withBase(SELF, 'data:'), img: withBase(SELF, 'data:'),
    media: withBase(SELF), frame: withBase(SELF), connect: withBase(SELF), worker: withBase(SELF), form: withBase(SELF),
  };

  for (const item of items) {
    for (const [kind, sources] of Object.entries(item.sources ?? {})) {
      for (const [source, reason] of sources) lists[kind].add(source, `${item.name}: ${reason}`);
    }
  }

  if (local && state.stack.includes('vite')) {
    const vite = normalizeOrigin(state.viteOrigin).value ?? DEFAULT_STATE.viteOrigin;
    lists.script.add(vite, 'Vite dev server: scripts');
    lists.style.add(vite, 'Vite dev server: styles');
    lists.connect.add(wsOrigin(vite), 'Vite dev server: HMR WebSocket');
    lists.connect.add(vite, 'Vite dev server: HMR requests');
  }

  for (const [kind, sources] of Object.entries(state.custom)) {
    for (const source of sources) lists[kind].add(source, 'Added by you');
  }

  needs.unsafeEval.forEach(reason => lists.script.add(UNSAFE_EVAL, reason));
  needs.workerBlob.forEach(reason => lists.worker.add('blob:', reason));

  const attrReasons = [...(state.inlineStyleAttrs ? ['You allowed inline style attributes'] : []), ...needs.inlineStyleAttrs];
  const styleAttr = attrReasons.length
    ? attrReasons.reduce((list, r) => list.add(UNSAFE_INLINE, r), new SourceList())
    : new SourceList().add("'none'", 'Blocks inline style="" attributes, which cannot carry a nonce');

  const script = lists.script.build('script-src');
  const style = lists.style.build('style-src');
  const media = lists.media.build('media-src');
  const worker = lists.worker.build('worker-src');
  const single = (name, source, reason) => ({ name, sources: [source], reasons: { [source]: [reason] } });
  const flag = name => ({ name, sources: [], reasons: {} });

  return [
    single('default-src', SELF, 'Fallback for every resource type not listed below'),
    script,
    style,
    // style-src-elem is only worth its bytes when it would differ from style-src; today it never does.
    styleAttr.build('style-src-attr'),
    lists.font.build('font-src'),
    lists.img.build('img-src'),
    ...(media.sources.length > 1 ? [media] : []),
    lists.frame.build('frame-src'),
    lists.connect.build('connect-src'),
    ...(worker.sources.length > 1 ? [worker] : []),
    single('manifest-src', SELF, 'Your web app manifest'),
    lists.form.build('form-action'),
    single('object-src', "'none'", 'Blocks plugins such as Flash and Java'),
    single('base-uri', SELF, 'Stops injected <base> tags from redirecting relative URLs'),
    single('frame-ancestors', "'none'", 'Stops other sites from framing your pages (clickjacking)'),
    ...(local ? [] : [flag('upgrade-insecure-requests')]),
    ...(state.reporting ? [
      single('report-uri', REPORT_PATH, 'Where browsers send violation reports'),
      single('report-to', REPORT_GROUP, 'Reporting API group declared in the Reporting-Endpoints header'),
    ] : []),
  ];
}

export function policyString(directives) {
  return directives.map(d => (d.sources.length ? `${d.name} ${d.sources.join(' ')}` : d.name)).join('; ');
}

export function grade(n) {
  if (n >= 90) return { label: 'A+', cls: 'grade-a' };
  if (n >= 75) return { label: 'A', cls: 'grade-a' };
  if (n >= 60) return { label: 'B', cls: 'grade-b' };
  if (n >= 40) return { label: 'C', cls: 'grade-c' };
  return { label: 'D', cls: 'grade-d' };
}

export function headerName(state) {
  return state.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
}

const encoder = new TextEncoder();

// Callers that already built the directives pass them in, so one change builds the policy once.
export function headerBytes(state, env = 'production', dirs = buildDirectives(state, env)) {
  // A real nonce is 24 base64 characters, not the 8-character template placeholder.
  return encoder.encode(`${headerName(state)}: ${policyString(dirs).replaceAll('{$nonce}', 'x'.repeat(24))}`).length;
}

// 4 KB is the default proxy buffer in nginx-proxy-manager; 8 KB is a common hard limit for a single header line.
export const SIZE_WARN = 4096;
export const SIZE_OVER = 8192;

export const SIZE_CLASS = { ok: 'grade-a', warn: 'grade-b', over: 'grade-d' };

export function sizeLevel(bytes) {
  if (bytes > SIZE_OVER) return 'over';
  if (bytes > SIZE_WARN) return 'warn';
  return 'ok';
}

// Hosts that serve arbitrary user-controlled or legacy JavaScript, so allowing them lets an attacker load a script gadget.
const BYPASS_HOSTS = ['https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://unpkg.com', 'https://*.googleapis.com'];

// Grades the production policy only. Every point lost is listed with the reason.
export function scorePolicy(state, dirs = buildDirectives(state, 'production')) {
  const script = dirs.find(d => d.name === 'script-src');
  const deductions = [];
  const deduct = (id, label, points) => deductions.push({ id, label, points });

  if (script.sources.includes(UNSAFE_EVAL)) {
    const who = script.reasons[UNSAFE_EVAL].map(r => r.split(':')[0]).join(', ');
    deduct('unsafe-eval', `'unsafe-eval' in script-src, needed by ${who}`, 25);
  }
  if (dirs.find(d => d.name === 'style-src-attr').sources.includes(UNSAFE_INLINE)) {
    deduct('style-attr', "'unsafe-inline' in style-src-attr allows injected style attributes", 10);
  }
  // At most three of each are counted, so these deductions are capped at 30 and 15 points.
  for (const host of script.sources.filter(s => BYPASS_HOSTS.includes(s)).slice(0, 3)) {
    deduct('bypass-host', `${host} in script-src serves code an attacker can reuse to bypass the policy`, 10);
  }
  for (const host of script.sources.filter(s => s.includes('://*.') && !BYPASS_HOSTS.includes(s)).slice(0, 3)) {
    deduct('wildcard', `${host} in script-src allows every subdomain`, 5);
  }
  if (state.reportOnly) deduct('report-only', 'Report-only mode: nothing is blocked yet', 20);
  if (!state.reporting) deduct('no-reporting', 'Reporting is off, so you will not see what breaks', 15);

  return { score: Math.max(0, 100 - deductions.reduce((sum, d) => sum + d.points, 0)), deductions };
}
