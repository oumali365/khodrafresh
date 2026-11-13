// ============================================================
// UnifiedDispatchCenter.tsx - مركز الإسناد اللوجستي الموحد لمتجر خُضرة فاس
// يربط بين PreparedBranch في لوحة الطلبات و AdminDeliveryFleetTab
// ============================================================

import React, { useState } from 'react';
import { Truck, MapPin, Phone, CheckCircle2, Clock, Send, Navigation, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { DbOrder, StoreDriver, FastAppCourier, FezZoneId } from './types';
import type { DeliveryDispatchInfo } from '../../types';
import { FEZ_DELIVERY_ZONES, FezZoneConfig } from '../../data/deliveryZones';
import {
  calculateZoneCOD,
  generateGoogleMapsMultiStopUrl,
  buildDriverWhatsAppMessage,
  cleanPhoneForWhatsApp,
  getSortedDriversForZone,
  getSortedFastCouriersForZone,
} from './utils';

export interface UnifiedDispatchCenterProps {
  orders: DbOrder[];
  storeDrivers: StoreDriver[];
  fastCouriers: FastAppCourier[];
  onAssignDriver: (zoneKey: FezZoneId, driverId: string) => Promise<void>;
  onCloseTour: (zoneKey: FezZoneId, driverId: string) => Promise<void>;
  showToast: (type: 'success' | 'error', message: string) => void;
  onRefresh?: () => void;
}

export const UnifiedDispatchCenter: React.FC<UnifiedDispatchCenterProps> = ({
  orders,
  storeDrivers,
  fastCouriers,
  onAssignDriver,
  onCloseTour,
  showToast,
}) => {
  const [selectedZone, setSelectedZone] = useState<FezZoneId>('north');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const zoneConfig = FEZ_DELIVERY_ZONES[selectedZone];
  const zoneOrders = orders.filter((o) => {
    if (o.status === 'cancelled' || o.is_archived) return false;
    const orderZone = o.delivery_zone || o.delivery_dispatch?.zone;
    return orderZone === selectedZone;
  });

  const unassignedOrders = zoneOrders.filter((o) => !o.delivery_dispatch?.driverId && !o.driver_id);
  const assignedOrders = zoneOrders.filter((o) => Boolean(o.delivery_dispatch?.driverId || o.driver_id));
  const codCalc = calculateZoneCOD(zoneOrders);

  const sortedDrivers = getSortedDriversForZone(selectedZone, storeDrivers);
  const sortedFastCouriers = getSortedFastCouriersForZone(selectedZone, fastCouriers);
  const selectedDriver =
    storeDrivers.find((d) => d.id === selectedDriverId) ||
    fastCouriers.find((c) => c.id === selectedDriverId) ||
    null;

  const handleExplicitDispatch = async () => {
    if (!selectedDriverId) {
      return showToast('error', 'يرجى اختيار سائق من الفريق الداخلي أو كابتن تطبيق سريع أولاً');
    }
    if (zoneOrders.length === 0) {
      return showToast('error', 'لا توجد طلبات في هذه المنطقة للإسناد');
    }

    setIsDispatching(true);
    try {
      await onAssignDriver(selectedZone, selectedDriverId);
      const isFast = selectedDriver && 'app' in selectedDriver;
      const driverLabel = isFast
        ? `كابتن التطبيق ${selectedDriver.name} (${selectedDriver.app})`
        : `السائق ${selectedDriver?.name || ''}`;
      showToast('success', `تم اعتماد وإسناد جولة ${zoneConfig.name} بنجاح إلى ${driverLabel}`);
    } catch (err: any) {
      showToast('error', err?.message || 'تعذر إسناد الجولة');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSendWhatsAppVerified = () => {
    if (!selectedDriver) {
      return showToast('error', 'يرجى تحديد السائق لتوليد رسالة الواتساب الرسمية');
    }
    if (zoneOrders.length === 0) {
      return showToast('error', 'لا توجد طلبات في هذه المنطقة');
    }

    const msg = buildDriverWhatsAppMessage(selectedZone, zoneOrders, selectedDriver, zoneConfig);
    const phone = cleanPhoneForWhatsApp(selectedDriver.phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    showToast('success', `تم توليد رسالة واتساب الرسمية للسائق ${selectedDriver.name} (تأكيد خارجي)`);
  };

  const handleOpenMaps = () => {
    if (zoneOrders.length === 0) {
      return showToast('error', 'لا توجد محطات في هذه الجولة');
    }
    const url = generateGoogleMapsMultiStopUrl(zoneOrders);
    window.open(url, '_blank');
    showToast('success', `تم توليد مسار Google Maps المتتابع (${zoneOrders.length} محطات - ترتيب متسلسل)`);
  };

  const handleAtomicClose = async () => {
    if (zoneOrders.length === 0) {
      return showToast('error', 'لا توجد طلبات للإغلاق');
    }
    setIsClosing(true);
    try {
      await onCloseTour(selectedZone, selectedDriverId);
      showToast('success', `تم إغلاق وتأكيد تسليم وأرشفة جولة ${zoneConfig.name} ذرياً بنجاح!`);
    } catch (err: any) {
      showToast('error', err?.message || 'تعذر إغلاق الجولة');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="bg-white border-2 border-stone-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 text-right">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900">
              مركز الإسناد اللوجستي الموحد (Unified Dispatch Hub)
            </h3>
            <p className="text-xs text-stone-500">
              إدارة جولات التوصيل، السائقين، ومسارات فاس بقطاعات الأسطول الأربعة
            </p>
          </div>
        </div>

        {/* أزرار اختيار القطاعات */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl text-xs font-bold">
          {(Object.keys(FEZ_DELIVERY_ZONES) as FezZoneId[]).map((zKey) => {
            const z = FEZ_DELIVERY_ZONES[zKey];
            const isSelected = selectedZone === zKey;
            const count = orders.filter((o) => !o.is_archived && o.status !== 'cancelled' && (o.delivery_zone || o.delivery_dispatch?.zone) === zKey).length;
            return (
              <button
                key={zKey}
                type="button"
                onClick={() => setSelectedZone(zKey)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected ? 'bg-emerald-700 text-white font-black shadow-xs' : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                <span>{z.name.replace('المنطقة ', '')}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-emerald-900 text-emerald-100' : 'bg-stone-200 text-stone-800'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* تفاصيل القطاع المختار */}
      <div className={`border-2 rounded-2xl p-4 ${zoneConfig.borderClass} ${zoneConfig.bgClass} space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-stone-900">{zoneConfig.badgeLabel}</span>
            <span className="text-xs font-bold text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
              الوقت المستهدف: {zoneConfig.targetTime}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="bg-white px-3 py-1 rounded-lg border border-stone-200 text-stone-800">
              إجمالي التحصيل (COD): <strong className="text-emerald-700">{codCalc.totalCOD} د.م</strong>
            </span>
            <span className="bg-white px-3 py-1 rounded-lg border border-stone-200 text-stone-800">
              عدد الطلبات النشطة: <strong className="text-stone-900">{zoneOrders.length}</strong>
            </span>
          </div>
        </div>

        {/* لوحة اختيار السائق وإجراءات الإرسال المؤكدة */}
        <div className="bg-white rounded-xl p-3.5 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs font-black text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>تعيين مندوب الجولة (سائق داخلي أو كابتن تطبيق سريع):</span>
            </div>
            {selectedDriver && (
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                'app' in selectedDriver
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}>
                {'app' in selectedDriver ? `⚡ كابتن تطبيق (${selectedDriver.app}): ` : '🟢 سائق داخلي: '}
                {selectedDriver.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            {/* القائمة الأولى: سائق داخلي */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                سائق المتجر الداخلي:
              </label>
              <select
                value={storeDrivers.some((d) => d.id === selectedDriverId) ? selectedDriverId : ''}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full p-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 bg-stone-50 focus:border-emerald-600 focus:outline-none"
              >
                <option value="">-- اختر سائقاً --</option>
                {sortedDrivers.map(({ driver, isDisabled, disabledReason }) => (
                  <option key={driver.id} value={driver.id} disabled={isDisabled}>
                    {driver.name} ({driver.commissionPerOrder} د.م){isDisabled ? ` - ${disabledReason || 'غير متاح'}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* القائمة الثانية: كابتن تطبيق سريع */}
            <div>
              <label className="block text-[11px] font-bold text-amber-900 mb-1">
                سائق تطبيق سريع:
              </label>
              <select
                value={fastCouriers.some((c) => c.id === selectedDriverId) ? selectedDriverId : ''}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full p-2 rounded-xl border border-amber-300 text-xs font-bold text-stone-900 bg-amber-50/40 focus:border-amber-600 focus:outline-none"
              >
                <option value="">-- اختر سائق تطبيق --</option>
                {sortedFastCouriers.map(({ courier, appBadgeLabel }) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name} ({appBadgeLabel}{courier.typicalFare ? ` - ${courier.typicalFare} د.م` : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              disabled={isDispatching || !selectedDriverId || zoneOrders.length === 0}
              onClick={handleExplicitDispatch}
              className="py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isDispatching ? 'جاري الاعتماد...' : 'اعتماد وإسناد الجولة'}</span>
            </button>
          </div>

          {/* أزرار الإجراءات المساعدة (واتساب ومسار الخرائط) */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-stone-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenMaps}
                disabled={zoneOrders.length === 0}
                className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-700" />
                <span>فتح مسار Google Maps المتتابع</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsAppVerified}
                disabled={!selectedDriver || zoneOrders.length === 0}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-700" />
                <span>إرسال تفاصيل الجولة عبر واتساب للسائق</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isClosing || zoneOrders.length === 0}
              onClick={handleAtomicClose}
              className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isClosing ? 'جاري الإغلاق...' : 'إغلاق الجولة وتأكيد التسليم (ذري)'}</span>
            </button>
          </div>
        </div>

        {/* قائمة الطلبات في القطاع */}
        <div className="space-y-2">
          <div className="text-xs font-black text-stone-800 flex items-center justify-between">
            <span>طلبات قطاع {zoneConfig.name} ({zoneOrders.length}):</span>
            <span className="text-[11px] text-stone-500 font-medium">غير مسندة: {unassignedOrders.length} | مسندة: {assignedOrders.length}</span>
          </div>

          {zoneOrders.length === 0 ? (
            <div className="p-6 text-center bg-white/60 rounded-xl border border-stone-200 text-stone-500 text-xs font-bold">
              لا توجد طلبات نشطة في هذه المنطقة حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pl-1">
              {zoneOrders.map((ord) => {
                const isAssigned = Boolean(ord.delivery_dispatch?.driverId || ord.driver_id);
                return (
                  <div key={ord.id} className="bg-white border border-stone-200 rounded-xl p-3 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-stone-900">{ord.order_code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAssigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isAssigned ? (ord.delivery_dispatch?.driverName || 'مسند لسائق') : 'غير مسند'}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-700 font-bold truncate">
                      {ord.customer_name} • {ord.phone}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{ord.address}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px]">
                      <span className="font-bold text-emerald-700">{ord.total.toFixed(2)} د.م (COD)</span>
                      <span className="text-stone-400 font-medium">{ord.items.length} أصناف</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
