// ============================================================
// src/features/pricing-forecast/MorningPricingTable.tsx
// جدول أسعار السوق الصباحي - تصميم عصري ومريح لمتجر "خُضرة"
// ============================================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Save,
  CheckCircle2,
  RefreshCw,
  Building2,
  Percent,
  TrendingUp,
  ShieldCheck,
  Check,
  Layers,
  Sparkles,
  PackageCheck,
  PackageX,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  History,
  Clock,
  Info,
} from 'lucide-react';
import type { ProductPriceRow, Supplier } from './types';
import {
  DEFAULT_PROFIT_MARGIN,
  DEFAULT_TARGET_GROSS_MARGIN,
  TARGET_MAX_COGS_RATIO,
} from './types';
import {
  calculateSellingPrice,
  determineTrend,
} from './pricingService';
import {
  analyzePricingMetrics,
  TARIFF_STANDARDS,
} from '../../services/financialEngine';
import { BulkPriceImpactModal } from './BulkPriceImpactModal';
import { PriceAuditModal } from './PriceAuditModal';
import type { ProductCategory } from '../../types';

interface MorningPricingTableProps {
  rows: ProductPriceRow[];
  suppliers: Supplier[];
  targetProductId?: number | null;
  onSaveBatch: (
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
  ) => Promise<void>;
  onOpenSuppliersModal: () => void;
  onRefresh: () => void;
  onNavigateToInventory?: (productId: number) => void;
  isSaving: boolean;
}

export const OFFICIAL_CATEGORIES: { id: ProductCategory; name: string; icon: string }[] = [
  { id: 'veg', name: 'خضار وورقيات', icon: '🥬' },
  { id: 'fruit', name: 'فواكه موسمية', icon: '🍎' },
  { id: 'dairy', name: 'ألبان وأجبان', icon: '🥛' },
  { id: 'grocery', name: 'بقالة ومونة', icon: '🛒' },
  { id: 'drinks', name: 'عصائر ومشروبات', icon: '🥤' },
  { id: 'cleaning', name: 'نظافة وعناية', icon: '🧴' },
];

