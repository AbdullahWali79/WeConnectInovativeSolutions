// Bump this on every release that changes app code. It renames both caches, so
// `activate` deletes the previous ones and an installed app cannot keep serving
// a stale bundle.
const CACHE_VERSION = "weconnect-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => ![STATIC_CACHE, PAGE_CACHE].includes(key)).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

function isPrivatePath(pathname) {
  return pathname.startsWith("/api/") || pathname.startsWith("/admin") || pathname.startsWith("/student") || pathname.startsWith("/login") || pathname.startsWith("/auth/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(PAGE_CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Network first, cache as the offline fallback. Cache-first here meant a
  // freshly deployed build could stay invisible on an installed app until the
  // background revalidation happened to land on the next reload.
  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? new Response("", { status: 504, statusText: "Offline" });
        }),
    );
  }
});
