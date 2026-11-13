// ============================================================
// orderIntelligence.ts - نظام الذكاء الجغرافي وطابور الأولوية والتنبيهات
// متجر خُضرة — فاس (Khodra Fès)
// ============================================================

import type { DbOrder } from './types';
import { detectAddressZone, FezZoneId, AddressDetectionResult } from '../../data/deliveryZones';

export interface OrderIntelligenceMetrics {
  waitingMinutes: number;
  priorityStatus: 'urgent' | 'delayed' | 'normal';
  zoneResult: AddressDetectionResult;
  isUnassigned: boolean;
  isAmbiguous: boolean;
  score: number;
}

export interface OrderAlertsConfig {
  urgentWaitingMinutes: number;
  delayedWaitingMinutes: number;
  backlogWarningCount: number;
}

export const DEFAULT_ALERTS_CONFIG: OrderAlertsConfig = {
  urgentWaitingMinutes: 25,
  delayedWaitingMinutes: 45,
  backlogWarningCount: 5,
};

/**
 * 1. تحليل وتصنيف عنوان الطلب وحساب مؤشرات الأولوية والانتظار
 */
export function analyzeOrderIntelligence(
  order: DbOrder,
  config: OrderAlertsConfig = DEFAULT_ALERTS_CONFIG
): OrderIntelligenceMetrics {
  const createdAtMs = order.created_at ? new Date(order.created_at).getTime() : Date.now();
  const waitingMinutes = Math.max(0, Math.floor((Date.now() - createdAtMs) / 60000));

  const zoneResult = detectAddressZone(order.address);
  const isUnassigned = !order.delivery_zone && zoneResult.status !== 'accepted';
  const isAmbiguous = zoneResult.status === 'ambiguous' || !zoneResult.zoneId;

  // تحديد حالة الأولوية
  let priorityStatus: 'urgent' | 'delayed' | 'normal' = 'normal';
  if (waitingMinutes >= config.delayedWaitingMinutes || isUnassigned) {
    priorityStatus = 'delayed';
  } else if (waitingMinutes >= config.urgentWaitingMinutes || order.status === 'pending') {
    priorityStatus = 'urgent';
  }

  // حساب درجة الأولوية لطابور الأولوية (Priority Queue Score)
  // الطلبات غير المصنفة والمتأخرة تحوز أعلى النقاط لتظهر في قمة القائمة
  let score = waitingMinutes;
  if (isUnassigned || isAmbiguous) score += 1000;
  if (order.status === 'pending') score += 500;
  if (priorityStatus === 'delayed') score += 300;
  else if (priorityStatus === 'urgent') score += 150;

  return {
    waitingMinutes,
    priorityStatus,
    zoneResult,
    isUnassigned,
    isAmbiguous,
    score,
  };
}

/**
 * 2. ترتيب الطلبات في طابور الأولوية (Priority Queue Sorting)
 */
export function sortOrdersByPriority(
  orders: DbOrder[],
  config: OrderAlertsConfig = DEFAULT_ALERTS_CONFIG
): { order: DbOrder; metrics: OrderIntelligenceMetrics }[] {
  const mapped = orders.map((order) => ({
    order,
    metrics: analyzeOrderIntelligence(order, config),
  }));

  return mapped.sort((a, b) => b.metrics.score - a.metrics.score);
}

/**
 * 3. فحص التنبيهات التشغيلية (Backlog, Unassigned, Delayed Alerts)
 */
export interface OperationalAlerts {
  backlogCount: number;
  hasBacklogWarning: boolean;
  unassignedCount: number;
  delayedCount: number;
  messages: string[];
}

export function checkOperationalAlerts(
  orders: DbOrder[],
  config: OrderAlertsConfig = DEFAULT_ALERTS_CONFIG
): OperationalAlerts {
  const activeOrders = orders.filter((o) => o.status !== 'cancelled' && !o.is_archived);
  const pendingOrders = activeOrders.filter((o) => o.status === 'pending');
  const backlogCount = pendingOrders.length;
  const hasBacklogWarning = backlogCount >= config.backlogWarningCount;

  let unassignedCount = 0;
  let delayedCount = 0;
  const messages: string[] = [];

  if (hasBacklogWarning) {
    messages.push(`⚠️ تنبيه تكدس الطلبات: يوجد ${backlogCount} طلبات قيد الانتظار بانتظار التجهيز.`);
  }

  activeOrders.forEach((o) => {
    const metrics = analyzeOrderIntelligence(o, config);
    if (metrics.isUnassigned || metrics.isAmbiguous) {
      unassignedCount++;
    }
    if (metrics.waitingMinutes >= config.delayedWaitingMinutes) {
      delayedCount++;
    }
  });

  if (unassignedCount > 0) {
    messages.push(`📌 ${unassignedCount} طلبات تتطلب مراجعة يدوية للعنوان أو القطاع.`);
  }

  if (delayedCount > 0) {
    messages.push(`⏰ ${delayedCount} طلبات تجاوزت وقت الانتظار المعتاد (${config.delayedWaitingMinutes} دقيقة).`);
  }

  return {
    backlogCount,
    hasBacklogWarning,
    unassignedCount,
    delayedCount,
    messages,
  };
}
