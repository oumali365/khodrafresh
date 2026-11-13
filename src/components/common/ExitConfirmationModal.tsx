// ============================================================
// ExitConfirmationModal.tsx – الإصدار 2.0
// نافذة تأكيد الخروج بهوية خضرة الموحّدة
// ============================================================
import React, { useEffect, useRef } from 'react';
import { LogOut, ShoppingBag, ShieldCheck, Sparkles } from 'lucide-react';
import { STORE_CONFIG } from '../../data/config';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  cartCount: number;
  cartTotal: number;
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
      ripple.className = 'exit-ripple';
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

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
  cartCount,
  cartTotal,
}) => {
  // ─── إغلاق بمفتاح Escape ───
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ─── منع تمرير الصفحة ───
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes exitRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .exit-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: exitRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        @keyframes exitWarningPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
        .exit-warning-pulse {
          animation: exitWarningPulse 1.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .exit-ripple,
          .exit-warning-pulse { animation: none; }
        }
      `}</style>

      <div
        id="exit-confirmation-dialog"
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
      >
        {/* الخلفية المعتمة */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* بطاقة التأكيد */}
        <div className="relative bg-[#FBF9F5] border-2 border-[#2D6A3F]/15 w-full max-w-md rounded-[28px] shadow-2xl z-10 overflow-hidden text-right p-5 sm:p-6 animate-in zoom-in-95 duration-200">

          {/* دوائر ضوئية خفيفة */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#EAB308]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[#2D6A3F]/8 rounded-full blur-3xl pointer-events-none" />

          {/* ════════ الأيقونة العلوية ════════ */}
          <div className="relative flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] flex items-center justify-center shadow-[0_8px_22px_rgba(45,106,63,0.35)] border-2 border-[#EAB308]/40">
                <LogOut className="w-8 h-8 text-[#EAB308] translate-x-0.5" strokeWidth={2.5} />
              </div>
              {/* شارة تنبيه ذهبية نابضة */}
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-[#FACC15] to-[#EAB308] border-2 border-[#FBF9F5] flex items-center justify-center text-[#1A3D24] text-[11px] font-black shadow-md exit-warning-pulse">
                !
              </span>
            </div>
          </div>

          {/* ════════ العنوان والرسالة ════════ */}
          <div className="text-center mb-5 relative z-10">
            <h2
              id="exit-modal-title"
              className="text-xl sm:text-2xl font-black text-[#1A3D24] tracking-tight mb-2 font-['Almarai'] flex items-center justify-center gap-2 flex-wrap"
            >
              هل تريد الخروج من التطبيق؟
              <span className="inline-block w-2 h-2 rounded-full bg-[#EAB308]" />
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6B5F] font-semibold leading-relaxed font-['Tajawal']">
              يسعدنا دائماً وجودك معنا في متجر خُضرة وخدمتك بأفضل المنتجات الطازجة في فاس والنواحي.
            </p>
          </div>

          {/* ════════ بطاقة حالة السلة ════════ */}
          {cartCount > 0 ? (
            <div className="relative z-10 mb-5 p-3.5 rounded-2xl bg-[#2D6A3F]/8 border-2 border-[#2D6A3F]/25 text-right">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] flex items-center justify-center shrink-0 border border-[#EAB308]/30">
                  <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <span className="text-xs font-black text-[#1A3D24]">
                  لديك {cartCount} {cartCount === 1 ? 'منتج' : 'منتجات'} في سلتك
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#5A6B5F] font-bold leading-relaxed pr-9.5">
                المجموع:{' '}
                <span className="font-black text-[#EA580C] tabular-nums" dir="ltr">
                  {cartTotal.toFixed(2)} {STORE_CONFIG.currency}
                </span>{' '}
                — سلتك ستبقى محفوظة تلقائياً للعودة في أي وقت!
              </p>
            </div>
          ) : (
            <div className="relative z-10 mb-5 p-3.5 rounded-2xl bg-[#FEF3C7]/60 border-2 border-[#EAB308]/40 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FACC15] to-[#EAB308] text-[#1A3D24] flex items-center justify-center shrink-0 font-black text-base border border-white/60">
                🌿
              </span>
              <p className="text-xs text-[#92400E] font-bold">
                الخضار والفواكه الطازجة متوفرة يومياً مع التوصيل السريع لباب بيتك.
              </p>
            </div>
          )}

          {/* ════════ الأزرار ════════ */}
          <div className="relative z-10 space-y-2.5">

            {/* الزر الرئيسي: البقاء */}
            <RippleButton
              onClick={onClose}
              rippleColor="rgba(255,255,255,0.30)"
              ariaLabel="متابعة التسوق والبقاء بالمتجر"
              className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] text-white font-black text-sm shadow-[0_4px_14px_rgba(45,106,63,0.35)] hover:shadow-[0_6px_22px_rgba(45,106,63,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#EAB308]/25"
            >
              <Sparkles className="w-4 h-4 text-[#EAB308] relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">متابعة التسوق والبقاء بالمتجر</span>
            </RippleButton>

            {/* الزر الثانوي: تأكيد الخروج */}
            <RippleButton
              onClick={onConfirmExit}
              rippleColor="rgba(120,113,99,0.20)"
              ariaLabel="تأكيد الخروج من التطبيق"
              className="w-full min-h-[46px] py-2.5 px-5 rounded-2xl bg-white hover:bg-[#FAF8F3] text-[#5A6B5F] hover:text-[#1A3D24] font-bold text-xs sm:text-sm border-2 border-[#2D6A3F]/15 hover:border-[#2D6A3F]/35 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4 text-[#EA580C] relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">نعم، الخروج من التطبيق</span>
            </RippleButton>
          </div>

          {/* ════════ شارة تطمين ════════ */}
          <div className="relative z-10 mt-4 pt-3 border-t border-[#2D6A3F]/10 flex items-center justify-center gap-1.5 text-[11px] text-[#5A6B5F] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A3F]" strokeWidth={2.5} />
            <span>بياناتك وسلتك محفوظة ومؤمنة دائماً</span>
          </div>
        </div>
      </div>
    </>
  );
};