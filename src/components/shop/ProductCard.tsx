// ============================================================
// الملف: ProductCard.tsx – الإصدار 4.3
// تكبير زر الإضافة فقط + الحفاظ على حجم العدّاد
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, Check, ShoppingBag } from 'lucide-react';
import gsap from 'gsap';
import { motion } from 'motion/react';
import { Product } from '../../types';
import { STORE_CONFIG } from '../../data/config';

interface ProductCardProps {
  product: Product;
  inCartQty: number;
  onAddToCart: (product: Product, quantity: number) => void;
  index?: number;
}

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  disabled?: boolean;
  ariaLabel?: string;
}> = ({ onClick, className, children, rippleColor = 'rgba(255,255,255,0.30)', disabled, ariaLabel }) => {
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
      ripple.className = 'product-ripple';
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
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  inCartQty,
  onAddToCart,
}) => {
  const isWeight = product.type === 'weight';
  const initialQty = isWeight ? STORE_CONFIG.weightStep : 1;
  const [selectedQty, setSelectedQty] = useState<number>(initialQty);
  const [isJustAdded, setIsJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const pulseTimer = useRef<number | null>(null);

  // الحاكم في التوفر والمخزون: إذا كان stock = 0 فالمنتج غير متوفر، إذا كان بين 1 و 5 كمية محدودة، فوق 5 متوفر
  const isAvailable =
    product.stock !== undefined && product.stock !== null
      ? product.stock > 0 && product.active !== false && product.is_available !== false
      : product.active !== false && product.is_available !== false;
  const isSoldOut = !isAvailable;

  useEffect(() => {
    if (isJustAdded) {
      setIsPulsing(true);
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
      pulseTimer.current = window.setTimeout(() => setIsPulsing(false), 700);
    }
    return () => {
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    };
  }, [isJustAdded]);

  const handleDecrement = () => {
    if (isWeight) {
      setSelectedQty((prev) =>
        Math.max(STORE_CONFIG.weightStep, +(prev - STORE_CONFIG.weightStep).toFixed(1))
      );
    } else {
      setSelectedQty((prev) => Math.max(1, prev - 1));
    }
  };

  const handleIncrement = () => {
    if (isWeight) {
      setSelectedQty((prev) =>
        Math.min(STORE_CONFIG.weightMax, +(prev + STORE_CONFIG.weightStep).toFixed(1))
      );
    } else {
      setSelectedQty((prev) => Math.min(20, prev + 1));
    }
  };

  // ─── GSAP Flyer (بدون تغيير) ───
  const animateToCart = () => {
    if (!imgContainerRef.current) return;

    const rect = imgContainerRef.current.getBoundingClientRect();
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
    flyer.style.width = '64px';
    flyer.style.height = '64px';
    flyer.style.left = `${rect.left + rect.width / 2 - 32}px`;
    flyer.style.top = `${rect.top + rect.height / 2 - 32}px`;

    if (product.image_url) {
      const img = document.createElement('img');
      img.src = product.image_url;
      img.alt = product.name;
      img.className = 'w-full h-full object-contain';
      flyer.appendChild(img);
    } else {
      const icon = document.createElement('span');
      icon.textContent = product.icon || '🛒';
      icon.className = 'text-3xl';
      flyer.appendChild(icon);
    }

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
    }).to(flyer, {
      x: deltaX,
      y: deltaY,
      scale: 0.25,
      opacity: 0.75,
      rotation: 360,
      duration: 0.6,
      ease: 'power2.in',
    });
  };

  const handleAdd = () => {
    if (isSoldOut) return;
    animateToCart();
    onAddToCart(product, selectedQty);
    setIsJustAdded(true);
    setTimeout(() => setIsJustAdded(false), 1200);
  };

  const getStatusBadge = () => {
    if (isSoldOut) {
      return { text: 'غير متوفر', cls: 'bg-rose-50 text-rose-800 border-rose-200 font-black' };
    }
    if (product.stock !== undefined && product.stock !== null && product.stock >= 1 && product.stock <= 5) {
      return {
        text: `كمية محدودة (${product.stock})`,
        cls: 'bg-amber-50 text-amber-900 border-amber-300 font-black',
      };
    }
    return {
      text: 'متوفر',
      cls: 'bg-[#2D6A3F]/10 text-[#1A3D24] border-[#2D6A3F]/30 font-black',
    };
  };

  const badge = getStatusBadge();

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`product-fade-in group relative bg-white rounded-2xl p-2.5 sm:p-3.5 border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isSoldOut
          ? 'opacity-70 border-stone-300 shadow-xs'
          : inCartQty > 0
          ? 'border-[#EA580C]/40 hover:border-[#EA580C]/65 hover:-translate-y-1 shadow-[0_4px_14px_rgba(234,88,12,0.08)] hover:shadow-[0_10px_24px_rgba(234,88,12,0.15)]'
          : 'border-[#2D6A3F]/15 hover:border-[#2D6A3F]/50 hover:-translate-y-1 shadow-xs hover:shadow-[0_10px_24px_rgba(45,106,63,0.14)]'
      }`}
    >
      <style>{`
        @keyframes productRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .product-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: productRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        @keyframes productFocusPulse {
          0%   { opacity: 0.55; }
          100% { opacity: 0; }
        }
        .product-focus-pulse {
          animation: productFocusPulse 700ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .product-ripple,
          .product-focus-pulse { animation: none; }
        }
      `}</style>

      {/* إضاءة خلفية ناعمة تظهر عند التحويم */}
      <div
        className="absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full bg-gradient-to-b from-[#EAB308]/12 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        aria-hidden="true"
      />

      {/* ─── شارة الحالة ─── */}
      <div className="flex items-center justify-between w-full mb-1 sm:mb-1.5 relative z-10">
        <span
          className={`text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${badge.cls}`}
        >
          {badge.text}
        </span>
      </div>

      {/* ─── الصورة + الاسم + المصدر + السعر ─── */}
      <div className="flex flex-col items-center text-center relative z-10">
        <div
          ref={imgContainerRef}
          className="relative w-[88px] h-[88px] sm:w-[106px] sm:h-[106px] bg-transparent flex items-center justify-center text-[42px] mb-1.5 transition-transform duration-300 ease-out group-hover:scale-108"
        >
          {product.image_url && !imgError ? (
            <img
              src={product.image_url}
              alt={product.name}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                isImgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              decoding="async"
              width="106"
              height="106"
              onLoad={() => setIsImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          ) : (
            <span>{product.icon || '🛒'}</span>
          )}
        </div>

        <h3 className="font-extrabold text-sm sm:text-base text-[#1A3D24] group-hover:text-[#2D6A3F] transition-colors line-clamp-1 mb-0.5">
          {product.name}
        </h3>

        {product.origin && (
          <span className="text-[10px] sm:text-xs text-[#5A6B5F] font-semibold mb-0.5 flex items-center justify-center gap-0.5">
            <span className="text-[#EA580C]">📍</span>
            {product.origin}
          </span>
        )}

        <div
          dir="ltr"
          className="inline-flex items-baseline justify-center gap-1 text-xs text-[#1A3D24] font-semibold mt-0.5"
        >
          <span className="text-lg sm:text-xl font-black text-[#EA580C] tabular-nums">
            {product.price.toFixed(2)}
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-[#EA580C]">DH</span>
          <span className="text-[11px] text-[#5A6B5F] font-bold">
            / {isWeight ? 'kg' : product.unit_label || 'pièce'}
          </span>
        </div>
      </div>

      {/* ─── العدّاد (بدون تغيير) + زر الإضافة ─── */}
      <div className="mt-2.5 pt-2.5 border-t border-[#2D6A3F]/10 relative z-10">
        {!isSoldOut && (
          <div className="flex items-center justify-between bg-[#FAF8F3] rounded-xl p-1.5 border border-[#2D6A3F]/15 mb-2">
            <RippleButton
              onClick={handleIncrement}
              ariaLabel="زيادة الكمية"
              rippleColor="rgba(45,106,63,0.22)"
              className="w-[30px] h-[30px] sm:w-8 sm:h-8 min-w-[30px] min-h-[30px] rounded-lg bg-white border border-[#2D6A3F]/20 text-[#1A3D24] hover:bg-[#2D6A3F] hover:text-white hover:border-[#2D6A3F] flex items-center justify-center font-black transition-all duration-150 active:scale-90 cursor-pointer shadow-2xs touch-manipulation select-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5] relative z-10" />
            </RippleButton>

            <div className="flex items-center justify-center leading-none select-none px-1.5">
              <span dir="ltr" className="text-[13px] sm:text-[15px] font-black text-[#1A3D24] tabular-nums">
                {selectedQty} {isWeight ? 'kg' : ''}
              </span>
            </div>

            <RippleButton
              onClick={handleDecrement}
              ariaLabel="إنقاص الكمية"
              rippleColor="rgba(45,106,63,0.22)"
              className="w-[30px] h-[30px] sm:w-8 sm:h-8 min-w-[30px] min-h-[30px] rounded-lg bg-white border border-[#2D6A3F]/20 text-[#1A3D24] hover:bg-[#2D6A3F] hover:text-white hover:border-[#2D6A3F] flex items-center justify-center font-black transition-all duration-150 active:scale-90 cursor-pointer shadow-2xs touch-manipulation select-none"
            >
              <Minus className="w-4 h-4 stroke-[2.5] relative z-10" />
            </RippleButton>
          </div>
        )}

        <RippleButton
          disabled={isSoldOut}
          onClick={handleAdd}
          ariaLabel={isSoldOut ? 'غير متوفر' : 'أضف للسلة'}
          rippleColor="rgba(255,255,255,0.30)"
          className={`w-full h-[46px] sm:h-[50px] min-h-[46px] sm:min-h-[50px] px-4 sm:px-5 rounded-xl font-black text-[14px] sm:text-[15px] flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer touch-manipulation select-none active:scale-95 ${
            isSoldOut
              ? 'bg-stone-200 text-stone-500 border border-stone-300 cursor-not-allowed'
              : isJustAdded
              ? 'bg-gradient-to-l from-emerald-600 to-emerald-700 text-white shadow-[0_4px_12px_rgba(5,150,105,0.28)] scale-[1.01]'
              : inCartQty > 0
              ? 'bg-gradient-to-l from-[#EA580C] to-[#C25E12] hover:from-[#F97316] hover:to-[#EA580C] text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] hover:shadow-[0_6px_18px_rgba(234,88,12,0.36)] border border-[#EAB308]/25'
              : 'bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] text-white shadow-[0_4px_12px_rgba(45,106,63,0.25)] hover:shadow-[0_6px_18px_rgba(45,106,63,0.35)] border border-[#EAB308]/25'
          }`}
        >
          {isSoldOut ? (
            <span className="relative z-10">غير متوفر</span>
          ) : isJustAdded ? (
            <>
              <Check className="w-5 h-5 text-white animate-in zoom-in stroke-[2.5] relative z-10" />
              <span className="relative z-10">تمت الإضافة</span>
            </>
          ) : inCartQty > 0 ? (
            <>
              <ShoppingBag className="w-5 h-5 text-white relative z-10" strokeWidth={2.5} />
              <span className="relative z-10 whitespace-nowrap">أضف المزيد</span>
              <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[12px] font-black tabular-nums relative z-10">
                {inCartQty}
              </span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5 text-[#EAB308] relative z-10" strokeWidth={2.5} />
              <span className="relative z-10 whitespace-nowrap">أضف للسلة</span>
            </>
          )}
        </RippleButton>
      </div>

      {/* ✅ نبضة ذهبية عند الإضافة */}
      {isPulsing && (
        <div
          className="product-focus-pulse absolute inset-0 rounded-2xl bg-[#EAB308]/12 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </motion.article>
  );
};

export const ProductCard = React.memo(ProductCardComponent, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.inCartQty === next.inCartQty &&
    prev.product.is_available === next.product.is_available &&
    prev.product.price === next.product.price &&
    prev.product.name === next.product.name &&
    prev.product.image_url === next.product.image_url &&
    prev.product.active === next.product.active &&
    prev.index === next.index
  );
});