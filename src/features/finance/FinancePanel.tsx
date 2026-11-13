// ============================================================
// FinancePanel.tsx – التقرير والمركز المالي لمتجر خُضرة — فاس
// مصدر الحقيقة: بيانات Supabase الحقيقية للطلبات (Real Financial Dashboard)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  fetchOrders,
  subscribeToOrdersChanges,
  unsubscribeFromOrdersChanges,
  type DbOrder,
} from '../../services/supabaseService';
import { RealFinanceTab } from './RealFinanceTab';

export interface FinancePanelProps {
  isOpen?: boolean;
  standalone?: boolean;
  onClose?: () => void;
}

export type FinanceLang = 'ar' | 'fr' | 'en';

export const FinancePanel: React.FC<FinancePanelProps> = ({
  isOpen = false,
  standalone = false,
  onClose,
}) => {
  const [lang, setLang] = useState<FinanceLang>('ar');
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // ─── مزامنة الطلبات الحقيقية من Supabase في الوقت الفعلي ───
  const loadOrders = () => {
    setIsSyncing(true);
    fetchOrders()
      .then((data) => {
        setOrders(data || []);
        setIsSyncing(false);
      })
      .catch((err) => {
        console.warn('FinancePanel fetch orders error:', err);
        setIsSyncing(false);
      });
  };

  useEffect(() => {
    let mounted = true;
    setIsSyncing(true);

    fetchOrders()
      .then((data) => {
        if (mounted) {
          setOrders(data || []);
          setIsSyncing(false);
        }
      })
      .catch((err) => {
        console.warn('FinancePanel fetch orders error:', err);
        if (mounted) setIsSyncing(false);
      });

    const channel = subscribeToOrdersChanges(() => {
      fetchOrders().then((data) => {
        if (mounted) setOrders(data || []);
      });
    });

    return () => {
      mounted = false;
      if (channel) unsubscribeFromOrdersChanges(channel);
    };
  }, []);

  // قفل تمرير الصفحة فقط في وضع النافذة المنبثقة
  useEffect(() => {
    if (isOpen && !standalone) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, standalone]);

  useEffect(() => {
    if (!isOpen || standalone) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, standalone, onClose]);

  if (!isOpen && !standalone) return null;

  const panelBody = (
    <div
      lang={lang}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`relative bg-[#FAF8F4] w-full ${
        standalone
          ? 'max-w-7xl mx-auto shadow-sm rounded-3xl'
          : 'sm:max-w-6xl shadow-2xl sm:rounded-3xl max-h-screen sm:max-h-[95vh] flex flex-col overflow-hidden'
      } text-right border border-[#E8E1D3]`}
    >
      {/* ═══════ الترويسة الاحترافية الأنيقة ═══════ */}
      <div className="p-4 sm:p-5 bg-[#163920] text-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-xs border-b border-white/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-black text-base sm:text-lg">
                {lang === 'ar' ? 'التقرير المالي' : 'Rapport Financier'}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-emerald-300">
                {orders.length} {lang === 'ar' ? 'طلب' : 'commandes'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-300 font-normal">
              {lang === 'ar'
                ? 'متابعة الإيرادات وتكاليف البضائع وهوامش الربح الفعلية'
                : 'Revenus, coûts des marchandises et marges nettes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          {/* زر التحديث السريع */}
          <button
            type="button"
            onClick={loadOrders}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            title={lang === 'ar' ? 'تحديث البيانات' : 'Actualiser'}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* مبدل اللغة */}
          <div className="flex items-center bg-black/30 rounded-xl border border-white/15 p-0.5">
            {(['fr', 'ar', 'en'] as FinanceLang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  lang === l ? 'bg-white text-[#163920]' : 'text-white/70 hover:text-white'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {!standalone && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ═══════ المحتوى المالي المباشر ═══════ */}
      <div className={`${standalone ? 'p-4 sm:p-6' : 'flex-1 overflow-y-auto p-4 sm:p-6'}`}>
        <RealFinanceTab
          orders={orders}
          lang={lang}
          isSyncing={isSyncing}
          onRefreshOrders={loadOrders}
        />
      </div>
    </div>
  );

  if (standalone) {
    return <div className="w-full space-y-4">{panelBody}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      {panelBody}
    </div>
  );
};

export default FinancePanel;