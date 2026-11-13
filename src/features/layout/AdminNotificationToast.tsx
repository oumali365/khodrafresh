// ============================================================
// AdminNotificationToast.tsx – إشعار طافٍ للطلبات الجديدة
// يظهر للمدير عند وصول طلبات جديدة مع دعم التنبيه الصوتي
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Bell, ShoppingBag, Volume2, VolumeX, X, ArrowLeft } from 'lucide-react';
import { playOrderAlertSound } from '../../utils/audioAlert';

export interface AdminNotificationToastProps {
  newCount: number;
  onOpenOrders: () => void;
  onDismiss: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AdminNotificationToast: React.FC<AdminNotificationToastProps> = ({
  newCount,
  onOpenOrders,
  onDismiss,
  soundEnabled,
  onToggleSound,
}) => {
  const previousCountRef = useRef(newCount);

  // تشغيل الصوت عند زيادة عدد الطلبات الجديدة إذا كان الصوت مفعلاً
  useEffect(() => {
    if (newCount > 0 && newCount > previousCountRef.current && soundEnabled) {
      playOrderAlertSound(true);
    }
    previousCountRef.current = newCount;
  }, [newCount, soundEnabled]);

  if (newCount <= 0) return null;

  return (
    <aside
      aria-label="تنبيه الطلبات الجديدة"
      className="fixed bottom-24 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-bounce-short"
    >
      <div className="bg-[#1E4327] text-white p-4 rounded-2xl shadow-2xl border-2 border-[#F5D76E]/40 flex flex-col gap-3">
        {/* السطر العلوي: الأيقونة، النص، وزر الإغلاق */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-[#F5D76E]">
              <Bell className="w-5 h-5 animate-wiggle" />
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-[#1E4327]">
                {newCount}
              </span>
            </div>
            <div className="text-right">
              <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>طلب جديد وارد!</span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#F5D76E] animate-ping" />
              </h4>
              <p className="text-xs text-emerald-100 font-medium leading-tight mt-0.5">
                {newCount === 1 ? 'يوجد طلب جديد بانتظار المراجعة' : `يوجد ${newCount} طلبات جديدة بانتظار المراجعة`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* زر كتم/تشغيل الصوت */}
            <button
              type="button"
              onClick={onToggleSound}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-emerald-100 hover:text-white"
              title={soundEnabled ? 'كتم التنبيه الصوتي' : 'تفعيل التنبيه الصوتي'}
              aria-label={soundEnabled ? 'كتم التنبيه الصوتي' : 'تفعيل التنبيه الصوتي'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#F5D76E]" /> : <VolumeX className="w-4 h-4 text-stone-300" />}
            </button>

            {/* زر الإغلاق / التجاهل */}
            <button
              type="button"
              onClick={onDismiss}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-emerald-100 hover:text-white"
              title="إغلاق التنبيه"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* زر فتح لوحة الطلبات */}
        <button
          type="button"
          onClick={onOpenOrders}
          className="w-full py-2.5 px-4 rounded-xl bg-[#F5D76E] hover:bg-[#ebd065] text-[#112616] font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>فتح لوحة إدارة الطلبات</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
