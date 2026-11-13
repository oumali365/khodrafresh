// ============================================================
// CategoryFilter.tsx – الإصدار 11.0
// تصميم مطابق تماماً لشارات الثقة (TrustBadges) وتقييمات الزبائن (CustomerReviews)
// بطاقات بخلفية صور ممتدة + إصلاح التمرير اليدوي + إزالة العناصر الصفراء
// ============================================================
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { ProductCategory, Product } from '../../types';
import { CATEGORIES_CONFIG } from '../../data/mockProducts';
import { SortOption } from './SortFilterModal';

const CATEGORY_IMAGES: Record<string, { primary: string; fallback?: string }> = {
  all: { primary: '/images/categories/all.jpg', fallback: '/images/categories/all.jpg' },
  veg: { primary: '/images/categories/vegetables.jpg', fallback: '/images/categories/vegetables.jpg' },
  fruit: { primary: '/images/categories/fruits.jpg', fallback: '/images/categories/fruits.jpg' },
  dairy: { primary: '/images/categories/dairy.jpg', fallback: '/images/categories/dairy.jpg' },
  grocery: { primary: '/images/categories/grocery.jpg', fallback: '/images/categories/grocery.webp' },
  drinks: { primary: '/images/categories/drinks.jpg', fallback: '/images/categories/drinks.jpg' },
  cleaning: { primary: '/images/categories/cleaning.jpg', fallback: '/images/categories/cleaning.jpg' },
};

// شارات وألوان فريدة لكل فئة (تم إزالة الألوان الصفراء واستبدالها بالأخضر والبرتقالي)
const CATEGORY_META: Record<
  string,
  { badge: string; tagColor: string; subtitle: string; iconBg: string }
> = {
  veg: {
    badge: 'طازج يومياً',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    subtitle: 'خضار الحقول المغربية',
    iconBg: 'bg-emerald-500/15 border-emerald-500/35',
  },
  fruit: {
    badge: 'موسمي وحلو',
    tagColor: 'bg-orange-100 text-orange-800 border-orange-300',
    subtitle: 'فواكه طازجة ومجففة',
    iconBg: 'bg-orange-500/15 border-orange-500/35',
  },
  dairy: {
    badge: 'بلدي 100%',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    subtitle: 'حليب، أجبان، زبدة وبيض',
    iconBg: 'bg-emerald-500/15 border-emerald-500/35',
  },
  grocery: {
    badge: 'مونة ممتازة',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    subtitle: 'زيت، عسل، قطاني وتوابل',
    iconBg: 'bg-emerald-500/15 border-emerald-500/35',
  },
  drinks: {
    badge: 'انتعاش طبيعي',
    tagColor: 'bg-orange-100 text-orange-800 border-orange-300',
    subtitle: 'عصائر طازجة ومياه',
    iconBg: 'bg-orange-500/15 border-orange-500/35',
  },
  cleaning: {
    badge: 'نظافة وعناية',
    tagColor: 'bg-orange-100 text-orange-800 border-orange-300',
    subtitle: 'منظفات وصابون بلدي',
    iconBg: 'bg-orange-500/15 border-orange-500/35',
  },
  all: {
    badge: 'شامل كل المتجر',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    subtitle: 'جميع تشكيلات فاس',
    iconBg: 'bg-emerald-500/15 border-emerald-500/35',
  },
};

