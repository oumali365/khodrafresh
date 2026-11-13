// ============================================================
// AdminOrdersPanel.tsx - منسّق لوحة إدارة الطلبات والفروع (< 250 سطر)
// ============================================================

import React, { useState, useCallback } from 'react';
import { Search, RefreshCw, X, ShoppingBag, CheckCircle2 } from 'lucide-react';
import type { AdminOrdersPanelProps, DbOrder, OrderStatus } from './types';
import { useOrders, useOrderActions, useDispatchDrafts, useOrdersFilter } from './hooks';
import { PendingBranch, PreparedBranch, DeliveredBranch } from './components';
import { InvoiceModal, BordereauModal, DeleteConfirmModal } from './modals';
import { buildOrderText } from './utils';

export const AdminOrdersPanel: React.FC<AdminOrdersPanelProps> = ({
  isOpen = false,
  standalone = false,
  onClose,
  onOrdersChange,
}) => {
  const { orders, setOrders, isRefreshing, refreshOrders } = useOrders(onOrdersChange);
  const { updatingId, changeStatus, togglePayment, toggleArchive, removeOrder } =
    useOrderActions(setOrders);
  const {
    dispatchDrafts,
    updateDraft,
    saveDraft,
    savingDispatchId,
    storeDrivers,
    fastCouriers,
  } = useDispatchDrafts(orders);

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [mobileBranchView, setMobileBranchView] = useState<'all' | 'pending' | 'prepared' | 'delivered'>('all');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<DbOrder | null>(null);
  const [bordereauOrder, setBordereauOrder] = useState<DbOrder | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<DbOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { pendingOrders, preparedOrders, deliveredOrders, archivedOrders, totalCount } =
    useOrdersFilter(orders, searchQuery, showArchived);

  const handleCopyOrderText = useCallback(
    async (order: DbOrder) => {
      try {
        await navigator.clipboard.writeText(buildOrderText(order));
        setCopiedId(order.id);
        showToast('success', 'تم نسخ تفاصيل الطلب بنجاح');
        setTimeout(() => setCopiedId(null), 2500);
      } catch {
        showToast('error', 'تعذر النسخ');
      }
    },
    [showToast]
  );

  const handleConfirmDelete = async () => {
    if (!deleteConfirmOrder) return;
    setIsDeleting(true);
    try {
      const res = await removeOrder(deleteConfirmOrder.id);
      showToast(res.success ? 'success' : 'error', res.success ? `تم حذف الطلب` : (res.message || 'فشل الحذف'));
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOrder(null);
    }
  };

  const commonBranchProps = {
    onStatusChange: async (id: string | number, s: OrderStatus) => {
      const res = await changeStatus(id, s);
      if (res.success) {
        showToast('success', 'تم نقل الطلب وحفظ الحالة بنجاح');
      } else {
        showToast('error', res.message || 'تعذر حفظ حالة الطلب، تم استرجاع الحالة السابقة');
      }
    },
    updatingId,
    onOpenInvoice: (o: DbOrder) => setInvoiceOrder(o),
    onOpenBordereau: (o: DbOrder) => setBordereauOrder(o),
    onConfirmDelete: (o: DbOrder) => setDeleteConfirmOrder(o),
    onCopyOrderText: handleCopyOrderText,
    copiedId,
  };

  if (!isOpen && !standalone) return null;

  return (
    <div className={`space-y-4 text-right ${standalone ? 'p-2 sm:p-4 max-w-7xl mx-auto' : ''}`}>
      {/* 1. الترويسة وأدوات التحكم */}
      <div className="bg-white border-2 border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900">إدارة ومعالجة الطلبات</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {totalCount} طلبات
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                فروع العمل الثلاثة (المراجعة والتجهيز والتسليم والأرشيف) • مزامنة سحابية فورية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshOrders}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-700' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
            {!standalone && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الطلب، اسم الزبون، الهاتف، أو الحي..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-900 focus:outline-emerald-600 bg-stone-50/50"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          </div>

          <div className="flex sm:hidden items-center gap-1 bg-stone-100 p-1 rounded-xl text-[11px] font-bold">
            {(['all', 'pending', 'prepared', 'delivered'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setMobileBranchView(view)}
                className={`flex-1 py-1 rounded-lg ${
                  mobileBranchView === view ? 'bg-emerald-700 text-white font-black' : ''
                }`}
              >
                {view === 'all' ? 'الكل' : view === 'pending' ? 'مراجعة' : view === 'prepared' ? 'تجهيز' : 'مسلّم'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. شبكة الفروع الثلاثة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(mobileBranchView === 'all' || mobileBranchView === 'pending') && (
          <PendingBranch orders={pendingOrders} {...commonBranchProps} />
        )}

        {(mobileBranchView === 'all' || mobileBranchView === 'prepared') && (
          <PreparedBranch
            orders={preparedOrders}
            dispatchDrafts={dispatchDrafts}
            onUpdateDraft={updateDraft}
            onSaveDraft={async (o) => {
              const res = await saveDraft(o);
              showToast(res.success ? 'success' : 'error', res.message || 'تم حفظ بيانات التوصيل');
            }}
            savingDispatchId={savingDispatchId}
            storeDrivers={storeDrivers}
            fastCouriers={fastCouriers}
            onShowMessage={showToast}
            {...commonBranchProps}
          />
        )}

        {(mobileBranchView === 'all' || mobileBranchView === 'delivered') && (
          <DeliveredBranch
            orders={deliveredOrders}
            showArchived={showArchived}
            onToggleShowArchived={() => setShowArchived((prev) => !prev)}
            archivedCount={archivedOrders.length}
            onTogglePayment={async (id, p) => {
              const res = await togglePayment(id, p);
              showToast(res.success ? 'success' : 'error', res.message || 'تم تحديث حالة الدفع');
            }}
            onToggleArchive={async (id, a) => {
              const res = await toggleArchive(id, a);
              showToast(res.success ? 'success' : 'error', res.message || 'تم تحديث الأرشفة');
            }}
            {...commonBranchProps}
          />
        )}
      </div>

      <InvoiceModal isOpen={Boolean(invoiceOrder)} order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      <BordereauModal isOpen={Boolean(bordereauOrder)} order={bordereauOrder} onClose={() => setBordereauOrder(null)} />
      <DeleteConfirmModal
        isOpen={Boolean(deleteConfirmOrder)}
        order={deleteConfirmOrder}
        isDeleting={isDeleting}
        onClose={() => setDeleteConfirmOrder(null)}
        onConfirm={handleConfirmDelete}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 py-2 px-4 rounded-xl text-xs font-black shadow-xl bg-stone-900 text-white flex items-center gap-1.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
