// Minimaler Netzwerk-First Service Worker (nur für volle Android-WebAPK-Installierbarkeit, kein aggressives Caching)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
