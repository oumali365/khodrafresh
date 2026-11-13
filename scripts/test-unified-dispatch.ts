// ============================================================
// scripts/test-unified-dispatch.ts
// اختبارات تكامل مركز الإسناد الموحد وأسطول التوصيل وسائقي التطبيقات السريعة
// ============================================================

import {
  calculateZoneCOD,
  generateGoogleMapsMultiStopUrl,
  buildDriverWhatsAppMessage,
  getSortedDriversForZone,
  getSortedFastCouriersForZone,
} from '../src/features/delivery-fleet/utils';
import { FEZ_DELIVERY_ZONES } from '../src/data/deliveryZones';
import {
  INITIAL_STORE_DRIVERS,
  INITIAL_FAST_COURIERS,
  batchAssignZoneOrders,
  closeAndDeliverZoneTour,
} from '../src/services/supabaseService';
import type { DbOrder } from '../src/features/delivery-fleet/types';

async function runUnifiedDispatchTests() {
  console.log('======================================================================');
  console.log('🚚 بدء اختبارات تكامل مركز الإسناد الموحد وأسطول التوصيل وسائقي التطبيقات');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1️⃣ اختبار حساب مجموع التحصيل النقدي (COD) والطلبات
  console.log('▶ [اختبار 1] حساب مبالغ التحصيل النقدي (COD):');
  const mockOrders: DbOrder[] = [
    {
      id: 1,
      order_code: '#ORD-201',
      customer_name: 'ياسين بناني',
      phone: '0661234567',
      address: 'حي الأطلس، فاس',
      items: [{ name: 'طماطم طازجة', qty: 2, lineTotal: 20, icon: '🍅' }],
      subtotal: 20,
      delivery_fee: 15,
      total: 35,
      status: 'prepared',
      created_at: new Date().toISOString(),
      delivery_zone: 'north',
      is_paid: false,
    },
    {
      id: 2,
      order_code: '#ORD-202',
      customer_name: 'كريمة الوسي',
      phone: '0669876543',
      address: 'حي النرجس، فاس',
      items: [{ name: 'بطاطس', qty: 3, lineTotal: 30, icon: '🥔' }],
      subtotal: 30,
      delivery_fee: 15,
      total: 45,
      status: 'prepared',
      created_at: new Date().toISOString(),
      delivery_zone: 'north',
      is_paid: false,
    },
  ];

  const codCalc = calculateZoneCOD(mockOrders);
  if (codCalc.totalCOD === 80 && codCalc.ordersCount === 2) {
    console.log(`   ✓ تم حساب إجمالي COD بنجاح: ${codCalc.totalCOD} د.م لـ ${codCalc.ordersCount} طلبات.`);
    passed++;
  } else {
    console.error(`   ❌ فشل في حساب COD الصحيح. النتيجة: ${codCalc.totalCOD}`);
    failed++;
  }

  // 2️⃣ اختبار توليد رابط خرائط Google المتتابع
  console.log('\n▶ [اختبار 2] توليد رابط خرائط Google المتتابع (Multi-stop):');
  const mapsUrl = generateGoogleMapsMultiStopUrl(mockOrders);
  if (mapsUrl.includes('google.com/maps/dir/?api=1') && mapsUrl.includes('waypoints=')) {
    console.log(`   ✓ تم توليد رابط خرائط Google المتتابع بنجاح.`);
    passed++;
  } else {
    console.error(`   ❌ فشل في توليد رابط الخرائط.`);
    failed++;
  }

  // 3️⃣ اختبار صياغة رسالة واتساب الرسمية للسائق الداخلي
  console.log('\n▶ [اختبار 3] صياغة رسالة WhatsApp الرسمية للسائق الداخلي:');
  const driver = INITIAL_STORE_DRIVERS[0];
  const whatsappMsg = buildDriverWhatsAppMessage('north', mockOrders, driver, FEZ_DELIVERY_ZONES.north);
  if (whatsappMsg.includes(driver.name) && whatsappMsg.includes('#ORD-201') && whatsappMsg.includes('80.00 د.م')) {
    console.log(`   ✓ تم صياغة رسالة واتساب متكاملة وتحتوي على بيانات السائق والمبالغ بنجاح.`);
    passed++;
  } else {
    console.error(`   ❌ فشل في صياغة رسالة واتساب.`);
    failed++;
  }

  // 4️⃣ اختبار فرز السائقين الداخليين حسب تفضيل المنطقة والحالة
  console.log('\n▶ [اختبار 4] فرز السائقين الذكي حسب المنطقة المفضلة:');
  const sortedDrivers = getSortedDriversForZone('north', INITIAL_STORE_DRIVERS);
  if (sortedDrivers.length > 0 && sortedDrivers[0].isPreferred) {
    console.log(`   ✓ تم إعطاء الأولوية للسائق المفضل للمنطقة الشمالية بنجاح (${sortedDrivers[0].driver.name}).`);
    passed++;
  } else {
    console.error(`   ❌ فشل في فرز السائقين.`);
    failed++;
  }

  // 5️⃣ اختبار فرز كباتن التطبيقات السريعة حسب النطاق الجغرافي
  console.log('\n▶ [اختبار 5] فرز كباتن تطبيقات التوصيل السريع (Fast App Couriers):');
  const sortedCouriers = getSortedFastCouriersForZone('north', INITIAL_FAST_COURIERS);
  if (sortedCouriers.length > 0 && sortedCouriers.some((c) => c.appBadgeLabel.length > 0)) {
    console.log(`   ✓ تم فرز كباتن التطبيقات السريعة بنجاح (${sortedCouriers.length} كابتن).`);
    passed++;
  } else {
    console.error(`   ❌ فشل في فرز كباتن التطبيقات.`);
    failed++;
  }

  // 6️⃣ اختبار صياغة رسالة واتساب المخصصة لكابتن التطبيقات السريعة
  console.log('\n▶ [اختبار 6] صياغة رسالة واتساب مخصصة لكابتن تطبيق سريع (Glovo / inDrive):');
  const fastCourier = INITIAL_FAST_COURIERS[0];
  const fastWhatsAppMsg = buildDriverWhatsAppMessage('north', mockOrders, fastCourier, FEZ_DELIVERY_ZONES.north);
  if (
    fastWhatsAppMsg.includes(fastCourier.name) &&
    fastWhatsAppMsg.includes('تطبيق') &&
    fastWhatsAppMsg.includes('80.00 د.م')
  ) {
    console.log(`   ✓ تم توليد رسالة واتساب مخصصة لكابتن التطبيق السريع (${fastCourier.name}) بنجاح.`);
    passed++;
  } else {
    console.error(`   ❌ فشل في توليد رسالة واتساب لكابتن التطبيق.`);
    failed++;
  }

  // 7️⃣ اختبار اعتماد الجولة دفعة واحدة لكابتن تطبيق سريع (Batch Assign)
  console.log('\n▶ [اختبار 7] اعتماد الجولة وتعيين كابتن تطبيق سريع (batchAssignZoneOrders):');
  try {
    const assignRes = await batchAssignZoneOrders({
      orders: mockOrders,
      driver: fastCourier,
      newStatus: 'prepared',
    });
    if (assignRes.success && assignRes.updatedCount === 2) {
      console.log(`   ✓ تم اعتماد الجولة لكابتن التطبيق بنجاح (${assignRes.message}).`);
      passed++;
    } else {
      console.error(`   ❌ فشل في اعتماد الجولة لكابتن التطبيق.`);
      failed++;
    }
  } catch (err: any) {
    console.error(`   ❌ خطأ أثناء اعتماد الجولة لكابتن التطبيق:`, err?.message);
    failed++;
  }

  // 8️⃣ اختبار إغلاق الجولة وتأكيد التسليم لكابتن تطبيق سريع (Close & Deliver)
  console.log('\n▶ [اختبار 8] إغلاق الجولة وتأكيد التسليم لكابتن تطبيق سريع:');
  try {
    const closeRes = await closeAndDeliverZoneTour({
      orders: mockOrders,
      driver: fastCourier,
      zoneKey: 'north',
    });
    if (closeRes.success) {
      console.log(`   ✓ تم إغلاق وتأكيد تسليم الجولة بنجاح (${closeRes.deliveredCount} طلبات).`);
      passed++;
    } else {
      console.error(`   ❌ فشل في إغلاق الجولة.`);
      failed++;
    }
  } catch (err: any) {
    console.error(`   ❌ خطأ أثناء إغلاق الجولة:`, err?.message);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`📊 نتيجة اختبارات مركز الإسناد الموحد وقائمة التطبيقات السريعة: نجح ${passed} من أصل ${passed + failed}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnifiedDispatchTests();
