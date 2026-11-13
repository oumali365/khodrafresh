// ============================================================
// src/features/products-inventory/AdminInventoryPanel.tsx
// لوحة إدارة المنتجات والمخزون المتقدمة لمتجر "خُضرة — فاس"
// تتيح التحكم اللحظي بالمخزون، إضافة وتعديل المنتجات، ومنع الترويج عند النفاد
// ============================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  Tag,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Eye,
  EyeOff,
  FileText,
  PlusCircle,
} from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import {
  fetchProducts,
  saveProductToStore,
  updateProductStockQuick,
  deleteProductFromStore,
  hideProductInStore,
  restoreProductInStore,
  recordInventoryMovement,
} from '../../services/supabaseService';
import { InventoryMovementModal, InventoryMovementType } from './InventoryMovementModal';
import { InventoryLedgerModal } from './InventoryLedgerModal';
import { calculateEstimatedPurchasePrice } from '../../services/financialEngine';
import { CATEGORIES_CONFIG } from '../../data/mockProducts';
import { useRealtimeStock } from '../../hooks';

export const ADMIN_OFFICIAL_CATEGORIES: { id: ProductCategory; name: string; icon: string }[] = [
  { id: 'veg', name: 'خضار وورقيات', icon: '🥬' },
  { id: 'fruit', name: 'فواكه موسمية', icon: '🍎' },
  { id: 'dairy', name: 'ألبان وأجبان', icon: '🥛' },
  { id: 'grocery', name: 'بقالة ومونة', icon: '🛒' },
  { id: 'drinks', name: 'عصائر ومشروبات', icon: '🥤' },
  { id: 'cleaning', name: 'نظافة وعناية', icon: '🧴' },
];

interface AdminInventoryPanelProps {
  standalone?: boolean;
  isOpen?: boolean;
  targetProductId?: number | null;
  onClose?: () => void;
  onNavigateToPricing?: (productId: number) => void;
  onNavigateToAI?: (prompt?: string) => void;
}

