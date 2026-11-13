// ============================================================
// cards.tsx - بطاقة الطلب الموحدة وترويستها
// ============================================================

import React, { useState } from 'react';
import {
  Phone,
  MapPin,
  MessageCircle,
  FileText,
  Printer,
  Copy,
  Trash2,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Coins,
  Archive,
  Star,
  Send,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Bike,
  X,
} from 'lucide-react';
import type { DbOrder, OrderStatus, DeliveryDispatchInfo, StoreDriver, FastAppCourier } from './types';
import { STATUS_LABELS } from './constants';
import { FEZ_DELIVERY_ZONES } from '../../data/deliveryZones';
import { getEstimatedZoneDeliveryCost } from '../../services/financialEngine';
import {
  toWhatsApp,
  timeAgo,
  formatDateTime,
  cleanNote,
  buildCustomerThankAndConfirmMessage,
  buildStoreTeamDriverMessage,
  buildExternalDriverMessage,
  buildInDriveDriverMessage,
  buildCustomerOrderEnRouteMessage,
  buildCustomerReviewMessage,
} from './utils';

export interface OrderCardHeaderProps {
  order: DbOrder;
}

/**
 * ترويسة بطاقة الطلب: الرمز، العميل، التوقيت، المنطقة، الشارة، والمجموع
 */
export const OrderCardHeader: React.FC<OrderCardHeaderProps> = ({ order }) => {
  const statusConfig = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
  const zoneInfo = order.delivery_zone ? FEZ_DELIVERY_ZONES[order.delivery_zone] : null;

  return (
    <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-300">
            {order.order_code}
          </span>
          <h4 className="font-bold text-sm text-stone-900 truncate max-w-[140px]">
            {order.customer_name}
          </h4>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(order.created_at)}</span>
          </span>
          {zoneInfo && (
            <span className="font-semibold text-stone-600">
              • {zoneInfo.name}
            </span>
          )}
        </div>
      </div>

      <div className="text-left">
        <div className="text-sm font-black text-emerald-800 tabular-nums">
          {order.total.toFixed(2)} د.م
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border mt-1 ${statusConfig.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          <span>{statusConfig.label}</span>
        </span>
      </div>
    </div>
  );
};

export interface OrderCardProps {
  order: DbOrder;
  currentBranch: 'pending' | 'prepared' | 'delivered';
  draft?: DeliveryDispatchInfo;
  onUpdateDraft?: (updates: Partial<DeliveryDispatchInfo>) => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  storeDrivers?: StoreDriver[];
  fastCouriers?: FastAppCourier[];
  onShowMessage?: (type: 'success' | 'error', message: string) => void;
  onStatusChange: (status: OrderStatus) => void;
  isUpdatingStatus?: boolean;
  onTogglePayment?: () => void;
  onToggleArchive?: () => void;
  onOpenInvoice: () => void;
  onOpenBordereau: () => void;
  onConfirmDelete: () => void;
  onCopyOrderText: () => void;
  copied?: boolean;
}

/**
 * بطاقة الطلب الموحدة لجميع الفروع
 */
