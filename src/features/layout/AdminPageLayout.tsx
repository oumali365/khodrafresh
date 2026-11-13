// ============================================================
// AdminPageLayout.tsx – هيكل وتصميم صفحات الإدارة المخصصة
// يوفر شريط تنقل متطور لوضع الحاسوب وشريط لمس مخصص للهاتف
// مع حماية الرمز السري والانتقال السلس بين أدوات الإدارة الأربعة
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
  Home,
  CheckCircle2,
  Bike,
  DollarSign,
  Package,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { useNewOrdersNotifier } from '../../hooks/useNewOrdersNotifier';
import { updateAdminPassword, verifyAdminPinRemote } from '../../services/supabaseService';
import { ChangePinModal } from '../modals/AdminReviewModals';
import { AdminNotificationToast } from './AdminNotificationToast';
import { playOrderAlertSound } from '../../utils/audioAlert';
import { useAdminSession } from './AdminSessionContext';

export type AdminRoute = 'orders' | 'fleet' | 'inventory' | 'pricing' | 'marketing' | 'finance';

interface AdminPageLayoutProps {
  currentRoute: AdminRoute;
  isAdmin: boolean;
  onLogout?: () => void;
  onNavigate: (route: AdminRoute) => void;
  onReturnToStore: () => void;
  onExitToDashboard?: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: AdminRoute;
  href: string;
  label: string;
  sublabel: string;
  Icon: React.FC<{ className?: string }>;
  accentColor: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'orders',
    href: '/admin/orders',
    label: 'الطلبات',
    sublabel: 'Commandes',
    Icon: ShoppingBag,
    accentColor: 'text-[#10B981]',
  },
  {
    id: 'fleet',
    href: '/admin/fleet',
    label: 'التوصيل',
    sublabel: 'Flotte',
    Icon: Bike,
    accentColor: 'text-[#38BDF8]',
  },
  {
    id: 'inventory',
    href: '/admin/inventory',
    label: 'المخزون',
    sublabel: 'Stock',
    Icon: Package,
    accentColor: 'text-[#14B8A6]',
  },
  {
    id: 'pricing',
    href: '/admin/pricing',
    label: 'التسعير',
    sublabel: 'Tarifs JIT',
    Icon: DollarSign,
    accentColor: 'text-[#FACC15]',
  },
  {
    id: 'marketing',
    href: '/admin/marketing',
    label: 'التسويق',
    sublabel: 'Marketing',
    Icon: Share2,
    accentColor: 'text-[#C084FC]',
  },
  {
    id: 'finance',
    href: '/admin/finance',
    label: 'المالية',
    sublabel: 'Finance',
    Icon: BarChart3,
    accentColor: 'text-[#FB923C]',
  },
];

