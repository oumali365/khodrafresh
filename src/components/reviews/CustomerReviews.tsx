// ============================================================
// CustomerReviews.tsx – الإصدار 7.0 المحدث
// يدعم Swiper مع dynamicBullets، منع تكرار التقييمات، التحكم بعرض التقييمات (3 → 6 → 9 → 12 → 15)
// ============================================================
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Star,
  MapPin,
  MessageSquarePlus,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import {
  fetchReviews,
  submitCustomerReview,
  deleteCustomerReview,
  getSupabase,
  isLocalAdminSessionValid,
} from '../../services/supabaseService';
import {
  INITIAL_REVIEWS,
  INITIAL_THREE_REVIEWS,
  type CustomerReview,
} from '../../data/initialReviews';
import { AddReviewModal } from './AddReviewModal';
import { DeleteReviewModal } from '../../features/modals/AdminReviewModals';

export type { CustomerReview };

// التدرج في ظهور التقييمات: 4، 8، 12 (المجموع الكلي الافتراضي 12 تقييم)
const INITIAL_VISIBLE_COUNT = 4;
const REVIEWS_PER_STEP = 4;

interface CustomerReviewsProps {
  onOpenOrdersPanel?: () => void;
}

// ─── دالة مساعدة لمنع تكرار التقييمات بالاعتماد على معرف التقييم id وبصمة النص ───
const getReviewSignature = (r: CustomerReview): string => {
  const author = (r.author || '').trim().toLowerCase();
  const comment = (r.comment || '').trim().replace(/\s+/g, ' ').slice(0, 50).toLowerCase();
  return `${author}__${comment}`;
};

