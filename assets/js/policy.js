// Pure policy logic: no DOM access, so it runs in the browser and under `node --test`.

export const TAG_DIRS = ['script', 'style', 'img', 'frame', 'connect'];

export const TOGGLE_KEYS = ['local', 'reportonly', 'reporting', 'jsdelivr', 'cdnjs', 'tawk', 'gfonts', 'ga', 'gtm', 'livewire'];

export const DEFAULT_STATE = {
  local: false, reportonly: false, reporting: true,
  jsdelivr: true, cdnjs: true, tawk: false,
  gfonts: true, ga: false, gtm: false, livewire: false,
  tags: { script: [], style: [], img: [], frame: [], connect: [] },
};

export const PRESETS = {
  strict:   { local: false, reportonly: false, reporting: true, jsdelivr: false, cdnjs: false, tawk: false, gfonts: false, ga: false, gtm: false, livewire: false },
  standard: { local: false, reportonly: false, reporting: true, jsdelivr: true,  cdnjs: true,  tawk: false, gfonts: true,  ga: false, gtm: false, livewire: false },
  local:    { local: true,  reportonly: true,  reporting: true, jsdelivr: true,  cdnjs: true,  tawk: false, gfonts: true,  ga: false, gtm: false, livewire: false },
};

const SELF = "'self'";
const NONCE = "'nonce-{$nonce}'";

export function buildDirectives(state) {
  const on = (flag, sources) => (flag ? sources : []);
  const script = [SELF, NONCE,
    ...on(state.jsdelivr, ['https://cdn.jsdelivr.net']),
    ...on(state.cdnjs, ['https://cdnjs.cloudflare.com']),
    ...on(state.tawk, ['https://embed.tawk.to']),
    ...on(state.ga, ['https://www.google-analytics.com']),
    ...on(state.gtm, ['https://www.googletagmanager.com']),
    ...state.tags.script];
  const style = [SELF, NONCE,
    ...on(state.gfonts, ['https://fonts.googleapis.com']),
    ...on(state.cdnjs, ['https://cdnjs.cloudflare.com']),
    ...state.tags.style];
  const font = [SELF, 'data:',
    ...on(state.gfonts, ['https://fonts.gstatic.com']),
    ...on(state.cdnjs, ['https://cdnjs.cloudflare.com'])];
  const img = [SELF, 'data:', ...on(state.cdnjs, ['https://cdnjs.cloudflare.com']), ...state.tags.img];
  const frame = [SELF, ...state.tags.frame];
  const connect = [SELF,
    ...on(state.local, ['ws://localhost:5173', 'wss://localhost:5173']),
    ...on(state.ga, ['https://www.google-analytics.com']),
    ...state.tags.connect];

  const directives = [
    { name: 'default-src', sources: [SELF] },
    { name: 'script-src', sources: script },
    { name: 'style-src', sources: style },
    { name: 'style-src-elem', sources: style },
    { name: 'style-src-attr', sources: ["'none'"] },
    { name: 'font-src', sources: font },
    { name: 'img-src', sources: img },
    { name: 'frame-src', sources: frame },
    { name: 'connect-src', sources: connect },
    { name: 'object-src', sources: ["'none'"] },
    { name: 'base-uri', sources: [SELF] },
    { name: 'frame-ancestors', sources: ["'none'"] },
  ];
  if (!state.local) directives.push({ name: 'upgrade-insecure-requests', sources: [] });
  if (state.reporting) directives.push({ name: 'report-uri', sources: ['/api/csp-violation-report'] });
  return directives;
}

export function policyString(directives) {
  return directives.map(d => (d.sources.length ? `${d.name} ${d.sources.join(' ')}` : d.name)).join('; ');
}

export function score(state) {
  let s = 30;
  if (!state.local) s += 15;
  if (state.reporting) s += 20;
  if (!state.gtm && !state.tawk && state.tags.script.length === 0) s += 15;
  if (!state.gtm) s += 10;
  if (!state.local) s += 10;
  return Math.min(s, 100);
}

export function grade(n) {
  if (n >= 90) return { label: 'A+', cls: 'grade-a' };
  if (n >= 75) return { label: 'A', cls: 'grade-a' };
  if (n >= 60) return { label: 'B', cls: 'grade-b' };
  if (n >= 40) return { label: 'C', cls: 'grade-c' };
  return { label: 'D', cls: 'grade-d' };
}
