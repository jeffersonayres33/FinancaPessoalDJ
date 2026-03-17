const CACHE_NAME = 'financas-ai-v3';

// Apenas cachear o shell básico. O restante será cacheado dinamicamente.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o novo service worker a assumir o controle imediatamente
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

  // Estratégia Network-First para assets estáticos (HTML, JS, CSS) para garantir a versão mais recente
  // Especialmente importante para o GitHub Pages
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Atualiza o cache com a nova versão
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        // Se falhar (offline), tenta buscar do cache
        return caches.match(event.request);
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
    }).then(() => {
      return self.clients.claim(); // Garante que as abas abertas usem o novo SW
    })
  );
});
