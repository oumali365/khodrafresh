// ============================================================
// الملف: Hero.tsx – الإصدار 4.9
// بطاقات الهيرو مع تمرير يدوي أفقي
// تحسينات: هامش علوي مضغوط + بطاقات ومحتوى أكبر بقليل
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowDown,
  Package,
  Leaf,
} from 'lucide-react';
import { STORE_CONFIG } from '../../data/config';
import { ProductCategory } from '../../types';

export const HERO_PUBLIC_IMAGES: Record<string, { primary: string; fallback: string }> = {
  slide1: {
    primary: '/images/hero-images/hero-1.webp',
    fallback: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&auto=format&fit=crop&q=80',
  },
  slide2: {
    primary: '/images/hero-images/hero-2.webp',
    fallback: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=1400&auto=format&fit=crop&q=80',
  },
};

const STORAGE_KEY = 'hero:lastActiveSlideIndex';

const HeroImageDisplay: React.FC<{
  primarySrc: string;
  fallbackSrc: string;
  alt: string;
  eager?: boolean;
  parallaxOffset?: number;
}> = ({ primarySrc, fallbackSrc, alt, eager = false, parallaxOffset = 0 }) => {
  const [src, setSrc] = useState(primarySrc);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (src !== fallbackSrc && fallbackSrc) {
      setSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#163920] to-[#0A180E]" />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      {...(eager ? ({ fetchPriority: 'high' } as any) : {})}
      onError={handleError}
      style={{
        transform: `translateX(${parallaxOffset}px) scale(1.12)`,
        transition: 'transform 0.15s ease-out',
        willChange: 'transform',
      }}
      className="w-full h-full object-cover object-center"
    />
  );
};

const RippleButton: React.FC<{
  onClick?: () => void;
  className: string;
  id?: string;
  children: React.ReactNode;
  rippleColor?: string;
}> = ({ onClick, className, id, children, rippleColor = 'rgba(45,106,63,0.28)' }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'hero-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.background = rippleColor;
      btn.appendChild(ripple);

      window.setTimeout(() => {
        ripple.remove();
      }, 650);
    }
    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      id={id}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

interface HeroProps {
  onSelectCategory: (cat: ProductCategory) => void;
  onScrollToCatalog: () => void;
  onScrollToBundles?: () => void;
}

const HERO_SLIDES = [
  {
    id: 'catalog-slide',
    image: HERO_PUBLIC_IMAGES.slide1.primary,
    fallbackImage: HERO_PUBLIC_IMAGES.slide1.fallback,
    badge: 'طراوة يومية مضمونة',
    title: 'خضار وفواكه طازجة،',
    highlight: 'مباشرة لباب دارك',
    description:
      'خضر وفواكه تُقطف يومياً وتوصل مباشرة لباب دارك، بجودة مضمونة وثقة كاملة.',
    primaryCTA: 'catalog' as const,
  },
  {
    id: 'bundles-slide',
    image: HERO_PUBLIC_IMAGES.slide2.primary,
    fallbackImage: HERO_PUBLIC_IMAGES.slide2.fallback,
    badge: 'باقات التوفير الأسبوعية',
    title: 'صناديق عائلة خُضرة،',
    highlight: 'وفّر وقتك وفلوسك',
    description:
      'اختر صندوقك الأسبوعي المناسب لعائلتك، واستلم خضراً طازجة بسعر ثابت وجودة مضمونة.',
    primaryCTA: 'bundles' as const,
  },
];

const PARALLAX_MAX = 22;
const FOCUS_PULSE_MS = 700;

const readStoredIndex = (): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const idx = parseInt(raw, 10);
    return Number.isInteger(idx) && idx >= 0 && idx < HERO_SLIDES.length ? idx : 0;
  } catch {
    return 0;
  }
};