export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  currentBranch,
  draft,
  onUpdateDraft,
  onSaveDraft,
  isSavingDraft,
  storeDrivers = [],
  fastCouriers = [],
  onShowMessage,
  onStatusChange,
  isUpdatingStatus,
  onTogglePayment,
  onToggleArchive,
  onOpenInvoice,
  onOpenBordereau,
  onConfirmDelete,
  onCopyOrderText,
  copied,
}) => {
  const [showItems, setShowItems] = useState(false);
  const [showDriverAccordion, setShowDriverAccordion] = useState(currentBranch === 'prepared');
  const cleanN = cleanNote(order.note || '');
  const cleanPhone = toWhatsApp(order.phone);

  // ─── دوال استدعاء السائقين مع التحقق الصارم من المصدر ومنع الخلط ───
  const handleCallInternalDriver = () => {
    if (!draft?.driverName || !draft?.driverId) {
      onShowMessage?.('error', '⚠️ لم يتم اختيار أي سائق للطلب بعد. يرجى اختيار سائق من أسطول خُضرة الداخلي وحفظ بيانات التوصيل أولاً.');
      return;
    }
    if (draft.deliverySource === 'external_app') {
      onShowMessage?.('error', `🚫 إجراء غير مسموح: السائق المحدد (${draft.driverName}) مسجل كسائق تطبيق خارجي (${draft.appName || 'تطبيقات سريعة'}). هذا الزر مخصص حصرياً لكباتن أسطول خُضرة الداخلي؛ يرجى استخدام زر «استدعاء سائق خارجي» البرتقالي.`);
      return;
    }
    if (draft.deliverySource !== 'internal') {
      onShowMessage?.('error', '⚠️ يرجى التأكد من اختيار سائق من أسطول خُضرة الداخلي وحفظ بيانات التوصيل أولاً.');
      return;
    }
    const driverPhone = toWhatsApp(draft.driverPhone || '');
    if (!driverPhone) {
      onShowMessage?.('error', `⚠️ السائق الداخلي (${draft.driverName}) لا يتوفر على رقم هاتف صالح للاستدعاء.`);
      return;
    }
    const message = buildStoreTeamDriverMessage(order, draft);
    const waUrl = `https://wa.me/${driverPhone}?text=${encodeURIComponent(message)}`;
    onUpdateDraft?.({ lastDispatchCallAt: new Date().toISOString(), dispatchStatus: 'waiting_driver' });
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onShowMessage?.('success', `✅ تم إرسال استدعاء الطلب #${order.order_code} لكابتن المتجر الداخلي (${draft.driverName}) بنجاح!`);
  };

  const handleCallExternalCourier = () => {
    if (!draft?.driverName || !draft?.driverId) {
      onShowMessage?.('error', '⚠️ لم يتم اختيار أي سائق للطلب بعد. يرجى اختيار سائق من تطبيقات التوصيل الخارجية وحفظ بيانات التوصيل أولاً.');
      return;
    }
    if (draft.deliverySource === 'internal') {
      onShowMessage?.('error', `🚫 إجراء غير مسموح: السائق المحدد (${draft.driverName}) هو كابتن من أسطول خُضرة الداخلي. هذا الزر مخصص حصرياً لسائقي تطبيقات التوصيل الخارجية (Glovo / inDrive / Yassir)؛ يرجى استخدام زر «استدعاء كابتن المتجر» الأخضر.`);
      return;
    }
    if (draft.deliverySource !== 'external_app') {
      onShowMessage?.('error', '⚠️ يرجى التأكد من اختيار سائق من تطبيقات التوصيل الخارجية وحفظ بيانات التوصيل أولاً.');
      return;
    }
    const courierPhone = toWhatsApp(draft.driverPhone || '');
    const appName = draft.appName || 'تطبيق توصيل خارجي';
    if (!courierPhone) {
      onShowMessage?.('error', `⚠️ سائق تطبيق (${appName}: ${draft.driverName}) لا يتوفر على رقم هاتف صالح للاستدعاء.`);
      return;
    }
    const message = buildExternalDriverMessage(order, draft);
    const waUrl = `https://wa.me/${courierPhone}?text=${encodeURIComponent(message)}`;
    onUpdateDraft?.({ lastDispatchCallAt: new Date().toISOString(), dispatchStatus: 'waiting_driver' });
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onShowMessage?.('success', `✅ تم استدعاء سائق تطبيق ${appName} (${draft.driverName}) عبر قناة الواتساب المباشرة بنجاح!`);
  };

  return (
    <div className="bg-white border-2 border-stone-200 hover:border-stone-300 rounded-2xl p-3 sm:p-3.5 shadow-xs transition-all space-y-2.5 text-right">
      {/* 1. معلومات الطلب (Order Info) */}
      <OrderCardHeader order={order} />

      {/* 2. الاتصال (Contact) */}
      <div className="text-xs space-y-1 bg-stone-50 p-2 rounded-xl border border-stone-200 text-stone-700">
        <div className="flex items-center justify-between">
          <span className="text-stone-500 text-[11px]">الهاتف:</span>
          <span className="font-mono font-bold text-stone-900" dir="ltr">{order.phone}</span>
        </div>

        <div className="flex items-start justify-between">
          <span className="text-stone-500 text-[11px] shrink-0">العنوان:</span>
          <div className="text-left font-medium text-stone-800 pr-1 flex items-center gap-1">
            <span className="line-clamp-1">{order.address}</span>
            {order.maps_link && (
              <a href={order.maps_link} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-800 shrink-0" title="موقع GPS">
                <MapPin className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {cleanN && (
          <div className="text-[11px] text-stone-600 italic pt-1 border-t border-stone-200">
            ملاحظة: {cleanN}
          </div>
        )}
      </div>

      {/* 3. المنتجات (Products) */}
      <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowItems((prev) => !prev)}
          className="w-full p-2 bg-stone-100/80 hover:bg-stone-200/80 flex items-center justify-between font-bold text-stone-800 transition-colors cursor-pointer"
        >
          <span>المنتجات ({order.items.length}) • المجموع {order.subtotal.toFixed(2)} د.م</span>
          {showItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showItems && (
          <div className="p-2 bg-white divide-y divide-stone-100 max-h-48 overflow-y-auto space-y-1">
            {order.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-center py-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span>{it.icon || '🛒'}</span>
                  <span className="font-bold text-stone-900">{it.name}</span>
                  <span className="text-stone-500">× {it.qty} {it.variantLabel || ''}</span>
                </div>
                <span className="font-bold text-stone-800 tabular-nums">{it.lineTotal.toFixed(2)} د.م</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. تعيين سائق الجولة (Driver Data Layer) */}
      {currentBranch === 'prepared' && (
        <div className="border-2 border-stone-200 rounded-xl overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowDriverAccordion((prev) => !prev)}
            className="w-full p-2 bg-stone-50 hover:bg-stone-100 flex items-center justify-between font-bold text-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <Bike className="w-4 h-4 text-emerald-700" />
              <span className="text-[11px]"> تعيين سائق الجولة</span>
              {draft?.driverName ? (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                  draft.deliverySource === 'internal' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {draft.deliverySource === 'internal' ? 'فريق خُضرة' : (draft.appName || 'تطبيق خارجي')}: {draft.driverName}
                </span>
              ) : null}
            </div>
            {showDriverAccordion ? <ChevronUp className="w-3.5 h-3.5 text-stone-500" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
          </button>

          {showDriverAccordion && draft && onUpdateDraft && (
            <div className="p-2.5 bg-white space-y-2.5 border-t border-stone-200">
              
              {/* العنصر الأول والعنصر الثاني: اسم السائق وأجرة التوصيل (تصميم مضغوط وأنيق) */}
              <div className="flex flex-col gap-1.5 bg-stone-50 p-2 rounded-lg border border-stone-200 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[10px] text-stone-500 shrink-0">السائق:</span>
                    <span className="font-bold text-stone-900 truncate">{draft.driverName || 'لم يحدد'}</span>
                    {draft.deliverySource && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        draft.deliverySource === 'internal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {draft.deliverySource === 'internal' ? 'داخلي' : (draft.appName || 'خارجي')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 border-r border-stone-200 pr-2">
                    <span className="text-[10px] text-stone-500">الأجرة:</span>
                    <span className={`font-bold tabular-nums ${
                      draft.driverName && (draft.deliveryCost == null || isNaN(Number(draft.deliveryCost))) ? 'text-red-600' : 'text-emerald-700'
                    }`}>
                      {draft.deliveryCost != null && !isNaN(Number(draft.deliveryCost)) ? `${Number(draft.deliveryCost)} د.م` : '—'}
                    </span>
                  </div>
                </div>
                
                {draft.driverName && (draft.deliveryCost == null || isNaN(Number(draft.deliveryCost))) && (
                  <p className="text-[10px] text-red-600 font-bold">⚠️ لا توجد أجرة صالحة مسجلة في ملف هذا السائق</p>
                )}
                {draft.driverName && draft.deliveryCost != null && !isNaN(Number(draft.deliveryCost)) && (
                  <p className="text-[9px] text-stone-500 font-medium">✓ معتمدة تلقائياً من ملف {draft.deliverySource === 'internal' ? 'السائق الداخلي' : 'الكابتن الخارجي'}</p>
                )}
              </div>

              {/* العنصر الثالث والرابع: قوائم الاختيار (جنباً إلى جنب) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-stone-100">
                {/* القائمة الأولى: أسطول خُضرة */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-800 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>أسطول خُضرة الداخلي:</span>
                  </label>
                  <select
                    value={draft.deliverySource === 'internal' ? (draft.driverId || '') : ''}
                    onChange={(e) => {
                      const selId = e.target.value;
                      if (!selId) {
                        if (draft.deliverySource === 'internal') {
                          onUpdateDraft({ deliverySource: undefined, driverId: undefined, internalDriverId: undefined, externalDriverId: undefined, driverName: '', driverPhone: '', deliveryCost: undefined, agreedWage: undefined, appName: undefined });
                        }
                        return;
                      }
                      const d = storeDrivers.find((drv) => drv.id === selId);
                      if (d) {
                        const fare = d.commissionPerOrder != null && !isNaN(Number(d.commissionPerOrder)) ? Number(d.commissionPerOrder) : undefined;
                        onUpdateDraft({ deliverySource: 'internal', driverId: d.id, internalDriverId: d.id, externalDriverId: undefined, driverName: d.name, driverPhone: d.phone, deliveryCost: fare, agreedWage: fare, provider: 'custom', appName: 'أسطول خُضرة الداخلي' });
                      }
                    }}
                    className="w-full p-1.5 rounded-lg border border-stone-300 text-stone-900 text-[11px] bg-white font-medium focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="">-- اختر سائقًا --</option>
                    {storeDrivers.map((drv) => {
                      const statusText = drv.status === 'available' ? 'متاح' : drv.status === 'on_delivery' ? 'في جولة' : 'خارج الخدمة';
                      const fareText = drv.commissionPerOrder != null && !isNaN(Number(drv.commissionPerOrder)) ? `${drv.commissionPerOrder} د.م` : 'غير محددة';
                      return (
                        <option key={drv.id} value={drv.id}>{drv.name} ({statusText} • {fareText})</option>
                      );
                    })}
                  </select>
                  {draft.deliverySource === 'internal' && draft.driverId && (
                    <p className="text-[9px] text-emerald-700 font-semibold mt-1">✓ تم الربط بأسطول خُضرة.</p>
                  )}
                </div>

                {/* القائمة الثانية: تطبيقات التوصيل الخارجية */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-800 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>تطبيقات التوصيل (Glovo, inDrive...):</span>
                  </label>
                  <select
                    value={draft.deliverySource === 'external_app' ? (draft.driverId || '') : ''}
                    onChange={(e) => {
                      const selId = e.target.value;
                      if (!selId) {
                        if (draft.deliverySource === 'external_app') {
                          onUpdateDraft({ deliverySource: undefined, driverId: undefined, internalDriverId: undefined, externalDriverId: undefined, driverName: '', driverPhone: '', deliveryCost: undefined, agreedWage: undefined, appName: undefined });
                        }
                        return;
                      }
                      const c = fastCouriers.find((courier) => courier.id === selId);
                      if (c) {
                        const appLabel = c.app === 'glovo' ? 'Glovo' : c.app === 'indrive' ? 'inDrive' : c.app === 'yassir' ? 'Yassir' : c.app === 'careem' ? 'Careem' : (c.appNameCustom || 'تطبيق خارجي');
                        const fare = c.typicalFare != null && !isNaN(Number(c.typicalFare)) ? Number(c.typicalFare) : undefined;
                        onUpdateDraft({ deliverySource: 'external_app', driverId: c.id, internalDriverId: undefined, externalDriverId: c.id, driverName: c.name, driverPhone: c.phone, deliveryCost: fare, agreedWage: fare, provider: (c.app as any) || 'indrive', appName: appLabel });
                      }
                    }}
                    className="w-full p-1.5 rounded-lg border border-stone-300 text-stone-900 text-[11px] bg-white font-medium focus:border-amber-600 focus:outline-none"
                  >
                    <option value="">-- اختر كابتن --</option>
                    {fastCouriers.map((courier) => {
                      const appLabel = courier.app === 'glovo' ? 'Glovo' : courier.app === 'indrive' ? 'inDrive' : courier.app === 'yassir' ? 'Yassir' : courier.app === 'careem' ? 'Careem' : (courier.appNameCustom || 'تطبيق توصيل');
                      const fareText = courier.typicalFare != null && !isNaN(Number(courier.typicalFare)) ? `${courier.typicalFare} د.م` : 'غير محدد';
                      return (
                        <option key={courier.id} value={courier.id}>{courier.name} — {appLabel} ({fareText})</option>
                      );
                    })}
                  </select>
                  {draft.deliverySource === 'external_app' && draft.driverId && (
                    <p className="text-[9px] text-amber-800 font-semibold mt-1">✓ تم الربط بتطبيق {draft.appName}.</p>
                  )}
                </div>
              </div>

              {/* العنصر الخامس: أزرار الإلغاء والحفظ (في صف واحد) */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <div>
                  {draft.driverId && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateDraft({ deliverySource: undefined, driverId: undefined, internalDriverId: undefined, externalDriverId: undefined, driverName: '', driverPhone: '', deliveryCost: undefined, agreedWage: undefined, appName: undefined });
                        onShowMessage?.('success', 'تم إلغاء تحديد السائق وتفريغ الحقول');
                      }}
                      className="text-[10px] text-stone-500 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer py-1 px-1.5 rounded-lg hover:bg-stone-100"
                    >
                      <X className="w-3 h-3" />
                      <span>إلغاء السائق</span>
                    </button>
                  )}
                </div>
                
                {onSaveDraft && (
                  <button
                    type="button"
                    disabled={isSavingDraft}
                    onClick={() => {
                      if (!draft.driverId || !draft.driverName) {
                        onShowMessage?.('error', '⚠️ يرجى اختيار سائق من أسطول خُضرة الداخلي أو من تطبيقات التوصيل أولاً قبل الحفظ.');
                        return;
                      }
                      onSaveDraft();
                    }}
                    className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingDraft ? 'جاري الحفظ...' : 'حفظ بيانات التوصيل'}</span>
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* 5. استدعاء السائق (Driver Dispatch / Call) */}
      <div className="space-y-1.5">
        {currentBranch === 'pending' && (
          <a
            href={cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(buildCustomerThankAndConfirmMessage(order))}` : '#'}
            target="_blank" rel="noopener noreferrer"
            className="w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            title="إرسال شكر وتأكيد الاستلام للزبون"
          >
            <Send className="w-3.5 h-3.5" />
            <span>واتساب: تأكيد واستلام الطلب للزبون</span>
          </a>
        )}

        {currentBranch === 'prepared' && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleCallInternalDriver}
                className="py-2 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-[0.98]"
                title="استدعاء سائق فريق خُضرة الداخلي فقط"
              >
                <Bike className="w-4 h-4 shrink-0" />
                <span>استدعاء كابتن المتجر</span>
              </button>

              <button
                type="button"
                onClick={handleCallExternalCourier}
                className="py-2 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-[0.98]"
                title="استدعاء سائق تطبيقات التوصيل الخارجية فقط"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>استدعاء سائق خارجي</span>
              </button>
            </div>

            <a
              href={cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(buildCustomerOrderEnRouteMessage(order, draft))}` : '#'}
              target="_blank" rel="noopener noreferrer"
              className="w-full py-1.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              title="إشعار الزبون عبر واتساب بأن طلبه قيد التسليم مع المندوب"
            >
              <Send className="w-3.5 h-3.5" />
              <span>واتساب: إشعار الزبون بانطلاق الطلب 🚀</span>
            </a>
          </div>
        )}

        {currentBranch === 'delivered' && (
          <a
            href={cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(buildCustomerReviewMessage(order))}` : '#'}
            target="_blank" rel="noopener noreferrer"
            className="w-full py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            title="طلب تقييم الخدمة من الزبون بعد التسليم"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>واتساب: طلب تقييم الخدمة من الزبون</span>
          </a>
        )}
      </div>

      {/* ========================================================= */}
      {/* 6. أزرار التحكم والإجراءات (تم فصلها إلى صفين لتحسين التصميم) */}
      {/* ========================================================= */}
      <div className="pt-2 border-t border-stone-200 mt-2 space-y-2">
        
        {/* الصف الأول: أزرار تغيير الحالة (الإجراءات الرئيسية) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {currentBranch === 'pending' && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => onStatusChange('prepared')}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-600/70 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              title="تأكيد تجهيز الطلب ونقله إلى قسم التجهيز"
            >
              {isUpdatingStatus ? (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>تم التجهيز</span>
            </button>
          )}

          {currentBranch === 'prepared' && (
            <>
              <button
                type="button" disabled={isUpdatingStatus} onClick={() => onStatusChange('pending')}
                className="flex-1 py-1.5 px-3 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer border border-blue-200"
                title="إرجاع الطلب إلى قيد المراجعة"
              >
                <span>قيد المراجعة</span>
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => {
                  const hasDeliveryCost =
                    (draft?.deliveryCost != null && Number(draft.deliveryCost) > 0) ||
                    (order.delivery_dispatch?.deliveryCost != null && Number(order.delivery_dispatch.deliveryCost) > 0);

                  if (!hasDeliveryCost && onUpdateDraft) {
                    const fallbackZoneCost = getEstimatedZoneDeliveryCost(order.delivery_zone || 'north');
                    onUpdateDraft({
                      deliveryCost: fallbackZoneCost,
                      costCertainty: 'estimated',
                    });
                    if (onSaveDraft) {
                      onSaveDraft();
                    }
                  }
                  onStatusChange('delivered');
                }}
                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>تم التسليم</span>
              </button>
            </>
          )}

          {currentBranch === 'delivered' && (
            <>
              {onTogglePayment && (
                <button
                  type="button" onClick={onTogglePayment}
                  className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer border ${
                    order.is_paid ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-stone-100 text-stone-700 border-stone-300'
                  }`}
                  title={order.is_paid ? 'الطلب مسدد' : 'تأكيد استلام الدفع'}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{order.is_paid ? 'تم الدفع' : 'تأكيد الدفع'}</span>
                </button>
              )}

              {onToggleArchive && (
                <button
                  type="button" onClick={onToggleArchive}
                  className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer border ${
                    order.is_archived ? 'bg-stone-200 text-stone-900 border-stone-400' : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                  }`}
                  title={order.is_archived ? 'إلغاء الأرشفة' : 'نقل إلى الأرشيف'}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{order.is_archived ? 'مؤرشف' : 'أرشفة'}</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* الصف الثاني: أيقونات التحكم السفلية (نسخ، طباعة، حذف) */}
        <div className="flex items-center justify-between pt-1.5 border-t border-stone-100">
          <div className="flex items-center gap-1">
            <button type="button" onClick={onConfirmDelete} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="حذف الطلب">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={onCopyOrderText} className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer" title="نسخ تفاصيل الطلب">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button type="button" onClick={onOpenBordereau} className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer" title="معاينة البوردرو">
              <FileText className="w-4 h-4" />
            </button>
            <button type="button" onClick={onOpenInvoice} className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer" title="طباعة الفاتورة">
              <Printer className="w-4 h-4" />
            </button>
          </div>
          {/* رمز الطلب الصغير في الزاوية اليسرى لتوازن التصميم */}
          <span className="text-[10px] text-stone-400 font-mono tracking-wider font-semibold">{order.order_code}</span>
        </div>

      </div>
    </div>
  );
};