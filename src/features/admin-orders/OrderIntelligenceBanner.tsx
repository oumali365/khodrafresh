// ============================================================
// OrderIntelligenceBanner.tsx - لوحة التنبيهات الذكية ومؤشرات الأولوية والتدس
// ============================================================

import React, { useState } from 'react';
import { AlertTriangle, Clock, MapPin, ShieldAlert, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import type { DbOrder } from './types';
import { checkOperationalAlerts, OrderAlertsConfig, DEFAULT_ALERTS_CONFIG } from './orderIntelligence';

interface OrderIntelligenceBannerProps {
  orders: DbOrder[];
  config?: OrderAlertsConfig;
  onUpdateConfig?: (newConfig: OrderAlertsConfig) => void;
}

export const OrderIntelligenceBanner: React.FC<OrderIntelligenceBannerProps> = ({
  orders,
  config = DEFAULT_ALERTS_CONFIG,
  onUpdateConfig,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState<OrderAlertsConfig>(config);

  const alerts = checkOperationalAlerts(orders, localConfig);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig?.(localConfig);
    setShowConfig(false);
  };

  if (alerts.backlogCount === 0 && alerts.unassignedCount === 0 && alerts.delayedCount === 0 && !showConfig) {
    return (
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-xs font-bold text-emerald-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>النظام الذكي يعمل بكفاءة عالية: جميع الطلبات مصنفة ومتابعة في الوقت الفعلي.</span>
        </div>
        <button
          type="button"
          onClick={() => setShowConfig(true)}
          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-300 cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>إعدادات التنبيهات</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-l from-amber-50 via-orange-50 to-emerald-50 border-2 border-amber-200/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900">
              مركز التنبيهات والذكاء الجغرافي (Khodra AI Dispatch)
            </h3>
            <p className="text-[11px] text-stone-600">
              مراقبة تلقائية لتكدس الطلبات، العناوين الغامضة، ومواعيد التسليم المستهدفة بفاس.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700">
            <span className="flex items-center gap-1 text-orange-600">
              <Clock className="w-3.5 h-3.5" /> تأخير ({alerts.delayedCount})
            </span>
            <span className="text-stone-300">|</span>
            <span className="flex items-center gap-1 text-purple-700">
              <MapPin className="w-3.5 h-3.5" /> مراجعة عناوين ({alerts.unassignedCount})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-300 cursor-pointer shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-700" />
            <span>الإعدادات</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* قائمة التنبيهات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {alerts.backlogCount >= localConfig.backlogWarningCount && (
          <div className="bg-amber-100/80 border border-amber-300 rounded-xl p-2.5 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div className="text-[11px] font-bold text-amber-900">
              تكدس طلبات قيد الانتظار: {alerts.backlogCount} طلبات لم يتم تجهيزها بعد (الحد الأقصى المسموح: {localConfig.backlogWarningCount}).
            </div>
          </div>
        )}

        {alerts.unassignedCount > 0 && (
          <div className="bg-purple-100/80 border border-purple-300 rounded-xl p-2.5 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-purple-800 shrink-0 mt-0.5" />
            <div className="text-[11px] font-bold text-purple-900">
              عناوين تتطلب مراجعة القطاع: {alerts.unassignedCount} طلبات تحمل عناوين غامضة أو غير مصنفة تلقائياً.
            </div>
          </div>
        )}

        {alerts.delayedCount > 0 && (
          <div className="bg-orange-100/80 border border-orange-300 rounded-xl p-2.5 flex items-start gap-2">
            <Clock className="w-4 h-4 text-orange-800 shrink-0 mt-0.5" />
            <div className="text-[11px] font-bold text-orange-900">
              طلبات متأخرة عن وقت التوصيل المستهدف: {alerts.delayedCount} طلبات تجاوزت {localConfig.delayedWaitingMinutes} دقيقة.
            </div>
          </div>
        )}
      </div>

      {/* نافذة ضبط حدود التنبيهات القابلة للتعديل */}
      {showConfig && (
        <form onSubmit={handleSaveConfig} className="bg-white border border-stone-200 rounded-xl p-3 space-y-3">
          <div className="text-xs font-black text-stone-900">ضبط حدود التنبيه والذكاء التشغيلي:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                تنبيه الطلبات العاجلة (بالدقائق):
              </label>
              <input
                type="number"
                value={localConfig.urgentWaitingMinutes}
                onChange={(e) => setLocalConfig({ ...localConfig, urgentWaitingMinutes: Number(e.target.value) || 20 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-stone-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                تنبيه الطلبات المتأخرة (بالدقائق):
              </label>
              <input
                type="number"
                value={localConfig.delayedWaitingMinutes}
                onChange={(e) => setLocalConfig({ ...localConfig, delayedWaitingMinutes: Number(e.target.value) || 45 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-stone-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                حد تنبيه تكدس الطلبات (عدد):
              </label>
              <input
                type="number"
                value={localConfig.backlogWarningCount}
                onChange={(e) => setLocalConfig({ ...localConfig, backlogWarningCount: Number(e.target.value) || 5 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-stone-900"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer hover:bg-emerald-800"
            >
              حفظ الإعدادات
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
