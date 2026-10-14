const CACHE_NAME = "finance-pwa-v1";
const ASSETS = ["/", "/index.html"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Reminder", {
      body: data.body || "A reminder is due",
      icon: "/icon.svg",
      badge: "/icon.svg",
    })
  );
});