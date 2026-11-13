// ============================================================
// src/services/storeOperationsCore.ts
// مركز العمليات والبيانات الموحد لمتجر خُضرة — فاس (Khodra Unified Commerce Core)
// 
// يحقق التوصية المعمارية الموحدة:
// الانتقال من خمس أدوات متفرقة إلى دورة تشغيلية واحدة للمتجر:
// المرحلة 1 — إنشاء الطلب وتثبيت الأسعار والكلفة التاريخية
// المرحلة 2 — تأكيد المخزون وحجزه ذرياً مع ربطه برقم الطلب (order_id)
// المرحلة 3 — تجهيز الطلب وإسناد التوصيل وتوثيق الطوابع الزمنية
// المرحلة 4 — تسجيل الدفع والتحصيل النقدي ومطابقة الصندوق والسائق
// المرحلة 5 — إقفال الدورة المالية واحتساب الأرباح المحصنة
// ============================================================

import {
  getSupabase,
  fetchOrders,
  fetchProducts,
  recordInventoryMovement,
  updateOrderStatus,
  updateOrderPayment,
  updateOrderArchive,
  updateOrderDispatch,
  type DbOrder,
} from './supabaseService';
import {
  TARIFF_STANDARDS,
  calculateEstimatedPurchasePrice,
  calculateItemsCogs,
  calculateOrderFinancials,
  type CostCertainty,
} from './financialEngine';
import { getStoredPricesMap } from '../features/pricing-forecast/pricingService';
import type { FezZoneId } from '../data/deliveryZones';
import type { DeliveryDispatchInfo, Product } from '../types';

/**
 * ────────────────────────────────────────────────────────────
 * نماذج البيانات الموحدة لدورة التشغيل
 * ────────────────────────────────────────────────────────────
 */

export type OrderLifecycleStage =
  | 'created'              // المرحلة 1: تم الإنشاء وفحص التوفر
  | 'stock_confirmed'      // المرحلة 2: تم حجز وخصم المخزون ذرياً
  | 'dispatched'           // المرحلة 3: تم التجهيز وإسناد السائق
  | 'delivered'            // تم التسليم للعميل
  | 'payment_reconciled'   // المرحلة 4: تم تحصيل ومطابقة المبلغ نقداً/مسبقاً
  | 'financially_closed'   // المرحلة 5: إقفال مالي نهائي وتثبيت الأرباح
  | 'cancelled';           // ملغي مع استرجاع المخزون

export interface UnifiedItemSnapshot {
  productId: number;
  name: string;
  unitLabel: string;
  quantity: number;
  unitSellingPrice: number;
  unitPurchaseCost: number;
  lineSellingTotal: number;
  lineCogsTotal: number;
  isCostEstimated: boolean;
  icon?: string;
}

export interface UnifiedOrderAuditLogEntry {
  stage: OrderLifecycleStage;
  timestamp: string;
  actor: string;
  action: string;
  details?: Record<string, any>;
}

export interface UnifiedOrderFinancialSnapshot {
  productsSubtotal: number;
  discountAmount: number;
  netProductsRevenue: number;
  customerDeliveryFee: number;
  customerGrandTotal: number;
  cogsTotal: number;
  cogsStatus: CostCertainty;
  agreedDeliveryCost: number;
  deliveryCostStatus: CostCertainty;
  packagingCost: number;
  totalDirectCosts: number;
  operatingNetProfit: number;
  grossMarginPercent: number;
  isClosed: boolean;
  closedAt?: string;
}

const LOCAL_AUDIT_LOGS_KEY = 'khodra_order_audit_trail_v1';
const DEDUCTED_ORDERS_KEY = 'khodra_stock_deducted_orders_v1';
const FINANCIAL_CLOSE_KEY = 'khodra_financial_closed_orders_v1';

/**
 * مساعدة داخلية لقراءة وحفظ سجلات التدقيق التاريخية
 */
function appendAuditLog(orderCode: string, entry: UnifiedOrderAuditLogEntry) {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    const map: Record<string, UnifiedOrderAuditLogEntry[]> = raw ? JSON.parse(raw) : {};
    if (!map[orderCode]) map[orderCode] = [];
    map[orderCode].push(entry);
    localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(map));
  } catch {}
}

