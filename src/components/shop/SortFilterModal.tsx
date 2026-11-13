// ============================================================
// SortFilterModal.tsx – الإصدار 2.0
// نافذة فرز وتصفية المنتجات بهوية خضرة الموحّدة
// ============================================================
import React, { useRef } from 'react';
import {
  X, ArrowDownWideNarrow, ArrowUpWideNarrow,
  PackageCheck, RotateCcw, Check,
} from 'lucide-react';

export type SortOption = 'default' | 'price-asc' | 'price-desc';

interface SortFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onlyInStock: boolean;
  onToggleOnlyInStock: () => void;
  onReset: () => void;
}

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  ariaLabel?: string;
}> = ({ onClick, className, children, rippleColor = 'rgba(255,255,255,0.30)', ariaLabel }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'sort-ripple';
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
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

export const SortFilterModal: React.FC<SortFilterModalProps> = ({
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  onlyInStock,
  onToggleOnlyInStock,
  onReset,
}) => {
  if (!isOpen) return null;

  const hasActiveFilters = sortBy !== 'default' || onlyInStock;

  return (
    <>
      <style>{`
        @keyframes sortRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .sort-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: sortRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .sort-ripple { animation: none; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sort-modal-title"
      >
        {/* خلفية معتمة */}
        <div
          className="fixed inset-0 bg-black/55 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* بطاقة النافذة */}
        <div className="relative w-full max-w-sm bg-[#FBF9F5] rounded-[24px] border-2 border-[#2D6A3F]/15 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 text-right">

          {/* ════════ رأس النافذة ════════ */}
          <div className="relative flex items-center justify-between px-5 py-4 border-b border-[#2D6A3F]/10 bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] text-white overflow-hidden">
            {/* دوائر ضوئية */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#EAB308]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#2D6A3F]/40 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm border border-[#EAB308]/40 flex items-center justify-center shadow-sm">
                <ArrowDownWideNarrow className="w-4 h-4 text-[#EAB308]" strokeWidth={2.5} />
              </div>
              <h3 id="sort-modal-title" className="text-base font-black text-white">
                تصفية المنتجات
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="relative w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/15 hover:bg-white/25 active:scale-90 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer touch-manipulation select-none"
              aria-label="إغلاق النافذة"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* ════════ جسم النافذة ════════ */}
          <div className="p-4 space-y-2.5 bg-[#FBF9F5]">

            {/* المفتاح 1: الأقل سعراً */}
            <button
              type="button"
              id="sort-price-asc-key"
              onClick={() => onSortChange(sortBy === 'price-asc' ? 'default' : 'price-asc')}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-right group touch-manipulation select-none active:scale-[0.98] ${
                sortBy === 'price-asc'
                  ? 'bg-[#2D6A3F]/8 border-[#2D6A3F] shadow-[0_4px_14px_rgba(45,106,63,0.15)]'
                  : 'bg-white hover:bg-[#FAF8F3] border-[#2D6A3F]/15 hover:border-[#2D6A3F]/35'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    sortBy === 'price-asc'
                      ? 'bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] border border-[#EAB308]/30'
                      : 'bg-white text-[#2D6A3F] border-2 border-[#2D6A3F]/20'
                  }`}
                >
                  <ArrowDownWideNarrow className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="block text-sm font-black text-[#1A3D24]">
                    الأقل سعراً
                  </span>
                  <span className="block text-xs text-[#5A6B5F] font-semibold">
                    ترتيب من الأرخص إلى الأعلى سعراً
                  </span>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  sortBy === 'price-asc'
                    ? 'bg-[#EAB308] border-[#EAB308] text-[#1A3D24]'
                    : 'border-[#2D6A3F]/30 bg-white'
                }`}
              >
                {sortBy === 'price-asc' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            {/* المفتاح 2: الأعلى سعراً */}
            <button
              type="button"
              id="sort-price-desc-key"
              onClick={() => onSortChange(sortBy === 'price-desc' ? 'default' : 'price-desc')}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-right group touch-manipulation select-none active:scale-[0.98] ${
                sortBy === 'price-desc'
                  ? 'bg-[#2D6A3F]/8 border-[#2D6A3F] shadow-[0_4px_14px_rgba(45,106,63,0.15)]'
                  : 'bg-white hover:bg-[#FAF8F3] border-[#2D6A3F]/15 hover:border-[#2D6A3F]/35'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    sortBy === 'price-desc'
                      ? 'bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] border border-[#EAB308]/30'
                      : 'bg-white text-[#2D6A3F] border-2 border-[#2D6A3F]/20'
                  }`}
                >
                  <ArrowUpWideNarrow className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="block text-sm font-black text-[#1A3D24]">
                    الأعلى سعراً
                  </span>
                  <span className="block text-xs text-[#5A6B5F] font-semibold">
                    ترتيب من الأعلى سعراً إلى الأرخص
                  </span>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  sortBy === 'price-desc'
                    ? 'bg-[#EAB308] border-[#EAB308] text-[#1A3D24]'
                    : 'border-[#2D6A3F]/30 bg-white'
                }`}
              >
                {sortBy === 'price-desc' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            {/* المفتاح 3: المتوفر فقط */}
            <button
              type="button"
              id="filter-in-stock-key"
              onClick={onToggleOnlyInStock}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-right touch-manipulation select-none active:scale-[0.98] ${
                onlyInStock
                  ? 'bg-[#2D6A3F]/8 border-[#2D6A3F] shadow-[0_4px_14px_rgba(45,106,63,0.15)]'
                  : 'bg-white hover:bg-[#FAF8F3] border-[#2D6A3F]/15 hover:border-[#2D6A3F]/35'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    onlyInStock
                      ? 'bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] border border-[#EAB308]/30'
                      : 'bg-white text-[#2D6A3F] border-2 border-[#2D6A3F]/20'
                  }`}
                >
                  <PackageCheck className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="block text-sm font-black text-[#1A3D24]">
                    المتوفر في المخزون فقط
                  </span>
                  <span className="block text-xs text-[#5A6B5F] font-semibold">
                    إخفاء المنتجات التي نفد مخزونها
                  </span>
                </div>
              </div>

              {/* مفتاح التبديل (Toggle Switch) */}
              <div
                className={`w-12 h-6 rounded-full p-0.5 transition-colors relative flex items-center pointer-events-none ${
                  onlyInStock
                    ? 'bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] border border-[#EAB308]/40'
                    : 'bg-stone-300 border border-stone-400/30'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full shadow-sm transition-transform transform ${
                    onlyInStock
                      ? '-translate-x-6 bg-[#EAB308]'
                      : 'translate-x-0 bg-white'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* ════════ أسفل النافذة ════════ */}
          <div className="px-4 py-3 bg-[#FAF8F3] border-t border-[#2D6A3F]/10 flex items-center gap-2">
            {hasActiveFilters && (
              <RippleButton
                onClick={onReset}
                ariaLabel="إلغاء التصفية"
                rippleColor="rgba(220,38,38,0.20)"
                className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 px-3 rounded-xl border-2 border-rose-200 bg-white hover:bg-rose-50 active:scale-95 text-rose-700 text-xs font-black transition-all cursor-pointer touch-manipulation select-none"
              >
                <RotateCcw className="w-3.5 h-3.5 relative z-10" strokeWidth={2.5} />
                <span className="relative z-10">إلغاء التصفية</span>
              </RippleButton>
            )}

            <RippleButton
              onClick={onClose}
              ariaLabel="تطبيق التصفية"
              rippleColor="rgba(255,255,255,0.30)"
              className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] active:scale-95 text-white font-black text-xs sm:text-sm shadow-[0_4px_14px_rgba(45,106,63,0.30)] hover:shadow-[0_6px_22px_rgba(45,106,63,0.42)] transition-all cursor-pointer text-center touch-manipulation select-none border border-[#EAB308]/25"
            >
              <span className="relative z-10">تطبيق</span>
            </RippleButton>
          </div>
        </div>
      </div>
    </>
  );
};