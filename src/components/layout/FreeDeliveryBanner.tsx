// ============================================================
// FreeDeliveryBanner.tsx – الإصدار 2.0
// نقل أيقونة التوصيل إلى اليمين + زر الإلغاء إلى اليسار
// + هوية خضرة الموحّدة
// ============================================================
import React, { useState, useRef } from 'react';
import { Truck, X, CheckCircle2 } from 'lucide-react';
import { STORE_CONFIG } from '../../data/config';

interface FreeDeliveryBannerProps {
  cartTotal?: number;
}

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  ariaLabel?: string;
}> = ({ onClick, className, children, rippleColor = 'rgba(0,0,0,0.15)', ariaLabel }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'banner-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.background = rippleColor;
      btn.appendChild(ripple);

      window.setTimeout(() => ripple.remove(), 650);
    }
    onClick?.(e);
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

export const FreeDeliveryBanner: React.FC<FreeDeliveryBannerProps> = ({
  cartTotal = 0,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('khodra_free_delivery_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  if (isDismissed) return null;

  const threshold = STORE_CONFIG.freeDeliveryThreshold; // 250 DH
  const remaining = Math.max(0, Number((threshold - cartTotal).toFixed(2)));
  const isFreeUnlocked = cartTotal > threshold;

  const formatAmount = (value: number) => `${value.toFixed(2)} DH`;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      sessionStorage.setItem('khodra_free_delivery_banner_dismissed', 'true');
    } catch {
      // ignore
    }
    setIsDismissed(true);
  };

  return (
    <>
      <style>{`
        @keyframes bannerRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .banner-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: bannerRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        @keyframes bannerCheckPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .banner-check-pop {
          animation: bannerCheckPop 0.6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .banner-ripple,
          .banner-check-pop { animation: none; }
        }
      `}</style>

      <aside
        id="free-delivery-banner-khodra-theme"
        dir="rtl"
        aria-label="بانر التوصيل المجاني"
        className="relative w-full bg-gradient-to-l from-[#FACC15] via-[#FDE68A] to-[#EAB308] text-[#1A3D24] border-b border-[#EAB308]/60 shadow-sm z-40 select-none transition-all duration-300 overflow-hidden"
      >
        {/* خط تزييني سفلي رفيع */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-l from-[#2D6A3F] via-[#3A8152] to-[#2D6A3F] opacity-90" />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">

          {/* ════════ يمين: أيقونة التوصيل ════════ */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-[#2D6A3F]/20 overflow-hidden p-0.5">
              <div className="w-full h-full rounded-[13px] bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] flex items-center justify-center text-white shadow-inner">
                {isFreeUnlocked ? (
                  <CheckCircle2
                    className="w-5 h-5 sm:w-6 sm:h-6 text-[#EAB308] banner-check-pop"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Truck
                    className="w-5 h-5 sm:w-6 sm:h-6 text-[#EAB308]"
                    strokeWidth={2.5}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ════════ الوسط: العبارة ════════ */}
          <div className="min-w-0 flex-1 text-center">
            {isFreeUnlocked ? (
              <p className="text-[#1A3D24] font-black text-sm sm:text-base md:text-[17px] leading-snug font-['Tajawal'] tracking-tight flex items-center justify-center gap-1.5 flex-wrap">
                <span>مبروك! طلبيتك فوق 250 د.م وحصلت على توصيل مجاني لباب دارك 🎉</span>
              </p>
            ) : cartTotal > 0 ? (
              <p className="text-[#1A3D24] font-black text-sm sm:text-base md:text-[17px] leading-snug font-['Tajawal'] tracking-tight">
                توصيل مجاني للطلبات فوق 250 درهماً (أضف{' '}
                <span
                  className="inline-block bg-gradient-to-r from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] px-2 py-0.5 rounded-md font-black tabular-nums shadow-sm border border-[#EAB308]/30"
                  dir="ltr"
                >
                  {formatAmount(remaining > 0 ? remaining : 0.01)}
                </span>
                {' '}للاستفادة من العرض)
              </p>
            ) : (
              <p className="text-[#1A3D24] font-black text-sm sm:text-base md:text-[18px] leading-snug font-['Tajawal'] tracking-tight">
                توصيل مجاني للطلبات فوق{' '}
                <span
                  className="inline-block bg-gradient-to-r from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] px-2 py-0.5 rounded-md font-black tabular-nums shadow-sm border border-[#EAB308]/30"
                  dir="ltr"
                >
                  {formatAmount(threshold)}
                </span>
              </p>
            )}
          </div>

          {/* ════════ يسار: زر الإغلاق ════════ */}
          <RippleButton
            onClick={handleDismiss}
            ariaLabel="إغلاق البانر"
            rippleColor="rgba(45,106,63,0.20)"
            className="group w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#1A3D24]/75 hover:text-[#1A3D24] rounded-full hover:bg-[#2D6A3F]/15 active:scale-90 transition-all cursor-pointer touch-manipulation shrink-0 border border-[#2D6A3F]/20"
          >
            <X
              className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[2.5] group-hover:rotate-90 transition-transform duration-200 relative z-10"
            />
          </RippleButton>

        </div>
      </aside>
    </>
  );
};