// Service Worker for Barcode PDF Generator
// Caches app shell and CDN libraries for offline use

const CACHE_NAME = 'barcode-gen-v2';
const APP_ASSETS = [
  './',
  './index.html',
  './app.js',
  './pdfGenerator.js',
  './style.css',
  './manifest.json'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js'
];

// Install: cache app shell and CDN assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache app assets first (these should always succeed)
      return cache.addAll(APP_ASSETS).then(() => {
        // Try to cache CDN assets, but don't fail install if they're unavailable
        return Promise.allSettled(
          CDN_ASSETS.map((url) => cache.add(url))
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for app assets, cache-first for CDN
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For CDN assets, use cache-first strategy
  if (url.hostname !== location.hostname) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For app assets, use network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
