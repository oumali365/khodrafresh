// ============================================================
// CheckoutSecuritySubmit.tsx – الإصدار 2.0
// هوية خضرة الموحّدة + الحفاظ على كل وظائف الأمان
// ============================================================
import React, { useRef } from 'react';
import {
  Clock,
  ShieldAlert,
  AlertCircle,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react';
import { TurnstileWidget } from '../common/TurnstileWidget';

interface CheckoutSecuritySubmitProps {
  isSubmitting: boolean;
  cooldown: { inCooldown: boolean; remainingFormatted?: string };
  rateLimit: { allowed: boolean; remaining?: number };
  errors: Record<string, string>;
  grandTotal: number;
  onTurnstileVerify: (token: string) => void;
  isZoneRejected?: boolean;
  isBelowMinOrder?: boolean;
  minOrderAmount?: number;
}

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  type?: 'button' | 'submit';
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
}> = ({ type = 'button', disabled, className, children, rippleColor = 'rgba(255,255,255,0.30)' }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'checkout-submit-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.background = rippleColor;
      btn.appendChild(ripple);

      window.setTimeout(() => ripple.remove(), 650);
    }
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

export const CheckoutSecuritySubmit: React.FC<CheckoutSecuritySubmitProps> = ({
  isSubmitting,
  cooldown,
  rateLimit,
  errors,
  grandTotal,
  onTurnstileVerify,
  isZoneRejected = false,
  isBelowMinOrder = false,
  minOrderAmount = 70,
}) => {
  return (
    <>
      <style>{`
        @keyframes checkoutSubmitRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .checkout-submit-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: checkoutSubmitRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .checkout-submit-ripple { animation: none; }
        }
      `}</style>

      <div className="pt-3 border-t-2 border-[#2D6A3F]/10 space-y-3">

        {/* ════════ Turnstile ════════ */}
        <TurnstileWidget onVerify={onTurnstileVerify} />

        {/* ════════ تنبيه فترة التهدئة ════════ */}
        {cooldown.inCooldown && (
          <div className="p-3.5 rounded-2xl bg-[#FEF3C7]/60 border-2 border-[#EAB308]/50 text-[#92400E] text-xs font-bold flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5 animate-pulse" strokeWidth={2.5} />
            <div className="space-y-0.5">
              <p className="font-black text-[#1A3D24] text-sm">
                تحقق أمني بسيط ({cooldown.remainingFormatted})
              </p>
              <p className="text-[#92400E] text-[11px] leading-relaxed font-semibold">
                لحمايتك وتفادي تكرار تسجيل نفس الطلب، يُرجى الانتظار، أو تواصل معنا عبر واتساب إذا أردت تعديل طلبك السابق.
              </p>
            </div>
          </div>
        )}

        {/* ════════ تنبيه تجاوز معدل الطلبات ════════ */}
        {!rateLimit.allowed && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="space-y-0.5">
              <p className="font-black text-rose-950 text-sm">
                بلغت الحد الأقصى (3 طلبات خلال ساعة)
              </p>
              <p className="text-rose-800 text-[11px] leading-relaxed font-semibold">
                لحماية المتجر من الطلبات المتكررة، تم منع إرسال أي طلب جديد، يمكنك التواصل معنا عبر واتساب للمساعدة.
              </p>
            </div>
          </div>
        )}

        {/* ════════ رسائل الخطأ العامة ════════ */}
        {errors.security && (
          <div className="p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-800 text-xs font-black flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" strokeWidth={2.5} />
            <span>{errors.security}</span>
          </div>
        )}

        {errors.cart && (
          <div className="p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-800 text-xs font-black flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" strokeWidth={2.5} />
            <span>{errors.cart}</span>
          </div>
        )}

        {/* ════════ زر التأكيد الرئيسي ════════ */}
        <RippleButton
          type="submit"
          disabled={isSubmitting || cooldown.inCooldown || !rateLimit.allowed || isZoneRejected || isBelowMinOrder}
          rippleColor="rgba(255,255,255,0.30)"
          className="w-full min-h-[56px] py-4 px-4 rounded-2xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] text-white font-black text-base shadow-[0_4px_14px_rgba(45,106,63,0.35)] hover:shadow-[0_6px_22px_rgba(45,106,63,0.45)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer border border-[#EAB308]/25"
        >
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 border-2 border-[#EAB308] border-t-transparent rounded-full animate-spin relative z-10" />
              <span className="relative z-10">جارٍ التحقق وتأكيد الطلب بأمان...</span>
            </>
          ) : isBelowMinOrder ? (
            <>
              <ShoppingBag className="w-5 h-5 text-[#F5D76E] relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">أكمل الحد الأدنى للطلب ({minOrderAmount} DH شامل التوصيل)</span>
            </>
          ) : isZoneRejected ? (
            <>
              <AlertCircle className="w-5 h-5 text-rose-300 relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">تأكيد الطلب معطل (خارج نطاق فاس)</span>
            </>
          ) : cooldown.inCooldown ? (
            <>
              <Clock className="w-5 h-5 text-[#EAB308] relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">يرجى الانتظار ({cooldown.remainingFormatted})</span>
            </>
          ) : !rateLimit.allowed ? (
            <>
              <ShieldAlert className="w-5 h-5 text-rose-300 relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">تجاوزت الحد المسموح (3/ساعة)</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5 text-[#EAB308] relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">تأكيد الدفع</span>
              <span className="px-3 py-1 rounded-xl bg-white/15 text-[#EAB308] text-sm font-black tabular-nums relative z-10 border border-[#EAB308]/25" dir="ltr">
                {grandTotal.toFixed(2)} DH
              </span>
            </>
          )}
        </RippleButton>

        {/* ════════ ملاحظة الأمان ════════ */}
        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#5A6B5F] font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A3F] shrink-0" strokeWidth={2.5} />
          <span>يتم استخدام معلوماتك بشكل آمن لتوصيل الطلب</span>
        </div>
      </div>
    </>
  );
};