export const Hero: React.FC<HeroProps> = ({
  onSelectCategory: _onSelectCategory,
  onScrollToCatalog,
  onScrollToBundles,
}) => {
  const initialIndex = readStoredIndex();
  const [activeSlideIndex, setActiveSlideIndex] = useState(initialIndex);
  const [offsets, setOffsets] = useState<number[]>(() => HERO_SLIDES.map(() => 0));
  const [pulsingIndex, setPulsingIndex] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);
  const prevActiveRef = useRef(initialIndex);
  const didInitialRestoreRef = useRef(false);

  const updateLayout = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('article');
    if (!cards.length) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIdx = 0;
    let minDiff = Infinity;
    const newOffsets: number[] = [];

    cards.forEach((card, idx) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const diff = cardCenter - containerCenter;

      const ratio = Math.max(-1, Math.min(1, diff / containerRect.width));
      newOffsets[idx] = -ratio * PARALLAX_MAX;

      const absDiff = Math.abs(diff);
      if (absDiff < minDiff) {
        minDiff = absDiff;
        closestIdx = idx;
      }
    });

    setOffsets(newOffsets);
    setActiveSlideIndex((prev) => (prev !== closestIdx ? closestIdx : prev));
  };

  const handleScroll = () => {
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(updateLayout);
  };

  useEffect(() => {
    if (prevActiveRef.current === activeSlideIndex) return;
    prevActiveRef.current = activeSlideIndex;

    try {
      window.localStorage.setItem(STORAGE_KEY, String(activeSlideIndex));
    } catch {
      /* تجاهل */
    }

    setPulsingIndex(activeSlideIndex);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => {
      setPulsingIndex(null);
    }, FOCUS_PULSE_MS);
  }, [activeSlideIndex]);

  useEffect(() => {
    if (!didInitialRestoreRef.current && scrollContainerRef.current) {
      didInitialRestoreRef.current = true;
      const idx = readStoredIndex();
      if (idx > 0) {
        const container = scrollContainerRef.current;
        const cards = container.querySelectorAll('article');
        const card = cards[idx] as HTMLElement | undefined;
        if (card) {
          const containerRect = container.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          const deltaX = (cardRect.left + cardRect.width / 2) - (containerRect.left + containerRect.width / 2);
          container.scrollLeft += deltaX;
        }
      }
    }

    requestAnimationFrame(updateLayout);

    return () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToSlide = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('article');
    if (cards[index]) {
      const card = cards[index] as HTMLElement;
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const deltaX = (cardRect.left + cardRect.width / 2) - (containerRect.left + containerRect.width / 2);

      container.scrollBy({
        left: deltaX,
        behavior: 'smooth',
      });
      setActiveSlideIndex(index);
    }
  }, []);

  return (
    <section
      id="hero-section"
      // ✅ هامش علوي مضغوط (كان pt-8/12/16)
      className="relative overflow-hidden pt-2 sm:pt-3 lg:pt-4 pb-10 sm:pb-14 lg:pb-16 px-3 sm:px-6 lg:px-8 scroll-mt-20"
      aria-label="الواجهة الرئيسية للمتجر"
    >
      <style>{`
        @keyframes heroFadeInRight {
          0%   { opacity: 0; transform: translateX(60px) scale(0.97); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        .hero-fade-in-right {
          animation: heroFadeInRight 0.85s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          will-change: opacity, transform;
        }

        @keyframes heroFocusPulse {
          0%   { opacity: 1; }
          35%  { opacity: 0.88; }
          100% { opacity: 1; }
        }
        .hero-focus-pulse {
          animation: heroFocusPulse ${FOCUS_PULSE_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes heroRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .hero-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: heroRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        .hero-spacer {
          flex-shrink: 0;
          width: calc(50% - 46vw - 1rem);
        }
        @media (min-width: 640px) {
          .hero-spacer {
            width: calc(50% - 200px - 1.5rem);
          }
        }
        @media (min-width: 768px) {
          .hero-spacer { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-fade-in-right,
          .hero-focus-pulse,
          .hero-ripple { animation: none; }
        }
      `}</style>

      <div className="relative max-w-3xl mx-auto">
        {/* ─── حاوية البطاقات ─── */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex flex-row md:grid md:grid-cols-2 gap-4 sm:gap-6 overflow-x-auto md:overflow-x-visible py-1.5 md:py-0 snap-x snap-mandatory md:snap-none overscroll-x-contain no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="hero-spacer" aria-hidden="true" />

          {HERO_SLIDES.map((slide, index) => {
            const isActive = activeSlideIndex === index;
            const isPulsing = pulsingIndex === index;

            return (
              <article
                key={slide.id}
                style={{ animationDelay: `${index * 150}ms` }}
                // ✅ إزالة الظل الزائد + تفتيح طبقة التعتيم لإبراز الصور الطبيعية
                className={`hero-fade-in-right group relative w-[92vw] max-w-[380px] sm:w-[400px] md:w-auto md:max-w-none shrink-0 snap-center rounded-3xl min-h-[450px] sm:min-h-[500px] lg:min-h-[520px] p-5 sm:p-6 lg:p-7 border-2 text-center overflow-hidden flex flex-col justify-between select-none transition-all duration-300 ${
                  isActive
                    ? 'border-[#2D6A3F] shadow-none'
                    : 'border-[#2D6A3F]/35 hover:border-[#2D6A3F]/65 shadow-none'
                }`}
              >
                {/* ════════ صورة الخلفية (Parallax) ════════ */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <HeroImageDisplay
                    primarySrc={slide.image}
                    fallbackSrc={slide.fallbackImage}
                    alt={slide.title}
                    eager={index === 0}
                    parallaxOffset={offsets[index] ?? 0}
                  />
                </div>

                {/* تدرج التعتيم (مُفتّح قليلاً لإبراز جمال الصور مع الحفاظ على وضوح النص) */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C10]/82 via-[#0B1C10]/48 to-[#0B1C10]/18 pointer-events-none transition-opacity duration-300 group-hover:from-[#0B1C10]/80 group-hover:via-[#0B1C10]/44" />

                {/* إضاءة محيطية ناعمة */}
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-[#EAB308]/12 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-[#2D6A3F]/25 rounded-full blur-3xl pointer-events-none" />

                {/* ════════ الشارة الذهبية ════════ */}
                <div className="relative z-10 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FACC15] to-[#EAB308] border border-[#EAB308]/60 text-[#1A3D24] text-[11px] sm:text-xs font-black tracking-wide shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A3D24]/80 animate-pulse" />
                    <span>{slide.badge}</span>
                  </span>
                </div>

                {/* ════════ المحتوى ════════ */}
                <div className="relative z-10 flex flex-col items-center justify-center flex-1 mx-auto py-5 text-center">
                  <h1 className="text-[28px] sm:text-[32px] lg:text-[36px] font-black text-white leading-[1.3] tracking-tight mb-5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
                    {slide.title}{' '}
                    <span className="relative inline-block text-[#FB923C] drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                      {slide.highlight}
                      <span className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#EA580C] to-transparent rounded-full" />
                    </span>
                  </h1>

                  <p className="text-[15px] sm:text-base text-white leading-[1.85] mb-6 font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)] max-w-[94%] bg-black/15 backdrop-blur-[2px] px-3.5 py-2.5 rounded-xl border border-white/15">
                    {slide.description}
                  </p>

                  <div className="flex items-center justify-center w-full">
                    {slide.primaryCTA === 'catalog' ? (
                      <RippleButton
                        id="hero-shop-now-btn"
                        onClick={onScrollToCatalog}
                        rippleColor="rgba(45,106,63,0.30)"
                        className="w-full inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-white/95 backdrop-blur-sm text-[#1A3D24] font-black text-base shadow-sm hover:shadow-md hover:bg-white hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] transition-all duration-200 cursor-pointer group/btn border border-white/60"
                      >
                        <Leaf className="w-5 h-5 text-[#2D6A3F] relative z-10 transition-transform duration-200 group-hover/btn:scale-110" />
                        <span className="relative z-10">تسوق الآن</span>
                        <ArrowDown className="w-5 h-5 text-[#2D6A3F] group-hover/btn:translate-y-1 transition-transform duration-200 animate-bounce stroke-[2.5] relative z-10" />
                      </RippleButton>
                    ) : (
                      onScrollToBundles && (
                        <RippleButton
                          onClick={onScrollToBundles}
                          rippleColor="rgba(45,106,63,0.30)"
                          className="w-full inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-white/95 backdrop-blur-sm text-[#1A3D24] font-black text-base shadow-sm hover:shadow-md hover:bg-white hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] transition-all duration-200 cursor-pointer group/btn border border-white/60"
                        >
                          <Package className="w-5 h-5 text-[#2D6A3F] relative z-10 transition-transform duration-200 group-hover/btn:scale-110" />
                          <span className="relative z-10">اكتشف الآن</span>
                          <ArrowDown className="w-5 h-5 text-[#2D6A3F] group-hover/btn:translate-y-1 transition-transform duration-200 animate-bounce stroke-[2.5] relative z-10" />
                        </RippleButton>
                      )
                    )}
                  </div>
                </div>

                {/* ════════ الأسفل: حالة التوصيل ════════ */}
                <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-[11px] font-extrabold text-[#FAFAF7] bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-white/15">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      خدمة التوصيل نشطة اليوم في {STORE_CONFIG.city}
                    </span>
                  </div>
                </div>

                {isPulsing && (
                  <div className="hero-focus-pulse absolute inset-0 rounded-3xl bg-white/8 pointer-events-none" />
                )}
              </article>
            );
          })}

          <div className="hero-spacer" aria-hidden="true" />
        </div>

        {/* ─── نقاط التنقل ─── */}
        <div className="flex md:hidden items-center justify-center gap-2 mt-4">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToSlide(i)}
              className={`h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                activeSlideIndex === i
                  ? 'w-7 bg-[#2D6A3F] shadow-xs'
                  : 'w-2.5 bg-[#2D6A3F]/30 hover:bg-[#2D6A3F]/55'
              }`}
              aria-label={`الانتقال إلى البطاقة ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};