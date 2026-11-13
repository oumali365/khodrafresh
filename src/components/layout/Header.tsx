// ============================================================
// الملف: Header.tsx – الإصدار 4.1
// رأس المتجر مع قائمة جانبية موحّدة الهوية (أخضر + ذهبي + برتقالي)
// تحسينات: Ripple + ظلال عضوية + أيقونات متناسقة
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Search, Menu, X, Phone, ShieldCheck,
  RefreshCw, Info, Package, Leaf, LogOut,
  ChevronDown, Layers, Check
} from 'lucide-react';
import { STORE_CONFIG } from '../../data/config';
import { ProductCategory } from '../../types';
import { CATEGORIES_CONFIG } from '../../data/mockProducts';

interface HeaderProps {
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  selectedCategory: ProductCategory;
  onSelectCategory: (cat: ProductCategory) => void;
  onOpenPage: (page: 'about' | 'policy' | 'privacy' | null) => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onScrollToBundles?: () => void;
  onOpenExitModal?: () => void;
}

// ═══════ زر Ripple (نفس نمط Hero و CategoryFilter) ═══════
const RippleButton: React.FC<{
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  ariaLabel?: string;
  id?: string;
  ariaExpanded?: boolean;
}> = ({
  onClick,
  className,
  children,
  rippleColor = 'rgba(255,255,255,0.28)',
  ariaLabel,
  id,
  ariaExpanded,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'header-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.background = rippleColor;
      btn.appendChild(ripple);

      window.setTimeout(() => ripple.remove(), 650);
    }
    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      id={id}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  cartTotal,
  onOpenCart,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  selectedCategory,
  onSelectCategory,
  onOpenPage,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  onScrollToBundles,
  onOpenExitModal,
}) => {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(true);

  // ─── إغلاق بزر الهروب ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        onCloseMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, onCloseMenu]);

  // ─── قفل التمرير عند فتح القائمة ───
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // ─── التمرير لصناديق العائلة ───
  const handleScrollToBundles = useCallback(() => {
    onCloseMenu();
    onOpenPage(null);
    if (onScrollToBundles) {
      setTimeout(() => onScrollToBundles(), 120);
    } else {
      setTimeout(() => {
        const el = document.getElementById('family-boxes-section') || document.getElementById('family-bundles-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, [onCloseMenu, onOpenPage, onScrollToBundles]);

  return (
    <>
      {/* ═══════ الأنماط الحركية ═══════ */}
      <style>{`
        @keyframes headerRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .header-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: headerRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        @keyframes headerSlideInLeft {
          0%   { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .header-slide-in-left {
          animation: headerSlideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        @keyframes headerSlideDown {
          0%   { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .header-slide-down {
          animation: headerSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .header-ripple,
          .header-slide-in-left,
          .header-slide-down { animation: none; }
        }
      `}</style>

      {/* ════════ الهيدر الرئيسي ════════ */}
      <header className="sticky top-0 z-50 bg-white/92 backdrop-blur-md border-b border-[#2D6A3F]/12 shadow-[0_2px_10px_rgba(45,106,63,0.05)] transition-all duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-6">

            {/* ── يمين: زر القائمة + الشعار ── */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* زر القائمة — موحّد مع Hero */}
              <RippleButton
                id="main-nav-toggle-btn"
                onClick={onToggleMenu}
                ariaLabel={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة الرئيسية'}
                ariaExpanded={isMenuOpen}
                rippleColor="rgba(255,255,255,0.30)"
                className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#2D6A3F]/35 touch-manipulation select-none cursor-pointer shrink-0 ${
                  isMenuOpen
                    ? 'bg-gradient-to-br from-[#EA580C] to-[#C25E12] shadow-[0_4px_12px_rgba(234,88,12,0.30)]'
                    : 'bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] shadow-[0_4px_12px_rgba(45,106,63,0.24)] hover:from-[#3A8152] hover:to-[#2D6A3F]'
                }`}
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5 relative z-10" strokeWidth={2.5} />
                ) : (
                  <Menu className="w-5 h-5 relative z-10" strokeWidth={2.5} />
                )}
              </RippleButton>

              {/* الشعار */}
              <button
                type="button"
                id="store-logo-btn"
                onClick={() => onOpenPage(null)}
                className="group cursor-pointer text-right touch-manipulation select-none active:opacity-85 transition-opacity min-w-0"
              >
                <div className="flex flex-col justify-center">
                  <span className="text-2xl sm:text-3xl font-black text-[#1A3D24] group-hover:text-[#2D6A3F] font-['Almarai'] tracking-tight leading-none transition-colors flex items-center gap-1.5">
                    {STORE_CONFIG.storeName}
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EAB308] mb-4 sm:mb-5 transition-transform duration-300 group-hover:scale-125" />
                  </span>
                  <span className="text-[11px] sm:text-xs text-[#5A6B5F] font-bold mt-1 tracking-normal hidden xs:block sm:block truncate">
                    خضر وفواكه طازجة لباب دارك
                  </span>
                </div>
              </button>
            </div>

            {/* ── وسط: حقل البحث (سطح المكتب) ── */}
            <form onSubmit={onSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full group">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6B5F] group-focus-within:text-[#2D6A3F] group-focus-within:scale-110 transition-all duration-200 pointer-events-none" strokeWidth={2.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="ابحث عن خضار، فواكه، ألبان..."
                  className="w-full pr-10 pl-9 py-2.5 bg-[#FAF8F3] border border-[#2D6A3F]/15 rounded-2xl text-sm text-[#112616] placeholder-[#8A8170] focus:outline-none focus:bg-white focus:border-[#2D6A3F]/50 focus:ring-2 focus:ring-[#2D6A3F]/12 focus:shadow-[0_4px_14px_rgba(45,106,63,0.08)] transition-all duration-200 font-['Tajawal'] font-medium shadow-2xs hover:bg-white hover:border-[#2D6A3F]/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B5F] hover:text-[#EA580C] text-xs p-1.5 rounded-full hover:bg-[#EA580C]/10 active:scale-90 transition-all touch-manipulation select-none cursor-pointer"
                    aria-label="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </form>

            {/* ── يسار: بحث جوال + واتساب + السلة ── */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* بحث الجوال */}
              <button
                type="button"
                id="mobile-search-toggle-btn"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className={`md:hidden w-10 h-10 min-w-[40px] min-h-[40px] rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-90 touch-manipulation select-none cursor-pointer shrink-0 border-2 ${
                  showMobileSearch
                    ? 'bg-[#EA580C] border-[#EA580C] text-white shadow-[0_4px_12px_rgba(234,88,12,0.28)]'
                    : 'bg-white border-[#2D6A3F]/25 text-[#2D6A3F] hover:bg-[#FAF8F3] hover:border-[#2D6A3F]/50'
                }`}
                aria-label="بحث عن منتج"
              >
                {showMobileSearch ? (
                  <X className="w-5 h-5" strokeWidth={2.5} />
                ) : (
                  <Search className="w-5 h-5" strokeWidth={2.5} />
                )}
              </button>

              {/* واتساب */}
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappCleanNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#25D366]/12 text-[#145A25] border border-[#25D366]/35 hover:bg-[#25D366]/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 text-xs font-black font-['Almarai'] shadow-2xs touch-manipulation select-none"
              >
                <Phone className="w-3.5 h-3.5 fill-current" />
                <span>واتساب</span>
              </a>

              {/* زر السلة */}
              <RippleButton
                id="header-open-cart-btn"
                onClick={onOpenCart}
                ariaLabel={`سلة المشتريات (${cartCount} منتجات)`}
                rippleColor="rgba(255,255,255,0.30)"
                className="flex items-center gap-2 px-3 sm:px-5 py-2.5 min-h-[44px] rounded-2xl bg-gradient-to-l from-[#EA580C] to-[#C25E12] hover:from-[#F97316] hover:to-[#EA580C] text-white shadow-[0_4px_12px_rgba(234,88,12,0.26)] hover:shadow-[0_6px_18px_rgba(234,88,12,0.36)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 font-extrabold font-['Almarai'] touch-manipulation select-none cursor-pointer shrink-0 border border-[#FACC15]/25"
              >
                <div className="relative z-10">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                  {cartCount > 0 && (
                    <span className="absolute -top-2.5 -left-2.5 min-w-[22px] h-[22px] px-1 rounded-full bg-[#1A3D24] text-[#EAB308] text-[11px] font-black flex items-center justify-center border-2 border-white shadow-md">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none text-right relative z-10">
                  <span className="text-[10px] text-amber-100 font-bold">السلة</span>
                  <span className="text-xs sm:text-sm font-black tabular-nums" dir="ltr">
                    {cartTotal.toFixed(2)} {STORE_CONFIG.currency}
                  </span>
                </div>
              </RippleButton>
            </div>
          </div>

          {/* ── حقل البحث الجوّال ── */}
          {showMobileSearch && (
            <div className="md:hidden pb-3 pt-1 header-slide-down">
              <form onSubmit={onSearchSubmit} className="relative w-full">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6B5F] pointer-events-none" strokeWidth={2.5} />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="ابحث عن خضار، فواكه، ألبان..."
                  className="w-full pr-10 pl-9 py-3 bg-white border-2 border-[#2D6A3F]/30 rounded-2xl text-sm text-[#112616] placeholder-[#8A8170] focus:outline-none focus:border-[#2D6A3F] focus:ring-2 focus:ring-[#2D6A3F]/15 transition-all font-['Tajawal'] font-medium shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B5F] hover:text-[#EA580C] text-xs p-1.5 rounded-full hover:bg-[#EA580C]/10 transition-colors"
                    aria-label="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </header>

      {/* ════════ القائمة الجانبية ════════ */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* الخلفية المعتمة */}
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-sm transition-opacity"
            onClick={onCloseMenu}
            aria-hidden="true"
          />

          {/* لوحة القائمة */}
          <div className="relative ml-auto w-full max-w-[340px] sm:max-w-xs bg-[#FBF9F5] h-full shadow-2xl flex flex-col z-50 overflow-hidden header-slide-in-left border-l border-[#2D6A3F]/15">

            {/* ─── رأس القائمة ─── */}
            <div className="relative px-4 py-4 bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] text-white flex items-center justify-between shadow-sm shrink-0 border-b border-[#0A1A0F]/40">
              {/* دوائر ضوئية خفيفة */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#EAB308]/12 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#2D6A3F]/30 rounded-full blur-2xl pointer-events-none" />

              <div className="relative flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
                  <Leaf className="w-4 h-4 text-[#EAB308]" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="font-black text-base font-['Almarai'] block leading-tight text-white">
                    {STORE_CONFIG.storeName}
                  </span>
                  <span className="text-[11px] text-emerald-100/80 font-medium block">
                    تسوق الخضر والفواكه الطازجة
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="menu-close-btn"
                onClick={onCloseMenu}
                className="relative w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white transition-all cursor-pointer touch-manipulation select-none border border-white/15"
                aria-label="إغلاق القائمة"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* ─── المحتوى ─── */}
            <div className="p-3.5 sm:p-4 flex-1 overflow-y-auto no-scrollbar space-y-3.5">

              {/* ═══════ 1. قائمة الفئات المنسدلة ═══════ */}
              <div className="rounded-2xl bg-white border border-[#2D6A3F]/12 shadow-sm overflow-hidden">
                <button
                  type="button"
                  id="categories-accordion-trigger"
                  onClick={() => setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-l from-[#FAF8F3] to-white hover:bg-[#F4EFE3] active:bg-[#ECE5D6] text-right transition-colors cursor-pointer select-none group touch-manipulation"
                  aria-expanded={isCategoriesDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#2D6A3F]/10 border border-[#2D6A3F]/20 flex items-center justify-center text-[#2D6A3F] shrink-0 group-hover:bg-[#2D6A3F] group-hover:text-[#EAB308] transition-colors">
                      <Layers className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[13px] font-black text-[#1A3D24] font-['Almarai'] block leading-tight">
                        اكتشف فئات متجر خضرة
                      </span>
                      <span className="text-[11px] text-[#5A6B5F] font-medium block mt-0.5">
                        عرض فئات المتجر
                      </span>
                    </div>
                  </div>

                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[#5A6B5F] transition-transform duration-200 shrink-0 ${isCategoriesDropdownOpen ? 'rotate-180 text-[#2D6A3F]' : ''}`}>
                    <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </button>

                {isCategoriesDropdownOpen && (
                  <div className="p-2 pt-1 border-t border-[#2D6A3F]/8 bg-[#FAF8F3]/60 space-y-1 header-slide-down">
                    {CATEGORIES_CONFIG.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          id={`drawer-category-item-${cat.id}`}
                          onClick={() => {
                            onSelectCategory(cat.id);
                            onCloseMenu();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl text-right font-['Tajawal'] cursor-pointer touch-manipulation select-none transition-all ${
                            isSelected
                              ? 'bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] text-white shadow-[0_3px_10px_rgba(45,106,63,0.25)] font-black'
                              : 'hover:bg-white active:bg-[#EFE8DC] text-[#112616] hover:text-[#1A3D24] font-bold text-xs sm:text-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border ${
                              isSelected
                                ? 'bg-white/15 border-white/20 text-white'
                                : 'bg-white border-[#2D6A3F]/12'
                            }`}>
                              {cat.icon}
                            </span>
                            <span className="truncate">{cat.name}</span>
                          </div>

                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#EAB308] text-[#1A3D24] flex items-center justify-center shrink-0 shadow-sm">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ═══════ 2. صناديق العائلة ═══════ */}
              <div className="rounded-2xl bg-white border border-[#2D6A3F]/12 shadow-sm overflow-hidden">
                <button
                  type="button"
                  id="drawer-family-boxes-btn"
                  onClick={handleScrollToBundles}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-l from-[#FAF8F3] to-white hover:bg-[#F4EFE3] active:bg-[#ECE5D6] text-[#112616] transition-colors text-right font-['Tajawal'] cursor-pointer touch-manipulation select-none group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#EA580C]/10 border border-[#EA580C]/20 flex items-center justify-center text-[#EA580C] shrink-0 group-hover:bg-[#EA580C] group-hover:text-white transition-colors">
                      <Package className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div className="text-right min-w-0">
                      <span className="block text-[13px] font-black text-[#1A3D24] truncate font-['Almarai'] leading-tight">
                        صناديق العائلة
                      </span>
                      <span className="text-[11px] text-[#5A6B5F] font-medium block mt-0.5">
                        سلات أسبوعية متكاملة بأسعار مميزة
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-[#8A8170] group-hover:text-[#EA580C] transition-colors font-bold pr-1">
                    ←
                  </span>
                </button>
              </div>

              {/* ═══════ 3. روابط مهمة ═══════ */}
              <div className="rounded-2xl bg-white border border-[#2D6A3F]/12 p-3 shadow-sm">
                <div className="text-[11px] font-black text-[#5A6B5F] uppercase tracking-wider mb-2 font-['Almarai'] select-none px-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
                  <span>روابط مهمة</span>
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    id="drawer-about-link"
                    onClick={() => { onOpenPage('about'); onCloseMenu(); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl hover:bg-[#FAF8F3] active:bg-[#EFE8DC] text-[#112616] font-bold text-xs sm:text-sm text-right font-['Tajawal'] cursor-pointer touch-manipulation select-none transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#2D6A3F]/10 border border-[#2D6A3F]/15 flex items-center justify-center text-[#2D6A3F]">
                        <Info className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                      <span>من نحن</span>
                    </div>
                    <span className="text-xs text-[#8A8170] group-hover:text-[#2D6A3F] font-bold">←</span>
                  </button>

                  <button
                    type="button"
                    id="drawer-policy-link"
                    onClick={() => { onOpenPage('policy'); onCloseMenu(); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl hover:bg-[#FAF8F3] active:bg-[#EFE8DC] text-[#112616] font-bold text-xs sm:text-sm text-right font-['Tajawal'] cursor-pointer touch-manipulation select-none transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#EA580C]/10 border border-[#EA580C]/15 flex items-center justify-center text-[#EA580C]">
                        <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                      <span>سياسة الإرجاع</span>
                    </div>
                    <span className="text-xs text-[#8A8170] group-hover:text-[#EA580C] font-bold">←</span>
                  </button>

                  <button
                    type="button"
                    id="drawer-privacy-link"
                    onClick={() => { onOpenPage('privacy'); onCloseMenu(); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl hover:bg-[#FAF8F3] active:bg-[#EFE8DC] text-[#112616] font-bold text-xs sm:text-sm text-right font-['Tajawal'] cursor-pointer touch-manipulation select-none transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#2D6A3F]/10 border border-[#2D6A3F]/15 flex items-center justify-center text-[#2D6A3F]">
                        <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                      <span>سياسة الخصوصية والأمان</span>
                    </div>
                    <span className="text-xs text-[#8A8170] group-hover:text-[#2D6A3F] font-bold">←</span>
                  </button>
                </div>
              </div>

              {/* ═══════ 4. زر الخروج ═══════ */}
              {onOpenExitModal && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    id="drawer-exit-app-btn"
                    onClick={() => {
                      onCloseMenu();
                      onOpenExitModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 min-h-[40px] rounded-xl hover:bg-rose-50 text-[#5A6B5F] hover:text-rose-700 font-bold text-xs text-right font-['Tajawal'] cursor-pointer touch-manipulation select-none transition-colors border border-transparent hover:border-rose-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500">
                        <LogOut className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </div>
                      <span>الخروج من التطبيق</span>
                    </div>
                    <span className="text-[10px] text-stone-400">إغلاق الجلسة</span>
                  </button>
                </div>
              )}
            </div>

            {/* ─── تذييل ─── */}
            <div className="p-3 bg-[#F4EFE3] border-t border-[#2D6A3F]/12 text-right shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                <p className="text-[11px] sm:text-xs text-[#1A3D24] font-['Tajawal'] font-bold">
                  توصيل يومي لكافة أحياء فاس من 09:00 إلى 21:00
                </p>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};