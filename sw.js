const CACHE_NAME = 'forme-v4.0.1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './app/actions.js',
  './app/css/base.css',
  './app/css/rooms.css',
  './app/data/credits.js',
  './app/data/evidence.js',
  './app/data/exercises.js',
  './app/data/foods.js',
  './app/data/fun.js',
  './app/data/recipes.js',
  './app/figure.js',
  './app/logic/command.js',
  './app/logic/habits.js',
  './app/logic/lifts.js',
  './app/logic/movement.js',
  './app/logic/nutrition.js',
  './app/logic/week.js',
  './app/main.js',
  './app/quick.js',
  './app/reminders.js',
  './app/store.js',
  './app/ui.js',
  './app/views/eat.js',
  './app/views/fun.js',
  './app/views/habits.js',
  './app/views/move.js',
  './app/views/plan.js',
  './app/views/private.js',
  './app/views/reset.js',
  './app/views/search.js',
  './app/views/today.js',
  './app/views/train.js',
  './app/views/you.js',
  './assets/icons.svg',
  './assets/fonts/sofia-sans.woff2',
  './assets/fonts/sofia-sans-italic.woff2',
  './assets/fonts/sofia-sans-condensed.woff2',
  './assets/fonts/sofia-sans-extra-condensed.woff2',
  './assets/fonts/sofia-sans-extra-condensed-italic.woff2',
  './assets/photos/bark.jpg',
  './assets/photos/burrito.jpg',
  './assets/photos/butter-chicken.jpg',
  './assets/photos/gym-rack.jpg',
  './assets/photos/keema.jpg',
  './assets/photos/noodles.jpg',
  './assets/photos/oats.jpg',
  './assets/photos/popcorn.jpg',
  './assets/photos/shake.jpg',
  './assets/photos/shawarma.jpg',
  './assets/photos/spiced-chicken.jpg',
  './assets/photos/store.jpg',
  './assets/photos/street-quiet.jpg',
  './assets/photos/street-rain.jpg',
  './assets/photos/street-toronto.jpg',
  './assets/photos/wrap.jpg',
  './assets/backup.js',
  './assets/common.js',
  './assets/core.js',
  './assets/exercise-visuals.js',
  './assets/food-data.js',
  './assets/personal-state.js',
  './assets/planner-state.js',
  './assets/recipe-guides.js',
  './assets/shopping-state.js',
  './assets/training-data.js',
  './assets/training-program.js',
  './assets/training-state.js',
  './training.html',
  './meals.html',
  './shopping.html',
  './tracker.html',
  './plan.html',
  './cooking.html',
  './quick-start.html',
];

