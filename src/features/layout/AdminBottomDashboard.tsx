// ============================================================
// AdminBottomDashboard.tsx – قسم المدير أسفل الفوتر
// يضم الأدوات الثمانية بترتيبها المعتمد وألوانها المتباينة العصرية:
// 1. إدارة الطلبات (Commandes)
// 2. مسارات التوصيل (Flotte)
// 3. المنتجات والمخزون (Stock)
// 4. التسعير وتوقع الطلب (Tarifs JIT)
// 5. النشر والتسويق (Marketing)
// 6. اللوحة المالية (Finance)
// 7. خُضرة AI Copilot (نافذة مستقلة 🤖)
// 8. وثائق وعقود المشروع (نافذة مستقلة 📑)
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  ShoppingBag,
  BarChart3,
  FileText,
  Share2,
  KeyRound,
  LogOut,
  Bell,
  BellOff,
  Sparkles,
  ExternalLink,
  Bike,
  DollarSign,
  Package,
  Bot,
  ArrowUpRight,
} from 'lucide-react';
import { useNewOrdersNotifier } from '../../hooks/useNewOrdersNotifier';
import { updateAdminPassword } from '../../services/supabaseService';
import { ChangePinModal } from '../modals/AdminReviewModals';
import { AdminNotificationToast } from './AdminNotificationToast';
import { playOrderAlertSound } from '../../utils/audioAlert';
import { KhodraAICopilotModal } from '../copilot/KhodraAICopilotModal';
import { AdminDocumentsModal } from '../documents/AdminDocumentsModal';
import { useAdminSession } from './AdminSessionContext';

export type AdminRoute = 'orders' | 'fleet' | 'inventory' | 'pricing' | 'marketing' | 'finance';

interface AdminBottomDashboardProps {
  isAdmin: boolean;
  onLogout: () => void;
  onNavigateAdmin?: (route: AdminRoute) => void;
  onChangePinSuccess?: (msg: string) => void;
}

