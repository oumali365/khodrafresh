// ============================================================
// ExitScreen.tsx – الإصدار 2.0
// شاشة الوداع بهوية خضرة الموحّدة
// ============================================================
import React, { useRef } from 'react';
import { ShoppingBag, RefreshCw, Leaf, PhoneCall } from 'lucide-react';
import { STORE_CONFIG } from '../../data/config';

interface ExitScreenProps {
  onReenter: () => void;
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
      ripple.className = 'exitscreen-ripple';
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

export const ExitScreen: React.FC<ExitScreenProps> = ({ onReenter, cartCount, cartTotal }) => {
  return (
    <>
      <style>{`
        @keyframes exitscreenRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .exitscreen-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: exitscreenRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        @keyframes exitscreenLeafGlow {
          0%, 100% { box-shadow: 0 8px 22px rgba(45,106,63,0.30), 0 0 0 0 rgba(234,179,8,0); }
          50%      { box-shadow: 0 12px 30px rgba(45,106,63,0.45), 0 0 0 12px rgba(234,179,8,0.10); }
        }
        .exitscreen-leaf-glow {
          animation: exitscreenLeafGlow 3s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .exitscreen-ripple,
          .exitscreen-leaf-glow { animation: none; }
        }
      `}</style>

      <div
        id="app-exit-screen"
        className="min-h-screen bg-gradient-to-b from-[#FAF8F3] to-[#F5EFE3] flex items-center justify-center p-4 text-right selection:bg-[#EAB308] selection:text-[#1A3D24] font-['Tajawal']"
      >
        <div className="w-full max-w-lg bg-[#FBF9F5] rounded-[32px] border-2 border-[#2D6A3F]/15 shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-300 relative overflow-hidden">

          {/* دوائر ضوئية خفيفة */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#EAB308]/12 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[#2D6A3F]/10 rounded-full blur-3xl pointer-events-none" />

          {/* ════════ الشعار مع توهّج ════════ */}
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] mx-auto flex items-center justify-center border-2 border-[#EAB308]/40 mb-5 exitscreen-leaf-glow">
            <Leaf className="w-10 h-10 text-[#EAB308]" strokeWidth={2.5} />
          </div>

          {/* ════════ العنوان ════════ */}
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A3D24] tracking-tight mb-2 font-['Almarai'] flex items-center justify-center gap-2 flex-wrap">
            شكراً لزيارتك متجر خُضرة
            <span className="inline-block w-2 h-2 rounded-full bg-[#EAB308]" />
          </h1>

          <p className="text-[#5A6B5F] text-sm sm:text-base font-semibold leading-relaxed mb-6">
            نتمنى لك يوماً طيباً ومباركاً.
          </p>

          {/* ════════ تنبيه السلة المحفوظة ════════ */}
          {cartCount > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-[#2D6A3F]/8 border-2 border-[#2D6A3F]/25 text-right flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] flex items-center justify-center shrink-0 border border-[#EAB308]/30">
                <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[#1A3D24]">
                  سلتك ({cartCount} منتجات بقيمة{' '}
                  <span className="text-[#EA580C] tabular-nums" dir="ltr">
                    {cartTotal.toFixed(2)} {STORE_CONFIG.currency}
                  </span>
                  ) محفوظة بأمان
                </p>
                <p className="text-[11px] text-[#5A6B5F] font-semibold mt-0.5">
                  يمكنك العودة في أي وقت لإكمال طلبك بنقرة واحدة!
                </p>
              </div>
            </div>
          )}

          {/* ════════ زر العودة ════════ */}
          <div className="space-y-3">
            <RippleButton
              onClick={onReenter}
              rippleColor="rgba(255,255,255,0.30)"
              ariaLabel="العودة ومتابعة التسوق"
              className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] text-white font-black text-base shadow-[0_4px_14px_rgba(45,106,63,0.35)] hover:shadow-[0_6px_22px_rgba(45,106,63,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#EAB308]/25"
            >
              <RefreshCw className="w-5 h-5 text-[#EAB308] relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">العودة ومتابعة التسوق</span>
            </RippleButton>
          </div>

          {/* ════════ خدمة الزبناء ════════ */}
          <div className="mt-6 pt-5 border-t border-[#2D6A3F]/10 flex items-center justify-center gap-2 text-xs text-[#5A6B5F] font-bold">
            <PhoneCall className="w-3.5 h-3.5 text-[#EA580C]" strokeWidth={2.5} />
            <span>
              خدمة الزبناء:{' '}
              <span className="text-[#1A3D24] tabular-nums" dir="ltr">
                {STORE_CONFIG.whatsappNumber}
              </span>{' '}
              (فاس والنواحي)
            </span>
          </div>
        </div>
      </div>
    </>
  );
};