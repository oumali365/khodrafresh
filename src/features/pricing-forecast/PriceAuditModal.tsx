// ============================================================
// src/features/pricing-forecast/PriceAuditModal.tsx
// نافذة سجل تدقيق تغييرات الأسعار التاريخية لمتجر خُضرة
// توثق: السعر السابق، السعر الجديد، نسبة تكلفة الشراء، ووقت التغيير
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { getPriceChangeHistory } from './pricingService';
import type { PriceChangeAuditRecord } from './types';

interface PriceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PriceAuditModal: React.FC<PriceAuditModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [auditList, setAuditList] = useState<PriceChangeAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const loadAuditHistory = async () => {
    setIsLoading(true);
    try {
      const records = await getPriceChangeHistory();
      setAuditList(records);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditHistory();
    }
  }, [isOpen]);

  const filteredRecords = auditList.filter((item) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplierName && item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchType = filterType === 'all' || item.changeType === filterType;
    return matchSearch && matchType;
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden font-['Tajawal']">
        {/* ═══════ رأس النافذة ═══════ */}
        <div className="p-4 sm:p-6 bg-gradient-to-l from-[#163920] to-[#2D6A3F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EAB308]/20 border border-[#EAB308]/40 flex items-center justify-center">
              <History className="w-6 h-6 text-[#EAB308]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>سجل تدقيق وتاريخ تغيير الأسعار</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  {auditList.length} حركة مسجلة
                </span>
              </h3>
              <p className="text-xs text-stone-200 mt-0.5">
                توثيق كامل للأسعار السابقة والجديدة ونسب تكلفة الشراء وهوامش الربح مع توقيت التغيير
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

        {/* ═══════ أدوات البحث والتصفية ═══════ */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المنتج أو المورد في سجل التدقيق..."
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm font-bold bg-white focus:outline-none focus:ring-1 focus:ring-[#163920]"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAuditHistory}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-2 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#163920]"
            >
              <option value="all">كافة أنواع التعديل</option>
              <option value="single">تعديل صف منفرد</option>
              <option value="batch">تعديل جماعي (Batch)</option>
              <option value="bulk_margin">تطبيق هامش موحد</option>
            </select>
          </div>
        </div>

        {/* ═══════ جدول الحركات ═══════ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-stone-400 text-xs">
              لا توجد سجلات تدقيق مسجلة حتى الآن. ستظهر التغييرات تلقائياً عند تعديل أي سعر.
            </div>
          ) : (
            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">التوقيت والتاريخ</th>
                    <th className="py-2.5 px-3">المنتج</th>
                    <th className="py-2.5 px-3 text-center">سعر الشراء</th>
                    <th className="py-2.5 px-3 text-center">السعر السابق</th>
                    <th className="py-2.5 px-3 text-center font-black text-[#163920]">السعر الجديد</th>
                    <th className="py-2.5 px-3 text-center">نسبة التكلفة</th>
                    <th className="py-2.5 px-3 text-center">الهامش الإجمالي</th>
                    <th className="py-2.5 px-3 text-center">نوع الحركة</th>
                    <th className="py-2.5 px-3 text-center">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredRecords.map((rec) => {
                    const formattedDate = rec.timestamp
                      ? new Date(rec.timestamp).toLocaleString('ar-MA', {
                          day: 'numeric',
                          month: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'اليوم';

                    return (
                      <tr key={rec.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-bold text-stone-900">{rec.productName}</div>
                          <span className="text-[10px] text-stone-400 font-medium">{rec.unitLabel || 'kg'}</span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-700">
                          {rec.newPurchasePrice ? `${rec.newPurchasePrice.toFixed(2)} د.م` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-stone-500 line-through">
                          {rec.oldSellingPrice ? `${rec.oldSellingPrice.toFixed(2)} د.م` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-black text-[#163920] bg-emerald-50/50">
                          {rec.newSellingPrice ? `${rec.newSellingPrice.toFixed(2)} د.م` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <span
                            className={
                              rec.newCogsRatio <= 60.05 ? 'text-emerald-700' : 'text-rose-700'
                            }
                          >
                            %{rec.newCogsRatio}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-700">
                          %{rec.newGrossMargin}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                            {rec.changeType === 'single'
                              ? 'منفرد'
                              : rec.changeType === 'batch'
                              ? 'دفعة'
                              : 'جماعي'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center text-[11px] text-stone-500 font-medium">
                          {rec.changedBy || 'المدير'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══════ تذييل ═══════ */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-stone-500 font-medium">
            سجل التدقيق يضمن الشفافية المحاسبية ومنع التعديلات العشوائية غير المعتمدة.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
