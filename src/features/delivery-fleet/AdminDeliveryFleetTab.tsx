// ============================================================
// AdminDeliveryFleetTab.tsx - منسّق أسطول التوصيل والجولات الذكية (< 250 سطر)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import type {
  AdminDeliveryFleetTabProps,
  FezZoneId,
  StoreDriver,
  FastAppCourier,
  DbOrder,
  DriverFormData,
  FastCourierFormData,
} from './types';
import { useDrivers, useFastCouriers, useZoneGroups, useFleetStats } from './hooks';
import {
  FleetKPIs,
  ZoneGrid,
  InternalDriversGrid,
  FastCouriersGrid,
  ProviderCards,
} from './components';
import { FleetModals } from './modals';
import {
  closeAndDeliverZoneTour,
  batchAssignZoneOrders,
  fetchOrders,
  subscribeToOrdersChanges,
  unsubscribeFromOrdersChanges,
} from '../../services/supabaseService';
import {
  cleanPhoneForWhatsApp,
  buildDriverWhatsAppMessage,
  generateGoogleMapsMultiStopUrl,
} from './utils';
import { FEZ_DELIVERY_ZONES } from '../../data/deliveryZones';
import { closeOrderFinancialsUnified } from '../../services/storeOperationsCore';

export const AdminDeliveryFleetTab: React.FC<AdminDeliveryFleetTabProps> = ({
  orders,
  showToast,
  onRefreshOrders,
}) => {
  const [internalOrders, setInternalOrders] = useState<DbOrder[]>([]);
  const effectiveOrders = orders && orders.length > 0 ? orders : internalOrders;
  const [localToast, setLocalToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      if (showToast) {
        showToast(type, message);
      } else {
        setLocalToast({ type, message });
        setTimeout(() => setLocalToast(null), 3500);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (orders && orders.length > 0) return;
    let mounted = true;
    fetchOrders().then((d) => mounted && setInternalOrders(d)).catch(() => {});
    const ch = subscribeToOrdersChanges(() => {
      fetchOrders().then((d) => mounted && setInternalOrders(d)).catch(() => {});
    });
    return () => {
      mounted = false;
      if (ch) unsubscribeFromOrdersChanges(ch);
    };
  }, [orders]);

  const {
    drivers,
    isLoading: isDriversLoading,
    isSynced: isDriversSynced,
    isSyncing,
    addDriver,
    updateDriver,
    deleteDriver,
    toggleStatus,
    syncDrivers,
  } = useDrivers();

  const {
    couriers,
    isLoading: isCouriersLoading,
    addCourier,
    updateCourier,
    deleteCourier,
  } = useFastCouriers();

  const [tourFilterMode, setTourFilterMode] = useState<'active' | 'all' | 'prepared' | 'delivered'>('active');
  const zoneGroups = useZoneGroups(effectiveOrders, tourFilterMode);
  const fleetStats = useFleetStats(effectiveOrders);

  const [selectedDriverForZone, setSelectedDriverForZone] = useState<Record<FezZoneId, string>>({
    east: '', central: '', south: '', north: '',
  });

  // مزامنة السائق المختار تلقائياً لكل منطقة استناداً إلى الطلبات المسندة في Supabase
  useEffect(() => {
    setSelectedDriverForZone((prev) => {
      const next = { ...prev };
      let changed = false;
      (['east', 'central', 'south', 'north'] as FezZoneId[]).forEach((zKey) => {
        if (!next[zKey]) {
          const zOrders = zoneGroups[zKey] || [];
          const assignedOrder = zOrders.find((o) => o.delivery_dispatch?.driverId || o.driver_id);
          const foundId = assignedOrder?.delivery_dispatch?.driverId || assignedOrder?.driver_id;
          if (foundId && (drivers.some((d) => d.id === foundId) || couriers.some((c) => c.id === foundId))) {
            next[zKey] = foundId;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [zoneGroups, drivers, couriers]);

  const [codZone, setCodZone] = useState<FezZoneId | null>(null);
  const [copyZone, setCopyZone] = useState<FezZoneId | null>(null);
  const [closeZone, setCloseZone] = useState<FezZoneId | null>(null);
  const [manifestZone, setManifestZone] = useState<FezZoneId | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [isClosingTour, setIsClosingTour] = useState(false);
  const [isAssigningZone, setIsAssigningZone] = useState<FezZoneId | null>(null);

  const [driverModal, setDriverModal] = useState<{
    isOpen: boolean; variant: 'internal' | 'fast'; data: StoreDriver | FastAppCourier | null;
  }>({ isOpen: false, variant: 'internal', data: null });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean; type: 'driver' | 'courier' | 'tour'; target: StoreDriver | FastAppCourier | null;
  }>({ isOpen: false, type: 'driver', target: null });

  const [activeSection, setActiveSection] = useState<'all' | 'zones' | 'drivers' | 'fast_couriers' | 'providers'>('all');

  const handleAssignDriverToTour = async (zoneKey: FezZoneId, driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId) || couriers.find((c) => c.id === driverId);
    if (!driver) return triggerToast('error', 'يرجى اختيار سائق من الفريق الداخلي أو كابتن من التطبيقات أولاً');
    const zOrders = zoneGroups[zoneKey] || [];
    if (zOrders.length === 0) return triggerToast('error', 'لا توجد طلبات نشطة في هذه المنطقة للاعتماد');

    setIsAssigningZone(zoneKey);
    try {
      const res = await batchAssignZoneOrders({
        orders: zOrders,
        driver,
        newStatus: 'prepared',
      });
      triggerToast(res.success ? 'success' : 'error', res.message || 'تم اعتماد الجولة');
      if (res.success) {
        fetchOrders().then((d) => setInternalOrders(d)).catch(() => {});
        onRefreshOrders?.();
      }
    } catch (err: any) {
      triggerToast('error', err?.message || 'تعذر اعتماد الجولة وتعيين السائق');
    } finally {
      setIsAssigningZone(null);
    }
  };

  const handleSendWhatsApp = (zoneKey: FezZoneId) => {
    const assignedPerson =
      drivers.find((d) => d.id === selectedDriverForZone[zoneKey]) ||
      couriers.find((c) => c.id === selectedDriverForZone[zoneKey]);
    const zOrders = zoneGroups[zoneKey];
    if (zOrders.length === 0) return triggerToast('error', 'لا توجد طلبات في هذه المنطقة');
    const msg = buildDriverWhatsAppMessage(zoneKey, zOrders, assignedPerson, FEZ_DELIVERY_ZONES[zoneKey]);
    const phone = assignedPerson ? cleanPhoneForWhatsApp(assignedPerson.phone) : '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    triggerToast('success', `تم فتح واتساب لإرسال الجولة إلى ${assignedPerson?.name || 'المندوب'}`);
  };

  const handleOpenGoogleMaps = (zoneKey: FezZoneId) => {
    const zOrders = zoneGroups[zoneKey];
    if (zOrders.length === 0) return triggerToast('error', 'لا توجد طلبات لتوليد المسار');
    window.open(generateGoogleMapsMultiStopUrl(zOrders), '_blank');
    triggerToast('success', `تم فتح مسار خرائط Google (${zOrders.length} محطات)`);
  };

  const handleConfirmCloseTour = async () => {
    if (!closeZone) return;
    const zOrders = zoneGroups[closeZone];
    const driver =
      drivers.find((d) => d.id === selectedDriverForZone[closeZone]) ||
      couriers.find((c) => c.id === selectedDriverForZone[closeZone]) ||
      null;
    setIsClosingTour(true);
    try {
      const res = await closeAndDeliverZoneTour({ orders: zOrders, driver, zoneKey: closeZone });
      triggerToast(res.success ? 'success' : 'error', res.message || 'تم إغلاق الجولة');
      if (res.success) {
        // إقفال مالي للمرحلة 5 وتثبيت الأرباح المحصنة لكل طلب في الجولة
        for (const ord of zOrders) {
          try {
            await closeOrderFinancialsUnified(ord, driver ? `تسليم المندوب ${driver.name}` : 'إغلاق جولة التوصيل');
          } catch {
            /* ignore individual closing errors */
          }
        }
        fetchOrders().then((d) => setInternalOrders(d)).catch(() => {});
        onRefreshOrders?.();
      }
    } finally {
      setIsClosingTour(false);
      setCloseZone(null);
    }
  };

  const handleCopy = async (text: string, templateKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplate(templateKey);
      triggerToast('success', 'تم النسخ بنجاح');
      setTimeout(() => setCopiedTemplate(null), 2500);
    } catch {
      triggerToast('error', 'تعذر النسخ');
    }
  };

  const handleDriverSubmit = async (data: DriverFormData | FastCourierFormData) => {
    if (driverModal.variant === 'internal') {
      if (driverModal.data) {
        await updateDriver((driverModal.data as StoreDriver).id, data as Partial<StoreDriver>);
        triggerToast('success', 'تم تعديل بيانات السائق بنجاح');
      } else {
        await addDriver(data as DriverFormData);
        triggerToast('success', 'تمت إضافة السائق بنجاح');
      }
    } else {
      if (driverModal.data) {
        await updateCourier((driverModal.data as FastAppCourier).id, data as Partial<FastAppCourier>);
        triggerToast('success', 'تم تعديل بيانات الكابتن بنجاح');
      } else {
        await addCourier(data as FastCourierFormData);
        triggerToast('success', 'تمت إضافة كابتن التطبيق بنجاح');
      }
    }
    setDriverModal({ isOpen: false, variant: 'internal', data: null });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.target) return;
    if (deleteModal.type === 'driver') {
      await deleteDriver(deleteModal.target.id);
      triggerToast('success', `تم حذف السائق ${deleteModal.target.name}`);
    } else {
      await deleteCourier(deleteModal.target.id);
      triggerToast('success', `تم حذف الكابتن ${deleteModal.target.name}`);
    }
    setDeleteModal({ isOpen: false, type: 'driver', target: null });
  };

  const navItems = [
    { id: 'all', label: 'الكل' },
    { id: 'zones', label: `المناطق (${fleetStats.activeTrips})` },
    { id: 'drivers', label: `سائقو المتجر (${drivers.length})` },
    { id: 'fast_couriers', label: `كباتن التطبيقات (${couriers.length})` },
    { id: 'providers', label: 'تطبيقات التوصيل' },
  ] as const;

  return (
    <div className="space-y-4 sm:space-y-5 text-right">
      <FleetKPIs stats={fleetStats} />

      {/* شريط تبديل أقسام أداة التوصيل للوضوح والتركيز */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-1.5 rounded-xl border border-stone-200/90 shadow-2xs">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeSection === item.id
                ? 'bg-[#163920] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {(activeSection === 'all' || activeSection === 'zones') && (
        <ZoneGrid
          ordersByZone={zoneGroups}
          drivers={drivers}
          fastCouriers={couriers}
          selectedDrivers={selectedDriverForZone}
          onSelectDriver={(z, id) => setSelectedDriverForZone((prev) => ({ ...prev, [z]: id }))}
          onAssignDriverToTour={handleAssignDriverToTour}
          assigningZone={isAssigningZone}
          filterMode={tourFilterMode}
          onFilterModeChange={setTourFilterMode}
          onViewCOD={(z) => setCodZone(z)}
          onSendWhatsApp={handleSendWhatsApp}
          onOpenGoogleMaps={handleOpenGoogleMaps}
          onCloseTour={(z) => setCloseZone(z)}
          onOpenManifest={(z) => setManifestZone(z)}
          onOpenCopyTemplates={(z) => setCopyZone(z)}
        />
      )}

      {(activeSection === 'all' || activeSection === 'drivers') && (
        <InternalDriversGrid
          drivers={drivers}
          isLoading={isDriversLoading}
          isSynced={isDriversSynced}
          isSyncing={isSyncing}
          onSync={async () => {
            const res = await syncDrivers();
            triggerToast(res.synced ? 'success' : 'error', res.message || 'تمت المزامنة');
          }}
          onAdd={() => setDriverModal({ isOpen: true, variant: 'internal', data: null })}
          onEdit={(d) => setDriverModal({ isOpen: true, variant: 'internal', data: d })}
          onDelete={(d) => setDeleteModal({ isOpen: true, type: 'driver', target: d })}
          onStatusChange={async (d, s) => {
            await toggleStatus(d, s);
            triggerToast('success', `تم تحديث حالة ${d.name}`);
          }}
        />
      )}

      {(activeSection === 'all' || activeSection === 'fast_couriers') && (
        <FastCouriersGrid
          couriers={couriers}
          isLoading={isCouriersLoading}
          onAdd={() => setDriverModal({ isOpen: true, variant: 'fast', data: null })}
          onEdit={(c) => setDriverModal({ isOpen: true, variant: 'fast', data: c })}
          onDelete={(c) => setDeleteModal({ isOpen: true, type: 'courier', target: c })}
        />
      )}

      {(activeSection === 'all' || activeSection === 'providers') && (
        <ProviderCards />
      )}

      <FleetModals
        codZone={codZone}
        onCloseCod={() => setCodZone(null)}
        copyZone={copyZone}
        onCloseCopy={() => setCopyZone(null)}
        closeZone={closeZone}
        onCloseClose={() => setCloseZone(null)}
        manifestZone={manifestZone}
        onCloseManifest={() => setManifestZone(null)}
        ordersByZone={zoneGroups}
        drivers={drivers}
        fastCouriers={couriers}
        selectedDrivers={selectedDriverForZone}
        copiedTemplate={copiedTemplate}
        onCopy={handleCopy}
        isClosingTour={isClosingTour}
        onConfirmCloseTour={handleConfirmCloseTour}
        driverModal={driverModal}
        onCloseDriverModal={() => setDriverModal((p) => ({ ...p, isOpen: false }))}
        onSubmitDriverModal={handleDriverSubmit}
        deleteModal={deleteModal}
        onCloseDeleteModal={() => setDeleteModal((p) => ({ ...p, isOpen: false }))}
        onConfirmDeleteModal={handleDeleteConfirm}
      />
    </div>
  );
};