// Gym guide photos. Not needed to start the app, so they are fetched after it is usable (see activate).
const GUIDE_PHOTOS = [
  './assets/images/exercises/abs-0.jpg',
  './assets/images/exercises/abs-1.jpg',
  './assets/images/exercises/calves-0.jpg',
  './assets/images/exercises/calves-1.jpg',
  './assets/images/exercises/curl-0.jpg',
  './assets/images/exercises/curl-1.jpg',
  './assets/images/exercises/db-calves-0.jpg',
  './assets/images/exercises/db-calves-1.jpg',
  './assets/images/exercises/deadbug-0.jpg',
  './assets/images/exercises/deadbug-1.jpg',
  './assets/images/exercises/dips-0.jpg',
  './assets/images/exercises/dips-1.jpg',
  './assets/images/exercises/extension-0.jpg',
  './assets/images/exercises/extension-1.jpg',
  './assets/images/exercises/face-pull-0.jpg',
  './assets/images/exercises/face-pull-1.jpg',
  './assets/images/exercises/flat-0.jpg',
  './assets/images/exercises/flat-1.jpg',
  './assets/images/exercises/flat-barbell-0.jpg',
  './assets/images/exercises/flat-barbell-1.jpg',
  './assets/images/exercises/fly-0.jpg',
  './assets/images/exercises/fly-1.jpg',
  './assets/images/exercises/goblet-0.jpg',
  './assets/images/exercises/goblet-1.jpg',
  './assets/images/exercises/hammer-0.jpg',
  './assets/images/exercises/hammer-1.jpg',
  './assets/images/exercises/hanging-raise-0.jpg',
  './assets/images/exercises/hanging-raise-1.jpg',
  './assets/images/exercises/hip-thrust-0.jpg',
  './assets/images/exercises/hip-thrust-1.jpg',
  './assets/images/exercises/incline-0.jpg',
  './assets/images/exercises/incline-1.jpg',
  './assets/images/exercises/lateral-0.jpg',
  './assets/images/exercises/lateral-1.jpg',
  './assets/images/exercises/legcurl-0.jpg',
  './assets/images/exercises/legcurl-1.jpg',
  './assets/images/exercises/legpress-0.jpg',
  './assets/images/exercises/legpress-1.jpg',
  './assets/images/exercises/lying-legcurl-0.jpg',
  './assets/images/exercises/lying-legcurl-1.jpg',
  './assets/images/exercises/lying-triceps-0.jpg',
  './assets/images/exercises/lying-triceps-1.jpg',
  './assets/images/exercises/one-arm-row-0.jpg',
  './assets/images/exercises/one-arm-row-1.jpg',
  './assets/images/exercises/preacher-0.jpg',
  './assets/images/exercises/preacher-1.jpg',
  './assets/images/exercises/pulldown-0.jpg',
  './assets/images/exercises/pulldown-1.jpg',
  './assets/images/exercises/pullup-0.jpg',
  './assets/images/exercises/pullup-1.jpg',
  './assets/images/exercises/pullup-weighted-0.jpg',
  './assets/images/exercises/pullup-weighted-1.jpg',
  './assets/images/exercises/pushdown-0.jpg',
  './assets/images/exercises/pushdown-1.jpg',
  './assets/images/exercises/pushup-0.jpg',
  './assets/images/exercises/pushup-1.jpg',
  './assets/images/exercises/rdl-0.jpg',
  './assets/images/exercises/rdl-1.jpg',
  './assets/images/exercises/rear-0.jpg',
  './assets/images/exercises/rear-1.jpg',
  './assets/images/exercises/reverse-lunge-0.jpg',
  './assets/images/exercises/reverse-lunge-1.jpg',
  './assets/images/exercises/row-0.jpg',
  './assets/images/exercises/row-1.jpg',
  './assets/images/exercises/seated-row-0.jpg',
  './assets/images/exercises/seated-row-1.jpg',
  './assets/images/exercises/shoulder-press-0.jpg',
  './assets/images/exercises/shoulder-press-1.jpg',
  './assets/images/exercises/split-0.jpg',
  './assets/images/exercises/split-1.jpg',
  './assets/images/exercises/squat-0.jpg',
  './assets/images/exercises/squat-1.jpg',
  './assets/images/exercises/straight-arm-0.jpg',
  './assets/images/exercises/straight-arm-1.jpg',
  './assets/images/exercises/triceps-0.jpg',
  './assets/images/exercises/triceps-1.jpg',
];

// Forme offline cache.
// Precached on install: the app shell, every app/ module and stylesheet, the shared assets/*.js
// modules the app imports, icons, fonts, photos and the redirect pages for old bookmarks.
// Fetched in the background once the app is active: the gym guide photos, so the lift guides work
// in a gym with no signal. A photo that fails is cached the first time it is opened instead.
// Cached on first use: the PDFs.
// Caches hold static files only. User data lives in localStorage and this worker never touches it.

const PRECACHE_SET = new Set(PRECACHE);

function isCacheable(url) {
  const scopePath = new URL('./', self.location.href).pathname;
  const rel = './' + url.pathname.slice(scopePath.length);
  return PRECACHE_SET.has(rel) || rel.startsWith('./assets/images/exercises/') || rel.endsWith('.pdf');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE.map((path) => new Request(path, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => (name.startsWith('gta-nutrition-') || name.startsWith('forme-')) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim())
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => Promise.allSettled(GUIDE_PHOTOS.map((path) => cache.match(path).then((hit) => hit || cache.add(path))))),
  );
});

// A habit reminder was tapped: bring Forme forward, or open it on Habits.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((client) => 'focus' in client);
      return open ? open.focus() : self.clients.openWindow('./index.html#/habits');
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const navigate = request.mode === 'navigate';
  event.respondWith(
    caches.match(request, { ignoreSearch: navigate }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && isCacheable(url)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (navigate) return caches.match('./index.html');
        return Response.error();
      });
    }),
  );
});
