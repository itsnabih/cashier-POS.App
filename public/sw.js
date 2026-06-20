// ============================================================
// Service Worker — BabyPOS PWA
//
// Caching strategies:
// - Cache-first for static assets (/_next/, fonts, icons)
// - Network-first for API calls (/api/*)
// - Precache POS page (/pos) for offline access
// - Background Sync for pending transactions
// ============================================================

const CACHE_NAME = 'babypos-v1';
const STATIC_CACHE = 'babypos-static-v1';
const API_CACHE = 'babypos-api-v1';

// Assets to precache on install
const PRECACHE_URLS = [
  '/pos',
  '/manifest.json',
];

// ---- Install: precache critical assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ---- Fetch: route-based caching ----
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // Strategy 1: Cache-first for static assets
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // Strategy 3: Network-first for navigation (pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, CACHE_NAME));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(event.request, CACHE_NAME));
});

// ---- Background Sync for offline transactions ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(notifyClientsToSync());
  }
});

// ---- Periodic Background Sync (if supported) ----
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-transactions-periodic') {
    event.waitUntil(notifyClientsToSync());
  }
});

// ---- Push notification for sync status (future use) ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================
// Caching Strategies
// ============================================================

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
    // Return a basic offline response if nothing cached
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests, try to serve the cached /pos page
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/pos');
      if (fallback) return fallback;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ============================================================
// Helper: notify all clients to trigger sync
// ============================================================

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_TRANSACTIONS' });
  }
}
