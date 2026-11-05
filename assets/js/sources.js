// Source validation and collapsing. Pure functions, no DOM.

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

const SOURCE_SCHEMES = ['https:', 'wss:', 'http:', 'ws:'];
export const MAX_TAGS = 50;

// Turns user input into a CSP host source: "cdn.example.com/lib.js" becomes "https://cdn.example.com".
// Keywords, bare wildcards and anything that could break out of the header are rejected.
export function normalizeSource(raw) {
  const input = String(raw ?? '').trim().replace(/,$/, '');
  const fail = error => ({ value: null, error, warning: null });
  if (!input) return fail('Enter a host, for example cdn.example.com.');
  if (/[\s'"<>`;,\\]/.test(input)) return fail("Enter a host or URL. Keywords like 'unsafe-inline' are not allowed here.");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : 'https://' + input;
  // URL parsers disagree on "*" in hostnames (Chromium percent-encodes it), so the wildcard
  // label is taken off before parsing and put back afterwards.
  const wildcard = /^[a-z][a-z0-9+.-]*:\/\/\*\./i.test(withScheme);
  let url;
  try {
    url = new URL(wildcard ? withScheme.replace('://*.', '://') : withScheme);
  } catch {
    return fail('That is not a valid host.');
  }
  if (!SOURCE_SCHEMES.includes(url.protocol)) return fail('Use https://, wss://, http:// or ws://.');
  const host = url.hostname;
  if (!HOSTNAME.test(host) || (!host.includes('.') && host !== 'localhost')) return fail('That is not a valid host.');
  const value = `${url.protocol}//${wildcard ? '*.' : ''}${host}${url.port ? ':' + url.port : ''}`;
  const warning = url.protocol === 'http:' || url.protocol === 'ws:'
    ? 'Insecure source: browsers block it on HTTPS pages as mixed content.'
    : null;
  return { value, error: null, warning };
}

export function wsOrigin(origin) {
  return origin.replace(/^http/, 'ws');
}

const HOST_SOURCE = /^([a-z][a-z0-9+.-]*):\/\/(\*\.)?([^/:]+)(?::(\d+))?$/i;

function parseHostSource(source) {
  const m = HOST_SOURCE.exec(source);
  return m ? { scheme: m[1].toLowerCase(), wildcard: Boolean(m[2]), host: m[3].toLowerCase(), port: m[4] ?? '' } : null;
}

// True when the wildcard source "scheme://*.host[:port]" matches the given source.
// CSP wildcards match any depth of subdomain but never the bare host itself.
export function covers(wildcard, source) {
  const w = parseHostSource(wildcard);
  const s = parseHostSource(source);
  if (!w || !s || !w.wildcard || w.scheme !== s.scheme || w.port !== s.port) return false;
  return s.host.endsWith('.' + w.host);
}

// Removes duplicates and any host already covered by a wildcard in the same list. Keeps first-seen order.
export function collapseSources(list) {
  const unique = [...new Set(list)];
  const wildcards = unique.filter(s => parseHostSource(s)?.wildcard);
  return unique.filter(s => !wildcards.some(w => w !== s && covers(w, s)));
}

// The origin and full URL of a web or WebSocket URL, or null for anything else (data:, javascript:, junk).
export function urlOrigin(value, base) {
  try {
    const u = new URL(value, base);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) ? { origin: u.origin, href: u.href } : null;
  } catch {
    return null;
  }
}
