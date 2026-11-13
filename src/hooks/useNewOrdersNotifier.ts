// ============================================================
// useNewOrdersNotifier.ts – Hook مبسّط لمراقبة الطلبات الجديدة
// منطق مضمون: يعتمد على آخر ID شوهد، بسيط ولا يتضارب
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchOrders,
  subscribeToOrdersChanges,
  unsubscribeFromOrdersChanges,
} from '../services/supabaseService';

interface UseNewOrdersNotifierOptions {
  enabled: boolean;
  pollIntervalMs?: number;
}

interface UseNewOrdersNotifierResult {
  newCount: number;           // عدد الطلبات الجديدة منذ آخر مشاهدة
  totalPending: number;       // إجمالي الطلبات المعلقة
  markAsSeen: () => void;     // إعادة تعيين بعد فتح اللوحة
  refresh: () => Promise<void>;
}

const LAST_SEEN_ID_KEY = 'khodra_last_seen_order_id_v2';

function getLastSeenId(): number {
  try {
    const v = localStorage.getItem(LAST_SEEN_ID_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export function useNewOrdersNotifier({
  enabled,
  pollIntervalMs = 45000,
}: UseNewOrdersNotifierOptions): UseNewOrdersNotifierResult {
  const [newCount, setNewCount] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  // آخر ID رأيته (يُحفظ في localStorage)
  const lastSeenIdRef = useRef<number>(getLastSeenId());

  // حماية من الفحص المتكرر
  const lastFetchRef = useRef<number>(0);
  // منع تشغيل الصوت لأول فحص بعد إعادة التحميل
  const isFirstFetchRef = useRef<boolean>(true);

  const checkOrders = useCallback(async () => {
    // حماية: لا تفحص مرتين خلال 8 ثوانٍ
    const now = Date.now();
    if (now - lastFetchRef.current < 8000) return;
    lastFetchRef.current = now;

    try {
      // جلب كل الطلبات
      const orders = await fetchOrders();

      // الطلبات المعلقة فقط
      const pendingOrders = orders.filter((o) => o.status === 'pending');
      setTotalPending(pendingOrders.length);

      if (pendingOrders.length === 0) {
        setNewCount(0);
        return;
      }

      // أعلى ID في الطلبات المعلقة
      const maxId = Math.max(
        ...pendingOrders.map((o) => {
          const n = Number(o.id);
          return isNaN(n) ? 0 : n;
        })
      );

      const lastSeen = lastSeenIdRef.current;

      // ─── أول فحص بعد فتح الصفحة ───
      if (isFirstFetchRef.current) {
        isFirstFetchRef.current = false;

        // إذا كان lastSeen = 0 (مستخدم جديد)، احفظ maxId كبداية
        if (lastSeen === 0) {
          lastSeenIdRef.current = maxId;
          try {
            localStorage.setItem(LAST_SEEN_ID_KEY, String(maxId));
          } catch {}
          setNewCount(0);
          return;
        }

        // احسب الجديد منذ آخر جلسة
        const newOnes = pendingOrders.filter((o) => {
          const n = Number(o.id);
          return !isNaN(n) && n > lastSeen;
        });

        setNewCount(newOnes.length);
        return;
      }

      // ─── فحوصات لاحقة ───
      const newOnes = pendingOrders.filter((o) => {
        const n = Number(o.id);
        return !isNaN(n) && n > lastSeen;
      });

      setNewCount(newOnes.length);
    } catch (err) {
      console.warn('خطأ في فحص الطلبات الجديدة:', err);
    }
  }, []);

  // ─── إعادة تعيين بعد فتح اللوحة ───
  const markAsSeen = useCallback(async () => {
    try {
      // اجلب الطلبات المعلقة الحالية وسجّل أعلى ID
      const orders = await fetchOrders();
      const pendingOrders = orders.filter((o) => o.status === 'pending');

      if (pendingOrders.length > 0) {
        const maxId = Math.max(
          ...pendingOrders.map((o) => {
            const n = Number(o.id);
            return isNaN(n) ? 0 : n;
          })
        );
        lastSeenIdRef.current = maxId;
        try {
          localStorage.setItem(LAST_SEEN_ID_KEY, String(maxId));
        } catch {}
      }

      setNewCount(0);
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.warn('خطأ في markAsSeen:', err);
    }
  }, []);

  // ─── فحص فوري ───
  const refresh = useCallback(async () => {
    lastFetchRef.current = 0;
    await checkOrders();
  }, [checkOrders]);

  // ─── المراقبة الدورية ───
  useEffect(() => {
    if (!enabled) {
      setNewCount(0);
      setTotalPending(0);
      isFirstFetchRef.current = true;
      return;
    }

    // فحص أولي
    checkOrders();

    // فحص دوري كل 45 ثانية كاحتياط
    const interval = setInterval(checkOrders, pollIntervalMs);

    // ⚡ اشتراك Realtime لحظي: تحديث فوري فور تسجيل أو تعديل أي طلب
    const channel = subscribeToOrdersChanges((payload) => {
      console.log('⚡ Realtime order event received:', payload.eventType);
      refresh();
    });

    // فحص عند العودة للتبويب
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // فحص عند استعادة الإنترنت
    const handleOnline = () => refresh();
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      unsubscribeFromOrdersChanges(channel);
    };
  }, [enabled, pollIntervalMs, checkOrders, refresh]);

  return { newCount, totalPending, markAsSeen, refresh };
}