export const MorningPricingTable: React.FC<MorningPricingTableProps> = ({
  rows: initialRows,
  suppliers,
  targetProductId = null,
  onSaveBatch,
  onOpenSuppliersModal,
  onRefresh,
  onNavigateToInventory,
  isSaving,
}) => {
  const [tableData, setTableData] = useState<ProductPriceRow[]>(initialRows);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('veg');
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // ترقيم الصفحات (Pagination) لمنع التمرير الطويل
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);

  useEffect(() => {
    setTableData(initialRows);
  }, [initialRows]);

  // إعادة ضبط الصفحة إلى 1 عند تغيير الفئة أو البحث
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // ─── المزامنة اللحظية الحقيقية: استقبال أي تحديث للمخزون من إدارة المنتجات والمخزون ───
  useEffect(() => {
    const handleStockChanged = (e: any) => {
      const { id, stock, is_available } = e?.detail || {};
      if (id != null) {
        setTableData((prev) =>
          prev.map((row) =>
            row.id === Number(id)
              ? {
                  ...row,
                  stock: Number(stock),
                  is_available: Boolean(is_available),
                }
              : row
          )
        );
      }
    };

    const handleProductUpdated = (e: any) => {
      const updated = e?.detail;
      if (updated && updated.id) {
        setTableData((prev) =>
          prev.map((row) =>
            row.id === Number(updated.id)
              ? {
                  ...row,
                  name: updated.name || row.name,
                  category: updated.category || row.category,
                  unit_label: updated.unit_label || row.unit_label,
                  stock: updated.stock !== undefined ? Number(updated.stock) : row.stock,
                  is_available: updated.is_available !== undefined ? Boolean(updated.is_available) : row.is_available,
                }
              : row
          )
        );
      }
    };

    window.addEventListener('khodra_product_stock_changed', handleStockChanged);
    window.addEventListener('khodra_products_updated', handleProductUpdated);

    return () => {
      window.removeEventListener('khodra_product_stock_changed', handleStockChanged);
      window.removeEventListener('khodra_products_updated', handleProductUpdated);
    };
  }, []);

  // تركيز وتمييز منتج معين قادم من إدارة المنتجات والمخزون
  const focusProduct = useCallback(
    (pid: number) => {
      const target = tableData.find((r) => r.id === pid);
      if (!target) return;

      setSelectedCategory(target.category);
      setSearchQuery('');

      const categoryItems = tableData.filter((r) => r.category === target.category);
      const indexInCat = categoryItems.findIndex((r) => r.id === pid);
      if (indexInCat >= 0) {
        const targetPage = Math.floor(indexInCat / pageSize) + 1;
        setCurrentPage(targetPage);
      }

      setHighlightedProductId(pid);
      setTimeout(() => {
        const el = document.getElementById(`pricing-row-${pid}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);

      setTimeout(() => {
        setHighlightedProductId((curr) => (curr === pid ? null : curr));
      }, 4000);
    },
    [tableData, pageSize]
  );

  useEffect(() => {
    if (targetProductId && tableData.length > 0) {
      focusProduct(Number(targetProductId));
    }
  }, [targetProductId, tableData.length, focusProduct]);

  useEffect(() => {
    const handleOpenPricing = (e: any) => {
      const pid = e?.detail?.productId;
      if (pid != null) {
        focusProduct(Number(pid));
      }
    };
    window.addEventListener('khodra_open_pricing_for_product', handleOpenPricing);
    return () => window.removeEventListener('khodra_open_pricing_for_product', handleOpenPricing);
  }, [focusProduct]);

  // الانتقال إلى إدارة المنتجات والمخزون لنفس المنتج مع حفظ السعر فوراً لضمان التطابق 100%
  const handleGoToInventory = async (productId: number) => {
    const row = tableData.find((r) => r.id === productId);
    if (row && row.is_modified) {
      await handleSaveSingleRow(row);
    }
    if (onNavigateToInventory) {
      onNavigateToInventory(productId);
    } else {
      window.dispatchEvent(
        new CustomEvent('khodra_open_inventory_for_product', {
          detail: { productId },
        })
      );
      window.dispatchEvent(
        new CustomEvent('khodra_admin_route_changed', {
          detail: 'inventory',
        })
      );
    }
  };

  // تعديل مباشر لسعر الشراء أو الهامش أو المورد
  const handleCellChange = (
    productId: number,
    field: 'purchase_price' | 'margin_percentage' | 'supplier_id',
    value: number | string
  ) => {
    setTableData((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;

        let newPurchase = item.purchase_price;
        let newMargin = item.margin_percentage;
        let newSupplierId = item.supplier_id;
        let newSupplierName = item.supplier_name;

        if (field === 'purchase_price') {
          newPurchase = typeof value === 'number' ? Math.max(0, value) : Number(value) || 0;
        } else if (field === 'margin_percentage') {
          newMargin = typeof value === 'number' ? value : Number(value) || 0;
        } else if (field === 'supplier_id') {
          newSupplierId = String(value);
          const found = suppliers.find((s) => s.id === newSupplierId);
          if (found) newSupplierName = found.name;
        }

        const newSelling = calculateSellingPrice(newPurchase, newMargin);
        const newTrend = determineTrend(newPurchase, item.yesterday_price);

        return {
          ...item,
          purchase_price: newPurchase,
          margin_percentage: newMargin,
          selling_price: newSelling,
          trend: newTrend,
          supplier_id: newSupplierId,
          supplier_name: newSupplierName,
          is_modified: true,
        };
      })
    );
  };

  // حفظ صف مفرد
  const handleSaveSingleRow = async (row: ProductPriceRow) => {
    setSavingRowId(row.id);
    try {
      await onSaveBatch([
        {
          productId: row.id,
          purchasePrice: row.purchase_price,
          marginPercentage: row.margin_percentage,
          sellingPrice: row.selling_price,
          supplierId: row.supplier_id,
          productName: row.name,
          unitLabel: row.unit_label,
          oldPrice: row.old_selling_price,
        },
      ]);
      setTableData((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, is_modified: false } : item))
      );
      setSuccessToast(`تم تحديث سعر "${row.name}" بنجاح (${row.selling_price} د.م)`);
      setTimeout(() => setSuccessToast(null), 3000);
    } finally {
      setSavingRowId(null);
    }
  };

  // حفظ جميع التعديلات دفعة واحدة
  const modifiedRows = useMemo(() => tableData.filter((r) => r.is_modified), [tableData]);

  const handleSaveAllModified = async () => {
    if (modifiedRows.length === 0) return;
    const payload = modifiedRows.map((r) => ({
      productId: r.id,
      purchasePrice: r.purchase_price,
      marginPercentage: r.margin_percentage,
      sellingPrice: r.selling_price,
      supplierId: r.supplier_id,
      productName: r.name,
      unitLabel: r.unit_label,
      oldPrice: r.old_selling_price,
    }));
    await onSaveBatch(payload);
    setTableData((prev) => prev.map((r) => ({ ...r, is_modified: false })));
    setSuccessToast(`تم حفظ أسعار ${modifiedRows.length} منتجات في قاعدة البيانات بنجاح!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // تطبيق هامش 40% على جميع المنتجات دفعة واحدة (المعتمد الوحيد)
  const handleApplyGlobal40Percent = async () => {
    const updated = tableData.map((item) => {
      const newMargin = DEFAULT_PROFIT_MARGIN; // 40%
      const newSelling = calculateSellingPrice(item.purchase_price, newMargin);
      return {
        ...item,
        margin_percentage: newMargin,
        selling_price: newSelling,
        is_modified: true,
      };
    });
    setTableData(updated);

    const payload = updated.map((r) => ({
      productId: r.id,
      purchasePrice: r.purchase_price,
      marginPercentage: DEFAULT_PROFIT_MARGIN,
      sellingPrice: r.selling_price,
      supplierId: r.supplier_id,
      productName: r.name,
      unitLabel: r.unit_label,
      oldPrice: r.old_selling_price,
    }));

    await onSaveBatch(payload);
    setTableData((prev) => prev.map((r) => ({ ...r, is_modified: false })));
    setSuccessToast(
      `🛡️ تم اعتماد هامش 40% المعتمد لجميع المنتجات لضمان تغطية مصاريف النقل واللوجستيك والإتلاف ومزامنتها فوراً مع المتجر والمخزون!`
    );
    setTimeout(() => setSuccessToast(null), 4500);
  };

  // تصفية المنتجات بالبحث والفئة الرسمية فقط
  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      const matchCat = row.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [tableData, selectedCategory, searchQuery]);

  // حساب الصفحات لمنع التمرير الطويل
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const totalCount = tableData.length;
    const avgMargin = Math.round(
      tableData.reduce((acc, r) => acc + r.margin_percentage, 0) / (totalCount || 1)
    );
    const modifiedCount = tableData.filter((r) => r.is_modified).length;
    const upCount = tableData.filter((r) => r.trend === 'up').length;
    const downCount = tableData.filter((r) => r.trend === 'down').length;
    const outOfStockCount = tableData.filter((r) => (r.stock ?? 10) === 0 || !r.is_available).length;
    const limitedStockCount = tableData.filter((r) => (r.stock ?? 10) >= 1 && (r.stock ?? 10) <= 5 && r.is_available).length;

    return { totalCount, avgMargin, modifiedCount, upCount, downCount, outOfStockCount, limitedStockCount };
  }, [tableData]);

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* ═══════ بطاقات الإحصائيات المختصرة ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* بطاقة إجمالي المنتجات */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500">إجمالي الأصناف</span>
            <span className="text-xl">🥬</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black font-['Almarai'] text-stone-900 tabular-nums">
              {stats.totalCount}
            </span>
            <p className="text-[11px] text-stone-500 font-medium mt-1">أصناف المتجر النشطة</p>
          </div>
        </div>

        {/* بطاقة متوسط هامش الربح */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500">متوسط الهامش</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-['Almarai'] text-[#163920] tabular-nums">
                %{stats.avgMargin}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium mt-1">المعتمد الوحيد للمتجر: 40%</p>
          </div>
        </div>

        {/* بطاقة حالة المخزون والتوفر */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500">حالة التوفر</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-black text-rose-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                {stats.outOfStockCount} نافد
              </span>
              <span className="text-sm font-black text-amber-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                {stats.limitedStockCount} محدود
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium mt-1">مزامنة حية مع المخزون</p>
          </div>
        </div>

        {/* بطاقة التعديلات قيد الحفظ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500">تعديلات قيد الحفظ</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
              <Save className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-black font-['Almarai'] text-[#D9762B] tabular-nums">
                {stats.modifiedCount}
              </span>
              <p className="text-[11px] text-stone-500 font-medium mt-1">
                {stats.modifiedCount > 0 ? 'بانتظار الحفظ السحابي' : 'جميع الأسعار متزامنة'}
              </p>
            </div>
            {stats.modifiedCount > 0 && (
              <button
                type="button"
                onClick={handleSaveAllModified}
                disabled={isSaving}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#163920] hover:bg-[#0E2615] text-[#F5D76E] text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الآن</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ إشعار تنبيهي سريع ═══════ */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 text-[#163920] text-xs sm:text-sm font-bold rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ═══════ شريط الأدوات: البحث، الفئات، والإجراءات ═══════ */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* حقل البحث بالاسم والمورد */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المنتج (بطاطس، طماطم...) أو اسم المورد..."
              className="w-full min-h-[44px] pr-10 pl-4 py-2 rounded-2xl border border-stone-200 text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#163920] focus:border-[#163920] bg-stone-50/60 placeholder:text-stone-400 transition-all"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleApplyGlobal40Percent}
              disabled={isSaving}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 text-amber-900 font-black text-xs inline-flex items-center gap-2 shadow-2xs cursor-pointer active:scale-97 transition-all"
              title="توحيد هامش الربح لكافة المنتجات إلى 40% (المعيار المعتمد للمتجر)"
            >
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>توحيد الهامش على 40% (المعتمد)</span>
            </button>

            <button
              type="button"
              onClick={onOpenSuppliersModal}
              className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold text-xs inline-flex items-center gap-2 shadow-2xs cursor-pointer active:scale-97 transition-all"
            >
              <Building2 className="w-4 h-4 text-[#163920]" />
              <span>الموردون ({suppliers.length})</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="min-h-[44px] min-w-[44px] rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 flex items-center justify-center transition-all cursor-pointer active:scale-95"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {modifiedRows.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAllModified}
                disabled={isSaving}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-gradient-to-l from-[#163920] to-[#2D6A3F] text-white font-black text-xs inline-flex items-center gap-2 shadow-sm active:scale-97 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4 text-[#F5D76E]" />
                <span>حفظ التعديلات ({modifiedRows.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* اختيار الفئة في وضع الهاتف: Dropdown أنيق وبسيط لمنع الازدحام */}
        <div className="sm:hidden">
          <label className="text-[11px] font-bold text-stone-500 mb-1.5 block">
            الفئة ({OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.name}):
          </label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ProductCategory)}
              className="w-full appearance-none bg-stone-50 border-2 border-stone-200 text-stone-900 font-black text-xs py-2.5 px-3 pr-10 rounded-2xl focus:outline-none focus:border-[#163920] focus:ring-1 focus:ring-[#163920] cursor-pointer shadow-2xs"
            >
              {OFFICIAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-base">
              {OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.icon}
            </span>
          </div>
        </div>

        {/* فئات المنتجات في الشاشات الكبيرة: 6 فئات رسمية فقط */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {OFFICIAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-[#163920] text-white shadow-2xs font-black'
                  : 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ جدول وبطاقات الأسعار: بطاقات للموبايل + جدول للمكتبي ═══════ */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {/* 1. بطاقات تسعير المنتجات للهاتف (Mobile Pricing Cards) */}
        <div className="md:hidden divide-y divide-stone-100">
          {filteredData.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs font-medium">
              لا توجد منتجات مطابقة في فئة {OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
            </div>
          ) : (
            paginatedData.map((row) => {
              const isRowSaving = savingRowId === row.id;
              const isHighlighted = highlightedProductId === row.id;
              const currentStock = row.stock !== undefined ? row.stock : (row.is_available ? 10 : 0);
              const isOutOfStock = currentStock === 0 || !row.is_available;
              const isLimitedStock = currentStock >= 1 && currentStock <= 5;

              return (
                <div
                  key={row.id}
                  id={`pricing-row-${row.id}`}
                  className={`p-3.5 bg-white space-y-3 transition-all duration-300 ${
                    isHighlighted
                      ? 'bg-amber-50/70 ring-2 ring-[#EAB308] rounded-2xl shadow-sm'
                      : row.is_modified
                      ? 'bg-amber-50/40 border-r-4 border-r-amber-400'
                      : ''
                  }`}
                >
                  {/* الرأس: اسم المنتج + السعر للبيع المحسوب */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 shadow-2xs">
                        {row.icon}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-black text-stone-900 text-xs sm:text-sm">{row.name}</h4>
                        <span className="text-[10px] text-stone-500 font-medium">
                          {row.unit_label} • {OFFICIAL_CATEGORIES.find((c) => c.id === row.category)?.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="py-1 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#163920] font-mono font-black text-xs sm:text-sm text-center tabular-nums">
                        {row.selling_price.toFixed(2)} د.م
                      </div>
                      <span className="text-[9px] text-emerald-800 font-bold block text-center mt-0.5">
                        سعر البيع
                      </span>
                    </div>
                  </div>

                  {/* المورد */}
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 mb-1 block">المورد:</label>
                    <select
                      value={row.supplier_id}
                      onChange={(e) => handleCellChange(row.id, 'supplier_id', e.target.value)}
                      className="w-full py-1.5 px-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#163920]"
                    >
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* سعر الشراء + هامش الربح */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 mb-1 block">سعر الشراء:</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.purchase_price}
                          onChange={(e) => handleCellChange(row.id, 'purchase_price', parseFloat(e.target.value) || 0)}
                          className="w-full py-1.5 px-2.5 pr-7 rounded-xl border border-stone-200 bg-white text-stone-900 font-mono font-bold text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-[#163920]"
                        />
                        <span className="absolute right-2 top-1.5 text-[9px] text-stone-400 font-bold pointer-events-none">
                          د.م
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-stone-500">الهامش (40%):</label>
                        {row.margin_percentage < 40 && (
                          <button
                            type="button"
                            onClick={() => handleCellChange(row.id, 'margin_percentage', 40)}
                            className="text-[9px] font-black text-amber-800 underline cursor-pointer"
                          >
                            رفع لـ 40%
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="150"
                          value={row.margin_percentage}
                          onChange={(e) => handleCellChange(row.id, 'margin_percentage', parseFloat(e.target.value) || 0)}
                          className={`w-full py-1.5 px-2.5 pr-6 rounded-xl border font-mono font-bold text-xs tabular-nums text-center focus:outline-none focus:ring-1 focus:ring-[#163920] ${
                            row.margin_percentage < 40
                              ? 'border-amber-300 bg-amber-50/60 text-amber-900'
                              : 'border-stone-200 bg-white text-stone-900'
                          }`}
                        />
                        <span className="absolute right-2 top-1.5 text-[9px] text-stone-400 font-bold pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* حالة المخزون وزر الفتح */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                          isOutOfStock
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isLimitedStock
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOutOfStock
                              ? 'bg-rose-600'
                              : isLimitedStock
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                        />
                        <span>
                          {isOutOfStock
                            ? 'نفد (0)'
                            : isLimitedStock
                            ? `محدود (${currentStock})`
                            : `متوفر (${currentStock})`}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleGoToInventory(row.id)}
                        className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                        title="فتح هذا المنتج في المخزون"
                      >
                        <Package className="w-3 h-3 text-[#163920]" />
                        <span>المخزون</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {row.is_modified && (
                        <button
                          type="button"
                          onClick={() => handleSaveSingleRow(row)}
                          disabled={isRowSaving}
                          className="px-3 py-1.5 rounded-lg bg-[#163920] hover:bg-[#0E2615] text-[#F5D76E] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isRowSaving ? 'حفظ...' : 'حفظ السعر'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. جدول الأسعار للشاشات المتوسطة والكبيرة (Desktop Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAFAF9] border-b border-stone-200/80 text-stone-600 font-bold">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 min-w-[170px] sticky right-0 bg-[#FAFAF9] z-10 shadow-xs">
                  المنتج
                </th>
                <th className="py-3 px-3 min-w-[150px]">المورد</th>
                <th className="py-3 px-3 min-w-[110px]">سعر الشراء</th>
                <th className="py-3 px-3 min-w-[110px] text-center">الهامش (40%)</th>
                <th className="py-3 px-3 min-w-[110px] text-center">سعر البيع</th>
                <th className="py-3 px-3 min-w-[90px] text-center">الاتجاه</th>
                <th className="py-3 px-3 min-w-[140px] text-center">المخزون</th>
                <th className="py-3 px-3 w-16 text-center">حفظ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-stone-500">
                    لم نتمكن من العثور على أي منتج يطابق معايير البحث الحالية في هذه الفئة.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const isRowSaving = savingRowId === row.id;
                  const isHighlighted = highlightedProductId === row.id;
                  const currentStock = row.stock !== undefined ? row.stock : (row.is_available ? 10 : 0);
                  const isOutOfStock = currentStock === 0 || !row.is_available;
                  const isLimitedStock = currentStock >= 1 && currentStock <= 5;

                  return (
                    <tr
                      key={row.id}
                      id={`pricing-row-${row.id}`}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-100/70 font-bold border-r-4 border-r-[#EAB308]'
                          : row.is_modified
                          ? 'bg-amber-50/40 border-r-4 border-r-amber-400 font-bold'
                          : 'hover:bg-amber-50/20'
                      }`}
                    >
                      {/* الرقم */}
                      <td className="py-3 px-3 text-center text-stone-400 font-mono text-[11px]">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* اسم المنتج */}
                      <td
                        className={`py-3 px-3 sticky right-0 z-10 transition-colors ${
                          isHighlighted ? 'bg-amber-100/90' : row.is_modified ? 'bg-amber-50/70' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                            {row.icon}
                          </span>
                          <div>
                            <div className="font-bold text-stone-900 text-xs sm:text-sm">{row.name}</div>
                            <span className="text-[10px] text-stone-400 font-normal">
                              {row.unit_label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* المورد */}
                      <td className="py-3 px-3">
                        <select
                          value={row.supplier_id}
                          onChange={(e) => handleCellChange(row.id, 'supplier_id', e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#163920] truncate transition-all"
                        >
                          {suppliers.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* سعر الشراء */}
                      <td className="py-3 px-3">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.purchase_price}
                            onChange={(e) =>
                              handleCellChange(row.id, 'purchase_price', parseFloat(e.target.value) || 0)
                            }
                            className="w-full py-1.5 px-2.5 pr-7 rounded-xl border border-stone-200 bg-white text-stone-900 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#163920] tabular-nums transition-all"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-stone-400 font-bold pointer-events-none">
                            د.م
                          </span>
                        </div>
                      </td>

                      {/* هامش الربح % */}
                      <td className="py-3 px-3 text-center">
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="150"
                            value={row.margin_percentage}
                            onChange={(e) =>
                              handleCellChange(row.id, 'margin_percentage', parseFloat(e.target.value) || 0)
                            }
                            className={`w-full py-1.5 px-2.5 pr-6 rounded-xl border font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#163920] tabular-nums text-center transition-all ${
                              row.margin_percentage < 40
                                ? 'border-amber-300 bg-amber-50/60 text-amber-900'
                                : 'border-stone-200 bg-white text-stone-900'
                            }`}
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-stone-400 font-bold pointer-events-none">
                            %
                          </span>
                        </div>
                        {row.margin_percentage < 40 && (
                          <button
                            type="button"
                            onClick={() => handleCellChange(row.id, 'margin_percentage', 40)}
                            className="text-[9px] font-black text-amber-800 hover:text-amber-950 underline block mt-1 mx-auto cursor-pointer"
                          >
                            رفع لـ 40%
                          </button>
                        )}
                      </td>

                      {/* سعر البيع */}
                      <td className="py-3 px-3 text-center">
                        <div className="py-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#163920] font-mono font-black text-xs sm:text-sm text-center tabular-nums shadow-2xs">
                          {row.selling_price.toFixed(2)} د.م
                        </div>
                      </td>

                      {/* مؤشر الاتجاه */}
                      <td className="py-3 px-3 text-center">
                        {row.trend === 'up' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>ارتفع</span>
                          </span>
                        )}
                        {row.trend === 'down' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ArrowDownRight className="w-3 h-3" />
                            <span>انخفض</span>
                          </span>
                        )}
                        {row.trend === 'stable' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                            <Minus className="w-3 h-3 text-stone-400" />
                            <span>مستقر</span>
                          </span>
                        )}
                      </td>

                      {/* المخزون وزر الفتح */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap inline-flex items-center gap-1 ${
                              isOutOfStock
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : isLimitedStock
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-rose-600' : isLimitedStock ? 'bg-amber-500' : 'bg-emerald-600'
                              }`}
                            />
                            <span>
                              {isOutOfStock
                                ? 'نفد (0)'
                                : isLimitedStock
                                ? `محدود (${currentStock})`
                                : `متوفر (${currentStock})`}
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleGoToInventory(row.id)}
                            className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 text-[10px] font-bold flex items-center gap-0.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                            title="فتح المنتج في المخزون"
                          >
                            <Package className="w-3 h-3 text-[#163920]" />
                            <span>المخزون</span>
                          </button>
                        </div>
                      </td>

                      {/* زر اعتماد وحفظ السعر */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveSingleRow(row)}
                          disabled={isRowSaving}
                          className={`min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            row.is_modified
                              ? 'bg-[#163920] hover:bg-[#0E2615] text-[#F5D76E] shadow-2xs active:scale-95'
                              : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                          }`}
                          title={row.is_modified ? 'حفظ السعر' : 'السعر معتمد'}
                        >
                          {isRowSaving ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#163920]" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ═══════ شريط ترقيم الصفحات (Pagination) لمنع التمرير الطويل ═══════ */}
        {filteredData.length > 0 && (
          <div className="p-4 sm:p-5 bg-[#FAFAF9] border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-stone-600 font-bold text-center sm:text-right">
              <span>
                عرض {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, filteredData.length)} من أصل {filteredData.length} منتج في فئة{' '}
                {OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
              </span>
              <span className="text-stone-400 mr-2 text-[11px] font-medium">
                (إجمالي أصناف المتجر: {tableData.length})
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5" dir="rtl">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl font-black text-xs transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-[#163920] text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* تذييل الجدول */}
        <div className="p-4 sm:p-5 bg-[#FAFAF9] border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-stone-600 font-bold">
            عرض {filteredData.length} منتجاً من أصل {tableData.length} منتجاً مسجلاً في متجر خُضرة
          </span>
          <div className="flex items-center gap-2 text-stone-500 font-medium text-[11px]">
            <span>معادلة التسعير: <strong>سعر البيع = سعر الشراء × (1 + هامش الربح / 100)</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
