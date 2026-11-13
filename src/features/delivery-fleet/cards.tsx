// ============================================================
// cards.tsx - بطاقات السائقين الموحدة وشركات التوصيل
// ============================================================

import React from 'react';
import { Phone, MessageCircle, Edit3, Trash2, ExternalLink } from 'lucide-react';
import type { StoreDriver, FastAppCourier, DriverStatus, DeliveryProvider } from './types';
import { VEHICLE_CONFIG, STATUS_CONFIG, APP_BADGES } from './constants';
import { FEZ_DELIVERY_ZONES } from '../../data/deliveryZones';
import { cleanPhoneForWhatsApp } from './utils';

export interface DriverCardProps {
  driver: StoreDriver | FastAppCourier;
  variant: 'internal' | 'fast';
  onEdit: (driver: StoreDriver | FastAppCourier) => void;
  onDelete: (driver: StoreDriver | FastAppCourier) => void;
  onStatusChange?: (driver: StoreDriver, status: DriverStatus) => void;
  onCall?: (phone: string) => void;
  onWhatsApp?: (phone: string, text?: string) => void;
}

/**
 * بطاقة السائق الموحدة (تدعم كلاً من السائق الداخلي وكابتن التطبيق السريع)
 */
export const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  variant,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const vehicle = VEHICLE_CONFIG[driver.vehicleType] || VEHICLE_CONFIG.moto;
  const cleanPhone = cleanPhoneForWhatsApp(driver.phone);

  const isInternal = variant === 'internal';
  const internalDriver = isInternal ? (driver as StoreDriver) : null;
  const fastCourier = !isInternal ? (driver as FastAppCourier) : null;

  const status = internalDriver
    ? STATUS_CONFIG[internalDriver.status] || STATUS_CONFIG.available
    : null;

  const appBadge = fastCourier ? APP_BADGES[fastCourier.app] || APP_BADGES.other : null;

  const fareAmount = internalDriver
    ? internalDriver.commissionPerOrder
    : fastCourier?.typicalFare ?? 25;

  const zonePref = isInternal
    ? internalDriver?.zonePreference
    : fastCourier?.zone;

  const zoneLabel =
    zonePref === 'all'
      ? 'جميع أحياء فاس'
      : (zonePref && FEZ_DELIVERY_ZONES[zonePref]?.name) || 'فاس';

  const defaultWhatsappText = fastCourier
    ? `السلام عليكم كابتن *${fastCourier.name}* (${appBadge?.label || 'تطبيق'}) 🛵🌿\nمعك إدارة متجر خُضرة بفاس.\nهل أنت متاح حالياً لاستلام طلبية ونقلها من سوق بنسودة؟ الأجرة التقديرية: ${fareAmount} د.م.`
    : `السلام عليكم كابتن *${driver.name}* 🛵🌿 معك إدارة متجر خُضرة.`;

  return (
    <div
      className={`border rounded-xl p-3 transition-all flex flex-col justify-between shadow-xs bg-white ${
        isInternal
          ? 'border-stone-200/90 hover:border-emerald-300'
          : 'border-amber-200/90 hover:border-amber-300'
      }`}
    >
      <div>
        {/* الترويسة: الاسم ونوع المركبة والحالة */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-black text-stone-900 truncate">
              {driver.name}
            </span>
            <span className="text-[10px] text-stone-600 px-1.5 py-0.2 rounded bg-stone-100 shrink-0">
              {vehicle.label}
            </span>
          </div>

          {isInternal && status && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${status.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              <span>{status.label}</span>
            </span>
          )}

          {!isInternal && appBadge && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${appBadge.style}`}>
              {appBadge.label}
            </span>
          )}
        </div>

        {/* تفاصيل البطاقة */}
        <div className="space-y-1.5 text-xs text-stone-600 mb-2.5 bg-stone-50/60 p-2.5 rounded-lg border border-stone-200/70">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-500">الهاتف:</span>
            <span className="font-mono font-bold text-stone-900 text-left" dir="ltr">
              {driver.phone}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-500">الأجرة:</span>
            <strong
              className={`tabular-nums ${isInternal ? 'text-emerald-800' : 'text-amber-800'}`}
            >
              {fareAmount} د.م
            </strong>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-500">المنطقة:</span>
            <span className="font-bold text-stone-900 truncate max-w-[130px]">
              {zoneLabel}
            </span>
          </div>

          {isInternal && internalDriver?.vehiclePlate && internalDriver.vehiclePlate !== 'غير محدد' && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500">اللوحة:</span>
              <span className="font-mono font-bold text-stone-800" dir="ltr">
                {internalDriver.vehiclePlate}
              </span>
            </div>
          )}

          {driver.notes && (
            <p className="text-[10px] text-stone-500 italic mt-1 line-clamp-1 border-t border-stone-100 pt-1">
              {driver.notes}
            </p>
          )}
        </div>
      </div>

      {/* منطقة الإجراءات وأزرار التحكم */}
      <div className="space-y-2 pt-1 border-t border-stone-100">
        {/* مفاتيح الحالة السريعة للسائق الداخلي */}
        {isInternal && internalDriver && onStatusChange && (
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => onStatusChange(internalDriver, 'available')}
              className={`flex-1 py-1 rounded text-center font-bold transition-colors cursor-pointer ${
                internalDriver.status === 'available'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              متاح
            </button>
            <button
              type="button"
              onClick={() => onStatusChange(internalDriver, 'on_delivery')}
              className={`flex-1 py-1 rounded text-center font-bold transition-colors cursor-pointer ${
                internalDriver.status === 'on_delivery'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              في جولة
            </button>
            <button
              type="button"
              onClick={() => onStatusChange(internalDriver, 'off_duty')}
              className={`flex-1 py-1 rounded text-center font-bold transition-colors cursor-pointer ${
                internalDriver.status === 'off_duty'
                  ? 'bg-stone-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              خارج الخدمة
            </button>
          </div>
        )}

        {/* 4 أزرار موحدة في الأسفل: اتصال، واتساب، تعديل، حذف */}
        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
          <a
            href={`tel:${driver.phone}`}
            className="py-1.5 rounded-lg bg-stone-100 hover:bg-blue-50 text-stone-700 hover:text-blue-700 transition-colors flex items-center justify-center font-bold text-[11px]"
            title="اتصال هاتفي"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>

          <a
            href={
              cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultWhatsappText)}`
                : '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 rounded-lg bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 transition-colors flex items-center justify-center font-bold text-[11px]"
            title="محادثة واتساب"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => onEdit(driver)}
            className="py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center justify-center font-bold text-[11px] cursor-pointer"
            title="تعديل"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(driver)}
            className="py-1.5 rounded-lg bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 transition-colors flex items-center justify-center font-bold text-[11px] cursor-pointer"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ProviderCardProps {
  provider: {
    id: DeliveryProvider;
    name: string;
    badgeClass: string;
    icon: string;
    appUrl: string;
    recommended: boolean;
    tagline?: string;
    avgCost?: string;
  };
}

/**
 * بطاقة تطبيق توصيل خارجي مبسطة واحترافية
 */
export const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  return (
    <div className="border border-stone-200/90 rounded-xl p-3 flex flex-col justify-between transition-all bg-white hover:border-emerald-500 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl p-1.5 rounded-lg bg-stone-100">{provider.icon}</span>
        <div>
          <h4 className="font-black text-xs sm:text-sm text-stone-900">{provider.name}</h4>
          {provider.avgCost && (
            <p className="text-[10px] text-stone-500">{provider.avgCost}</p>
          )}
        </div>
      </div>

      {provider.appUrl && (
        <a
          href={provider.appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-1.5 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>فتح التطبيق</span>
        </a>
      )}
    </div>
  );
};
