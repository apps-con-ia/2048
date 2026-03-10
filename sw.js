const CACHE_NAME = '2048-veggie-v4';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './icon.svg',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
