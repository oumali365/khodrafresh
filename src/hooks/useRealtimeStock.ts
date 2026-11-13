// ============================================================
// src/hooks/useRealtimeStock.ts
// خطاف الاشتراك اللحظي في تحديثات المخزون والطلبات (Supabase Realtime)
// يضمن تزامن رصيد المخزون في شاشات كافة الزبائن والمدير فور وقوع أي خصم أو تعديل
// ============================================================

import { useEffect, useRef } from 'react';
import { getSupabase } from '../services/supabaseService';
import { logger } from '../utils/logger';

interface UseRealtimeStockOptions {
  onStockUpdated?: (productId: number, newStock: number, isAvailable: boolean) => void;
  onProductsReloadNeeded?: () => void;
  onOrderChange?: () => void;
  enabled?: boolean;
}

export function useRealtimeStock({
  onStockUpdated,
  onProductsReloadNeeded,
  onOrderChange,
  enabled = true,
}: UseRealtimeStockOptions = {}) {
  const onStockUpdatedRef = useRef(onStockUpdated);
  const onProductsReloadNeededRef = useRef(onProductsReloadNeeded);
  const onOrderChangeRef = useRef(onOrderChange);

  onStockUpdatedRef.current = onStockUpdated;
  onProductsReloadNeededRef.current = onProductsReloadNeeded;
  onOrderChangeRef.current = onOrderChange;

  useEffect(() => {
    if (!enabled) return;

    const client = getSupabase();
    if (!client) return;

    let channel: any = null;

    try {
      channel = client
        .channel(`khodra_realtime_stock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
        // 1. الاستماع لتغيرات جدول المنتجات (products)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload: any) => {
            try {
              const newRow = payload.new;
              if (newRow && newRow.id != null) {
                const pid = Number(newRow.id);
                const rawStock = Number(newRow.stock ?? 0);
                const isAvail = Boolean(newRow.is_available !== false && rawStock > 0);

                // إبلاغ المستمع عبر رد النداء
                if (onStockUpdatedRef.current) {
                  onStockUpdatedRef.current(pid, rawStock, isAvail);
                }

                // إطلاق حدث المتصفح لتحديث كافة المكونات المفتوحة
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('khodra_product_stock_changed', {
                      detail: { id: pid, stock: rawStock, is_available: isAvail },
                    })
                  );
                }
              }

              // إعادة تحميل الكتالوج إن طُلب
              if (onProductsReloadNeededRef.current) {
                onProductsReloadNeededRef.current();
              }
            } catch (err) {
              logger.warn('Error handling realtime products payload:', err);
            }
          }
        )
        // 2. الاستماع لتغيرات جدول الطلبات (orders)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            try {
              if (onOrderChangeRef.current) {
                onOrderChangeRef.current();
              }
            } catch (err) {
              logger.warn('Error handling realtime orders payload:', err);
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            logger.info('✅ Subscribed to Supabase Realtime stock & orders stream');
          }
        });
    } catch (err) {
      logger.warn('Failed to initialize Supabase Realtime channel for stock:', err);
    }

    return () => {
      if (client && channel) {
        try {
          client.removeChannel(channel);
        } catch (e) {
          logger.warn('Error removing realtime channel:', e);
        }
      }
    };
  }, [enabled]);
}
