const CACHE_NAME = 'geeta-pujan-v4';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  'https://customer-assets.emergentagent.com/job_2b9c1f6e-f9fc-4bc2-ad8d-3f79bfc7556c/artifacts/y7vt3g8x_logo.jpeg'
];

// Force update on install
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Network-first strategy for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    // Always fetch HTML from network first
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
  }
});

// Clear old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});
