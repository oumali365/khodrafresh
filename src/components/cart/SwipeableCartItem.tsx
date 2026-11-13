// ============================================================
// الملف: SwipeableCartItem.tsx
// الإصدار: 3.1 (هوية خضرة الموحّدة)
// ============================================================
import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Trash2, Plus, Minus, Package } from 'lucide-react';
import { CartItem } from '../../types';
import { STORE_CONFIG } from '../../data/config';

interface SwipeableCartItemProps {
  item: CartItem;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
}

export const SwipeableCartItem: React.FC<SwipeableCartItemProps> = ({
  item,
  onUpdateQty,
  onRemoveItem,
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isPastThreshold, setIsPastThreshold] = useState(false);
  const [imgError, setImgError] = useState(false);
  const x = useMotionValue(0);

  // إظهار أيقونة وتأثير الحذف عند السحب
  const rightOpacity = useTransform(x, [-110, -50, 0], [1, 0.6, 0]);
  const rightScale = useTransform(x, [-110, -50, 0], [1.15, 0.95, 0.7]);

  const leftOpacity = useTransform(x, [0, 50, 110], [0, 0.6, 1]);
  const leftScale = useTransform(x, [0, 50, 110], [0.7, 0.95, 1.15]);

  const handleDrag = (_: any, info: PanInfo) => {
    const threshold = 85;
    if (Math.abs(info.offset.x) >= threshold) {
      if (!isPastThreshold) setIsPastThreshold(true);
    } else {
      if (isPastThreshold) setIsPastThreshold(false);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 85;
    const velocityThreshold = 400;

    const shouldDelete =
      Math.abs(info.offset.x) >= threshold ||
      Math.abs(info.velocity.x) >= velocityThreshold;

    if (shouldDelete) {
      setIsRemoving(true);
      onRemoveItem(item.key);
    } else {
      setIsPastThreshold(false);
    }
  };

  const isBundleItem = !!item.bundleId;
  const isWeightItem = /^kg$|كغ|كيلو|\bkg\b/i.test(item.variantLabel || '');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: x.get() > 0 ? 250 : -250,
        height: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: 'hidden',
        transition: {
          opacity: { duration: 0.2 },
          height: { duration: 0.25, delay: 0.05 },
          marginBottom: { duration: 0.25, delay: 0.05 },
        },
      }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      // ✅ خلفية الحذف: تدرج أحمر/برتقالي
      className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#C25E12] via-[#DC2626] to-[#C25E12] shadow-sm select-none touch-pan-y"
    >
      {/* ════════ الطبقة الخلفية (السحب لليسار) ════════ */}
      <motion.div
        style={{ opacity: rightOpacity, scale: rightScale }}
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 pl-3 gap-2 text-white font-black text-xs pointer-events-none"
      >
        <span className="drop-shadow-sm">حذف من السلة</span>
        <Trash2 className="w-5 h-5 text-white stroke-[2.5] drop-shadow-sm" />
      </motion.div>

      {/* ════════ الطبقة الخلفية (السحب لليمين) ════════ */}
      <motion.div
        style={{ opacity: leftOpacity, scale: leftScale }}
        className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 pr-3 gap-2 text-white font-black text-xs pointer-events-none"
      >
        <Trash2 className="w-5 h-5 text-white stroke-[2.5] drop-shadow-sm" />
        <span className="drop-shadow-sm">حذف من السلة</span>
      </motion.div>

      {/* ════════ بطاقة المنتج القابلة للسحب ════════ */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.4}
        dragSnapToOrigin={!isRemoving}
        style={{ x }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileDrag={{
          cursor: 'grabbing',
          // ✅ ظل عضوي أخضر أثناء السحب
          boxShadow: '0 8px 20px -4px rgba(45,106,63,0.20)',
        }}
        className={`relative bg-white border-2 transition-all duration-200 rounded-xl p-2 sm:p-2.5 flex items-center gap-2 sm:gap-2.5 z-10 ${
          isPastThreshold
            ? 'border-rose-400 bg-rose-50/40 shadow-[0_4px_14px_rgba(220,38,38,0.15)]'
            : isBundleItem
            ? 'border-[#EAB308]/50 bg-[#FEF3C7]/30'
            : 'border-[#2D6A3F]/15 hover:border-[#2D6A3F]/40'
        }`}
      >
        {/* ─── أيقونة/صورة المنتج ─── */}
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#FAF8F3] border border-[#2D6A3F]/12 flex items-center justify-center shrink-0 overflow-visible shadow-sm pointer-events-none">
          {/* الصورة أو الأيقونة */}
          <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center">
            {item.image_url && !imgError ? (
              <img
                src={item.image_url}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-2xl sm:text-3xl">{item.icon}</span>
            )}
          </div>

          {/* ✅ شارة الصندوق — ذهبية بهوية خضرة */}
          {isBundleItem && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-[#FACC15] to-[#EAB308] text-[#1A3D24] text-[10px] flex items-center justify-center border-2 border-white shadow-md z-10"
              title="من صندوق عائلة"
            >
              <Package className="w-3 h-3" strokeWidth={2.5} />
            </span>
          )}
        </div>

        {/* ─── معلومات المنتج (بدون الوزن الصغير تحت العنوان) ─── */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <h4 className="text-xs sm:text-sm font-black text-[#1A3D24] truncate leading-tight">
            {item.name}
          </h4>
          <div className="text-xs sm:text-sm font-black text-[#EA580C] mt-1 tabular-nums">
            {item.lineTotal.toFixed(2)} {STORE_CONFIG.currency}
          </div>
        </div>

        {/* ─── عداد الكمية / الوزن ─── */}
        <div
          className="flex items-center gap-1 bg-[#FAF8F3] border border-[#2D6A3F]/15 rounded-lg p-0.5 shrink-0 select-none touch-manipulation"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const step = isWeightItem ? (STORE_CONFIG.weightStep || 0.5) : 1;
              onUpdateQty(item.key, -step);
            }}
            className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-md bg-white text-[#1A3D24] hover:bg-[#2D6A3F] hover:text-[#EAB308] active:scale-90 flex items-center justify-center font-black text-xs transition-all cursor-pointer shadow-sm border border-[#2D6A3F]/20 hover:border-[#2D6A3F] touch-manipulation select-none"
            aria-label="إنقاص الكمية"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <span
            dir="ltr"
            className="text-xs font-black text-[#1A3D24] min-w-[38px] sm:min-w-[44px] px-1 text-center select-none tabular-nums whitespace-nowrap"
          >
            {isWeightItem ? `${item.qty} kg` : item.qty}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const step = isWeightItem ? (STORE_CONFIG.weightStep || 0.5) : 1;
              onUpdateQty(item.key, step);
            }}
            className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-md bg-white text-[#1A3D24] hover:bg-[#2D6A3F] hover:text-[#EAB308] active:scale-90 flex items-center justify-center font-black text-xs transition-all cursor-pointer shadow-sm border border-[#2D6A3F]/20 hover:border-[#2D6A3F] touch-manipulation select-none"
            aria-label="زيادة الكمية"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};