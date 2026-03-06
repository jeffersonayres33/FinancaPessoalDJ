const CACHE_NAME = 'financas-ai-v1';
const BASE_PATH = '/FinancaPessoalDJ';

const ASSETS_TO_CACHE = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/index.tsx',
  BASE_PATH + '/App.tsx',
  BASE_PATH + '/constants.ts',
  BASE_PATH + '/types.ts',
  BASE_PATH + '/utils.ts',
  BASE_PATH + '/services/authService.ts',
  BASE_PATH + '/services/dataService.ts',
  BASE_PATH + '/services/geminiService.ts',
  BASE_PATH + '/services/supabaseClient.ts',
  BASE_PATH + '/services/syncService.ts',
  BASE_PATH + '/components/Header.tsx',
  BASE_PATH + '/components/Summary.tsx',
  BASE_PATH + '/components/DespesaForm.tsx',
  BASE_PATH + '/components/Charts.tsx',
  BASE_PATH + '/components/AIInsight.tsx',
  BASE_PATH + '/components/CategoryManager.tsx',
  BASE_PATH + '/components/AccountsPayable.tsx',
  BASE_PATH + '/components/ExpenseList.tsx',
  BASE_PATH + '/components/IncomeList.tsx',
  BASE_PATH + '/components/InvestmentList.tsx',
  BASE_PATH + '/components/BalanceByCategory.tsx',
  BASE_PATH + '/components/Toast.tsx',
  BASE_PATH + '/components/ConfirmModal.tsx',
  BASE_PATH + '/components/AuthScreen.tsx',
  BASE_PATH + '/components/MemberManager.tsx',
  BASE_PATH + '/components/UserProfileModal.tsx',
  BASE_PATH + '/components/AdminPanel.tsx'
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
