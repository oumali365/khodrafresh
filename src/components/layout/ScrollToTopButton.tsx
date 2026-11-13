// ============================================================
// ScrollToTopButton.tsx – الإصدار 2.0
// زر "العودة للأعلى" — الشكل الأمثل لمتجر خُضرة
// دائري + دائرة تقدم ذهبية + تكيف ذكي مع StickyBottomBar والنوافذ
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';

export interface ScrollToTopButtonProps {
  /** المسافة بالبكسل قبل ظهور الزر (افتراضي: 360) */
  threshold?: number;
  /** هل شريط السلة السفلي ظاهر حالياً؟ لضبط الإزاحة السفلية تلقائياً */
  hasStickyBar?: boolean;
  /** إزاحة سفلية مخصصة بالبكسل (اختياري) */
  bottomOffset?: number;
  /** إخفاء الزر مؤقتاً عند فتح النوافذ المنبثقة أو السلة */
  hidden?: boolean;
}

const CIRCLE_RADIUS = 46;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  threshold = 360,
  hasStickyBar = false,
  bottomOffset,
  hidden = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const updateScroll = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight =
          document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress =
          docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;

        setIsVisible(scrollTop > threshold);
        setScrollProgress(progress);
      });
    };

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [threshold]);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!isVisible || hidden) return null;

  // تحديد الموضع السفلي بذكاء حسب وجود شريط السلة السفلي
  const positionClass =
    bottomOffset !== undefined
      ? ''
      : hasStickyBar
      ? 'bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6.25rem+env(safe-area-inset-bottom))]'
      : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]';

  const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - scrollProgress / 100);

  return (
    <button
      type="button"
      id="scroll-to-top-btn"
      onClick={handleScrollToTop}
      aria-label={`العودة إلى أعلى الصفحة (${Math.round(scrollProgress)}%)`}
      title="العودة للأعلى"
      style={
        bottomOffset !== undefined
          ? { bottom: `calc(1rem + ${bottomOffset}px + env(safe-area-inset-bottom))` }
          : undefined
      }
      className={`scroll-top-enter fixed right-3.5 sm:right-5 z-40
        ${positionClass}
        w-12 h-12 sm:w-13 sm:h-13
        rounded-full
        bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24]
        hover:from-[#3A8152] hover:to-[#2D6A3F]
        text-white
        shadow-[0_6px_22px_rgba(45,106,63,0.38)]
        hover:shadow-[0_8px_28px_rgba(45,106,63,0.50)]
        border-2 border-[#EAB308]/50
        flex items-center justify-center
        cursor-pointer active:scale-90
        transition-all duration-300
        touch-manipulation select-none
        group`}
    >
      {/* ═══ دائرة التقدم الذهبية ═══ */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {/* مسار الخلفية */}
        <circle
          cx="50"
          cy="50"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="rgba(234, 179, 8, 0.16)"
          strokeWidth="4"
        />
        {/* مسار التقدم الفعلي */}
        <circle
          cx="50"
          cy="50"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="#EAB308"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-150 ease-linear"
        />
      </svg>

      {/* ═══ أيقونة السهم ═══ */}
      <ChevronUp
        className="w-5 h-5 sm:w-6 sm:h-6 text-[#EAB308] relative z-10
          scroll-top-arrow-bounce
          group-hover:scale-110 group-hover:-translate-y-0.5
          transition-transform duration-200"
        strokeWidth={2.6}
      />
    </button>
  );
};

export default ScrollToTopButton;
