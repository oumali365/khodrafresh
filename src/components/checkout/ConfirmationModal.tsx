// ============================================================
// الملف: ConfirmationModal.tsx – الإصدار 2.0
// شاشة تأكيد الطلب – تصميم متناسق مع المتجر
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  MessageCircle,
  X,
  ArrowRight,
  Clock,
  MapPin,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Package,
  ShieldCheck,
  Sparkles,
  PartyPopper,
} from 'lucide-react';
import { OrderSubmission } from '../../types';
import { STORE_CONFIG, MOROCCAN_BANKS } from '../../data/config';

interface ConfirmationModalProps {
  isOpen: boolean;
  order: OrderSubmission | null;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  order,
  onClose,
}) => {
  const [showItemsList, setShowItemsList] = useState(false);

  useEffect(() => {
    if (isOpen) {
      import('canvas-confetti')
        .then((module) => {
          const confetti = module.default;
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#163920', '#C25E12', '#F5D76E', '#25D366'],
          });
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const matchedBank = MOROCCAN_BANKS.find(
    (b) => b.id === order.bankId || b.name === order.bankId || b.shortName === order.bankId
  );

  const cleanBankName = matchedBank
    ? (matchedBank.shortName || matchedBank.name)
        .replace(/(البريد|بريد|التجاري|البنك|بنك|القرض|كاش)/gi, '')
        .replace(/[()\-–—]/g, '')
        .trim()
    : order.bankId
    ? order.bankId
        .replace(/(البريد|بريد|التجاري|البنك|بنك|القرض|كاش)/gi, '')
        .replace(/[()\-–—]/g, '')
        .trim()
    : 'تحويل بنكي';

  // ─── بناء نص الواتساب ───
  const waLines = [
    `🛒 *طلب جديد من متجر خُضرة ${order.orderCode}*`,
    order.customerName ? `👤 *الاسم:* ${order.customerName}` : '',
    `📞 *الهاتف:* ${order.phone}`,
    `📍 *عنوان التوصيل:* ${order.address}`,
    order.mapsLink ? `🗺️ *رابط Google Maps:*\n${order.mapsLink}` : '',
    order.notes ? `📝 *ملاحظات:* ${order.notes}` : '',
    `🕒 *وقت التسليم:* ${order.deliverySlot}`,
    `💳 *طريقة الدفع:* ${
      order.paymentMethod === 'bank'
        ? `تحويل بنكي (${cleanBankName})`
        : 'الدفع نقداً عند الاستلام'
    }`,
    order.receiptFileName ? `📎 *وصل التحويل:* ${order.receiptFileName}` : '',
    ``,
    `*قائمة المنتجات:*`,
    ...order.items.map((i) => {
      const isWeight = /^kg$/i.test(i.variantLabel || '');
      const qtyText = isWeight
        ? `${i.qty} kg`
        : `${i.qty} × ${i.variantLabel || 'وحدة'}`;
      return `• ${i.icon} ${i.name} (${qtyText}) — ${i.lineTotal.toFixed(2)} DH`;
    }),
    ``,
    `💰 *المجموع الفرعي:* ${order.subtotal.toFixed(2)} DH`,
    `🚚 *رسوم التوصيل:* ${order.deliveryFee.toFixed(2)} DH`,
    `⭐ *الإجمالي:* ${order.total.toFixed(2)} DH`,
    ``,
    `شكراً لثقتكم بمتجر خُضرة! 🌿`,
  ].filter(Boolean);

  const fullText = waLines.join('\n');
  const whatsappUrl = `https://wa.me/${
    STORE_CONFIG.whatsappCleanNumber
  }?text=${encodeURIComponent(fullText)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#FBF9F5] border border-[#E8E1D3] rounded-[28px] w-full max-w-lg shadow-2xl z-50 overflow-hidden text-center animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] flex flex-col">

        {/* ─── زر الإغلاق ─── */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 z-20 w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/90 backdrop-blur-sm text-[#2D271E] hover:bg-white hover:text-[#C25E12] active:scale-90 flex items-center justify-center transition-all cursor-pointer border border-[#E8E1D3] shadow-sm touch-manipulation select-none"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* ════════ 1. أيقونة النجاح ════════ */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mt-2">
            {/* حلقات خارجية */}
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
            <div className="absolute inset-2 rounded-full bg-emerald-50" />

            {/* الأيقونة المركزية */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#163920] to-[#0E2615] border-4 border-white shadow-xl flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#F5D76E] stroke-[2.5]" />
            </div>

            {/* شارة "تم" في الزاوية */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#C25E12] border-3 border-white flex items-center justify-center shadow-md">
              <PartyPopper className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* ════════ 2. العنوان والوصف ════════ */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#112616] leading-tight">
              تم استلام طلبك بنجاح! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-[#524B3E] font-medium leading-relaxed max-w-xs mx-auto">
              شكراً لثقتك بمتجر خُضرة. سنتواصل معك قريباً لتأكيد التفاصيل.
            </p>
          </div>

          {/* ════════ 3. رقم الطلب ════════ */}
          <div className="inline-flex items-center gap-2.5 bg-white border-2 border-dashed border-[#C25E12] rounded-2xl px-5 py-3 shadow-sm">
            <span className="text-xs font-black text-[#787163]">رقم الطلب</span>
            <span className="font-mono text-base sm:text-lg font-black text-[#C25E12] tracking-wider tabular-nums">
              {order.orderCode}
            </span>
          </div>

          {/* ════════ 4. تفاصيل الطلب ════════ */}
          <div className="bg-white border border-[#E8E1D3] rounded-2xl p-4 text-right space-y-3 shadow-sm">

            {/* عنوان التوصيل */}
            <div className="bg-gradient-to-l from-[#F7F4EC] to-[#FFF9F0] border border-[#E8E1D3] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#E8E1D3]">
                <div className="w-7 h-7 rounded-lg bg-[#C25E12] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-[#112616] text-xs sm:text-sm">
                  عنوان التوصيل
                </span>
              </div>

              <div className="space-y-2 text-right">
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#E8E1D3]/60">
                  <span className="font-bold text-[#787163] text-[11px]">الاسم</span>
                  <span className="font-black text-[#112616] text-xs">
                    {order.customerName}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#E8E1D3]/60">
                  <span className="font-bold text-[#787163] text-[11px]">الهاتف</span>
                  <span
                    className="font-black text-[#112616] text-xs tabular-nums"
                    dir="ltr"
                  >
                    {order.phone}
                  </span>
                </div>

                <div className="flex items-start justify-between bg-white rounded-lg px-3 py-2 border border-[#E8E1D3]/60 gap-3">
                  <span className="font-bold text-[#787163] text-[11px] shrink-0">
                    العنوان
                  </span>
                  <span className="font-black text-[#112616] text-xs text-left leading-snug">
                    {order.address}
                  </span>
                </div>
              </div>
            </div>

            {/* وقت التسليم */}
            <div className="bg-gradient-to-l from-[#163920] to-[#0E2615] rounded-xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#F5D76E]" />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <span className="text-[#F5D76E] font-black text-[10px] uppercase tracking-wider block mb-0.5">
                    وقت التسليم المفضل
                  </span>
                  <span className="font-black text-white text-sm truncate block">
                    {order.deliverySlot}
                  </span>
                </div>
              </div>
            </div>

            {/* طريقة الدفع */}
            <div className="flex items-center justify-between text-xs sm:text-sm bg-[#F7F4EC] rounded-xl px-3.5 py-2.5 border border-[#E8E1D3]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#163920] shrink-0" />
                <span className="font-black text-[#524B3E] text-[11px]">
                  طريقة الدفع
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-black text-[#112616] text-xs">
                {order.paymentMethod === 'bank' ? (
                  <>
                    {matchedBank?.image && (
                      <img
                        src={matchedBank.image}
                        alt="Bank"
                        className="h-5 w-auto max-w-[40px] object-contain"
                      />
                    )}
                    <span>تحويل عبر {cleanBankName}</span>
                  </>
                ) : (
                  <span>الدفع عند الاستلام</span>
                )}
              </div>
            </div>

            {/* قائمة المنتجات */}
            <div className="pt-2 border-t border-[#F0E9DA]">
              <button
                type="button"
                onClick={() => setShowItemsList(!showItemsList)}
                className="w-full flex items-center justify-between text-xs font-black text-[#112616] hover:text-[#C25E12] active:opacity-75 transition-all py-2 min-h-[40px] cursor-pointer touch-manipulation select-none"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#C25E12]" />
                  <span>المنتجات المطلوبة ({order.items.length})</span>
                </span>
                {showItemsList ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showItemsList && (
                <div className="mt-2 space-y-1 overflow-y-auto max-h-40 pr-1">
                  {order.items.map((i) => (
                    <div
                      key={i.key}
                      className="flex items-center justify-between py-2 px-2.5 hover:bg-[#F7F4EC] rounded-lg transition-colors gap-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{i.icon}</span>
                        <span className="text-xs font-black text-[#112616] truncate">
                          {i.name}
                        </span>
                        <span
                          dir="ltr"
                          className="text-[10px] text-[#C25E12] font-black bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 shrink-0"
                        >
                          {/^kg$/i.test(i.variantLabel || '') ? `${i.qty} kg` : `×${i.qty}`}
                        </span>
                      </span>
                      <span className="text-xs font-black text-[#C25E12] tabular-nums shrink-0">
                        {i.lineTotal.toFixed(2)} DH
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* الإجمالي */}
            <div className="pt-3 border-t-2 border-[#E8E1D3] flex justify-between items-center">
              <span className="text-sm font-black text-[#112616] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#C25E12]" />
                المجموع الإجمالي
              </span>
              <span className="text-xl sm:text-2xl text-[#C25E12] font-black tabular-nums">
                {order.total.toFixed(2)}{' '}
                <span className="text-sm">{STORE_CONFIG.currency}</span>
              </span>
            </div>
          </div>

          {/* ════════ 5. الأزرار ════════ */}
          <div className="space-y-2.5 pt-1">

            {/* زر الواتساب */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[52px] py-3.5 px-4 rounded-xl bg-gradient-to-l from-[#25D366] to-[#1EBE5D] hover:from-[#20BA5A] hover:to-[#17A34A] active:scale-95 text-white font-black text-sm sm:text-base shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer border-2 border-[#1EBE5D] touch-manipulation select-none group"
            >
              <MessageCircle className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
              <span>إرسال وتأكيد عبر واتساب</span>
            </a>

            {/* زر متابعة التسوق */}
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[52px] py-3.5 px-4 rounded-xl bg-gradient-to-l from-[#163920] to-[#0E2615] hover:from-[#0E2615] hover:to-[#071A0C] active:scale-95 text-white font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-[#0E2615] shadow-sm hover:shadow-md touch-manipulation select-none group"
            >
              <span>متابعة التسوق</span>
              <ArrowRight className="w-4 h-4 text-[#F5D76E] stroke-[2.5] transition-transform group-hover:translate-x-1" />
            </button>

            {/* ملاحظة الأمان */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#787163] font-medium pt-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>طلبك محفوظ وآمن — سنتواصل معك قريباً</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};