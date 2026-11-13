// ============================================================
// FamilyBoxesSection.tsx – الإصدار 4.4
// قسم صناديق العائلة بهوية خضرة الموحّدة
// تحسينات: إعادة ترتيب + حذف Chips + حذف الضمانات + عرض أوضح
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Package, Check, Plus, Minus, X, ShieldCheck,
  Truck, ShoppingBag, Eye, HeartHandshake, Users, Scale,
  Star, Leaf, Award, Clock, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { gsap } from 'gsap';
import { Product } from '../../types';
import { STORE_CONFIG } from '../../data/config';

// ─── مسارات صور صناديق العائلة ───
export const FAMILY_BOX_PUBLIC_IMAGES: Record<string, string> = {
  small: '/images/family-boxes/family-small.webp',
  medium: '/images/family-boxes/family-medium.webp',
  large: '/images/family-boxes/family-large.webp',
};

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  id?: string;
  ariaLabel?: string;
}> = ({ onClick, className, children, rippleColor = 'rgba(255,255,255,0.30)', id, ariaLabel }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'box-ripple';
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
      id={id}
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

// ─── مكون عرض صورة صندوق العائلة ───
const BoxImageDisplay: React.FC<{
  src: string;
  alt: string;
  className?: string;
  badge?: string;
}> = ({ src, alt, className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (hasError || !src) {
    return (
      <div className={`w-full h-full bg-gradient-to-br from-[#163920] to-[#0A180E] flex flex-col items-center justify-center p-3 text-center select-none ${className}`}>
        <span className="text-3xl sm:text-4xl mb-1.5 drop-shadow-md">📦</span>
        <span className="text-white font-black text-xs sm:text-sm leading-tight drop-shadow-sm">
          {alt}
        </span>
        <span className="text-emerald-300 text-[10px] sm:text-xs mt-1 font-semibold">
          خضار وفواكه طازجة منتقاة بعناية
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      className={`${className} transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      onError={() => setHasError(true)}
    />
  );
};

export interface FamilyBoxItem {
  name: string;
  amount: string;
  icon: string;
}

export interface FamilyBox {
  id: number;
  name: string;
  shortName: string;
  subtitle: string;
  image: string;
  price: number;
  originalPrice: number;
  savings: number;
  savingsBadge: string;
  weight: string;
  servings: string;
  itemsCountLabel: string;
  badge: string;
  badgeColor?: string;
  description: string;
  highlights: string[];
  items: FamilyBoxItem[];
  features: string[];
}

export const FAMILY_BOXES: FamilyBox[] = [
  {
    id: 901,
    name: 'صندوق عائلة صغيرة',
    shortName: 'عائلة صغيرة',
    subtitle: 'مثالي لـ 2-3 أفراد',
    image: FAMILY_BOX_PUBLIC_IMAGES.small,
    price: 89,
    originalPrice: 119,
    savings: 30,
    savingsBadge: 'وفر 30.00 DH',
    weight: '6-8 كغ',
    servings: '2-3 أفراد',
    itemsCountLabel: '9 أصناف',
    badge: 'الأكثر طلباً',
    description:
      'تشكيلة متوازنة ومختارة بعناية من الخضار الأساسية والفواكه الطازجة، مخصصة للأزواج والعائلات الصغيرة لتغطية احتياجات الأسبوع بطراوة تامة وبدون أي هدر.',
    highlights: ['بطاطس ممتازة 2.5 كغ', 'طماطم سلاطة 1.5 كغ', 'بصل أحمر 1.5 كغ', 'جزر بلدي 1 كغ', 'موز وبرتقال 2 كغ', 'باقة أعشاب هدية'],
    items: [
      { name: 'بطاطس بلدية ممتازة (للطبخ والقلي)', amount: '2.5 كغ', icon: '🥔' },
      { name: 'طماطم سلاطة حمراء ناضجة', amount: '1.5 كغ', icon: '🍅' },
      { name: 'بصل أحمر سايسي طري', amount: '1.5 كغ', icon: '🧅' },
      { name: 'جزر بلدي مقرمش وحلو', amount: '1 كغ', icon: '🥕' },
      { name: 'خيار مغربي مقرمش', amount: '500 غ', icon: '🥒' },
      { name: 'فلفل حلو مشكل (ألوان)', amount: '500 غ', icon: '🫑' },
      { name: 'برتقال بلدي للعصير والمائدة', amount: '1.5 كغ', icon: '🍊' },
      { name: 'موز مغربي عالي الحلاوة', amount: '1 كغ', icon: '🍌' },
      { name: 'باقة ورقيات (قزبر + معدنوس + نعناع)', amount: 'هدية مجانية', icon: '🌿' },
    ],
    features: [
      'وفر 30.00 DH مقارنة بالشراء المنفصل',
      'قطف طازج صبيحة يوم التوصيل',
      'حجم مثالي لتجنب التلف والهدر',
    ],
  },
  {
    id: 902,
    name: 'صندوق عائلة متوسطة',
    shortName: 'عائلة متوسطة',
    subtitle: 'مثالي لـ 4-5 أفراد',
    image: FAMILY_BOX_PUBLIC_IMAGES.medium,
    price: 139,
    originalPrice: 175,
    savings: 36,
    savingsBadge: 'وفر 36.00 DH',
    weight: '14-16 كغ',
    servings: '4-5 أفراد',
    itemsCountLabel: '14 صنفاً',
    badge: 'الأكثر طلباً',
    description:
      'الباقة الأكثر توازناً للبيوت المغربية. كميات وافية من خضار الطواجن والكسكس والسلطات، مع سلة فواكه أسبوعية مشكلة تكفي العائلة 7 أيام كاملة بجودة مضمونة.',
    highlights: ['بطاطس 4 كغ', 'طماطم 3 كغ', 'بصل 2.5 كغ', 'خضار الطاجين 3 كغ', 'فواكه مشكلة 5 كغ', 'نعناع وورقيات'],
    items: [
      { name: 'بطاطس بلدية للطبخ والقلي', amount: '4 كغ', icon: '🥔' },
      { name: 'طماطم طرية وحمراء للمائدة والطبخ', amount: '3 كغ', icon: '🍅' },
      { name: 'بصل أحمر سايسي حلو', amount: '2.5 كغ', icon: '🧅' },
      { name: 'جزر بلدي مقرمش', amount: '2 كغ', icon: '🥕' },
      { name: 'قرع أخضر طري (كوسة/كورجيت)', amount: '1 كغ', icon: '🥬' },
      { name: 'فلفل مشكل + خيار مقرمش', amount: '1.5 كغ', icon: '🫑' },
      { name: 'باذنجان رومي خفيف', amount: '1 كغ', icon: '🍆' },
      { name: 'يقطين (قرع أحمر للكسكس)', amount: '1 كغ', icon: '🎃' },
      { name: 'برتقال مائدة وعصير', amount: '2.5 كغ', icon: '🍊' },
      { name: 'تفاح أطلسي ممتاز', amount: '1.5 كغ', icon: '🍎' },
      { name: 'موز محلي طري', amount: '1.5 كغ', icon: '🍌' },
      { name: 'فاكهة موسمية منتقاة', amount: '1 كغ', icon: '🍓' },
      { name: 'حامض ليمون بلدي', amount: '500 غ', icon: '🍋' },
      { name: 'باقة سخية ورقيات ونعناع فاسي', amount: 'هدية مجانية', icon: '🌿' },
    ],
    features: [
      'وفر 36.00 DH في سلة الأسبوع المتكاملة',
      'تنوع شامل يغطي كل وجبات الأسرة',
      'مغسول ومنقى بعناية وحبة بحبة',
    ],
  },
  {
    id: 903,
    name: 'صندوق عائلة كبيرة',
    shortName: 'عائلة كبيرة',
    subtitle: 'مثالي لـ 6-8 أفراد',
    image: FAMILY_BOX_PUBLIC_IMAGES.large,
    price: 189,
    originalPrice: 245,
    savings: 56,
    savingsBadge: 'وفر 56.00 DH',
    weight: '20-22 كغ',
    servings: '6-8 أفراد',
    itemsCountLabel: '18 صنفاً',
    badge: 'التوفير الأكبر 👑',
    description:
      'صندوق البركة الشامل للعائلات الكبيرة ولمحبي الكرم والوفرة: أوزان سخية جداً من الخضار والفواكه، مع طبق بيض بلدي حر (10 بيضات) وتوصيل مجاني مباشر إلى باب بيتك.',
    highlights: ['خضار شاملة 12 كغ', 'فواكه منوعة 6 كغ', 'طبق بيض بلدي 10 حبات', 'ورقيات وأعشاب', 'توصيل مجاني (0.00 DH)'],
    items: [
      { name: 'بطاطس ممتازة (طبخ وقلي)', amount: '6 كغ', icon: '🥔' },
      { name: 'طماطم طازجة للمائدة والطهي', amount: '4 كغ', icon: '🍅' },
      { name: 'بصل أحمر ممتاز', amount: '4 كغ', icon: '🧅' },
      { name: 'جزر بلدي حلو', amount: '2.5 كغ', icon: '🥕' },
      { name: 'خضار الطاجين والسلطة المتنوعة', amount: '4 كغ', icon: '🥗' },
      { name: 'برتقال بلدي للعصير والمائدة', amount: '4 كغ', icon: '🍊' },
      { name: 'تفاح أطلسي مشكل', amount: '2.5 كغ', icon: '🍎' },
      { name: 'موز مغربي طري وعالي الحلاوة', amount: '2 كغ', icon: '🍌' },
      { name: 'فواكه موسمية متنوعة', amount: '2 كغ', icon: '🍐' },
      { name: 'طبق بيض بلدي حر من المزرعة', amount: '10 حبات', icon: '🥚' },
      { name: 'باقة ورقيات خضراء + نعناع أصيل', amount: 'هدية مجانية', icon: '🌿' },
      { name: 'خدمة التوصيل السريع لباب البيت', amount: 'مجاناً (0.00 DH)', icon: '🚚' },
    ],
    features: [
      'أعلى قيمة توفير بالمتجر: وفر 56.00 DH فوراً',
      'توصيل مجاني مباشر إلى باب البيت',
      'طبق بيض بلدي حر من المزرعة هدية',
    ],
  },
];

const FOCUS_PULSE_MS = 700;

interface FamilyBoxesSectionProps {
  onAddToCart: (product: Product, quantity: number) => void;
  selectedBox?: FamilyBox | null;
  onSelectBox?: (box: FamilyBox | null) => void;
}

export const FamilyBoxesSection: React.FC<FamilyBoxesSectionProps> = ({
  onAddToCart,
  selectedBox: controlledSelectedBox,
  onSelectBox: controlledOnSelectBox,
}) => {
  const [internalSelectedBox, setInternalSelectedBox] = useState<FamilyBox | null>(null);
  const isControlled = controlledSelectedBox !== undefined;
  const selectedBox = isControlled ? controlledSelectedBox : internalSelectedBox;

  const setSelectedBox = (box: FamilyBox | null) => {
    if (isControlled && controlledOnSelectBox) {
      controlledOnSelectBox(box);
    } else {
      setInternalSelectedBox(box);
    }
  };

  const [modalQty, setModalQty] = useState(1);
  const [addedBoxId, setAddedBoxId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedBox) {
      setModalQty(1);
    }
  }, [selectedBox]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedBox(null);
    };
    if (selectedBox) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBox]);

  const boxToProduct = (box: FamilyBox): Product => ({
    id: box.id,
    name: box.name,
    category: 'veg',
    type: 'unit',
    price: box.price,
    unit_label: 'صندوق',
    stock: 30,
    icon: box.id === 903 ? '👑' : '🥬',
    image_url: box.image,
    active: true,
    description: box.description,
    origin: 'مزارع مغربية ممتازة',
  });

  const animateFlyer = (sourceElement: HTMLElement | null, box: FamilyBox) => {
    if (!sourceElement) return;
    const rect = sourceElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const cartTarget = document.getElementById('sticky-cart-icon');
    let targetX = window.innerWidth > 640 ? window.innerWidth * 0.75 : window.innerWidth - 65;
    let targetY = window.innerHeight - 38;

    if (cartTarget) {
      const targetRect = cartTarget.getBoundingClientRect();
      targetX = targetRect.left + targetRect.width / 2;
      targetY =
        targetRect.top > window.innerHeight
          ? window.innerHeight - 38
          : targetRect.top + targetRect.height / 2;
    }

    const flyer = document.createElement('div');
    flyer.className =
      'fixed z-[9999] pointer-events-none rounded-2xl overflow-hidden shadow-2xl border-2 border-[#EAB308] bg-white flex items-center justify-center';
    flyer.style.width = '68px';
    flyer.style.height = '68px';
    flyer.style.left = `${rect.left + rect.width / 2 - 34}px`;
    flyer.style.top = `${rect.top + rect.height / 2 - 34}px`;

    const img = document.createElement('img');
    img.src = box.image;
    img.alt = box.name;
    img.className = 'w-full h-full object-cover';
    flyer.appendChild(img);

    document.body.appendChild(flyer);

    const startCenterX = rect.left + rect.width / 2;
    const startCenterY = rect.top + rect.height / 2;
    const deltaX = targetX - startCenterX;
    const deltaY = targetY - startCenterY;

    const tl = gsap.timeline({
      onComplete: () => {
        flyer.remove();
        const targetIcon = document.getElementById('sticky-cart-icon');
        if (targetIcon) {
          gsap
            .timeline()
            .to(targetIcon, { scale: 1.35, duration: 0.12, ease: 'back.out(2)' })
            .to(targetIcon, { scale: 1, duration: 0.18, ease: 'power2.out' });
        }
      },
    });

    tl.to(flyer, {
      scale: 1.15,
      duration: 0.15,
      ease: 'power1.out',
    }).to(
      flyer,
      {
        x: deltaX,
        y: deltaY,
        scale: 0.35,
        opacity: 0.75,
        duration: 0.55,
        ease: 'power2.in',
      },
      '-=0.05'
    );
  };

  const handleQuickAdd = (e: React.MouseEvent, box: FamilyBox) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    animateFlyer(btn, box);
    onAddToCart(boxToProduct(box), 1);

    setAddedBoxId(box.id);
    setTimeout(() => setAddedBoxId(null), 1800);
  };

  const handleModalAdd = (box: FamilyBox) => {
    const modalBtn = document.getElementById('modal-add-box-btn');
    animateFlyer(modalBtn, box);
    onAddToCart(boxToProduct(box), modalQty);
    setSelectedBox(null);
  };

  const openBoxModal = (box: FamilyBox) => {
    setSelectedBox(box);
    setModalQty(1);
  };

  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const [pulsingIndex, setPulsingIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);

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

    setActiveBoxIndex((prev) => {
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

  const scrollToBox = (index: number) => {
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
      setActiveBoxIndex(index);
    }
  };

  const scrollNext = () => {
    const nextIdx = Math.min(FAMILY_BOXES.length - 1, activeBoxIndex + 1);
    scrollToBox(nextIdx);
  };

  const scrollPrev = () => {
    const prevIdx = Math.max(0, activeBoxIndex - 1);
    scrollToBox(prevIdx);
  };

  return (
    <section
      id="family-boxes-section"
      className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-10 sm:my-14 scroll-mt-24 sm:scroll-mt-28"
      aria-label="قسم صناديق العائلة التوفيرية"
      dir="rtl"
    >
      {/* ═══════ الأنماط الحركية ═══════ */}
      <style>{`
        @keyframes boxRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .box-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: boxRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        @keyframes boxFadeInRight {
          0%   { opacity: 0; transform: translateX(40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .box-fade-in-right {
          animation: boxFadeInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          will-change: opacity, transform;
        }

        @keyframes boxFocusPulse {
          0%   { opacity: 0.5; }
          100% { opacity: 0; }
        }
        .box-focus-pulse {
          animation: boxFocusPulse ${FOCUS_PULSE_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .box-ripple,
          .box-fade-in-right,
          .box-focus-pulse { animation: none; }
        }
      `}</style>

      {/* ════════ الحاوية الموحدة ════════ */}
      <div className="relative bg-white border-2 border-[#2D6A3F]/15 rounded-3xl sm:rounded-[36px] shadow-[0_12px_36px_rgba(45,106,63,0.06)] p-4 sm:p-6 lg:p-8 overflow-hidden">

        {/* إضاءات محيطية ناعمة */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#EAB308]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#2D6A3F]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">

          {/* ═══════ 1. رأس القسم الموحد (مُوسَّط) ═══════ */}
          <div className="relative flex flex-col items-center text-center gap-4 pb-5 border-b border-[#2D6A3F]/10">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1A3D24] tracking-tight flex items-center justify-center gap-2">
                <span>صناديق العائلة الطازجة</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] inline-block shrink-0" />
              </h2>

              <p className="text-sm sm:text-base text-[#3E4F43] font-bold leading-relaxed">
                خضار وفواكه منتقاة بعناية تكفي أسرتك طيلة الأسبوع، مع توفير مؤكد في السعر وتوصيل مريح مباشرة لباب بيتك.
              </p>
            </div>
          </div>

          {/* ═══════ 2. شبكة وعرض الصناديق ═══════ */}
          <div className="relative pt-5">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex flex-row md:grid md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 px-1 md:px-0 snap-x snap-mandatory md:snap-none overscroll-x-contain no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
          {FAMILY_BOXES.map((box, idx) => {
            const isAdded = addedBoxId === box.id;
            const isActive = activeBoxIndex === idx;
            const isPulsing = pulsingIndex === idx;

            return (
              <article
                key={box.id}
                style={{ animationDelay: `${idx * 100}ms` }}
                className={`box-fade-in-right group/card relative w-[75vw] max-w-[280px] sm:w-[300px] md:w-auto md:max-w-none shrink-0 snap-center bg-white rounded-2xl border-2 transition-all duration-300 md:hover:-translate-y-1 p-3.5 sm:p-4 text-center flex flex-col justify-between ${
                  isActive
                    ? 'border-[#2D6A3F] shadow-[0_6px_20px_rgba(45,106,63,0.14)] md:hover:shadow-[0_12px_28px_rgba(45,106,63,0.18)]'
                    : 'border-[#2D6A3F]/20 hover:border-[#2D6A3F]/45 shadow-xs md:hover:shadow-[0_10px_24px_rgba(45,106,63,0.14)]'
                }`}
              >
                <div>
                  {/* ═══ صورة الصندوق ═══ */}
                  <div
                    onClick={() => openBoxModal(box)}
                    className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#FAF8F3] cursor-pointer group"
                  >
                    <BoxImageDisplay
                      src={box.image}
                      alt={box.name}
                      className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-106"
                    />

                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />

                    <div className="absolute top-2 right-2 z-10">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-[#1A3D24] text-[10px] font-black shadow-sm tracking-wide border border-white/50">
                        {box.badge}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gradient-to-r from-[#2D6A3F] to-[#1A3D24] text-white text-[10px] font-black shadow-sm tracking-wide border border-[#EAB308]/35">
                        {box.savingsBadge}
                      </span>
                    </div>
                  </div>

                  {/* ═══ الاسم + الوصف + السعر (مُوسَّط، بالترتيب المطلوب) ═══ */}
                  <div className="mt-3 flex flex-col items-center justify-center gap-2">
                    <div className="text-center">
                      <h3
                        onClick={() => openBoxModal(box)}
                        className="text-base sm:text-lg font-black text-[#1A3D24] cursor-pointer hover:text-[#2D6A3F] transition-colors leading-snug truncate"
                        title={box.name}
                      >
                        {box.name}
                      </h3>
                      <p className="text-[#3E4F43] text-xs sm:text-sm font-bold mt-0.5">
                        {box.subtitle}
                      </p>
                    </div>

                    {/* نص تعريف الصناديق - منقول من أعلى البطاقة */}
                    <p className="text-xs sm:text-sm text-[#1F2937] font-semibold leading-relaxed text-center line-clamp-2 px-1">
                      {box.description}
                    </p>

                    <div className="text-center pt-1" dir="ltr">
                      <div className="text-xl sm:text-2xl font-black text-[#EA580C] leading-none tracking-tight drop-shadow-[0_2px_6px_rgba(234,88,12,0.15)]">
                        <span>{box.price.toFixed(2)}</span>{' '}
                        <span className="text-sm sm:text-base font-black text-[#EA580C]">DH</span>
                      </div>
                      <div className="text-[11px] text-stone-500 line-through font-bold mt-0.5 tracking-tight">
                        <span>{box.originalPrice.toFixed(2)}</span> <span>DH</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══ الأزرار ═══ */}
                <div className="mt-3 pt-2 border-t-2 border-[#2D6A3F]/10">
                  <div className="flex items-center justify-center gap-2">
                    <RippleButton
                      onClick={() => openBoxModal(box)}
                      rippleColor="rgba(45,106,63,0.20)"
                      className="py-2.5 px-3 rounded-xl border-2 border-[#2D6A3F]/25 bg-white hover:bg-[#FAF8F3] hover:border-[#2D6A3F]/50 text-[#1A3D24] text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#2D6A3F] relative z-10" strokeWidth={2.5} />
                      <span className="relative z-10">التفاصيل</span>
                    </RippleButton>

                    <RippleButton
                      onClick={(e) => handleQuickAdd(e, box)}
                      rippleColor="rgba(255,255,255,0.30)"
                      className={`flex-1 py-2.5 px-3 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all duration-200 cursor-pointer active:scale-95 border-2 border-[#EAB308]/30 ${
                        isAdded
                          ? 'bg-gradient-to-l from-emerald-600 to-emerald-700'
                          : 'bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F]'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white relative z-10" strokeWidth={2.5} />
                          <span className="relative z-10">تمت الإضافة</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5 text-[#EAB308] relative z-10" strokeWidth={2.5} />
                          <span className="relative z-10">أضف للسلة</span>
                        </>
                      )}
                    </RippleButton>
                  </div>
                </div>

                {isPulsing && (
                  <div
                    className="box-focus-pulse absolute inset-0 rounded-2xl bg-[#EAB308]/12 pointer-events-none"
                    aria-hidden="true"
                  />
                )}
              </article>
            );
          })}
        </div>

        {/* مؤشرات التنقل وأسهم التوجيه الموحدة المكبرة */}
        <div className="flex md:hidden items-center justify-between pt-4 px-1">
          <div className="flex items-center gap-1.5">
            {FAMILY_BOXES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToBox(i)}
                className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  activeBoxIndex === i
                    ? 'w-7 bg-[#2D6A3F]'
                    : 'w-2 bg-[#2D6A3F]/25 hover:bg-[#2D6A3F]/50'
                }`}
                aria-label={`الانتقال إلى الصندوق ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={scrollPrev}
              disabled={activeBoxIndex === 0}
              className="w-11 h-11 rounded-xl bg-white border-2 border-[#2D6A3F]/25 text-[#1A3D24] hover:bg-[#FAF8F3] hover:border-[#2D6A3F]/50 shadow-sm flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="السابق"
            >
              <ChevronRight className="w-5 h-5 text-[#1A3D24]" strokeWidth={2.6} />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              disabled={activeBoxIndex >= FAMILY_BOXES.length - 1}
              className="w-11 h-11 rounded-xl bg-white border-2 border-[#2D6A3F]/25 text-[#1A3D24] hover:bg-[#FAF8F3] hover:border-[#2D6A3F]/50 shadow-sm flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="التالي"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A3D24]" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>

      {/* ════════ النافذة المنبثقة ════════ */}
      {selectedBox && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="box-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedBox(null)}
          />

          <div className="relative bg-[#FBF9F5] w-full max-w-xl rounded-[28px] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh] text-right border border-[#2D6A3F]/20 animate-in zoom-in-95 duration-200 overscroll-contain">

            {/* الرأس */}
            <div className="relative h-48 sm:h-56 shrink-0 overflow-hidden bg-stone-900">
              <BoxImageDisplay
                src={selectedBox.image}
                alt={selectedBox.name}
                className="w-full h-full object-cover object-center"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C10] via-[#0B1C10]/50 to-[#0B1C10]/10 pointer-events-none" />

              <button
                type="button"
                onClick={() => setSelectedBox(null)}
                className="absolute top-3.5 left-3.5 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-sm text-white flex items-center justify-center transition-colors cursor-pointer z-20 border border-white/20 active:scale-90"
                aria-label="إغلاق النافذة"
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>

              <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 flex-wrap justify-end">
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-[#1A3D24] text-xs font-black shadow-md border border-white/40">
                  {selectedBox.badge}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-md text-white text-xs font-black border border-white/20 shadow-md">
                  <Clock className="w-3.5 h-3.5 text-[#EAB308]" strokeWidth={2.5} />
                  <span>متوفر اليوم</span>
                </span>
              </div>

              <div className="absolute bottom-0 right-0 left-0 p-4 sm:p-5 flex items-end justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 id="box-modal-title" className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-lg mb-0.5">
                    {selectedBox.name}
                  </h3>
                  <p className="text-emerald-100 text-xs sm:text-sm font-medium">
                    {selectedBox.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* التفاصيل */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain">

              <div className="relative p-4 sm:p-4.5 rounded-2xl bg-gradient-to-l from-[#FEF3C7]/80 to-[#FED7AA]/80 border border-[#EAB308]/40 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-[#92400E] font-black uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Award className="w-3.5 h-3.5 text-[#EA580C]" strokeWidth={2.5} />
                      <span>السعر الحصري</span>
                    </span>
                    <div className="flex items-baseline gap-2.5" dir="ltr">
                      <span className="text-3xl sm:text-4xl font-black text-[#EA580C] leading-none">
                        {selectedBox.price.toFixed(2)}
                      </span>
                      <span className="text-base sm:text-lg font-black text-[#EA580C]">DH</span>
                      <span className="text-sm text-stone-400 line-through font-bold">
                        {selectedBox.originalPrice.toFixed(2)} DH
                      </span>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#EAB308]/40 text-[#1A3D24] text-xs font-bold shadow-sm">
                      <Package className="w-3.5 h-3.5 text-[#2D6A3F]" strokeWidth={2.5} />
                      <span>{selectedBox.itemsCountLabel}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-white border border-[#2D6A3F]/15 text-center">
                  <Users className="w-5 h-5 text-[#2D6A3F] mx-auto mb-1.5" strokeWidth={2.5} />
                  <div className="text-[10px] text-[#5A6B5F] font-black uppercase mb-0.5">يناسب</div>
                  <div className="text-xs font-black text-[#1A3D24]">{selectedBox.servings}</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#2D6A3F]/15 text-center">
                  <Scale className="w-5 h-5 text-[#2D6A3F] mx-auto mb-1.5" strokeWidth={2.5} />
                  <div className="text-[10px] text-[#5A6B5F] font-black uppercase mb-0.5">الوزن</div>
                  <div className="text-xs font-black text-[#1A3D24]">{selectedBox.weight}</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#2D6A3F]/15 text-center">
                  <Package className="w-5 h-5 text-[#2D6A3F] mx-auto mb-1.5" strokeWidth={2.5} />
                  <div className="text-[10px] text-[#5A6B5F] font-black uppercase mb-0.5">الأصناف</div>
                  <div className="text-xs font-black text-[#1A3D24]">{selectedBox.itemsCountLabel}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#2D6A3F]/15">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="w-4 h-4 text-[#2D6A3F]" strokeWidth={2.5} />
                  <h4 className="text-sm font-black text-[#1A3D24]">عن هذا الصندوق</h4>
                </div>
                <p className="text-xs sm:text-sm text-[#3E382F] leading-relaxed font-medium">
                  {selectedBox.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-[#1A3D24] flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#EA580C]" strokeWidth={2.5} />
                    <span>محتويات الصندوق</span>
                  </h4>
                  <span className="text-[11px] font-black text-[#2D6A3F] bg-[#2D6A3F]/10 px-2.5 py-1 rounded-full border border-[#2D6A3F]/20">
                    {selectedBox.items.length} صنف
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedBox.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-[#2D6A3F]/12 flex items-center justify-between gap-2 hover:border-[#2D6A3F]/35 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-[#FAF8F3] border border-[#2D6A3F]/15 flex items-center justify-center text-base shrink-0">
                          {item.icon}
                        </span>
                        <span className="font-bold text-[#1A3D24] text-xs truncate">{item.name}</span>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-[#2D6A3F]/10 text-[#2D6A3F] font-black text-[11px] border border-[#2D6A3F]/25">
                        {item.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* تم حذف قسم ضمانات خُضرة بناءً على الطلب */}

            </div>

            {/* التذييل */}
            <div className="p-4 sm:p-5 bg-white border-t-2 border-[#2D6A3F]/15 flex items-center gap-3 shrink-0 shadow-[0_-4px_20px_rgba(45,106,63,0.06)]">
              <div className="flex items-center gap-1 bg-[#FAF8F3] border-2 border-[#2D6A3F]/20 p-1 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                  disabled={modalQty <= 1}
                  className="w-9 h-9 rounded-xl bg-white border border-[#2D6A3F]/15 flex items-center justify-center text-[#1A3D24] hover:bg-[#FAF8F3] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-90"
                  aria-label="إنقاص الكمية"
                >
                  <Minus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <span className="w-10 text-center font-black text-base text-[#1A3D24] tabular-nums">
                  {modalQty}
                </span>
                <button
                  type="button"
                  onClick={() => setModalQty((q) => Math.min(10, q + 1))}
                  disabled={modalQty >= 10}
                  className="w-9 h-9 rounded-xl bg-white border border-[#2D6A3F]/15 flex items-center justify-center text-[#1A3D24] hover:bg-[#FAF8F3] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-90"
                  aria-label="زيادة الكمية"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              <RippleButton
                id="modal-add-box-btn"
                onClick={() => handleModalAdd(selectedBox)}
                rippleColor="rgba(255,255,255,0.30)"
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(45,106,63,0.35)] hover:shadow-[0_6px_22px_rgba(45,106,63,0.45)] active:scale-[0.98] transition-all cursor-pointer border border-[#EAB308]/25"
              >
                <ShoppingBag className="w-5 h-5 text-[#EAB308] relative z-10" strokeWidth={2.5} />
                <span className="relative z-10">أضف للسلة</span>
                <span className="px-3 py-1 rounded-xl bg-white/15 text-[#EAB308] text-sm font-black tabular-nums relative z-10" dir="ltr">
                  {(selectedBox.price * modalQty).toFixed(2)} DH
                </span>
              </RippleButton>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};