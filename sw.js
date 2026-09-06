const CACHE_NAME = 'gta-nutrition-v2.15';
const APP_SHELL = [
  './',
  './index.html',
  './training.html',
  './meals.html',
  './quick-start.html',
  './shopping.html',
  './tracker.html',
  './plan.html',
  './cooking.html',
  './assets/training-data.js',
  './assets/training-state.js',
  './assets/training.js',
  './assets/food-data.js',
  './assets/planner-state.js',
  './assets/meal-utils.js',
  './assets/meals.js',
  './assets/groceries.js',
  './assets/today.js',
  './assets/styles.css',
  './assets/experience.css',
  './assets/experience.js',
  './assets/updates.js',
  './assets/exercise-visuals.js',
  './assets/images/exercises/abs-0.jpg',
  './assets/images/exercises/abs-1.jpg',
  './assets/images/exercises/calves-0.jpg',
  './assets/images/exercises/calves-1.jpg',
  './assets/images/exercises/curl-0.jpg',
  './assets/images/exercises/curl-1.jpg',
  './assets/images/exercises/extension-0.jpg',
  './assets/images/exercises/extension-1.jpg',
  './assets/images/exercises/incline-0.jpg',
  './assets/images/exercises/incline-1.jpg',
  './assets/images/exercises/lateral-0.jpg',
  './assets/images/exercises/lateral-1.jpg',
  './assets/images/exercises/legcurl-0.jpg',
  './assets/images/exercises/legcurl-1.jpg',
  './assets/images/exercises/legpress-0.jpg',
  './assets/images/exercises/legpress-1.jpg',
  './assets/images/exercises/pulldown-0.jpg',
  './assets/images/exercises/pulldown-1.jpg',
  './assets/images/exercises/rdl-0.jpg',
  './assets/images/exercises/rdl-1.jpg',
  './assets/images/exercises/rear-0.jpg',
  './assets/images/exercises/rear-1.jpg',
  './assets/images/exercises/row-0.jpg',
  './assets/images/exercises/row-1.jpg',
  './assets/images/exercises/split-0.jpg',
  './assets/images/exercises/split-1.jpg',
  './assets/images/exercises/squat-0.jpg',
  './assets/images/exercises/squat-1.jpg',
  './assets/images/exercises/triceps-0.jpg',
  './assets/images/exercises/triceps-1.jpg',
  './assets/images/exercises/flat-0.jpg',
  './assets/images/exercises/flat-1.jpg',
  './assets/images/exercises/fly-0.jpg',
  './assets/images/exercises/fly-1.jpg',
  './assets/images/exercises/dips-0.jpg',
  './assets/images/exercises/dips-1.jpg',
  './assets/images/exercises/pushup-0.jpg',
  './assets/images/exercises/pushup-1.jpg',
  './assets/meal-visuals.js',
  './assets/images/training-editorial.jpg',
  './assets/images/meal-editorial.jpg',
  './assets/images/snack-editorial.jpg',
  './assets/common.js',
  './assets/personal-state.js',
  './assets/personal.js',
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
      .then((cache) => cache.addAll(APP_SHELL.map(path => new Request(path, { cache: 'reload' }))))
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
    caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then((cached) => {
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
