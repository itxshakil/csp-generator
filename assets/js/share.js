// Config and discovery data carried in the URL hash. The hash never reaches a server.
import { DEFAULT_STATE, sanitizeState } from './state.js';
import { normalizeSource } from './sources.js';

export const MAX_HASH = 16384;
const MAX_RESOURCES = 500;
const RESOURCE_TYPES = new Set(['script', 'style', 'img', 'font', 'media', 'frame', 'connect', 'other']);

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('not base64url');
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

export function encodePayload(key, data) {
  return `${key}=${toBase64Url(JSON.stringify(data))}`;
}

// Only values that differ from the defaults are written, which keeps links short.
export function encodeShare(state) {
  const diff = {};
  for (const [key, value] of Object.entries(state)) {
    if (key !== 'v' && JSON.stringify(value) !== JSON.stringify(DEFAULT_STATE[key])) diff[key] = value;
  }
  return encodePayload('c', diff);
}

export function sanitizeResources(raw) {
  const seen = new Map();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!item || typeof item !== 'object') continue;
    const url = typeof item.u === 'string' && /^(https?|wss?):\/\//i.test(item.u) ? normalizeSource(item.u).value : null;
    if (!url) continue;
    const type = RESOURCE_TYPES.has(item.t) ? item.t : 'other';
    seen.set(`${type} ${url}`, { url, type });
    if (seen.size >= MAX_RESOURCES) break;
  }
  return [...seen.values()];
}

export function decodeHash(hash) {
  const text = String(hash ?? '').replace(/^#/, '');
  const match = /^(c|discover)=(.*)$/s.exec(text);
  if (!match) return { type: 'none' };
  if (text.length > MAX_HASH) return { type: 'error', error: 'This link is too long to be a generator link.' };
  let data;
  try {
    data = JSON.parse(fromBase64Url(match[2]));
  } catch {
    return { type: 'error', error: 'This link is damaged: its data could not be read.' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { type: 'error', error: 'This link is damaged: its data could not be read.' };
  if (match[1] === 'c') return { type: 'config', state: sanitizeState({ ...structuredClone(DEFAULT_STATE), ...data, v: 2 }) };
  const page = typeof data.p === 'string' && /^https?:\/\//i.test(data.p) ? normalizeSource(data.p).value : null;
  return { type: 'discover', page, resources: sanitizeResources(data.r) };
}

// Runs on the user's own site. It reads which origins the page loaded, listens for CSP violations for
// 3 seconds, then sends the result to the generator in the URL hash. The tab is opened right away,
// inside the click, because browsers block windows opened later from a timer.
const BOOKMARKLET = `(()=>{
const T={script:'script',link:'style',css:'style',img:'img',image:'img',video:'media',audio:'media',iframe:'frame',frame:'frame',fetch:'connect',xmlhttprequest:'connect',beacon:'connect',eventsource:'connect'};
const D={'script-src':'script','script-src-elem':'script','style-src':'style','style-src-elem':'style','img-src':'img','font-src':'font','media-src':'media','frame-src':'frame','child-src':'frame','connect-src':'connect'};
const seen=new Map();
const add=(u,t)=>{try{const o=new URL(u,location.href);if(/^(https?|wss?):$/.test(o.protocol)){seen.set(t+' '+o.origin,{u:o.origin,t})}}catch(e){}};
for(const e of performance.getEntriesByType('resource')){add(e.name,/\\.(woff2?|ttf|otf|eot)(\\?|$)/i.test(e.name)?'font':(T[e.initiatorType]||'other'))}
document.addEventListener('securitypolicyviolation',e=>add(e.blockedURI,D[e.effectiveDirective]||'other'));
const w=window.open('about:blank','_blank');
setTimeout(()=>{const j=JSON.stringify({p:location.origin,r:[...seen.values()].slice(0,500)});const b=btoa(unescape(encodeURIComponent(j))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');const url=APP+b;if(w){w.opener=null;w.location=url}else{location.href=url}},3000)
})()`;

export function bookmarkletSource(appOrigin) {
  const code = BOOKMARKLET.replace(/\n/g, '').replace('APP+b', `${JSON.stringify(`${appOrigin}/#discover=`)}+b`);
  return 'javascript:' + encodeURIComponent(code);
}
