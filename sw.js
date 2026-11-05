const CACHE = 'csp-v5';
const SHELL = [
  '/manifest.json', '/favicon.svg', '/icon.php?s=192', '/icon.php?s=512',
  '/assets/fonts/inter-latin-v20.woff2', '/assets/fonts/jetbrains-mono-latin-v24.woff2',
];

// Asset URLs carry ?v=<mtime>, so the page HTML lists exactly the files that belong together.
const VERSIONED_ASSET = /\/assets\/[\w./-]+\?v=\d+/g;

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const page = await fetch('/', { cache: 'no-store' });
  if (!page.ok) throw new Error(`Precache of / failed with ${page.status}`);
  const html = await page.clone().text();
  await cache.put('/', page);
  await cache.addAll([...new Set(html.match(VERSIONED_ASSET) ?? [])]);
}

self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(fallbackKey ?? request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(fallbackKey ?? request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;
  // Endpoints must always reach the server.
  if (url.pathname.endsWith('.php') && url.pathname !== '/index.php') return;

  // Only the app itself may write the offline copy of "/"; other pages are cached under their own URL.
  if (url.pathname === '/' || url.pathname === '/index.php') {
    e.respondWith(networkFirst(request, '/'));
  } else if (url.pathname.startsWith('/assets/') && (url.searchParams.has('v') || url.pathname.startsWith('/assets/fonts/'))) {
    // Versioned URLs and font files (versioned in their names) never change, so the cache answers first.
    e.respondWith(cacheFirst(request));
  } else {
    e.respondWith(networkFirst(request));
  }
});
