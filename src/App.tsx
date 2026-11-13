// ============================================================
// App.tsx – الإصدار 4.1
// يدمج CategoryHeader داخل CategoryFilter + ScrollToTopButton + هيكلية مجلدات منظمة
// ============================================================
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { RotateCcw, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import {
  Header,
  Footer,
  StickyBottomBar,
  ScrollToTopButton,
  FreeDeliveryBanner,
  InstallAppBanner,
  checkIfAlreadyInstalledOrDownloaded,
} from './components/layout';
import { AdminSessionProvider } from './features/layout'; // Correct path
import {
  Hero,
  CategoryFilter,
  ProductCard,
  type FamilyBox,
  TrustBadges,
  SortOption,
} from './components/shop';
import { ExitScreen } from './components/common';
import { AdminErrorBoundary } from './features/layout/AdminErrorBoundary';
import {
  verifyAdminPinRemote,
  clearCachedAdminPin,
  validateAdminSessionRemote,
  isLocalAdminSessionValid,
} from './services/supabaseService';
import { calculateCustomerDeliveryFee } from './services/financialEngine';

// ─── دالة مساعدة لتحميل المكونات المؤجلة بأمان مع محاولة إعادة تلقائية في حال انقطاع الشبكة ───
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.warn('Chunk import failed, retrying in 350ms...', error);
      await new Promise((r) => setTimeout(r, 350));
      return await factory();
    }
  });
}

