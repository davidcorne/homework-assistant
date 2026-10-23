var CACHE = "homework-assistant-v7";

var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./logic.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
          return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function fromCache(req) {
  return caches.match(req).then(function (cached) {
    if (cached) return cached;
    return req.mode === "navigate" ? caches.match("./index.html") : undefined;
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Network first, for pages and assets alike, so the HTML, scripts and styles
  // a page loads always come from the same release. Without this a deploy can
  // pair a fresh index.html with a stale app.js from the cache. The cache is
  // only the offline fallback.
  event.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }
        return fromCache(req).then(function (cached) { return cached || res; });
      })
      .catch(function () {
        return fromCache(req).then(function (cached) {
          return cached || Response.error();
        });
      })
  );
});
