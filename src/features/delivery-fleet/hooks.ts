// ============================================================
// hooks.ts - خطافات حالة أسطول السائقين والجولات الذكية
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  StoreDriver,
  FastAppCourier,
  DriverStatus,
  DbOrder,
  ZoneGroups,
  FleetStats,
  DriverFormData,
  FastCourierFormData,
} from './types';
import {
  fetchStoreDrivers,
  saveStoreDrivers,
  addStoreDriver,
  updateStoreDriver,
  deleteStoreDriver,
  fetchFastCouriers,
  saveFastCourier,
  deleteFastCourier,
} from '../../services/supabaseService';
import { logger } from '../../utils/logger';

/**
 * خطاف إدارة سائقي الفريق الداخلي ومزامنتهم
 */
export function useDrivers() {
  const [drivers, setDrivers] = useState<StoreDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchStoreDrivers();
      setDrivers(res.drivers);
      setIsSynced(res.synced);
    } catch (err) {
      logger.error('Failed to load store drivers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDrivers();
  }, [refreshDrivers]);

  const syncDrivers = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await saveStoreDrivers(drivers);
      setIsSynced(res.synced);
      return res;
    } catch (err) {
      logger.error('Failed to manually sync drivers:', err);
      return { success: false, synced: false, message: 'فشلت المزامنة' };
    } finally {
      setIsSyncing(false);
    }
  }, [drivers]);

  const addDriverHandler = useCallback(
    async (formData: DriverFormData) => {
      const res = await addStoreDriver(formData);
      if (res.success && res.driver) {
        setDrivers((prev) => [res.driver, ...prev]);
        setIsSynced(res.synced);
      }
      return res;
    },
    []
  );

  const updateDriverHandler = useCallback(
    async (driverId: string, formData: Partial<StoreDriver>) => {
      const res = await updateStoreDriver(driverId, formData);
      if (res.success && res.driver) {
        setDrivers((prev) => prev.map((d) => (d.id === driverId ? res.driver! : d)));
        setIsSynced(res.synced);
      }
      return res;
    },
    []
  );

  const deleteDriverHandler = useCallback(async (driverId: string) => {
    const res = await deleteStoreDriver(driverId);
    if (res.success) {
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
      setIsSynced(res.synced);
    }
    return res;
  }, []);

  const toggleStatus = useCallback(
    async (driver: StoreDriver, newStatus: DriverStatus) => {
      const res = await updateStoreDriver(driver.id, { status: newStatus });
      if (res.success) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === driver.id ? { ...d, status: newStatus } : d))
        );
      }
      return res;
    },
    []
  );

  return {
    drivers,
    setDrivers,
    isLoading,
    isSynced,
    isSyncing,
    addDriver: addDriverHandler,
    updateDriver: updateDriverHandler,
    deleteDriver: deleteDriverHandler,
    toggleStatus,
    syncDrivers,
    refreshDrivers,
  };
}

/**
 * خطاف إدارة كباتن تطبيقات التوصيل السريع مع Supabase
 */
export function useFastCouriers() {
  const [couriers, setCouriers] = useState<FastAppCourier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCouriers = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchFastCouriers();
      setCouriers(list);
    } catch (err) {
      logger.error('Failed to load fast couriers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCouriers();
  }, [refreshCouriers]);

  const addCourierHandler = useCallback(
    async (formData: FastCourierFormData) => {
      const res = await saveFastCourier(formData);
      if (res.success && res.courier) {
        setCouriers((prev) => [res.courier!, ...prev.filter((c) => c.id !== res.courier!.id)]);
      }
      return res;
    },
    []
  );

  const updateCourierHandler = useCallback(
    async (courierId: string, formData: Partial<FastAppCourier>) => {
      const res = await saveFastCourier({ ...formData, id: courierId });
      if (res.success && res.courier) {
        setCouriers((prev) => prev.map((c) => (c.id === courierId ? res.courier! : c)));
      }
      return res;
    },
    []
  );

  const deleteCourierHandler = useCallback(async (courierId: string) => {
    const res = await deleteFastCourier(courierId);
    if (res.success) {
      setCouriers((prev) => prev.filter((c) => c.id !== courierId));
    }
    return res;
  }, []);

  return {
    couriers,
    setCouriers,
    isLoading,
    addCourier: addCourierHandler,
    updateCourier: updateCourierHandler,
    deleteCourier: deleteCourierHandler,
    refreshCouriers,
  };
}

/**
 * تجميع الطلبات حسب مناطق فاس الـ 4 مع دعم تصفية الجولات النشطة
 */
export function useZoneGroups(
  orders: DbOrder[],
  filterMode: 'active' | 'all' | 'prepared' | 'delivered' = 'active'
): ZoneGroups {
  return useMemo(() => {
    const filtered = orders.filter((o) => {
      if (o.status === 'cancelled') return false;
      if (filterMode === 'active') {
        // الطلبات النشطة الجارية للتسليم فقط (غير المؤرشفة والتي لم تكتمل بعد)
        return (o.status === 'prepared' || o.status === 'pending') && !o.is_archived;
      }
      if (filterMode === 'prepared') {
        return o.status === 'prepared';
      }
      if (filterMode === 'delivered') {
        return o.status === 'delivered';
      }
      return true;
    });

    return {
      east: filtered.filter(
        (o) => (o.delivery_zone || o.delivery_dispatch?.zone) === 'east'
      ),
      central: filtered.filter(
        (o) => (o.delivery_zone || o.delivery_dispatch?.zone) === 'central'
      ),
      south: filtered.filter(
        (o) => (o.delivery_zone || o.delivery_dispatch?.zone) === 'south'
      ),
      north: filtered.filter(
        (o) => (o.delivery_zone || o.delivery_dispatch?.zone || 'north') === 'north'
      ),
    };
  }, [orders, filterMode]);
}

/**
 * حساب المؤشرات الرئيسية لأسطول التوصيل (KPIs)
 */
export function useFleetStats(orders: DbOrder[]): FleetStats {
  return useMemo(() => {
    const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
    const activeTrips = orders.filter((o) => o.status === 'pending' || o.status === 'prepared').length;
    const deliveredTrips = orders.filter((o) => o.status === 'delivered').length;

    const totalDriverCost = nonCancelled.reduce(
      (sum, o) =>
        sum +
        (o.actual_delivery_cost ??
          o.delivery_cost ??
          o.driver_cost ??
          o.delivery_dispatch?.deliveryCost ??
          o.driver_wage ??
          25),
      0
    );
    const totalDeliveryRevenue = nonCancelled.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
    const netDeliveryProfit = totalDeliveryRevenue - totalDriverCost;

    return {
      totalTrips: nonCancelled.length,
      activeTrips,
      deliveredTrips,
      targetTime: '20 - 40 دقيقة',
      totalDriverCost,
      totalDeliveryRevenue,
      netDeliveryProfit,
    };
  }, [orders]);
}
