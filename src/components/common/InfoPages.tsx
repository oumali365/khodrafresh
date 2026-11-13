// ============================================================
// InfoPages.tsx – الإصدار 2.1
// هوية خضرة الموحّدة + نصوص احترافية مقتضبة
// ============================================================
import React, { useRef } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Leaf,
  Heart,
  Truck,
  Lock,
  CheckCircle2,
  Award,
  Users,
  Sparkles,
  Smartphone,
  Scale,
  MapPin,
  CreditCard,
  PackageCheck,
} from 'lucide-react';

interface InfoPagesProps {
  page: 'about' | 'policy' | 'privacy';
  onBackToShop: () => void;
}

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  ariaLabel?: string;
}> = ({ onClick, className, children, rippleColor = 'rgba(45,106,63,0.20)', ariaLabel }) => {
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'info-ripple';
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
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

export const InfoPages: React.FC<InfoPagesProps> = ({ page, onBackToShop }) => {
  return (
    <>
      <style>{`
        @keyframes infoRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .info-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: infoRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .info-ripple { animation: none; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">

        {/* ════════ زر العودة ════════ */}
        <RippleButton
          onClick={onBackToShop}
          ariaLabel="العودة إلى المتجر"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-white bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] mb-5 cursor-pointer px-4 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(45,106,63,0.30)] hover:shadow-[0_6px_22px_rgba(45,106,63,0.42)] active:scale-95 transition-all group touch-manipulation select-none border border-[#EAB308]/25"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 relative z-10" strokeWidth={2.5} />
          <span className="relative z-10">العودة للمتجر</span>
        </RippleButton>

        {/* ════════ صفحة "من نحن" ════════ */}
        {page === 'about' && (
          <article className="relative bg-[#FBF9F5] border-2 border-[#2D6A3F]/15 rounded-[24px] p-5 sm:p-8 shadow-sm text-right space-y-5 overflow-hidden">

            {/* دوائر ضوئية */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#EAB308]/12 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#2D6A3F]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              {/* الرأس */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#2D6A3F]/10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] flex items-center justify-center shadow-[0_4px_14px_rgba(45,106,63,0.30)] shrink-0 border border-[#EAB308]/40">
                  <Leaf className="w-6 h-6 text-[#EAB308]" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-black text-[#1A3D24] leading-tight flex items-center gap-2 flex-wrap">
                    من نحن — قصة متجر خُضرة
                    <span className="inline-block w-2 h-2 rounded-full bg-[#EAB308]" />
                  </h1>
                  <span className="text-[11px] sm:text-xs text-[#5A6B5F] font-bold block mt-1">
                    مشروع مغربي يربط الحقل ببيتك
                  </span>
                </div>
              </div>

              {/* القصة المقتضبة */}
              <p className="text-sm sm:text-base text-[#443F35] leading-relaxed mt-5 font-medium">
                <strong className="text-[#1A3D24] font-black">خُضرة</strong> مشروع مغربي من فاس، وُلد من فكرة بسيطة: أن تصل الخضر والفواكه الطازجة إلى بيتك مباشرة بعد قطفها، دون ازدحام السوق ولا عناء البحث عن الجودة.
              </p>

              {/* ما يجعلنا مختلفين */}
              <div className="bg-white p-5 rounded-2xl border-2 border-[#2D6A3F]/12 space-y-3 shadow-sm mt-5">
                <h3 className="font-black text-base text-[#1A3D24] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#EA580C]" strokeWidth={2.5} />
                  <span>ما الذي يميزنا؟</span>
                </h3>

                <ul className="space-y-3 text-xs sm:text-sm text-[#5A6B5F]">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[#2D6A3F]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A3F] stroke-[2.5]" />
                    </span>
                    <span>
                      <strong className="text-[#1A3D24]">من المزرعة مباشرة:</strong> انتقاء يومي من أفضل المزارع المغربية بلا وسطاء.
                    </span>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[#2D6A3F]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A3F] stroke-[2.5]" />
                    </span>
                    <span>
                      <strong className="text-[#1A3D24]">جودة مضمونة:</strong> فرز يدوي دقيق، وتعبئة في صناديق حفظ تحافظ على الطراوة.
                    </span>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[#2D6A3F]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A3F] stroke-[2.5]" />
                    </span>
                    <span>
                      <strong className="text-[#1A3D24]">احترام وقتك:</strong> توصيل في الموعد إلى جميع أحياء فاس، مع الدفع عند الاستلام.
                    </span>
                  </li>
                </ul>
              </div>

 {/* مزايا تجربة المستخدم */}
<div className="bg-gradient-to-br from-white to-[#FAF8F3] p-5 rounded-2xl border-2 border-[#2D6A3F]/15 space-y-4 shadow-sm mt-5">
  {/* العنوان */}
  <h3 className="font-black text-base text-[#1A3D24] flex items-center gap-2">
    <Sparkles className="w-4 h-4 text-[#EAB308] fill-[#EAB308]" strokeWidth={2.5} />
    <span>تجربة تسوق مصممة لراحتك</span>
  </h3>
  <div className="relative p-4 rounded-xl bg-gradient-to-l from-[#2D6A3F]/8 via-[#EAB308]/6 to-[#2D6A3F]/8 border-r-4 border-[#EAB308] shadow-sm">
    <p className="text-xs sm:text-sm text-[#1A3D24] font-black leading-relaxed">
      طوّرنا متجر خُضرة بأحدث التقنيات الرقمية لنمنحك تجربة اقتناء مريحة وواضحة من أول نقرة حتى استلام طلبك.
    </p>
  </div>

  {/* شبكة المزايا */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
    <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#2D6A3F]/12 flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-[#2D6A3F]/10 text-[#2D6A3F] flex items-center justify-center shrink-0 mt-0.5 border border-[#2D6A3F]/20">
        <Smartphone className="w-4 h-4 stroke-[2.5]" />
      </span>
      <div>
        <h4 className="text-xs sm:text-sm font-black text-[#1A3D24]">تطبيق فوري خفيف</h4>
        <p className="text-[11px] sm:text-xs text-[#5A6B5F] leading-relaxed mt-0.5 font-semibold">
          ثبّت التطبيق على شاشتك الرئيسية بضغطة واحدة، بدون استهلاك ذاكرة.
        </p>
      </div>
    </div>

    <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#2D6A3F]/12 flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5 border border-[#EA580C]/20">
        <Scale className="w-4 h-4 stroke-[2.5]" />
      </span>
      <div>
        <h4 className="text-xs sm:text-sm font-black text-[#1A3D24]">عداد أوزان ذكي</h4>
        <p className="text-[11px] sm:text-xs text-[#5A6B5F] leading-relaxed mt-0.5 font-semibold">
          اختر الوزن بالكيلوغرام بدقة مع حساب لحظي للسعر.
        </p>
      </div>
    </div>

    <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#2D6A3F]/12 flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-[#2D6A3F]/10 text-[#2D6A3F] flex items-center justify-center shrink-0 mt-0.5 border border-[#2D6A3F]/20">
        <PackageCheck className="w-4 h-4 stroke-[2.5]" />
      </span>
      <div>
        <h4 className="text-xs sm:text-sm font-black text-[#1A3D24]">صناديق وفلاتر ذكية</h4>
        <p className="text-[11px] sm:text-xs text-[#5A6B5F] leading-relaxed mt-0.5 font-semibold">
          صناديق أسبوعية جاهزة وفلاتر بحث سريعة حسب السعر.
        </p>
      </div>
    </div>

    <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#2D6A3F]/12 flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5 border border-[#EA580C]/20">
        <MapPin className="w-4 h-4 stroke-[2.5]" />
      </span>
      <div>
        <h4 className="text-xs sm:text-sm font-black text-[#1A3D24]">تحديد الموقع GPS</h4>
        <p className="text-[11px] sm:text-xs text-[#5A6B5F] leading-relaxed mt-0.5 font-semibold">
          دقة في تحديد موقع التوصيل بضغطة زر.
        </p>
      </div>
    </div>

    <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#2D6A3F]/12 flex items-start gap-3 sm:col-span-2">
      <span className="w-8 h-8 rounded-lg bg-[#2D6A3F]/10 text-[#2D6A3F] flex items-center justify-center shrink-0 mt-0.5 border border-[#2D6A3F]/20">
        <CreditCard className="w-4 h-4 stroke-[2.5]" />
      </span>
      <div>
        <h4 className="text-xs sm:text-sm font-black text-[#1A3D24]">دفع مرن وآمن</h4>
        <p className="text-[11px] sm:text-xs text-[#5A6B5F] leading-relaxed mt-0.5 font-semibold">
          نقداً عند الاستلام أو تحويل بنكي مع إرفاق الوصل.
        </p>
      </div>
    </div>
  </div>
</div>

              {/* الخاتمة */}
              <p className="text-xs sm:text-sm text-[#5A6B5F] leading-relaxed mt-5 p-4 bg-[#FEF3C7]/60 border border-[#EAB308]/40 rounded-xl font-semibold">
                هدفنا أن نكون سلتك الموثوقة — بجودة ثابتة، أسعار عادلة، ومعاملة تليق بك. 🌿
              </p>

              {/* شارات الثقة */}
              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[#2D6A3F]/10">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#1A3D24] bg-[#2D6A3F]/10 px-3 py-1.5 rounded-full border border-[#2D6A3F]/25">
                  <Truck className="w-3.5 h-3.5 text-[#2D6A3F]" strokeWidth={2.5} />
                  توصيل سريع
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#1A3D24] bg-[#2D6A3F]/10 px-3 py-1.5 rounded-full border border-[#2D6A3F]/25">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A3F]" strokeWidth={2.5} />
                  ضمان الجودة
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#1A3D24] bg-[#EAB308]/15 px-3 py-1.5 rounded-full border border-[#EAB308]/40">
                  <Users className="w-3.5 h-3.5 text-[#EA580C]" strokeWidth={2.5} />
                  +500 عميل سعيد
                </span>
              </div>
            </div>
          </article>
        )}

        {/* ════════ صفحة "سياسة الاسترجاع" ════════ */}
        {page === 'policy' && (
          <article className="relative bg-[#FBF9F5] border-2 border-[#2D6A3F]/15 rounded-[24px] p-5 sm:p-8 shadow-sm text-right space-y-5 overflow-hidden">

            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#EAB308]/12 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#2D6A3F]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 pb-4 border-b border-[#2D6A3F]/10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#C25E12] flex items-center justify-center shadow-[0_4px_14px_rgba(234,88,12,0.30)] shrink-0 border border-[#EAB308]/40">
                  <RefreshCw className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-black text-[#1A3D24] leading-tight flex items-center gap-2 flex-wrap">
                    سياسة الاستبدال والاسترجاع
                    <span className="inline-block w-2 h-2 rounded-full bg-[#EAB308]" />
                  </h1>
                  <span className="text-[11px] sm:text-xs text-[#5A6B5F] font-bold block mt-1">
                    ضمان كامل ورضا تام دون تعقيد
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#443F35] leading-relaxed mt-5 font-medium">
                ثقتك وراحة بالك هما الأساس. إذا لم تكن راضياً 100% عن أي صنف، نحن هنا لنصلح الأمر فوراً:
              </p>

              <div className="space-y-3 mt-5">
                <PolicyStep
                  number={1}
                  title="المعاينة عند الاستلام"
                  description="تفقّد طلبك مع السائق. أي منتج لا يطابق توقعاتك يمكن إرجاعه مباشرة دون مصاريف."
                />
                <PolicyStep
                  number={2}
                  title="الإبلاغ في نفس اليوم"
                  description="أرسل لنا صورة عبر واتساب خلال 24 ساعة، ونستبدل المنتج أو نخصم قيمته من طلبك القادم."
                />
                <PolicyStep
                  number={3}
                  title="استرداد الأموال"
                  description="في الدفع المسبق، نُعيد المبلغ لحسابك خلال ساعات في حال إلغاء أي صنف غير متوفر."
                />
              </div>

              <div className="mt-5 p-4 bg-[#2D6A3F]/8 border-2 border-[#2D6A3F]/25 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#2D6A3F] shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-xs sm:text-sm text-[#1A3D24] font-semibold leading-relaxed">
                  <strong className="font-black">ضماننا:</strong> رضاك هو رأس مالنا — نعوّضك عن أي منتج لم ينل إعجابك.
                </p>
              </div>
            </div>
          </article>
        )}

        {/* ════════ صفحة "سياسة الخصوصية" ════════ */}
        {page === 'privacy' && (
          <article className="relative bg-[#FBF9F5] border-2 border-[#2D6A3F]/15 rounded-[24px] p-5 sm:p-8 shadow-sm text-right space-y-5 overflow-hidden">

            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#EAB308]/12 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#2D6A3F]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 pb-4 border-b border-[#2D6A3F]/10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] flex items-center justify-center shadow-[0_4px_14px_rgba(45,106,63,0.30)] shrink-0 border border-[#EAB308]/40">
                  <Lock className="w-6 h-6 text-[#EAB308]" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-black text-[#1A3D24] leading-tight flex items-center gap-2 flex-wrap">
                    سياسة الخصوصية وأمان البيانات
                    <span className="inline-block w-2 h-2 rounded-full bg-[#EAB308]" />
                  </h1>
                  <span className="text-[11px] sm:text-xs text-[#5A6B5F] font-bold block mt-1">
                    نحمي معلوماتك بكل حرص وأمانة
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#443F35] leading-relaxed mt-5 font-medium">
                نلتزم بحماية خصوصية زبنائنا. توضح هذه الوثيقة كيف نتعامل مع معلوماتك:
              </p>

              <div className="space-y-3 mt-5">
                <PrivacyCard
                  title="المعلومات التي نجمعها"
                  description="فقط ما يلزم لإيصال الطلب: الاسم، رقم الهاتف، وعنوان الإقامة."
                />
                <PrivacyCard
                  title="كيف نستخدمها"
                  description="حصرياً لتجهيز طلبك، التنسيق مع السائق، والتواصل معك بخصوص الطلب."
                />
                <PrivacyCard
                  title="عدم مشاركتها"
                  description="لا نبيع ولا نشارك بياناتك مع أي طرف ثالث تحت أي ظرف."
                />
              </div>

              <div className="mt-5 p-4 bg-[#FEF3C7]/60 border-2 border-[#EAB308]/40 rounded-xl flex items-start gap-2.5">
                <Heart className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-xs sm:text-sm text-[#92400E] font-semibold leading-relaxed">
                  <strong className="font-black">التزامنا:</strong> بياناتك أمانة — نستخدمها فقط لخدمتك بشكل أفضل.
                </p>
              </div>
            </div>
          </article>
        )}

      </div>
    </>
  );
};

// ════════ مكون فرعي: خطوة سياسة ════════
interface PolicyStepProps {
  number: number;
  title: string;
  description: string;
}

const PolicyStep: React.FC<PolicyStepProps> = ({ number, title, description }) => (
  <div className="p-4 bg-white rounded-xl border-2 border-[#2D6A3F]/12 hover:border-[#2D6A3F]/40 hover:shadow-sm transition-all">
    <div className="flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EA580C] to-[#C25E12] text-white flex items-center justify-center font-black text-sm shadow-[0_3px_10px_rgba(234,88,12,0.30)] shrink-0 border border-[#EAB308]/30">
        {number}
      </span>
      <div className="flex-1">
        <h4 className="font-black text-[#1A3D24] text-sm mb-1">{title}</h4>
        <p className="text-xs sm:text-sm text-[#5A6B5F] leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  </div>
);

// ════════ مكون فرعي: بطاقة خصوصية ════════
interface PrivacyCardProps {
  title: string;
  description: string;
}

const PrivacyCard: React.FC<PrivacyCardProps> = ({ title, description }) => (
  <div className="p-4 bg-white rounded-xl border-2 border-[#2D6A3F]/12 hover:border-[#2D6A3F]/40 hover:shadow-sm transition-all">
    <div className="flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-[#2D6A3F]/15 border border-[#2D6A3F]/25 flex items-center justify-center shrink-0 mt-0.5">
        <ShieldCheck className="w-4 h-4 text-[#2D6A3F] stroke-[2.5]" />
      </span>
      <div className="flex-1">
        <h4 className="font-black text-[#1A3D24] text-sm mb-1">{title}</h4>
        <p className="text-xs sm:text-sm text-[#5A6B5F] leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  </div>
);