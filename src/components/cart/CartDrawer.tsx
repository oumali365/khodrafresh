// ============================================================
// الملف: CartDrawer.tsx – الإصدار 3.2
// درج السلة – تجربة هادئة، ترحيبية وذكية للحد الأدنى والتوصيل
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  ArrowLeft,
  ShoppingBag,
  Truck,
  Package,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { CartItem } from '../../types';
import { STORE_CONFIG } from '../../data/config';
import { calculateCustomerDeliveryFee } from '../../services/financialEngine';
import { SwipeableCartItem } from './SwipeableCartItem';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onExploreBundles?: () => void;
  onBrowseProducts?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onExploreBundles,
  onBrowseProducts,
}) => {
  const [smartTipVisible, setSmartTipVisible] = useState(false);
  const smartTipTimer = useRef<number | null>(null);

  // إخفاء الرسالة الذكية عند تعديل عناصر السلة
  useEffect(() => {
    setSmartTipVisible(false);
  }, [items]);

  useEffect(() => {
    return () => {
      if (smartTipTimer.current) window.clearTimeout(smartTipTimer.current);
    };
  }, []);

  if (!isOpen) return null;

  // ─── الحسابات المالية المركزية ───
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const deliveryFee = items.length === 0 ? 0 : calculateCustomerDeliveryFee(subtotal);
  const isFreeDelivery = deliveryFee === 0;
  const remainingForFree = Math.max(0, Number((STORE_CONFIG.freeDeliveryThreshold - subtotal).toFixed(2)));
  const progressPercent = Math.min(
    100,
    Math.round((subtotal / STORE_CONFIG.freeDeliveryThreshold) * 100)
  );
  const grandTotal = Number((subtotal + deliveryFee).toFixed(2));

  // الحد الأدنى للطلب (70 د.م) يشمل رسوم التوصيل
  const minOrderAmount = STORE_CONFIG.minOrderAmount || 70;
  const isBelowMinOrder = grandTotal < minOrderAmount && items.length > 0;
  const remainingForMinOrder = Math.max(0, minOrderAmount - grandTotal);

  // ─── عدد المنتجات ───
  const bundleItemsCount = items.filter((i) => !!i.bundleId).length;
  const regularItemsCount = items.length - bundleItemsCount;
  const totalItemsCount = items.reduce((sum, i) => sum + i.qty, 0);

  // ─── التوفير المتوقع من التوصيل المجاني ───
  const estimatedSavings = isFreeDelivery ? STORE_CONFIG.standardDeliveryFee : 0;

  // ─── سيناريو الضغط الذكي على زر تأكيد الطلب ───
  const handleCheckoutClick = () => {
    if (isBelowMinOrder) {
      setSmartTipVisible(true);
      if (smartTipTimer.current) window.clearTimeout(smartTipTimer.current);
      smartTipTimer.current = window.setTimeout(() => {
        setSmartTipVisible(false);
      }, 4000);
      return;
    }
    onProceedToCheckout();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label="سلة المشتريات"
    >
      {/* ─── الطبقة الخلفية ─── */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* ─── درج السلة ─── */}
      <div className="relative mr-auto w-full max-w-md bg-[#FBF9F5] h-full shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-right duration-300">

        {/* ════════ رأس الدرج ════════ */}
        <div className="relative bg-gradient-to-l from-[#C25E12] via-[#B85507] to-[#9C4505] text-white px-4 py-3.5 shadow-md shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />

          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              {/* أيقونة السلة */}
              <div className="relative w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-[#F5D76E]" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#112616] text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-md">
                    {totalItemsCount > 99 ? '99+' : totalItemsCount}
                  </span>
                )}
              </div>

              {/* معلومات السلة */}
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  سلة المشتريات
                </h2>
                <p className="text-[11px] text-amber-100 font-bold truncate">
                  {totalItemsCount} قطعة • {items.length} صنف
                  {bundleItemsCount > 0 && (
                    <span className="mr-1.5 inline-flex items-center gap-0.5 bg-white/20 px-1.5 py-0.5 rounded-md">
                      <Package className="w-2.5 h-2.5" />
                      {bundleItemsCount} صندوق
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* أزرار التحكم */}
            <div className="flex items-center gap-1.5 shrink-0">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all group cursor-pointer touch-manipulation select-none border border-white/20"
                  aria-label="تفريغ السلة"
                  title="تفريغ السلة"
                >
                  <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/25 hover:bg-white/35 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer touch-manipulation select-none border border-white/20"
                aria-label="إغلاق السلة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ════════ شريط التقدم النحيف والأنيق (ارتفاع 4px) ════════ */}
        {items.length > 0 && (
          <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-[#EAE4D7] shrink-0">
            <div className="flex items-center justify-between text-[11px] text-[#6E6759] font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#2D6A3F]" />
                {isFreeDelivery ? (
                  <span className="text-[#163920] font-bold">🎉 حصلت على توصيل مجاني لباب منزلك!</span>
                ) : (
                  <span>تبقى {remainingForFree.toFixed(2)} {STORE_CONFIG.currency} للحصول على توصيل مجاني</span>
                )}
              </span>
              <span className="font-mono text-[10px] text-[#8C8474] font-bold">{progressPercent}%</span>
            </div>
            {/* شريط نحيف جداً بارتفاع 4px בלון رمادي فاتح يتعبأ بالأخضر الهادئ */}
            <div className="w-full bg-[#E5DFD3] h-1 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-[#2D6A3F]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* ════════ قائمة المنتجات ════════ */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#F7F4EC] to-[#EAE2D2] border-2 border-dashed border-[#D4C8B5] flex items-center justify-center text-5xl mb-5">
                🛒
              </div>

              <h3 className="text-lg font-black text-[#112616] mb-1.5">
                سلتك فارغة حالياً
              </h3>
              <p className="text-xs text-[#787163] max-w-[250px] leading-relaxed mb-6 font-medium">
                تصفح تشكيلتنا الطازجة من الخضروات والفواكه وصناديق العائلة وأضف ما تحتاجه
              </p>

              <div className="w-full max-w-[260px] space-y-2.5">
                {onExploreBundles && (
                  <button
                    type="button"
                    id="cart-explore-bundles-btn"
                    onClick={() => {
                      onClose();
                      onExploreBundles();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C25E12] to-[#9C4505] text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none active:scale-95"
                  >
                    <Package className="w-4 h-4 text-[#F5D76E]" />
                    <span>صناديق العائلة التوفيرية</span>
                  </button>
                )}

                <button
                  type="button"
                  id="cart-browse-products-btn"
                  onClick={() => {
                    onClose();
                    onBrowseProducts?.();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#D4C8B5] text-[#524B3E] font-bold text-xs hover:bg-[#F7F4EC] transition-all cursor-pointer touch-manipulation select-none active:scale-95"
                >
                  تصفح المنتجات
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* قائمة العناصر القابلة للسحب */}
              <div className="space-y-2">
                {items.map((item) => (
                  <SwipeableCartItem
                    key={item.key}
                    item={item}
                    onUpdateQty={onUpdateQty}
                    onRemoveItem={onRemoveItem}
                  />
                ))}
              </div>

              {/* تلميح السحب */}
              <div className="pt-1 pb-2 text-center">
                <span className="text-[10px] text-[#787163] font-medium inline-flex items-center gap-1">
                  💡 اسحب أي منتج جانباً لحذفه بسرعة
                </span>
              </div>
            </>
          )}
        </div>

        {/* ════════ تذييل الإجمالي وزر الدفع ════════ */}
        {items.length > 0 && (
          <div className="bg-white border-t border-[#E8E1D3] shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">

            {/* ملخص المبالغ */}
            <div className="p-4 space-y-2.5">
              {isFreeDelivery && (
                <div className="pb-2 border-b border-[#F0E9DA]">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <Percent className="w-3 h-3 text-emerald-700" />
                    وفّرت {estimatedSavings.toFixed(2)} {STORE_CONFIG.currency} (توصيل مجاني)
                  </span>
                </div>
              )}

              {/* المجموع الفرعي */}
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-[#6B6455]">المجموع الفرعي:</span>
                <span className="font-bold text-[#112616] tabular-nums">
                  {subtotal.toFixed(2)} {STORE_CONFIG.currency}
                </span>
              </div>

              {/* رسوم التوصيل */}
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-[#6B6455]">رسوم التوصيل:</span>
                <span className={`font-bold tabular-nums ${
                  isFreeDelivery ? 'text-emerald-700' : 'text-[#112616]'
                }`}>
                  {isFreeDelivery ? '🎉 مجاني' : `${deliveryFee.toFixed(2)} ${STORE_CONFIG.currency}`}
                </span>
              </div>

              {/* المجموع الكلي */}
              <div className="pt-2.5 border-t border-[#EAE4D7] flex justify-between items-center">
                <span className="flex items-center gap-2 font-bold text-[#112616] text-base">
                  <ShoppingBag className="w-4 h-4 text-[#2D6A3F]" />
                  <span>المجموع الكلي:</span>
                </span>
                <span className="text-xl sm:text-2xl text-[#163920] font-black tabular-nums">
                  {grandTotal.toFixed(2)} <span className="text-sm font-bold text-[#5C5547]">{STORE_CONFIG.currency}</span>
                </span>
              </div>

              {/* ─── سطر صغير وأنيق في أسفل السلة بلون رمادي هادئ فوق زر التأكيد ─── */}
              {isBelowMinOrder && (
                <div className="pt-2 flex items-center justify-between text-xs text-[#787163] font-medium border-t border-dashed border-[#EAE4D7]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A8A193]" />
                    <span>الحد الأدنى للطلب: {minOrderAmount} {STORE_CONFIG.currency} (شامل التوصيل)</span>
                  </span>
                  <span className="text-[#575144] font-bold tabular-nums">
                    تبقى {remainingForMinOrder.toFixed(2)} {STORE_CONFIG.currency}
                  </span>
                </div>
              )}
            </div>

            {/* ════════ زر إتمام الطلب والرسالة الذكية ════════ */}
            <div className="px-4 pb-3 space-y-2">
              {/* الرسالة اللطيفة الذكية بتأثير حركي انسيابي تظهر عند الضغط - مختصرة وواضحة */}
              {smartTipVisible && isBelowMinOrder && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-2.5 rounded-2xl bg-emerald-50/95 border border-emerald-200 text-[#163920] text-xs font-bold leading-relaxed text-center shadow-xs transition-all animate-in fade-in slide-in-from-bottom-1 duration-200"
                >
                  <p className="flex items-center justify-center gap-1.5 text-xs text-[#163920]">
                    <span>🥬</span>
                    <span>
                      مرحباً بك! يرجى إضافة منتجات بقيمة{' '}
                      <strong className="font-extrabold text-[#163920] tabular-nums underline decoration-[#F5D76E] decoration-2">
                        {remainingForMinOrder.toFixed(2)} {STORE_CONFIG.currency}
                      </strong>{' '}
                      لإكمال الحد الأدنى ({minOrderAmount} {STORE_CONFIG.currency} شامل التوصيل)
                    </span>
                  </p>
                </div>
              )}

              {/* الزر الذكي */}
              <button
                type="button"
                onClick={handleCheckoutClick}
                className={`w-full min-h-[52px] py-3.5 px-4 rounded-xl font-black text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation select-none active:scale-[0.98] ${
                  isBelowMinOrder
                    ? 'bg-[#EAE5DC] hover:bg-[#E2DDD3] text-[#423C31] border border-[#DDD6C8] shadow-2xs'
                    : 'bg-gradient-to-r from-[#163920] to-[#0E2615] hover:from-[#0E2615] hover:to-[#071A0C] text-white shadow-md hover:shadow-xl hover:scale-[1.01] border-2 border-[#0E2615]'
                }`}
              >
                {isBelowMinOrder ? (
                  <>
                    <ShoppingBag className="w-5 h-5 text-[#736B5E]" />
                    <span>أكمل الحد الأدنى للطلب ({minOrderAmount} {STORE_CONFIG.currency} شامل التوصيل)</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5 text-[#F5D76E]" />
                    <span>تأكيد الطلب</span>
                    <ArrowLeft className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:-translate-x-1" />
                  </>
                )}
              </button>

              {isBelowMinOrder && (
                <button
                  type="button"
                  id="cart-min-order-browse-products-btn"
                  onClick={() => {
                    onClose();
                    onBrowseProducts?.();
                  }}
                  className="w-full py-1.5 text-center text-xs font-bold text-[#163920] hover:text-[#0E2615] hover:underline cursor-pointer transition-colors"
                >
                  + تصفح الخضار والفواكه الطازجة
                </button>
              )}

              {/* ملاحظة أمان */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#787163] font-medium pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A3F]" />
                <span>بياناتك محمية — الدفع عند الاستلام متاح</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
