// ============================================================
// TrustBadges.tsx – الإصدار 8.0
// تصميم مطابق لصناديق العائلة: بطاقات مدمجة متناسقة (أقل عرضاً)
// + وميض بصري عند المس + خلفية فاتحة متباينة خضراء هادئة + أسهم تمرير موحدة مكبرة
// ============================================================
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Sprout,
  Truck,
  ShieldCheck,
  HeartHandshake,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';

const FOCUS_PULSE_MS = 600;

export const TrustBadges: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [pulsingIndex, setPulsingIndex] = useState<number | null>(null);
  const scrollRaf = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);

  // ─── البطاقات الأربعة ───
  const features = [
    {
      id: 0,
      badge: 'طبيعي 100%',
      icon: <Sprout className="w-6 h-6 text-[#2D6A3F]" strokeWidth={2.5} />,
      iconBg: 'bg-emerald-500/15 border-emerald-500/35',
      tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'طراوة الحقول مباشرة',
      desc: 'خضار وفواكه يومياً من فلاحين مغاربة، بلا وسطاء، لضمان الطراوة والجودة الطبيعية.',
    },
    {
      id: 1,
      badge: 'نفس اليوم',
      icon: <Truck className="w-6 h-6 text-[#EA580C]" strokeWidth={2.5} />,
      iconBg: 'bg-orange-500/15 border-orange-500/35',
      tagColor: 'bg-orange-100 text-orange-800 border-orange-300',
      title: 'توصيل سريع وفي الموعد',
      desc: 'طلبك كيوصلك نفس النهار وفي الوقت اللي يناسبك، بدقة واحترافية حتال باب دارك.',
    },
    {
      id: 2,
      badge: 'COD كاش وبنك',
      icon: <ShieldCheck className="w-6 h-6 text-[#2D6A3F]" strokeWidth={2.5} />,
      iconBg: 'bg-emerald-500/15 border-emerald-500/35',
      tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'دفع براحة واطمئنان',
      desc: 'ما كتخلص حتى كتوصلك السلعة وتشوفها بعينيك — عاد كتخلص نقداً أو بالتحويل البنكي.',
    },
    {
      id: 3,
      badge: 'ضمان كامل',
      icon: <HeartHandshake className="w-6 h-6 text-[#EA580C]" strokeWidth={2.5} />,
      iconBg: 'bg-orange-500/15 border-orange-500/35',
      tagColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'ضمان الرضا 100%',
      desc: 'شي حاجة ما عجبتكش؟ كنبدلوها ليك أو كنرجعو ليك فلوسك فوراً — رضاك هو رأس مالنا.',
    },
  ];

  // ─── تتبع التمرير وتحديد البطاقة النشطة مع وميض بصري ───
  const updateLayout = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('article');
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIdx = 0;
    let minDiff = Infinity;

    cards.forEach((card, idx) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const diff = Math.abs(cardCenter - containerCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setActiveCardIndex((prev) => {
      if (prev !== closestIdx) {
        setPulsingIndex(closestIdx);
        if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
        pulseTimer.current = window.setTimeout(() => setPulsingIndex(null), FOCUS_PULSE_MS);
        return closestIdx;
      }
      return prev;
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(updateLayout);
  }, [updateLayout]);

  useEffect(() => {
    return () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    };
  }, []);

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('article');
    if (cards[index]) {
      const card = cards[index] as HTMLElement;
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollPosition = cardLeft - (containerWidth - cardWidth) / 2;

      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
      setActiveCardIndex(index);
      setPulsingIndex(index);
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
      pulseTimer.current = window.setTimeout(() => setPulsingIndex(null), FOCUS_PULSE_MS);
    }
  };

  const scrollNext = () => {
    const nextIdx = Math.min(features.length - 1, activeCardIndex + 1);
    scrollToIndex(nextIdx);
  };

  const scrollPrev = () => {
    const prevIdx = Math.max(0, activeCardIndex - 1);
    scrollToIndex(prevIdx);
  };

  return (
    <section
      id="trust-badges-section"
      className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-10 sm:my-14"
      aria-label="مميزات وثقة متجر خضرة"
      dir="rtl"
    >
      {/* ═══════ الأنماط الحركية والوميض البصري ═══════ */}
      <style>{`
        @keyframes badgeSheenSwipe {
          0%   { transform: translateX(180%) skewX(-20deg); opacity: 0; }
          15%  { opacity: 0.8; }
          100% { transform: translateX(-180%) skewX(-20deg); opacity: 0; }
        }
        .badge-sheen-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%);
          transform: translateX(180%) skewX(-20deg);
          pointer-events: none;
          z-index: 10;
        }
        .group\\/badge:hover .badge-sheen-sweep,
        .group\\/badge:active .badge-sheen-sweep {
          animation: badgeSheenSwipe 0.75s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes badgeFocusPulse {
          0%   { opacity: 0.55; }
          100% { opacity: 0; }
        }
        .badge-focus-pulse {
          animation: badgeFocusPulse ${FOCUS_PULSE_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .badge-sheen-sweep,
          .badge-focus-pulse { animation: none; }
        }
      `}</style>

      {/* ════════ الحاوية الموحدة (مطابقة للصناديق العائلية) ════════ */}
      <div className="relative bg-white border-2 border-[#2D6A3F]/15 rounded-3xl sm:rounded-[36px] shadow-[0_12px_36px_rgba(45,106,63,0.06)] p-4 sm:p-6 lg:p-8 overflow-hidden">

        {/* إضاءات محيطية ناعمة */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#EAB308]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#2D6A3F]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">

          {/* ═══════ 1. رأس القسم الموحد (مُوسَّط مع النقطة الذهبية) ═══════ */}
          <div className="relative flex flex-col items-center text-center gap-4 pb-5 border-b border-[#2D6A3F]/10">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1A3D24] tracking-tight flex items-center justify-center gap-2">
                <span>علاش متجر خُضرة هو الخيار الأول للعائلات؟</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] inline-block shrink-0" />
              </h2>

              <p className="text-sm sm:text-base text-[#3E4F43] font-bold leading-relaxed">
                مئات العائلات في فاس كيثقوا فينا كل نهار لتوفير طعام صحي وطازج لموائدهم مع تجربة تسوق مريحة.
              </p>
            </div>
          </div>

          {/* ═══════ 2. شبكة وبطاقات المزايا (مطابقة تماماً لحجم الصناديق) ═══════ */}
          <div className="relative pt-5">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex flex-row md:grid md:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 px-1 md:px-0 snap-x snap-mandatory md:snap-none overscroll-x-contain no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {features.map((f, idx) => {
                const isActive = activeCardIndex === idx;
                const isPulsing = pulsingIndex === idx;

                return (
                  <article
                    key={f.id}
                    onClick={() => scrollToIndex(idx)}
                    className={`group/badge relative w-[72vw] max-w-[260px] sm:w-[270px] md:w-auto md:max-w-none shrink-0 snap-center rounded-2xl border-2 transition-all duration-300 md:hover:-translate-y-1 p-4 sm:p-5 text-center flex flex-col justify-between overflow-hidden cursor-pointer active:scale-[0.98] ${
                      isActive
                        ? 'bg-white border-[#2D6A3F] shadow-[0_8px_24px_rgba(45,106,63,0.16)] md:hover:shadow-[0_12px_28px_rgba(45,106,63,0.20)]'
                        : 'bg-[#F4FAF6] border-[#2D6A3F]/20 hover:border-[#2D6A3F]/50 hover:bg-white shadow-xs md:hover:shadow-[0_10px_24px_rgba(45,106,63,0.12)]'
                    }`}
                  >
                    {/* شريط الوميض البصري عند المس والتحويم */}
                    <div className="badge-sheen-sweep" />

                    <div className="w-full flex flex-col items-center relative z-10">
                      {/* الأيقونة بحجم وتأثيرات موحدة */}
                      <div
                        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl ${f.iconBg} border-2 flex items-center justify-center shadow-xs shrink-0 group-hover/badge:scale-105 transition-transform mb-3`}
                      >
                        {f.icon}
                      </div>

                      {/* شارة التميز */}
                      <span className={`text-[10px] sm:text-[11px] font-black px-3 py-1 rounded-full border-2 ${f.tagColor} mb-2.5 shadow-xs`}>
                        {f.badge}
                      </span>

                      {/* العنوان */}
                      <h3 className="text-sm sm:text-base font-black text-[#1A3D24] leading-snug mb-1.5">
                        {f.title}
                      </h3>

                      {/* الوصف بتنسيق مريح للعين */}
                      <p className="text-xs text-[#243328] font-medium leading-relaxed px-1">
                        {f.desc}
                      </p>
                    </div>

                    {/* خط سفلي موحد للموثوقية */}
                    <div className="w-full pt-3 mt-3 border-t-2 border-[#2D6A3F]/10 flex items-center justify-center gap-1.5 text-[11px] font-black text-emerald-800 relative z-10">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.5} />
                      <span>معتمد لزبناء فاس</span>
                    </div>

                    {/* تأثير الوميض البصري للمركز النشط */}
                    {isPulsing && (
                      <div
                        className="badge-focus-pulse absolute inset-0 rounded-2xl bg-[#EAB308]/15 pointer-events-none z-10"
                        aria-hidden="true"
                      />
                    )}
                  </article>
                );
              })}
            </div>

            {/* ═══════ مؤشرات التنقل وأسهم التوجيه الموحدة المكبرة ═══════ */}
            <div className="flex md:hidden items-center justify-between pt-4 px-1">
              {/* نقاط التنقل */}
              <div className="flex items-center gap-1.5">
                {features.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToIndex(i)}
                    className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                      activeCardIndex === i
                        ? 'w-7 bg-[#2D6A3F]'
                        : 'w-2 bg-[#2D6A3F]/25 hover:bg-[#2D6A3F]/50'
                    }`}
                    aria-label={`الميزة ${i + 1}`}
                  />
                ))}
              </div>

              {/* أسهم التمرير المكبرة الموحدة */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={scrollPrev}
                  disabled={activeCardIndex === 0}
                  className="w-11 h-11 rounded-xl bg-white border-2 border-[#2D6A3F]/25 text-[#1A3D24] hover:bg-[#F4FAF6] hover:border-[#2D6A3F]/50 shadow-sm flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="السابق"
                >
                  <ChevronRight className="w-5 h-5 text-[#1A3D24]" strokeWidth={2.6} />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  disabled={activeCardIndex >= features.length - 1}
                  className="w-11 h-11 rounded-xl bg-white border-2 border-[#2D6A3F]/25 text-[#1A3D24] hover:bg-[#F4FAF6] hover:border-[#2D6A3F]/50 shadow-sm flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="التالي"
                >
                  <ChevronLeft className="w-5 h-5 text-[#1A3D24]" strokeWidth={2.6} />
                </button>
              </div>
            </div>

          </div>

          {/* ═══════ 3. الشريط السفلي المدمج (مُوسَّط) ═══════ */}
          <div className="mt-6 pt-5 border-t-2 border-[#2D6A3F]/10 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#1F2937] font-black text-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
            <span>التزامنا الدائم: خضار وفواكه طازجة يومياً من أسواق الجملة بفاس لباب داركم.</span>
          </div>

        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
