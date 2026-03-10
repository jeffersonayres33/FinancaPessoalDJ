const CACHE_NAME = 'financas-ai-v1';

// Apenas cachear o shell básico. O restante será cacheado dinamicamente.
const ASSETS_TO_CACHE = [
  '/FinancaPessoalDJ/',
  '/FinancaPessoalDJ/index.html',
  '/FinancaPessoalDJ/manifest.json',
  '/FinancaPessoalDJ/icon-192.png',
  '/FinancaPessoalDJ/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Estratégia Network First para API (Supabase, Gemini)
  if (event.request.url.includes('supabase.co') || event.request.url.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para assets estáticos
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
