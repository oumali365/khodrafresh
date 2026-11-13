// ============================================================
// RealFinanceTab.tsx - لوحة الأداء المالي والتشغيلي لمتجر خُضرة
// مصدر الحقيقة: طلبات Supabase المسجلة والأسعار الفعلية
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  Calendar,
  Filter,
  Download,
  Copy,
  Check,
  ShoppingBag,
} from 'lucide-react';
import type { DbOrder } from '../../services/supabaseService';
import {
  calculateOperatingFinancials,
  calculateItemsCogs,
  type OperatingFinancialsSummary,
} from '../../services/financialEngine';
import { getStoredPricesMap } from '../pricing-forecast/pricingService';

export interface RealFinanceTabProps {
  orders: DbOrder[];
  lang: 'ar' | 'fr' | 'en';
  isSyncing: boolean;
  onRefreshOrders?: () => void;
}

export type TimeframeFilter = 'today' | 'week' | 'month' | 'all';
export type StatusFilter = 'all_active' | 'delivered_only';

const fmt = (n: number | null | undefined) => {
  const safe = typeof n === 'number' && !isNaN(n) && Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
};

const fmtDecimal = (n: number | null | undefined) => {
  const safe = typeof n === 'number' && !isNaN(n) && Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(safe);
};

export const RealFinanceTab: React.FC<RealFinanceTabProps> = ({
  orders,
  lang,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all_active');
  const [copiedTable, setCopiedTable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // تصفية الطلبات بناءً على المدة الزمنية والحالة
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return orders.filter((o) => {
      if (!o || o.is_deleted || o.status === 'cancelled') return false;

      // فلترة الحالة
      if (statusFilter === 'delivered_only') {
        if (o.status !== 'delivered' && !o.is_paid) return false;
      }

      // فلترة التاريخ
      if (timeframe === 'all') return true;

      const orderDate = o.created_at ? new Date(o.created_at) : new Date();
      if (isNaN(orderDate.getTime())) return true;

      if (timeframe === 'today') {
        return orderDate.toISOString().split('T')[0] === todayStr;
      }

      if (timeframe === 'week') {
        return orderDate >= sevenDaysAgo;
      }

      if (timeframe === 'month') {
        return orderDate >= firstDayOfMonth;
      }

      return true;
    });
  }, [orders, timeframe, statusFilter]);

  // استخراج خريطة أسعار الشراء اليومية الفعلية
  const dailyPricesMap = useMemo(() => {
    return getStoredPricesMap();
  }, []);

  // الحسابات المالية الموحدة للطلبات المفلترة
  const financials: OperatingFinancialsSummary = useMemo(() => {
    return calculateOperatingFinancials(filteredOrders, { dailyPricesMap });
  }, [filteredOrders, dailyPricesMap]);

  // تجميع السجلات التاريخية حسب الأيام
  const historicalGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        ordersCount: number;
        revenue: number;
        cogs: number;
        deliveryCosts: number;
        packaging: number;
        operatingProfit: number;
      }
    >();

    filteredOrders.forEach((o) => {
      const dateStr = o.created_at ? o.created_at.split('T')[0] : 'غير مؤرخ';
      const existing = map.get(dateStr) || {
        key: dateStr,
        label: dateStr,
        ordersCount: 0,
        revenue: 0,
        cogs: 0,
        deliveryCosts: 0,
        packaging: 0,
        operatingProfit: 0,
      };

      const grandTotal = Number(o.total) || 0;
      const subtotal = Number(o.subtotal) || grandTotal;
      const deliveryFee = Number(o.delivery_fee) || 0;
      const deliveryCost = Number(o.delivery_dispatch?.deliveryCost ?? o.actual_delivery_cost ?? o.driver_wage ?? 20);

      let cogs = 0;
      if (o.cogs_amount != null) {
        cogs = Number(o.cogs_amount);
      } else if (Array.isArray(o.items) && o.items.length > 0) {
        const itemAnalysis = calculateItemsCogs(o.items, dailyPricesMap);
        cogs = itemAnalysis.cogsAmount != null ? itemAnalysis.cogsAmount : Number((subtotal * 0.6).toFixed(2));
      } else {
        cogs = Number((subtotal * 0.6).toFixed(2));
      }

      const packaging = o.packaging_cost != null ? Number(o.packaging_cost) : 2;
      const opProfit = grandTotal - (cogs + deliveryCost + packaging);

      existing.ordersCount += 1;
      existing.revenue += grandTotal;
      existing.cogs += cogs;
      existing.deliveryCosts += deliveryCost;
      existing.packaging += packaging;
      existing.operatingProfit += opProfit;

      map.set(dateStr, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredOrders, dailyPricesMap]);

  const handleCopyTSV = async () => {
    try {
      const headers = ['التاريخ', 'الطلبات', 'الإيراد', 'تكلفة السلع', 'أجور التوصيل', 'التغليف', 'الربح التشغيلي'].join('\t');
      const rows = historicalGroups.map((g) =>
        [g.label, g.ordersCount, g.revenue.toFixed(2), g.cogs.toFixed(2), g.deliveryCosts.toFixed(2), g.packaging.toFixed(2), g.operatingProfit.toFixed(2)].join('\t')
      );
      const tsv = [headers, ...rows].join('\n');
      await navigator.clipboard.writeText(tsv);
      setCopiedTable(true);
      setNotice(lang === 'ar' ? 'تم نسخ الأرقام' : 'Données copiées');
      setTimeout(() => {
        setCopiedTable(false);
        setNotice(null);
      }, 2500);
    } catch {}
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Orders', 'Revenue_MAD', 'COGS_MAD', 'Delivery_Costs_MAD', 'Packaging_MAD', 'Operating_Profit_MAD'];
    const rows = historicalGroups.map((g) => [
      g.label,
      g.ordersCount,
      g.revenue.toFixed(2),
      g.cogs.toFixed(2),
      g.deliveryCosts.toFixed(2),
      g.packaging.toFixed(2),
      g.operatingProfit.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khodra_financials_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 text-right" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* ─── 1. شريط الفلترة والإجراءات المختصر والأنيق ─── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-bold pl-1">
            <Filter className="w-3.5 h-3.5 text-emerald-800" />
            <span>{lang === 'ar' ? 'الفترة:' : 'Période:'}</span>
          </div>

          <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-bold">
            {(
              [
                { id: 'today', label: lang === 'ar' ? 'اليوم' : "Aujourd'hui" },
                { id: 'week', label: lang === 'ar' ? '7 أيام' : '7 jours' },
                { id: 'month', label: lang === 'ar' ? 'الشهر' : 'Ce mois' },
                { id: 'all', label: lang === 'ar' ? 'الكل' : 'Tout' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeframe === t.id
                    ? 'bg-emerald-800 text-white font-black shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-bold sm:mr-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all_active')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all_active'
                  ? 'bg-stone-900 text-white font-black shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
              }`}
            >
              {lang === 'ar' ? 'كل الطلبات' : 'Toutes'}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('delivered_only')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'delivered_only'
                  ? 'bg-emerald-800 text-white font-black shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
              }`}
            >
              {lang === 'ar' ? 'المسلّمة فقط' : 'Livrées'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            type="button"
            onClick={handleCopyTSV}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copiedTable ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
            <span>{lang === 'ar' ? 'نسخ' : 'Copier'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-700" />
          <span>{notice}</span>
        </div>
      )}

      {/* ─── 2. المؤشرات المالية الأربعة الرئيسية (KPI Cards) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* إجمالي الإيرادات */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-bold">
            <span>{lang === 'ar' ? 'الإيراد الإجمالي' : "Chiffre d'Affaires"}</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-stone-900 tabular-nums">
            {fmt(financials.grossRevenue)} <span className="text-xs font-bold text-stone-500">د.م</span>
          </div>
          <div className="text-[11px] text-stone-500 space-y-1 pt-2 border-t border-stone-100">
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'مبيعات البضائع:' : 'Marchandises:'}</span>
              <span className="font-bold text-stone-800 tabular-nums">{fmt(financials.productsRevenue)} د.م</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'رسوم التوصيل:' : 'Frais Livraison:'}</span>
              <span className="font-bold text-stone-800 tabular-nums">{fmt(financials.customerDeliveryFees)} د.م</span>
            </div>
          </div>
        </div>

        {/* تكلفة شراء البضائع */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-bold">
            <span>{lang === 'ar' ? 'تكلفة شراء السلع' : 'Achat Marchandises'}</span>
            <Package className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-black text-stone-900 tabular-nums">
            {fmt(financials.cogsTotal)} <span className="text-xs font-bold text-stone-500">د.م</span>
          </div>
          <div className="text-[11px] text-stone-500 space-y-1 pt-2 border-t border-stone-100">
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'نسبة تكلفة الشراء:' : 'Ratio Achat:'}</span>
              <span className="font-bold text-stone-800 tabular-nums">{fmtDecimal(financials.cogsRatioPercent)}%</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'هامش السلع الإجمالي:' : 'Marge Brute:'}</span>
              <span className="font-bold text-emerald-800 tabular-nums">
                {financials.productsRevenue > 0 ? fmtDecimal(((financials.productsRevenue - financials.cogsTotal) / financials.productsRevenue) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* مصاريف التوصيل */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-bold">
            <span>{lang === 'ar' ? 'مصاريف التوصيل' : 'Coût Livraison'}</span>
            <Truck className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-black text-stone-900 tabular-nums">
            {fmt(financials.deliveryCostsTotal)} <span className="text-xs font-bold text-stone-500">د.م</span>
          </div>
          <div className="text-[11px] text-stone-500 space-y-1 pt-2 border-t border-stone-100">
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'أجور المندوبين:' : 'Livreurs:'}</span>
              <span className="font-bold text-stone-800 tabular-nums">{fmt(financials.actualDeliveryCostsTotal)} د.م</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'صافي عائد التوصيل:' : 'Marge Livraison:'}</span>
              <span className={`font-bold tabular-nums ${financials.deliveryNetMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {financials.deliveryNetMargin >= 0 ? '+' : ''}{fmt(financials.deliveryNetMargin)} د.م
              </span>
            </div>
          </div>
        </div>

        {/* صافي الربح التشغيلي */}
        <div className={`border rounded-2xl p-4 shadow-2xs space-y-2 ${
          financials.operatingProfitBeforeOverheads >= 0
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
            : 'bg-rose-50/70 border-rose-300 text-rose-950'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span>{lang === 'ar' ? 'صافي الربح التشغيلي' : 'Bénéfice Net Op.'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="text-2xl font-black tabular-nums">
            {financials.operatingProfitBeforeOverheads >= 0 ? '+' : ''}
            {fmt(financials.operatingProfitBeforeOverheads)} <span className="text-xs font-bold">د.م</span>
          </div>
          <div className="text-[11px] space-y-1 pt-2 border-t border-emerald-200/60 font-medium">
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'هامش الربح الصافي:' : 'Marge Nette:'}</span>
              <span className="font-black tabular-nums">{fmtDecimal(financials.operatingProfitMarginPercent)}%</span>
            </div>
            <div className="flex justify-between text-stone-600 text-[10px]">
              <span>{lang === 'ar' ? 'شامل تكلفة التغليف' : 'Emballage inclus'}</span>
              <span className="tabular-nums">{fmt(financials.packagingCostsTotal)} د.م</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. ملخص اقتصاديات الطلب الواحد (Unit Economics) ─── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-black text-stone-900 border-b border-stone-100 pb-2">
          <span>{lang === 'ar' ? 'اقتصاديات الطلب الواحد' : 'Économie par Commande'}</span>
          <span className="text-[11px] text-stone-500 font-bold">
            {financials.ordersCount} {lang === 'ar' ? 'طلب' : 'commandes'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <span className="block text-[11px] text-stone-500 font-medium mb-0.5">
              {lang === 'ar' ? 'متوسط السلة' : 'Panier Moyen'}
            </span>
            <span className="text-sm font-black text-stone-900 tabular-nums">
              {fmt(financials.averageOrderValue)} د.م
            </span>
          </div>

          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <span className="block text-[11px] text-stone-500 font-medium mb-0.5">
              {lang === 'ar' ? 'رسوم التوصيل للطلب' : 'Frais Facturés / Cmd'}
            </span>
            <span className="text-sm font-black text-stone-900 tabular-nums">
              {fmtDecimal(financials.averageCustomerDeliveryFeePerOrder)} د.م
            </span>
          </div>

          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <span className="block text-[11px] text-stone-500 font-medium mb-0.5">
              {lang === 'ar' ? 'أجر المندوب للطلب' : 'Coût Livreur / Cmd'}
            </span>
            <span className="text-sm font-black text-stone-900 tabular-nums">
              {fmtDecimal(financials.averageDeliveryCostPerOrder)} د.م
            </span>
          </div>

          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <span className="block text-[11px] text-stone-500 font-medium mb-0.5">
              {lang === 'ar' ? 'عائد التوصيل للطلب' : 'Marge Livraison / Cmd'}
            </span>
            <span className={`text-sm font-black tabular-nums ${
              financials.deliveryNetMargin >= 0 ? 'text-emerald-800' : 'text-rose-700'
            }`}>
              {financials.ordersCount > 0 ? fmtDecimal(financials.deliveryNetMargin / financials.ordersCount) : 0} د.م
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4. جدول العمليات والمبيعات التاريخية ─── */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-700" />
            <h3 className="text-xs font-black text-stone-900">
              {lang === 'ar' ? 'سجل العمليات اليومية' : 'Historique Quotidien'}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-stone-500">
            {historicalGroups.length} {lang === 'ar' ? 'أيام مسجلة' : 'jours'}
          </span>
        </div>

        {historicalGroups.length === 0 ? (
          <div className="p-8 text-center text-stone-500 space-y-2">
            <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
            <div className="text-xs font-black text-stone-700">
              {lang === 'ar' ? 'لا توجد طلبات في هذه الفترة' : 'Aucune commande dans cette période'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-stone-100">
              <thead className="bg-stone-50/80 text-stone-600 font-black text-[11px]">
                <tr>
                  <th className="p-3 text-right">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'الطلبات' : 'Cmds'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'الإيراد' : 'CA Total'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'تكلفة السلع' : 'COGS'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'التوصيل' : 'Livraison'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'التغليف' : 'Emballage'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'صافي الربح' : 'Bénéfice'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'الهامش' : 'Marge'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {historicalGroups.map((g) => {
                  const marginPct = g.revenue > 0 ? (g.operatingProfit / g.revenue) * 100 : 0;
                  return (
                    <tr key={g.key} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3 font-bold text-stone-900">{g.label}</td>
                      <td className="p-3 text-center font-bold tabular-nums">{g.ordersCount}</td>
                      <td className="p-3 text-center font-bold text-emerald-800 tabular-nums">{fmt(g.revenue)} د.م</td>
                      <td className="p-3 text-center tabular-nums text-stone-700">{fmt(g.cogs)} د.م</td>
                      <td className="p-3 text-center tabular-nums text-stone-700">{fmt(g.deliveryCosts)} د.م</td>
                      <td className="p-3 text-center tabular-nums text-stone-500">{fmt(g.packaging)} د.م</td>
                      <td className={`p-3 text-center font-black tabular-nums ${
                        g.operatingProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
                      }`}>
                        {g.operatingProfit >= 0 ? '+' : ''}{fmt(g.operatingProfit)} د.م
                      </td>
                      <td className="p-3 text-center font-bold tabular-nums">
                        {fmtDecimal(marginPct)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
