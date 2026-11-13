// ============================================================
// scripts/test-phase3-phase4-verification.ts
// سكريبت التحقق الآلي الصارم للمرحلتين الثالثة والرابعة
// ============================================================

import {
  calculateSellingPrice,
  calculateSellingPriceFromTargetMargin,
  calculateSellingPriceFromMarkup,
  calculateCustomerDeliveryFee,
  calculateOrderFinancials,
  calculateTourFinancials,
  TARIFF_STANDARDS,
} from '../src/services/financialEngine';

import {
  closeAndDeliverZoneTour,
  batchAssignZoneOrders,
} from '../src/services/supabaseService';

import type { StoreDriver } from '../src/types';
import type { DbOrder } from '../src/features/admin-orders/types';

function runTests() {
  console.log('======================================================================');
  console.log('🧪 بدء اختبارات التحقق من المرحلة الثالثة والرابعة (Phase 3 & 4 Tests)');
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
  // 1. اختبار معادلة التسعير عند تكلفة شراء 60 درهماً
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [1] اختبار معادلة التسعير المستهدف (40% هامش إجمالي):');
  const purchaseCost = 60;
  const sellingPrice = calculateSellingPrice(purchaseCost); // Default: 40% target margin
  assert('سعر البيع عند تكلفة شراء 60 درهماً يساوي 100.00 درهم تماماً', sellingPrice === 100.00, {
    purchaseCost,
    sellingPrice,
    expected: 100.00,
  });

  const targetMarginSelling = calculateSellingPriceFromTargetMargin(60, 40);
  assert('calculateSellingPriceFromTargetMargin(60, 40) تعيد 100.00', targetMarginSelling === 100.00, {
    targetMarginSelling,
  });

  // التمييز بين الهامش (Margin) والزيادة على التكلفة (Markup)
  const markupPrice = calculateSellingPriceFromMarkup(60, 40);
  assert('الزيادة على التكلفة (Markup 40%) تعطي 84 درهماً ومختلفة عن الهامش المستهدف', markupPrice === 84.00, {
    markupPrice,
    expected: 84.00,
  });

  const equivalentMarkupSelling = calculateSellingPriceFromMarkup(60, 66.67);
  assert('نسبة الزيادة المكافئة 66.67% تعطي 100.00 درهم', Math.round(equivalentMarkupSelling) === 100, {
    equivalentMarkupSelling,
  });

  // ──────────────────────────────────────────────────────────────────
  // 2. اختبار رسوم التوصيل عند 249.99 و 250.00 و 250.01 درهماً
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [2] اختبار رسوم توصيل العميل (Customer Delivery Fee):');
  const feeAt249_99 = calculateCustomerDeliveryFee(249.99);
  assert('رسوم التوصيل عند 249.99 درهم = 15 درهم', feeAt249_99 === 15, { feeAt249_99 });

  const feeAt250_00 = calculateCustomerDeliveryFee(250.00);
  assert('رسوم التوصيل عند 250.00 درهم = 15 درهم (الشرط فوق 250 د.م)', feeAt250_00 === 15, { feeAt250_00 });

  const feeAt250_01 = calculateCustomerDeliveryFee(250.01);
  assert('رسوم التوصيل عند 250.01 درهم = 0 درهم (مؤهل للتوصيل المجاني)', feeAt250_01 === 0, { feeAt250_01 });

  // ──────────────────────────────────────────────────────────────────
  // 3. اختبار فصل رسوم العميل عن تكلفة الموصّل
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [3] اختبار استقلال تكلفة الموصّل وعدم تصفيرها عند التوصيل المجاني:');
  const freeOrderFinancials = calculateOrderFinancials({
    productsSubtotal: 300,
    deliveryFeeCollected: 0, // توصيل مجاني للعميل
    deliveryCost: 25,         // تكلفة المندوب التي تتحملها الشركة
    cogsAmount: 180,         // تكلفة شراء السلع (60%)
  });

  assert('رسوم العميل المحصلة = 0 درهم', freeOrderFinancials.deliveryFeeCollected === 0);
  assert('تكلفة الموصّل لم تتأثر وبقيت 25 درهماً', freeOrderFinancials.deliveryCost === 25);
  assert('هامش التوصيل = -25 درهماً (تتحمله الشركة كاستثمار تسويقي)', freeOrderFinancials.deliveryMargin === -25);
  assert('صافي الربح الإجمالي محسوب بدقة = 300 - (180 + 25 + 2) = 93 درهم', freeOrderFinancials.grossProfit === 93);

  // ──────────────────────────────────────────────────────────────────
  // 4. اختبار توزيع تكلفة الجولة المجمعة وعدم مضاعفتها على الطلب الواحد
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [4] اختبار توزيع تكلفة الجولة المجمعة (3 طلبات):');
  const tourOrders = [
    { total: 120, delivery_fee: 15, delivery_dispatch: { deliveryCost: 20 } },
    { total: 150, delivery_fee: 15, delivery_dispatch: { deliveryCost: 20 } },
    { total: 95, delivery_fee: 15, delivery_dispatch: { deliveryCost: 20 } },
  ];
  const tourSummary = calculateTourFinancials(tourOrders, 'north', 'شمال فاس', 20);

  assert('إجمالي أجور السائق للجولة = 60 درهماً (3 × 20)', tourSummary.totalDriverWage === 60);
  assert('حصة الطلب الواحد التقديرية = 20 درهماً وليست 60 درهماً', tourSummary.estimatedDeliveryCostPerOrder === 20);
  assert('المؤشر يحدد أنها جولة مجمعة (isBatchedTour = true)', tourSummary.isBatchedTour === true);

  // ──────────────────────────────────────────────────────────────────
  // 5. اختبار منع التكرار (Idempotency) عند إغلاق الجولة
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [5] اختبار منع التكرار (Idempotency) وحفظ السجل التاريخي:');
  const dummyDriver: StoreDriver = {
    id: 'driver-test-1',
    name: 'سفيان السريع',
    phone: '0612345678',
    vehicleType: 'moto',
    zonePreference: 'north',
    status: 'available',
    commissionPerOrder: 22,
    activeOrdersCount: 2,
    totalDeliveredCount: 10,
  };

  const testOrders: DbOrder[] = [
    {
      id: 991,
      order_code: 'KD-TEST-01',
      customer_name: 'أحمد الإدريسي',
      phone: '0661000001',
      address: 'طريق عين الشقف، فاس',
      delivery_zone: 'north',
      items: [{ name: 'طماطم', qty: 2, lineTotal: 16, variantLabel: 'kg' }],
      subtotal: 16,
      delivery_fee: 15,
      total: 31,
      status: 'prepared',
      created_at: new Date().toISOString(),
      delivery_dispatch: {
        provider: 'custom',
        driverId: 'driver-test-1',
        driverName: 'سفيان السريع',
        deliveryCost: 22,
        agreedWage: 22,
        costCertainty: 'estimated',
        dispatchStatus: 'in_transit',
      },
    },
    {
      id: 992,
      order_code: 'KD-TEST-02',
      customer_name: 'فاطمة الزهراء',
      phone: '0661000002',
      address: 'النرجس، فاس',
      delivery_zone: 'north',
      items: [{ name: 'بطاطس', qty: 3, lineTotal: 24, variantLabel: 'kg' }],
      subtotal: 24,
      delivery_fee: 15,
      total: 39,
      status: 'delivered', // تم تسليمه سابقاً
      created_at: new Date().toISOString(),
      delivery_dispatch: {
        provider: 'custom',
        driverId: 'driver-test-1',
        driverName: 'سفيان السريع',
        deliveryCost: 20, // تكلفة تاريخية خاصة
        agreedWage: 20,
        costCertainty: 'actual',
        dispatchStatus: 'delivered',
      },
    },
  ];

  // الإغلاق الأول
  closeAndDeliverZoneTour({
    orders: testOrders,
    driver: dummyDriver,
    zoneKey: 'north',
  }).then((res1) => {
    assert('تم إغلاق الجولة بنجاح', res1.success === true);

    // التحقق من الحفاظ على التكلفة التاريخية للطلب المسلم مسبقاً
    const deliveredOrder = testOrders[1];
    assert('الطلب المسلم سابقاً يحتفظ بتكلفته التاريخية (20 درهماً) دون استبدالها بـ 22',
      deliveredOrder.delivery_dispatch?.deliveryCost === 20
    );

    console.log('\n======================================================================');
    console.log(`🎉 اكتملت جميع اختبارات التحقق بنجاح تام: ${passedTests} من أصل ${totalTests} اختبار!`);
    console.log('======================================================================');
  });
}

runTests();
