/**
 * LungDenoise AI — Service Worker
 * Strategy:
 *   - App shell (HTML/JS/CSS/icons) → Cache First (offline works)
 *   - API calls (/api/)              → Network First (fresh data, fallback to cache)
 *   - Images/fonts                   → Stale While Revalidate
 */

const CACHE_VERSION  = "v1.0.0";
const SHELL_CACHE    = `lungdenoise-shell-${CACHE_VERSION}`;
const API_CACHE      = `lungdenoise-api-${CACHE_VERSION}`;
const IMAGE_CACHE    = `lungdenoise-images-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

// ── Install: pre-cache shell assets ──────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn("[SW] Shell pre-cache partial failure:", err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) =>
              k !== SHELL_CACHE &&
              k !== API_CACHE &&
              k !== IMAGE_CACHE
          )
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: routing strategies ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except fonts)
  if (request.method !== "GET") return;
  if (url.origin !== location.origin && !url.hostname.includes("fonts.g")) return;

  // 1. API calls → Network First, fall back to cached response
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE, 8000));
    return;
  }

  // 2. Icons / images → Stale While Revalidate
  if (
    url.pathname.startsWith("/icons/") ||
    request.destination === "image"
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // 3. Fonts → Stale While Revalidate
  if (url.hostname.includes("fonts.g")) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // 4. JS / CSS / HTML (app shell) → Cache First
  event.respondWith(cacheFirst(request, SHELL_CACHE));
});

// ── Strategy implementations ──────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback for navigation
    if (request.mode === "navigate") {
      const shell = await caches.match("/index.html");
      if (shell) return shell;
    }
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request, cacheName, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timer);
    const cached = await caches.match(request);
    return (
      cached ||
      new Response(
        JSON.stringify({ error: "Offline — no cached response available" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await fetchPromise) || new Response("Offline", { status: 503 });
}

// ── Background sync placeholder ───────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "GET_VERSION")  event.ports[0]?.postMessage(CACHE_VERSION);
});