export const AdminBottomDashboard: React.FC<AdminBottomDashboardProps> = ({
  isAdmin,
  onLogout,
  onNavigateAdmin,
}) => {
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);

  // حالتا فتح النافذتين المستقلتين للأداتين 7 و 8
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('khodra_notification_sound') !== 'false';
    } catch {
      return true;
    }
  });

  const { totalPending, newCount, markAsSeen } = useNewOrdersNotifier({
    enabled: isAdmin,
    pollIntervalMs: 30000,
  });

  // ─── 30 دقيقة مهلة خمول إدارية ───
  // (تتم مراقبة الخمول وتمديد الجلسة مركزياً عبر AdminSessionProvider)
  const { extendSession } = useAdminSession();


  // الاستماع للأحداث العامة لفتح النوافذ المستقلة من أي مكان في المتجر
  useEffect(() => {
    const handleOpenCopilot = () => setIsCopilotOpen(true);
    const handleOpenDocs = () => setIsDocumentsOpen(true);

    window.addEventListener('khodra_open_copilot_modal', handleOpenCopilot);
    window.addEventListener('khodra_open_documents_modal', handleOpenDocs);

    return () => {
      window.removeEventListener('khodra_open_copilot_modal', handleOpenCopilot);
      window.removeEventListener('khodra_open_documents_modal', handleOpenDocs);
    };
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('khodra_notification_sound', String(next));
      } catch {}
      if (next) {
        playOrderAlertSound(true);
      }
      setDashboardNotice(next ? '🔔 تم تفعيل التنبيهات الصوتية' : '🔇 تم كتم التنبيهات الصوتية');
      setTimeout(() => setDashboardNotice(null), 3000);
      return next;
    });
  }, []);

  const handleNavigate = (e: React.MouseEvent, route: AdminRoute) => {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      if (route === 'orders') markAsSeen();
      if (onNavigateAdmin) {
        onNavigateAdmin(route);
      } else {
        window.history.pushState({ admin: route }, '', `/admin/${route}`);
        window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: route }));
      }
    }
  };

  const handleChangePinSubmit = async (newPin: string, currentPin?: string) => {
    const res = await updateAdminPassword(newPin, currentPin);
    if (res.success) {
      setDashboardNotice('✅ تم تحديث الرمز السري للمدير بنجاح على الخادم');
      setTimeout(() => setDashboardNotice(null), 3500);
      setIsChangePinOpen(false);
      return { success: true };
    }
    return { success: false, message: res.message || 'فشل تحديث الرمز السري' };
  };

  if (!isAdmin) return null;

  return (
    <section
      id="admin-dashboard-section"
      className="relative bg-[#09090b] text-white border-t-4 border-[#EAB308] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 overflow-hidden select-none scroll-mt-24 sm:scroll-mt-28"
      dir="rtl"
    >
      {/* إضاءات محيطية ناعمة في الخلفية الداكنة */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#EAB308]/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto space-y-6">

        {/* ═══════ الرأس العلوي لقسم المدير ═══════ */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-zinc-800 text-center sm:text-right">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-[#EAB308]/50 flex items-center justify-center shadow-[0_4px_16px_rgba(234,179,8,0.20)] shrink-0">
              <ShieldCheck className="w-7 h-7 text-[#EAB308]" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-['Almarai']">
                  لوحة إدارة متجر خُضرة
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  مباشر En ligne
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5 font-medium">
                8 أدوات تشغيلية متكاملة لإدارة الطلبات والأسطول والمخزون والتسويق بسوق فاس
              </p>
            </div>
          </div>

          {/* أزرار سريعة في الشريط العلوي */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs active:scale-95 ${
                soundEnabled
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/90'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              title={soundEnabled ? 'التنبيهات الصوتية مفعّلة' : 'التنبيهات الصوتية مكتومة'}
            >
              {soundEnabled ? (
                <>
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تنبيهات صوتية</span>
                </>
              ) : (
                <>
                  <BellOff className="w-3.5 h-3.5 text-zinc-500" />
                  <span>صوت مكتوم</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsChangePinOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-400/50 text-zinc-100 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#F5D76E]" />
              <span>الرمز السري</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* ═══════ إشعار نجاح أو تنبيه للوحة المدير ═══════ */}
        {dashboardNotice && (
          <div className="py-2.5 px-4 rounded-xl bg-gradient-to-l from-emerald-600/90 to-teal-700/90 text-white text-xs sm:text-sm font-black border border-emerald-400/40 shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <span>{dashboardNotice}</span>
            <button
              type="button"
              onClick={() => setDashboardNotice(null)}
              className="text-white/80 hover:text-white cursor-pointer p-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* ═══════ شبكة بطاقات أدوات الإدارة الثمانية بتصميم وألوان متباينة ═══════ */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4.5">

          {/* ─── 1. إدارة الطلبات (Commandes) ─── */}
          <a
            href="/admin/orders"
            onClick={(e) => handleNavigate(e, 'orders')}
            className="group relative bg-gradient-to-br from-[#123820] via-[#0d2b18] to-[#07180d] hover:from-[#194c2c] hover:to-[#10341c] border-2 border-emerald-500/60 hover:border-emerald-400 rounded-2xl p-4 sm:p-5 text-right transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_12px_32px_rgba(16,185,129,0.30)] active:scale-[0.98] flex flex-col justify-between min-h-[175px] sm:min-h-[190px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-800 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform text-emerald-100">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#F5D76E]" strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1">
                {totalPending > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-[#EA580C] text-white border border-white/30 shadow-md animate-pulse">
                    <span>{totalPending}</span>
                    <span>جديد</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    محدّثة
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
                  1. إدارة الطلبات
                </h3>
                <span className="text-[10px] sm:text-[11px] text-emerald-400/80 font-mono">
                  Commandes
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-1 leading-snug font-medium line-clamp-2">
                متابعة وتجهيز الطلبات، وطباعة بوليصة الشحن (Bordereau 80mm).
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-300 font-bold mt-2">
              <span>فتح الطلبات والتجهيز</span>
              <span className="text-xs transition-transform group-hover:-translate-x-1">←</span>
            </div>
          </a>

          {/* ─── 2. مسارات التوصيل (Flotte) ─── */}
          <a
            href="/admin/fleet"
            onClick={(e) => handleNavigate(e, 'fleet')}
            className="group relative bg-gradient-to-br from-[#0c2f45] via-[#072436] to-[#04141f] hover:from-[#11405e] hover:to-[#0c2f45] border-2 border-sky-500/60 hover:border-sky-400 rounded-2xl p-4 sm:p-5 text-right transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_12px_32px_rgba(14,165,233,0.30)] active:scale-[0.98] flex flex-col justify-between min-h-[175px] sm:min-h-[190px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-800 border border-sky-400/40 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform text-sky-100">
                <Bike className="w-5 h-5 sm:w-6 sm:h-6 text-sky-200" strokeWidth={2.5} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/40">
                4 مناطق بفاس
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-sky-300 transition-colors leading-tight">
                  2. مسارات التوصيل
                </h3>
                <span className="text-[10px] sm:text-[11px] text-sky-400/80 font-mono">
                  Flotte
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-1 leading-snug font-medium line-clamp-2">
                جولات التوصيل، سائقو الفريق، وكباتن التطبيقات السريعة بفاس.
              </p>
            </div>

            <div className="pt-2 border-t border-sky-500/20 flex items-center justify-between text-[11px] text-sky-300 font-bold mt-2">
              <span>إدارة أسطول التوصيل</span>
              <span className="text-xs transition-transform group-hover:-translate-x-1">←</span>
            </div>
          </a>

          {/* ─── 3. المنتجات والمخزون (Stock) ─── */}
          <a
            href="/admin/inventory"
            onClick={(e) => handleNavigate(e, 'inventory')}
            className="group relative bg-gradient-to-br from-[#133b31] via-[#0d2a23] to-[#061814] hover:from-[#1b4e41] hover:to-[#133b31] border-2 border-teal-500/60 hover:border-teal-400 rounded-2xl p-4 sm:p-5 text-right transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_12px_32px_rgba(20,184,166,0.30)] active:scale-[0.98] flex flex-col justify-between min-h-[175px] sm:min-h-[190px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-800 border border-teal-400/40 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform text-teal-100">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#F5D76E]" strokeWidth={2.5} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/40">
                مخزون حي
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-teal-300 transition-colors leading-tight">
                  3. المنتجات والمخزون
                </h3>
                <span className="text-[10px] sm:text-[11px] text-teal-400/80 font-mono">
                  Stock
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-1 leading-snug font-medium line-clamp-2">
                تحديث الكميات اللحظي، إضافة السلع، وحظر الترويج عند النفاد.
              </p>
            </div>

            <div className="pt-2 border-t border-teal-500/20 flex items-center justify-between text-[11px] text-teal-300 font-bold mt-2">
              <span>إدارة المخزون والسلع</span>
              <span className="text-xs transition-transform group-hover:-translate-x-1">←</span>
            </div>
          </a>

          {/* ─── 4. التسعير وتوقع الطلب (Tarifs JIT) ─── */}
          <a
            href="/admin/pricing"
            onClick={(e) => handleNavigate(e, 'pricing')}
            className="group relative bg-gradient-to-br from-[#3a2806] via-[#2a1d04] to-[#171002] hover:from-[#4d3609] hover:to-[#3a2806] border-2 border-amber-500/60 hover:border-amber-400 rounded-2xl p-4 sm:p-5 text-right transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_12px_32px_rgba(245,158,11,0.30)] active:scale-[0.98] flex flex-col justify-between min-h-[175px] sm:min-h-[190px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-700 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform text-amber-100">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#FEF08A]" strokeWidth={2.5} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                أسعار بنسودة JIT
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                  4. التسعير وتوقع الطلب
                </h3>
                <span className="text-[10px] sm:text-[11px] text-amber-400/80 font-mono">
                  Tarifs JIT
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-1 leading-snug font-medium line-clamp-2">
                أسعار سوق بنسودة الصباحية، هوامش الربح، وتوقعات الشراء الذكية.
              </p>
            </div>

            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300 font-bold mt-2">
              <span>جدول الأسعار والتوقعات</span>
              <span className="text-xs transition-transform group-hover:-translate-x-1">←</span>
            </div>
          </a>

          {/* ─── 5. النشر والتسويق (Marketing) ─── */}
          <a
            href="/admin/marketing"
            onClick={(e) => handleNavigate(e, 'marketing')}
            className="group relative bg-gradient-to-br from-[#2a1748] via-[#1f1035] to-[#120921] hover:from-[#3a2062] hover:to-[#2a1748] border-2 border-purple-500/60 hover:border-purple-400 rounded-2xl p-4 sm:p-5 text-right transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_12px_32px_rgba(168,85,247,0.30)] active:scale-[0.98] flex flex-col justify-between min-h-[175px] sm:min-h-[190px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-800 border border-purple-400/40 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform text-purple-100">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-200" strokeWidth={2.5} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                1-Click
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-purple-300 transition-colors leading-tight">
                  5. النشر والتسويق
                </h3>
                <span className="text-[10px] sm:text-[11px] text-purple-400/80 font-mono">
                  Marketing
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-1 leading-snug font-medium line-clamp-2">
                توليد ونشر عروض اليوم آلياً إلى واتساب وشبكات التواصل.
              </p>
            </div>

            <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-[11px] text-purple-300 font-bold mt-2">
              <span>مركز النشر والتسويق</span>
              <span className="text-xs transition-transform group-hover:-translate-x-1">←</span>
            </div>
          </a>

          {/* ─── 6. اللوحة المالية (Finance) ─── */}
          <a
            href="/admin/finance"
            onClick={(e) => handleNavigate(e, 'finance')}
            className="group relative bg-gradient-to-br from-[#3b170e] via-[#2b1009] to-[#180805] hover:from-[#4d1f14] hover:to-[#3b170e] border-2 border-orange-500/60 hover:border-orange-400 rounded-2xl p-4 sm:p-5 text-right transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_12px_32px_rgba(249,115,22,0.30)] active:scale-[0.98] flex flex-col justify-between min-h-[175px] sm:min-h-[190px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-orange-600 to-rose-800 border border-orange-400/40 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform text-orange-100">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#F5D76E]" strokeWidth={2.5} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/40">
                Bilan & CA
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-orange-300 transition-colors leading-tight">
                  6. اللوحة المالية
                </h3>
                <span className="text-[10px] sm:text-[11px] text-orange-400/80 font-mono">
                  Finance
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-1 leading-snug font-medium line-clamp-2">
                CA، نقطة التعادل، وميزانية التدفقات النقدية التقديرية 12 شهراً.
              </p>
            </div>

            <div className="pt-2 border-t border-orange-500/20 flex items-center justify-between text-[11px] text-orange-300 font-bold mt-2">
              <span>عرض المؤشرات المالية</span>
              <span className="text-xs transition-transform group-hover:-translate-x-1">←</span>
            </div>
          </a>

          {/* ─── 7. خُضرة AI Copilot (تفتح في نافذة مستقلة 🤖) ─── */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="group relative bg-gradient-to-br from-[#0c224a] via-[#071735] to-[#040e21] hover:from-[#13326b] hover:to-[#0c224a] border-2 border-blue-400/70 hover:border-cyan-300 rounded-2xl p-4 sm:p-5 text-right transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_12px_36px_rgba(59,130,246,0.40)] active:scale-[0.98] flex flex-col justify-between min-h-[175px] sm:min-h-[190px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 border border-cyan-400/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.4)] group-hover:scale-105 transition-transform text-cyan-200">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-blue-500/25 text-cyan-200 border border-blue-400/50 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
                <span>نافذة مستقلة</span>
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition-colors leading-tight flex items-center gap-1.5">
                  <span>7. خُضرة AI Copilot</span>
                  <span className="text-xs">🤖</span>
                </h3>
                <span className="text-[10px] sm:text-[11px] text-cyan-400/80 font-mono">
                  Copilot v2
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-1 leading-snug font-medium line-clamp-2">
                المساعد التشغيلي الذكي المتصل بقاعدة البيانات الحية للإجابة اللحظية وتحليل المبيعات.
              </p>
            </div>

            <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-between text-[11px] text-cyan-300 font-bold mt-2">
              <span className="flex items-center gap-1">فتح المساعد الذكي</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </button>

          {/* ─── 8. وثائق وعقود المشروع (تفتح في نافذة مستقلة 📑) ─── */}
          <button
            type="button"
            onClick={() => setIsDocumentsOpen(true)}
            className="group relative bg-gradient-to-br from-[#22252a] via-[#181a1f] to-[#0e1013] hover:from-[#31353c] hover:to-[#22252a] border-2 border-stone-400/60 hover:border-yellow-400 rounded-2xl p-4 sm:p-5 text-right transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_12px_36px_rgba(234,179,8,0.30)] active:scale-[0.98] flex flex-col justify-between min-h-[175px] sm:min-h-[190px]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-stone-700 to-zinc-900 border border-yellow-500/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(234,179,8,0.25)] group-hover:scale-105 transition-transform text-yellow-400">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#EAB308]" strokeWidth={2.5} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                A4 PDF • نافذة مستقلة
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-yellow-300 transition-colors leading-tight flex items-center gap-1.5">
                  <span>8. وثائق وعقود المشروع</span>
                  <span className="text-xs">📑</span>
                </h3>
                <span className="text-[10px] sm:text-[11px] text-yellow-400/80 font-mono">
                  Contrats SARL
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-1 leading-snug font-medium line-clamp-2">
                ملف التمويل، Pitch Deck، عقود السائق والتوريد، والدليل التقني A4 PDF.
              </p>
            </div>

            <div className="pt-2 border-t border-yellow-500/20 flex items-center justify-between text-[11px] text-yellow-300 font-bold mt-2">
              <span className="flex items-center gap-1">عرض الوثائق والعقود</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-yellow-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </button>

        </div>

      </div>

      {/* ═══════ نافذة تغيير الرمز السري ═══════ */}
      {isChangePinOpen && (
        <ChangePinModal
          isOpen={isChangePinOpen}
          onClose={() => setIsChangePinOpen(false)}
          onSubmit={handleChangePinSubmit}
        />
      )}


      {/* ═══════ النافذة المستقلة للأداة 7: خُضرة AI Copilot ═══════ */}

      {isCopilotOpen && (
        <KhodraAICopilotModal
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          onNavigateAdmin={(route) => {
            setIsCopilotOpen(false);
            if (onNavigateAdmin) {
              onNavigateAdmin(route);
            } else {
              window.history.pushState({ admin: route }, '', `/admin/${route}`);
              window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: route }));
            }
          }}
        />
      )}

      {/* ═══════ النافذة المستقلة للأداة 8: وثائق وعقود المشروع ═══════ */}
      {isDocumentsOpen && (
        <AdminDocumentsModal
          isOpen={isDocumentsOpen}
          standalone={false}
          onClose={() => setIsDocumentsOpen(false)}
        />
      )}

      {/* ═══════ إشعار طافٍ للطلبات الجديدة ═══════ */}
      <AdminNotificationToast
        newCount={newCount}
        onOpenOrders={() => {
          markAsSeen();
          if (onNavigateAdmin) {
            onNavigateAdmin('orders');
          } else {
            window.history.pushState({ admin: 'orders' }, '', '/admin/orders');
            window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'orders' }));
          }
        }}
        onDismiss={() => {
          markAsSeen();
        }}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    </section>
  );
};
