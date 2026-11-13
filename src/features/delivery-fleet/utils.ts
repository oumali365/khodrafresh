// ============================================================
// utils.ts - دوال الحسابات وصياغة الرسائل ومسارات الخرائط
// ============================================================

import type {
  FezZoneId,
  StoreDriver,
  FastAppCourier,
  DbOrder,
  SortedDriver,
  SortedFastCourier,
  ZoneCODCalculation,
  FezZoneConfig,
} from './types';
import { STORE_PICKUP_HUB } from '../../data/config';

/**
 * تنظيف وتنسيق رقم الهاتف ليتناسب مع روابط واتساب المباشرة للمغرب
 */
export function cleanPhoneForWhatsApp(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('212')) return digits;
  if (digits.startsWith('0')) return '212' + digits.slice(1);
  return digits;
}

/**
 * فرز السائقين الذكي: الأولوية للمنطقة المفضلة ثم المتاحين ثم بالترتيب الأبجدي
 */
export function getSortedDriversForZone(zoneKey: FezZoneId, drivers: StoreDriver[]): SortedDriver[] {
  return [...drivers]
    .sort((a, b) => {
      // مطابقة المنطقة المفضلة
      const aMatchesZone = a.zonePreference === zoneKey ? 2 : a.zonePreference === 'all' ? 1 : 0;
      const bMatchesZone = b.zonePreference === zoneKey ? 2 : b.zonePreference === 'all' ? 1 : 0;
      if (aMatchesZone !== bMatchesZone) {
        return bMatchesZone - aMatchesZone;
      }
      // فرز المتاح أولاً
      const aAvailable = a.status === 'available' ? 1 : 0;
      const bAvailable = b.status === 'available' ? 1 : 0;
      if (aAvailable !== bAvailable) {
        return bAvailable - aAvailable;
      }
      return a.name.localeCompare(b.name, 'ar');
    })
    .map((driver) => {
      const isPreferred = driver.zonePreference === zoneKey;
      const isDisabled = driver.status === 'on_delivery' || driver.status === 'off_duty';
      const disabledReason =
        driver.status === 'on_delivery'
          ? 'في جولة حالياً'
          : driver.status === 'off_duty'
          ? 'خارج الخدمة'
          : undefined;

      return {
        driver,
        isPreferred,
        isDisabled,
        disabledReason,
      };
    });
}

/**
 * فرز سائقي وتطبيقات التوصيل السريع حسب المنطقة والنطاق الجغرافي
 */
export function getSortedFastCouriersForZone(
  zoneKey: FezZoneId,
  couriers: FastAppCourier[]
): SortedFastCourier[] {
  return [...couriers]
    .sort((a, b) => {
      const aMatches = a.zone === zoneKey ? 2 : a.zone === 'all' ? 1 : 0;
      const bMatches = b.zone === zoneKey ? 2 : b.zone === 'all' ? 1 : 0;
      if (aMatches !== bMatches) {
        return bMatches - aMatches;
      }
      return a.name.localeCompare(b.name, 'ar');
    })
    .map((courier) => {
      const isPreferred = courier.zone === zoneKey;
      const appName =
        courier.app === 'indrive'
          ? 'inDrive'
          : courier.app === 'glovo'
          ? 'Glovo'
          : courier.app === 'yassir'
          ? 'Yassir'
          : courier.app === 'careem'
          ? 'Careem'
          : courier.appNameCustom || 'تطبيق';

      return {
        courier,
        isPreferred,
        appBadgeLabel: appName,
      };
    });
}

/**
 * حساب مبالغ التحصيل النقدي (COD) ورسوم التوصيل والمجموع لطلبات المنطقة
 */
