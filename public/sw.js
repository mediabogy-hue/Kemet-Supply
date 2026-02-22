// Service Worker

const CACHE_NAME = 'kemet-supply-cache-v1';

// App Shell: Files that are essential for the app to run offline.
const urlsToCache = [
  '/',
  '/offline.html',
  '/favicon.svg',
];

// 1. Install the service worker and cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 2. Activate the service worker and clean up old caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Intercept fetch requests and apply caching strategies.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Don't cache Firestore requests, let Firestore's offline persistence handle it.
  if (request.url.includes('firestore.googleapis.com')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Don't cache Chrome extension requests
  if (request.url.startsWith('chrome-extension://')) {
    event.respondWith(fetch(request));
    return;
  }

  // Strategy: Stale-While-Revalidate for navigation and static assets.
  // This serves content from cache immediately for speed, then updates the cache in the background.
  if (request.mode === 'navigate' || request.destination === 'script' || request.destination === 'style' || request.destination === 'font' || request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchedResponsePromise = fetch(request).then((networkResponse) => {
            // If the fetch is successful, update the cache.
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // If the network request fails and there's no cached response for navigation, show the offline page.
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });

          // Return the cached response immediately if available, otherwise wait for the network.
          return cachedResponse || fetchedResponsePromise;
        });
      })
    );
  } else {
    // For other requests (like APIs that aren't Firestore), you might use a Network First strategy.
    // For this project, most data comes from Firestore, so we'll stick to the above.
    event.respondWith(fetch(request));
  }
});

// Listen for messages from the client to skip waiting and activate the new service worker.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
