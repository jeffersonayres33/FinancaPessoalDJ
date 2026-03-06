const CACHE_NAME = 'financas-ai-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  '/App.tsx',
  '/constants.ts',
  '/types.ts',
  '/utils.ts',
  '/services/authService.ts',
  '/services/dataService.ts',
  '/services/geminiService.ts',
  '/services/supabaseClient.ts',
  '/services/syncService.ts',
  '/components/Header.tsx',
  '/components/Summary.tsx',
  '/components/DespesaForm.tsx',
  '/components/Charts.tsx',
  '/components/AIInsight.tsx',
  '/components/CategoryManager.tsx',
  '/components/AccountsPayable.tsx',
  '/components/ExpenseList.tsx',
  '/components/IncomeList.tsx',
  '/components/InvestmentList.tsx',
  '/components/BalanceByCategory.tsx',
  '/components/Toast.tsx',
  '/components/ConfirmModal.tsx',
  '/components/AuthScreen.tsx',
  '/components/MemberManager.tsx',
  '/components/UserProfileModal.tsx',
  '/components/AdminPanel.tsx'
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
