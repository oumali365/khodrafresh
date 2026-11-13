// ============================================================
// src/features/pricing-forecast/BulkPriceImpactModal.tsx
// نافذة معاينة أثر تعديل الأسعار الجماعي قبل الاعتماد
// متوافقة مع القاعدة التجارية لخُضرة (سقف تكلفة شراء 60%، هامش إجمالي 40%)
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Percent,
  DollarSign,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import type { ProductPriceRow } from './types';
import {
  analyzePricingMetrics,
  calculateSellingPriceFromTargetMargin,
  calculateSellingPriceFromMarkup,
  TARIFF_STANDARDS,
} from '../../services/financialEngine';

interface BulkPriceImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductPriceRow[];
  onConfirmApply: (
    updates: {
      productId: number;
      productName: string;
      unitLabel: string;
      purchasePrice: number;
      oldPrice: number;
      sellingPrice: number;
      marginPercentage: number;
      supplierId: string;
      hasException?: boolean;
      exceptionReason?: string;
    }[]
  ) => Promise<void>;
  isApplying: boolean;
}

export const BulkPriceImpactModal: React.FC<BulkPriceImpactModalProps> = ({
  isOpen,
  onClose,
  products,
  onConfirmApply,
  isApplying,
}) => {
  // وضع الحساب: الهامش الإجمالي المستهدف (الافتراضي المعتمد 40%) أو الزيادة على التكلفة
  const [method, setMethod] = useState<'target_gross_margin' | 'markup'>('target_gross_margin');
  const [targetMargin, setTargetMargin] = useState<number>(40);
  const [targetMarkup, setTargetMarkup] = useState<number>(66.67);
  const [filterType, setFilterType] = useState<'all' | 'compliant' | 'non_compliant' | 'changed'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(() => {
    return new Set(products.map((p) => p.id));
  });

  // حساب الأثر لكل منتج
  const impactList = useMemo(() => {
    return products.map((prod) => {
      const cost = prod.purchase_price;
      const currentPrice = prod.selling_price;

      let newProposedPrice = 0;
      if (method === 'target_gross_margin') {
        newProposedPrice = calculateSellingPriceFromTargetMargin(cost, targetMargin);
      } else {
        newProposedPrice = calculateSellingPriceFromMarkup(cost, targetMarkup);
      }

      const diffDH = Number((newProposedPrice - currentPrice).toFixed(2));
      const diffPercent = currentPrice > 0 ? Number(((diffDH / currentPrice) * 100).toFixed(1)) : 0;

      const currentMetrics = analyzePricingMetrics(cost, currentPrice);
      const newMetrics = analyzePricingMetrics(cost, newProposedPrice);

      return {
        id: prod.id,
        name: prod.name,
        category: prod.category,
        unitLabel: prod.unit_label,
        icon: prod.icon,
        supplierId: prod.supplier_id,
        supplierName: prod.supplier_name,
        purchaseCost: cost,
        currentPrice,
        newProposedPrice,
        diffDH,
        diffPercent,
        currentMetrics,
        newMetrics,
        isCompliant: newMetrics.isCompliant,
        isSelected: selectedProductIds.has(prod.id),
      };
    });
  }, [products, method, targetMargin, targetMarkup, selectedProductIds]);

  // إحصائيات المعاينة الإجمالية
  const summary = useMemo(() => {
    const activeItems = impactList.filter((item) => selectedProductIds.has(item.id));
    const totalCount = activeItems.length;

    const currentAvgPrice = totalCount > 0
      ? Number((activeItems.reduce((acc, i) => acc + i.currentPrice, 0) / totalCount).toFixed(2))
      : 0;

    const newAvgPrice = totalCount > 0
      ? Number((activeItems.reduce((acc, i) => acc + i.newProposedPrice, 0) / totalCount).toFixed(2))
      : 0;

    const avgCurrentCogsRatio = totalCount > 0
      ? Number((activeItems.reduce((acc, i) => acc + i.currentMetrics.cogsRatioPercent, 0) / totalCount).toFixed(1))
      : 0;

    const avgNewCogsRatio = totalCount > 0
      ? Number((activeItems.reduce((acc, i) => acc + i.newMetrics.cogsRatioPercent, 0) / totalCount).toFixed(1))
      : 0;

    const compliantCount = activeItems.filter((i) => i.isCompliant).length;
    const nonCompliantCount = totalCount - compliantCount;

    return {
      totalCount,
      currentAvgPrice,
      newAvgPrice,
      avgCurrentCogsRatio,
      avgNewCogsRatio,
      compliantCount,
      nonCompliantCount,
    };
  }, [impactList, selectedProductIds]);

  // التصفية
  const filteredImpactList = useMemo(() => {
    return impactList.filter((item) => {
      if (filterType === 'compliant') return item.isCompliant;
      if (filterType === 'non_compliant') return !item.isCompliant;
      if (filterType === 'changed') return Math.abs(item.diffDH) > 0.01;
      return true;
    });
  }, [impactList, filterType]);

  const handleToggleSelectAll = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleToggleProduct = (id: number) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedProductIds(next);
  };

  const handleConfirm = async () => {
    const selectedItems = impactList.filter((item) => selectedProductIds.has(item.id));
    if (selectedItems.length === 0) return;

    const payload = selectedItems.map((item) => ({
      productId: item.id,
      productName: item.name,
      unitLabel: item.unitLabel,
      purchasePrice: item.purchaseCost,
      oldPrice: item.currentPrice,
      sellingPrice: item.newProposedPrice,
      marginPercentage: targetMargin,
      supplierId: item.supplierId,
      hasException: !item.isCompliant,
      exceptionReason: !item.isCompliant ? 'استثناء إداري معتمد للتسعير الجماعي' : undefined,
    }));

    await onConfirmApply(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden font-['Tajawal']">
        {/* ═══════ رأس النافذة ═══════ */}
        <div className="p-4 sm:p-6 bg-gradient-to-l from-[#163920] to-[#2D6A3F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EAB308]/20 border border-[#EAB308]/40 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#EAB308]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>معاينة أثر تعديل الأسعار قبل الاعتماد</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  القاعدة التجارية لخُضرة
                </span>
              </h3>
              <p className="text-xs text-stone-200 mt-0.5">
                حد تكلفة شراء المنتجات المستهدف: 60% كحد أقصى (هامش إجمالي 40%) لضمان ربحية الخزينة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ═══════ إعدادات المعادلة الجماعية ═══════ */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 space-y-3.5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-stone-500 block">طريقة الاحتساب الجماعي المعتمدة:</span>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('target_gross_margin');
                    setTargetMargin(40);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    method === 'target_gross_margin'
                      ? 'bg-[#163920] text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  🎯 هامش إجمالي مستهدف (40% = سقف تكلفة 60%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('markup');
                    setTargetMarkup(66.67);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    method === 'markup'
                      ? 'bg-[#163920] text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  📈 زيادة على التكلفة (Markup)
                </button>
              </div>
            </div>

            {/* حقل القيمة المئوية */}
            <div className="flex items-center gap-2">
              {method === 'target_gross_margin' ? (
                <div>
                  <label className="text-[11px] font-bold text-stone-500 block mb-1">
                    الهامش الإجمالي المستهدف (%):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(Number(e.target.value) || 40)}
                      className="w-20 py-1.5 px-2.5 rounded-xl border border-stone-200 bg-white font-mono font-bold text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#163920]"
                    />
                    <span className="text-xs font-bold text-stone-500">%</span>
                    {targetMargin === 40 && (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        المعيار المعتمد (5 ÷ 0.60 = 8.33 د.م)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-stone-500 block mb-1">
                    نسبة الزيادة على التكلفة (%):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="10"
                      max="200"
                      step="0.1"
                      value={targetMarkup}
                      onChange={(e) => setTargetMarkup(Number(e.target.value) || 66.67)}
                      className="w-24 py-1.5 px-2.5 rounded-xl border border-stone-200 bg-white font-mono font-bold text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#163920]"
                    />
                    <span className="text-xs font-bold text-stone-500">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══════ بطاقات أثر التعديل ═══════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-white p-3 rounded-2xl border border-stone-200">
              <span className="text-[10px] text-stone-400 font-bold block">متوسط سعر البيع</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs text-stone-400 line-through tabular-nums">{summary.currentAvgPrice}</span>
                <span className="text-sm font-black text-[#163920] tabular-nums font-mono">
                  ← {summary.newAvgPrice} د.م
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-stone-200">
              <span className="text-[10px] text-stone-400 font-bold block">متوسط نسبة تكلفة الشراء</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs text-stone-400 tabular-nums">%{summary.avgCurrentCogsRatio}</span>
                <span className={`text-sm font-black tabular-nums font-mono ${
                  summary.avgNewCogsRatio <= 60.1 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  ← %{summary.avgNewCogsRatio}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-stone-200">
              <span className="text-[10px] text-stone-400 font-bold block">التوافق مع سقف 60%</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-black text-emerald-700">
                  ✓ {summary.compliantCount} متوافق
                </span>
                {summary.nonCompliantCount > 0 && (
                  <span className="text-xs font-bold text-rose-600">
                    ({summary.nonCompliantCount} تجاوز)
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-stone-200">
              <span className="text-[10px] text-stone-400 font-bold block">المنتجات المحددة</span>
              <div className="text-sm font-black text-stone-900 mt-0.5">
                {summary.totalCount} من أصل {products.length}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ جدول تفاصيل التعديل لكل منتج ═══════ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer transition-colors"
              >
                {selectedProductIds.size === products.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
              <span className="text-xs text-stone-500 font-medium">
                (معاينة التغييرات الفردية قبل النشر في المتجر)
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              {(['all', 'changed', 'compliant', 'non_compliant'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilterType(m)}
                  className={`px-2 py-0.5 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                    filterType === m ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {m === 'all' && 'الكل'}
                  {m === 'changed' && 'المتغيرة فقط'}
                  {m === 'compliant' && 'المتوافقة (≤60%)'}
                  {m === 'non_compliant' && 'المتجاوزة (>60%)'}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.size === products.length}
                      onChange={handleToggleSelectAll}
                      className="rounded text-[#163920] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">المنتج ووحدة القياس</th>
                  <th className="py-2.5 px-3 text-center">تكلفة الشراء</th>
                  <th className="py-2.5 px-3 text-center">السعر الحالي</th>
                  <th className="py-2.5 px-3 text-center text-emerald-900 font-black">السعر المقترح</th>
                  <th className="py-2.5 px-3 text-center">الفارق</th>
                  <th className="py-2.5 px-3 text-center">نسبة التكلفة</th>
                  <th className="py-2.5 px-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredImpactList.map((item) => {
                  const isChecked = selectedProductIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-amber-50/20 transition-colors ${!isChecked ? 'opacity-50 bg-stone-50/50' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProduct(item.id)}
                          className="rounded text-[#163920] cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          <div>
                            <div className="font-bold text-stone-900">{item.name}</div>
                            <span className="text-[10px] text-stone-400 font-medium">
                              {item.unitLabel} · {item.supplierName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-700">
                        {item.purchaseCost.toFixed(2)} د.م
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-stone-500">
                        {item.currentPrice.toFixed(2)} د.م
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-black text-[#163920] bg-emerald-50/40">
                        {item.newProposedPrice.toFixed(2)} د.م
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-[11px] font-bold">
                        {item.diffDH > 0 ? (
                          <span className="text-emerald-700">+{item.diffDH.toFixed(2)} د.م ({item.diffPercent}%)</span>
                        ) : item.diffDH < 0 ? (
                          <span className="text-rose-700">{item.diffDH.toFixed(2)} د.م ({item.diffPercent}%)</span>
                        ) : (
                          <span className="text-stone-400">لا تغيير</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-xs">
                        <span
                          className={`font-black ${
                            item.newMetrics.cogsRatioPercent <= 60.05 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          %{item.newMetrics.cogsRatioPercent}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {item.isCompliant ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ متوافق
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            ⚠️ يتجاوز 60%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════ تذييل وأزرار الاعتماد ═══════ */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-600 font-medium text-center sm:text-right">
            <span>سيتم توثيق كافة التعديلات في <strong>سجل تدقيق تغيير الأسعار التاريخي</strong> وتحديث أسعار المتجر فوراً.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isApplying || selectedProductIds.size === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#163920] hover:bg-[#0E2615] text-[#F5D76E] text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isApplying ? 'جارٍ الاعتماد والحفظ...' : `اعتماد وتطبيق الأسعار (${selectedProductIds.size})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