// ─── عازل أخطاء خفيف لحماية قسم آراء الزبائن دون التأثير على بقية المتجر ───
class ReviewsSectionBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('⚠️ تعذر تحميل قسم آراء الزبائن مؤقتاً:', err);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── تحميل مؤجل للمودالات لتقليص الحجم الأولي وتسريع ظهور الصفحة الرئيسية ───
const CartDrawer = lazyWithRetry(() =>
  import('./components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);
const CheckoutModal = lazyWithRetry(() =>
  import('./components/checkout/CheckoutModal').then((m) => ({ default: m.CheckoutModal }))
);
const ConfirmationModal = lazyWithRetry(() =>
  import('./components/checkout/ConfirmationModal').then((m) => ({ default: m.ConfirmationModal }))
);
const ExitConfirmationModal = lazyWithRetry(() =>
  import('./components/common/ExitConfirmationModal').then((m) => ({ default: m.ExitConfirmationModal }))
);
const SortFilterModal = lazyWithRetry(() =>
  import('./components/shop/SortFilterModal').then((m) => ({ default: m.SortFilterModal }))
);

import { CustomerReviews } from './components/reviews/CustomerReviews';

// ─── تحميل مؤجل للمكونات الثقيلة واللوحة الإدارية والتقييمات ───
const FamilyBoxesSection = lazyWithRetry(() =>
  import('./components/shop/FamilyBoxesSection').then((m) => ({ default: m.FamilyBoxesSection }))
);
const AdminBottomDashboard = lazyWithRetry(() =>
  import('./features/layout/AdminBottomDashboard').then((m) => ({ default: m.AdminBottomDashboard }))
);
const AdminOrdersPanel = lazyWithRetry(() =>
  import('./features/admin-orders/AdminOrdersPanel').then((m) => ({ default: m.AdminOrdersPanel }))
);
const AdminPageLayout = lazyWithRetry(() =>
  import('./features/layout/AdminPageLayout').then((m) => ({ default: m.AdminPageLayout }))
);
const FinancePanel = lazyWithRetry(() =>
  import('./features/finance/FinancePanel').then((m) => ({ default: m.FinancePanel }))
);
const AdminDeliveryFleetTab = lazyWithRetry(() =>
  import('./features/delivery-fleet/AdminDeliveryFleetTab').then((m) => ({ default: m.AdminDeliveryFleetTab }))
);
const AdminDocumentsModal = lazyWithRetry(() =>
  import('./features/documents/AdminDocumentsModal').then((m) => ({ default: m.AdminDocumentsModal }))
);
const AdminInventoryPanel = lazyWithRetry(() =>
  import('./features/products-inventory/AdminInventoryPanel').then((m) => ({ default: m.AdminInventoryPanel }))
);
const AIMarketingCenter = lazyWithRetry(() =>
  import('./features/ai-marketing/AIMarketingCenter').then((m) => ({ default: m.AIMarketingCenter }))
);
const PricingForecastPanel = lazyWithRetry(() =>
  import('./features/pricing-forecast').then((m) => ({ default: m.PricingForecastPanel }))
);
const PinModal = lazyWithRetry(() =>
  import('./features/modals/AdminReviewModals').then((m) => ({ default: m.PinModal }))
);
const KhodraAICopilotModal = lazyWithRetry(() =>
  import('./features/copilot/KhodraAICopilotModal').then((m) => ({ default: m.KhodraAICopilotModal }))
);

// ─── تحميل مؤجل للصفحات الإضافية ───
const InfoPages = lazyWithRetry(() =>
  import('./components/common/InfoPages').then((module) => ({ default: module.InfoPages }))
);

import { Product, CartItem, ProductCategory, OrderSubmission } from './types';
import { fetchProducts, submitOrder, getSupabase } from './services/supabaseService';
import { STORE_CONFIG } from './data/config';
import { CATEGORIES_CONFIG } from './data/mockProducts';
import type { AdminRoute } from './features';

function parseAdminRoute(): AdminRoute | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin') as AdminRoute | null;
    if (adminParam && ['orders', 'fleet', 'inventory', 'pricing', 'marketing', 'finance'].includes(adminParam)) {
      return adminParam;
    }
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (path === 'admin' || path === 'admin/orders') return 'orders';
    if (path === 'admin/fleet' || path === 'admin/delivery' || path === 'admin/routes') return 'fleet';
    if (path === 'admin/inventory' || path === 'admin/stock' || path === 'admin/products') return 'inventory';
    if (path === 'admin/pricing') return 'pricing';
    if (path === 'admin/marketing' || path === 'admin/ai') return 'marketing';
    if (path === 'admin/finance') return 'finance';
  } catch {}
  return null;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Cart state (مع ترحيل تلقائي لأي عناصر قديمة لتوحيد الوزن في العداد) ───
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORE_CONFIG.cacheKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const valid = parsed.filter(
        (item: any) =>
          item &&
          typeof item === 'object' &&
          typeof item.name === 'string' &&
          typeof item.qty === 'number' &&
          item.qty > 0 &&
          typeof item.lineTotal === 'number' &&
          !isNaN(item.lineTotal)
      );


      // توحيد العناصر القديمة التي كانت تخزن "4 kg" في variantLabel و qty=1
      const mergedMap = new Map<string, CartItem>();
      for (const raw of valid) {
        let unitLabel = String(raw.variantLabel || '');
        let qty = Number(raw.qty) || 1;
        let unitTotal = Number(raw.unitTotal) || +(raw.lineTotal / qty).toFixed(2);

        const weightMatch = unitLabel.match(/^(\d+(?:\.\d+)?)\s*kg$/i);
        const unitMatch = unitLabel.match(/^(\d+)\s*×\s*(.+)$/);

        if (weightMatch) {
          const baseWeight = parseFloat(weightMatch[1]) || 1;
          unitTotal = baseWeight > 0 ? +(unitTotal / baseWeight).toFixed(2) : unitTotal;
          qty = baseWeight * qty;
          unitLabel = 'kg';
        } else if (unitMatch) {
          const baseCount = parseInt(unitMatch[1], 10) || 1;
          unitTotal = baseCount > 0 ? +(unitTotal / baseCount).toFixed(2) : unitTotal;
          qty = baseCount * qty;
          unitLabel = unitMatch[2].trim() || 'وحدة';
        }

        const cleanKey = raw.bundleId ? `bundle|${raw.bundleId}` : String(raw.id);
        const existing = mergedMap.get(cleanKey);
        if (existing) {
          const totalQty = existing.qty + qty;
          mergedMap.set(cleanKey, {
            ...existing,
            qty: totalQty,
            lineTotal: +(existing.unitTotal * totalQty).toFixed(2),
          });
        } else {
          mergedMap.set(cleanKey, {
            ...raw,
            key: cleanKey,
            variantLabel: unitLabel,
            unitTotal,
            qty,
            lineTotal: +(unitTotal * qty).toFixed(2),
          });
        }
      }

      return Array.from(mergedMap.values());
    } catch {
      return [];
    }
  });

  // ─── Navigation & filter states (مع دعم الروابط المخصصة لـ SEO) ───
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category') as ProductCategory | null;
      const validCats: ProductCategory[] = ['all', 'veg', 'fruit', 'dairy', 'grocery', 'drinks', 'cleaning'];
      if (catParam && validCats.includes(catParam)) return catParam;

      const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      const pathMap: Record<string, ProductCategory> = {
        veg: 'veg',
        vegetables: 'veg',
        fruit: 'fruit',
        fruits: 'fruit',
        dairy: 'dairy',
        grocery: 'grocery',
        drinks: 'drinks',
        cleaning: 'cleaning',
      };
      if (pathMap[path]) return pathMap[path];
    } catch {}
    return 'all';
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('s') || params.get('q') || '';
    } catch {
      return '';
    }
  });

  const [activeInfoPage, setActiveInfoPage] = useState<'about' | 'policy' | 'privacy' | null>(() => {
    try {
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      if (path === 'about' || path === 'policy' || path === 'privacy') return path;
    } catch {}
    return null;
  });

  const [activeAdminRoute, setActiveAdminRoute] = useState<AdminRoute | null>(parseAdminRoute);
  const activeAdminRouteRef = useRef<AdminRoute | null>(activeAdminRoute);
  activeAdminRouteRef.current = activeAdminRoute;
  const [adminFocusedProductId, setAdminFocusedProductId] = useState<number | null>(null);

  // حالتا فتح النافذتين المستقلتين للأداتين 7 (Copilot) و 8 (Documents)
  const [isCopilotModalOpen, setIsCopilotModalOpen] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'copilot') return true;
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      return path === 'admin/copilot' || path === 'admin/ai-copilot';
    } catch {
      return false;
    }
  });
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'documents') return true;
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      return path === 'admin/documents' || path === 'admin/contrats';
    } catch {
      return false;
    }
  });

  const handleNavigateAdmin = useCallback((route: AdminRoute, productId?: number) => {
    setActiveAdminRoute(route);
    if (productId !== undefined && productId !== null) {
      setAdminFocusedProductId(productId);
    }
    try {
      sessionStorage.setItem('khodra_admin_last_activity', String(Date.now()));
    } catch {}
    window.history.pushState({ admin: route, productId }, '', `/admin/${route}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleOpenCopilot = () => setIsCopilotModalOpen(true);
    const handleOpenDocs = () => setIsDocumentsModalOpen(true);

    window.addEventListener('khodra_open_copilot_modal', handleOpenCopilot);
    window.addEventListener('khodra_open_documents_modal', handleOpenDocs);

    return () => {
      window.removeEventListener('khodra_open_copilot_modal', handleOpenCopilot);
      window.removeEventListener('khodra_open_documents_modal', handleOpenDocs);
    };
  }, []);

  useEffect(() => {
    const handleAdminRouteChanged = (e: any) => {
      const route = e?.detail;
      if (route) {
        handleNavigateAdmin(route as AdminRoute);
      }
    };
    const handleOpenPricing = (e: any) => {
      const pid = e?.detail?.productId;
      if (pid != null) {
        setAdminFocusedProductId(Number(pid));
        handleNavigateAdmin('pricing', Number(pid));
      }
    };
    const handleOpenInventory = (e: any) => {
      const pid = e?.detail?.productId;
      if (pid != null) {
        setAdminFocusedProductId(Number(pid));
        handleNavigateAdmin('inventory', Number(pid));
      }
    };

    window.addEventListener('khodra_admin_route_changed', handleAdminRouteChanged);
    window.addEventListener('khodra_open_pricing_for_product', handleOpenPricing);
    window.addEventListener('khodra_open_inventory_for_product', handleOpenInventory);

    return () => {
      window.removeEventListener('khodra_admin_route_changed', handleAdminRouteChanged);
      window.removeEventListener('khodra_open_pricing_for_product', handleOpenPricing);
      window.removeEventListener('khodra_open_inventory_for_product', handleOpenInventory);
    };
  }, [handleNavigateAdmin]);

  const handleReturnToStore = useCallback(() => {
    setActiveAdminRoute(null);
    window.history.pushState({ page: 'main' }, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleExitToBottomDashboard = useCallback(() => {
    setActiveAdminRoute(null);
    window.history.pushState({ page: 'main' }, '', '/');

    // التحقق الموحد من صلاحية الجلسة قبل منح أو استبقاء صلاحيات الإدارة
    if (!isLocalAdminSessionValid()) {
      handleAdminLogout();
      return;
    }

    setIsAdmin(true);
    try {
      sessionStorage.setItem('khodra_admin_auth', 'true');
      sessionStorage.setItem('khodra_admin_last_activity', String(Date.now()));
    } catch {}

    // محاولة تمرير متتالية تضمن الوصول إلى قسم الإدارة السفلي (Bottom Dashboard) حتى بعد تحميل Suspense
    let attempts = 0;
    const maxAttempts = 20;
    const tryScroll = () => {
      attempts++;
      const el = document.getElementById('admin-dashboard-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // تأكيد التمرير بعد استقرار حجم الصفحة
        setTimeout(() => {
          const reCheck = document.getElementById('admin-dashboard-section');
          if (reCheck) {
            reCheck.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 250);
      } else if (attempts < maxAttempts) {
        setTimeout(tryScroll, 100);
      }
    };
    setTimeout(tryScroll, 80);
  }, []);

  // ─── تحديث عنوان الصفحة والوصف والروابط تلقائياً لتحسين SEO ───
  useEffect(() => {
    try {
      let pageTitle = 'خُضرة - متجر الخضار والفواكه الطازجة بفاس';
      let pageDesc =
        'متجر خُضرة الإلكتروني لتسوق الخضروات والفواكه الطازجة ومنتجات البقالة والألبان مع التوصيل السريع والدفع عند الاستلام في مدينة فاس ونواحيها.';
      let canonicalPath = '/';

      if (activeAdminRoute) {
        if (activeAdminRoute === 'orders') {
          pageTitle = 'إدارة الطلبات | خُضرة فاس';
          pageDesc = 'لوحة التحكم ومتابعة وتجهيز طلبات الخضار والفواكه وطباعة بوليصات الشحن بفاس.';
          canonicalPath = '/admin/orders';
        } else if (activeAdminRoute === 'fleet') {
          pageTitle = 'مسارات التوصيل وفريق السائقين | خُضرة فاس';
          pageDesc = 'لوحة إدارة مسارات التوصيل الذكية وكباتن التوصيل السريع وتوزيع المناطق بمدينة فاس.';
          canonicalPath = '/admin/fleet';
        } else if (activeAdminRoute === 'finance') {
          pageTitle = 'اللوحة المالية والتوقعات | خُضرة فاس';
          pageDesc = 'توقعات التدفقات النقدية ونموذج عمل متجر خُضرة بفاس وخطة 12 شهراً.';
          canonicalPath = '/admin/finance';
        } else if (activeAdminRoute === 'inventory') {
          pageTitle = 'المنتجات والمخزون الحي | خُضرة فاس';
          pageDesc = 'لوحة إدارة المخزون اللحظي وتحديث السلع والكميات والأسعار بمتجر خُضرة.';
          canonicalPath = '/admin/inventory';
        } else if (activeAdminRoute === 'pricing') {
          pageTitle = 'التسعير وتوقع الطلب | خُضرة فاس';
          pageDesc = 'لوحة التسعير الصباحي اليومي من سوق بنسودة وتوقعات الطلب الذكية JIT.';
          canonicalPath = '/admin/pricing';
        } else if (activeAdminRoute === 'marketing') {
          pageTitle = 'مركز النشر والتسويق | خُضرة فاس';
          pageDesc = 'توليد ونشر عروض اليوم الذكية من سوق بنسودة وإرسالها لواتساب وشبكات التواصل.';
          canonicalPath = '/admin/marketing';
        }
      } else if (activeInfoPage === 'about') {
        pageTitle = 'من نحن | متجر خُضرة بفاس';
        pageDesc = 'تعرف على متجر خُضرة لبيع وتوصيل الخضار والفواكه الطازجة يومياً من سوق بنسودة إلى باب منزلك بمدينة فاس.';
        canonicalPath = '/about';
      } else if (activeInfoPage === 'policy') {
        pageTitle = 'سياسة التوصيل والاسترجاع | متجر خُضرة بفاس';
        pageDesc = 'تعرف على مواعيد ومسارات التوصيل الفوري في مدينة فاس وضمان الجودة والاستبدال من متجر خُضرة.';
        canonicalPath = '/policy';
      } else if (activeInfoPage === 'privacy') {
        pageTitle = 'سياسة الخصوصية | متجر خُضرة بفاس';
        pageDesc = 'حماية بيانات العملاء والخصوصية في متجر خُضرة للتسوق الإلكتروني بمدينة فاس.';
        canonicalPath = '/privacy';
      } else if (selectedCategory !== 'all') {
        const catObj = CATEGORIES_CONFIG.find((c) => c.id === selectedCategory);
        if (catObj) {
          pageTitle = `${catObj.name} طازجة بتوصيل سريع في فاس | متجر خُضرة`;
          pageDesc = `${catObj.description} اطلب الآن من متجر خُضرة مع توصيل فوري لباب منزلك في فاس والدفع عند الاستلام.`;
          canonicalPath = `/?category=${selectedCategory}`;
        }
      }

      document.title = pageTitle;
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute('content', pageDesc);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', pageTitle);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', pageDesc);
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink) {
        canonicalLink.setAttribute('href', `https://khodrafresh.vercel.app${canonicalPath}`);
      }
    } catch {}
  }, [selectedCategory, activeInfoPage, activeAdminRoute]);

  // ─── Sorting and in-stock filter ───
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);

  // ─── Products pagination (12 products default to align with 2/3/4 grid columns) ───
  const INITIAL_VISIBLE_COUNT = 12;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_COUNT);

  // Reset pagination when category, search, or filters change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [selectedCategory, searchQuery, sortBy, onlyInStock]);

  // ─── Modals & Drawers ───
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderSubmission | null>(null);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [selectedFamilyBox, setSelectedFamilyBox] = useState<FamilyBox | null>(null);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isAdminOrdersOpen, setIsAdminOrdersOpen] = useState(false);
  const [isAppExited, setIsAppExited] = useState(false);
  const [isInstallBannerVisible, setIsInstallBannerVisible] = useState<boolean>(() => !checkIfAlreadyInstalledOrDownloaded());

  // ─── وضع المدير (Admin Mode) أسفل الفوتر ───
  const [isAdmin, setIsAdmin] = useState<boolean>(isLocalAdminSessionValid);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);

  const handleAdminLogout = useCallback(() => {
    setIsAdmin(false);
    setIsAdminOrdersOpen(false);
    setActiveAdminRoute(null);
    clearCachedAdminPin();
    try {
      sessionStorage.removeItem('khodra_admin_auth');
      sessionStorage.removeItem('khodra_admin_pin_session');
      sessionStorage.removeItem('khodra_admin_last_activity');
      localStorage.removeItem('khodra_admin_auth');
      window.history.pushState({ page: 'main' }, '', '/');
    } catch {}
    window.dispatchEvent(new CustomEvent('khodra_admin_auth_revoked'));
    window.dispatchEvent(new CustomEvent('khodra_admin_auth_changed'));
  }, []);

  // التحقق المركزي الصارم عند إقلاع التطبيق وعند العودة إلى التبويب
  useEffect(() => {
    const verifyCurrentSession = async () => {
      // تنظيف أي بقايا محلية قديمة في localStorage دائماً
      try {
        localStorage.removeItem('khodra_admin_auth');
        localStorage.removeItem('khodra_admin_custom_pin_v2');
      } catch {}

      if (isLocalAdminSessionValid()) {
        const isValid = await validateAdminSessionRemote();
        if (!isValid) {
          handleAdminLogout();
        }
      } else {
        setIsAdmin(false);
      }
    };

    verifyCurrentSession();

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible' && isLocalAdminSessionValid()) {
        try {
          const isValid = await validateAdminSessionRemote();
          if (!isValid) {
            handleAdminLogout();
          }
        } catch (err) {
          console.warn('⚠️ تعذر التحقق من الجلسة (قد يكون خطأ شبكة)، الإبقاء على وضع المدير:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [handleAdminLogout]);

  useEffect(() => {
    const handleAdminTrigger = () => {
      if (isAdmin) {
        const el = document.getElementById('admin-dashboard-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        setIsAdminPinModalOpen(true);
      }
    };

    const handleAuthChanged = () => {
      setIsAdmin(isLocalAdminSessionValid());
    };

    const handleRevoked = () => {
      setIsAdmin(false);
      setIsAdminOrdersOpen(false);
    };

    window.addEventListener('khodra_trigger_admin_modal', handleAdminTrigger);
    window.addEventListener('khodra_admin_auth_changed', handleAuthChanged);
    window.addEventListener('khodra_admin_auth_revoked', handleRevoked);
    return () => {
      window.removeEventListener('khodra_trigger_admin_modal', handleAdminTrigger);
      window.removeEventListener('khodra_admin_auth_changed', handleAuthChanged);
      window.removeEventListener('khodra_admin_auth_revoked', handleRevoked);
    };
  }, [isAdmin]);

  const handleAdminPinLogin = async (pin: string): Promise<boolean> => {
    const res = await verifyAdminPinRemote(pin.trim());
    if (res.valid) {
      setIsAdmin(true);
      try {
        sessionStorage.setItem('khodra_admin_auth', 'true');
        localStorage.removeItem('khodra_admin_auth');
      } catch {}
      window.dispatchEvent(new CustomEvent('khodra_admin_auth_changed'));
      try {
        sessionStorage.setItem('khodra_admin_last_activity', String(Date.now()));
      } catch {}
      setIsAdminPinModalOpen(false);
      setTimeout(() => {
        const el = document.getElementById('admin-dashboard-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      return true;
    }
    return false;
  };

  // ─── Refs ───
  const prevStatesRef = useRef({
    isMenuOpen: false,
    isCartOpen: false,
    isCheckoutOpen: false,
    confirmedOrder: null as OrderSubmission | null,
    activeInfoPage: null as 'about' | 'policy' | 'privacy' | null,
    isSortModalOpen: false,
    selectedFamilyBox: null as FamilyBox | null,
    isExitConfirmOpen: false,
    isAdminOrdersOpen: false,
  });

  const searchResultsRef = useRef<HTMLDivElement>(null);
  const catalogSectionRef = useRef<HTMLDivElement>(null);
  const bundlesSectionRef = useRef<HTMLDivElement>(null);

  // ─── Load products & Live Dynamic Price Sync ───
  useEffect(() => {
    let mounted = true;
    fetchProducts().then((data) => {
      if (mounted) {
        setProducts(data);
        setIsLoading(false);
      }
    });

    // 1. الاستماع الفوري لأحداث تحديث الأسعار داخل المتصفح (تطبيق فوري بدون إعادة تحميل)
    const handlePricesUpdated = (e: any) => {
      const updates = e?.detail?.updates;
      if (Array.isArray(updates) && updates.length > 0) {
        const priceMap = new Map<number, number>();
        updates.forEach((u: any) => {
          if (u.productId != null && u.sellingPrice != null) {
            priceMap.set(Number(u.productId), Number(u.sellingPrice));
          }
        });

        setProducts((prev) =>
          prev.map((p) => {
            if (priceMap.has(p.id)) {
              return { ...p, price: priceMap.get(p.id)! };
            }
            return p;
          })
        );

        // تحديث أسعار العناصر في السلة إن كانت متواجدة
        setCart((prevCart) =>
          prevCart.map((item) => {
            if (priceMap.has(item.id)) {
              const newUnit = priceMap.get(item.id)!;
              return {
                ...item,
                unitTotal: newUnit,
                lineTotal: Number((newUnit * item.qty).toFixed(2)),
              };
            }
            return item;
          })
        );
      }
    };

    // الاستماع الفوري لتحديثات توفر المنتجات (متوفر / غير متوفر)
    const handleAvailabilityUpdated = (e: any) => {
      const { productId, isAvailable } = e?.detail || {};
      if (productId != null && isAvailable != null) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === Number(productId)
              ? { ...p, active: Boolean(isAvailable), is_available: Boolean(isAvailable) }
              : p
          )
        );
      }
    };

    const handleProductUpdated = (e: any) => {
      const updated = e?.detail;
      if (updated && updated.id) {
        setProducts((prev) => {
          const idx = prev.findIndex((p) => p.id === updated.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...updated };
            return next;
          }
          return [...prev, updated];
        });
      }
    };

    const handleStockChanged = (e: any) => {
      const { id, stock, is_available } = e?.detail || {};
      if (id != null) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === Number(id)
              ? {
                  ...p,
                  stock: Number(stock),
                  is_available: Boolean(is_available),
                  active: Boolean(is_available),
                }
              : p
          )
        );
      }
    };

    const handleProductDeleted = (e: any) => {
      const { id } = e?.detail || {};
      if (id != null) {
        setProducts((prev) =>
          prev.map((p) => (p.id === Number(id) ? { ...p, active: false, is_available: false, stock: 0 } : p))
        );
      }
    };

    window.addEventListener('khodra_prices_updated', handlePricesUpdated);
    window.addEventListener('khodra_products_availability_updated', handleAvailabilityUpdated);
    window.addEventListener('khodra_products_updated', handleProductUpdated);
    window.addEventListener('khodra_product_stock_changed', handleStockChanged);
    window.addEventListener('khodra_product_deleted', handleProductDeleted);

    // 2. اشتراك سحابي لحظي (Supabase Realtime) لتحديث المتجر فورياً في شاشات جميع العملاء
    const client = getSupabase();
    let channel: any = null;
    if (client) {
      try {
        channel = client
          .channel('khodra_realtime_products_prices')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'daily_prices' },
            () => {
              if (mounted) fetchProducts().then((data) => setProducts(data));
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            () => {
              if (mounted) fetchProducts().then((data) => setProducts(data));
            }
          )
          .subscribe();
      } catch (rtErr) {
        console.warn('Realtime subscription handled gracefully:', rtErr);
      }
    }

    return () => {
      mounted = false;
      window.removeEventListener('khodra_prices_updated', handlePricesUpdated);
      window.removeEventListener('khodra_products_availability_updated', handleAvailabilityUpdated);
      window.removeEventListener('khodra_products_updated', handleProductUpdated);
      window.removeEventListener('khodra_product_stock_changed', handleStockChanged);
      window.removeEventListener('khodra_product_deleted', handleProductDeleted);
      if (client && channel) {
        client.removeChannel(channel);
      }
    };
  }, []);

  // ─── Sync cart to local storage ───
  useEffect(() => {
    try {
      localStorage.setItem(STORE_CONFIG.cacheKey, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // ─── استقبال أحداث فتح وإغلاق لوحة الإدارة المركزية ───
  useEffect(() => {
    const handleAdminRouteEvent = (e: any) => {
      if (e?.detail) handleNavigateAdmin(e.detail);
    };
    const handleOpenOrders = () => handleNavigateAdmin('orders');
    const handleOpenFinance = () => handleNavigateAdmin('finance');

    window.addEventListener('khodra_admin_route_changed', handleAdminRouteEvent);
    window.addEventListener('khodra_open_admin_orders', handleOpenOrders);
    window.addEventListener('khodra_open_finance_panel', handleOpenFinance);

    return () => {
      window.removeEventListener('khodra_admin_route_changed', handleAdminRouteEvent);
      window.removeEventListener('khodra_open_admin_orders', handleOpenOrders);
      window.removeEventListener('khodra_open_finance_panel', handleOpenFinance);
    };
  }, [handleNavigateAdmin]);

  // ─── Handle browser / mobile hardware back button ───
  useEffect(() => {
    // إرسال حالة رئيسية للتاريخ لضمان التقاط زر الرجوع
    window.history.replaceState({ page: 'main' }, '');
    window.history.pushState({ page: 'main' }, '');

    const handlePopState = () => {
      // 0. إذا كان مسار الإدارة مفتوحاً: التحقق من صلاحية الجلسة لمنع أي تجاوز عبر زر الرجوع
      const newAdminRoute = parseAdminRoute();
      if (newAdminRoute) {
        if (!isLocalAdminSessionValid()) {
          handleAdminLogout();
          return;
        }
        setActiveAdminRoute(newAdminRoute);
        return;
      } else if (activeAdminRouteRef.current) {
        handleExitToBottomDashboard();
        return;
      }

      // 0.1 إذا كانت لوحة إدارة الطلبات مفتوحة: زر الرجوع يغلقها فقط ويعود للمتجر بأمان بدون أي خروج من التطبيق!
      if (isAdminOrdersOpen) {
        setIsAdminOrdersOpen(false);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 1. إذا كانت نافذة تأكيد الخروج مفتوحة: زر الرجوع يلغيها ويبقي العميل في المتجر
      if (isExitConfirmOpen) {
        setIsExitConfirmOpen(false);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 2. إذا كانت نافذة تفاصيل صندوق العائلة مفتوحة: زر الرجوع يغلقها فقط ولا يخرج من المتجر!
      if (selectedFamilyBox) {
        setSelectedFamilyBox(null);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 3. إذا كانت نافذة إتمام الطلب مفتوحة: إغلاقها والعودة
      if (isCheckoutOpen) {
        setIsCheckoutOpen(false);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 4. إذا كانت سلة المشتريات مفتوحة: إغلاقها
      if (isCartOpen) {
        setIsCartOpen(false);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 5. إذا كانت نافذة تأكيد الطلب مفتوحة: إغلاقها
      if (confirmedOrder) {
        setConfirmedOrder(null);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 6. إذا كانت صفحة معلومات مفتوحة: العودة للمتجر
      if (activeInfoPage) {
        setActiveInfoPage(null);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 7. إذا كانت نافذة الفرز والتصفية مفتوحة: إغلاقها
      if (isSortModalOpen) {
        setIsSortModalOpen(false);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 8. إذا كانت القائمة الجانبية مفتوحة: إغلاقها
      if (isMenuOpen) {
        setIsMenuOpen(false);
        window.history.pushState({ page: 'main' }, '');
        return;
      }

      // 9. إذا لم تكن هناك أي نافذة مفتوحة وكان العميل بالصفحة الرئيسية:
      // تفعيل خاصية "هل تريد الخروج من التطبيق؟" للتأكيد ومنع الخروج المفاجئ
      setIsExitConfirmOpen(true);
      window.history.pushState({ page: 'main' }, '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    activeAdminRoute,
    isAdminOrdersOpen,
    isExitConfirmOpen,
    selectedFamilyBox,
    isCheckoutOpen,
    isCartOpen,
    confirmedOrder,
    activeInfoPage,
    isSortModalOpen,
    isMenuOpen,
  ]);

  // ─── Push history state when modal opens ───
  useEffect(() => {
    const prev = prevStatesRef.current;
    const currentHasOpen =
      isMenuOpen ||
      isCartOpen ||
      isCheckoutOpen ||
      !!confirmedOrder ||
      !!activeInfoPage ||
      isSortModalOpen ||
      !!selectedFamilyBox ||
      isExitConfirmOpen ||
      isAdminOrdersOpen;

    const prevHasOpen =
      prev.isMenuOpen ||
      prev.isCartOpen ||
      prev.isCheckoutOpen ||
      !!prev.confirmedOrder ||
      !!prev.activeInfoPage ||
      prev.isSortModalOpen ||
      !!prev.selectedFamilyBox ||
      prev.isExitConfirmOpen ||
      prev.isAdminOrdersOpen;

    if (currentHasOpen && !prevHasOpen) {
      window.history.pushState({ page: 'modal' }, '');
    }

    prevStatesRef.current = {
      isMenuOpen,
      isCartOpen,
      isCheckoutOpen,
      confirmedOrder,
      activeInfoPage,
      isSortModalOpen,
      selectedFamilyBox,
      isExitConfirmOpen,
      isAdminOrdersOpen,
    };
  }, [
    isMenuOpen,
    isCartOpen,
    isCheckoutOpen,
    confirmedOrder,
    activeInfoPage,
    isSortModalOpen,
    selectedFamilyBox,
    isExitConfirmOpen,
    isAdminOrdersOpen,
  ]);

  // ─── حماية السلة عند محاولة مغادرة الصفحة أو إغلاق التبويب (beforeunload) ───
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart]);

  // ─── Menu controls ───
  const handleToggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const handleCloseMenu = () => setIsMenuOpen(false);

  // ─── Cart helpers ───
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);

  // خريطة سريعة O(1) لكميات المنتجات في السلة لتسريع العرض وتجنب الحلقات التكرارية
  const cartQtyByIdMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      map.set(item.id, (map.get(item.id) || 0) + item.qty);
    }
    return map;
  }, [cart]);

  const handleAddToCart = useCallback((product: Product, quantity: number) => {
    const isWeight = product.type === 'weight';
    const variantLabel = isWeight ? 'kg' : (product.unit_label || 'وحدة');
    const key = String(product.id);
    const unitPrice = +product.price.toFixed(2);

    setCart((prev) => {
      const index = prev.findIndex((i) => i.key === key || i.id === product.id);
      if (index >= 0) {
        const next = [...prev];
        const existing = next[index];
        const newQty = +(existing.qty + quantity).toFixed(2);
        next[index] = {
          ...existing,
          key,
          variantLabel,
          unitTotal: unitPrice,
          qty: newQty,
          lineTotal: +(unitPrice * newQty).toFixed(2),
        };
        return next;
      }

      const cleanQuantity = +quantity.toFixed(2);
      const newItem: CartItem = {
        key,
        id: product.id,
        name: product.name,
        icon: product.icon,
        image_url: product.image_url,
        variantLabel,
        unitTotal: unitPrice,
        qty: cleanQuantity,
        lineTotal: +(unitPrice * cleanQuantity).toFixed(2),
      };
      return [...prev, newItem];
    });
  }, []);

  const handleUpdateCartQty = useCallback((key: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.key !== key) return item;
          const newQty = +(item.qty + delta).toFixed(2);
          if (newQty <= 0) return null;
          const unitPrice = item.unitTotal > 0 ? item.unitTotal : (item.lineTotal / item.qty);
          return {
            ...item,
            qty: newQty,
            lineTotal: +(unitPrice * newQty).toFixed(2),
          };
        })
        .filter(Boolean) as CartItem[];
    });
  }, []);

  const handleRemoveFromCart = useCallback((key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const handleClearCart = useCallback(() => setCart([]), []);

  // ─── Order submission ───
  const handleOrderSubmission = async (order: OrderSubmission) => {
    const result = await submitOrder(order);

    if (!result.success) {
      console.error('❌ فشل حفظ الطلب:', result.message, result.errorCode);
      const errorMessage =
        result.message ||
        `تعذّر حفظ الطلب في قاعدة البيانات. يرجى المحاولة مجدداً أو التواصل عبر واتساب: ${STORE_CONFIG.whatsappNumber}`;
      throw new Error(errorMessage);
    }

    setConfirmedOrder(order);
    setIsCheckoutOpen(false);
    setCart([]);
  };

  // ─── Search handlers ───
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setTimeout(() => scrollToSearchResults(), 150);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) scrollToSearchResults();
  };

  // ─── Unified section navigation & scroll helpers ───
  const categoryFilterRef = useRef<HTMLDivElement>(null);

  const navigateToSection = useCallback(
    (targetId: 'category-filter-section' | 'catalog-section' | 'family-boxes-section' | 'customer-reviews-section' | 'admin-dashboard-section') => {
      // إغلاق أي صفحات أو نوافذ منبثقة نشطة
      if (activeInfoPage) setActiveInfoPage(null);
      if (isMenuOpen) setIsMenuOpen(false);
      if (isCartOpen) setIsCartOpen(false);
      if (isSortModalOpen) setIsSortModalOpen(false);

      let attempts = 0;
      const maxAttempts = 15;
      const attemptScroll = () => {
        attempts++;
        let targetEl: HTMLElement | null = null;
        if (targetId === 'category-filter-section') {
          targetEl = categoryFilterRef.current || document.getElementById('category-filter-section');
        } else if (targetId === 'catalog-section') {
          targetEl = document.getElementById('search-results-section') || searchResultsRef.current || document.getElementById('catalog-section') || catalogSectionRef.current;
        } else if (targetId === 'family-boxes-section') {
          targetEl = document.getElementById('family-boxes-section') || bundlesSectionRef.current || document.getElementById('family-bundles-section');
        } else if (targetId === 'customer-reviews-section') {
          targetEl = document.getElementById('customer-reviews-section');
        } else if (targetId === 'admin-dashboard-section') {
          targetEl = document.getElementById('admin-dashboard-section');
        }

        if (targetEl) {
          const headerEl = document.querySelector('header');
          const headerHeight = headerEl ? headerEl.offsetHeight : 72;
          const rect = targetEl.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - headerHeight - 12;

          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth',
          });
        } else if (attempts < maxAttempts) {
          setTimeout(attemptScroll, 80);
        }
      };

      setTimeout(attemptScroll, 100);
    },
    [activeInfoPage, isMenuOpen, isCartOpen, isSortModalOpen]
  );

  const scrollToSearchResults = () => {
    if (searchResultsRef.current) {
      const headerEl = document.querySelector('header');
      const headerHeight = headerEl ? headerEl.offsetHeight : 72;
      const rect = searchResultsRef.current.getBoundingClientRect();
      const targetY = window.pageYOffset + rect.top - headerHeight - 12;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth',
      });
    }
  };

  const scrollToCategoryFilter = useCallback(() => {
    navigateToSection('category-filter-section');
  }, [navigateToSection]);

  const scrollToCatalog = useCallback(() => {
    navigateToSection('catalog-section');
  }, [navigateToSection]);

  const scrollToBundles = useCallback(() => {
    navigateToSection('family-boxes-section');
  }, [navigateToSection]);

  // ─── Category selection ───
  const handleSelectCategory = (cat: ProductCategory, _fromCategoryFilter = false) => {
    if (isMenuOpen) setIsMenuOpen(false);
    if (searchQuery.trim().length > 0) setSearchQuery('');
    setSelectedCategory(cat);
    if (activeInfoPage) setActiveInfoPage(null);

    // تنقل تلقائي سلس ومباشر إلى قسم بطاقات المنتجات (Products Cards) الخاصة بتلك الفئة
    setTimeout(() => {
      scrollToCatalog();
    }, 120);
  };

  // ─── Open info page ───
  const handleOpenPage = (page: 'about' | 'policy' | 'privacy' | null) => {
    if (isMenuOpen) setIsMenuOpen(false);
    setActiveInfoPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Filtered & sorted products ───
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const hasSearch = searchQuery.trim().length > 0;
      const matchesCategory = hasSearch ? true : selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (p.origin && p.origin.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      const isProductAvailable = p.active !== false && p.is_available !== false && (p.stock === undefined || p.stock > 0);
      const matchesStock = !onlyInStock || isProductAvailable;
      return matchesCategory && matchesSearch && matchesStock;
    });

    if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

    return list;
  }, [products, selectedCategory, searchQuery, onlyInStock, sortBy]);

  // ─── Products to display based on pagination limit (8 products default) ───
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // ─── Active category info ───
  const activeCategoryInfo = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return {
        id: 'search',
        name: `نتائج البحث عن "${searchQuery.trim()}"`,
        icon: '🔍',
        description: `عرض ${filteredProducts.length} منتج${filteredProducts.length !== 1 ? 'ات' : ''} تطابق بحثك`,
      };
    }

    const category = CATEGORIES_CONFIG.find((c) => c.id === selectedCategory);
    if (category) return category;

    return {
      id: 'all',
      name: 'جميع المنتجات',
      icon: '🌟',
      description: 'جميع المنتجات المتوفرة بجودة عالية وطراوة يومية مضمونة.',
    };
  }, [selectedCategory, searchQuery, filteredProducts.length]);

  if (isAppExited) {
    return (
      <ExitScreen
        onReenter={() => {
          setIsAppExited(false);
          setIsExitConfirmOpen(false);
          setIsInstallBannerVisible(!checkIfAlreadyInstalledOrDownloaded());
          window.history.pushState({ page: 'main' }, '');
        }}
        cartCount={cartCount}
        cartTotal={cartTotal}
      />
    );
  }

  // ─── عرض واجهة الإدارة المستقلة أو واجهة المتجر الرئيسية مع الحفاظ على مزود الجلسة موحداً ───
  return (
    <AdminSessionProvider isAdmin={isAdmin} onLogout={handleAdminLogout}>
      {activeAdminRoute ? (
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center p-8">
              <div className="flex items-center gap-3 font-black text-sm text-[#163920] bg-white px-6 py-4 rounded-2xl shadow-md border border-[#E8E1D3]">
                <span className="w-5 h-5 rounded-full border-2 border-[#163920] border-t-transparent animate-spin" />
                <span>جارٍ تحميل صفحة الإدارة...</span>
              </div>
            </div>
          }
        >
          <AdminPageLayout
            currentRoute={activeAdminRoute}
            isAdmin={isAdmin}
            onLogout={handleAdminLogout}
            onNavigate={handleNavigateAdmin}
            onReturnToStore={handleReturnToStore}
            onExitToDashboard={handleExitToBottomDashboard}
          >
            <AdminErrorBoundary onClose={handleReturnToStore}>
              {activeAdminRoute === 'orders' && (
                <AdminOrdersPanel
                  standalone={true}
                  isOpen={true}
                  onClose={handleReturnToStore}
                />
              )}
              {activeAdminRoute === 'inventory' && (
                <AdminInventoryPanel
                  standalone={true}
                  isOpen={true}
                  targetProductId={adminFocusedProductId}
                  onClose={handleReturnToStore}
                  onNavigateToPricing={(pid) => handleNavigateAdmin('pricing', pid)}
                  onNavigateToAI={() => {
                    handleNavigateAdmin('marketing');
                  }}
                />
              )}
              {activeAdminRoute === 'marketing' && (
                <AIMarketingCenter />
              )}
              {activeAdminRoute === 'fleet' && (
                <AdminDeliveryFleetTab
                  standalone={true}
                />
              )}
              {activeAdminRoute === 'pricing' && (
                <PricingForecastPanel
                  standalone={true}
                  isOpen={true}
                  targetProductId={adminFocusedProductId}
                  onClose={handleReturnToStore}
                  onNavigateToInventory={(pid) => handleNavigateAdmin('inventory', pid)}
                />
              )}
              {activeAdminRoute === 'finance' && (
                <FinancePanel
                  standalone={true}
                  isOpen={true}
                  onClose={handleReturnToStore}
                />
              )}
            </AdminErrorBoundary>
          </AdminPageLayout>
        </Suspense>
      ) : (
        <div className="min-h-screen bg-[#F2EEE4] text-[#1A1814] flex flex-col font-['Tajawal']" dir="rtl">


      {/* ═══════ بانر تثبيت التطبيق أو بانر التوصيل المجاني (250 DH) ═══════ */}
      {isInstallBannerVisible ? (
        <InstallAppBanner onHide={() => setIsInstallBannerVisible(false)} />
      ) : (
        <FreeDeliveryBanner cartTotal={cartTotal} />
      )}

      {/* ═══════ Header ═══════ */}
      <Header
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => handleSelectCategory(cat, false)}
        onOpenPage={handleOpenPage}
        isMenuOpen={isMenuOpen}
        onToggleMenu={handleToggleMenu}
        onCloseMenu={handleCloseMenu}
        onScrollToBundles={scrollToBundles}
        onOpenExitModal={() => setIsExitConfirmOpen(true)}
      />

      {/* ═══════ Main Content ═══════ */}
      <main className="flex-1">
        {activeInfoPage ? (
          <Suspense fallback={<div className="max-w-3xl mx-auto p-12 text-center text-sm text-[#524B3E]">جاري التحميل...</div>}>
            <InfoPages page={activeInfoPage} onBackToShop={() => handleOpenPage(null)} />
          </Suspense>
        ) : (
          <>
            {/* ─── Hero ─── */}
            <Hero
              onSelectCategory={(cat) => handleSelectCategory(cat, false)}
              onScrollToCatalog={scrollToCategoryFilter}
              onScrollToBundles={scrollToBundles}
            />

            {/* ─── Category Filter (مدمج مع الوصف المحسّن وزر التصفية بالأيقونة الخضراء) ─── */}
            <div ref={categoryFilterRef} id="category-filter-section" className="scroll-mt-20">
              <CategoryFilter
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => handleSelectCategory(cat, true)}
                products={products}
                categoryInfo={activeCategoryInfo}
                sortBy={sortBy}
                onlyInStock={onlyInStock}
                onOpenSort={() => setIsSortModalOpen(true)}
                searchQuery={searchQuery}
                onClearSearch={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>

            {/* ═══════ Products Grid Section ═══════ */}
            <section
              id="search-results-section"
              ref={searchResultsRef}
              className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-12 scroll-mt-24"
            >
              <div ref={catalogSectionRef} id="catalog-section" className="scroll-mt-24" />

              {/* Grid or Empty/Loading state */}
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl p-4 border border-[#E8E1D3] h-64 animate-pulse flex flex-col items-center justify-center gap-3"
                    >
                      <div className="w-16 h-16 bg-[#F7F4EC] rounded-2xl" />
                      <div className="w-24 h-4 bg-[#F7F4EC] rounded-full" />
                      <div className="w-16 h-3 bg-[#F7F4EC] rounded-full" />
                      <div className="w-full h-8 bg-[#F7F4EC] rounded-xl mt-auto" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-[#E8E1D3] rounded-3xl p-10 text-center max-w-md mx-auto shadow-sm">
                  <span className="text-4xl block mb-2">🔍</span>
                  <h3 className="text-base font-black text-[#112616] mb-1">
                    لم نتمكن من العثور على أي منتج
                  </h3>
                  <p className="text-xs sm:text-sm text-[#524B3E] mb-4">
                    {searchQuery ? `لا توجد منتجات تطابق بحثك "${searchQuery}".` : 'لا توجد منتجات تطابق شروط الفرز الحالية.'}
                    {searchQuery && ' جرب البحث باسم آخر أو اختر قسماً مختلفاً.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSortBy('default');
                      setOnlyInStock(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-[#163920] to-[#0E2615] hover:shadow-lg text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer border-2 border-[#0E2615] active:scale-95"
                  >
                    عرض جميع المنتجات المتوفرة
                  </button>
                </div>
              ) : (
                <>
                  <motion.div
                    key={selectedCategory}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 min-h-[320px]"
                  >
                    {displayedProducts.map((product, idx) => {
                      const inCartQty = cartQtyByIdMap.get(product.id) || 0;
                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          inCartQty={inCartQty}
                          onAddToCart={handleAddToCart}
                          index={idx}
                        />
                      );
                    })}
                  </motion.div>

                  {/* ─── زر عرض باقي المنتجات بتصميم متناسق مع زر التقييمات ─── */}
                  {filteredProducts.length > INITIAL_VISIBLE_COUNT && (
                    <div className="mt-6 text-center">
                      {visibleCount < filteredProducts.length ? (
                        <button
                          type="button"
                          id="load-more-products-btn"
                          onClick={() => setVisibleCount((prev) => prev + 12)}
                          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border-2 border-[#E8E1D3] hover:border-[#C25E12] hover:bg-[#F7F4EC] text-[#163920] text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95 shadow-sm group"
                          title="عرض باقي المنتجات"
                        >
                          <ChevronDown className="w-4 h-4 text-[#163920] group-hover:text-[#C25E12] transition-colors" />
                          <span>عرض باقي المنتجات ({filteredProducts.length - visibleCount})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setVisibleCount(INITIAL_VISIBLE_COUNT);
                            // إعادة موضع الشاشة بسلاسة إلى بداية قائمة المنتجات لمنع القفز أو ظهور الخريطة فجأة
                            if (catalogSectionRef.current) {
                              catalogSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border-2 border-[#E8E1D3] hover:border-[#C25E12] hover:bg-[#F7F4EC] text-[#163920] text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95 shadow-sm group"
                          title="عرض أقل"
                        >
                          <ChevronDown className="w-4 h-4 text-[#163920] group-hover:text-[#C25E12] transition-colors rotate-180" />
                          <span>عرض أقل</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ─── Family Boxes Section ─── */}
            <div ref={bundlesSectionRef} id="family-bundles-section" className="scroll-mt-24 sm:scroll-mt-28">
              <Suspense
                fallback={
                  <div className="py-12 text-center text-[#524B3E]/60 text-xs font-bold animate-pulse">
                    جاري تحميل صناديق العائلة...
                  </div>
                }
              >
                <FamilyBoxesSection
                  onAddToCart={handleAddToCart}
                  selectedBox={selectedFamilyBox}
                  onSelectBox={setSelectedFamilyBox}
                />
              </Suspense>
            </div>

            {/* ─── Trust Badges ─── */}
            <TrustBadges />

            {/* ─── Customer Reviews ─── */}
            <ReviewsSectionBoundary>
              <CustomerReviews onOpenOrdersPanel={() => setIsAdminOrdersOpen(true)} />
            </ReviewsSectionBoundary>
          </>
        )}
      </main>

      {/* ─── لوحة إدارة طلبات المتجر للمدير (معزولة بالكامل عن الصفحة الرئيسية) ─── */}
      {isAdminOrdersOpen && (
        <AdminErrorBoundary
          onClose={() => {
            setIsAdminOrdersOpen(false);
            try {
              document.body.style.overflow = '';
              document.documentElement.style.overflow = '';
              document.body.style.pointerEvents = '';
            } catch {}
          }}
        >
          <Suspense fallback={null}>
            <AdminOrdersPanel
              isOpen={isAdminOrdersOpen}
              onClose={() => {
                setIsAdminOrdersOpen(false);
                try {
                  document.body.style.overflow = '';
                  document.documentElement.style.overflow = '';
                  document.body.style.pointerEvents = '';
                } catch {}
                window.dispatchEvent(new CustomEvent('khodra_orders_updated'));
              }}
            />
          </Suspense>
        </AdminErrorBoundary>
      )}

      {/* ═══════ Lazy Loaded Modals ═══════ */}
      <Suspense fallback={null}>

        {isCartOpen && (
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cart}
            onUpdateQty={handleUpdateCartQty}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onExploreBundles={scrollToBundles}
            onBrowseProducts={scrollToCategoryFilter}
            onProceedToCheckout={() => {
              const subtotal = Number(cart.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
              const fee = cart.length === 0 ? 0 : calculateCustomerDeliveryFee(subtotal);
              const grandTotal = Number((subtotal + fee).toFixed(2));
              if (grandTotal < (STORE_CONFIG.minOrderAmount || 70)) {
                return;
              }
              setIsCartOpen(false);
              setIsCheckoutOpen(true);
            }}
          />
        )}

        {isCheckoutOpen && (
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            items={cart}
            onSubmitOrder={handleOrderSubmission}
          />
        )}

        {confirmedOrder && (
          <ConfirmationModal
            isOpen={!!confirmedOrder}
            order={confirmedOrder}
            onClose={() => setConfirmedOrder(null)}
          />
        )}

        {isSortModalOpen && (
          <SortFilterModal
            isOpen={isSortModalOpen}
            onClose={() => setIsSortModalOpen(false)}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onlyInStock={onlyInStock}
            onToggleOnlyInStock={() => setOnlyInStock((prev) => !prev)}
            onReset={() => {
              setSortBy('default');
              setOnlyInStock(false);
            }}
          />
        )}

        {/* ─── نافذة تأكيد الخروج من التطبيق ─── */}
        {isExitConfirmOpen && (
          <ExitConfirmationModal
            isOpen={isExitConfirmOpen}
            onClose={() => setIsExitConfirmOpen(false)}
            onConfirmExit={() => {
              setIsExitConfirmOpen(false);
              setIsAppExited(true);
            }}
            cartCount={cartCount}
            cartTotal={cartTotal}
          />
        )}

        {/* ─── النافذة المستقلة للأداة 7: خُضرة AI Copilot ─── */}
        {isCopilotModalOpen && (
          <KhodraAICopilotModal
            isOpen={isCopilotModalOpen}
            onClose={() => setIsCopilotModalOpen(false)}
            onNavigateAdmin={(route) => {
              setIsCopilotModalOpen(false);
              handleNavigateAdmin(route);
            }}
          />
        )}

        {/* ─── النافذة المستقلة للأداة 8: وثائق وعقود المشروع ─── */}
        {isDocumentsModalOpen && (
          <AdminDocumentsModal
            isOpen={isDocumentsModalOpen}
            standalone={false}
            onClose={() => setIsDocumentsModalOpen(false)}
          />
        )}
      </Suspense>

      {/* ═══════ زر العودة للأعلى (دائري مع شريط تقدم ذهبي) ═══════ */}
      <ScrollToTopButton
        hasStickyBar={cartCount > 0}
        hidden={
          isCartOpen ||
          isCheckoutOpen ||
          isMenuOpen ||
          isAdminOrdersOpen ||
          isSortModalOpen ||
          !!selectedFamilyBox ||
          !!confirmedOrder ||
          isExitConfirmOpen
        }
      />

      {/* ═══════ Floating Sticky Bottom Bar ═══════ */}
      <StickyBottomBar
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenCheckout={() => {
          const subtotal = Number(cart.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
          const fee = cart.length === 0 ? 0 : calculateCustomerDeliveryFee(subtotal);
          const grandTotal = Number((subtotal + fee).toFixed(2));
          if (grandTotal < (STORE_CONFIG.minOrderAmount || 70)) {
            setIsCartOpen(true);
            return;
          }
          setIsCheckoutOpen(true);
        }}
      />

      {/* ═══════ Footer ═══════ */}
      <Footer onOpenPage={handleOpenPage} hasStickyBar={cartCount > 0} />

      {/* ═══════ قسم المدير أسفل الفوتر (بطاقات 2×2) ═══════ */}
      {isAdmin && (
        <Suspense fallback={null}>
          <AdminBottomDashboard
            isAdmin={isAdmin}
            onLogout={handleAdminLogout}
            onNavigateAdmin={handleNavigateAdmin}
          />
        </Suspense>
      )}

      {/* ═══════ نافذة إدخال الرمز السري للمدير ═══════ */}
      {isAdminPinModalOpen && (
        <Suspense fallback={null}>
          <PinModal
            isOpen={isAdminPinModalOpen}
            onClose={() => setIsAdminPinModalOpen(false)}
            onSubmit={handleAdminPinLogin}
          />
        </Suspense>
      )}

      </div>
      )}
    </AdminSessionProvider>
  );
}