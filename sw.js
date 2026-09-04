const CACHE_NAME = 'gta-nutrition-v1';
const APP_SHELL = [
  './',
  './index.html',
  './quick-start.html',
  './shopping.html',
  './tracker.html',
  './plan.html',
  './cooking.html',
  './assets/styles.css',
  './assets/common.js',
  './assets/core.js',
  './assets/shopping-state.js',
  './assets/backup.js',
  './assets/shopping.js',
  './assets/tracker.js',
  './assets/home.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest',
  './GTA_16_Week_Nutrition_Plan.pdf',
  './Mothers_Sunday_Cooking_Sheet.pdf',
  './Quick_Start_Card.pdf',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('gta-nutrition-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    }),
  );
});
