// ============================================================
// TourManifestModal.tsx
// مانيفست وبوليصة جولة التوصيل المجمعة (Bordereau de Tournée)
// ورقة تسليم رسمية لسائقي خُضرة وفريق inDrive / الفريق الداخلي بفاس
// ============================================================
import React, { useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Bike,
  MapPin,
  Calendar,
  Phone,
  Coins,
  FileText,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { DbOrder } from '../../services/supabaseService';
import { STORE_CONFIG, STORE_PICKUP_HUB, FEZ_DELIVERY_ZONES } from '../../data/config';
import { FezZoneId, StoreDriver, FastAppCourier } from '../../types';
import { calculateTourFinancials } from '../../services/financialEngine';

interface TourManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneKey: FezZoneId;
  orders: DbOrder[];
  selectedDriver?: StoreDriver | FastAppCourier | null;
}

export const TourManifestModal: React.FC<TourManifestModalProps> = ({
  isOpen,
  onClose,
  zoneKey,
  orders,
  selectedDriver,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const zoneInfo = FEZ_DELIVERY_ZONES[zoneKey] || FEZ_DELIVERY_ZONES.north;
  const driverWagePerOrder = selectedDriver
    ? 'commissionPerOrder' in selectedDriver
      ? selectedDriver.commissionPerOrder
      : selectedDriver.typicalFare
    : undefined;

  const tourFin = calculateTourFinancials(
    orders,
    zoneKey,
    zoneInfo.name,
    driverWagePerOrder
  );
  const totalCOD = tourFin.totalCODToCollect;
  const driverFeePerOrder = tourFin.driverWagePerOrder;
  const totalDriverWage = tourFin.totalDriverWage;
  const netDueToStore = tourFin.netDueToStore;


  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('ar-MA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('ar-MA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto text-right print:m-0 print:p-0 print:border-none print:shadow-none print:w-full">
        {/* ─── شريط التحكم والأزرار (يختفي عند الطباعة) ─── */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-black text-sm sm:text-base">
                مانيفست جولة التوصيل • {zoneInfo.name}
              </h3>
              <p className="text-[11px] text-stone-300">
                {orders.length} محطات تسليم • جاهزة للطباعة والتسليم للسائق
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المانيفست (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-stone-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── المحتوى القابل للطباعة ─── */}
        <div ref={printRef} className="p-6 sm:p-8 space-y-6 text-stone-900 bg-white">
          {/* ترويسة المانيفست */}
          <div className="border-b-2 border-stone-900 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-emerald-800 font-['Almarai']">
                  خُضرة 🌿
                </span>
                <span className="text-xs font-bold text-stone-500">| KHODRA FRESH</span>
              </div>
              <p className="text-xs text-stone-600 font-medium mt-1">
                سوق الجملة للخضر والفواكه بنسودة، فاس • هاتف: {STORE_CONFIG.whatsappNumber}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                تاريخ الجولة: <strong>{currentDate}</strong> الساعة: <strong>{currentTime}</strong>
              </p>
            </div>

            <div className="text-left">
              <span className="inline-block px-3 py-1 rounded-md bg-stone-900 text-white font-black text-xs mb-1">
                BORDEREAU DE TOURNÉE
              </span>
              <div className="text-xs font-bold text-stone-800">
                منطقة التوصيل: <span className="text-emerald-800 font-black">{zoneInfo.name}</span>
              </div>
              <div className="text-[11px] text-stone-600">
                المسار التقديري: {zoneInfo.targetTime}
              </div>
            </div>
          </div>

          {/* معلومات السائق والتموين */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-stone-500 block">مندوب / سائق الجولة:</span>
              <strong className="text-stone-900 font-black text-sm">
                {selectedDriver
                  ? 'app' in selectedDriver
                    ? `${selectedDriver.name} (${selectedDriver.app.toUpperCase()})`
                    : selectedDriver.name
                  : 'كابتن التوصيل الداخلي'}
              </strong>
              {selectedDriver?.phone && (
                <span className="text-[11px] text-stone-600 block dir-ltr text-right" dir="ltr">
                  {selectedDriver.phone}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-500 block">نقطة الانطلاق:</span>
              <strong className="text-stone-900 font-bold block">{STORE_PICKUP_HUB.name}</strong>
              <span className="text-[10px] text-stone-600">{STORE_PICKUP_HUB.address}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-500 block">إجمالي محطات الجولة:</span>
              <strong className="text-stone-900 font-black text-sm">{orders.length} طلبيات</strong>
              <span className="text-[10px] text-emerald-700 font-bold block">جاهزة ومجهزة</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-500 block">إجمالي التحصيل النقدي (COD):</span>
              <strong className="text-emerald-800 font-black text-sm">
                {totalCOD.toFixed(2)} د.م
              </strong>
              <span className="text-[10px] text-stone-600 block">
                أجرة السائق: {totalDriverWage.toFixed(0)} د.م
              </span>
            </div>
          </div>

          {/* جدول محطات الجولة والتسليم */}
          <div>
            <h4 className="font-black text-sm text-stone-900 mb-2 flex items-center justify-between">
              <span>قائمة محطات الزبائن والتسليم ({orders.length} محطات):</span>
              <span className="text-[11px] font-normal text-stone-500">
                يرجى تحصيل المبلغ والتوقيع عند كل محطة
              </span>
            </h4>

            <div className="border border-stone-300 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-100 border-b border-stone-300 text-stone-700 font-black">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5 w-24">رقم الطلب</th>
                    <th className="p-2.5">الزبون والهاتف</th>
                    <th className="p-2.5">العنوان والحي</th>
                    <th className="p-2.5 w-24 text-center">المطلوب (COD)</th>
                    <th className="p-2.5 w-28 text-center">توقيع المستلم</th>
                    <th className="p-2.5 w-24 text-center">حالة التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {orders.map((o, idx) => (
                    <tr key={o.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                      <td className="p-2.5 text-center font-bold text-stone-500">{idx + 1}</td>
                      <td className="p-2.5 font-black text-stone-900">{o.order_code}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-stone-900">{o.customer_name}</div>
                        <div className="text-[11px] text-stone-600 font-mono" dir="ltr">
                          {o.phone}
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="font-medium text-stone-800 leading-tight">{o.address}</div>
                        <div className="text-[10px] text-stone-500 mt-0.5">
                          {o.items.length} أصناف • {o.items.map((it) => it.name).slice(0, 3).join('، ')}
                          {o.items.length > 3 && '...'}
                        </div>
                      </td>
                      <td className="p-2.5 text-center font-black text-emerald-900 text-sm tabular-nums">
                        {Number(o.total).toFixed(2)} د.م
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="h-9 border border-dashed border-stone-300 rounded bg-white" />
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-stone-400">
                          <span className="w-3.5 h-3.5 rounded border border-stone-400 inline-block" />
                          <span>تم</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ملخص التسوية المالية ومطابقة الصندوق عند العودة */}
          <div className="border-t-2 border-stone-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="bg-stone-100 p-3 rounded-xl border border-stone-300 w-full sm:w-auto text-xs space-y-1">
              <div className="font-black text-stone-900 text-xs mb-1">
                تسوية الصندوق عند عودة السائق (Rapprochement de Caisse):
              </div>
              <div className="flex justify-between gap-6 text-stone-700">
                <span>إجمالي مبالغ الزبائن المحصلة:</span>
                <strong className="text-stone-900 tabular-nums">{totalCOD.toFixed(2)} د.م</strong>
              </div>
              <div className="flex justify-between gap-6 text-stone-700">
                <span>أجرة السائق ({orders.length} طلبات × {driverFeePerOrder} د.م):</span>
                <strong className="text-amber-800 tabular-nums">
                  - {totalDriverWage.toFixed(2)} د.م
                </strong>
              </div>
              <div className="flex justify-between gap-6 pt-1 border-t border-stone-300 font-black text-emerald-900 text-sm">
                <span>الصافي الواجب توريده لخزينة خُضرة:</span>
                <span className="tabular-nums">{netDueToStore.toFixed(2)} د.م</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-center text-xs w-full sm:w-64">
              <div>
                <span className="block text-[11px] font-bold text-stone-600 mb-6">
                  توقيع السائق المستلم
                </span>
                <div className="border-b border-stone-400 w-full pb-2 text-[10px] text-stone-400">
                  (التوقيع)
                </div>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-stone-600 mb-6">
                  توقيع إدارة خُضرة
                </span>
                <div className="border-b border-stone-400 w-full pb-2 text-[10px] text-stone-400">
                  (خاتم وإمضاء)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