export const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  currentRoute,
  isAdmin,
  onLogout,
  onNavigate,
  onReturnToStore,
  onExitToDashboard,
  children,
}) => {
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // الخروج والعودة التلقائية إلى لوحة الإدارة السفلية
  const handleExit = useCallback(() => {
    if (onExitToDashboard) {
      onExitToDashboard();
    } else {
      onReturnToStore();
    }
  }, [onExitToDashboard, onReturnToStore]);

  // حالة الصوت
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('khodra_notification_sound') !== 'false';
    } catch {
      return true;
    }
  });

  // إشعار الطلبات الجديدة
  const { totalPending, newCount, markAsSeen } = useNewOrdersNotifier({
    enabled: isAdmin,
    pollIntervalMs: 30000,
  });

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('khodra_notification_sound', String(next));
      } catch {}
      if (next) {
        playOrderAlertSound(true);
      }
      setNotice(next ? '🔔 تم تفعيل التنبيهات الصوتية للطلبات' : '🔇 تم كتم التنبيهات الصوتية');
      setTimeout(() => setNotice(null), 3000);
      return next;
    });
  }, []);

  // ─── 30 دقيقة مهلة خمول إدارية ───
  // (تتم مراقبة الخمول وتمديد الجلسة مركزياً عبر AdminSessionProvider)
  const { extendSession } = useAdminSession();

  useEffect(() => {
    const handleRevoked = (e: any) => {
      const reason = e?.detail?.reason || 'تم إبطال الجلسة أو تغيير الرمز السري من جهاز آخر';
      setNotice(`⚠️ ${reason}`);
      onReturnToStore();
    };
    window.addEventListener('khodra_admin_auth_revoked', handleRevoked);
    return () => {
      window.removeEventListener('khodra_admin_auth_revoked', handleRevoked);
    };
  }, [onReturnToStore]);


  const handleChangePinSubmit = async (newPin: string, currentPin?: string) => {
    const res = await updateAdminPassword(newPin, currentPin);
    if (res.success) {
      setNotice('✅ تم تحديث الرمز السري للمدير بنجاح على الخادم');
      setTimeout(() => setNotice(null), 3500);
      setIsChangePinOpen(false);
      return { success: true };
    }
    return { success: false, message: res.message || 'فشل تحديث الرمز السري' };
  };

  const handleNavClick = (e: React.MouseEvent, route: AdminRoute) => {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      onNavigate(route);
    }
  };

  const handleReturnClick = (e: React.MouseEvent) => {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handleExit();
    }
  };

  // التحقق من الرمز السري عند الدخول المباشر للصفحة بدون تسجيل مسبق
  const [inlinePin, setInlinePin] = useState('');
  const [inlinePinError, setInlinePinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const handleInlinePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlinePin.trim()) return;
    setIsVerifyingPin(true);
    setInlinePinError(null);
    try {
      const res = await verifyAdminPinRemote(inlinePin.trim());
      if (res.valid) {
        try {
          sessionStorage.setItem('khodra_admin_auth', 'true');
          sessionStorage.setItem('khodra_admin_last_activity', String(Date.now()));
          localStorage.removeItem('khodra_admin_auth');
        } catch {}
        window.dispatchEvent(new CustomEvent('khodra_admin_auth_changed'));
      } else {
        setInlinePinError(res.message || 'الرمز السري غير صحيح');
      }
    } catch {
      setInlinePinError('تعذر الاتصال بالخادم للتحقق من الرمز السري');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center p-4 selection:bg-[#EAB308]/30 font-['Tajawal']" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-[#163920]/20 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#163920] to-[#0E2615] border-2 border-[#EAB308] flex items-center justify-center mx-auto shadow-lg">
            <ShieldCheck className="w-9 h-9 text-[#EAB308]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#163920]">تسجيل دخول الإدارة</h2>
            <p className="text-xs text-stone-600 mt-1.5 font-medium">
              يرجى إدخال الرمز السري للوصول إلى صفحات إدارة المتجر
            </p>
          </div>
          <form onSubmit={handleInlinePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={inlinePin}
                onChange={(e) => {
                  setInlinePin(e.target.value);
                  setInlinePinError(null);
                }}
                placeholder="أدخل الرمز السري (PIN)"
                className="w-full text-center text-2xl tracking-[0.4em] font-mono py-3 px-4 rounded-xl border-2 border-stone-300 focus:border-[#163920] focus:ring-2 focus:ring-[#163920]/20 outline-none transition-all"
                autoFocus
              />
              {inlinePinError && (
                <p className="text-xs text-rose-600 font-bold mt-2">{inlinePinError}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isVerifyingPin || inlinePin.length < 4}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-l from-[#163920] to-[#0E2615] hover:from-[#1E4D2B] hover:to-[#163920] text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifyingPin ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ التحقق...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-[#F5D76E]" />
                  <span>تأكيد الدخول</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleExit}
              className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 font-bold transition-colors cursor-pointer"
            >
              العودة إلى المتجر الرئيسي
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-[#1A1814] flex flex-col selection:bg-[#EAB308]/30" dir="rtl">
      {/* ══════════════════════════════════════════════════════════
          1. الشريط العلوي الرئيسي (Desktop & Mobile Top Header)
          ══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-[#0E1B11] text-white border-b-2 border-[#EAB308]/40 shadow-md">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 sm:h-16 gap-2 sm:gap-4">

            {/* الجزء الأيمن: زر الرجوع إلى لوحة التحكم + الشعار والعنوان الموحد الثابت */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* زر الرجوع الصريح إلى لوحة التحكم السفلية (Bottoms Dashboard) */}
              <button
                type="button"
                id="admin-header-back-to-dashboard-btn"
                onClick={handleExit}
                className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs"
                title="الرجوع إلى لوحة التحكم السفلية (Bottom Dashboard)"
                aria-label="الرجوع إلى لوحة التحكم السفلية"
              >
                <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
                <span className="text-xs font-black hidden xs:inline">اللوحة</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-[#EAB308]/40 flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-4.5 h-4.5 text-[#EAB308]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm sm:text-base text-white tracking-tight font-['Almarai'] leading-tight">
                      إدارة متجر خُضرة
                    </span>
                    <span className="hidden xs:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      مباشر
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-medium leading-tight">
                    لوحة التحكم والإدارة
                  </span>
                </div>
              </div>
            </div>

            {/* أدوات الإدارة في الشاشات الكبيرة والمتوسطة */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = currentRoute === item.id;
                const { Icon } = item;
                const isOrders = item.id === 'orders';

                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.id)}
                    className={`relative px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800 text-white border border-[#EAB308]/60 shadow-sm ring-1 ring-[#EAB308]/20'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? item.accentColor : 'opacity-70'}`} />
                    <span>{item.label}</span>

                    {/* شارة الطلبات المعلقة */}
                    {isOrders && totalPending > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#EA580C] text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                        {totalPending}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>

            {/* الجزء الأيسر: الإشعارات والأمان */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* زر الإشعارات / التنبيه الصوتي */}
              <button
                type="button"
                onClick={handleToggleSound}
                className={`relative min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 shadow-xs active:scale-95 ${
                  soundEnabled
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
                title={soundEnabled ? 'التنبيهات الصوتية مفعّلة' : 'التنبيهات الصوتية مكتومة'}
                aria-label="إعدادات التنبيهات الصوتية"
              >
                {soundEnabled ? (
                  <Bell className="w-4 h-4 text-emerald-400" />
                ) : (
                  <BellOff className="w-4 h-4 text-zinc-500" />
                )}
                {totalPending > 0 && (
                  <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#EA580C] text-white text-[9px] font-black flex items-center justify-center">
                    {totalPending}
                  </span>
                )}
                <span className="hidden sm:inline text-[11px]">الإشعارات</span>
              </button>

              {/* زر الحساب / الأمان والرمز السري */}
              <button
                type="button"
                onClick={() => setIsChangePinOpen(true)}
                className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                title="أمان الحساب والرمز السري"
                aria-label="أمان الحساب والرمز السري"
              >
                <KeyRound className="w-4 h-4 text-[#F5D76E]" />
                <span className="hidden sm:inline text-[11px]">الأمان</span>
              </button>

              {/* زر الخروج الصريح وإنهاء الجلسة الإدارية */}
              {onLogout && (
                <button
                  type="button"
                  id="admin-explicit-logout-btn"
                  onClick={onLogout}
                  className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/90 border border-rose-500/40 hover:border-rose-400 text-rose-200 hover:text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  title="تسجيل الخروج وإنهاء جلسة الإدارة"
                  aria-label="تسجيل الخروج من الإدارة"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline text-[11px]">خروج</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          2. إشعار عائم في حال وجود تنبيه
          ══════════════════════════════════════════════════════════ */}
      {notice && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 py-2.5 px-5 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-700 text-white text-xs sm:text-sm font-black border border-emerald-400/50 shadow-xl flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#F5D76E]" />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-white/80 hover:text-white cursor-pointer mr-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. جسم الصفحة والمحتوى المخصص
          ══════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 lg:p-8 pb-28 md:pb-8">
        {children}
      </main>

      {/* ══════════════════════════════════════════════════════════
          4. شريط التنقل السفلي المخصص لشاشات الهواتف (Mobile Bottom Bar)
          ══════════════════════════════════════════════════════════ */}
      <nav
        aria-label="التنقل بين أدوات الإدارة"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E1B11]/95 backdrop-blur-md border-t-2 border-[#EAB308]/40 px-1 py-1.5 shadow-2xl flex items-center justify-around overflow-x-auto no-scrollbar"
      >
        {/* زر الرجوع المباشر للهاتف إلى لوحة المدير السفلية (Bottom Dashboard) */}
        <button
          type="button"
          id="admin-mobile-back-to-dashboard-btn"
          onClick={handleExit}
          className="relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer flex-1 min-w-[46px] max-w-[64px] min-h-[44px] text-amber-400 hover:text-amber-300 font-bold active:scale-95 group"
          title="الرجوع إلى لوحة التحكم السفلية (Bottom Dashboard)"
          aria-label="الرجوع إلى لوحة التحكم السفلية"
        >
          <div className="relative">
            <LayoutDashboard className="w-4.5 h-4.5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[10px] mt-0.5 leading-tight truncate w-full text-center font-black">
            اللوحة
          </span>
        </button>

        {NAV_ITEMS.map((item) => {
          const isActive = currentRoute === item.id;
          const { Icon } = item;
          const isOrders = item.id === 'orders';

          return (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer flex-1 min-w-[46px] max-w-[64px] min-h-[44px] ${
                isActive
                  ? 'bg-zinc-800 text-[#F5D76E] shadow-xs font-black'
                  : 'text-zinc-400 hover:text-zinc-200 font-bold'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 ${isActive ? item.accentColor : 'opacity-70'}`} />
                {isOrders && totalPending > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#EA580C] text-white text-[8px] font-black flex items-center justify-center animate-pulse">
                    {totalPending}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 leading-tight truncate w-full text-center">
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>


      {/* ══════════════════════════════════════════════════════════
          5. مودال تغيير الرمز السري
          ══════════════════════════════════════════════════════════ */}

      {isChangePinOpen && (
        <ChangePinModal
          isOpen={isChangePinOpen}
          onClose={() => setIsChangePinOpen(false)}
          onSubmit={handleChangePinSubmit}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          6. إشعار طافٍ للطلبات الجديدة الواردة
          ══════════════════════════════════════════════════════════ */}
      <AdminNotificationToast
        newCount={currentRoute === 'orders' ? 0 : newCount}
        onOpenOrders={() => {
          markAsSeen();
          onNavigate('orders');
        }}
        onDismiss={() => {
          markAsSeen();
        }}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    </div>
  );
};
