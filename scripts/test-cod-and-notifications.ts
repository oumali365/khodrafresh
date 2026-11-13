// ============================================================
// scripts/test-cod-and-notifications.ts
// اختبارات تسوية COD وخدمة إشعارات الزبائن لمتجر خُضرة فاس
// ============================================================

import { sendCustomerNotification, buildNotificationMessage, getNotificationLogs } from '../src/services/notificationService';
import type { DbOrder } from '../src/services/supabaseService';

async function runCODAndNotificationTests() {
  console.log('======================================================================');
  console.log('💰📦 بدء اختبارات تسوية التحصيل النقدي (COD) وإشعارات الزبائن لمتجر خُضرة');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1️⃣ اختبار رسائل الإشعارات
  console.log('▶ [اختبار 1] توليد رسائل الإشعارات للزبون:');
  const mockOrder: DbOrder = {
    id: 99,
    order_code: '#ORD-999',
    customer_name: 'عمر الفاسي',
    phone: '0661234567',
    address: 'حي الأطلس، فاس',
    items: [],
    subtotal: 100,
    delivery_fee: 15,
    total: 115,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const confirmationMsg = buildNotificationMessage(mockOrder, 'confirmation');
  if (confirmationMsg.includes('#ORD-999') && confirmationMsg.includes('115.00')) {
    console.log(`   ✓ تم توليد رسالة التأكيد بنجاح: "${confirmationMsg.slice(0, 50)}..."`);
    passed++;
  } else {
    console.error(`   ❌ فشل في توليد رسالة التأكيد.`);
    failed++;
  }

  // 2️⃣ اختبار إرسال الإشعار وتوثيقه في السجل
  console.log('\n▶ [اختبار 2] إرسال الإشعار وتوثيقه في سجل التدقيق:');
  const res = await sendCustomerNotification(mockOrder, 'dispatched', 'whatsapp');
  if (res.success) {
    console.log(`   ✓ تم إرسال الإشعار بنجاح وتوثيقه.`);
    passed++;
  } else {
    console.error(`   ❌ فشل في إرسال الإشعار: ${res.message}`);
    failed++;
  }

  // 3️⃣ التحقق من سجل التدقيق للإشعارات
  console.log('\n▶ [اختبار 3] التحقق من سجل التدقيق (Audit Logs):');
  const logs = getNotificationLogs();
  if (logs.length > 0 && logs[0].orderCode === '#ORD-999') {
    console.log(`   ✓ تم العثور على سجل الإشعار في التدقيق بنجاح (العدد الإجمالي: ${logs.length}).`);
    passed++;
  } else {
    console.error(`   ❌ لم يتم العثور على السجل في التدقيق.`);
    failed++;
  }

  console.log('======================================================================');
  console.log(`📊 نتيجة اختبارات COD والإشعارات: نجح ${passed} من أصل ${passed + failed}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCODAndNotificationTests();