const CategoryCardButton: React.FC<{
  category: { id: ProductCategory; name: string; icon: string };
  isSelected: boolean;
  onSelect: () => void;
  count?: number;
}> = ({ category, isSelected, onSelect, count }) => {
  const imageConfig = CATEGORY_IMAGES[category.id];
  const [currentSrc, setCurrentSrc] = useState<string | null>(imageConfig?.primary || null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const meta = CATEGORY_META[category.id] || {
    badge: 'جودة مضمونة',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    subtitle: 'منتجات مختارة بعناية',
    iconBg: 'bg-emerald-500/15 border-emerald-500/35',
  };

  const handleImgError = () => {
    if (currentSrc === imageConfig?.primary && imageConfig?.fallback && currentSrc !== imageConfig.fallback) {
      setCurrentSrc(imageConfig.fallback);
    } else {
      setHasError(true);
    }
  };

  const hasImage = Boolean(currentSrc && !hasError);

  return (
    <article
      role="tab"
      aria-selected={isSelected}
      onClick={onSelect}
      className={`group/cat relative w-[70vw] max-w-[210px] xs:w-[170px] sm:w-[185px] md:w-auto md:max-w-none shrink-0 snap-center rounded-2xl border-2 transition-all duration-300 md:hover:-translate-y-1 overflow-hidden cursor-pointer select-none active:scale-[0.98] h-[230px] sm:h-[250px] ${
        isSelected
          ? 'border-[#2D6A3F] shadow-[0_8px_24px_rgba(45,106,63,0.18)] ring-2 ring-[#2D6A3F]/25'
          : 'border-[#2D6A3F]/20 hover:border-[#2D6A3F]/50 shadow-xs md:hover:shadow-[0_10px_24px_rgba(45,106,63,0.12)]'
      }`}
    >
      {/* ─── خلفية الصورة الممتدة ─── */}
      <div className="absolute inset-0 z-0">
        {hasImage ? (
          <img
            src={currentSrc!}
            alt={category.name}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover/cat:scale-110 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoaded(true)}
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] flex items-center justify-center">
            <span className="text-5xl">{category.icon}</span>
          </div>
        )}
        {/* تدرج داكن لضمان وضوح النصوص */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* ─── وميض بصري عند التحويم ─── */}
      <div className="cat-sheen-sweep pointer-events-none" />

      {/* ─── المحتوى ─── */}
      <div className="relative z-10 w-full h-full flex flex-col justify-end items-center p-3 sm:p-4 text-center">
        {/* شارة التميز (Pill Badge) */}
        <span
          className={`text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full border-2 ${meta.tagColor} mb-2 shadow-xs backdrop-blur-sm bg-white/90`}
        >
          {meta.badge}
        </span>

        {/* العنوان */}
        <h3 className="text-sm sm:text-base font-black leading-snug mb-1 text-white drop-shadow-md">
          {category.name}
        </h3>

        {/* الوصف المختصر */}
        <p className="text-[10px] sm:text-[11px] text-white/80 font-medium leading-relaxed px-1 line-clamp-2 drop-shadow-sm">
          {meta.subtitle}
        </p>

        {/* خط سفلي موحد للموثوقية */}
        <div className="w-full pt-2 mt-2 border-t border-white/20 flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-black">
          <CheckCircle2
            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#EAB308]' : 'text-emerald-400'}`}
            strokeWidth={2.5}
          />
          <span className={isSelected ? 'text-[#EAB308]' : 'text-emerald-300'}>
            {isSelected ? 'الفئة المعروضة' : (count ? `${count} منتج متوفر` : 'معتمد لزبناء فاس')}
          </span>
        </div>
      </div>

      {/* مؤشر الفئة المختارة */}
      {isSelected && (
        <div
          className="absolute inset-x-0 bottom-0 h-1.5 bg-[#2D6A3F] z-20"
          aria-hidden="true"
        />
      )}
    </article>
  );
};

export interface CategoryHeaderInfo {
  id?: string;
  name: string;
  icon?: string;
  description: string;
}

interface CategoryFilterProps {
  selectedCategory: ProductCategory;
  onSelectCategory: (cat: ProductCategory) => void;
  products: Product[];
  className?: string;

