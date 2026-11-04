// Pure policy logic: no DOM access, so it runs in the browser and under `node --test`.

export const TAG_DIRS = ['script', 'style', 'img', 'frame', 'connect'];

export const TOGGLE_KEYS = ['local', 'reportonly', 'reporting', 'jsdelivr', 'cdnjs', 'tawk', 'gfonts', 'ga', 'gtm', 'livewire', 'inlineStyleAttrs'];

export const DEFAULT_STATE = {
  local: false, reportonly: false, reporting: true,
  jsdelivr: true, cdnjs: true, tawk: false,
  gfonts: true, ga: false, gtm: false, livewire: false,
  inlineStyleAttrs: false,
  viteOrigin: 'http://localhost:5173',
  tags: { script: [], style: [], img: [], frame: [], connect: [] },
};

export const PRESETS = {
  strict:   { local: false, reportonly: false, reporting: true, jsdelivr: false, cdnjs: false, tawk: false, gfonts: false, ga: false, gtm: false, livewire: false, inlineStyleAttrs: false },
  standard: { local: false, reportonly: false, reporting: true, jsdelivr: true,  cdnjs: true,  tawk: false, gfonts: true,  ga: false, gtm: false, livewire: false, inlineStyleAttrs: false },
  local:    { local: true,  reportonly: true,  reporting: true, jsdelivr: true,  cdnjs: true,  tawk: false, gfonts: true,  ga: false, gtm: false, livewire: false, inlineStyleAttrs: false },
};

const SELF = "'self'";
const NONCE = "'nonce-{$nonce}'";
const LOOPBACK = /^(localhost|127\.0\.0\.1)(:|$)/i;
const HOSTNAME = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

// Turns "app.test:5173", "https://app.test:5173/path" etc. into "https://app.test:5173".
export function normalizeOrigin(raw) {
  const input = String(raw ?? '').trim();
  const fail = error => ({ value: null, error });
  if (!input) return fail('Enter a host, for example localhost:5173.');
  if (/[\s'"<>`]/.test(input)) return fail('A host cannot contain spaces, quotes or angle brackets.');
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : (LOOPBACK.test(input) ? 'http://' : 'https://') + input;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return fail('That is not a valid host.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return fail('Use http:// or https://.');
  if (!HOSTNAME.test(url.hostname)) return fail('That is not a valid host.');
  return { value: url.origin, error: null };
}

export function wsOrigin(origin) {
  return origin.replace(/^http/, 'ws');
}

// Every source a service needs, by directive. Sources are verified against each vendor's CSP guidance.
export const SERVICE_SOURCES = {
  jsdelivr: { script: ['https://cdn.jsdelivr.net'] },
  cdnjs: {
    script: ['https://cdnjs.cloudflare.com'], style: ['https://cdnjs.cloudflare.com'],
    font: ['https://cdnjs.cloudflare.com'], img: ['https://cdnjs.cloudflare.com'],
  },
  gfonts: { style: ['https://fonts.googleapis.com'], font: ['https://fonts.gstatic.com'] },
  tawk: {
    script: ['https://*.tawk.to'], style: ['https://*.tawk.to'], font: ['https://*.tawk.to'],
    img: ['https://*.tawk.to', 'https://tawk.link'], media: ['https://*.tawk.to'], frame: ['https://*.tawk.to'],
    connect: ['https://*.tawk.to', 'wss://*.tawk.to'],
  },
  ga: {
    script: ['https://www.googletagmanager.com'],
    img: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'],
    connect: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'],
  },
  gtm: { script: ['https://www.googletagmanager.com'], img: ['https://www.googletagmanager.com'] },
};

const SERVICE_ORDER = ['jsdelivr', 'cdnjs', 'gfonts', 'tawk', 'ga', 'gtm'];

const unique = list => [...new Set(list)];

export function buildDirectives(state) {
  const vite = state.local ? [normalizeOrigin(state.viteOrigin).value ?? DEFAULT_STATE.viteOrigin] : [];
  const fromServices = kind => SERVICE_ORDER.filter(k => state[k]).flatMap(k => SERVICE_SOURCES[k][kind] ?? []);

  const script = unique([SELF, NONCE, ...vite, ...fromServices('script'), ...state.tags.script]);
  const style = unique([SELF, NONCE, ...vite, ...fromServices('style'), ...state.tags.style]);
  const font = unique([SELF, 'data:', ...fromServices('font')]);
  const img = unique([SELF, 'data:', ...fromServices('img'), ...state.tags.img]);
  const media = unique([SELF, ...fromServices('media')]);
  const frame = unique([SELF, ...fromServices('frame'), ...state.tags.frame]);
  const connect = unique([SELF, ...vite.flatMap(origin => [wsOrigin(origin), origin]), ...fromServices('connect'), ...state.tags.connect]);

  const directives = [
    { name: 'default-src', sources: [SELF] },
    { name: 'script-src', sources: script },
    { name: 'style-src', sources: style },
    { name: 'style-src-elem', sources: style },
    { name: 'style-src-attr', sources: [state.inlineStyleAttrs ? "'unsafe-inline'" : "'none'"] },
    { name: 'font-src', sources: font },
    { name: 'img-src', sources: img },
    ...(media.length > 1 ? [{ name: 'media-src', sources: media }] : []),
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
  if (state.inlineStyleAttrs) s -= 10;
  return Math.min(s, 100);
}

export function grade(n) {
  if (n >= 90) return { label: 'A+', cls: 'grade-a' };
  if (n >= 75) return { label: 'A', cls: 'grade-a' };
  if (n >= 60) return { label: 'B', cls: 'grade-b' };
  if (n >= 40) return { label: 'C', cls: 'grade-c' };
  return { label: 'D', cls: 'grade-d' };
}
