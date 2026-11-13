// ============================================================
// src/features/products-inventory/InventoryLedgerModal.tsx
// نافذة سجل تدقيق حركات المخزون للتدقيق المحاسبي الصارم
// توثق كافة حركات الدخول والخروج والفاقد والمرتجعات وتكلفتها
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Trash2,
  RotateCcw,
  PlusCircle,
  Edit2,
  DollarSign,
} from 'lucide-react';
import { getSupabase } from '../../services/supabaseService';

export interface LedgerEntry {
  id: string;
  product_id: number;
  product_name?: string;
  order_id?: number | string | null;
  quantity_delta: number;
  movement_type: 'morning_stockin' | 'order_deduct' | 'order_restore' | 'waste_loss' | 'supplier_return' | 'manual_adjustment';
  stock_before: number;
  stock_after: number;
  unit_cost?: number | null;
  total_cost_value?: number | null;
  supplier_id?: string | null;
  unit_label?: string | null;
  reason?: string | null;
  created_by?: string;
  created_at: string;
}

interface InventoryLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProductId?: number | null;
}

export const LOCAL_LEDGER_STORAGE_KEY = 'khodra_inventory_ledger_cache_v1';

export const InventoryLedgerModal: React.FC<InventoryLedgerModalProps> = ({
  isOpen,
  onClose,
  targetProductId = null,
}) => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [movementFilter, setMovementFilter] = useState<string>('all');

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const client = getSupabase();
      let dbEntries: LedgerEntry[] = [];

      if (client) {
        let query = client
          .from('inventory_ledger')
          .select(`
            *,
            products (
              name,
              unit_label,
              category
            )
          `)
          .order('created_at', { ascending: false })
          .limit(200);

        if (targetProductId) {
          query = query.eq('product_id', targetProductId);
        }

        const { data, error } = await query;
        if (!error && data) {
          dbEntries = data.map((d: any) => ({
            id: String(d.id),
            product_id: Number(d.product_id),
            product_name: d.products?.name || `منتج #${d.product_id}`,
            order_id: d.order_id,
            quantity_delta: Number(d.quantity_delta),
            movement_type: d.movement_type,
            stock_before: Number(d.stock_before),
            stock_after: Number(d.stock_after),
            unit_cost: d.unit_cost != null ? Number(d.unit_cost) : null,
            total_cost_value: d.total_cost_value != null ? Number(d.total_cost_value) : null,
            supplier_id: d.supplier_id,
            unit_label: d.unit_label || d.products?.unit_label || 'kg',
            reason: d.reason,
            created_by: d.created_by || 'system',
            created_at: d.created_at,
          }));
        }
      }

      // دمج التخزين المحلي إن وُجد كـ Fallback
      try {
        const rawLocal = localStorage.getItem(LOCAL_LEDGER_STORAGE_KEY);
        if (rawLocal) {
          const localEntries = JSON.parse(rawLocal);
          const existingIds = new Set(dbEntries.map((e) => e.id));
          const uniqueLocals = localEntries.filter((e: any) => !existingIds.has(e.id));
          dbEntries = [...dbEntries, ...uniqueLocals];
        }
      } catch {}

      setLedgerEntries(dbEntries);
    } catch (err) {
      console.warn('Failed to load ledger', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLedger();
    }
  }, [isOpen, targetProductId]);

  const filteredEntries = ledgerEntries.filter((entry) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      (entry.product_name && entry.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entry.reason && entry.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entry.order_id && String(entry.order_id).includes(searchQuery));

    const matchType = movementFilter === 'all' || entry.movement_type === movementFilter;
    return matchSearch && matchType;
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden font-['Tajawal']">
        {/* ═══════ رأس النافذة ═══════ */}
        <div className="p-4 sm:p-6 bg-gradient-to-l from-[#163920] to-[#2D6A3F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EAB308]/20 border border-[#EAB308]/40 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-[#EAB308]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>سجل تدقيق حركات المخزون المحاسبي (Inventory Ledger)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  {ledgerEntries.length} قيد مسجل
                </span>
              </h3>
              <p className="text-xs text-stone-200 mt-0.5">
                تتبع دقيق لحركات الدخول الصباحي، خصم الطلبات، واسترجاع الطلبات الملغاة مع تكلفة الوحدة
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
              placeholder="ابحث باسم المنتج، رقم الطلب، أو سبب الحركة..."
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm font-bold bg-white focus:outline-none focus:ring-1 focus:ring-[#163920]"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLedger}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="تحديث القيود"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#163920]"
            >
              <option value="all">كافة أنواع الحركات</option>
              <option value="morning_stockin">📥 توريد ودخول صباحي</option>
              <option value="order_deduct">🛒 خصم طلب بيع</option>
              <option value="order_restore">🔁 استرجاع طلب ملغي</option>
              <option value="manual_adjustment">✏️ تعديل يدوي</option>
            </select>
          </div>
        </div>

        {/* ═══════ جدول قيود المخزون ═══════ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredEntries.length === 0 ? (
            <div className="py-16 text-center text-stone-400 text-xs">
              لا توجد قيود مسجلة تطابق التصفية الحالية.
            </div>
          ) : (
            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">التوقيت والتاريخ</th>
                    <th className="py-2.5 px-3">المنتج ووحدة القياس</th>
                    <th className="py-2.5 px-3 text-center">نوع الحركة</th>
                    <th className="py-2.5 px-3 text-center">التغير في الكمية</th>
                    <th className="py-2.5 px-3 text-center">الرصيد (قبل ← بعد)</th>
                    <th className="py-2.5 px-3 text-center">تكلفة الوحدة</th>
                    <th className="py-2.5 px-3 text-center">القيمة المالية</th>
                    <th className="py-2.5 px-3">البيان والسبب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredEntries.map((rec) => {
                    const formattedDate = rec.created_at
                      ? new Date(rec.created_at).toLocaleString('ar-MA', {
                          day: 'numeric',
                          month: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'اليوم';

                    const isPositive = rec.quantity_delta > 0;
                    const deltaStr = isPositive
                      ? `+${rec.quantity_delta}`
                      : `${rec.quantity_delta}`;

                    return (
                      <tr key={rec.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-bold text-stone-900">{rec.product_name || `منتج #${rec.product_id}`}</div>
                          <span className="text-[10px] text-stone-400 font-medium">{rec.unit_label || 'kg'}</span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {rec.movement_type === 'morning_stockin' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              📥 توريد صباحي
                            </span>
                          )}
                          {rec.movement_type === 'waste_loss' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                              🗑️ فاقد وتالف
                            </span>
                          )}
                          {rec.movement_type === 'supplier_return' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              🔄 مرتجع سلع
                            </span>
                          )}
                          {rec.movement_type === 'order_deduct' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                              🛒 خصم طلب
                            </span>
                          )}
                          {rec.movement_type === 'order_restore' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                              🔁 استرجاع طلب
                            </span>
                          )}
                          {rec.movement_type === 'manual_adjustment' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                              ✏️ تعديل يدوي
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-black">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                            {deltaStr} {rec.unit_label || 'kg'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-stone-600">
                          {rec.stock_before} ← <strong className="text-stone-900">{rec.stock_after}</strong>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-700">
                          {rec.unit_cost != null ? `${rec.unit_cost.toFixed(2)} د.م` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-black text-stone-900">
                          {rec.total_cost_value != null ? `${rec.total_cost_value.toFixed(2)} د.م` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-[11px] text-stone-600">
                          <span>{rec.reason || (rec.order_id ? `طلب #${rec.order_id}` : '—')}</span>
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
            سجل حركات المخزون غير قابل للتعديل أو الحذف الرجعي، لضمان أعلى معايير التدقيق المحاسبي.
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
