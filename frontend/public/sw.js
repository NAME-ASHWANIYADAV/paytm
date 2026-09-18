/**
 * MunshiJi service worker — the installability floor, nothing more.
 *
 * Deliberately network-only: MunshiJi fronts an online-only API, so a cached
 * app shell would just be a dead screen with no data behind it. No caches are
 * opened, nothing is precached; every request goes straight to the network.
 */

self.addEventListener('install', () => {
  // Take over from any previous worker immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Control already-open pages without waiting for a reload.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through: network only, no caching. Explicit respondWith(fetch(...))
  // rather than an empty handler, so the browser does not treat this as a
  // no-op fetch handler and skip the worker.
  event.respondWith(fetch(event.request));
});
