// ============================================================
// AddReviewModal.tsx – الإصدار 2.0
// نافذة إضافة تقييم بهوية خضرة الموحّدة
// ============================================================
import React, { useState, useRef } from 'react';
import {
  MessageSquarePlus, X, CheckCircle2, Star, Send,
} from 'lucide-react';

interface AddReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: {
    author: string;
    neighborhood: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
}

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({
  onClick,
  className,
  children,
  rippleColor = 'rgba(255,255,255,0.30)',
  disabled,
  type = 'button',
}) => {
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
      ripple.className = 'review-ripple';
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
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

export const AddReviewModal: React.FC<AddReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessAlert, setIsSuccessAlert] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        author: name.trim(),
        neighborhood: neighborhood.trim() || 'فاس',
        rating,
        comment: comment.trim(),
      });
      setIsSuccessAlert(true);
      setTimeout(() => {
        setIsSuccessAlert(false);
        onClose();
        setName('');
        setNeighborhood('');
        setRating(5);
        setComment('');
      }, 1500);
    } catch {
      // handled upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes reviewRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .review-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: reviewRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        @keyframes reviewStarPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        .review-star-pop {
          animation: reviewStarPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes reviewSuccessZoom {
          0%   { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        .review-success-zoom {
          animation: reviewSuccessZoom 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .review-ripple,
          .review-star-pop,
          .review-success-zoom { animation: none; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-review-title"
      >
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => !isSubmitting && onClose()}
        />

        <div className="relative bg-[#FBF9F5] border-2 border-[#2D6A3F]/15 rounded-[24px] w-full max-w-md shadow-2xl z-50 overflow-hidden p-5 text-right animate-in zoom-in-95 duration-200 my-auto">

          {/* ════════ رأس النافذة ════════ */}
          <div className="flex items-center justify-between pb-3 border-b border-[#2D6A3F]/10 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] flex items-center justify-center shadow-sm border border-[#EAB308]/30">
                <MessageSquarePlus className="w-4 h-4 text-[#EAB308]" strokeWidth={2.5} />
              </div>
              <h3 id="add-review-title" className="font-black text-sm sm:text-base text-[#1A3D24] flex items-center gap-2">
                مشاركة تجربتك
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
              </h3>
            </div>
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              className="w-8 h-8 rounded-full bg-[#FAF8F3] hover:bg-[#2D6A3F]/10 text-[#1A3D24] flex items-center justify-center transition-colors active:scale-90 cursor-pointer border border-[#2D6A3F]/15"
              aria-label="إغلاق النافذة"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* ════════ حالة النجاح ════════ */}
          {isSuccessAlert ? (
            <div className="py-8 text-center space-y-3 review-success-zoom">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2D6A3F]/15 to-[#EAB308]/20 text-[#2D6A3F] mx-auto flex items-center justify-center border-2 border-[#2D6A3F]/25 shadow-sm">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <h4 className="text-base font-black text-[#1A3D24]">شكراً على تقييمك القيّم!</h4>
              <p className="text-xs text-[#5A6B5F] font-semibold">تم حفظ تقييمك بنجاح.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* الاسم */}
              <div>
                <label className="block text-xs font-black text-[#1A3D24] mb-1.5">
                  الاسم الكامل <span className="text-[#EA580C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: سارة الإدريسي"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D6A3F]/15 text-sm bg-[#FAF8F3] focus:bg-white focus:outline-none focus:border-[#2D6A3F]/50 focus:ring-2 focus:ring-[#2D6A3F]/12 transition-all text-[#1A3D24] placeholder-[#8A8170] font-medium"
                />
              </div>

              {/* الحي */}
              <div>
                <label className="block text-xs font-black text-[#1A3D24] mb-1.5">
                  الحي بمدينة فاس
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="مثال: طريق إيموزار، الأطلس..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D6A3F]/15 text-sm bg-[#FAF8F3] focus:bg-white focus:outline-none focus:border-[#2D6A3F]/50 focus:ring-2 focus:ring-[#2D6A3F]/12 transition-all text-[#1A3D24] placeholder-[#8A8170] font-medium"
                />
              </div>

              {/* التقييم */}
              <div>
                <label className="block text-xs font-black text-[#1A3D24] mb-1.5">
                  التقييم
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = star <= rating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-125 active:scale-95"
                        aria-label={`${star} نجوم`}
                      >
                        <Star
                          key={isActive ? `active-${star}` : `inactive-${star}`}
                          className={`w-6 h-6 transition-colors ${
                            isActive
                              ? 'fill-[#EAB308] text-[#EAB308] drop-shadow-[0_1px_3px_rgba(234,179,8,0.4)] review-star-pop'
                              : 'fill-stone-200 text-stone-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-black text-[#1A3D24] mr-2 bg-[#EAB308]/15 border border-[#EAB308]/30 px-2 py-0.5 rounded-lg tabular-nums">
                    {rating}/5
                  </span>
                </div>
              </div>

              {/* التعليق */}
              <div>
                <label className="block text-xs font-black text-[#1A3D24] mb-1.5">
                  تعليقك <span className="text-[#EA580C]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شاركنا رأيك في طراوة المنتجات، التوصيل، أو طريقة التعامل..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D6A3F]/15 text-sm bg-[#FAF8F3] focus:bg-white focus:outline-none focus:border-[#2D6A3F]/50 focus:ring-2 focus:ring-[#2D6A3F]/12 transition-all text-[#1A3D24] placeholder-[#8A8170] resize-none font-medium"
                />
              </div>

              {/* الأزرار */}
              <div className="pt-2 flex items-center gap-2.5">
                <RippleButton
                  type="submit"
                  disabled={isSubmitting}
                  rippleColor="rgba(255,255,255,0.30)"
                  className="flex-1 py-3 px-4 min-h-[46px] rounded-xl bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] text-white font-black text-sm shadow-[0_4px_14px_rgba(45,106,63,0.30)] hover:shadow-[0_6px_22px_rgba(45,106,63,0.42)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-[#EAB308]/25"
                >
                  <Send className="w-4 h-4 text-[#EAB308] relative z-10" strokeWidth={2.5} />
                  <span className="relative z-10">
                    {isSubmitting ? 'جاري النشر...' : 'نشر التقييم'}
                  </span>
                </RippleButton>

                <RippleButton
                  onClick={() => !isSubmitting && onClose()}
                  disabled={isSubmitting}
                  rippleColor="rgba(45,106,63,0.20)"
                  className="py-3 px-4 min-h-[46px] rounded-xl bg-[#FAF8F3] hover:bg-[#2D6A3F]/10 text-[#1A3D24] border-2 border-[#2D6A3F]/15 hover:border-[#2D6A3F]/35 font-black text-sm transition-all cursor-pointer active:scale-95"
                >
                  <span className="relative z-10">إلغاء</span>
                </RippleButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};