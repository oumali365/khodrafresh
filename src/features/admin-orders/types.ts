// ============================================================
// types.ts - أنواع بيانات إدارة الطلبات والفروع
// ============================================================

import type {
  DeliveryProvider,
  DeliveryDispatchStatus,
  DeliveryDispatchInfo,
  DeliverySource,
  FezZoneId,
  StoreDriver,
  FastAppCourier,
} from '../../types';
import type { DbOrder, OrderStatus } from '../../services/supabaseService';

export type {
  DeliveryProvider,
  DeliveryDispatchStatus,
  DeliveryDispatchInfo,
  DeliverySource,
  FezZoneId,
  StoreDriver,
  FastAppCourier,
  DbOrder,
  OrderStatus,
};

export interface OrderRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export interface AdminOrdersPanelProps {
  isOpen?: boolean;
  standalone?: boolean;
  onClose?: () => void;
  onOrdersChange?: (counts: { total: number; pending: number }) => void;
}

export interface BranchStyleConfig {
  border: string;
  bg: string;
  headerBg: string;
  title: string;
  badge: string;
  iconColor: string;
}

export interface StatusLabelConfig {
  label: string;
  badge: string;
  dot: string;
}
