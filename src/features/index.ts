// ============================================================
// src/features/index.ts
// المدخل المركزي والموحد لجميع ميزات ووحدات لوحة إدارة متجر خُضرة فاس
// Khodra Store Admin & Operations Features Central Hub
// ============================================================

// 1. إدارة ومعالجة الطلبات، الفواتير، وبوالص الشحن (Commandes)
export * from './admin-orders';

// 2. أسطول التوصيل، السائقين، والمانيفست المجمع (Flotte & Dispatch)
export {
  AdminDeliveryFleetTab,
  TourManifestModal,
  CODDetailsModal,
  CopyTemplatesModal,
  CloseTourModal,
  DriverFormModal,
  FleetModals,
  DeleteConfirmModal as DeleteDriverConfirmModal,
} from './delivery-fleet';
export type {
  AdminDeliveryFleetTabProps,
  CODDetailsModalProps,
  CopyTemplatesModalProps,
  CloseTourModalProps,
  DriverFormModalProps,
  FleetModalsProps,
  DeleteConfirmModalProps as DeleteDriverConfirmModalProps,
} from './delivery-fleet';
export * from './delivery-fleet/types';
export * from './delivery-fleet/constants';
export * from './delivery-fleet/utils';
export * from './delivery-fleet/hooks';
export * from './delivery-fleet/cards';
export * from './delivery-fleet/components';

// 3. إدارة المنتجات والمخزون الحي بسوق بنسودة (Stock & Inventaire)
export * from './products-inventory';

// 4. تسعير الفجر والتنبؤ بحجم الطلب (Tarifs JIT & Prévisions)
export * from './pricing-forecast';

// 5. مركز التسويق الذكي والنسخ الإعلانية (Marketing IA)
export * from './ai-marketing';

// 6. اللوحة المالية ونموذج العمل التوقعي (Tableau Financier)
export * from './finance';

// 7. وثائق وعقود الشركة الرسمية SARL (Dossier Légal & PDF A4)
export * from './documents';

// 8. المساعد التشغيلي الذكي خُضرة (Khodra AI Copilot)
export * from './copilot';

// 9. هيكل لوحة التحكم والشريط السفلي ونظام التنبيهات والأخطاء
export * from './layout';

// 10. النوافذ المنبثقة للتحقق والرمز السري (PIN Modals)
export * from './modals';
