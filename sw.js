const CACHE = "trainwith-z-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/app.js?v=9",
  "./src/styles.css?v=9",
  "./src/core/analytics.js?v=1",
  "./src/core/db.js?v=2",
  "./src/core/insights.js?v=1",
  "./src/core/state.js?v=2",
  "./src/data/program.js?v=1",
  "./src/ui/components.js?v=2",
  "./src/features/views.js?v=5",
  "./assets/hero-athlete.png",
  "./assets/app-design-athlete.png",
  "./assets/app-design-athlete-crop.png",
  "./assets/trainwith-z-official-brand.png",
  "./assets/trainwith-z-mark.svg",
  "./assets/trainwith-z-logo.svg",
  "./assets/weekly-ai-bg.png",
  "./assets/workout-focus-bg.png",
  "./assets/trainwith-z-brand-sheet.png",
  "./assets/icon-192.svg",
  "./assets/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
