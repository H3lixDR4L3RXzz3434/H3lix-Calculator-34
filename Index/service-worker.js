const CACHE_NAME = 'h3lix-calculator-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/multiplayer.js',
  '/manifest.webmanifest',
  '/Imagen%2026%20(1).ico'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(response => response || caches.match('/index.html')))
  );
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (error) {}
  event.waitUntil(self.registration.showNotification(payload.title || '¡Te esperamos! 🎮', {
    body: payload.body || 'Ven a jugar y calcular un rato con nosotros 🧮✨',
    icon: '/Imagen%2026%20(1).ico',
    badge: '/Imagen%2026%20(1).ico',
    tag: 'calculator-play-reminder',
    data: { url: payload.url || '/' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const client = clients.find(windowClient => windowClient.url.startsWith(self.location.origin));
    return client ? client.focus() : self.clients.openWindow(targetUrl);
  }));
});
