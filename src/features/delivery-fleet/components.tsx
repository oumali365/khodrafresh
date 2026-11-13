// ============================================================
// components.tsx - مكونات واجهة أسطول التوصيل والمناطق
// ============================================================

import React from 'react';
import {
  Bike,
  Clock,
  Coins,
  TrendingUp,
  Navigation,
  MapPin,
  Eye,
  Send,
  Compass,
  CheckCircle2,
  Printer,
  Copy,
  Plus,
  RefreshCw,
  Car,
} from 'lucide-react';
import type {
  FleetStats,
  FezZoneId,
  DbOrder,
  StoreDriver,
  FastAppCourier,
  DriverStatus,
} from './types';
import { ZONE_STYLES, FLEET_ZONES } from './constants';
import { FEZ_DELIVERY_ZONES, DELIVERY_PROVIDERS, STORE_PICKUP_HUB } from '../../data/config';
import { calculateZoneCOD, getSortedDriversForZone, getSortedFastCouriersForZone } from './utils';
import { DriverCard, ProviderCard } from './cards';

/**
 * 4 بطاقات مؤشرات الأداء الرئيسية (KPIs) بتصميم احترافي ومختصر
 */
export const FleetKPIs: React.FC<{ stats: FleetStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-stone-500 font-bold mb-1.5">
          <span>الجولات</span>
          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <Bike className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-stone-900 tabular-nums">
          {stats.totalTrips}
        </div>
        <p className="text-[11px] text-stone-500 mt-1">
          {stats.activeTrips} نشطة · {stats.deliveredTrips} منجزة
        </p>
      </div>

      <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-stone-500 font-bold mb-1.5">
          <span>الوقت المتوقع</span>
          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-stone-900 tabular-nums">
          {stats.targetTime}
        </div>
        <p className="text-[11px] text-stone-500 mt-1">متوسط مناطق فاس</p>
      </div>

      <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-stone-500 font-bold mb-1.5">
          <span>أجور السائقين</span>
          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-stone-900 tabular-nums">
          {stats.totalDriverCost.toFixed(0)} <span className="text-xs font-normal text-stone-500">د.م</span>
        </div>
        <p className="text-[11px] text-stone-500 mt-1">إجمالي عمولات الجولات</p>
      </div>

      <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-stone-500 font-bold mb-1.5">
          <span>صافي التوصيل</span>
          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div
          className={`text-xl sm:text-2xl font-black tabular-nums ${
            stats.netDeliveryProfit >= 0 ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          {stats.netDeliveryProfit >= 0 ? '+' : ''}
          {stats.netDeliveryProfit.toFixed(0)} <span className="text-xs font-normal text-stone-500">د.م</span>
        </div>
        <p className="text-[11px] text-stone-500 mt-1">عائد رسوم التوصيل</p>
      </div>
    </div>
  );
};

export interface ZoneColumnProps {
  zoneKey: FezZoneId;
  orders: DbOrder[];
  drivers: StoreDriver[];
  fastCouriers?: FastAppCourier[];
  selectedDriverId: string;
  onSelectDriver: (zoneKey: FezZoneId, driverId: string) => void;
  onAssignDriverToTour?: (zoneKey: FezZoneId, driverId: string) => void;
  isAssigningDriver?: boolean;
  onViewCOD: (zoneKey: FezZoneId) => void;
  onSendWhatsApp: (zoneKey: FezZoneId) => void;
  onOpenGoogleMaps: (zoneKey: FezZoneId) => void;
  onCloseTour: (zoneKey: FezZoneId) => void;
  onOpenManifest: (zoneKey: FezZoneId) => void;
  onOpenCopyTemplates: (zoneKey: FezZoneId) => void;
}

/**
 * عمود منطقة توصيل جغرافية واحدة بتصميم منظم واحترافي
 */
export const ZoneColumn: React.FC<ZoneColumnProps> = ({
  zoneKey,
  orders,
  drivers,
  fastCouriers = [],
  selectedDriverId,
  onSelectDriver,
  onAssignDriverToTour,
  isAssigningDriver,
  onViewCOD,
  onSendWhatsApp,
  onOpenGoogleMaps,
  onCloseTour,
  onOpenManifest,
  onOpenCopyTemplates,
}) => {
  const info = FEZ_DELIVERY_ZONES[zoneKey];
  const styles = ZONE_STYLES[zoneKey];
  const { totalCOD, ordersCount } = calculateZoneCOD(orders);
  const sortedDrivers = getSortedDriversForZone(zoneKey, drivers);
  const sortedFastCouriers = getSortedFastCouriersForZone(zoneKey, fastCouriers);

  const selectedStoreDriver = drivers.find((d) => d.id === selectedDriverId);
  const selectedFastCourier = fastCouriers.find((c) => c.id === selectedDriverId);
  const isInternalSelected = Boolean(selectedStoreDriver);
  const isFastSelected = Boolean(selectedFastCourier);

  return (
    <div
      className={`border rounded-2xl p-3.5 bg-white flex flex-col justify-between shadow-2xs transition-all ${styles.border}`}
    >
      <div>
        {/* ترويسة المنطقة */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${styles.badge}`}>
              {info.name}
            </span>
            <span className="text-[11px] text-stone-500 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-stone-400" />
              <span>{info.targetTime}</span>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-stone-500 truncate mb-2.5 font-medium" title={info.neighborhoods.join(' • ')}>
          {info.neighborhoods.slice(0, 3).join(' • ')}
        </p>

        {/* صندوق تفاصيل الطلبات والتحصيل النقدي */}
        <div className="bg-stone-50/80 border border-stone-200/70 rounded-xl p-2.5 mb-2.5 text-xs space-y-2">
          <div className="flex justify-between items-center text-stone-700">
            <span className="font-bold">الطلبات:</span>
            <span className="font-black tabular-nums text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200 text-xs">
              {ordersCount} طلب
            </span>
          </div>

          <div className="flex justify-between items-center pt-1.5 border-t border-stone-200/60">
            <span className="text-stone-600 font-bold text-[11px]">التحصيل (COD):</span>
            <div className="flex items-center gap-1.5">
              <strong className="text-stone-900 text-xs font-black tabular-nums">
                {totalCOD.toFixed(2)} د.م
              </strong>
              <button
                type="button"
                disabled={ordersCount === 0}
                onClick={() => onViewCOD(zoneKey)}
                className="px-1.5 py-0.5 rounded-md bg-white hover:bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center gap-0.5 border border-stone-200 transition-colors cursor-pointer disabled:opacity-40"
                title="عرض تفاصيل التحصيل"
              >
                <Eye className="w-3 h-3 text-stone-500" />
                <span>عرض</span>
              </button>
            </div>
          </div>

          {/* تعيين المندوب: اختيارات واضحة ومباشرة */}
          <div className="pt-2 border-t border-stone-200/60 space-y-1.5">
            <span className="block text-[11px] font-black text-stone-800">
              إسناد الجولة:
            </span>

            {/* 1. سائق المتجر */}
            <div>
              <label className="block text-[10px] text-stone-600 font-bold mb-0.5">
                سائق المتجر:
              </label>
              <select
                value={isInternalSelected ? selectedDriverId : ''}
                onChange={(e) => onSelectDriver(zoneKey, e.target.value)}
                className={`w-full p-1.5 text-xs rounded-lg border bg-white font-medium transition-all shadow-2xs ${
                  isInternalSelected
                    ? 'border-emerald-600 bg-emerald-50/30 text-emerald-950 font-bold ring-1 ring-emerald-300'
                    : 'border-stone-300 text-stone-700 hover:border-emerald-500'
                }`}
              >
                <option value="">-- اختر سائقاً --</option>
                {sortedDrivers.map(({ driver, isDisabled, disabledReason }) => (
                  <option
                    key={driver.id}
                    value={driver.id}
                    disabled={isDisabled}
                    className={isDisabled ? 'text-stone-400 bg-stone-100' : 'text-stone-800'}
                  >
                    {driver.name} ({driver.commissionPerOrder} د.م){isDisabled ? ` - ${disabledReason || 'غير متاح'}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. كابتن تطبيق */}
            <div>
              <label className="block text-[10px] text-stone-600 font-bold mb-0.5">
                كابتن تطبيق:
              </label>
              <select
                value={isFastSelected ? selectedDriverId : ''}
                onChange={(e) => onSelectDriver(zoneKey, e.target.value)}
                className={`w-full p-1.5 text-xs rounded-lg border bg-white font-medium transition-all shadow-2xs ${
                  isFastSelected
                    ? 'border-amber-500 bg-amber-50/40 text-amber-950 font-bold ring-1 ring-amber-300'
                    : 'border-stone-300 text-stone-700 hover:border-amber-400'
                }`}
              >
                <option value="">-- اختر كابتن تطبيق --</option>
                {sortedFastCouriers.map(({ courier, appBadgeLabel }) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name} ({appBadgeLabel}{courier.typicalFare ? ` - ${courier.typicalFare} د.م` : ''})
                  </option>
                ))}
              </select>
            </div>

            {onAssignDriverToTour && selectedDriverId && ordersCount > 0 && (
              <button
                type="button"
                disabled={isAssigningDriver}
                onClick={() => onAssignDriverToTour(zoneKey, selectedDriverId)}
                className={`mt-1.5 w-full py-1.5 px-2.5 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
                  isFastSelected ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isAssigningDriver ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isFastSelected ? (
                  <Car className="w-3.5 h-3.5 text-amber-200" />
                ) : (
                  <Bike className="w-3.5 h-3.5 text-emerald-200" />
                )}
                <span>اعتماد الجولة ({ordersCount} طلبات)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* أزرار الإجراءات المختصرة والواضحة */}
      <div className="space-y-1.5 pt-1">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={ordersCount === 0}
            onClick={() => onSendWhatsApp(zoneKey)}
            className="py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="إرسال تفاصيل الجولة عبر واتساب"
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">واتساب</span>
          </button>

          <button
            type="button"
            disabled={ordersCount === 0}
            onClick={() => onOpenGoogleMaps(zoneKey)}
            className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="فتح مسار الملاحة على خرائط Google"
          >
            <Compass className="w-3.5 h-3.5 shrink-0 text-blue-200" />
            <span className="truncate">الخريطة</span>
          </button>
        </div>

        <button
          type="button"
          disabled={ordersCount === 0}
          onClick={() => onCloseTour(zoneKey)}
          className="w-full py-1.5 px-2 rounded-lg border border-stone-300 hover:border-emerald-600 bg-stone-50 hover:bg-emerald-50 text-stone-800 hover:text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          title="تأكيد تسليم طلبات الجولة ونقلها للأرشيف"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>إغلاق وتسليم الجولة</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            disabled={ordersCount === 0}
            onClick={() => onOpenManifest(zoneKey)}
            className="py-1 px-2 rounded-lg bg-stone-800 hover:bg-stone-900 disabled:opacity-40 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="طباعة بوليصة ومانيفست A4"
          >
            <Printer className="w-3.5 h-3.5 text-stone-300" />
            <span>طباعة المانيفست</span>
          </button>

          <button
            type="button"
            disabled={ordersCount === 0}
            onClick={() => onOpenCopyTemplates(zoneKey)}
            className="py-1 px-2 rounded-lg bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-stone-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="قوالب جاهزة للنسخ"
          >
            <Copy className="w-3.5 h-3.5 text-stone-500" />
            <span>نسخ القوالب</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ZoneGridProps {
  ordersByZone: Record<FezZoneId, DbOrder[]>;
  drivers: StoreDriver[];
  fastCouriers?: FastAppCourier[];
  selectedDrivers: Record<FezZoneId, string>;
  onSelectDriver: (zoneKey: FezZoneId, driverId: string) => void;
  onAssignDriverToTour?: (zoneKey: FezZoneId, driverId: string) => void;
  assigningZone?: FezZoneId | null;
  filterMode?: 'active' | 'all' | 'prepared' | 'delivered';
  onFilterModeChange?: (mode: 'active' | 'all' | 'prepared' | 'delivered') => void;
  onViewCOD: (zoneKey: FezZoneId) => void;
  onSendWhatsApp: (zoneKey: FezZoneId) => void;
  onOpenGoogleMaps: (zoneKey: FezZoneId) => void;
  onCloseTour: (zoneKey: FezZoneId) => void;
  onOpenManifest: (zoneKey: FezZoneId) => void;
  onOpenCopyTemplates: (zoneKey: FezZoneId) => void;
}

/**
 * شبكة مناطق التوصيل الأربعة
 */
export const ZoneGrid: React.FC<ZoneGridProps> = ({
  ordersByZone,
  drivers,
  fastCouriers = [],
  selectedDrivers,
  onSelectDriver,
  onAssignDriverToTour,
  assigningZone,
  filterMode = 'active',
  onFilterModeChange,
  onViewCOD,
  onSendWhatsApp,
  onOpenGoogleMaps,
  onCloseTour,
  onOpenManifest,
  onOpenCopyTemplates,
}) => {
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-3 border-b border-stone-100">
        <div>
          <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-700" />
            <span>مسارات وتوزيع الجولات</span>
          </h3>
          <p className="text-[11px] text-stone-500 mt-0.5">
            توزيع الطلبات وإسناد الجولات ومتابعة التحصيل بمناطق فاس
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 bg-stone-50 px-3 py-1 rounded-lg border border-stone-200">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>نقطة الانطلاق: سوق بنسودة</span>
        </div>
      </div>

      {/* شريط تبديل تصفية الجولات */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4 p-1.5 bg-stone-50 rounded-xl border border-stone-200/80 text-xs">
        <span className="font-bold text-stone-600 text-[11px] px-1">تصفية الطلبات:</span>
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-stone-200">
          {(
            [
              { id: 'active', label: 'النشطة' },
              { id: 'prepared', label: 'المجهزة' },
              { id: 'delivered', label: 'المسلّمة' },
              { id: 'all', label: 'الكل' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onFilterModeChange?.(t.id)}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                filterMode === t.id
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {FLEET_ZONES.map((zoneKey) => (
          <ZoneColumn
            key={zoneKey}
            zoneKey={zoneKey}
            orders={ordersByZone[zoneKey] || []}
            drivers={drivers}
            fastCouriers={fastCouriers}
            selectedDriverId={selectedDrivers[zoneKey] || ''}
            onSelectDriver={onSelectDriver}
            onAssignDriverToTour={onAssignDriverToTour}
            isAssigningDriver={assigningZone === zoneKey}
            onViewCOD={onViewCOD}
            onSendWhatsApp={onSendWhatsApp}
            onOpenGoogleMaps={onOpenGoogleMaps}
            onCloseTour={onCloseTour}
            onOpenManifest={onOpenManifest}
            onOpenCopyTemplates={onOpenCopyTemplates}
          />
        ))}
      </div>
    </div>
  );
};

export interface InternalDriversGridProps {
  drivers: StoreDriver[];
  isLoading: boolean;
  isSynced: boolean;
  isSyncing: boolean;
  onSync: () => void;
  onAdd: () => void;
  onEdit: (driver: StoreDriver) => void;
  onDelete: (driver: StoreDriver) => void;
  onStatusChange: (driver: StoreDriver, status: DriverStatus) => void;
}

/**
 * شبكة فريق سائقي المتجر الداخلي
 */
export const InternalDriversGrid: React.FC<InternalDriversGridProps> = ({
  drivers,
  isLoading,
  isSynced,
  isSyncing,
  onSync,
  onAdd,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <Bike className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-stone-900">
                فريق سائقي المتجر
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                {drivers.length} سائق
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              السائقون الداخليون المعتمدون للمتجر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              isSynced
                ? 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
            title="مزامنة مع السيرفر"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSynced ? 'متزامن' : 'مزامنة'}</span>
          </button>

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#163920] hover:bg-[#0E2615] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة سائق</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-stone-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
          <span>جاري التحميل...</span>
        </div>
      ) : drivers.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-500 bg-stone-50 rounded-xl my-3">
          <p className="font-bold text-stone-700">لم يتم تسجيل سائقين بعد</p>
          <p className="text-[11px] text-stone-400 mt-1">
            انقر على "إضافة سائق" لتسجيل مندوب توصيل جديد
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5">
          {drivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              variant="internal"
              onEdit={onEdit as (d: StoreDriver | FastAppCourier) => void}
              onDelete={onDelete as (d: StoreDriver | FastAppCourier) => void}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export interface FastCouriersGridProps {
  couriers: FastAppCourier[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (courier: FastAppCourier) => void;
  onDelete: (courier: FastAppCourier) => void;
}

/**
 * شبكة كباتن تطبيقات التوصيل السريع (inDrive, Glovo, Yassir)
 */
export const FastCouriersGrid: React.FC<FastCouriersGridProps> = ({
  couriers,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-stone-900">
                سائقو التطبيقات السريعة
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                {couriers.length} كابتن
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              كباتن تطبيقات التوصيل (inDrive • Glovo • Yassir)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة كابتن</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-xs text-stone-500">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto text-amber-600 mb-1.5" />
          <span>جاري التحميل...</span>
        </div>
      ) : couriers.length === 0 ? (
        <div className="py-6 text-center text-xs text-stone-500 bg-stone-50/60 rounded-xl border border-stone-200/60">
          <Car className="w-5 h-5 mx-auto mb-1 text-stone-300" />
          <p className="font-bold text-stone-700 text-xs">لا يوجد كباتن مسجلين حالياً</p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            أضف كباتن خارجيين للتواصل المباشر معهم عند الحاجة
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {couriers.map((courier) => (
            <DriverCard
              key={courier.id}
              driver={courier}
              variant="fast"
              onEdit={onEdit as (d: StoreDriver | FastAppCourier) => void}
              onDelete={onDelete as (d: StoreDriver | FastAppCourier) => void}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * شبكة شركات وتطبيقات التوصيل الخارجي
 */
export const ProviderCards: React.FC = () => {
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs">
      <div className="mb-3">
        <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-2">
          <Bike className="w-4 h-4 text-emerald-600" />
          <span>تطبيقات التوصيل السريع</span>
        </h3>
        <p className="text-[11px] text-stone-500 mt-0.5">
          روابط مباشرة لتطبيقات التوصيل المعتمدة في فاس
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {DELIVERY_PROVIDERS.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  );
};