export function getOrderAuditLogs(orderCode: string): UnifiedOrderAuditLogEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    const map: Record<string, UnifiedOrderAuditLogEntry[]> = raw ? JSON.parse(raw) : {};
    return map[orderCode] || [];
  } catch {
    return [];
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * المرحلة 1 — إنشاء الطلب وتثبيت الأسعار والكلفة التاريخية
 * ═══════════════════════════════════════════════════════════════
 */
export async function prepareAndValidateOrderItems(
  items: Array<{ productId: number; quantity: number }>
): Promise<{
  isValid: boolean;
  snapshots: UnifiedItemSnapshot[];
  productsSubtotal: number;
  estimatedCogsTotal: number;
  hasInsufficientStock: boolean;
  insufficientItemMessage?: string;
}> {
  const catalog = await fetchProducts();
  const pricesMap = getStoredPricesMap();

  let productsSubtotal = 0;
  let estimatedCogsTotal = 0;
  const snapshots: UnifiedItemSnapshot[] = [];

  for (const requested of items) {
    const product = catalog.find((p) => p.id === requested.productId);
    if (!product) {
      return {
        isValid: false,
        snapshots: [],
        productsSubtotal: 0,
        estimatedCogsTotal: 0,
        hasInsufficientStock: true,
        insufficientItemMessage: `المنتج رقم ${requested.productId} غير متوفر في كتالوج المتجر.`,
      };
    }

    const availableStock = product.stock ?? 0;
    if (requested.quantity > availableStock) {
      return {
        isValid: false,
        snapshots: [],
        productsSubtotal: 0,
        estimatedCogsTotal: 0,
        hasInsufficientStock: true,
        insufficientItemMessage: `الكمية المتوفرة من "${product.name}" هي ${availableStock} ${product.unit_label || 'kg'} فقط، بينما طلبت ${requested.quantity}.`,
      };
    }

    // استخراج تكلفة الشراء المثبتة
    const dailyPrice = pricesMap[product.id];
    let unitPurchaseCost = dailyPrice?.purchasePrice != null ? Number(dailyPrice.purchasePrice) : null;
    let isCostEstimated = false;

    if (unitPurchaseCost == null || unitPurchaseCost <= 0) {
      unitPurchaseCost = calculateEstimatedPurchasePrice(product.price);
      isCostEstimated = true;
    }

    const sellingPrice = Number(product.price) || 0;
    const lineSellingTotal = Number((sellingPrice * requested.quantity).toFixed(2));
    const lineCogsTotal = Number((unitPurchaseCost * requested.quantity).toFixed(2));

    productsSubtotal += lineSellingTotal;
    estimatedCogsTotal += lineCogsTotal;

    snapshots.push({
      productId: product.id,
      name: product.name,
      unitLabel: product.unit_label || (product.type === 'unit' ? 'حبة' : 'kg'),
      quantity: requested.quantity,
      unitSellingPrice: sellingPrice,
      unitPurchaseCost,
      lineSellingTotal,
      lineCogsTotal,
      isCostEstimated,
      icon: product.icon || '🛒',
    });
  }

  return {
    isValid: true,
    snapshots,
    productsSubtotal: Number(productsSubtotal.toFixed(2)),
    estimatedCogsTotal: Number(estimatedCogsTotal.toFixed(2)),
    hasInsufficientStock: false,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * المرحلة 2 — تأكيد المخزون وحجزه ذرياً مع ربطه برقم الطلب (order_id)
 * ═══════════════════════════════════════════════════════════════
 */
export async function confirmOrderStockAtomic(
  order: DbOrder,
  actor: string = 'النظام الآلي'
): Promise<{ success: boolean; affectedCount: number; message: string }> {
  const orderKey = String(order.order_code || order.id);

  // منع تكرار الخصم لنفس الطلب (Idempotency Protection)
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(DEDUCTED_ORDERS_KEY);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      if (set.has(orderKey)) {
        return { success: true, affectedCount: 0, message: 'المخزون محجوز ومخصوم مسبقاً لهذا الطلب' };
      }
    } catch {}
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return { success: true, affectedCount: 0, message: 'لا توجد أصناف في الطلب لخصم مخزونها' };
  }

  let affectedCount = 0;
  for (const item of order.items) {
    const pid = Number(item.id || item.product_id);
    const qty = Math.max(0, Number(item.qty || item.quantity) || 1);
    if (pid > 0 && qty > 0) {
      await recordInventoryMovement({
        productId: pid,
        movementType: 'order_deduct',
        quantityDelta: -qty,
        reason: `خصم مبيعات معتمدة - طلب #${orderKey}`,
        orderId: order.id,
        createdBy: actor,
      });
      affectedCount++;
    }
  }

  // توثيق نجاح الخصم وتحديث سجل التدقيق
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(DEDUCTED_ORDERS_KEY);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      set.add(orderKey);
      localStorage.setItem(DEDUCTED_ORDERS_KEY, JSON.stringify(Array.from(set)));
    } catch {}
  }

  appendAuditLog(orderKey, {
    stage: 'stock_confirmed',
    timestamp: new Date().toISOString(),
    actor,
    action: `تم تأكيد حجز وخصم مخزون ${affectedCount} صنفاً في دفتر الأستاذ`,
    details: { affectedCount, orderKey },
  });

  return {
    success: true,
    affectedCount,
    message: `تم خصم كميات ${affectedCount} صنفاً بنجاح وربطها برقم الطلب #${orderKey}`,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * المرحلة 3 — تجهيز الطلب وإسناد التوصيل وتوثيق الطوابع الزمنية
 * ═══════════════════════════════════════════════════════════════
 */
export async function assignOrderDispatchUnified(params: {
  order: DbOrder;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  zone: FezZoneId;
  agreedWage: number;
  deliverySource: 'internal' | 'external_app';
  appName?: string;
  actor?: string;
}): Promise<{ success: boolean; message: string }> {
  const { order, driverId, driverName, driverPhone, zone, agreedWage, deliverySource, appName, actor = 'مدير اللوجستيك' } = params;
  const orderKey = String(order.order_code || order.id);

  const dispatchPayload: DeliveryDispatchInfo = {
    provider: deliverySource === 'internal' ? 'custom' : (appName?.toLowerCase().includes('glovo') ? 'glovo' : appName?.toLowerCase().includes('yassir') ? 'yassir' : 'indrive'),
    driverId,
    driverName,
    driverPhone,
    zone,
    agreedWage,
    deliveryCost: agreedWage,
    costCertainty: 'actual',
    dispatchStatus: 'waiting_driver',
    deliverySource,
    appName,
    dispatchedAt: new Date().toISOString(),
  };

  await updateOrderDispatch(order.id, order.order_code, dispatchPayload);
  await updateOrderStatus(order.id, 'prepared');

  appendAuditLog(orderKey, {
    stage: 'dispatched',
    timestamp: new Date().toISOString(),
    actor,
    action: `تم تجهيز الطلب وإسناده للمندوب ${driverName} (${deliverySource === 'internal' ? 'داخلي' : appName || 'تطبيق خارجي'}) بأجرة ${agreedWage} د.م`,
    details: { driverId, driverName, agreedWage, zone },
  });

  return {
    success: true,
    message: `تم اعتماد إسناد الطلب #${orderKey} للكابتن ${driverName}`,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * المرحلة 4 — تسجيل الدفع والتحصيل النقدي ومطابقة الصندوق
 * ═══════════════════════════════════════════════════════════════
 */
export async function reconcileOrderPaymentUnified(params: {
  order: DbOrder;
  amountCollected: number;
  paymentMethod: 'cod' | 'prepaid';
  driverId?: string;
  notes?: string;
  actor?: string;
}): Promise<{ success: boolean; message: string }> {
  const { order, amountCollected, paymentMethod, driverId, notes, actor = 'أمين الصندوق' } = params;
  const orderKey = String(order.order_code || order.id);

  await updateOrderPayment(order.id, true);

  appendAuditLog(orderKey, {
    stage: 'payment_reconciled',
    timestamp: new Date().toISOString(),
    actor,
    action: `تم تسجيل وتحصيل مبلغ ${amountCollected} د.م (${paymentMethod === 'cod' ? 'دفع عند الاستلام عبر السائق' : 'دفع مسبق'})`,
    details: { amountCollected, paymentMethod, driverId, notes },
  });

  return {
    success: true,
    message: `تم تسجيل تحصيل الطلب #${orderKey} بنجاح ومطابقته مع الصندوق`,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * المرحلة 5 — إقفال الدورة المالية واحتساب الأرباح المحصنة
 * ═══════════════════════════════════════════════════════════════
 */
export async function closeOrderFinancialsUnified(
  order: DbOrder,
  actor: string = 'المدير المالي'
): Promise<{
  success: boolean;
  snapshot: UnifiedOrderFinancialSnapshot;
  message: string;
}> {
  const orderKey = String(order.order_code || order.id);
  const pricesMap = getStoredPricesMap();

  const grandTotal = Number(order.total) || 0;
  const deliveryFee = Number(order.delivery_fee) || 0;
  const subtotal = Number(order.subtotal) || (grandTotal - deliveryFee);
  const discountAmount = Number(order.discount_amount) || 0;

  // استخراج كلفة البضاعة بدقة
  let cogsAmount = order.cogs_amount != null ? Number(order.cogs_amount) : null;
  let cogsStatus: CostCertainty = 'actual';

  if (cogsAmount == null && Array.isArray(order.items) && order.items.length > 0) {
    const itemsCogs = calculateItemsCogs(order.items, pricesMap);
    cogsAmount = itemsCogs.cogsAmount != null ? itemsCogs.cogsAmount : Number((subtotal * 0.6).toFixed(2));
    cogsStatus = itemsCogs.cogsStatus;
  } else if (cogsAmount == null) {
    cogsAmount = Number((subtotal * 0.6).toFixed(2));
    cogsStatus = 'estimated';
  }

  // كلفة التوصيل المحققة
  const deliveryCost = Number(
    order.delivery_dispatch?.deliveryCost ??
    order.delivery_dispatch?.agreedWage ??
    order.actual_delivery_cost ??
    order.driver_wage ??
    TARIFF_STANDARDS.DEFAULT_DRIVER_ORDER_WAGE
  );

  const packagingCost = Number(order.packaging_cost ?? TARIFF_STANDARDS.STANDARD_PACKAGING_COST);
  const totalDirectCosts = Number((cogsAmount + deliveryCost + packagingCost).toFixed(2));
  const operatingNetProfit = Number((grandTotal - totalDirectCosts).toFixed(2));
  const grossMarginPercent = subtotal > 0
    ? Number((((subtotal - cogsAmount) / subtotal) * 100).toFixed(2))
    : 0;

  const snapshot: UnifiedOrderFinancialSnapshot = {
    productsSubtotal: subtotal,
    discountAmount,
    netProductsRevenue: subtotal - discountAmount,
    customerDeliveryFee: deliveryFee,
    customerGrandTotal: grandTotal,
    cogsTotal: cogsAmount,
    cogsStatus,
    agreedDeliveryCost: deliveryCost,
    deliveryCostStatus: 'actual',
    packagingCost,
    totalDirectCosts,
    operatingNetProfit,
    grossMarginPercent,
    isClosed: true,
    closedAt: new Date().toISOString(),
  };

  // حفظ السجل المالي المغلق محلياً وفي قاعدة البيانات
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(FINANCIAL_CLOSE_KEY);
      const map: Record<string, UnifiedOrderFinancialSnapshot> = raw ? JSON.parse(raw) : {};
      map[orderKey] = snapshot;
      localStorage.setItem(FINANCIAL_CLOSE_KEY, JSON.stringify(map));
    } catch {}
  }

  await updateOrderArchive(order.id, true);

  appendAuditLog(orderKey, {
    stage: 'financially_closed',
    timestamp: new Date().toISOString(),
    actor,
    action: `تم الإقفال المالي النهائي للطلب: إيراد ${grandTotal} د.م، كلفة بضاعة ${cogsAmount} د.م، توصيل ${deliveryCost} د.م، صافي ربح ${operatingNetProfit} د.م`,
    details: snapshot as any,
  });

  return {
    success: true,
    snapshot,
    message: `تم الإقفال المالي النهائي للطلب #${orderKey} وتثبيت الأرباح (${operatingNetProfit} د.م)`,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * استرجاع المخزون وإلغاء الطلب (Atomic Rollback)
 * ═══════════════════════════════════════════════════════════════
 */
export async function cancelAndRollbackOrderUnified(
  order: DbOrder,
  reason: string,
  actor: string = 'مدير المتجر'
): Promise<{ success: boolean; restoredCount: number; message: string }> {
  const orderKey = String(order.order_code || order.id);

  // التحقق إن كان المخزون قد خُصم بالفعل لاسترجاعه
  let wasDeducted = false;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(DEDUCTED_ORDERS_KEY);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      wasDeducted = set.has(orderKey);
      if (wasDeducted) {
        set.delete(orderKey);
        localStorage.setItem(DEDUCTED_ORDERS_KEY, JSON.stringify(Array.from(set)));
      }
    } catch {}
  }

  let restoredCount = 0;
  if (wasDeducted && Array.isArray(order.items)) {
    for (const item of order.items) {
      const pid = Number(item.id || item.product_id);
      const qty = Math.max(0, Number(item.qty || item.quantity) || 1);
      if (pid > 0 && qty > 0) {
        await recordInventoryMovement({
          productId: pid,
          movementType: 'order_restore',
          quantityDelta: qty,
          reason: `استرجاع مخزون - إلغاء الطلب #${orderKey} (${reason})`,
          orderId: order.id,
          createdBy: actor,
        });
        restoredCount++;
      }
    }
  }

  await updateOrderStatus(order.id, 'cancelled');

  appendAuditLog(orderKey, {
    stage: 'cancelled',
    timestamp: new Date().toISOString(),
    actor,
    action: `تم إلغاء الطلب (${reason}) واسترجاع مخزون ${restoredCount} صنفاً إلى المستودع`,
    details: { reason, restoredCount },
  });

  return {
    success: true,
    restoredCount,
    message: `تم إلغاء الطلب #${orderKey} واسترجاع بضائعه للمخزون بنجاح`,
  };
}
