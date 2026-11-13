// ============================================================
// utils.ts - دوال مساعدة لإنشاء الرسائل وحساب التكاليف وتنسيق التواريخ
// ============================================================

import type { DbOrder, DeliveryDispatchInfo, FezZoneId } from './types';
import { STORE_PICKUP_HUB } from '../../data/config';
import { detectAddressZone, FEZ_DELIVERY_ZONES } from '../../data/deliveryZones';
import { playOrderAlertSound } from '../../utils/audioAlert';

export function toWhatsApp(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('212')) return digits;
  if (digits.startsWith('0')) return '212' + digits.slice(1);
  return digits;
}

export function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `منذ ${days} ي`;
    return new Date(dateStr).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ar-MA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function cleanNote(note: string): string {
  if (!note) return '';
  return note
    .split(' | ')
    .filter((part) => {
      const p = part.trim();
      if (!p) return false;
      if (/وقت\s*التسليم/.test(p)) return false;
      if (/طريقة\s*الدفع/.test(p)) return false;
      if (/رابط\s*الخريطة/.test(p)) return false;
      if (/^المنتجات\s*:/.test(p)) return false;
      if (/^التوصيل\s*:/.test(p)) return false;
      if (/google\.com\/maps/.test(p)) return false;
      return true;
    })
    .join(' • ');
}

export function buildOrderText(order: DbOrder): string {
  const lines: string[] = [];
  lines.push(`🛒 طلب ${order.order_code}`);
  lines.push(`👤 العميل: ${order.customer_name}`);
  lines.push(`📞 الهاتف: ${order.phone}`);
  lines.push(`📍 العنوان: ${order.address}`);
  const clean = cleanNote(order.note || '');
  if (clean) lines.push(`📝 ملاحظات: ${clean}`);
  lines.push('');
  lines.push('📦 المنتجات:');
  if (order.items.length === 0) {
    lines.push('  (لا توجد تفاصيل)');
  } else {
    order.items.forEach((it) => {
      const isWeight = /^kg$/i.test(it.variantLabel || '');
      const qtyLabel = isWeight
        ? `${it.qty} kg`
        : `${it.qty}${it.variantLabel ? ` (${it.variantLabel})` : ''}`;
      lines.push(`  - ${it.name} × ${qtyLabel} = ${Number(it.lineTotal).toFixed(2)} DH`);
    });
  }
  lines.push('');
  lines.push(`🚚 التوصيل: ${order.delivery_fee.toFixed(2)} DH`);
  lines.push(`💰 الإجمالي: ${order.total.toFixed(2)} DH`);
  lines.push(`🕐 تاريخ الطلب: ${formatDateTime(order.created_at)}`);
  return lines.join('\n');
}

/**
 * 1. رسالة إشعار الزبون وتأكيد الاستلام مع الشكر
 */
export function buildCustomerThankAndConfirmMessage(order: DbOrder): string {
  const safeTotal = Number(order.total ?? 0).toFixed(2);
  return `مرحباً بك أخي/أختي *${order.customer_name}* 🌿\n\nنشكرك على اختيارك *متجر خُضرة*! تم استلام طلبك رقم *${order.order_code}* عبر المتجر بنجاح.\n\n📋 *تفاصيل الطلب:*\n• الإجمالي: *${safeTotal} درهم*\n• العنوان: ${order.address}\n\nطلبك الآن قيد الإنشاء والمراجعة، وجارٍ تجهيزه طازجاً من سوق بنسودة بفاس بأعلى معايير الجودة والنظافة. سنوافيك بإشعار فوري عند انطلاق المندوب للتسليم!\n\nشكراً جزيلاً لثقتك بنا 💚✨`;
}

/**
 * 2. رسالة استدعاء سائق أسطول متجر خُضرة الداخلي (حصرياً للأسطول الداخلي)
 */
