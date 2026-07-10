const CACHE = "trainwith-z-v93";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/app.js?v=69",
  "./src/styles.css?v=63",
  "./src/core/analytics.js?v=1",
  "./src/core/db.js?v=3",
  "./src/core/insights.js?v=2",
  "./src/core/state.js?v=19",
  "./src/core/pdf-importer.js?v=1",
  "./src/data/program.js?v=2",
  "./src/ui/components.js?v=5",
  "./src/features/views.js?v=49",
  "./assets/hero-athlete.png",
  "./assets/app-design-athlete.png",
  "./assets/app-design-athlete-crop.png",
  "./assets/trainwith-z-official-brand.png",
  "./assets/trainwith-z-mark.svg?v=3",
  "./assets/trainwith-z-logo.svg?v=5",
  "./assets/weekly-ai-bg.png",
  "./assets/workout-focus-bg.png",
  "./assets/trainwith-z-brand-sheet.png",
  "./assets/icon-192.svg",
  "./assets/icon-512.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/trainwith-z-app-icon-v2.png"
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
  const requestUrl = new URL(event.request.url);
  const isCoreFile = event.request.mode === "navigate" ||
    [".html", ".js", ".css", ".webmanifest"].some((suffix) => requestUrl.pathname.endsWith(suffix));
  if (isCoreFile) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }
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
