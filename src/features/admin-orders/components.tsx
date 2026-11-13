// ============================================================
// components.tsx - فروع الطلبات الثلاثة وشريط الانتقالات وتعيين السائق
// ============================================================

import React, { useState } from 'react';
import { Package, Clock, CheckCircle2, Archive, Inbox, ChevronDown, ChevronUp, Save } from 'lucide-react';
import type { DbOrder, OrderStatus, DeliveryDispatchInfo, StoreDriver, FastAppCourier } from './types';
import { BRANCH_STYLES } from './constants';
import { OrderCard } from './cards';

/**
 * شريط تغيير حالة الطلب السريع
 */
export interface StatusTransitionBarProps {
  status: OrderStatus;
  isUpdatingStatus?: boolean;
  onStatusChange: (status: OrderStatus) => void;
}

export const StatusTransitionBar: React.FC<StatusTransitionBarProps> = ({
  status,
  isUpdatingStatus,
  onStatusChange,
}) => {
  return (
    <div className="pt-2 border-t border-stone-200">
      <div className="flex items-center gap-1.5 text-xs">
        {status !== 'pending' && (
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => onStatusChange('pending')}
            className="flex-1 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold transition-colors cursor-pointer text-center text-[11px]"
          >
            قيد المراجعة
          </button>
        )}
        {status !== 'prepared' && (
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => onStatusChange('prepared')}
            className="flex-1 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold transition-colors cursor-pointer text-center text-[11px]"
          >
            تم التجهيز 📦
          </button>
        )}
        {status !== 'delivered' && (
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => onStatusChange('delivered')}
            className="flex-1 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold transition-colors cursor-pointer text-center text-[11px]"
          >
            تم التسليم ✅
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * بطاقة تعيين السائق وتفاصيل التوصيل (الأكورديون)
 */
export interface DriverAssignmentCardProps {
  draft?: DeliveryDispatchInfo;
  onUpdateDraft?: (updates: Partial<DeliveryDispatchInfo>) => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  storeDrivers?: StoreDriver[];
  fastCouriers?: FastAppCourier[];
}

export const DriverAssignmentCard: React.FC<DriverAssignmentCardProps> = ({
  draft,
  onUpdateDraft,
  onSaveDraft,
  isSavingDraft,
  storeDrivers = [],
  fastCouriers = [],
}) => {
  const [showDriverAccordion, setShowDriverAccordion] = useState(true);

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setShowDriverAccordion((prev) => !prev)}
        className="w-full p-2.5 bg-stone-50 hover:bg-stone-100 flex items-center justify-between font-bold text-stone-800 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>بيانات سائقو المتجر والتوصيل</span>
          {draft?.driverName && (
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                draft.deliverySource === 'internal'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {draft.deliverySource === 'internal' ? 'فريق خُضرة' : (draft.appName || 'تطبيق خارجي')}: {draft.driverName}
            </span>
          )}
        </div>
        {showDriverAccordion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showDriverAccordion && draft && onUpdateDraft && (
        <div className="p-3 bg-white space-y-3 border-t border-stone-100">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-1">اسم السائق:</label>
              <input
                type="text"
                readOnly
                value={draft.driverName || ''}
                placeholder="تلقائي بعد اختيار السائق"
                className="w-full p-2 rounded-lg border border-stone-200 bg-stone-100 text-stone-900 font-bold text-xs cursor-default select-none focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-1">أجرة التوصيل (د.م):</label>
              <input
                type="text"
                readOnly
                value={
                  draft.deliveryCost != null && !isNaN(Number(draft.deliveryCost))
                    ? `${Number(draft.deliveryCost)} د.م`
                    : ''
                }
                placeholder="تُجلب تلقائيًا من ملف السائق"
                className={`w-full p-2 rounded-lg border font-bold text-xs cursor-default select-none focus:outline-none tabular-nums ${
                  draft.driverName && (draft.deliveryCost == null || isNaN(Number(draft.deliveryCost)))
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-stone-200 bg-stone-100 text-stone-900'
                }`}
              />
              {draft.driverName && (draft.deliveryCost == null || isNaN(Number(draft.deliveryCost))) && (
                <p className="text-[10px] text-red-600 font-bold mt-1">
                  ⚠️ لا توجد أجرة صالحة في ملف السائق
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-800 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>اختر سائقًا من أسطول خُضرة الداخلي:</span>
            </label>
            <select
              value={draft.deliverySource === 'internal' ? (draft.driverId || '') : ''}
              onChange={(e) => {
                const selId = e.target.value;
                if (!selId) {
                  if (draft.deliverySource === 'internal') {
                    onUpdateDraft({
                      deliverySource: undefined,
                      driverId: undefined,
                      internalDriverId: undefined,
                      driverName: '',
                      driverPhone: '',
                      deliveryCost: undefined,
                      agreedWage: undefined,
                      appName: undefined,
                    });
                  }
                  return;
                }
                const d = storeDrivers.find((drv) => drv.id === selId);
                if (d) {
                  onUpdateDraft({
                    deliverySource: 'internal',
                    driverId: d.id,
                    internalDriverId: d.id,
                    externalDriverId: undefined,
                    driverName: d.name,
                    driverPhone: d.phone,
                    deliveryCost: d.commissionPerOrder != null ? Number(d.commissionPerOrder) : undefined,
                    agreedWage: d.commissionPerOrder != null ? Number(d.commissionPerOrder) : undefined,
                    provider: 'custom',
                    appName: 'أسطول خُضرة الداخلي',
                  });
                }
              }}
              className="w-full p-2 rounded-lg border border-stone-300 text-stone-800 text-xs bg-white font-medium focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- اختر سائقاً --</option>
              {storeDrivers.map((drv) => {
                const statusText =
                  drv.status === 'available'
                    ? 'متاح'
                    : drv.status === 'on_delivery'
                    ? 'في جولة'
                    : 'خارج الخدمة';
                const fare = drv.commissionPerOrder != null ? `${drv.commissionPerOrder} د.م` : '';
                return (
                  <option key={drv.id} value={drv.id}>
                    {drv.name} ({statusText}{fare ? ` • ${fare}` : ''})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-800 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>سائق تطبيق سريع:</span>
            </label>
            <select
              value={draft.deliverySource === 'external_app' ? (draft.driverId || '') : ''}
              onChange={(e) => {
                const selId = e.target.value;
                if (!selId) {
                  if (draft.deliverySource === 'external_app') {
                    onUpdateDraft({
                      deliverySource: undefined,
                      driverId: undefined,
                      externalDriverId: undefined,
                      driverName: '',
                      driverPhone: '',
                      deliveryCost: undefined,
                      agreedWage: undefined,
                      appName: undefined,
                    });
                  }
                  return;
                }
                const c = fastCouriers.find((courier) => courier.id === selId);
                if (c) {
                  const appLabel =
                    c.app === 'glovo'
                      ? 'Glovo'
                      : c.app === 'indrive'
                      ? 'inDrive'
                      : c.app === 'yassir'
                      ? 'Yassir'
                      : c.app === 'careem'
                      ? 'Careem'
                      : (c.appNameCustom || 'تطبيق خارجي');
                  onUpdateDraft({
                    deliverySource: 'external_app',
                    driverId: c.id,
                    internalDriverId: undefined,
                    externalDriverId: c.id,
                    driverName: c.name,
                    driverPhone: c.phone,
                    deliveryCost: c.typicalFare != null ? Number(c.typicalFare) : undefined,
                    agreedWage: c.typicalFare != null ? Number(c.typicalFare) : undefined,
                    provider: (c.app as any) || 'indrive',
                    appName: appLabel,
                  });
                }
              }}
              className="w-full p-2 rounded-lg border border-stone-300 text-stone-800 text-xs bg-white font-medium focus:border-amber-600 focus:outline-none"
            >
              <option value="">-- اختر سائق تطبيق --</option>
              {fastCouriers.map((courier) => {
                const appLabel =
                  courier.app === 'glovo'
                    ? 'Glovo'
                    : courier.app === 'indrive'
                    ? 'inDrive'
                    : courier.app === 'yassir'
                    ? 'Yassir'
                    : courier.app === 'careem'
                    ? 'Careem'
                    : (courier.appNameCustom || 'تطبيق');
                return (
                  <option key={courier.id} value={courier.id}>
                    {courier.name} ({appLabel}{courier.typicalFare ? ` - ${courier.typicalFare} د.م` : ''})
                  </option>
                );
              })}
            </select>
          </div>

          {onSaveDraft && (
            <button
              type="button"
              disabled={isSavingDraft}
              onClick={onSaveDraft}
              className="w-full py-2 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingDraft ? 'جاري الحفظ...' : 'حفظ بيانات التوصيل'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export interface BranchColumnProps {
  orders: DbOrder[];
  dispatchDrafts?: Record<string, DeliveryDispatchInfo>;
  onUpdateDraft?: (orderId: string | number, updates: Partial<DeliveryDispatchInfo>) => void;
  onSaveDraft?: (order: DbOrder) => void;
  savingDispatchId?: string | number | null;
  storeDrivers?: StoreDriver[];
  fastCouriers?: FastAppCourier[];
  onShowMessage?: (type: 'success' | 'error', message: string) => void;
  onStatusChange: (orderId: string | number, status: OrderStatus) => void;
  updatingId?: string | number | null;
  onTogglePayment?: (orderId: string | number, currentPaid: boolean) => void;
  onToggleArchive?: (orderId: string | number, currentArchived: boolean) => void;
  onOpenInvoice: (order: DbOrder) => void;
  onOpenBordereau: (order: DbOrder) => void;
  onConfirmDelete: (order: DbOrder) => void;
  onCopyOrderText: (order: DbOrder) => void;
  copiedId?: string | number | null;
}

export const PendingBranch: React.FC<BranchColumnProps> = ({
  orders,
  onStatusChange,
  updatingId,
  onOpenInvoice,
  onOpenBordereau,
  onConfirmDelete,
  onCopyOrderText,
  copiedId,
}) => {
  const styles = BRANCH_STYLES.pending;
  return (
    <div className={`border-2 ${styles.border} ${styles.bg} rounded-2xl p-4 flex flex-col justify-between shadow-xs space-y-4`}>
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${styles.iconColor}`} />
            <h3 className="font-black text-sm text-stone-900">{styles.title}</h3>
          </div>
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${styles.badge}`}>{orders.length}</span>
        </div>
        {orders.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-500 bg-white/80 rounded-xl mt-3 border border-dashed border-stone-200">
            <Inbox className="w-6 h-6 mx-auto mb-1 text-stone-400" />
            <p className="font-bold text-stone-700">لا توجد طلبات جديدة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                currentBranch="pending"
                onStatusChange={(status) => onStatusChange(order.id, status)}
                isUpdatingStatus={updatingId === order.id}
                onOpenInvoice={() => onOpenInvoice(order)}
                onOpenBordereau={() => onOpenBordereau(order)}
                onConfirmDelete={() => onConfirmDelete(order)}
                onCopyOrderText={() => onCopyOrderText(order)}
                copied={copiedId === order.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const PreparedBranch: React.FC<BranchColumnProps> = ({
  orders,
  dispatchDrafts = {},
  onUpdateDraft,
  onSaveDraft,
  savingDispatchId,
  storeDrivers = [],
  fastCouriers = [],
  onShowMessage,
  onStatusChange,
  updatingId,
  onOpenInvoice,
  onOpenBordereau,
  onConfirmDelete,
  onCopyOrderText,
  copiedId,
}) => {
  const styles = BRANCH_STYLES.prepared;
  return (
    <div className={`border-2 ${styles.border} ${styles.bg} rounded-2xl p-4 flex flex-col justify-between shadow-xs space-y-4`}>
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Package className={`w-5 h-5 ${styles.iconColor}`} />
            <h3 className="font-black text-sm text-stone-900">{styles.title}</h3>
          </div>
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${styles.badge}`}>{orders.length}</span>
        </div>
        {orders.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-500 bg-white/80 rounded-xl mt-3 border border-dashed border-stone-200">
            <Inbox className="w-6 h-6 mx-auto mb-1 text-stone-400" />
            <p className="font-bold text-stone-700">لا توجد طلبات قيد التجهيز</p>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                currentBranch="prepared"
                draft={dispatchDrafts[String(order.id)]}
                onUpdateDraft={(updates) => onUpdateDraft?.(order.id, updates)}
                onSaveDraft={() => onSaveDraft?.(order)}
                isSavingDraft={savingDispatchId === order.id}
                storeDrivers={storeDrivers}
                fastCouriers={fastCouriers}
                onShowMessage={onShowMessage}
                onStatusChange={(status) => onStatusChange(order.id, status)}
                isUpdatingStatus={updatingId === order.id}
                onOpenInvoice={() => onOpenInvoice(order)}
                onOpenBordereau={() => onOpenBordereau(order)}
                onConfirmDelete={() => onConfirmDelete(order)}
                onCopyOrderText={() => onCopyOrderText(order)}
                copied={copiedId === order.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export interface DeliveredBranchProps extends BranchColumnProps {
  showArchived: boolean;
  onToggleShowArchived: () => void;
  archivedCount: number;
}

export const DeliveredBranch: React.FC<DeliveredBranchProps> = ({
  orders,
  showArchived,
  onToggleShowArchived,
  archivedCount,
  onStatusChange,
  updatingId,
  onTogglePayment,
  onToggleArchive,
  onOpenInvoice,
  onOpenBordereau,
  onConfirmDelete,
  onCopyOrderText,
  copiedId,
}) => {
  const styles = BRANCH_STYLES.delivered;
  return (
    <div className={`border-2 ${styles.border} ${styles.bg} rounded-2xl p-4 flex flex-col justify-between shadow-xs space-y-4`}>
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-5 h-5 ${styles.iconColor}`} />
            <h3 className="font-black text-sm text-stone-900">{styles.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleShowArchived}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                showArchived
                  ? 'bg-stone-800 text-white border-stone-900'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
              }`}
            >
              <Archive className="w-3 h-3" />
              <span>الأرشيف ({archivedCount})</span>
            </button>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${styles.badge}`}>{orders.length}</span>
          </div>
        </div>
        {orders.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-500 bg-white/80 rounded-xl mt-3 border border-dashed border-stone-200">
            <Inbox className="w-6 h-6 mx-auto mb-1 text-stone-400" />
            <p className="font-bold text-stone-700">لا توجد طلبات مسلّمة في العرض الحالي</p>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                currentBranch="delivered"
                onStatusChange={(status) => onStatusChange(order.id, status)}
                isUpdatingStatus={updatingId === order.id}
                onTogglePayment={() => onTogglePayment?.(order.id, Boolean(order.is_paid))}
                onToggleArchive={() => onToggleArchive?.(order.id, Boolean(order.is_archived))}
                onOpenInvoice={() => onOpenInvoice(order)}
                onOpenBordereau={() => onOpenBordereau(order)}
                onConfirmDelete={() => onConfirmDelete(order)}
                onCopyOrderText={() => onCopyOrderText(order)}
                copied={copiedId === order.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