export function buildStoreTeamDriverMessage(order: DbOrder, draft?: DeliveryDispatchInfo): string {
  const hub = STORE_PICKUP_HUB;
  const driverGreeting = draft?.driverName
    ? `السلام عليكم كابتن *${draft.driverName}* 🛵🌿`
    : 'السلام عليكم كابتن فريق متجر خُضرة الداخلي 🛵🌿';
  const cleanN = cleanNote(order.note || '');
  const deliveryCost = draft?.deliveryCost != null && !isNaN(Number(draft.deliveryCost))
    ? `${Number(draft.deliveryCost)} درهم`
    : 'حسب الاتفاق المعتمد بالملف';
  const safeTotal = Number(order.total ?? 0).toFixed(2);
  const mapUrl =
    order.maps_link ||
    (order.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address + ' فاس')}`
      : '');

  return [
    driverGreeting,
    `📦 *مهمة توصيل جديدة - أسطول متجر خُضرة الداخلي*`,
    `🔖 *رقم الطلب:* #${order.order_code}`,
    `────────────────────`,
    `1️⃣ *نقطة الاستلام (المتجر المركزي):*`,
    `🏪 ${hub.name}`,
    `📍 ${hub.address}`,
    `🗺️ موقع الخريطة: ${hub.mapsLink}`,
    `────────────────────`,
    `2️⃣ *بيانات الزبون والتسليم:*`,
    `👤 *الاسم:* ${order.customer_name}`,
    `📞 *الهاتف:* ${order.phone}`,
    `🏠 *العنوان:* ${order.address}`,
    mapUrl ? `🗺️ رابط GPS: ${mapUrl}` : '',
    cleanN ? `📝 ملاحظة الزبون: ${cleanN}` : '',
    `────────────────────`,
    `3️⃣ *التحصيل المالي والأجرة:*`,
    `🚚 *أجرة التوصيل المستحقة لك:* ${deliveryCost}`,
    `💵 *المبلغ المطلوب تحصيله (COD): ${safeTotal} درهم* (نقداً عند التسليم)`,
    `────────────────────`,
    `⚠️ يرجى تأكيد استلام الطلب والحرص على سلامة واستقامة الصناديق. طريق السلامة! 🌟`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * 3. رسالة استدعاء سائق تطبيقات التوصيل الخارجية (Glovo / inDrive / Yassir / Careem)
 */
export function buildExternalDriverMessage(order: DbOrder, draft?: DeliveryDispatchInfo): string {
  const hub = STORE_PICKUP_HUB;
  const deliveryCost = draft?.deliveryCost != null && !isNaN(Number(draft.deliveryCost))
    ? `${Number(draft.deliveryCost)} درهم`
    : 'المتوسط المحدد بالتطبيق';
  const safeTotal = Number(order.total ?? 0).toFixed(2);
  const driverName = draft?.driverName || 'كابتن التوصيل';
  const appName = draft?.appName || (draft?.provider ? draft.provider.toUpperCase() : 'تطبيق خارجي');
  const zoneName = order.delivery_zone ? (FEZ_DELIVERY_ZONES[order.delivery_zone]?.name || order.delivery_zone) : 'مدينة فاس';
  const mapUrl =
    order.maps_link ||
    (order.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address + ' فاس')}`
      : '');

  return [
    `السلام عليكم كابتن *${driverName}* (${appName}) 🛵`,
    `🌿 *مشوار توصيل طرد - متجر خُضرة بفاس (تطبيقات سريعة)*`,
    `🔖 *رمز الطلب:* #${order.order_code}`,
    `🧭 *المنطقة المستهدفة:* ${zoneName}`,
    `────────────────────`,
    `📍 *نقطة الانطلاق (استلام الطرد):*`,
    `🏪 ${hub.name} - ${hub.address}`,
    `🗺️ رابط الاستلام: ${hub.mapsLink}`,
    `────────────────────`,
    `📍 *نقطة التسليم (عنوان الزبون):*`,
    `👤 الاسم: ${order.customer_name}`,
    `📞 الهاتف: ${order.phone}`,
    `🏠 العنوان: ${order.address}`,
    mapUrl ? `🗺️ رابط موقع الزبون: ${mapUrl}` : '',
    `────────────────────`,
    `💵 *المبلغ المطلوب تحصيله من الزبون (COD): ${safeTotal} درهم*`,
    `🚚 *أجرة المشوار المقترحة:* ${deliveryCost}`,
    `────────────────────`,
    `يرجى تأكيد الجاهزية والاستلام فوراً. شكراً لتعاونكم!`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildInDriveDriverMessage(order: DbOrder, draft?: DeliveryDispatchInfo): string {
  return buildExternalDriverMessage(order, draft);
}

