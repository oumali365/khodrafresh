// ============================================================
// types.ts - الأنواع المخصصة لإدارة أسطول التوصيل والمسارات الذكية
// ============================================================

import type {
  StoreDriver,
  FastAppCourier,
  FezZoneId,
  DriverVehicleType,
  DriverStatus,
  FastDeliveryApp,
  DeliveryProvider,
} from '../../types';
import type { DbOrder } from '../../services/supabaseService';
import type { FezZoneConfig } from '../../data/deliveryZones';

// إعادة تصدير الأنواع المستخدمة لسهولة الوصول
export type {
  StoreDriver,
  FastAppCourier,
  FezZoneId,
  DriverVehicleType,
  DriverStatus,
  FastDeliveryApp,
  DeliveryProvider,
  DbOrder,
  FezZoneConfig,
};

export interface DriverFormData {
  name: string;
  phone: string;
  vehicleType: DriverVehicleType;
  zonePreference: FezZoneId | 'all';
  status: DriverStatus;
  commissionPerOrder: number;
  vehiclePlate?: string;
  address?: string;
  notes?: string;
}

export interface FastCourierFormData {
  name: string;
  app: FastDeliveryApp;
  appNameCustom?: string;
  phone: string;
  vehicleType: DriverVehicleType;
  zone: FezZoneId | 'all';
  typicalFare: number;
  notes?: string;
}

export interface ZoneStyle {
  border: string;
  bg: string;
  badge: string;
  headerBg: string;
  accentText: string;
  tagColor: string;
}

export interface FleetStats {
  totalTrips: number;
  activeTrips: number;
  deliveredTrips: number;
  targetTime: string;
  totalDriverCost: number;
  totalDeliveryRevenue: number;
  netDeliveryProfit: number;
}

export type ZoneGroups = Record<FezZoneId, DbOrder[]>;

export interface SortedDriver {
  driver: StoreDriver;
  isPreferred: boolean;
  isDisabled: boolean;
  disabledReason?: string;
}

export interface SortedFastCourier {
  courier: FastAppCourier;
  isPreferred: boolean;
  appBadgeLabel: string;
}

export interface ZoneCODCalculation {
  totalCOD: number;
  totalDeliveryFees: number;
  totalSubtotal: number;
  ordersCount: number;
  orders: DbOrder[];
  unpaidOrdersCount?: number;
  paidOrdersCount?: number;
}

export interface AdminDeliveryFleetTabProps {
  orders?: DbOrder[];
  onSelectOrderForBordereau?: (order: DbOrder) => void;
  onOpenOrderInvoice?: (order: DbOrder) => void;
  showToast?: (type: 'success' | 'error', message: string) => void;
  onRefreshOrders?: () => void;
  standalone?: boolean;
}
