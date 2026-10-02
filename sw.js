// sw.js: the service worker. It saves the app's files so the app opens offline.

const CACHE_NAME = "reading-tracker-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/backup.js",
  "./js/books.js",
  "./js/config.js",
  "./js/dates.js",
  "./js/drive.js",
  "./js/heatmap.js",
  "./js/log.js",
  "./js/storage.js",
  "./js/sync.js",
  "./js/toast.js",
  "./js/version.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// 1. Install: save a copy of every app file
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

// 2. Activate: delete caches from older versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

// 3. Fetch: network first, fall back to the saved copy when offline
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