/**
 * 4. رسالة إشعار الزبون بانطلاق الطلب مع المندوب
 */
export function buildCustomerOrderEnRouteMessage(order: DbOrder, draft?: DeliveryDispatchInfo): string {
  const safeTotal = Number(order.total ?? 0).toFixed(2);
  const driverName = draft?.driverName;
  const isInternal = draft?.deliverySource === 'internal';
  const driverSource = isInternal
    ? 'كابتن أسطول خُضرة'
    : (draft?.appName ? `كابتن (${draft.appName})` : 'مندوب التوصيل');
  const driverBadge = driverName ? `${driverSource} (${driverName})` : 'مندوب التوصيل المعتمد';

  return `مرحباً بك أخي/أختي *${order.customer_name}* 🌿\n\nنود إعلامك بأن طلبيتك رقم *${order.order_code}* من *متجر خُضرة* جاهزة تماماً وانطلقت الآن في طريقها إليك مع ${driverBadge} 🛵💨.\n\n📋 *تفاصيل التسليم:*\n• العنوان: ${order.address}\n• المبلغ المطلوب للدفع عند الاستلام (COD): *${safeTotal} درهم*\n\nيرجى إبقاء الهاتف متاحاً لتسهيل تسليم الصندوق طازجاً وسليماً. شكراً جزيلاً لثقتك بنا، وشهية طيبة! 🍏🥦`;
}

/**
 * 4. رسالة طلب تقييم الخدمة للزبون
 */
export function buildCustomerReviewMessage(order: DbOrder): string {
  const appOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://khodrafresh.vercel.app';
  return `السلام عليكم ورحمة الله أخي/أختي *${order.customer_name}* 🌿\n\nنتمنى أن تكون طلبيتكم من *متجر خُضرة* رقم (${order.order_code}) قد نالت رضاكم واستحسانكم! 🍏🥦\n\nرأيكم يهمنا جداً لتطوير وتجويد خدماتنا باستمرار. نرجو التكرم بالضغط على الرابط التالي لمشاركتنا تقييمكم لتجربة الشراء والتوصيل:\n⭐ ${appOrigin}/?review=true\n\nشكراً جزيلاً لثقتكم المستمرة في متجر خُضرة، وشهية طيبة لكم ولعائلتكم الكريمة! 💚🌟`;
}

/**
 * حساب تكلفة التوصيل المقترحة بناءً على منطقة فاس الجغرافية
 */
export function calculateDeliveryCost(zoneId?: FezZoneId, address?: string): number {
  let detectedZone = zoneId;
  if (!detectedZone && address) {
    const res = detectAddressZone(address);
    if (res && res.zoneId) {
      detectedZone = res.zoneId;
    }
  }

  // تسعيرة تقديرية حسب المسافة من نقطة التموين (سوق بنسودة)
  switch (detectedZone) {
    case 'south': // بنسودة والزواغة قرب المقر
      return 15;
    case 'central': // الأطلس وفلورنس
      return 20;
    case 'north': // سايس والنرجس
      return 20;
    case 'east': // طريق صفرو والزهور وفاس البالي
      return 25;
    default:
      return 20;
  }
}

/**
 * تشغيل جرس تنبيه عند استلام طلب جديد
 */
export function playOrderChime(): void {
  playOrderAlertSound();
}
