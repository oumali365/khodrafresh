// ============================================================
// scripts/test-order-intelligence.ts
// اختبارات وحدة النظام الذكي لمعالجة الطلبات والتصنيف الجغرافي وطابور الأولوية
// متجر خُضرة — فاس (Khodra Fès)
// ============================================================

import { detectAddressZone } from '../src/data/deliveryZones';
import { analyzeOrderIntelligence, sortOrdersByPriority, DEFAULT_ALERTS_CONFIG } from '../src/features/admin-orders/orderIntelligence';
import type { DbOrder } from '../src/features/admin-orders/types';

function runOrderIntelligenceTests() {
  console.log('======================================================================');
  console.log('🧠 بدء اختبارات وحدة النظام الذكي والتحليل الجغرافي لمتجر خُضرة فاس');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1️⃣ اختبار تصنيف الأحياء باللغتين العربية والفرنسية
  console.log('▶ [اختبار 1] التصنيف التلقائي للأحياء (عربي ولاتيني):');
  const testCases = [
    { address: 'حي الأطلس قرب صيدلية النرجس، فاس', expectedZone: 'north', expectedStatus: 'accepted' },
    { address: 'Route d Imouzzer, Ville Nouvelle, Fes', expectedZone: 'central', expectedStatus: 'accepted' },
    { address: 'حي بنسودة قرب الحي الصناعي فاس', expectedZone: 'south', expectedStatus: 'accepted' },
    { address: 'حي الزهور طريق صفرو فاس', expectedZone: 'east', expectedStatus: 'accepted' },
    { address: 'فاس البالي، الرصيف', expectedZone: 'east', expectedStatus: 'accepted' },
  ];

  testCases.forEach((tc, idx) => {
    const res = detectAddressZone(tc.address);
    if (res.status === tc.expectedStatus && res.zoneId === tc.expectedZone) {
      console.log(`   ✓ الحالة ${idx + 1} (${tc.address}): تم التصنيف بنجاح إلى القطاع (${res.zoneName})`);
      passed++;
    } else {
      console.error(`   ❌ فشل الحالة ${idx + 1} (${tc.address}): النتيجة كانت (${res.zoneId || res.status}) وليست (${tc.expectedZone})`);
      failed++;
    }
  });

  // 2️⃣ اختبار رفض العناوين خارج مدينة فاس
  console.log('\n▶ [اختبار 2] رفض العناوين خارج مدينة فاس (Out of Area):');
  const rejectedCases = [
    'شارع محمد الخامس، الدار البيضاء',
    'أكدال، الرباط',
    'جليز، مراكش',
  ];

  rejectedCases.forEach((addr, idx) => {
    const res = detectAddressZone(addr);
    if (res.status === 'rejected') {
      console.log(`   ✓ تم رفض العنوان ${idx + 1} (${addr}) بنجاح: ${res.message}`);
      passed++;
    } else {
      console.error(`   ❌ فشل في رفض العنوان ${idx + 1} (${addr})`);
      failed++;
    }
  });

  // 3️⃣ اختبار العناوين الغامضة (المراجعة اليدوية)
  console.log('\n▶ [اختبار 3] التعامل مع العناوين الغامضة (قائمة المراجعة اليدوية):');
  const ambiguousRes = detectAddressZone('شارع الحسن الثاني قرب العمارة الكبرى');
  if (ambiguousRes.status === 'ambiguous') {
    console.log(`   ✓ تم تصنيف العنوان الغامض كـ ambiguous للمراجعة اليدوية بنجاح.`);
    passed++;
  } else {
    console.error(`   ❌ فشل في التعامل مع العنوان الغامض.`);
    failed++;
  }

  // 4️⃣ اختبار طابور الأولوية وحساب وقت الانتظار
  console.log('\n▶ [اختبار 4] اختبار طابور الأولوية (Priority Queue):');
  const mockOrders: DbOrder[] = [
    {
      id: 1,
      order_code: '#ORD-101',
      customer_name: 'أحمد العلمي',
      phone: '0661111111',
      address: 'حي الأطلس، فاس',
      items: [],
      subtotal: 100,
      delivery_fee: 15,
      total: 115,
      status: 'prepared',
      created_at: new Date(Date.now() - 10 * 60000).toISOString(), // قبل 10 دقائق
    },
    {
      id: 2,
      order_code: '#ORD-102',
      customer_name: 'فاطمة الزهراء',
      phone: '0662222222',
      address: 'عنوان غامض بدون حي معروف',
      items: [],
      subtotal: 150,
      delivery_fee: 15,
      total: 165,
      status: 'pending',
      created_at: new Date(Date.now() - 50 * 60000).toISOString(), // قبل 50 دقيقة (متأخر وبدون قطاع)
    },
  ];

  const sortedQueue = sortOrdersByPriority(mockOrders, DEFAULT_ALERTS_CONFIG);
  if (sortedQueue.length === 2 && sortedQueue[0].order.id === 2) {
    console.log(`   ✓ طابور الأولوية رتب الطلب المتأخر وغير المصنف في المقدمة بنجاح (Score: ${sortedQueue[0].metrics.score}).`);
    passed++;
  } else {
    console.error(`   ❌ فشل في ترتيب طابور الأولوية.`);
    failed++;
  }

  console.log('======================================================================');
  console.log(`📊 نتيجة اختبارات النظام الذكي: نجح ${passed} من أصل ${passed + failed}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runOrderIntelligenceTests();
