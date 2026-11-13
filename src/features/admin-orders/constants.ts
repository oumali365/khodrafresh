// ============================================================
// constants.ts - تكوينات وثوابت إدارة الطلبات
// ============================================================

import type { OrderStatus, DeliveryDispatchInfo, BranchStyleConfig, StatusLabelConfig } from './types';

export const STORAGE_KEY_PAID = 'khodra_paid_orders';
export const STORAGE_KEY_ARCHIVED = 'khodra_archived_orders';

export const BRANCH_STYLES: Record<'pending' | 'prepared' | 'delivered', BranchStyleConfig> = {
  pending: {
    border: 'border-blue-200',
    bg: 'bg-blue-50/40',
    headerBg: 'bg-gradient-to-l from-blue-700 to-blue-900',
    title: 'قسم المراجعة والطلبات الجديدة',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    iconColor: 'text-blue-600',
  },
  prepared: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/40',
    headerBg: 'bg-gradient-to-l from-amber-600 to-amber-800',
    title: 'قسم التجهيز والطلبات الجاهزة',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    iconColor: 'text-amber-600',
  },
  delivered: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/40',
    headerBg: 'bg-gradient-to-l from-emerald-700 to-emerald-900',
    title: 'قسم التسليم والطلبات المكتملة',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    iconColor: 'text-emerald-600',
  },
};

export const STATUS_LABELS: Record<OrderStatus, StatusLabelConfig> = {
  pending: {
    label: 'قيد المراجعة',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    dot: 'bg-blue-500',
  },
  prepared: {
    label: 'تم التجهيز',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    dot: 'bg-amber-500',
  },
  delivered: {
    label: 'تم التسليم',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'ملغي',
    badge: 'bg-red-100 text-red-900 border-red-300',
    dot: 'bg-red-500',
  },
};

export const DEFAULT_DISPATCH: DeliveryDispatchInfo = {
  provider: 'custom',
  driverName: '',
  driverPhone: '',
  deliveryCost: 20,
  trackingCode: '',
  dispatchStatus: 'waiting_driver',
  zone: 'north',
  notes: '',
};
