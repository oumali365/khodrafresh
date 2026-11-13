// ============================================================
// scripts/test-phase5-verification.ts
// سكريبت التحقق الشامل للمرحلة الخامسة: المحرك المالي الموحد والأرباح التشغيلية
// متجر خُضرة — فاس (Khodra Fès)
// ============================================================

import {
  calculateSellingPrice,
  calculateCustomerDeliveryFee,
  calculateOrderFinancials,
  calculateOperatingFinancials,
  TARIFF_STANDARDS,
  getEstimatedZoneDeliveryCost,
} from '../src/services/financialEngine';

function runPhase5Tests() {
  console.log('======================================================================');
  console.log('🧪 بدء اختبارات التحقق من المرحلة الخامسة (Phase 5 Verification Tests)');
  console.log('   المحرك المالي الموحد والأرباح التشغيلية قبل المصاريف العامة');
  console.log('======================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(description: string, condition: boolean, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`✅ [نجاح] ${description}`);
      passedTests++;
    } else {
      console.error(`❌ [فشل] ${description}`, details !== undefined ? details : '');
      throw new Error(`Test failed: ${description}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 1. اختبار حساب الربح التشغيلي ببيانات فعلية كاملة وموثقة
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [1] اختبار حساب الربح التشغيلي ببيانات فعلية كاملة (Full Actual Data):');
  const actualOrder = calculateOrderFinancials({
    productsSubtotal: 200,
    deliveryFeeCollected: 15,
    cogsAmount: 110,
    cogsStatus: 'actual',
    deliveryCost: 22,
    deliveryCostStatus: 'actual',
    packagingCost: 2,
    otherDirectCosts: 0,
  });

  // إيرادات المنتجات = 200، رسوم التوصيل = 15، الإجمالي = 215
  // التكاليف المباشرة = 110 (سلع) + 22 (توصيل) + 2 (تغليف) = 134
  // الربح التشغيلي قبل المصاريف العامة = 215 - 134 = 81 درهم
  assert('الربح التشغيلي قبل المصاريف العامة = 81.00 درهم تماماً', actualOrder.operatingProfitBeforeOverheads === 81.00, {
    opProfit: actualOrder.operatingProfitBeforeOverheads,
    expected: 81.00,
  });
  assert('الربح الإجمالي (grossProfit) يطابق الربح التشغيلي قبل المصاريف العامة', actualOrder.grossProfit === 81.00);
  assert('التوثيق فعلي بالكامل (isEstimated = false)', actualOrder.isEstimated === false);
  assert('تكلفة الشراء غير مقدرة (cogsEstimated = false)', actualOrder.cogsEstimated === false);
  assert('تكلفة التوصيل غير مقدرة (deliveryCostEstimated = false)', actualOrder.deliveryCostEstimated === false);
  assert('صافي هامش خدمة التوصيل = 15 - 22 = -7.00 دراهم', actualOrder.deliveryMargin === -7.00);
  assert('إجمالي التكاليف المباشرة = 134.00 درهم', actualOrder.totalDirectCost === 134.00);

  // ──────────────────────────────────────────────────────────────────
  // 2. اختبار معالجة حالات نقص البيانات والاحتياطيات الآمنة (Safe Fallbacks)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [2] اختبار معالجة نقص البيانات والاحتياطيات التقديرية المعلنة (Safe Fallbacks):');
  const estimatedOrder = calculateOrderFinancials({
    productsSubtotal: 100,
    // توصيل مجاني افتراضي أو لم يُحدد
    deliveryFeeCollected: 0,
    // تكلفة الشراء غير محددة (null)
    cogsAmount: null,
    // تكلفة التوصيل غير محددة (null)
    deliveryCost: null,
    deliveryZone: 'north', // منطقة شمال فاس (تقدير 20 درهم)
    packagingCost: 2,
  });

  // الاحتياطي التقديري لتكلفة الشراء: 60% من 100 = 60 درهم
  assert('تقدير تكلفة الشراء تلقائياً بنسبة 60% = 60.00 درهم', estimatedOrder.effectiveCogs === 60.00, {
    cogs: estimatedOrder.effectiveCogs,
  });
  assert('وسم تكلفة الشراء بأنها تقديرية (cogsStatus = estimated)', estimatedOrder.cogsStatus === 'estimated');
  assert('تفعيل مؤشر التقدير لتكلفة الشراء (cogsEstimated = true)', estimatedOrder.cogsEstimated === true);

  // الاحتياطي التقديري لتكلفة التوصيل لمنطقة شمال فاس: 20 درهم
  assert('تقدير تكلفة التوصيل للمنطقة = 20.00 درهم', estimatedOrder.effectiveDeliveryCost === 20.00, {
    delCost: estimatedOrder.effectiveDeliveryCost,
  });
  assert('وسم تكلفة التوصيل بأنها تقديرية (deliveryCostStatus = estimated)', estimatedOrder.deliveryCostStatus === 'estimated');
  assert('تفعيل مؤشر التقدير للتوصيل (deliveryCostEstimated = true)', estimatedOrder.deliveryCostEstimated === true);

  // إجمالي الإيرادات = 100 + 0 = 100
  // إجمالي التكاليف = 60 + 20 + 2 = 82
  // الربح التشغيلي قبل المصاريف العامة = 100 - 82 = 18.00 درهم
  assert('الربح التشغيلي قبل المصاريف العامة = 18.00 درهم مع وسم التقدير', estimatedOrder.operatingProfitBeforeOverheads === 18.00, {
    opProfit: estimatedOrder.operatingProfitBeforeOverheads,
  });
  assert('الطلب موسوم بأنه يحتوي تكاليف تقديرية (isEstimated = true)', estimatedOrder.isEstimated === true);
  assert('وجود تنبيهات صريحة وموثقة في قائمة التحذيرات', estimatedOrder.warnings.length >= 2);

  // ──────────────────────────────────────────────────────────────────
  // 3. اختبار عدم الخلط بين رسوم العميل وأجور السائق وعدم التكرار
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [3] اختبار منع الخلط بين رسوم العميل وأجور السائق وعدم تكرار الخصم:');
  const subsidizedOrder = calculateOrderFinancials({
    productsSubtotal: 300,
    deliveryFeeCollected: 0, // العميل حصل على توصيل مجاني (> 250 د.م)
    deliveryCost: 25,         // تكلفة المندوب 25 درهماً
    cogsAmount: 180,         // تكلفة الشراء 60%
    packagingCost: 2,
  });

  assert('رسوم العميل المحصلة = 0 درهم (مجاني)', subsidizedOrder.deliveryFeeCollected === 0);
  assert('تكلفة الموصّل لم تتصفر وبقيت 25 درهماً تتحملها الشركة', subsidizedOrder.deliveryCost === 25);
  assert('هامش التوصيل = -25 درهماً (خسارة توصيل استثمارية)', subsidizedOrder.deliveryMargin === -25);
  // (300 + 0) - (180 + 25 + 2) = 300 - 207 = 93 درهم
  assert('الربح التشغيلي يخصم تكلفة التوصيل مرة واحدة فقط = 93.00 درهم', subsidizedOrder.operatingProfitBeforeOverheads === 93.00);

  // ──────────────────────────────────────────────────────────────────
  // 4. اختبار المحرك المركزي الموحد لتجميع وحساب أرباح مجموعة طلبات
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [4] اختبار calculateOperatingFinancials لتجميع طلبات متعددة:');
  const testBatchOrders = [
    // طلب 1: بيانات كاملة (ربح تشغيلي 43)
    {
      id: 101,
      total: 115,
      subtotal: 100,
      delivery_fee: 15,
      cogs_amount: 50,
      cogs_status: 'actual',
      actual_delivery_cost: 20,
      delivery_cost_status: 'actual',
      packaging_cost: 2,
      status: 'delivered',
    },
    // طلب 2: بيانات كاملة مع توصيل مجاني (ربح تشغيلي 93)
    {
      id: 102,
      total: 300,
      subtotal: 300,
      delivery_fee: 0,
      cogs_amount: 180,
      cogs_status: 'actual',
      actual_delivery_cost: 25,
      delivery_cost_status: 'actual',
      packaging_cost: 2,
      status: 'delivered',
    },
    // طلب 3: بيانات تقديرية (ربح تشغيلي 25)
    // subtotal = 80, delivery_fee = 15, total = 95
    // cogs تقديري = 48 (60%), delivery_cost تقديري = 20, packaging = 2
    // OpProfit = 95 - (48 + 20 + 2) = 95 - 70 = 25
    {
      id: 103,
      total: 95,
      subtotal: 80,
      delivery_fee: 15,
      cogs_amount: null, // تقديري
      actual_delivery_cost: null, // تقديري
      delivery_zone: 'north',
      status: 'pending',
    },
    // طلب 4: طلب ملغي (يجب استبعاده)
    {
      id: 104,
      total: 500,
      subtotal: 500,
      status: 'cancelled',
    },
    // طلب 5: طلب محذوف (يجب استبعاده)
    {
      id: 105,
      total: 200,
      subtotal: 200,
      is_deleted: true,
      status: 'delivered',
    },
  ];

  const summary = calculateOperatingFinancials(testBatchOrders);

  assert('عدد الطلبات الفعالة المحتسبة = 3 طلبات (استبعاد الملغي والمحذوف)', summary.ordersCount === 3, {
    ordersCount: summary.ordersCount,
  });
  assert('إيرادات المنتجات = 480.00 درهم (100 + 300 + 80)', summary.productsRevenue === 480.00, {
    rev: summary.productsRevenue,
  });
  assert('رسوم التوصيل المحصلة من العملاء = 30.00 درهم (15 + 0 + 15)', summary.customerDeliveryFees === 30.00, {
    fees: summary.customerDeliveryFees,
  });
  assert('إجمالي الإيرادات = 510.00 درهم (480 + 30)', summary.grossRevenue === 510.00, {
    gross: summary.grossRevenue,
  });
  assert('إجمالي تكلفة الشراء (COGS) = 278.00 درهم (50 + 180 + 48)', summary.cogsTotal === 278.00, {
    cogs: summary.cogsTotal,
  });
  assert('إجمالي تكاليف التوصيل للموصّلين = 65.00 درهم (20 + 25 + 20)', summary.deliveryCostsTotal === 65.00, {
    deliveryCosts: summary.deliveryCostsTotal,
  });
  assert('تكاليف التغليف المباشرة = 6.00 دراهم (3 × 2)', summary.packagingCostsTotal === 6.00);
  assert('إجمالي التكاليف المباشرة = 349.00 درهم (278 + 65 + 6)', summary.totalDirectCosts === 349.00);

  // التحقق من المعادلة الإلزامية:
  // الربح التشغيلي = إجمالي الإيرادات (510) - إجمالي التكاليف المباشرة (349) = 161.00 درهم
  // وهو يطابق تماماً مجموع أرباح الطلبات الثلاثة (43 + 93 + 25 = 161)
  assert('الربح التشغيلي قبل المصاريف العامة = 161.00 درهم مطابق لمجموع الطلبات', summary.operatingProfitBeforeOverheads === 161.00, {
    operatingProfit: summary.operatingProfitBeforeOverheads,
    expected: 161.00,
  });

  const expectedMargin = Number(((161 / 510) * 100).toFixed(2));
  assert(`نسبة هامش الربح التشغيلي = ${expectedMargin}% من إجمالي الإيرادات`, summary.operatingProfitMarginPercent === expectedMargin);
  assert('متوسط قيمة الطلب (AOV) = 170.00 درهم (510 ÷ 3)', summary.averageOrderValue === 170.00);
  assert('متوسط تكلفة التوصيل للطلب = 21.67 درهم (65 ÷ 3)', summary.averageDeliveryCostPerOrder === 21.67);
  assert('صافي هامش خدمة التوصيل = -35.00 دراهم (30 - 65)', summary.deliveryNetMargin === -35.00);

  assert('إحصاء تكلفة الشراء الفعلية (2) والتقديرية (1)', summary.cogsActualCount === 2 && summary.cogsEstimatedCount === 1);
  assert('إحصاء تكلفة التوصيل الفعلية (2) والتقديرية (1)', summary.deliveryActualCount === 2 && summary.deliveryEstimatedCount === 1);
  assert('المؤشر العام يحدد وجود بيانات تقديرية (isFullyActual = false)', summary.isFullyActual === false);

  // ──────────────────────────────────────────────────────────────────
  // 5. اختبار حماية الصفر وحالات الحافة لمنع ظهور NaN أو أخطاء برمجية
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [5] اختبار حالات الحافة وحماية الصفر التامة (Zero & NaN Immunity):');
  const emptySummary = calculateOperatingFinancials([]);
  assert('القائمة الفارغة تعيد 0 طلبات دون أي خطأ', emptySummary.ordersCount === 0);
  assert('الربح التشغيلي للقائمة الفارغة = 0 ولا ينتج NaN', !isNaN(emptySummary.operatingProfitBeforeOverheads) && emptySummary.operatingProfitBeforeOverheads === 0);
  assert('هامش الربح للقائمة الفارغة = 0 ولا ينتج NaN', !isNaN(emptySummary.operatingProfitMarginPercent) && emptySummary.operatingProfitMarginPercent === 0);
  assert('متوسط السلة (AOV) للقائمة الفارغة = 0 دون قسمة على صفر', !isNaN(emptySummary.averageOrderValue) && emptySummary.averageOrderValue === 0);

  const corruptedOrderSummary = calculateOperatingFinancials([{ id: 'corrupt', total: 'invalid' }]);
  assert('البيانات غير المنتظمة تعامل بأمان دون أي انهيار', !isNaN(corruptedOrderSummary.operatingProfitBeforeOverheads));

  console.log('\n======================================================================');
  console.log(`🎉 اكتملت جميع اختبارات المرحلة الخامسة بنجاح تام: ${passedTests} من أصل ${totalTests} اختبار!`);
  console.log('======================================================================');
}

runPhase5Tests();
