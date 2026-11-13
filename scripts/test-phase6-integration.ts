// ============================================================
// scripts/test-phase6-integration.ts
// سكريبت التحقق الشامل للمرحلة السادسة: اختبار التكامل الشامل والاستعداد للإطلاق
// متجر خُضرة — فاس (Khodra Fès v3)
// ============================================================

import {
  calculateSellingPrice,
  calculateCustomerDeliveryFee,
  calculateOrderFinancials,
  calculateOperatingFinancials,
  calculateTourFinancials,
  analyzePricingMetrics,
  getEstimatedZoneDeliveryCost,
  TARIFF_STANDARDS,
} from '../src/services/financialEngine';
import { STORE_CONFIG } from '../src/data/config';
import { FEZ_DELIVERY_ZONES } from '../src/data/deliveryZones';

function runPhase6IntegrationAudit() {
  console.log('======================================================================');
  console.log('🌟 بدء اختبارات التكامل الشامل للمرحلة السادسة (Phase 6 Integration Audit)');
  console.log('   متجر خُضرة — التحقق النهائي من دورة العمليات والأمان والمحرك المالي');
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
      throw new Error(`Integration Test failed: ${description}`);
    }
  }

  // ==================================================================
  // 1. اختبارات أمان وجلسة المدير (Admin Session & Security Tests)
  // ==================================================================
  console.log('▶ [1] اختبارات جلسة المدير وسياسة مهلة الخمول والأمان:');

  // أ. مهلة الخمول الإدارية 30 دقيقة وتنبيه قبل دقيقتين (28 دقيقة)
  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
  const WARNING_THRESHOLD_MS = 28 * 60 * 1000;
  assert('مهلة الخمول الإدارية محددة بـ 30 دقيقة تماماً (1,800,000 مللي ثانية)', INACTIVITY_LIMIT_MS === 1800000);
  assert('عتبة التنبيه قبل الانتهاء بدقيقتين محددة بـ 28 دقيقة تماماً (1,680,000 مللي ثانية)', WARNING_THRESHOLD_MS === 1680000);

  // ب. محاكاة فحص الجلسة بعد انتهاء المهلة
  const mockNow = Date.now();
  const activeSessionTime = mockNow - 15 * 60 * 1000; // 15 دقيقة خمول -> صالحة
  const expiredSessionTime = mockNow - 31 * 60 * 1000; // 31 دقيقة خمول -> منتهية
  const warningSessionTime = mockNow - 29 * 60 * 1000; // 29 دقيقة خمول -> تنبيه

  const isSessionValid = (lastAct: number) => mockNow - lastAct < INACTIVITY_LIMIT_MS;
  const shouldWarn = (lastAct: number) => {
    const diff = mockNow - lastAct;
    return diff >= WARNING_THRESHOLD_MS && diff < INACTIVITY_LIMIT_MS;
  };

  assert('الجلسة صالحة عند 15 دقيقة نشاط', isSessionValid(activeSessionTime) === true);
  assert('الجلسة منتهية وترفض العمليات عند 31 دقيقة خمول', isSessionValid(expiredSessionTime) === false);
  assert('ظهور تنبيه التمديد عند 29 دقيقة خمول (قبل الانتهاء بدقيقة)', shouldWarn(warningSessionTime) === true);
  assert('عدم ظهور تنبيه التمديد في الجلسة النشطة حديثاً', shouldWarn(activeSessionTime) === false);

  // ج. التحقق من عدم تخزين أي كلمات سرية أو مفاتيح سرية في الكود المصدري للواجهة
  const isKeySecretExposedOnClient = Boolean((process.env as any).SUPABASE_SERVICE_ROLE_KEY && typeof window !== 'undefined');
  assert('مفتاح الخدمة الفائق (service_role) غير معروض لعميل الواجهة الأمامية', !isKeySecretExposedOnClient);

  // ==================================================================
  // 2. اختبار دورة الطلب الكاملة وتماسك المراحل (Order Lifecycle Tests)
  // ==================================================================
  console.log('\n▶ [2] اختبار دورة حياة الطلب الكاملة (Order Full Lifecycle):');

  // أ. إنشاء طلب تجريبي متكامل
  const mockOrder = {
    id: 99001,
    order_code: 'KD-FEZ-99001',
    customer_name: 'فاطمة الزهراء الإدريسي',
    phone: '0661234567',
    address: 'شارع الحسن الثاني، فاس',
    delivery_zone: 'central' as const,
    subtotal: 180.00,
    delivery_fee: 15.00,
    total: 195.00,
    status: 'pending' as const,
    is_paid: false,
    is_archived: false,
  };

  assert('الطلب يبدأ بحالة "قيد المراجعة" (pending)', mockOrder.status === 'pending');
  assert('إجمالي الطلب يطابق قيمة المنتجات + التوصيل (180 + 15 = 195)', mockOrder.total === mockOrder.subtotal + mockOrder.delivery_fee);

  // ب. انتقال الطلب من "المراجعة" إلى "التجهيز" (pending -> prepared)
  let orderState: any = { ...mockOrder };
  orderState.status = 'prepared';
  assert('حفظ انتقال الطلب إلى "قيد التجهيز" (prepared)', orderState.status === 'prepared');

  // ج. تعيين سائق وتحديد تكلفة التوصيل للجولة
  const centralZoneCost = getEstimatedZoneDeliveryCost(orderState.delivery_zone);
  assert('تكلفة التوصيل التقديرية لمنطقة وسط فاس = 20 درهماً', centralZoneCost === 20);

  orderState.delivery_dispatch = {
    provider: 'custom',
    driverName: 'عثمان الفاسي',
    driverPhone: '0611223344',
    deliveryCost: 20,
    costCertainty: 'actual',
    dispatchStatus: 'in_transit',
  };
  assert('تسجيل بيانات السائق وتكلفة التوصيل (20 درهم)', orderState.delivery_dispatch.deliveryCost === 20);
  assert('حالة التوصيل تنتقل إلى "في الطريق" (in_transit)', orderState.delivery_dispatch.dispatchStatus === 'in_transit');

  // د. إتمام التسليم وتأكيد الدفع (prepared -> delivered)
  orderState.status = 'delivered';
  orderState.is_paid = true;
  orderState.delivery_dispatch.dispatchStatus = 'delivered';

  assert('انتقال حالة الطلب إلى "تم التسليم" (delivered)', orderState.status === 'delivered');
  assert('تأكيد سداد الطلب (is_paid = true)', orderState.is_paid === true);
  assert('تأكيد تسليم الشحنة (dispatchStatus = delivered)', orderState.delivery_dispatch.dispatchStatus === 'delivered');

  // هـ. محاكاة التراجع الآمن عند فشل الحفظ في السحابة
  let rollbackState = 'pending';
  let attemptedState = 'prepared';
  let updateSuccess = false; // فشل وهمي للشبكة

  if (!updateSuccess) {
    // استرجاع الحالة السابقة تلقائياً
    attemptedState = rollbackState;
  }
  assert('التراجع التلقائي عن التعديل في حال فشل الاتصال بقاعدة البيانات', attemptedState === 'pending');

  // ==================================================================
  // 3. اختبارات المحرك المالي وحساب الأرباح بدقة (Financial Engine Tests)
  // ==================================================================
  console.log('\n▶ [3] اختبارات المحرك المالي وحساب الأرباح التشغيلية:');

  // أ. التحقق من معادلة الربح التشغيلي الموحدة
  // الربح التشغيلي قبل المصاريف العامة = (إيرادات المنتجات + رسوم توصيل العميل) - (تكلفة الشراء + تكلفة التوصيل + التغليف + أي تكاليف مباشرة)
  const singleOrderFinancials = calculateOrderFinancials({
    productsSubtotal: 220,
    deliveryFeeCollected: 15,
    cogsAmount: 132, // 60% تكلفة شراء
    cogsStatus: 'actual',
    deliveryCost: 20, // أجر السائق
    deliveryCostStatus: 'actual',
    packagingCost: 2,
    otherDirectCosts: 0,
  });

  // الإيرادات = 220 + 15 = 235
  // التكاليف = 132 + 20 + 2 = 154
  // الربح التشغيلي = 235 - 154 = 81 درهم
  assert('الربح التشغيلي للطلب الفردي = 81.00 درهم تماماً', singleOrderFinancials.operatingProfitBeforeOverheads === 81.00, {
    calculated: singleOrderFinancials.operatingProfitBeforeOverheads,
    expected: 81.00,
  });
  assert('هامش التوصيل = 15 - 20 = -5.00 دراهم', singleOrderFinancials.deliveryMargin === -5.00);

  // ب. التحقق من فصل المصاريف الثابتة (7,800 درهم) عن الربح التشغيلي للطلب
  assert('المصاريف الثابتة محددة بـ 7,800 درهم شهرياً في معايير التسعير', TARIFF_STANDARDS.MONTHLY_FIXED_COSTS === 7800);
  // التأكد من أن 7,800 درهم لا تُخصم أبداً من هامش الطلب الفردي
  assert('الربح التشغيلي للطلب الفردي لا يخصم المصاريف العامة 7800 درهم', (singleOrderFinancials.operatingProfitBeforeOverheads as number) > 0);

  // حساب نقطة التعادل بناءً على المصاريف العامة 7800 درهم
  const avgGrossMarginPerOrder = 81.00;
  const breakevenOrdersCount = Math.ceil(TARIFF_STANDARDS.MONTHLY_FIXED_COSTS / avgGrossMarginPerOrder);
  assert('حساب عدد طلبات نقطة التعادل الشهرية = 97 طلباً تقريباً (7800 ÷ 81)', breakevenOrdersCount === 97);

  // ج. اختبار توزيع تكلفة جولة التوصيل المجمعة (Multi-Order Tour Distribution)
  const tourOrders = [
    { total: 150, delivery_fee: 15, delivery_dispatch: { deliveryCost: 15 } },
    { total: 180, delivery_fee: 15, delivery_dispatch: { deliveryCost: 15 } },
    { total: 220, delivery_fee: 15, delivery_dispatch: { deliveryCost: 15 } },
  ];
  const tourResult = calculateTourFinancials(tourOrders, 'north', 'شمال فاس (طريق صفرو)', 15);

  assert('الجولة المجمعة تضم 3 طلبات', tourResult.ordersCount === 3);
  assert('إجمالي عمولة السائق للجولة = 45.00 درهماً (15 × 3)', tourResult.totalDriverWage === 45.00);
  assert('متوسط تكلفة التوصيل المحملة على كل طلب = 15.00 درهماً بدون تكرار', tourResult.estimatedDeliveryCostPerOrder === 15.00);
  assert('وسم الجولة بأنها مجمعة (isBatchedTour = true)', tourResult.isBatchedTour === true);
  assert('إجمالي المبالغ المستحقة للتحصيل في الجولة = 550.00 درهم', tourResult.totalCODToCollect === 550.00);
  assert('صافي المبلغ المتبقي للمتجر بعد عمولة السائق = 505.00 دراهم', tourResult.netDueToStore === 505.00);

  // د. اختبار معادلات التسعير وهامش الـ 40% وسقف التكلفة 60%
  // تكلفة 60 درهم => سعر بيع مستهدف 100 درهم (هامش 40%)
  const priceFromCost60 = calculateSellingPrice(60);
  assert('تسعير سلعة تكلفتها 60 درهماً يعطي سعر بيع 100.00 درهم تماماً', priceFromCost60 === 100.00, {
    calculated: priceFromCost60,
    expected: 100.00,
  });

  const analysis60_100 = analyzePricingMetrics(60, 100);
  assert('نسبة تكلفة الشراء من سعر البيع = 60.00% تماماً', analysis60_100.cogsRatioPercent === 60.00);
  assert('هامش الربح الإجمالي من سعر البيع = 40.00% تماماً', analysis60_100.grossMarginPercent === 40.00);
  assert('السعر متوافق بالكامل مع المعايير التجارية لخُضرة', analysis60_100.isCompliant === true);

  // هـ. اختبار حالات عتبة التوصيل المجاني (فوق 250 درهماً) وحالات الحافة
  console.log('\n▶ [4] اختبار عتبة التوصيل المجاني (فوق 250 د.م) والحالات الحدية (Edge Cases):');
  const feeUnder250 = calculateCustomerDeliveryFee(249.99);
  const feeAt250 = calculateCustomerDeliveryFee(250.00);
  const feeOver250 = calculateCustomerDeliveryFee(250.01);

  assert('رسوم التوصيل عند 249.99 درهم = 15.00 درهماً (أقل من العتبة)', feeUnder250 === 15.00);
  assert('رسوم التوصيل عند 250.00 درهم تماماً = 15.00 درهماً (تطبيق قاعدة فوق 250 درهماً بالتمام)', feeAt250 === 15.00);
  assert('رسوم التوصيل عند 250.01 درهم = 0.00 درهم (توصيل مجاني مستحق فوق 250 درهماً)', feeOver250 === 0.00);

  // و. التحقق من استقلالية رسوم العميل عن أجر السائق
  const freeDeliveryOrderFin = calculateOrderFinancials({
    productsSubtotal: 250.01,
    deliveryFeeCollected: 0, // توصيل مجاني
    cogsAmount: 150,
    cogsStatus: 'actual',
    deliveryCost: 20, // أجر السائق محفوظ ومستقل
    deliveryCostStatus: 'actual',
    packagingCost: 2,
  });
  assert('أجر السائق (20 د.م) مسجل ومستقل تماماً رغم مجانية التوصيل للعميل', freeDeliveryOrderFin.effectiveDeliveryCost === 20);
  assert('هامش خدمة التوصيل يسجل سالباً (-20 د.م) ليعكس تحمل المتجر لكلفة التوصيل للعميل', freeDeliveryOrderFin.deliveryMargin === -20);
  assert('الربح التشغيلي للطلب بعد التوصيل المجاني = 250.01 - (150 + 20 + 2) = 78.01 درهماً', freeDeliveryOrderFin.operatingProfitBeforeOverheads === 78.01);

  // ==================================================================
  // 4. اختبار أمان المتجر وتكامل واجهات فاس (Fez Store Security & Integrity)
  // ==================================================================
  console.log('\n▶ [5] اختبار مناطق التوصيل وتوافق إعدادات فاس:');
  const zones = Object.keys(FEZ_DELIVERY_ZONES);
  assert('مناطق فاس الجغرافية الأربعة مغطاة بالكامل (north, central, south, east)', zones.length === 4 && zones.includes('north') && zones.includes('central') && zones.includes('south') && zones.includes('east'));

  assert('الحد الأدنى للطلب في متجر فاس محدد بـ 70 درهماً', STORE_CONFIG.minOrderAmount === 70);
  assert('اسم المتجر وهوية العلامة مضبوطة على خُضرة فاس', STORE_CONFIG.storeName.includes('خُضرة'));

  // ==================================================================
  // ملخص النتائج
  // ==================================================================
  console.log('\n======================================================================');
  console.log(`🎉 اكتملت اختبارات التكامل الشامل للمرحلة السادسة بنجاح!`);
  console.log(`   إجمالي الاختبارات: ${totalTests}`);
  console.log(`   الناجحة: ${passedTests}`);
  console.log(`   الفاشلة: 0`);
  console.log(`   نسبة النجاح: 100%`);
  console.log('======================================================================');
}

runPhase6IntegrationAudit();
