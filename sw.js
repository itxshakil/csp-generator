const CACHE = 'csp-v1';
const FONT_CACHE = 'csp-fonts-v1';
const SHELL = ['/', '/manifest.json', '/favicon.svg', '/icon.php?s=192', '/icon.php?s=512'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(c =>
        c.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; });
        })
      )
    );
    return;
  }

  if (url.origin === location.origin) {
    if (url.pathname === '/' || url.pathname === '/index.php') {
      e.respondWith(
        fetch(e.request)
          .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
          .catch(() => caches.match('/'))
      );
    } else {
      e.respondWith(
        caches.match(e.request).then(cached =>
          cached || fetch(e.request).then(res => {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
            return res;
          })
        )
      );
    }
  }
});
