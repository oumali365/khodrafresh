// ============================================================
// modals.tsx - النوافذ المنبثقة لإدارة الحسابات والقوالب والسائقين
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Copy,
  Check,
  CheckCircle2,
  Archive,
  RefreshCw,
  Bike,
  Car,
  Trash2,
} from 'lucide-react';
import type {
  FezZoneId,
  DbOrder,
  StoreDriver,
  FastAppCourier,
  DriverFormData,
  FastCourierFormData,
  DriverVehicleType,
  DriverStatus,
  FastDeliveryApp,
} from './types';
import { TourManifestModal } from './TourManifestModal';
export { TourManifestModal } from './TourManifestModal';
import { FEZ_DELIVERY_ZONES } from '../../data/deliveryZones';
import { DEFAULT_DRIVER_FORM, DEFAULT_FAST_COURIER_FORM } from './constants';
import {
  calculateZoneCOD,
  buildDriverWhatsAppMessage,
  buildInDriveMessage,
  buildCustomersNotificationMessage,
} from './utils';

// ─── 1. مودال تفاصيل التحصيل النقدي (CODDetailsModal) ───
export interface CODDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneKey: FezZoneId | null;
  orders: DbOrder[];
}

export const CODDetailsModal: React.FC<CODDetailsModalProps> = ({
  isOpen,
  onClose,
  zoneKey,
  orders,
}) => {
  if (!isOpen || !zoneKey) return null;

  const zoneInfo = FEZ_DELIVERY_ZONES[zoneKey];
  const { totalCOD, totalDeliveryFees, totalSubtotal, ordersCount } = calculateZoneCOD(orders);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden text-right">
        <div className="p-4 bg-gradient-to-l from-emerald-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-black text-base">
                تفاصيل مبالغ التحصيل النقدي (COD) • {zoneInfo?.name}
              </h3>
              <p className="text-[11px] text-emerald-200">
                كشف محاسبي دقيق لكل طلب على حدة لمنع أي خطأ مالي أثناء التسليم
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {ordersCount === 0 ? (
            <div className="py-8 text-center text-stone-500 bg-stone-50 rounded-xl">
              لا توجد طلبات في هذه المنطقة حالياً.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">رقم الطلب</th>
                      <th className="p-2.5">الزبون</th>
                      <th className="p-2.5">العنوان / الحي</th>
                      <th className="p-2.5">طريقة الدفع</th>
                      <th className="p-2.5 text-left">مبلغ COD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                    {orders.map((ord, idx) => (
                      <tr key={ord.id} className="hover:bg-emerald-50/40">
                        <td className="p-2.5 font-mono text-stone-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-stone-900">
                          {ord.order_code}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-stone-900">{ord.customer_name}</div>
                          <div className="font-mono text-[10px] text-stone-500" dir="ltr">
                            {ord.phone}
                          </div>
                        </td>
                        <td className="p-2.5 max-w-[160px] truncate" title={ord.address}>
                          {ord.address}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            دفع عند الاستلام
                          </span>
                        </td>
                        <td className="p-2.5 text-left font-black text-emerald-800 tabular-nums">
                          {ord.total.toFixed(2)} د.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>إجمالي قيمة المنتجات (Subtotal):</span>
                  <span className="font-bold tabular-nums">{totalSubtotal.toFixed(2)} د.م</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>إجمالي رسوم التوصيل:</span>
                  <span className="font-bold tabular-nums">
                    {totalDeliveryFees.toFixed(2)} د.م
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-stone-200 font-black text-sm text-stone-900">
                  <span>مجموع التحصيل النقدي المطلوب من السائق (COD):</span>
                  <span className="text-base text-emerald-800 tabular-nums">
                    {totalCOD.toFixed(2)} د.م
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};

export interface CopyTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneKey: FezZoneId | null;
  orders: DbOrder[];
  selectedDriver: StoreDriver | FastAppCourier | null | undefined;
  onCopy: (text: string, templateKey: string) => void;
  copiedTemplate: string | null;
}

export const CopyTemplatesModal: React.FC<CopyTemplatesModalProps> = ({
  isOpen,
  onClose,
  zoneKey,
  orders,
  selectedDriver,
  onCopy,
  copiedTemplate,
}) => {
  if (!isOpen || !zoneKey) return null;
  const zoneInfo = FEZ_DELIVERY_ZONES[zoneKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-5 border border-stone-200 shadow-2xl text-right space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-emerald-700" />
            <h4 className="font-black text-base text-stone-900">
              قوالب النسخ الذكية • {zoneInfo?.name}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          اختر القالب المطلوب وانسخه بنقرة واحدة للحافظة:
        </p>

        <div className="space-y-3">
          {/* 1. قالب السائق الداخلي */}
          <div className="border-2 border-emerald-200 rounded-xl p-3.5 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex flex-col justify-between gap-2">
            <div>
              <strong className="text-xs font-black text-emerald-950 block">
                1. قالب السائق الداخلي (WhatsApp)
              </strong>
              <span className="text-[11px] text-stone-600 block mt-0.5">
                يشمل أسماء الزبائن، الهواتف، العناوين، رابط GPS، ومبالغ COD والإجمالي.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const txt = buildDriverWhatsAppMessage(zoneKey, orders, selectedDriver, zoneInfo);
                onCopy(txt, 'driver_whatsapp');
              }}
              className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {copiedTemplate === 'driver_whatsapp' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>تم النسخ بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ قالب السائق الداخلي</span>
                </>
              )}
            </button>
          </div>

          {/* 2. قالب InDrive / تطبيقات النقل */}
          <div className="border-2 border-amber-200 rounded-xl p-3.5 bg-amber-50/50 hover:bg-amber-50 transition-all flex flex-col justify-between gap-2">
            <div>
              <strong className="text-xs font-black text-amber-950 block">
                2. قالب InDrive / تطبيقات النقل
              </strong>
              <span className="text-[11px] text-stone-600 block mt-0.5">
                مختصر لنقطة الانطلاق (سوق الجملة بنسودة) والمحطات المتتابعة ومجموع المبالغ.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const txt = buildInDriveMessage(zoneKey, orders, zoneInfo);
                onCopy(txt, 'indrive');
              }}
              className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {copiedTemplate === 'indrive' ? (
                <>
                  <Check className="w-4 h-4 text-amber-200" />
                  <span>تم النسخ بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ قالب inDrive</span>
                </>
              )}
            </button>
          </div>

          {/* 3. قالب إشعار الزبائن */}
          <div className="border-2 border-blue-200 rounded-xl p-3.5 bg-blue-50/50 hover:bg-blue-50 transition-all flex flex-col justify-between gap-2">
            <div>
              <strong className="text-xs font-black text-blue-950 block">
                3. قالب إشعار الزبائن بخروج الجولة
              </strong>
              <span className="text-[11px] text-stone-600 block mt-0.5">
                رسائل جاهزة لإعلام الزبائن بخروج الجولة مع المبلغ والتوقيت المتوقع.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const txt = buildCustomersNotificationMessage(zoneKey, orders, zoneInfo);
                onCopy(txt, 'customers_sms');
              }}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {copiedTemplate === 'customers_sms' ? (
                <>
                  <Check className="w-4 h-4 text-blue-200" />
                  <span>تم النسخ بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ رسائل إشعار الزبائن</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 3. مودال تأكيد إغلاق الجولة (CloseTourModal) ───
export interface CloseTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneKey: FezZoneId | null;
  orders: DbOrder[];
  selectedDriver: StoreDriver | FastAppCourier | null | undefined;
  isClosing: boolean;
  onConfirm: () => void;
}

export const CloseTourModal: React.FC<CloseTourModalProps> = ({
  isOpen,
  onClose,
  zoneKey,
  orders,
  selectedDriver,
  isClosing,
  onConfirm,
}) => {
  if (!isOpen || !zoneKey) return null;
  const zoneInfo = FEZ_DELIVERY_ZONES[zoneKey];
  const { totalCOD } = calculateZoneCOD(orders);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 text-right space-y-4 border border-stone-200 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h4 className="font-black text-base text-stone-900">
            إغلاق جولة {zoneInfo?.name} وتأكيد التسليم؟
          </h4>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            سيتم تحديث جميع الطلبات المرتبطة بهذه الجولة ({orders.length} طلبات) إلى حالة{' '}
            <strong>"تم التسليم"</strong> ونقلها تلقائياً إلى <strong>أرشيف الطلبات</strong>.
          </p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span>المنطقة:</span>
            <span className="font-bold text-stone-900">{zoneInfo?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>عدد الطلبات:</span>
            <span className="font-bold text-stone-900">{orders.length} طلبات</span>
          </div>
          <div className="flex justify-between">
            <span>مجموع التحصيل (COD):</span>
            <strong className="text-emerald-800 tabular-nums">{totalCOD.toFixed(2)} د.م</strong>
          </div>
          <div className="flex justify-between">
            <span>المندوب المعين:</span>
            <span className="font-bold text-stone-900">
              {selectedDriver
                ? 'app' in selectedDriver
                  ? `${selectedDriver.name} (كابتن تطبيق ${selectedDriver.app})`
                  : `${selectedDriver.name} (سائق داخلي)`
                : 'فريق خُضرة'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={isClosing}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs cursor-pointer"
          >
            تراجع
          </button>
          <button
            type="button"
            disabled={isClosing}
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            {isClosing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الإغلاق والأرشفة...</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>تأكيد الإغلاق والأرشفة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── 4. مودال إضافة / تعديل السائق الموحد (DriverFormModal) ───
export interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'internal' | 'fast';
  initialData?: StoreDriver | FastAppCourier | null;
  onSubmit: (data: DriverFormData | FastCourierFormData) => void;
}

export const DriverFormModal: React.FC<DriverFormModalProps> = ({
  isOpen,
  onClose,
  variant,
  initialData,
  onSubmit,
}) => {
  const [internalForm, setInternalForm] = useState<DriverFormData>(DEFAULT_DRIVER_FORM);
  const [fastForm, setFastForm] = useState<FastCourierFormData>(DEFAULT_FAST_COURIER_FORM);

  useEffect(() => {
    if (variant === 'internal') {
      if (initialData) {
        const d = initialData as StoreDriver;
        setInternalForm({
          name: d.name,
          phone: d.phone,
          vehicleType: d.vehicleType,
          zonePreference: d.zonePreference,
          status: d.status,
          commissionPerOrder: d.commissionPerOrder,
          vehiclePlate: d.vehiclePlate || '',
          address: d.address || '',
          notes: d.notes || '',
        });
      } else {
        setInternalForm(DEFAULT_DRIVER_FORM);
      }
    } else {
      if (initialData) {
        const c = initialData as FastAppCourier;
        setFastForm({
          name: c.name,
          app: c.app,
          appNameCustom: c.appNameCustom || '',
          phone: c.phone,
          vehicleType: c.vehicleType,
          zone: c.zone,
          typicalFare: c.typicalFare || 20,
          notes: c.notes || '',
        });
      } else {
        setFastForm(DEFAULT_FAST_COURIER_FORM);
      }
    }
  }, [variant, initialData, isOpen]);

  if (!isOpen) return null;

  const isInternal = variant === 'internal';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInternal) {
      onSubmit(internalForm);
    } else {
      onSubmit(fastForm);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden text-right flex flex-col max-h-[92vh]">
        {/* الترويسة العصرية */}
        <div
          className={`p-4 text-white flex items-center justify-between shrink-0 ${
            isInternal
              ? 'bg-gradient-to-l from-[#163920] to-[#0E2615]'
              : 'bg-gradient-to-l from-amber-600 to-amber-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              {isInternal ? <Bike className="w-5 h-5 text-[#F5D76E]" /> : <Car className="w-5 h-5 text-amber-200" />}
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                {initialData
                  ? `تعديل بيانات: ${initialData.name}`
                  : isInternal
                  ? 'إضافة سائق جديد للفريق الداخلي'
                  : 'إضافة كابتن تطبيق جديد'}
              </h3>
              <p className="text-[10px] text-white/80 font-medium mt-0.5">
                {isInternal ? 'سائق تابع لمتجر خُضرة مباشرة' : 'كابتن من تطبيقات التوصيل الخارجي'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* نموذج الإدخال المنظم في أقسام عصرية */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
          {/* القسم 1: بيانات الهوية والتواصل */}
          <div className="bg-stone-50/80 p-3 sm:p-3.5 rounded-2xl border border-stone-200/70 space-y-2.5">
            <div className="text-[11px] font-black text-stone-700 flex items-center gap-1.5 pb-1 border-b border-stone-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>المعلومات الأساسية والتواصل</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  اسم {isInternal ? 'السائق' : 'الكابتن'} الكامل: *
                </label>
                <input
                  type="text"
                  required
                  value={isInternal ? internalForm.name : fastForm.name}
                  onChange={(e) =>
                    isInternal
                      ? setInternalForm({ ...internalForm, name: e.target.value })
                      : setFastForm({ ...fastForm, name: e.target.value })
                  }
                  placeholder="مثال: يوسف العلمي"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-emerald-600 focus:border-emerald-600 font-bold shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  رقم الهاتف / الواتساب: *
                </label>
                <input
                  type="tel"
                  required
                  value={isInternal ? internalForm.phone : fastForm.phone}
                  onChange={(e) =>
                    isInternal
                      ? setInternalForm({ ...internalForm, phone: e.target.value })
                      : setFastForm({ ...fastForm, phone: e.target.value })
                  }
                  placeholder="06XXXXXXXX"
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-emerald-600 focus:border-emerald-600 font-mono text-left font-bold shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* القسم 2: تفاصيل النقل والمنطقة والأجرة */}
          <div className="bg-stone-50/80 p-3 sm:p-3.5 rounded-2xl border border-stone-200/70 space-y-2.5">
            <div className="text-[11px] font-black text-stone-700 flex items-center gap-1.5 pb-1 border-b border-stone-200/60">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>المركبة وتكلفة ونطاق التوصيل</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {!isInternal ? (
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    تطبيق التوصيل:
                  </label>
                  <select
                    value={fastForm.app}
                    onChange={(e) =>
                      setFastForm({ ...fastForm, app: e.target.value as FastDeliveryApp })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 font-bold focus:outline-amber-600 shadow-2xs"
                  >
                    <option value="indrive">🟢 inDrive</option>
                    <option value="glovo">🟡 Glovo</option>
                    <option value="yassir">🔴 Yassir</option>
                    <option value="careem">🟢 Careem</option>
                    <option value="other">⚪ كابتن حر</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  وسيلة النقل:
                </label>
                <select
                  value={isInternal ? internalForm.vehicleType : fastForm.vehicleType}
                  onChange={(e) =>
                    isInternal
                      ? setInternalForm({
                          ...internalForm,
                          vehicleType: e.target.value as DriverVehicleType,
                        })
                      : setFastForm({
                          ...fastForm,
                          vehicleType: e.target.value as DriverVehicleType,
                        })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 font-bold focus:outline-emerald-600 shadow-2xs"
                >
                  <option value="moto">🏍️ دراجة نارية</option>
                  <option value="car">🚗 سيارة</option>
                  <option value="scooter">🛵 سكوتر</option>
                  <option value="van">🚐 فان / شاحنة</option>
                  <option value="bicycle">🚲 دراجة هوائية</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  {isInternal ? 'أجرة التوصيل (د.م/طلب):' : 'متوسط الأجرة (د.م):'}
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={isInternal ? internalForm.commissionPerOrder : fastForm.typicalFare}
                  onChange={(e) =>
                    isInternal
                      ? setInternalForm({
                          ...internalForm,
                          commissionPerOrder: Number(e.target.value) || 25,
                        })
                      : setFastForm({
                          ...fastForm,
                          typicalFare: Number(e.target.value) || 20,
                        })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 font-black focus:outline-emerald-600 shadow-2xs tabular-nums text-center"
                />
              </div>

              <div className={!isInternal ? 'sm:col-span-1' : ''}>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  المنطقة المفضلة بفاس:
                </label>
                <select
                  value={isInternal ? internalForm.zonePreference : fastForm.zone}
                  onChange={(e) =>
                    isInternal
                      ? setInternalForm({
                          ...internalForm,
                          zonePreference: e.target.value as FezZoneId | 'all',
                        })
                      : setFastForm({
                          ...fastForm,
                          zone: e.target.value as FezZoneId | 'all',
                        })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 font-bold focus:outline-emerald-600 shadow-2xs"
                >
                  <option value="all">🌟 جميع أحياء فاس</option>
                  <option value="east">🟣 الشرقية (الزهور/فاس البالي)</option>
                  <option value="central">🟡 الوسطى (الأطلس/فلورنس)</option>
                  <option value="south">🟠 الجنوبية (بنسودة/زواغة)</option>
                  <option value="north">🟢 الشمالية (سايس/النرجس)</option>
                </select>
              </div>
            </div>
          </div>

          {/* القسم 3 (خاص بالسائق الداخلي): الحالة والمركبة والعنوان */}
          {isInternal && (
            <div className="bg-stone-50/80 p-3 sm:p-3.5 rounded-2xl border border-stone-200/70 space-y-2.5">
              <div className="text-[11px] font-black text-stone-700 flex items-center gap-1.5 pb-1 border-b border-stone-200/60">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>الحالة التشغيلية وتفاصيل السكن</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    الحالة الحالية:
                  </label>
                  <select
                    value={internalForm.status}
                    onChange={(e) =>
                      setInternalForm({ ...internalForm, status: e.target.value as DriverStatus })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 font-bold focus:outline-emerald-600 shadow-2xs"
                  >
                    <option value="available">🟢 متاح وجاهز للتوصيل</option>
                    <option value="on_delivery">🟡 في جولة توصيل حالياً</option>
                    <option value="off_duty">⚪ خارج الخدمة / إجازة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    رقم اللوحة / المركبة (اختياري):
                  </label>
                  <input
                    type="text"
                    value={internalForm.vehiclePlate || ''}
                    onChange={(e) =>
                      setInternalForm({ ...internalForm, vehiclePlate: e.target.value })
                    }
                    placeholder="مثال: 12-أ-3456"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-emerald-600 font-mono text-left shadow-2xs"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  عنوان السائق / الحي المقيم به في فاس (اختياري):
                </label>
                <input
                  type="text"
                  value={internalForm.address || ''}
                  onChange={(e) => setInternalForm({ ...internalForm, address: e.target.value })}
                  placeholder="مثال: حي الأطلس، قرب ساحة العلويين، فاس"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-emerald-600 font-bold shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* القسم 4: ملاحظات إضافية */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              ملاحظات إضافية:
            </label>
            <textarea
              rows={2}
              value={isInternal ? internalForm.notes || '' : fastForm.notes || ''}
              onChange={(e) =>
                isInternal
                  ? setInternalForm({ ...internalForm, notes: e.target.value })
                  : setFastForm({ ...fastForm, notes: e.target.value })
              }
              placeholder="مثال: متفرغ في الفترة الصباحية، يملك صندوقاً عازلاً كبيراً..."
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/70 focus:bg-white text-stone-900 focus:outline-emerald-600 text-xs shadow-2xs transition-all"
            />
          </div>

          {/* أزرار الإجراءات السفلية */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                isInternal
                  ? 'bg-gradient-to-l from-emerald-700 to-green-800 hover:from-emerald-800 hover:to-green-900'
                  : 'bg-gradient-to-l from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{initialData ? 'حفظ التعديلات' : isInternal ? 'إضافة السائق' : 'إضافة الكابتن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── 5. مودال تأكيد الحذف الموحد (DeleteConfirmModal) ───
export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'driver' | 'courier' | 'tour';
  targetName: string;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetName,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const title =
    targetType === 'driver'
      ? 'حذف السائق من الفريق؟'
      : targetType === 'courier'
      ? 'حذف كابتن التطبيق؟'
      : 'إلغاء وحذف الجولة؟';

  const desc =
    targetType === 'driver'
      ? `هل أنت متأكد من حذف السائق "${targetName}"؟ سيتم مسحه من قائمة الفريق الداخلي.`
      : targetType === 'courier'
      ? `هل أنت متأكد من حذف الكابتن "${targetName}" من قائمة سائقي التطبيقات السريعة؟`
      : `هل أنت متأكد من حذف الجولة "${targetName}"؟`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 text-center space-y-4 border border-stone-200 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-black text-base text-stone-900">{title}</h4>
          <p className="text-xs text-stone-600 mt-1">{desc}</p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs cursor-pointer"
          >
            تراجع
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow-md"
          >
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── 6. مجمّع النوافذ المنبثقة لأسطول التوصيل (FleetModals) ───
export interface FleetModalsProps {
  codZone: FezZoneId | null;
  onCloseCod: () => void;
  copyZone: FezZoneId | null;
  onCloseCopy: () => void;
  closeZone: FezZoneId | null;
  onCloseClose: () => void;
  manifestZone: FezZoneId | null;
  onCloseManifest: () => void;
  ordersByZone: Record<FezZoneId, DbOrder[]>;
  drivers: StoreDriver[];
  fastCouriers?: FastAppCourier[];
  selectedDrivers: Record<FezZoneId, string>;
  copiedTemplate: string | null;
  onCopy: (text: string, templateKey: string) => void;
  isClosingTour: boolean;
  onConfirmCloseTour: () => void;
  driverModal: {
    isOpen: boolean;
    variant: 'internal' | 'fast';
    data: StoreDriver | FastAppCourier | null;
  };
  onCloseDriverModal: () => void;
  onSubmitDriverModal: (data: DriverFormData | FastCourierFormData) => void;
  deleteModal: {
    isOpen: boolean;
    type: 'driver' | 'courier' | 'tour';
    target: StoreDriver | FastAppCourier | null;
  };
  onCloseDeleteModal: () => void;
  onConfirmDeleteModal: () => void;
}

export const FleetModals: React.FC<FleetModalsProps> = ({
  codZone,
  onCloseCod,
  copyZone,
  onCloseCopy,
  closeZone,
  onCloseClose,
  manifestZone,
  onCloseManifest,
  ordersByZone,
  drivers,
  fastCouriers = [],
  selectedDrivers,
  copiedTemplate,
  onCopy,
  isClosingTour,
  onConfirmCloseTour,
  driverModal,
  onCloseDriverModal,
  onSubmitDriverModal,
  deleteModal,
  onCloseDeleteModal,
  onConfirmDeleteModal,
}) => {
  const getAssignedPerson = (zoneKey: FezZoneId | null): StoreDriver | FastAppCourier | null => {
    if (!zoneKey) return null;
    const id = selectedDrivers[zoneKey];
    if (!id) return null;
    return drivers.find((d) => d.id === id) || fastCouriers.find((c) => c.id === id) || null;
  };

  return (
    <>
      <CODDetailsModal
        isOpen={Boolean(codZone)}
        onClose={onCloseCod}
        zoneKey={codZone}
        orders={codZone ? ordersByZone[codZone] : []}
      />
      <CopyTemplatesModal
        isOpen={Boolean(copyZone)}
        onClose={onCloseCopy}
        zoneKey={copyZone}
        orders={copyZone ? ordersByZone[copyZone] : []}
        selectedDriver={getAssignedPerson(copyZone)}
        onCopy={onCopy}
        copiedTemplate={copiedTemplate}
      />
      <CloseTourModal
        isOpen={Boolean(closeZone)}
        onClose={onCloseClose}
        zoneKey={closeZone}
        orders={closeZone ? ordersByZone[closeZone] : []}
        selectedDriver={getAssignedPerson(closeZone)}
        isClosing={isClosingTour}
        onConfirm={onConfirmCloseTour}
      />
      <DriverFormModal
        isOpen={driverModal.isOpen}
        variant={driverModal.variant}
        initialData={driverModal.data}
        onClose={onCloseDriverModal}
        onSubmit={onSubmitDriverModal}
      />
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        targetType={deleteModal.type}
        targetName={deleteModal.target?.name || ''}
        onClose={onCloseDeleteModal}
        onConfirm={onConfirmDeleteModal}
      />
      {manifestZone && (
        <TourManifestModal
          isOpen={Boolean(manifestZone)}
          onClose={onCloseManifest}
          zoneKey={manifestZone}
          orders={ordersByZone[manifestZone]}
          selectedDriver={getAssignedPerson(manifestZone)}
        />
      )}
    </>
  );
};
