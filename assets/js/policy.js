// Pure policy logic: no DOM access, so it runs in the browser and under `node --test`.

export const TAG_DIRS = ['script', 'style', 'img', 'frame', 'connect'];

export const TOGGLE_KEYS = ['local', 'reportonly', 'reporting', 'jsdelivr', 'cdnjs', 'tawk', 'gfonts', 'ga', 'gtm', 'livewire'];

export const DEFAULT_STATE = {
  local: false, reportonly: false, reporting: true,
  jsdelivr: true, cdnjs: true, tawk: false,
  gfonts: true, ga: false, gtm: false, livewire: false,
  viteOrigin: 'http://localhost:5173',
  tags: { script: [], style: [], img: [], frame: [], connect: [] },
};

export const PRESETS = {
  strict:   { local: false, reportonly: false, reporting: true, jsdelivr: false, cdnjs: false, tawk: false, gfonts: false, ga: false, gtm: false, livewire: false },
  standard: { local: false, reportonly: false, reporting: true, jsdelivr: true,  cdnjs: true,  tawk: false, gfonts: true,  ga: false, gtm: false, livewire: false },
  local:    { local: true,  reportonly: true,  reporting: true, jsdelivr: true,  cdnjs: true,  tawk: false, gfonts: true,  ga: false, gtm: false, livewire: false },
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

export function buildDirectives(state) {
  const on = (flag, sources) => (flag ? sources : []);
  const vite = state.local ? [normalizeOrigin(state.viteOrigin).value ?? DEFAULT_STATE.viteOrigin] : [];
  const script = [SELF, NONCE, ...vite,
    ...on(state.jsdelivr, ['https://cdn.jsdelivr.net']),
    ...on(state.cdnjs, ['https://cdnjs.cloudflare.com']),
    ...on(state.tawk, ['https://embed.tawk.to']),
    ...on(state.ga, ['https://www.google-analytics.com']),
    ...on(state.gtm, ['https://www.googletagmanager.com']),
    ...state.tags.script];
  const style = [SELF, NONCE, ...vite,
    ...on(state.gfonts, ['https://fonts.googleapis.com']),
    ...on(state.cdnjs, ['https://cdnjs.cloudflare.com']),
    ...state.tags.style];
  const font = [SELF, 'data:',
    ...on(state.gfonts, ['https://fonts.gstatic.com']),
    ...on(state.cdnjs, ['https://cdnjs.cloudflare.com'])];
  const img = [SELF, 'data:', ...on(state.cdnjs, ['https://cdnjs.cloudflare.com']), ...state.tags.img];
  const frame = [SELF, ...state.tags.frame];
  const connect = [SELF,
    ...vite.flatMap(origin => [wsOrigin(origin), origin]),
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
