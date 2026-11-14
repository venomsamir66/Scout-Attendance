// Cache the app shell for fast repeat visits; live attendance/API requests are not cached.
const CACHE = "scout-attendance-v9";
const SHELL = [
  "./index.html", "./index2.html", "./display.html", "./admin.html",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./apple-touch-icon.png", "./scouting-logo.webp", "./setup.gif"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Only same-origin GET files are cached. Requests to script.google.com (roster, location,
  // check-in, status) are cross-origin, so they always go straight to the network.
  if (req.method !== "GET" || url.origin !== location.origin || url.search) return;
  if (!["document", "image", "script", "style", "font"].includes(req.destination)) return;

  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then((res) => {
      if (res.ok && res.type === "basic") {
        // Clone NOW, before the page starts reading the response (cloning later throws
        // "Response body is already used").
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then((cache) => cache.put(req, copy)));
      }
      return res;
    });
    if (cached) {
      e.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network;
  })());
});
