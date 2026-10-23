// Kiln Offline PWA Service Worker v2.0
const CACHE_NAME = 'kiln-pwa-v2.0';
const STATIC_ASSETS = [
  '/',
  '/app/',
  '/assets/styles.css',
  '/assets/app.css',
  '/assets/app.js',
  '/assets/converter-engine.js',
  '/assets/libs/pdf-lib.min.js',
  '/assets/libs/jszip.min.js',
  '/assets/libs/marked.min.js',
  '/assets/libs/js-yaml.min.js',
  '/data/coverage-ledger.json',
  '/data/pdf-tools.json',
  '/favicon.svg',
  '/favicon-32.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Non-fatal asset precache error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cachedResp => {
      if (cachedResp) return cachedResp;
      return fetch(event.request).then(networkResp => {
        if (!networkResp || networkResp.status !== 200 || networkResp.type !== 'basic') {
          return networkResp;
        }
        const respClone = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, respClone);
        });
        return networkResp;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/app/');
        }
      });
    })
  );
});
