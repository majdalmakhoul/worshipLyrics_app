const CACHE_NAME = 'worship-lyrics-app-v6';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/styles/global.css',
  '/src/styles/layout.css',
  '/src/styles/components.css',
  '/src/styles/slideshow.css',
  '/src/js/data.js',
  '/src/js/search.js',
  '/src/js/projection.js',
  '/src/js/render.js',
  '/src/js/slideshow.js',
  '/src/js/pptx.js',
  '/src/js/appearance.js',
  '/src/js/pwa.js',
  '/src/js/main.js',
  '/src/icons/icon.svg',
  '/src/icons/icon-maskable.svg',
  '/src/icons/icon-192.png',
  '/src/icons/icon-512.png',
  '/src/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if(url.origin === location.origin && url.pathname.endsWith('/api/songs')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      if(response && response.ok && url.origin === location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => (
      caches.match(event.request).then(cached => cached || caches.match('/index.html'))
    ))
  );
});