export function calculateZoneCOD(zoneOrders: DbOrder[]): ZoneCODCalculation {
  const activeOrders = zoneOrders.filter((o) => o.status !== 'cancelled' && !o.is_archived);
  const unpaidOrders = activeOrders.filter((o) => !o.is_paid);
  const totalCOD = unpaidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalDeliveryFees = activeOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
  const totalSubtotal = activeOrders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);

  return {
    totalCOD: Number(totalCOD.toFixed(2)),
    totalDeliveryFees: Number(totalDeliveryFees.toFixed(2)),
    totalSubtotal: Number(totalSubtotal.toFixed(2)),
    ordersCount: activeOrders.length,
    orders: activeOrders,
    unpaidOrdersCount: unpaidOrders.length,
    paidOrdersCount: activeOrders.length - unpaidOrders.length,
  };
}

/**
 * إنشاء رابط ملاحة متعدد المحطات على خرائط Google من نقطة التموين إلى جميع الزبائن
 */
export function generateGoogleMapsMultiStopUrl(zoneOrders: DbOrder[]): string {
  if (zoneOrders.length === 0) return '';
  const origin = encodeURIComponent(`${STORE_PICKUP_HUB.name}, ${STORE_PICKUP_HUB.address}`);
  const destination = encodeURIComponent(`${zoneOrders[zoneOrders.length - 1].address}, فاس`);

  if (zoneOrders.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }

  const waypoints = zoneOrders
    .slice(0, zoneOrders.length - 1)
    .map((o) => encodeURIComponent(`${o.address}, فاس`))
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

/**
 * بناء رسالة تفاصيل الجولة والمحطات للسائق الداخلي أو كابتن التطبيق السريع عبر واتساب
 */
export function buildDriverWhatsAppMessage(
  zoneKey: FezZoneId,
  orders: DbOrder[],
  driver: StoreDriver | FastAppCourier | null | undefined,
  zoneInfo: FezZoneConfig,
  hub: typeof STORE_PICKUP_HUB = STORE_PICKUP_HUB
): string {
  const { totalCOD } = calculateZoneCOD(orders);
  const mapsRoute = generateGoogleMapsMultiStopUrl(orders);

  const isFastCourier = Boolean(driver && 'app' in driver);
  const fastCourier = isFastCourier ? (driver as FastAppCourier) : null;
  const storeDriver = !isFastCourier ? (driver as StoreDriver) : null;

  const appTitle = fastCourier
    ? fastCourier.app === 'glovo'
      ? 'Glovo 🛵'
      : fastCourier.app === 'indrive'
      ? 'inDrive 🚗'
      : fastCourier.app === 'yassir'
      ? 'Yassir 🚕'
      : fastCourier.app === 'careem'
      ? 'Careem 🚗'
      : (fastCourier.appNameCustom || 'تطبيق سريع')
    : null;

  const driverName = driver
    ? isFastCourier
      ? `${driver.name} (كابتن ${appTitle})`
      : driver.name
    : 'كابتن التوصيل';

  let msg = `السلام عليكم كابتن *${driverName}* 🛵\n`;
  msg += `🌿 *جولة توصيل جديدة - متجر خُضرة فاس*\n`;
  if (isFastCourier && appTitle) {
    msg += `⚡ *نوع الخدمة:* توصيل سريع عبر تطبيق (${appTitle})\n`;
  }
  msg += `🧭 *المنطقة:* ${zoneInfo.name} (${zoneInfo.targetTime})\n`;
  msg += `📦 *عدد الطلبات:* ${orders.length} طلبيات مجهزة ومفروزة\n`;
  msg += `📍 *نقطة الانطلاق والتموين:* ${hub.name} (${hub.address})\n`;
  if (mapsRoute) {
    msg += `🗺️ *رابط المسار الكامل على خرائط Google:*\n${mapsRoute}\n`;
  }
  msg += `\n════════════════════\n`;
  msg += `📋 *تفاصيل المحطات والزبائن:*\n`;

  orders.forEach((o, idx) => {
    msg += `\n*محطة #${idx + 1} | طلب ${o.order_code}*\n`;
    msg += `👤 الزبون: ${o.customer_name}\n`;
    msg += `📞 الهاتف: ${o.phone}\n`;
    msg += `🏠 العنوان: ${o.address}\n`;
    if (o.maps_link) msg += `📍 موقع GPS: ${o.maps_link}\n`;
    msg += `💵 المبلغ للتحصيل (COD): *${o.total.toFixed(2)} د.م*\n`;
    msg += `📦 المحتويات: ${o.items.length} أصناف (${o.items
      .map((i) => i.name)
      .slice(0, 3)
      .join('، ')}${o.items.length > 3 ? '...' : ''})\n`;
  });

  msg += `\n════════════════════\n`;
  msg += `💰 *إجمالي مبلغ التحصيل (COD):* *${totalCOD.toFixed(2)} د.م*\n`;

  const perOrderFare = isFastCourier
    ? Number(fastCourier?.typicalFare) || 25
    : Number(storeDriver?.commissionPerOrder) || 25;

  if (driver) {
    const wage = orders.length * perOrderFare;
    msg += `🛵 *أجرة الجولة المستحقة لك:* ${wage.toFixed(2)} د.م (${perOrderFare} د.م/طلب)\n`;
    msg += `🏦 *الصافي لتوريده لصندوق المتجر:* ${(totalCOD - wage).toFixed(2)} د.م\n`;
  }
  msg += `\nطريق السلامة والتوفيق! 🌟🌿`;
  return msg;
}

/**
 * بناء رسالة طلب استدعاء سائق inDrive أو تطبيقات التوصيل الفوري
 */
export function buildInDriveMessage(
  zoneKey: FezZoneId,
  orders: DbOrder[],
  zoneInfo: FezZoneConfig,
  hub: typeof STORE_PICKUP_HUB = STORE_PICKUP_HUB
): string {
  const { totalCOD } = calculateZoneCOD(orders);
  let msg = `السلام عليكم 🚴\n`;
  msg += `جولة توصيل - ${zoneInfo.name} (${orders.length} محطات) لمتجر خُضرة 🌿\n\n`;
  msg += `📍 نقطة الانطلاق:\n${hub.name}\n${hub.address}\n\n`;
  msg += `📦 المحطات المتتابعة:\n`;
  orders.forEach((o, idx) => {
    msg += `\n───────────────\n`;
    msg += `محطة #${idx + 1} (${o.order_code}):\n`;
    msg += `👤 ${o.customer_name}\n📞 ${o.phone}\n🏠 ${o.address}\n`;
    if (o.maps_link) msg += `🗺️ GPS: ${o.maps_link}\n`;
    msg += `💵 COD: ${o.total.toFixed(2)} د.م\n`;
  });
  msg += `\n───────────────\n💰 إجمالي COD للجولة: ${totalCOD.toFixed(2)} د.م`;
  return msg;
}

/**
 * بناء رسائل إشعار الزبائن بخروج الجولة في منطقتهم
 */
export function buildCustomersNotificationMessage(
  zoneKey: FezZoneId,
  orders: DbOrder[],
  zoneInfo: FezZoneConfig
): string {
  let msg = `📢 *إشعار خروج الجولة لزبائن ${zoneInfo.name}:*\n`;
  orders.forEach((o, idx) => {
    msg += `\n${idx + 1}. الزبون: ${o.customer_name} (${o.order_code})\n`;
    msg += `   📞 الهاتف: ${o.phone}\n`;
    msg += `   💬 الرسالة:\n`;
    msg += `   "مرحباً بك، طلبك من خُضرة (${o.order_code}) خرج الآن في جولة التوصيل وسيكون عندك خلال ${zoneInfo.targetTime}. المبلغ المطلوب عند الاستلام: ${o.total.toFixed(2)} د.م. شكراً لثقتك بنا 🌿"\n`;
  });
  return msg;
}
