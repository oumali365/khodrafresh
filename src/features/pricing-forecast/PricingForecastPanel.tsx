// ============================================================
// src/features/pricing-forecast/PricingForecastPanel.tsx
// اللوحة المتكاملة للتسعير الديناميكي وإدارة الموردين وأسعار السوق
// تصميم حديث واحترافي لمتجر "خُضرة"
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Building2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { ProductPriceRow, Supplier } from './types';
import {
  getProductPricingRows,
  saveProductPrices,
  getSuppliers,
  saveSupplier,
  deleteSupplier,
} from './pricingService';
import { MorningPricingTable } from './MorningPricingTable';
import { SupplierModal } from './SupplierModal';

export interface PricingForecastPanelProps {
  standalone?: boolean;
  isOpen?: boolean;
  targetProductId?: number | null;
  onClose?: () => void;
  onNavigateToInventory?: (productId: number) => void;
}

export const PricingForecastPanel: React.FC<PricingForecastPanelProps> = ({
  standalone = true,
  isOpen = true,
  targetProductId = null,
  onClose,
  onNavigateToInventory,
}) => {
  const [currentFocusedProductId, setCurrentFocusedProductId] = useState<number | null>(targetProductId);
  const [rows, setRows] = useState<ProductPriceRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (targetProductId != null) {
      setCurrentFocusedProductId(targetProductId);
    }
  }, [targetProductId]);

  useEffect(() => {
    const handleOpenPricing = (e: any) => {
      const pid = e?.detail?.productId;
      if (pid != null) {
        setCurrentFocusedProductId(Number(pid));
      }
    };
    window.addEventListener('khodra_open_pricing_for_product', handleOpenPricing);
    return () => window.removeEventListener('khodra_open_pricing_for_product', handleOpenPricing);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const pricingRes = await getProductPricingRows();
      setRows(pricingRes.rows);
      setSuppliers(pricingRes.suppliers);
    } catch {
      setNotice('تعذر تحميل أحدث بيانات الأسعار، تم الاعتماد على النسخة المحلية المعتمدة');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // حفظ الأسعار دفعة واحدة ومزامنة البيانات
  const handleSaveBatch = async (
    updates: {
      productId: number;
      purchasePrice: number;
      marginPercentage: number;
      sellingPrice?: number;
      supplierId: string;
      hasException?: boolean;
      exceptionReason?: string;
      oldPrice?: number;
      productName?: string;
      unitLabel?: string;
    }[]
  ) => {
    setIsSaving(true);
    try {
      const success = await saveProductPrices(updates);
      if (success) {
        setNotice('تم حفظ وتحديث أسعار المنتجات في قاعدة البيانات وتوثيقها في سجل التدقيق بنجاح!');
        setTimeout(() => setNotice(null), 3500);
        await loadData();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // حفظ مورد
  const handleSaveSupplier = async (supData: Partial<Supplier> & { name: string }) => {
    const saved = await saveSupplier(supData);
    setSuppliers((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    setNotice(`تم حفظ بيانات المورد "${saved.name}" بنجاح!`);
    setTimeout(() => setNotice(null), 3000);
  };

  // حذف مورد
  const handleDeleteSupplier = async (id: string) => {
    await deleteSupplier(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setNotice('تم حذف المورد بنجاح');
    setTimeout(() => setNotice(null), 2500);
  };

  if (!isOpen && !standalone) return null;

  return (
    <div
      className={`space-y-4 sm:space-y-6 text-right font-['Tajawal'] antialiased bg-[#FAFAF9] rounded-3xl ${
        standalone ? 'p-3 sm:p-6 max-w-7xl mx-auto' : 'p-2 sm:p-4'
      }`}
      dir="rtl"
    >
      {/* ═══════ الترويسة الأنيقة المتدرجة ═══════ */}
      <header className="relative overflow-hidden bg-gradient-to-l from-[#163920] via-[#1A4527] to-[#122F1B] rounded-3xl p-5 sm:p-7 text-white shadow-2xs border border-emerald-900/40">
        {/* توهج هادئ خفيف في الخلفية */}
        <div
          className="absolute -top-16 -left-16 w-64 h-64 bg-[#F5D76E]/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* اليمين: الشعار وهوية متجر خُضرة */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🥬
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5D76E]/20 text-[#F5D76E] border border-[#F5D76E]/30 text-[11px] font-bold">
                <Sparkles className="w-3 h-3" />
                <span>إدارة الأسعار وسوق الجملة • فاس</span>
              </div>
              <h2 className="text-xs text-emerald-200/80 font-medium mt-0.5">
                سوق الجملة بنسودة ومزارع سايس
              </h2>
            </div>
          </div>

          {/* الوسط: العنوان والوصف الإرشادي */}
          <div className="text-center md:text-center flex-1 max-w-xl mx-auto space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-['Almarai'] text-white tracking-tight">
              التسعير الديناميكي وإدارة الأسعار
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/85 font-medium leading-relaxed">
              تحديد أسعار الشراء الصباحية، حساب هوامش الأمان تلقائياً، والتحكم الذكي في التوفر والمخزون
            </p>
          </div>

          {/* اليسار: أزرار التحكم والإجراءات */}
          <div className="flex items-center justify-end gap-2.5 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(true)}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-white/12 hover:bg-white/20 border border-white/25 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-97 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-[#F5D76E]" />
              <span>الموردون ({suppliers.length})</span>
            </button>

            {!standalone && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white cursor-pointer transition-all active:scale-95"
                aria-label="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* شريط الربط المباشر بالمخزون */}
      <div className="bg-emerald-950/5 border border-emerald-900/15 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-stone-700 font-medium">
          <Sparkles className="w-4 h-4 text-emerald-800 shrink-0" />
          <span>
            <strong className="font-bold text-stone-900">أداة التسعير:</strong> تحديد أسعار الشراء وتطبيق متوسط هامش الربح المعتمد (40%) مع المزامنة الفورية للمتجر.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onNavigateToInventory) {
              onNavigateToInventory(0);
            } else {
              window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'inventory' }));
            }
          }}
          className="px-3 py-1.5 rounded-xl bg-[#163920] hover:bg-[#0E2615] text-[#F5D76E] font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <span>📦 فتح المخزون</span>
        </button>
      </div>

      {/* ═══════ إشعار تنبيهي لطيف عند نجاح الإجراءات ═══════ */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 text-[#163920] text-xs sm:text-sm font-bold rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ═══════ المحتوى الرئيسي (جدول أسعار السوق) ═══════ */}
      {isLoading ? (
        <div className="py-20 text-center text-stone-500 bg-white rounded-3xl border border-stone-200/80 shadow-2xs">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#163920] mb-3" />
          <p className="font-bold text-sm text-stone-800">جاري جلب أسعار السوق ومؤشرات التدقيق وسجلات المخزون...</p>
          <span className="text-xs text-stone-400 mt-1 block">يرجى الانتظار بضع لحظات</span>
        </div>
      ) : (
        <MorningPricingTable
          rows={rows}
          suppliers={suppliers}
          targetProductId={currentFocusedProductId}
          onSaveBatch={handleSaveBatch}
          onOpenSuppliersModal={() => setIsSupplierModalOpen(true)}
          onRefresh={loadData}
          onNavigateToInventory={onNavigateToInventory}
          isSaving={isSaving}
        />
      )}

      {/* ═══════ نافذة إدارة الموردين العصرية ═══════ */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        suppliers={suppliers}
        onSaveSupplier={handleSaveSupplier}
        onDeleteSupplier={handleDeleteSupplier}
      />
    </div>
  );
};
