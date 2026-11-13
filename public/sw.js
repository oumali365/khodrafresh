// ============================================================
// ملف: sw.js – Service Worker لتطبيق خُضرة (نسخة محسنة ضد الأعطال)
// ============================================================

const CACHE_NAME = 'khodra-v6-fresh';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/images/icons/favicon-96x96.png',
  '/images/icons/favicon.svg',
  '/images/icons/apple-touch-icon.png',
  '/images/icons/web-app-manifest-192x192.png',
  '/images/icons/web-app-manifest-512x512.png'
];

// ─── تثبيت Service Worker وتخزين الأساسيات ───
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // محاولة إضافة الملفات بشكل فردي حتى لا يفشل التثبيت إذا تعذر ملف واحد
      return Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`تعذر تخزين ${url} في الكاش:`, err);
          })
        )
      );
    })
  );
});

// ─── تفعيل Service Worker وتنظيف الكاش القديم فوراً ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ تنظيف الكاش القديم:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── استراتيجية التعامل مع الطلبات (Resilient Fetch Strategy) ───
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1. تجاهل أي طلب غير GET أو غير http/https
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // 2. تجاهل طلبات API الخارجية وSupabase وGoogle Analytics حتى لا تتعطل البيانات المباشرة
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googletagmanager') ||
    url.hostname.includes('google-analytics') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 3. لطلبات الصفحات والتنقل (HTML / Navigation): نعتمد Network-First
  // نطلب دائماً من الخادم أولاً لضمان الحصول على آخر تحديث، ومع العودة للكاش فقط عند انقطاع الإنترنت
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // في حالة عدم وجود إنترنت فقط، نقدم النسخة المخزنة
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html') || await caches.match('/');
          return fallback || Response.error();
        })
    );
    return;
  }

  // 4. لملفات الصور والأيقونات والخطوط: Stale-While-Revalidate أو Cache-First
  const isStaticAsset =
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|eot)$/i) ||
    url.pathname.includes('/assets/images/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // تحديث الكاش في الخلفية
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. لملفات الجافاسكريبت وCSS وباقي الطلبات: نطلبها من الشبكة مباشرة لمنع تقديم HTML بدلاً من JS
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── إرسال إشعارات ───
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body || 'عروض جديدة في متجر خُضرة!',
    icon: '/images/icons/web-app-manifest-192x192.png',
    badge: '/images/icons/favicon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'خُضرة', options)
  );
});

// ─── فتح التطبيق عند النقر على الإشعار ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});