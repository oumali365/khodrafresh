import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

// ─── إدارة Service Worker بحماية كاملة ضد التعليق ───
const manageServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  const isDev =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('ais-dev') ||
    window.location.hostname.includes('ais-pre') ||
    window.location.hostname.includes('run.app') ||
    window.self !== window.top;

  if (isDev) {
    // في بيئة التطوير التجريبية، نلغي أي Service Worker لتجنب تداخل الكاش مع التحديثات الحية
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().then(() => {
          console.log('🧹 تم إلغاء Service Worker في بيئة التطوير.');
        });
      }
    });
    return;
  }

  // في بيئة الإنتاج الفعلية
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // التحقق التلقائي من التحديثات
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 يتوفر تحديث جديد للمتجر');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('تعذر تسجيل Service Worker:', err);
      });
  });
};

// ─── تشغيل التطبيق محمي بـ ErrorBoundary ───
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// تشغيل إدارة الـ Service Worker
manageServiceWorker();

// ─── معالجة حدث التثبيت للتطبيق (PWA) ───
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // الاحتفاظ بالحدث للاستخدام لاحقاً إن دعت الحاجة
  (window as unknown as { deferredPrompt: unknown }).deferredPrompt = e;
});