  categoryInfo?: CategoryHeaderInfo;
  sortBy: SortOption;
  onlyInStock: boolean;
  onOpenSort: () => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  products = [],
  className = '',
  sortBy,
  onlyInStock,
  onOpenSort,
  searchQuery = '',
  onClearSearch,
}) => {
  const categories = CATEGORIES_CONFIG.filter((cat) => cat.id !== 'all');

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const hasActiveFilters = sortBy !== 'default' || onlyInStock;
  const isSearchMode = searchQuery.trim().length > 0;

  const getSortLabel = () => {
    if (sortBy === 'price-asc') return 'الأقل سعراً';
    if (sortBy === 'price-desc') return 'الأعلى سعراً';
    return '';
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRaf = useRef<number | null>(null);

  const updateScrollState = useCallback(() => {
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll <= 6) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
        return;
      }
      const absLeft = Math.abs(scrollLeft);
      const hasMoreLeft = absLeft < maxScroll - 8;
      const hasMoreRight = absLeft > 8;
      setCanScrollLeft((prev) => (prev !== hasMoreLeft ? hasMoreLeft : prev));
      setCanScrollRight((prev) => (prev !== hasMoreRight ? hasMoreRight : prev));
    });
  }, []);

  // دالة توسيط البطاقة المختارة داخل الحاوية بدقة دون التأثير على تمرير الصفحة الرئيسي
  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cards = container.querySelectorAll('article');
    if (cards[index]) {
      const card = cards[index] as HTMLElement;
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollPosition = cardLeft - (containerWidth - cardWidth) / 2;

      container.scrollTo({
        left: scrollPosition,
        behavior: 'auto',
      });
    }
  }, []);

  // التمرير التلقائي لتوسيط وإظهار الفئة المختارة داخل شريط الفئات عند تغييرها من القائمة
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all') {
      const idx = categories.findIndex((c) => c.id === selectedCategory);
      if (idx >= 0) {
        const timer = setTimeout(() => {
          scrollToIndex(idx);
        }, 160);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedCategory, categories, scrollToIndex]);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState, { passive: true });
    return () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [categories.length, updateScrollState]);

  const scrollByAmount = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    const target = el.scrollLeft + (dir === 'left' ? -amount : amount);
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
    <section
      id="category-filter-section"
      className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-2 sm:mt-4 mb-10 sm:my-14 ${className}`}
      aria-label="تسوق حسب الفئات"
      dir="rtl"
    >
      {/* ═══════ الأنماط الحركية والوميض البصري المماثل لشارات الثقة ═══════ */}
      <style>{`
        @keyframes catSheenSwipe {
          0%   { transform: translateX(180%) skewX(-20deg); opacity: 0; }
          15%  { opacity: 0.8; }
          100% { transform: translateX(-180%) skewX(-20deg); opacity: 0; }
        }
        .cat-sheen-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%);
          transform: translateX(180%) skewX(-20deg);
          pointer-events: none;
          z-index: 15;
        }
        .group\\/cat:hover .cat-sheen-sweep {
          animation: catSheenSwipe 0.9s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* ═══════ الحاوية الرئيسية (نفس تباين وبناء شارات الثقة والتقييمات) ═══════ */}
      <div className="relative bg-white border-2 border-[#2D6A3F]/15 rounded-3xl sm:rounded-[36px] shadow-[0_12px_36px_rgba(45,106,63,0.06)] p-5 sm:p-8 lg:p-10 overflow-hidden">

        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#EAB308]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#2D6A3F]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">

          {/* ═══════ 1. رأس القسم الموحد (مُوسَّط مع النقطة الذهبية) ═══════ */}
          <div className="relative flex flex-col items-center text-center gap-4 pb-5 border-b border-[#2D6A3F]/10">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1A3D24] tracking-tight flex items-center justify-center gap-2">
                <span>تسوق حسب الفئات والأقسام</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] inline-block shrink-0" />
              </h2>

              <p className="text-sm sm:text-base text-[#3E4F43] font-bold leading-relaxed">
                خضار وفواكه طازجة، تمور، أجبان وألبان، وبقالة يومية مختارة بعناية فائقة من أسواق الجملة بفاس.
              </p>
            </div>

            {(isSearchMode || hasActiveFilters) && (
              <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-3 w-full mt-2">
                {isSearchMode && onClearSearch && (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r from-[#EA580C] to-[#C25E12] hover:from-[#F97316] hover:to-[#EA580C] px-3.5 py-2 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <span className="max-w-[120px] truncate">
                      إلغاء البحث "{searchQuery}"
                    </span>
                    <span className="text-xs font-bold leading-none">✕</span>
                  </button>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onOpenSort}
                    className="inline-flex items-center gap-1.5 bg-[#FAF8F3] hover:bg-white text-[#1A3D24] border border-[#2D6A3F]/20 px-3.5 py-2 rounded-2xl text-xs font-black cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>{getSortLabel() || (onlyInStock ? 'المتوفر فقط' : 'مصفّى')}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ═══════ 2. شبكة وبطاقات الفئات (توسيط ممتاز وتناسق كامل) ═══════ */}
          <div className="relative pt-6 pb-2">
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollByAmount('right')}
                aria-label="تمرير لليمين"
                className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-[#2D6A3F]/20 shadow-md text-[#2D6A3F] items-center justify-center hover:bg-[#2D6A3F] hover:text-[#EAB308] transition-all active:scale-90 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollByAmount('left')}
                aria-label="تمرير لليسار"
                className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-[#2D6A3F]/20 shadow-md text-[#2D6A3F] items-center justify-center hover:bg-[#2D6A3F] hover:text-[#EAB308] transition-all active:scale-90 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* الحاوية المتجاوبة مع توسيط الفئات على كل الشاشات */}
            {/* تم تغيير snap-mandatory إلى snap-proximity للسماح بالتمرير اليدوي بسلاسة */}
            <div
              ref={scrollRef}
              className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 lg:gap-4 overflow-x-auto md:overflow-visible py-3 px-2 sm:px-4 md:px-0 overscroll-x-contain no-scrollbar items-stretch snap-x snap-proximity md:snap-none justify-start sm:justify-center max-w-6xl mx-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              role="tablist"
              aria-label="فئات المنتجات"
            >
              {categories.map((cat, idx) => (
                <CategoryCardButton
                  key={cat.id}
                  category={cat}
                  count={productCounts[cat.id]}
                  isSelected={selectedCategory === cat.id}
                  onSelect={() => {
                    onSelectCategory(cat.id);
                    scrollToIndex(idx);
                  }}
                />
              ))}
            </div>

            {/* ═══════ مؤشرات التنقل وأسهم التوجيه الموحدة للهاتف ═══════ */}
            {/* تم حذف النقاط، تكبير الأسهم، إزالة كلمة تصفية، وتبديل الأماكن */}
            <div className="flex md:hidden items-center justify-center gap-4 pt-4 px-1">
              
              {/* أسهم التنقل (أصبحت في الجهة اليمنى) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollByAmount('right')}
                  disabled={!canScrollRight}
                  className="w-12 h-12 rounded-2xl bg-white border-2 border-[#2D6A3F]/25 text-[#1A3D24] hover:bg-[#F4FAF6] shadow-xs flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="السابق"
                >
                  <ChevronRight className="w-5 h-5 text-[#1A3D24]" strokeWidth={2.6} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByAmount('left')}
                  disabled={!canScrollLeft}
                  className="w-12 h-12 rounded-2xl bg-white border-2 border-[#2D6A3F]/25 text-[#1A3D24] hover:bg-[#F4FAF6] shadow-xs flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="التالي"
                >
                  <ChevronLeft className="w-5 h-5 text-[#1A3D24]" strokeWidth={2.6} />
                </button>
              </div>

              {/* زر التصفية (أصبح في الجهة اليسرى) - بدون كلمة تصفية */}
              <button
                type="button"
                onClick={onOpenSort}
                className="group relative inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] text-white shadow-md active:scale-95 transition-all cursor-pointer border border-[#EAB308]/50"
                title="تصفية وترتيب المنتجات"
                aria-label="تصفية وترتيب المنتجات"
              >
                <SlidersHorizontal className="w-5 h-5 text-[#F5D76E] transition-transform duration-300 group-hover:scale-110" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#EA580C] border-2 border-white animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* ═══════ 3. الشريط السفلي للموثوقية ═══════ */}
          <div className="mt-6 pt-5 border-t-2 border-[#2D6A3F]/10 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#1F2937] font-black text-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
            <span>جميع المنتجات تخضع للمعاينة والفرز الدقيق قبل التجهيز والتوصيل لباب منزلك.</span>
          </div>

        </div>
      </div>
    </section>
  );
};

export default CategoryFilter;