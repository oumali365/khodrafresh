// ============================================================
// modals.tsx - النوافذ المنبثقة للطلبات (الفاتورة، البوليصة، تأكيد الحذف)
// ============================================================

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { DbOrder } from './types';
import { OrderInvoiceModal as BaseInvoiceModal } from './OrderInvoiceModal';
import { OrderBordereauModal as BaseBordereauModal } from './OrderBordereauModal';

export { OrderInvoiceModal } from './OrderInvoiceModal';
export { OrderBordereauModal } from './OrderBordereauModal';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  order: DbOrder | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

/**
 * مودال تأكيد حذف الطلب
 */
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  order,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 text-center space-y-4 border border-stone-200 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-black text-base text-stone-900">حذف الطلب نهائياً؟</h4>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            هل أنت متأكد من حذف الطلب رقم <strong>{order.order_code}</strong> للعميل{' '}
            <strong>{order.customer_name}</strong>؟
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs cursor-pointer"
          >
            تراجع
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow-md disabled:opacity-50"
          >
            {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface InvoiceModalProps {
  order: DbOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  return <BaseInvoiceModal order={order} isOpen={isOpen} onClose={onClose} />;
};

export interface BordereauModalProps {
  order: DbOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BordereauModal: React.FC<BordereauModalProps> = ({ order, isOpen, onClose }) => {
  return <BaseBordereauModal order={order} isOpen={isOpen} onClose={onClose} />;
};