const deduplicateReviews = (list: CustomerReview[]): CustomerReview[] => {
  const seenIds = new Set<string>();
  const seenSigs = new Set<string>();
  const uniqueList: CustomerReview[] = [];

  for (const item of list) {
    if (!item) continue;
    const idKey = String(item.id || '').trim().toLowerCase();
    const sigKey = getReviewSignature(item);

    if (idKey && seenIds.has(idKey)) continue;
    if (sigKey && seenSigs.has(sigKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (sigKey) seenSigs.add(sigKey);
    uniqueList.push(item);
  }
  return uniqueList;
};

export const CustomerReviews: React.FC<CustomerReviewsProps> = () => {
  // توحيد مصدر التقييمات مع الحفاظ على 12 تقييماً كمجموع كلي افتراضياً
  const [allReviews, setAllReviews] = useState<CustomerReview[]>(() =>
    deduplicateReviews(INITIAL_REVIEWS.slice(0, 12))
  );

  // التحكم بعدد التقييمات المعروضة في السلايدر (4 ← 8 ← 12)
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_COUNT);

  // حالة النافذة المنبثقة لإضافة تقييم
  const [isModalOpen, setIsModalOpen] = useState(false);

  // مرجع Swiper والتحكم بحالة الأسهم والنقاط الأربع الثابتة
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isBeginning, setIsBeginning] = useState<boolean>(true);
  const [isEnd, setIsEnd] = useState<boolean>(false);

  // ─── Admin mode ───
  const [isAdmin, setIsAdmin] = useState<boolean>(isLocalAdminSessionValid);

  const [deleteConfirmReview, setDeleteConfirmReview] = useState<CustomerReview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminNotification, setAdminNotification] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthChanged = () => {
      setIsAdmin(isLocalAdminSessionValid());
    };
    window.addEventListener('khodra_admin_auth_changed', handleAuthChanged);
    window.addEventListener('khodra_admin_auth_revoked', handleAuthChanged);
    return () => {
      window.removeEventListener('khodra_admin_auth_changed', handleAuthChanged);
      window.removeEventListener('khodra_admin_auth_revoked', handleAuthChanged);
    };
  }, []);

  // ─── 1. جلب التقييمات من Supabase مع منع التكرار وتطبيق limit(10) و order ───
  const loadSupabaseReviews = useCallback(async () => {
    try {
      const dbReviews = await fetchReviews();
      if (dbReviews && dbReviews.length > 0) {
        const formatted: CustomerReview[] = dbReviews.map((r) => ({
          id: String(r.id),
          author: r.author,
          neighborhood: r.neighborhood,
          rating: r.rating,
          date: r.date || 'مؤخراً',
          comment: r.comment,
          verified: r.verified,
        }));

        // دمج التقييمات القادمة من قاعدة البيانات مع المراجعات الافتراضية مع توحيد المصدر وضمان عدم التكرار
        setAllReviews(() => {
          const combined = deduplicateReviews([
            ...formatted,
            ...INITIAL_REVIEWS.slice(0, 12),
          ]);
          return combined;
        });
      }
    } catch (e) {
      console.warn('Could not load reviews from Supabase:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(
        () => {
          if (isMounted) loadSupabaseReviews();
        },
        { timeout: 2000 }
      );
      return () => {
        isMounted = false;
        (window as any).cancelIdleCallback(handle);
      };
    } else {
      const timer = setTimeout(() => {
        if (isMounted) loadSupabaseReviews();
      }, 500);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [loadSupabaseReviews]);

  // ─── 2. المزامنة الفورية اللحظية (Supabase Realtime) عند إضافة أو تعديل أو حذف أي تقييم ───
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;

    // اشتراك فوري في جدول التقييمات لاستقبال الإضافات والتعديلات فوراً
    const channel = client
      .channel('realtime_customer_reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newRevItem: CustomerReview = {
              id: String(payload.new.id),
              author: payload.new.author || 'زبون المتجر',
              neighborhood: payload.new.neighborhood || 'فاس',
              rating: typeof payload.new.rating === 'number' ? payload.new.rating : 5,
              date: payload.new.created_at
                ? new Date(payload.new.created_at).toLocaleDateString('ar-MA', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'الآن',
              comment: payload.new.comment || '',
              verified: Boolean(payload.new.verified),
            };
            setAllReviews((prev) => deduplicateReviews([newRevItem, ...prev]));
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            setAllReviews((prev) =>
              prev.filter((r) => String(r.id) !== String(payload.old.id))
            );
          } else {
            // تحديث كامل للقائمة في الحالات الأخرى
            loadSupabaseReviews();
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadSupabaseReviews]);

  // ─── قائمة التقييمات الفريدة المجهزة للعرض ───
  const uniqueReviews = useMemo(() => {
    return deduplicateReviews(allReviews);
  }, [allReviews]);

  // التقييمات المعروضة حالياً حسب visibleCount المحدد
  const displayedReviews = useMemo(() => {
    return uniqueReviews.slice(0, visibleCount);
  }, [uniqueReviews, visibleCount]);

  // إحصائيات التقييمات المتبقية والزر
  const totalCount = uniqueReviews.length;
  const remainingCount = Math.max(0, totalCount - visibleCount);
  const isAllVisible = visibleCount >= totalCount;

  // ─── التحكم في "عرض باقي التقييمات" / "عرض أقل" ───
  // كل نقرة تكشف عن 4 تقييمات إضافية (4 → 8 → 12)
  // وعند النقر تنتقل الشرائح بسلاسة إلى أول تقييم من الأربعة المضافة وتتحرك النقاط الأربع وفقها
  const handleToggleMoreReviews = () => {
    if (isAllVisible) {
      setVisibleCount(INITIAL_VISIBLE_COUNT);
      if (swiperRef.current) {
        swiperRef.current.slideTo(0);
      }
    } else {
      const nextCount = Math.min(visibleCount + REVIEWS_PER_STEP, totalCount);
      const newBatchStartIndex = visibleCount;
      setVisibleCount(nextCount);

      // انتقال فوري وسلس إلى أول تقييم من الأربعة المضافة لتتحرك نقاط التنقل الأربع وفقها
      setTimeout(() => {
        if (swiperRef.current) {
          swiperRef.current.slideTo(newBatchStartIndex);
        }
      }, 50);
    }
  };

  // تحديث حالة Swiper عند تغيير عدد الشرائح
  useEffect(() => {
    if (swiperRef.current) {
      swiperRef.current.update();
      setIsBeginning(swiperRef.current.isBeginning);
      setIsEnd(swiperRef.current.isEnd);
      setActiveSlideIndex(swiperRef.current.realIndex ?? swiperRef.current.activeIndex ?? 0);
    }
  }, [displayedReviews.length]);

  const updateSwiperState = useCallback((swiper: SwiperType) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
    setActiveSlideIndex(swiper.realIndex ?? swiper.activeIndex ?? 0);
  }, []);

  // التنقل عبر نقاط التنقل الأربع الثابتة (تتحرك وتتجدد وفق كل 4 تقييمات مضافة)
  const handleDotClick = (dotIndex: number) => {
    if (!swiperRef.current) return;
    const currentBatch = Math.floor(activeSlideIndex / 4);
    const targetIndex = Math.min(
      currentBatch * 4 + dotIndex,
      displayedReviews.length - 1
    );
    swiperRef.current.slideTo(targetIndex);
  };

  // التنقل بالأسهم مع ضمان عدم الاختفاء
  const handleSlidePrev = () => {
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    }
  };

  const handleSlideNext = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };

  // ─── إضافة تقييم جديد ───
  const handleReviewSubmit = async (newRev: {
    author: string;
    neighborhood: string;
    rating: number;
    comment: string;
  }) => {
    const result = await submitCustomerReview({
      ...newRev,
      category: 'quality',
      verified: false,
    });

    if (!result.success || !result.data) {
      setAdminNotification('❌ فشل حفظ التقييم، حاول مرة أخرى');
      setTimeout(() => setAdminNotification(null), 3500);
      throw new Error('Submit failed');
    }

    const newReviewItem: CustomerReview = {
      id: String(result.data.id),
      author: result.data.author,
      neighborhood: result.data.neighborhood,
      rating: result.data.rating,
      date: 'الآن',
      comment: result.data.comment,
      verified: Boolean(result.data.verified),
    };

    setAllReviews((prev) => deduplicateReviews([newReviewItem, ...prev]));
    setVisibleCount((prev) => Math.max(prev, INITIAL_VISIBLE_COUNT));
    if (swiperRef.current) {
      swiperRef.current.slideTo(0);
    }
  };

  // ─── حذف تقييم (لوحة الإدارة) ───
  const handleExecuteDelete = async () => {
    if (!deleteConfirmReview) return;
    setIsDeleting(true);

    try {
      const res = await deleteCustomerReview(deleteConfirmReview.id);

      if (res.success) {
        setAllReviews((prev) =>
          prev.filter((r) => String(r.id) !== String(deleteConfirmReview.id))
        );
        setAdminNotification(`✅ ${res.message || 'تم حذف التعليق بنجاح'}`);
      } else {
        setAdminNotification(`❌ فشل الحذف: ${res.message || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.warn('Error deleting review:', err);
      setAdminNotification('❌ حدث خطأ أثناء الحذف');
    } finally {
      setTimeout(() => setAdminNotification(null), 3500);
      setIsDeleting(false);
      setDeleteConfirmReview(null);
    }
  };

  return (
    <>
      <section
        className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-10 sm:my-14 scroll-mt-24 sm:scroll-mt-28"
        id="customer-reviews-section"
        aria-label="آراء وتقييمات زبناء متجر خضرة"
        dir="rtl"
      >
        {/* ════════ إشعار إداري ════════ */}
        {adminNotification && (
          <div className="mb-5 max-w-2xl mx-auto py-3 px-4 rounded-2xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] text-white text-xs sm:text-sm font-black shadow-[0_4px_14px_rgba(45,106,63,0.30)] flex items-center justify-between gap-3 animate-in fade-in duration-200 text-right border-2 border-[#EAB308]/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#EAB308] shrink-0" strokeWidth={2.5} />
              <span>{adminNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setAdminNotification(null)}
              className="text-white/80 hover:text-white cursor-pointer p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* ════════ الحاوية الرئيسية الموحدة ════════ */}
        <div className="relative bg-white border-2 border-[#2D6A3F]/15 rounded-3xl sm:rounded-[36px] shadow-[0_12px_36px_rgba(45,106,63,0.06)] p-4 sm:p-6 lg:p-8 overflow-hidden">
          {/* تأثيرات لمعان ومظهر Swiper مخصص */}
          <style>{`
            @keyframes reviewSheenSwipe {
              0%   { transform: translateX(180%) skewX(-20deg); opacity: 0; }
              15%  { opacity: 0.8; }
              100% { transform: translateX(-180%) skewX(-20deg); opacity: 0; }
            }
            .review-sheen-sweep {
              position: absolute;
              inset: 0;
              background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%);
              transform: translateX(180%) skewX(-20deg);
              pointer-events: none;
              z-index: 10;
            }
            .group\\/rev:hover .review-sheen-sweep,
            .group\\/rev:active .review-sheen-sweep {
              animation: reviewSheenSwipe 0.75s cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* تخصيص نقاط Swiper Pagination باللون الأخضر والذهبي مع dynamicBullets */
            .khodra-reviews-swiper .swiper-pagination {
              position: static !important;
              margin-top: 1rem;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            }
            .khodra-reviews-swiper .swiper-pagination-bullet {
              background: #2D6A3F !important;
              opacity: 0.3 !important;
              width: 8px !important;
              height: 8px !important;
              transition: all 0.3s ease !important;
              margin: 0 !important;
            }
            .khodra-reviews-swiper .swiper-pagination-bullet-active {
              background: #2D6A3F !important;
              opacity: 1 !important;
              width: 26px !important;
              border-radius: 9999px !important;
            }
            .khodra-reviews-swiper .swiper-slide {
              height: auto;
              display: flex;
            }
          `}</style>

          {/* إضاءات خلفية ناعمة */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#EAB308]/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#2D6A3F]/5 rounded-full blur-3xl pointer-events-none" />

          {/* ─── 1. رأس القسم الموحد (مُوسَّط مع النقطة الذهبية) ─── */}
          <div className="relative flex flex-col items-center text-center gap-4 pb-5 border-b border-[#2D6A3F]/10">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1A3D24] tracking-tight flex items-center justify-center gap-2">
                <span>آراء زبنائنا بمدينة فاس</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] inline-block shrink-0" />
              </h2>

              <p className="text-sm sm:text-base text-[#3E4F43] font-bold leading-relaxed">
                تجارب حقيقية لعائلات تثق بجودة خضار وفواكه متجر خُضرة وتعتمد على التوصيل السريع يومياً.
              </p>
            </div>

            {/* شارة التقييم + زر المشاركة (مُوسَّط) */}
            <div className="flex items-center justify-center flex-wrap gap-3 shrink-0 w-full pt-1">
              <div className="inline-flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl border-2 border-[#2D6A3F]/20 shadow-xs">
                <span className="font-black text-[#EA580C] text-lg sm:text-xl tabular-nums leading-none">4.9</span>
                <div className="flex text-amber-400 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-[#3E4F43] font-black border-r border-[#2D6A3F]/20 pr-2.5 mr-0.5">
                  {uniqueReviews.length}+ تقييم معتمد
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="group inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#377A4C] hover:to-[#22502F] text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border-2 border-[#EAB308]/50"
              >
                <MessageSquarePlus className="w-4 h-4 text-[#F5D76E] group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                <span>شاركنا تجربتك</span>
                <Sparkles className="w-3.5 h-3.5 text-[#F5D76E]/80" />
              </button>
            </div>
          </div>

          {/* ─── 2. سلايدر التقييمات عبر Swiper (مع dynamicBullets وأسهم تنقل دائمة الظهور) ─── */}
          <div className="relative pt-6">
            <Swiper
              modules={[Pagination, Navigation, A11y]}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                updateSwiperState(swiper);
              }}
              onSlideChange={updateSwiperState}
              onToEdge={updateSwiperState}
              onFromEdge={updateSwiperState}
              dir="rtl"
              spaceBetween={20}
              slidesPerView={1}
              breakpoints={{
                640: {
                  slidesPerView: 1.5,
                  spaceBetween: 20,
                },
                768: {
                  slidesPerView: 2,
                  spaceBetween: 22,
                },
                1024: {
                  slidesPerView: 3,
                  spaceBetween: 24,
                },
                1280: {
                  slidesPerView: 4,
                  spaceBetween: 24,
                },
              }}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              className="khodra-reviews-swiper w-full"
            >
              {displayedReviews.map((rev) => (
                <SwiperSlide key={rev.id} className="h-full">
                  <article
                    className="group/rev relative w-full h-full bg-white border-2 border-[#EAB308] rounded-2xl transition-all duration-300 md:hover:-translate-y-1 p-4 sm:p-5 text-center flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-[0_10px_24px_rgba(234,179,8,0.18)]"
                  >
                    {/* شريط الوميض البصري عند المس والتحويم */}
                    <div className="review-sheen-sweep" />

                    <div className="w-full flex flex-col items-center relative z-10 flex-1">
                      {/* الأفاتار بحجم متناسق */}
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] border-2 border-[#EAB308]/50 text-[#F5D76E] font-black text-xl flex items-center justify-center shadow-md shrink-0 group-hover/rev:scale-105 transition-transform mb-2.5">
                        {rev.author.trim().charAt(0) || 'خ'}
                      </div>

                      {/* الاسم والتحقق */}
                      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-1">
                        <h3 className="text-sm sm:text-base font-black text-[#1A3D24] leading-snug">
                          {rev.author}
                        </h3>
                        {rev.verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                            <span>موثق</span>
                          </span>
                        )}
                      </div>

                      {/* الحي / الموقع */}
                      <p className="text-[11px] sm:text-xs text-[#3E4F43] font-bold flex items-center justify-center gap-1.5 mb-2.5">
                        <MapPin className="w-3.5 h-3.5 text-[#EA580C] shrink-0" strokeWidth={2.5} />
                        <span>{rev.neighborhood}</span>
                      </p>

                      {/* النجوم */}
                      <div className="flex text-amber-400 gap-0.5 shrink-0 mb-2.5" aria-label={`تقييم ${rev.rating} من 5 نجوم`}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                              i < rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-stone-200 text-stone-200'
                            }`}
                          />
                        ))}
                      </div>

                      {/* نص التعليق */}
                      <p className="text-xs sm:text-sm text-[#1F2937] font-semibold leading-relaxed text-center px-1 mb-3">
                        "{rev.comment}"
                      </p>
                    </div>

                    {/* تذييل البطاقة (مُوسَّط) */}
                    <div className="w-full pt-3 mt-auto border-t-2 border-[#2D6A3F]/10 flex items-center justify-center text-xs text-stone-500 gap-2 font-bold relative z-10">
                      <span>{rev.date || 'مؤخراً'}</span>
                      <span className="text-stone-300">•</span>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmReview(rev);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-200 text-xs font-black transition-all cursor-pointer active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" strokeWidth={2.5} />
                          <span>حذف</span>
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-black text-[11px]">
                          طلب مؤكد بفاس ✓
                        </span>
                      )}
                    </div>
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* ═══════ مؤشرات التنقل الأربع الثابتة (تصميم شارات الثقة) + أسهم التنقل ═══════ */}
            {/* في الشريحة الأولى: السهم الأيسر يبقى مرئياً مع opacity-50 */}
            {/* في الشريحة الأخيرة: السهم الأيمن يبقى مرئياً مع opacity-50 */}
            <div className="flex items-center justify-between pt-4 px-1">
              {/* أربع نقاط تنقل ثابتة متجددة تتحرك وفق كل 4 تقييمات مضافة مثل تصميم شارات الثقة */}
              <div className="flex items-center gap-1.5" role="tablist" aria-label="مؤشرات التنقل بين التقييمات">
                {[0, 1, 2, 3].map((dotIdx) => {
                  // النقطة النشطة تتحرك مع كل تقييم داخل مجموعة الـ 4 المضافة وتتجدد بسلاسة
                  const activeDot = activeSlideIndex % 4;
                  const isActive = activeDot === dotIdx;

                  return (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => handleDotClick(dotIdx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'w-7 bg-[#2D6A3F]'
                          : 'w-2 bg-[#2D6A3F]/25 hover:bg-[#2D6A3F]/50'
                      }`}
                      aria-label={`التقييم ${dotIdx + 1} من المجموعة`}
                      aria-selected={isActive}
                      role="tab"
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-2" dir="ltr">
                {/* السهم الأيسر (Left arrow): يظل ظاهراً دائماً، وعند أول شريحة يكون معطلاً بـ opacity-50 */}
                <button
                  type="button"
                  onClick={handleSlidePrev}
                  disabled={isBeginning}
                  aria-label="السابق"
                  className={`w-11 h-11 rounded-xl bg-white border-2 border-[#2D6A3F]/25 text-[#1A3D24] shadow-sm flex items-center justify-center transition-all ${
                    isBeginning
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : 'cursor-pointer hover:bg-[#FAF6EE] hover:border-[#2D6A3F]/50 active:scale-95'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5 text-[#1A3D24]" strokeWidth={2.6} />
                </button>

                {/* السهم الأيمن (Right arrow): يظل ظاهراً دائماً، وعند آخر شريحة يكون معطلاً بـ opacity-50 */}
                <button
                  type="button"
                  onClick={handleSlideNext}
                  disabled={isEnd}
                  aria-label="التالي"
                  className={`w-11 h-11 rounded-xl bg-white border-2 border-[#2D6A3F]/25 text-[#1A3D24] shadow-sm flex items-center justify-center transition-all ${
                    isEnd
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : 'cursor-pointer hover:bg-[#FAF6EE] hover:border-[#2D6A3F]/50 active:scale-95'
                  }`}
                >
                  <ChevronRight className="w-5 h-5 text-[#1A3D24]" strokeWidth={2.6} />
                </button>
              </div>
            </div>
          </div>

          {/* ─── 3. الشريط السفلي: زر عرض باقي التقييمات / عرض أقل ─── */}
          {totalCount > INITIAL_VISIBLE_COUNT && (
            <div className="mt-6 pt-5 border-t-2 border-[#2D6A3F]/10 flex items-center justify-center">
              <button
                type="button"
                onClick={handleToggleMoreReviews}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F3] border-2 border-[#2D6A3F]/25 text-[#1A3D24] text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                {isAllVisible ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-[#2D6A3F]" strokeWidth={2.5} />
                    <span>عرض أقل</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-[#2D6A3F]" strokeWidth={2.5} />
                    <span>عرض باقي التقييمات ({remainingCount})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════════ النوافذ المنبثقة ════════ */}
      <AddReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />

      <DeleteReviewModal
        review={deleteConfirmReview}
        isDeleting={isDeleting}
        onClose={() => !isDeleting && setDeleteConfirmReview(null)}
        onConfirm={handleExecuteDelete}
      />
    </>
  );
};

export default CustomerReviews;