export const AdminInventoryPanel: React.FC<AdminInventoryPanelProps> = ({
  standalone = true,
  isOpen = true,
  targetProductId = null,
  onClose,
  onNavigateToPricing,
  onNavigateToAI,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('veg');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // ترقيم الصفحات (Pagination) لمنع التمرير الطويل
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);

  // نوافذ التعديل والإضافة
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'veg' as ProductCategory,
    type: 'weight' as 'weight' | 'unit',
    price: 0,
    unit_label: 'kg',
    stock: 10,
    min_stock_alert: 5,
    origin: 'فاس والمغرب',
    description: '',
    icon: '🛒',
    image_url: '',
    is_available: true,
    is_featured: false,
    is_seasonal: false,
    is_bestseller: false,
  });

  // نوافذ حركات المخزون وسجل التدقيق
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementModalType, setMovementModalType] = useState<InventoryMovementType>('morning_stockin');
  const [targetMovementProduct, setTargetMovementProduct] = useState<Product | null>(null);

  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [targetLedgerProductId, setTargetLedgerProductId] = useState<number | null>(null);

  const [savingId, setSavingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadCatalog = useCallback(async (): Promise<Product[]> => {
    setIsLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
      return data;
    } catch {
      showToast('error', 'تعذر تحميل المنتجات');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen, loadCatalog]);

  // الاشتراك اللحظي في تحديثات المخزون من Supabase Realtime
  useRealtimeStock({
    enabled: isOpen,
    onStockUpdated: (pid, newStock, isAvail) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === pid
            ? { ...p, stock: newStock, is_available: isAvail }
            : p
        )
      );
    },
    onProductsReloadNeeded: loadCatalog,
  });

  // الاستماع لتحديثات الأسعار الفورية من أداة التسعير الديناميكي (انعكاس فوري دون إعادة تحميل)
  useEffect(() => {
    const handlePricesUpdated = (e: any) => {
      const updates = e?.detail?.updates;
      if (Array.isArray(updates) && updates.length > 0) {
        setProducts((prev) =>
          prev.map((p) => {
            const found = updates.find((u: any) => Number(u.productId) === p.id);
            const targetSelling = found ? (found.selling_price ?? found.sellingPrice) : null;
            if (targetSelling != null && Number(targetSelling) > 0) {
              return { ...p, price: Number(targetSelling) };
            }
            return p;
          })
        );
      }
    };

    window.addEventListener('khodra_prices_updated', handlePricesUpdated);
    return () => window.removeEventListener('khodra_prices_updated', handlePricesUpdated);
  }, []);

  // إحصائيات المخزون المحاسبية والتقييم المالي الدقيق
  const inventoryStats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => (p.stock ?? 0) > 5 && p.is_available !== false).length;
    const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
    const outOfStock = products.filter((p) => (p.stock ?? 0) === 0 || p.is_available === false).length;
    const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    // ربط الكميات بتكلفة الشراء الفعلية لحساب القيمة المحاسبية الحقيقية
    let savedPrices: Record<number, any> = {};
    try {
      const raw = localStorage.getItem('khodra_daily_prices_v1');
      if (raw) savedPrices = JSON.parse(raw);
    } catch {}

    let totalInventoryCostValue = 0;
    let totalInventoryRetailValue = 0;

    products.forEach((p) => {
      const stock = Math.max(0, p.stock || 0);
      const savedEntry = savedPrices[p.id];
      const cost = savedEntry && savedEntry.purchase
        ? Number(savedEntry.purchase)
        : calculateEstimatedPurchasePrice(p.price);

      totalInventoryCostValue += stock * cost;
      totalInventoryRetailValue += stock * p.price;
    });

    const expectedGrossProfit = totalInventoryRetailValue - totalInventoryCostValue;
    const overallCostRatio = totalInventoryRetailValue > 0
      ? Number(((totalInventoryCostValue / totalInventoryRetailValue) * 100).toFixed(1))
      : 0;

    return {
      total,
      inStock,
      lowStock,
      outOfStock,
      totalUnits: Number(totalUnits.toFixed(1)),
      totalInventoryCostValue: Number(totalInventoryCostValue.toFixed(2)),
      totalInventoryRetailValue: Number(totalInventoryRetailValue.toFixed(2)),
      expectedGrossProfit: Number(expectedGrossProfit.toFixed(2)),
      overallCostRatio,
    };
  }, [products]);

  const handleOpenMovementModal = (type: InventoryMovementType, prod?: Product) => {
    setMovementModalType(type);
    setTargetMovementProduct(prod || null);
    setIsMovementModalOpen(true);
  };

  const handleOpenLedgerModal = (productId?: number) => {
    setTargetLedgerProductId(productId || null);
    setIsLedgerModalOpen(true);
  };

  const handleSaveInventoryMovement = async (movement: {
    productId: number;
    movementType: InventoryMovementType;
    quantity: number;
    unitCost?: number;
    supplierId?: string;
    reason: string;
    orderId?: string;
  }) => {
    const delta = movement.quantity;
    const res = await recordInventoryMovement({
      productId: movement.productId,
      movementType: movement.movementType,
      quantityDelta: delta,
      unitCost: movement.unitCost,
      supplierId: movement.supplierId,
      reason: movement.reason,
      orderId: movement.orderId,
    });
    if (res.success) {
      showToast('success', res.message || 'تم قيد حركة المخزون بنجاح');
      await loadCatalog();
      return { success: true };
    } else {
      showToast('error', res.message || 'فشلت معالجة حركة المخزون');
      return { success: false, message: res.message };
    }
  };

  // إعادة ضبط الصفحة إلى 1 عند تغيير الفئة أو البحث أو تصفية المخزون
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, stockFilter]);

  // تصفية المنتجات حسب الفئة المختارة وبحث المستخدم
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.origin && p.origin.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = p.category === selectedCategory;

      let matchStock = true;
      if (stockFilter === 'low') {
        matchStock = (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5;
      } else if (stockFilter === 'out') {
        matchStock = (p.stock ?? 0) === 0 || p.is_available === false;
      }

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  // حساب الصفحات
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const productsRef = useRef<Product[]>(products);
  productsRef.current = products;
  const lastHandledTargetIdRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // وظيفة التركيز على منتج معين مع ضمان حرية التمرير وعدم التجميد
  const focusProduct = useCallback(
    (pid: number, catalog?: Product[]) => {
      // إزالة أي قيد تمرير على الصفحة فوراً
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }

      const activeCatalog = catalog && catalog.length > 0 ? catalog : productsRef.current;
      const target = activeCatalog.find((p) => p.id === pid);
      if (!target) return;

      setSelectedCategory(target.category);
      setStockFilter('all');
      setSearchQuery('');

      const categoryItems = activeCatalog.filter((p) => p.category === target.category);
      const indexInCat = categoryItems.findIndex((p) => p.id === pid);
      if (indexInCat >= 0) {
        const targetPage = Math.floor(indexInCat / pageSize) + 1;
        setCurrentPage(targetPage);
      }

      setHighlightedProductId(pid);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const el = document.getElementById(`inv-product-${pid}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 180);

      setTimeout(() => {
        setHighlightedProductId((curr) => (curr === pid ? null : curr));
      }, 3500);
    },
    [pageSize]
  );

  useEffect(() => {
    if (targetProductId != null && Number(targetProductId) > 0) {
      const pid = Number(targetProductId);
      if (lastHandledTargetIdRef.current !== pid) {
        lastHandledTargetIdRef.current = pid;
        loadCatalog().then((catalog) => {
          focusProduct(pid, catalog);
        });
      }
    }
  }, [targetProductId, loadCatalog, focusProduct]);

  useEffect(() => {
    const handleOpenProduct = (e: any) => {
      const pid = Number(e?.detail?.productId);
      if (pid && pid > 0) {
        lastHandledTargetIdRef.current = pid;
        loadCatalog().then((catalog) => {
          focusProduct(pid, catalog);
        });
      }
    };
    window.addEventListener('khodra_open_inventory_for_product', handleOpenProduct);
    return () => {
      window.removeEventListener('khodra_open_inventory_for_product', handleOpenProduct);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [focusProduct, loadCatalog]);

  // الانتقال المباشر لأداة التسعير الديناميكي لنفس المنتج
  const handleGoToPricing = (productId: number) => {
    if (onNavigateToPricing) {
      onNavigateToPricing(productId);
    } else {
      window.dispatchEvent(
        new CustomEvent('khodra_open_pricing_for_product', {
          detail: { productId },
        })
      );
      window.dispatchEvent(
        new CustomEvent('khodra_admin_route_changed', {
          detail: 'pricing',
        })
      );
    }
  };

  // تعديل سريع للكمية (Admin Control First)
  const handleQuickStockChange = async (productId: number, delta: number) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const newStock = Math.max(0, +((target.stock || 0) + delta).toFixed(2));

    // 1. تسجيل قبل إرسال الطلب (Pre-Request Logging)
    console.log('🔄 [AdminInventoryPanel] بدء تعديل كمية المنتج:', {
      productId,
      productName: target.name,
      delta,
      currentStock: target.stock,
      targetStock: newStock,
      timestamp: new Date().toISOString(),
    });

    setSavingId(productId);
    const res = await updateProductStockQuick(productId, newStock);
    setSavingId(null);

    // 2. التحقق من النتيجة: إذا نجح التحديث في Supabase
    if (res.success) {
      // تسجيل بعد اكتمال الطلب بنجاح (Post-Request Logging)
      console.log('✅ [AdminInventoryPanel] تم تأكيد حفظ المخزون في Supabase بنجاح:', {
        productId,
        newStock,
      });

      // تحديث الواجهة تماشياً مع قاعدة البيانات
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock, is_available: newStock > 0 } : p))
      );
      showToast('success', res.message || `تم حفظ مخزون ${target.name} (${newStock}) في السيرفر`);

      // إعادة الجلب فقط عند النجاح لتحديث الإحصائيات وضمان تزامن السيرفر
      await loadCatalog();
    } else {
      // 3. في حالة الفشل (Error Handling):
      // تسجيل الخطأ بالكامل (Error Logging)
      console.error('❌ [AdminInventoryPanel] فشل حفظ المخزون في Supabase:', {
        productId,
        productName: target.name,
        attemptedStock: newStock,
        errorMessage: res.message,
      });

      // ⚠️ لا نحدث الواجهة محلياً بالقيمة الخاطئة
      // ⚠️ لا نقوم بعمل refetch فوري عند الفشل لمنع اهتزاز الشاشة أو محو المدخلات
      // نظهر رسالة خطأ صريحة للمدير
      showToast('error', res.message || 'فشل حفظ المخزون في قاعدة البيانات');
    }
  };

  // فتح نموذج الإضافة
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'veg',
      type: 'weight',
      price: 7,
      unit_label: 'kg',
      stock: 50,
      min_stock_alert: 5,
      origin: 'فاس والمغرب',
      description: '',
      icon: '🛒',
      image_url: '',
      is_available: true,
      is_featured: false,
      is_seasonal: false,
      is_bestseller: false,
    });
    setIsModalOpen(true);
  };

  // فتح نموذج التعديل
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      type: p.type,
      price: p.price,
      unit_label: p.unit_label || (p.type === 'unit' ? 'حبة' : 'kg'),
      stock: p.stock ?? 10,
      min_stock_alert: p.min_stock_alert ?? 5,
      origin: p.origin || 'المغرب',
      description: p.description || '',
      icon: p.icon || '🛒',
      image_url: p.image_url || '',
      is_available: p.is_available !== false,
      is_featured: Boolean(p.is_featured),
      is_seasonal: Boolean(p.is_seasonal),
      is_bestseller: Boolean(p.is_bestseller),
    });
    setIsModalOpen(true);
  };

  // حفظ المنتج
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.price <= 0) {
      showToast('error', 'يرجى إدخال اسم المنتج وسعر صالح');
      return;
    }

    const payload: Partial<Product> & { name: string; price: number; category: ProductCategory } = {
      id: editingProduct ? editingProduct.id : undefined,
      name: formData.name,
      category: formData.category,
      type: formData.type,
      price: Number(formData.price),
      unit_label: formData.unit_label,
      stock: Number(formData.stock),
      min_stock_alert: Number(formData.min_stock_alert),
      origin: formData.origin,
      description: formData.description,
      icon: formData.icon,
      image_url: formData.image_url,
      is_available: formData.is_available,
      is_featured: formData.is_featured,
      is_seasonal: formData.is_seasonal,
      is_bestseller: formData.is_bestseller,
    };

    console.log('🔄 [AdminInventoryPanel] إرسال طلب حفظ تفاصيل المنتج إلى Supabase...', payload);
    const res = await saveProductToStore(payload);
    if (res.success && res.data) {
      console.log('✅ [AdminInventoryPanel] تم حفظ المنتج بنجاح في Supabase:', res.data);
      showToast('success', res.message || 'تم حفظ المنتج بنجاح');
      setIsModalOpen(false);
      await loadCatalog();
    } else {
      console.error('❌ [AdminInventoryPanel] فشل حفظ المنتج في Supabase:', res.message);
      showToast('error', res.message || 'فشل حفظ المنتج في قاعدة البيانات');
      // لا نغلق النموذج ولا نقوم بعمل refetch عند الفشل ليتمكن المدير من تصحيح المدخلات أو المحاولة ثانية
    }
  };

  // تعطيل منتج
  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في إيقاف وتعطيل المنتج "${p.name}"؟`)) {
      return;
    }

    console.log('🔄 [AdminInventoryPanel] إرسال طلب تعطيل المنتج إلى Supabase:', { id: p.id, name: p.name });
    const res = await deleteProductFromStore(p.id);
    if (res.success) {
      console.log('✅ [AdminInventoryPanel] تم تعطيل المنتج بنجاح في Supabase:', p.id);
      showToast('success', res.message || 'تم تعطيل المنتج');
      await loadCatalog();
    } else {
      console.error('❌ [AdminInventoryPanel] فشل تعطيل المنتج في Supabase:', res.message);
      showToast('error', res.message || 'فشل تعطيل المنتج');
    }
  };

  // إخفاء (إزالة من المتجر)
  const handleHideProduct = async (p: Product) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في إخفاء المنتج "${p.name}" من المتجر ومنع ظهوره للعملاء؟`)) {
      return;
    }
    setSavingId(p.id);
    const res = await hideProductInStore(p.id);
    setSavingId(null);
    if (res.success) {
      showToast('success', res.message || `تم إخفاء المنتج ${p.name}`);
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_available: false, active: false } : item))
      );
      await loadCatalog();
    } else {
      showToast('error', res.message || 'فشل إخفاء المنتج');
    }
  };

  // استرجاع إلى المتجر
  const handleRestoreProduct = async (p: Product) => {
    setSavingId(p.id);
    const res = await restoreProductInStore(p.id);
    setSavingId(null);
    if (res.success) {
      showToast('success', res.message || `تم استرجاع المنتج ${p.name}`);
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_available: (item.stock ?? 10) > 0, active: true } : item))
      );
      await loadCatalog();
    } else {
      showToast('error', res.message || 'فشل استرجاع المنتج');
    }
  };

  if (!isOpen && !standalone) return null;

  return (
    <div
      className={`space-y-4 sm:space-y-6 text-right font-['Tajawal'] antialiased bg-[#FAFAF9] rounded-3xl ${
        standalone ? 'p-3 sm:p-6 max-w-7xl mx-auto' : 'p-2 sm:p-4'
      }`}
      dir="rtl"
    >
      {/* ═══════ الترويسة الرئيسية ═══════ */}
      <header className="relative overflow-hidden bg-gradient-to-l from-[#163920] via-[#1A4527] to-[#122F1B] rounded-3xl p-5 sm:p-7 text-white shadow-md border border-emerald-900/40">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EAB308]/20 border border-[#EAB308]/40 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-[#EAB308]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">إدارة المنتجات والمخزون</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {products.length} صنف
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 mt-1">
                تتبع الكميات الحية، تحديث الأسعار، وتأمين المخزون من النفاد لضمان دقة الحملات التسويقية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenMovementModal('morning_stockin')}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="تسجيل توريد صباحي جديد من سوق الجملة بنسودة مع ربط تكلفة الشراء"
            >
              <span>📥 توريد صباحي</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenLedgerModal()}
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="فتح سجل تدقيق حركات المخزون للتدقيق المحاسبي"
            >
              <span>📋 سجل الحركات</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#ca9a07] text-[#163920] font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة منتج</span>
            </button>

            <button
              type="button"
              onClick={loadCatalog}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════ إشعار التنبيه ═══════ */}
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm font-bold border shadow-sm flex items-center justify-between gap-3 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══════ بطاقات مقاييس المخزون والتقييم المالي ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. القيمة المالية للمخزون بسعر التكلفة */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>قيمة المخزون (بالتكلفة)</span>
            <span className="text-sm">💰</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#163920] tabular-nums">
            {inventoryStats.totalInventoryCostValue.toLocaleString()} <span className="text-xs font-normal">د.م</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 font-medium">
            القيمة البيعية: {inventoryStats.totalInventoryRetailValue.toLocaleString()} د.م
          </div>
        </div>

        {/* 2. الربح التشغيلي الإجمالي المتوقع */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
            <span>الربح الإجمالي المتوقع</span>
            <span className="text-sm">📈</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tabular-nums">
            +{inventoryStats.expectedGrossProfit.toLocaleString()} <span className="text-xs font-normal">د.م</span>
          </div>
          <div className="text-[11px] text-emerald-800 mt-1 font-bold">
            نسبة التكلفة الإجمالية: %{inventoryStats.overallCostRatio} (سقف 60%)
          </div>
        </div>

        {/* 3. إجمالي الأصناف والكميات */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>أصناف المتجر والمخزن</span>
            <Package className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-black text-stone-900">{inventoryStats.total} صنف</div>
          <div className="text-[11px] text-stone-500 mt-1 font-medium">
            المجموع: {inventoryStats.totalUnits} كجم / وحدة ({inventoryStats.inStock} متوفر بوفرة)
          </div>
        </div>

        {/* 4. تنبيهات النقص والنفاد JIT */}
        <div
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer ${
            stockFilter === 'low'
              ? 'bg-amber-100 border-amber-400 shadow-sm'
              : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/60'
          }`}
        >
          <div className="flex items-center justify-between text-amber-900 text-xs font-bold mb-1">
            <span>حالات النقص والنفاد (JIT)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-amber-900">{inventoryStats.lowStock} حرج</span>
            <span className="text-sm font-bold text-rose-700">({inventoryStats.outOfStock} نفد)</span>
          </div>
          <div className="text-[11px] text-amber-800 mt-1 font-medium">
            {stockFilter === 'low' ? '✓ تم تطبيق التصفية' : 'اضغط للتصفية وتحديد أولويات الشراء'}
          </div>
        </div>
      </div>

      {/* ═══════ تنبيه حماية الذكاء الاصطناعي ═══════ */}
      {inventoryStats.lowStock > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              نظام خُضرة AI يقوم تلقائياً باستبعاد المنتجات منخفضة المخزون ({inventoryStats.lowStock} منتجات) من
              الحملات الترويجية الضخمة لتفادي خيبة أمل الزبائن.
            </span>
          </div>
          {onNavigateToAI && (
            <button
              type="button"
              onClick={() => onNavigateToAI('عطيني المنتجات اللي خاصني نروج ليها اليوم مع المخزون المتوفر')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 cursor-pointer transition-colors"
            >
              استشارة خُضرة AI
            </button>
          )}
        </div>
      )}

      {/* ═══════ أدوات التصفية والبحث ═══════ */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو المنشأ (مثلاً: بطاطس، طماطم، الشاوية)..."
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'low', 'out'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStockFilter(mode as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  stockFilter === mode
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {mode === 'all' && 'كافة الحالات'}
                {mode === 'low' && 'قارب على النفاد ⚠️'}
                {mode === 'out' && 'غير متوفر ❌'}
              </button>
            ))}
          </div>
        </div>

        {/* اختيار الفئة في وضع الهاتف: Dropdown أنيق وبسيط يمنع الازدحام والتمرير الطويل */}
        <div className="sm:hidden">
          <label className="text-[11px] font-bold text-stone-500 mb-1.5 block">
            الفئة ({ADMIN_OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.name}):
          </label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ProductCategory)}
              className="w-full appearance-none bg-stone-50 border-2 border-stone-200 text-stone-900 font-black text-xs py-2.5 px-3 pr-10 rounded-xl focus:outline-none focus:border-[#163920] focus:ring-1 focus:ring-[#163920] cursor-pointer shadow-2xs"
            >
              {ADMIN_OFFICIAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-base">
              {ADMIN_OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.icon}
            </span>
          </div>
        </div>

        {/* أزرار الفئات في الشاشات الكبيرة: 6 فئات رسمية بدون الكل أو جميع المنتجات */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-xs">
          {ADMIN_OFFICIAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-[#163920] text-white shadow-xs font-black'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ عرض المنتجات: بطاقات للهاتف + جدول للمكتبي ═══════ */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs overflow-hidden">
        {/* 1. قائمة بطاقات المنتجات للهاتف (Mobile Product Cards) */}
        <div className="md:hidden divide-y divide-stone-100">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs font-medium">
              لا توجد منتجات مطابقة للبحث في فئة {ADMIN_OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
            </div>
          ) : (
            paginatedProducts.map((p) => {
              const stock = p.stock ?? 0;
              const isLow = stock > 0 && stock <= 5;
              const isOut = stock === 0 || p.is_available === false;
              const isHighlighted = highlightedProductId === p.id;

              return (
                <div
                  key={p.id}
                  id={`inv-product-${p.id}`}
                  className={`p-3.5 bg-white space-y-2.5 transition-all duration-300 ${
                    isHighlighted ? 'bg-amber-50/70 ring-2 ring-[#EAB308] rounded-2xl shadow-sm' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden text-xl shadow-2xs">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{p.icon || '🛒'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-stone-900 text-xs sm:text-sm">{p.name}</h4>
                          {p.is_bestseller && (
                            <span className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md font-bold">
                              الأكثر طلباً
                            </span>
                          )}
                          {p.is_seasonal && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md font-bold">
                              موسمي
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {p.origin || 'المغرب'} · {p.type === 'unit' ? 'بالحبة' : 'بالكيلوغرام'}
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="font-mono font-black text-emerald-800 text-sm whitespace-nowrap">
                        {p.price.toFixed(2)} د.م
                      </div>
                      <span className="text-[10px] text-stone-400">
                        /{p.unit_label || (p.type === 'unit' ? 'وحدة' : 'kg')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 flex-wrap">
                    {/* تعديل المخزون */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-stone-500 font-bold ml-1">المخزون:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickStockChange(p.id, p.type === 'weight' ? -0.5 : -1)}
                        disabled={stock <= 0 || savingId === p.id}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer disabled:opacity-30"
                        title={p.type === 'weight' ? 'إنقاص 0.5 كغ' : 'إنقاص وحدة'}
                      >
                        -
                      </button>
                      <span
                        className={`min-w-9 text-center font-black font-mono text-xs px-1.5 py-1 rounded-lg ${
                          isOut
                            ? 'bg-rose-100 text-rose-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {stock}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickStockChange(p.id, p.type === 'weight' ? 0.5 : 1)}
                        disabled={savingId === p.id}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                        title={p.type === 'weight' ? 'إضافة 0.5 كغ' : 'إضافة وحدة'}
                      >
                        +
                      </button>
                    </div>

                    {/* الإجراءات الأساسية + زر الانتقال للتحليل والتسعير */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isOut
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isLow
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isOut ? 'نفد' : isLow ? 'محدود' : 'متوفر'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleGoToPricing(p.id)}
                        className="p-1 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                        title="فتح تحليل السعر وتوقع الطلب لهذا المنتج"
                      >
                        <Sparkles className="w-3 h-3 text-purple-700" />
                        <span>🧠 تحليل السعر</span>
                      </button>

                      {p.is_available === false || p.active === false ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreProduct(p)}
                          disabled={savingId === p.id}
                          className="p-1 px-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                          title="استرجاع المنتج إلى المتجر وإظهاره للعملاء"
                        >
                          <Eye className="w-3 h-3 text-emerald-800" />
                          <span>استرجاع</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleHideProduct(p)}
                          disabled={savingId === p.id}
                          className="p-1 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                          title="إزالة وإخفاء المنتج من المتجر مؤقتاً"
                        >
                          <EyeOff className="w-3 h-3 text-stone-600" />
                          <span>إخفاء</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenMovementModal('morning_stockin', p)}
                        className="p-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                        title="تسجيل توريد صباحي لهذا المنتج"
                      >
                        <PlusCircle className="w-3 h-3 text-emerald-700" />
                        <span>توريد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenLedgerModal(p.id)}
                        className="p-1 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                        title="سجل حركات هذا المنتج"
                      >
                        <FileText className="w-3 h-3 text-stone-600" />
                        <span>سجل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1 px-2.5 rounded-lg bg-[#163920] hover:bg-[#0E2615] text-[#F5D76E] text-xs font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. جدول المنتجات للشاشات المتوسطة والكبيرة (Desktop Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-black">
              <tr>
                <th className="py-3 px-4">المنتج</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">سعر البيع</th>
                <th className="py-3 px-4">المخزون الحالي</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    لا توجد منتجات مطابقة للبحث أو التصفية الحالية
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const stock = p.stock ?? 0;
                  const isLow = stock > 0 && stock <= 5;
                  const isOut = stock === 0 || p.is_available === false;
                  const isHighlighted = highlightedProductId === p.id;

                  return (
                    <tr
                      key={p.id}
                      id={`inv-product-${p.id}`}
                      className={`transition-colors ${
                        isHighlighted ? 'bg-amber-100/70 font-bold border-r-4 border-r-[#EAB308]' : 'hover:bg-stone-50/80'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden text-lg">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as any).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{p.icon || '🛒'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-black text-stone-900 flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.is_bestseller && (
                                <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md font-bold">
                                  الأكثر طلباً
                                </span>
                              )}
                              {p.is_seasonal && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md font-bold">
                                  موسمي
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-400 mt-0.5">
                              {p.origin || 'المغرب'} · {p.type === 'unit' ? 'بالحبة' : 'بالكيلوغرام'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-stone-600 font-medium">
                          {ADMIN_OFFICIAL_CATEGORIES.find((c) => c.id === p.category)?.name || p.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-black text-emerald-800">
                        {p.price.toFixed(2)} د.م
                        <span className="text-[11px] text-stone-400 font-normal mr-1">
                          /{p.unit_label || (p.type === 'unit' ? 'وحدة' : 'kg')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickStockChange(p.id, p.type === 'weight' ? -0.5 : -1)}
                            disabled={stock <= 0 || savingId === p.id}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer"
                            title={p.type === 'weight' ? 'إنقاص 0.5 كغ' : 'إنقاص وحدة'}
                          >
                            -
                          </button>
                          <span
                            className={`min-w-10 text-center font-black text-sm px-2 py-0.5 rounded-lg ${
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickStockChange(p.id, p.type === 'weight' ? 0.5 : 1)}
                            disabled={savingId === p.id}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold cursor-pointer"
                            title={p.type === 'weight' ? 'إضافة 0.5 كغ' : 'إضافة وحدة'}
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {p.is_available === false || p.active === false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-stone-600 bg-stone-100 border border-stone-300 px-2.5 py-0.5 rounded-full">
                            <EyeOff className="w-3 h-3 text-stone-500" />
                            مخفي من المتجر
                          </span>
                        ) : isOut ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            نفد المخزون
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            قارب على النفاد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            متوفر
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* زر الانتقال المباشر للتسعير وتوقع الطلب لنفس المنتج */}
                          <button
                            type="button"
                            onClick={() => handleGoToPricing(p.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer ml-1"
                            title="فتح تحليل السعر وتوقع الطلب لهذا المنتج"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                            <span>🧠 تحليل السعر والطلب</span>
                          </button>

                          {p.is_available === false || p.active === false ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreProduct(p)}
                              disabled={savingId === p.id}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              title="استرجاع المنتج إلى المتجر وإظهاره للعملاء"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-800" />
                              <span>استرجاع</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleHideProduct(p)}
                              disabled={savingId === p.id}
                              className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              title="إزالة وإخفاء المنتج من المتجر مؤقتاً"
                            >
                              <EyeOff className="w-3.5 h-3.5 text-stone-600" />
                              <span>إخفاء</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenMovementModal('morning_stockin', p)}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="تسجيل توريد صباحي وإضافة رصيد لهذا المنتج"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenLedgerModal(p.id)}
                            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                            title="عرض سجل تدقيق حركات هذا المنتج"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                            title="تعديل التفاصيل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="تعطيل المنتج"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ═══════ شريط ترقيم الصفحات (Pagination) لمنع التمرير الطويل ═══════ */}
        {filteredProducts.length > 0 && (
          <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-stone-600 font-bold text-center sm:text-right">
              <span>
                عرض {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, filteredProducts.length)} من أصل {filteredProducts.length} منتج في فئة{' '}
                {ADMIN_OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
              </span>
              <span className="text-stone-400 mr-2 text-[11px] font-medium">
                (إجمالي أصناف المتجر: {inventoryStats.total})
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
      </div>

      {/* ═══════ نافذة إضافة / تعديل منتج ═══════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-stone-900">
                  {editingProduct ? `تعديل منتج: ${editingProduct.name}` : 'إضافة منتج جديد للمتجر'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم المنتج *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: بطاطس بلدية، طماطم..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">التصنيف *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none bg-white"
                  >
                    {CATEGORIES_CONFIG.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">سعر البيع (DH) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المخزون الحالي *</label>
                  <input
                    type="number"
                    step={formData.type === 'weight' ? '0.5' : '1'}
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نوع البيع</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as any,
                        unit_label: e.target.value === 'unit' ? 'حبة' : 'kg',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none bg-white"
                  >
                    <option value="weight">وزن (كغم)</option>
                    <option value="unit">وحدة / حبة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المنشأ / المنطقة</label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="مثال: الشاوية، سايس، الغرب..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رابط الصورة (Image URL)</label>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="/images/products/vegetables/potato.webp"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">الوصف التسويقي للمنتج</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مميزات الطراوة واستخدامات الطبخ..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* شارات وخيارات التسويق */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-stone-100 text-xs font-bold text-stone-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>متاح للبيع في المتجر</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_bestseller}
                    onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
                    className="rounded text-amber-600"
                  />
                  <span>الأكثر مبيعاً ⭐</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_seasonal}
                    onChange={(e) => setFormData({ ...formData, is_seasonal: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>منتج موسمي 🌿</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── نافذة تسجيل حركة توريد صباحي وإضافة مخزون ─── */}
      <InventoryMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        products={products}
        targetProduct={targetMovementProduct}
        initialType={movementModalType}
        onSaveMovement={handleSaveInventoryMovement}
      />

      {/* ─── نافذة سجل تدقيق حركات المخزون ─── */}
      <InventoryLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        targetProductId={targetLedgerProductId}
      />
    </div>
  );
};
