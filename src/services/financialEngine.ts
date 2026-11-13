// ============================================================
// src/services/financialEngine.ts
// المحرك الحسابي والمالي الموحد لمتجر خُضرة — فاس (Khodra Fès)
// مصدر الحقيقة الوحيد لجميع المعادلات الحسابية والتشغيلية
// ============================================================

import { CartItem } from '../types';

/**
 * ────────────────────────────────────────────────────────────
 * 1. درجات ومستويات توثيق التكلفة (Cost Certainty Levels)
 * ────────────────────────────────────────────────────────────
 */
export type CostCertainty = 'actual' | 'estimated' | 'unknown';

/**
 * الحالة المالية للطلب
 */
export type FinancialStatus = 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';

/**
 * حالة تنفيذ التوصيل
 */
export type DispatchExecutionStatus =
  | 'unassigned'
  | 'ready_for_pickup'
  | 'waiting_driver'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'returned'
  | 'cancelled';

/**
 * ────────────────────────────────────────────────────────────
 * 2. ثوابت التعريفات التشغيلية والمالية المعتمدة (Tariff Standards)
 * لكل رقم وظيفة محددة وموثقة بوضوح لمنع أي خلط:
 * ────────────────────────────────────────────────────────────
 */
export const TARIFF_STANDARDS = {
  /**
   * 15 DH: رسوم التوصيل القياسية المحصلة من العميل للطلبات دون 250 درهماً
   */
  CUSTOMER_STANDARD_DELIVERY_FEE: 15,

  /**
   * 250 DH: عتبة التوصيل المجاني للعميل لتحفيز رفع متوسط السلة
   */
  FREE_DELIVERY_THRESHOLD: 250,

  /**
   * 70 DH: الحد الأدنى لقيمة السلة الإجمالية (شاملة التوصيل) لحماية المتجر من الخسائر
   */
  MIN_ORDER_AMOUNT: 70,

  /**
   * 25 DH: الأجرة الافتراضية المعتمدة للسائق للطلب الفردي المنفصل (Single Order Driver Wage)
   */
  DEFAULT_DRIVER_ORDER_WAGE: 25,

  /**
   * 8 DH: تكلفة التوصيل التقديرية للطلب الواحد في الجولة المجمعة (Batched Tour Delivery Cost)
   * مبنية على توزيع جولة سريعة (3-4 طلبات بتكلفة 25-32 درهماً)
   */
  BATCHED_ORDER_ESTIMATED_DELIVERY_COST: 8,

  /**
   * 2 DH: تكلفة التغليف والأكياس الورقية والملصقات للطلب الواحد
   */
  STANDARD_PACKAGING_COST: 2,

  /**
   * 60%: الحد الأقصى المستهدف لنسبة تكلفة شراء السلع من قيمة السلع المباعة (Target Max COGS Ratio)
   * تنبيه إلزامي: أي طلب تتجاوز تكلفة سلعته 60% من قيمة السلع وحدها يخضع للتنبيه
   * إذا كانت تكلفة الشراء 5 دراهم، فإن السعر المستهدف عند حد 60% هو: 5 ÷ 0.60 = 8.33 دراهم
   */
  TARGET_COGS_MAX_RATIO: 0.60,

  /**
   * 40%: متوسط هامش الربح الإجمالي الوحيد المعتمد للمتجر من سعر البيع (Target Gross Margin)
   * المعادلة المعتمدة: سعر البيع = تكلفة الشراء ÷ (1 − الهامش المستهدف) = التكلفة ÷ 0.60
   */
  TARGET_GROSS_MARGIN_PERCENT: 40,

  /**
   * 66.67%: نسبة الزيادة على التكلفة (Markup on Cost) المكافئة لهامش إجمالي 40%
   */
  RECOMMENDED_MARKUP_PERCENT: 66.67,

  /**
   * 26: عدد أيام العمل المعتمدة شهرياً في النمذجة الاقتصادية
   */
  MONTHLY_WORKING_DAYS: 26,

  /**
   * 7,800 DH: المصاريف التشغيلية الثابتة شهرياً لمقر الفرز والتجهيز
   */
  MONTHLY_FIXED_COSTS: 7800,
} as const;

/**
 * ────────────────────────────────────────────────────────────
 * 3. واجهات نماذج البيانات الموحدة (Unified Data Contracts)
 * ────────────────────────────────────────────────────────────
 */

/**
 * تفكيك وتحليل مقاييس التسعير الثلاثة وفق القواعد التجارية لخُضرة
 */
export interface PricingMetricsAnalysis {
  purchaseCost: number;
  sellingPrice: number;
  /** 1. نسبة تكلفة الشراء من سعر البيع = (التكلفة ÷ سعر البيع) × 100 (الحد الأقصى المستهدف: 60%) */
  cogsRatioPercent: number;
  /** 2. هامش الربح الإجمالي من سعر البيع = ((سعر البيع - التكلفة) ÷ سعر البيع) × 100 (المستهدف: 40%) */
  grossMarginPercent: number;
  /** 3. نسبة الزيادة على التكلفة (Markup) = ((سعر البيع - التكلفة) ÷ التكلفة) × 100 */
  markupPercent: number;
  /** هل يحترم السعر سقف تكلفة الشراء 60%؟ */
  isCompliant: boolean;
  /** سعر البيع المستهدف المتوافق = التكلفة ÷ 0.60 */
  compliantTargetPrice: number;
  /** التنبيه أو التوجيه التجاري */
  complianceMessage: string;
}

/**
 * تفصيل وتفكيك التكاليف والأرباح للطلب الواحد
 */
export interface OrderFinancialBreakdown {
  /** 1. قيمة المنتجات وحدها قبل أي خصم */
  productsSubtotal: number;

  /** 2. قيمة الخصم المعتمد على السلع */
  discountAmount: number;

  /** 3. صافي قيمة المنتجات المباعة (productsSubtotal - discountAmount) */
  netProductsAmount: number;

  /** 4. رسوم التوصيل المحصلة من العميل (15 درهماً أو 0 درهم) */
  deliveryFeeCollected: number;

  /** 5. الإجمالي المطلوب من العميل نقداً أو تحويلاً (netProductsAmount + deliveryFeeCollected) */
  customerGrandTotal: number;

  /** 6. تكلفة شراء المنتجات المباعة (COGS) */
  cogsAmount: number | null;

  /** 7. حالة ودرجة توثيق تكلفة الشراء */
  cogsStatus: CostCertainty;

  /** 8. نسبة تكلفة الشراء = cogsAmount ÷ netProductsAmount (دون إدخال التوصيل في المقام!) */
  cogsRatio: number | null;

  /** 9. هل تجاوزت تكلفة الشراء السقف المستهدف (60%)؟ */
  cogsExceedsTarget: boolean;

  /** 10. تكلفة تنفيذ التوصيل المسددة للسائق أو التطبيق */
  deliveryCost: number | null;

  /** 11. حالة ودرجة توثيق تكلفة التوصيل */
  deliveryCostStatus: CostCertainty;

  /** 12. تكلفة التغليف والكرتون */
  packagingCost: number;

  /** 13. إجمالي التكاليف المباشرة المعلومة (COGS + Delivery + Packaging + Other) */
  totalDirectCost: number | null;

  /** 14. هل توجد تكلفة أساسية اعتمدت على التقدير؟ */
  isEstimated: boolean;

  /** هل تم تقدير تكلفة الشراء لعدم توفرها؟ */
  cogsEstimated: boolean;

  /** هل تم تقدير تكلفة التوصيل لعدم توفرها؟ */
  deliveryCostEstimated: boolean;

  /** القيمة الفعالة المعتمدة لتكلفة الشراء (سواء فعلية أو تقديرية 60%) */
  effectiveCogs: number;

  /** القيمة الفعالة المعتمدة لتكلفة التوصيل (سواء فعلية أو تقديرية للمنطقة) */
  effectiveDeliveryCost: number;

  /** 15. أي تكاليف مباشرة إضافية غير محتسبة سابقاً */
  otherDirectCosts: number;

  /** 16. الربح التشغيلي قبل المصاريف العامة = (إيرادات المنتجات + رسوم توصيل العميل) - (تكلفة الشراء + تكلفة التوصيل + التغليف + التكاليف المباشرة الإضافية) */
  operatingProfitBeforeOverheads: number;

  /** 17. الربح التشغيلي الإجمالي للطلب (مطابق للربح التشغيلي قبل المصاريف العامة) */
  grossProfit: number | null;

  /** 18. هامش الربح التشغيلي كنسبة مئوية من صافي قيمة المنتجات */
  grossMarginPercent: number | null;

  /** 19. هامش التوصيل = (رسوم التوصيل المحصلة - تكلفة تنفيذ التوصيل) */
  deliveryMargin: number | null;

  /** 20. قائمة التحذيرات التشغيلية والمالية إن وجدت */
  warnings: string[];
}

/**
 * ────────────────────────────────────────────────────────────
 * الملخص المالي والتشغيلي الموحد لعدة طلبات (Operating Financials Summary)
 * مصدر الحقيقة المركزي للأرباح التشغيلية قبل المصاريف العامة
 * ────────────────────────────────────────────────────────────
 */
export interface OperatingFinancialsSummary {
  /** 1. عدد الطلبات الفعالة المؤهلة للحساب */
  ordersCount: number;

  /** 2. إيرادات المنتجات وحدها (دون رسوم التوصيل) */
  productsRevenue: number;

  /** 3. رسوم التوصيل المحصلة من العملاء */
  customerDeliveryFees: number;

  /** 4. إجمالي الإيرادات الإجمالية = إيرادات المنتجات + رسوم التوصيل */
  grossRevenue: number;

  /** 5. إجمالي تكلفة شراء المنتجات المباعة (COGS) */
  cogsTotal: number;
  /** نسبة تكلفة الشراء من إيرادات المنتجات = (cogsTotal ÷ productsRevenue) × 100 */
  cogsRatioPercent: number;
  /** عدد الطلبات ذات تكلفة الشراء الفعلية المؤكدة */
  cogsActualCount: number;
  /** عدد الطلبات ذات تكلفة الشراء التقديرية (بناءً على سقف 60%) */
  cogsEstimatedCount: number;

  /** 6. إجمالي تكاليف التوصيل للموصّلين */
  deliveryCostsTotal: number;
  /** تكاليف التوصيل الفعلية المؤكدة */
  actualDeliveryCostsTotal: number;
  /** تكاليف التوصيل التقديرية */
  estimatedDeliveryCostsTotal: number;
  /** عدد الطلبات ذات تكلفة التوصيل الفعلية */
  deliveryActualCount: number;
  /** عدد الطلبات ذات تكلفة التوصيل التقديرية */
  deliveryEstimatedCount: number;

  /** 7. تكاليف التغليف المباشرة للطلبات */
  packagingCostsTotal: number;

  /** 8. التكاليف المباشرة الإضافية غير المحتسبة سابقاً */
  otherDirectCostsTotal: number;

  /** 9. إجمالي التكاليف المباشرة = COGS + تكاليف التوصيل + التغليف + المباشرة الإضافية */
  totalDirectCosts: number;

  /** 10. الربح التشغيلي قبل المصاريف العامة =
   * إيرادات المنتجات + رسوم توصيل العميل - تكلفة شراء المنتجات - تكلفة التوصيل - التكاليف المباشرة */
  operatingProfitBeforeOverheads: number;

  /** 11. نسبة الربح التشغيلي قبل المصاريف العامة من إجمالي الإيرادات % */
  operatingProfitMarginPercent: number;

  /** 12. نسبة الربح التشغيلي قبل المصاريف العامة من إيرادات المنتجات % */
  operatingProfitToProductsMarginPercent: number;

  /** 13. متوسط قيمة الطلب (AOV - Average Order Value) = إجمالي الإيرادات ÷ عدد الطلبات */
  averageOrderValue: number;

  /** 14. متوسط تكلفة التوصيل للطلب = إجمالي تكاليف التوصيل ÷ عدد الطلبات */
  averageDeliveryCostPerOrder: number;

  /** 15. متوسط رسوم التوصيل المحصلة من العميل للطلب */
  averageCustomerDeliveryFeePerOrder: number;

  /** 16. صافي هامش خدمة التوصيل للمتجر = رسوم العميل المحصلة - تكاليف التوصيل المسددة */
  deliveryNetMargin: number;

  /** 17. هل تعتمد الحسابات كلياً على بيانات فعلية مؤكدة؟ */
  isFullyActual: boolean;

  /** 18. تنبيهات مالية وتشغيلية */
  warnings: string[];
}

/**
 * نموذج عملية التوصيل المرتبطة بالطلب
 */
export interface DeliveryDispatchRecord {
  orderId: string | number;
  orderCode: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  provider: 'internal_driver' | 'indrive' | 'done' | 'yassir' | 'glovo' | 'custom';
  zoneId: 'north' | 'central' | 'south' | 'east';
  agreedWage: number;
  extraExpenses?: number;
  totalDeliveryCost: number;
  costCertainty: CostCertainty;
  dispatchStatus: DispatchExecutionStatus;
  dispatchedAt?: string;
  deliveredAt?: string;
  notes?: string;
}

/**
 * ملخص جولة التوصيل المجمعة (Tour Manifest Summary)
 */
export interface TourFinancialSummary {
  zoneId: string;
  zoneName: string;
  ordersCount: number;
  totalCODToCollect: number;
  driverWagePerOrder: number;
  totalDriverWage: number;
  netDueToStore: number;
  estimatedDeliveryCostPerOrder: number;
  actualDeliveryCostTotal: number;
  deliveryMarginTotal: number;
  isBatchedTour: boolean;
}

/**
 * ────────────────────────────────────────────────────────────
 * 4. المحرك الحسابي المركزي — الدوال المشتركة
 * ────────────────────────────────────────────────────────────
 */

/**
 * دالة تفكيك نسب ومقاييس التسعير للتحقق الصارم:
 * 1. نسبة تكلفة الشراء من سعر البيع (COGS Ratio = Cost / Selling)
 * 2. هامش الربح الإجمالي من سعر البيع (Gross Margin = (Selling - Cost) / Selling)
 * 3. نسبة الزيادة على التكلفة (Markup on Cost = (Selling - Cost) / Cost)
 * 4. هل يحترم السعر سقف 60%؟
 */
export function analyzePricingMetrics(
  purchaseCost: number,
  sellingPrice: number
): PricingMetricsAnalysis {
  const cost = Math.max(0, Number(purchaseCost) || 0);
  const selling = Math.max(0, Number(sellingPrice) || 0);

  if (cost <= 0 || selling <= 0) {
    return {
      purchaseCost: cost,
      sellingPrice: selling,
      cogsRatioPercent: 0,
      grossMarginPercent: 0,
      markupPercent: 0,
      isCompliant: false,
      compliantTargetPrice: 0,
      complianceMessage: 'بيانات التكلفة أو سعر البيع غير مكتملة',
    };
  }

  const cogsRatioPercent = Number(((cost / selling) * 100).toFixed(2));
  const grossMarginPercent = Number((((selling - cost) / selling) * 100).toFixed(2));
  const markupPercent = Number((((selling - cost) / cost) * 100).toFixed(2));

  // السعر المستهدف عند حد تكلفة شراء 60%: cost / 0.60
  // مثال: 5 ÷ 0.60 = 8.33 درهم تقريباً
  const compliantTargetPrice = Number((cost / TARIFF_STANDARDS.TARGET_COGS_MAX_RATIO).toFixed(2));

  // التحقق من احترام سقف 60% (مع سماحية 0.05% لتقريب الكسور العشرية مثل 8.33)
  const isCompliant = cogsRatioPercent <= (TARIFF_STANDARDS.TARGET_COGS_MAX_RATIO * 100 + 0.05);

  let complianceMessage = '';
  if (isCompliant) {
    complianceMessage = `متوافق مع القاعدة التجارية لخُضرة (تكلفة الشراء ${cogsRatioPercent}% ≤ 60%، هامش إجمالي ${grossMarginPercent}%).`;
  } else {
    complianceMessage = `⚠️ غير متوافق: تكلفة الشراء تمثل ${cogsRatioPercent}% من سعر البيع وتتجاوز الحد الأقصى (60%). السعر المستهدف المعتمد هو ${compliantTargetPrice} د.م (هامش 40%). يتطلب استثناءً إدارياً معللاً.`;
  }

  return {
    purchaseCost: cost,
    sellingPrice: selling,
    cogsRatioPercent,
    grossMarginPercent,
    markupPercent,
    isCompliant,
    compliantTargetPrice,
    complianceMessage,
  };
}

/**
 * حساب سعر البيع المستهدف من تكلفة الشراء وهامش الربح الإجمالي المستهدف
 * المعادلة المعتمدة: سعر البيع = تكلفة الشراء ÷ (1 − الهامش المستهدف)
 * لمثال: 5 ÷ (1 − 0.40) = 5 ÷ 0.60 = 8.33 دراهم تقريباً
 */
export function calculateSellingPriceFromTargetMargin(
  purchaseCost: number,
  targetGrossMarginPercent: number = TARIFF_STANDARDS.TARGET_GROSS_MARGIN_PERCENT
): number {
  if (typeof purchaseCost !== 'number' || isNaN(purchaseCost) || purchaseCost <= 0) {
    return 0;
  }
  const safeMargin = typeof targetGrossMarginPercent === 'number' && !isNaN(targetGrossMarginPercent)
    ? Math.min(95, Math.max(0, targetGrossMarginPercent))
    : TARIFF_STANDARDS.TARGET_GROSS_MARGIN_PERCENT;

  const selling = purchaseCost / (1 - safeMargin / 100);
  return Number(selling.toFixed(2));
}

/**
 * حساب سعر البيع من نسبة الزيادة على التكلفة (Markup on Cost)
 * سعر البيع = تكلفة الشراء × (1 + نسبة الزيادة / 100)
 */
export function calculateSellingPriceFromMarkup(
  purchaseCost: number,
  markupPercent: number = TARIFF_STANDARDS.RECOMMENDED_MARKUP_PERCENT
): number {
  if (typeof purchaseCost !== 'number' || isNaN(purchaseCost) || purchaseCost <= 0) {
    return 0;
  }
  const safeMarkup = typeof markupPercent === 'number' && !isNaN(markupPercent)
    ? Math.max(0, markupPercent)
    : TARIFF_STANDARDS.RECOMMENDED_MARKUP_PERCENT;

  const selling = purchaseCost * (1 + safeMarkup / 100);
  return Number(selling.toFixed(2));
}

/**
 * دالة حساب سعر البيع المركزية:
 * تدعم افتراضياً الهامش الإجمالي المستهدف (40% => سعر البيع = تكلفة ÷ 0.60)
 * أو الزيادة على التكلفة عند تحديد النمط صراحة
 */
export function calculateSellingPrice(
  purchasePrice: number,
  marginOrMarkup: number = TARIFF_STANDARDS.TARGET_GROSS_MARGIN_PERCENT,
  method: 'target_gross_margin' | 'markup' = 'target_gross_margin'
): number {
  if (typeof purchasePrice !== 'number' || isNaN(purchasePrice) || purchasePrice <= 0) {
    return 0;
  }

  if (method === 'markup') {
    return calculateSellingPriceFromMarkup(purchasePrice, marginOrMarkup);
  }

  return calculateSellingPriceFromTargetMargin(purchasePrice, marginOrMarkup);
}

/**
 * حساب سعر الشراء العكسي التقديري عند الحاجة إليه كـ Fallback معلن
 * بالاعتماد على حد تكلفة الشراء المستهدف (60%):
 * سعر الشراء التقديري = سعر البيع × 0.60
 */
export function calculateEstimatedPurchasePrice(
  sellingPrice: number,
  targetGrossMarginPercent: number = TARIFF_STANDARDS.TARGET_GROSS_MARGIN_PERCENT
): number {
  if (typeof sellingPrice !== 'number' || isNaN(sellingPrice) || sellingPrice <= 0) {
    return 0;
  }
  const safeMargin = typeof targetGrossMarginPercent === 'number' && !isNaN(targetGrossMarginPercent)
    ? Math.min(95, Math.max(0, targetGrossMarginPercent))
    : TARIFF_STANDARDS.TARGET_GROSS_MARGIN_PERCENT;

  const purchase = sellingPrice * (1 - safeMargin / 100);
  return Number(purchase.toFixed(2));
}

/**
 * حساب رسوم التوصيل الواجب تحصيلها من العميل بناءً على قيمة المنتجات المؤهلة
 * القاعدة التجارية الإلزامية — التوصيل المجاني فوق 250 درهماً:
 * - إذا تجاوزت قيمة المنتجات 250 درهماً (productsSubtotal > 250)، تكون الرسوم 0 درهم.
 * - عبارة «فوق 250 درهماً» تعني أكبر تماماً من 250؛ أما الطلب الذي يساوي 250 درهماً تماماً
 *   فلا يستفيد من العرض وتكون رسومه 15 درهماً.
 * - حالات الاختبار الإلزامية:
 *   - 249.99 درهم => 15 درهم رسوم توصيل
 *   - 250.00 درهم => 15 درهم رسوم توصيل
 *   - 250.01 درهم => 0 درهم رسوم توصيل (مجاني)
 */
export function calculateCustomerDeliveryFee(productsSubtotal: number): number {
  const safeSubtotal = Number(productsSubtotal) || 0;
  if (safeSubtotal > TARIFF_STANDARDS.FREE_DELIVERY_THRESHOLD) {
    return 0;
  }
  return TARIFF_STANDARDS.CUSTOMER_STANDARD_DELIVERY_FEE;
}

/**
 * حساب تكلفة التوصيل التقديرية حسب المنطقة الجغرافية في مدينة فاس
 * تُستخدم كـ Fallback تقديري واضح عندما لا تكون التكلفة الفعلية مسجلة بعد
 */
export function getEstimatedZoneDeliveryCost(zoneId?: string): number {
  switch (zoneId) {
    case 'south': // بنسودة والزواغة قرب مقر سوق الجملة
      return 15;
    case 'central': // المدينة الجديدة وفلورنس والأطلس
      return 20;
    case 'north': // سايس والنرجس
      return 20;
    case 'east': // طريق صفرو والزهور وفاس البالي
      return 25;
    default:
      return 20; // التقدير المرجعي الافتراضي لمدينة فاس
  }
}

/**
 * دالة مركزية لحساب تكلفة شراء عناصر السلة (COGS) من أسعار الشراء الصباحية
 * تميز بدقة بين التكلفة الفعلية الموثقة والتكلفة التقديرية والتكلفة المجهولة
 */
export function calculateItemsCogs(
  items: CartItem[] | any[],
  dailyPricesMap?: Record<number, { purchasePrice?: number; purchase?: number }>
): {
  cogsAmount: number | null;
  cogsStatus: CostCertainty;
  itemsBreakdown: {
    id: number;
    name: string;
    qty: number;
    purchasePrice: number | null;
    lineCogs: number | null;
    isEstimated: boolean;
  }[];
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { cogsAmount: 0, cogsStatus: 'actual', itemsBreakdown: [] };
  }

  let totalCogs = 0;
  let hasAnyUnknown = false;
  let hasAnyEstimated = false;

  const itemsBreakdown = items.map((item) => {
    const pid = Number(item.id || item.product_id);
    const qty = Math.max(0, Number(item.qty) || 1);
    const lineTotal = Number(item.lineTotal) || (Number(item.unitTotal) || 0) * qty;

    let itemPurchasePrice: number | null = null;
    let isEstimated = false;

    // 1) البحث عن سعر الشراء الصباحي الفعلي المسجل في جدول أسعار اليوم
    if (dailyPricesMap && dailyPricesMap[pid]) {
      const entry = dailyPricesMap[pid];
      const p = Number(entry.purchasePrice ?? entry.purchase);
      if (!isNaN(p) && p > 0) {
        itemPurchasePrice = p;
      }
    }

    // 2) إذا لم يُسجل سعر الشراء الفعلي، نحاول استنتاجه تقديرياً من سعر البيع مع وسمه
    if (itemPurchasePrice === null && lineTotal > 0 && qty > 0) {
      const unitSelling = lineTotal / qty;
      itemPurchasePrice = calculateEstimatedPurchasePrice(unitSelling);
      isEstimated = true;
      hasAnyEstimated = true;
    }

    if (itemPurchasePrice === null) {
      hasAnyUnknown = true;
      return {
        id: pid,
        name: String(item.name || 'منتج'),
        qty,
        purchasePrice: null,
        lineCogs: null,
        isEstimated: false,
      };
    }

    const lineCogs = Number((itemPurchasePrice * qty).toFixed(2));
    totalCogs += lineCogs;

    return {
      id: pid,
      name: String(item.name || 'منتج'),
      qty,
      purchasePrice: itemPurchasePrice,
      lineCogs,
      isEstimated,
    };
  });

  if (hasAnyUnknown) {
    return {
      cogsAmount: null,
      cogsStatus: 'unknown',
      itemsBreakdown,
    };
  }

  const finalStatus: CostCertainty = hasAnyEstimated ? 'estimated' : 'actual';
  return {
    cogsAmount: Number(totalCogs.toFixed(2)),
    cogsStatus: finalStatus,
    itemsBreakdown,
  };
}

/**
 * ────────────────────────────────────────────────────────────
 * 5. المحرك المالي الشامل للطلب (Comprehensive Order Financials)
 * يطبق جميع القواعد الإلزامية بدقة صارمة:
 * - نسبة تكلفة الشراء = تكلفة الشراء ÷ قيمة المنتجات وحدها (دون رسوم التوصيل في المقام)
 * - تنبيه عند تجاوز نسبة 60%
 * - عدم إعلان الربح النهائي إذا كانت أي تكلفة مجهولة
 * - فصل رسوم التوصيل المحصلة عن تكلفة التوصيل الفعلية
 * ────────────────────────────────────────────────────────────
 */
export function calculateOrderFinancials(params: {
  productsSubtotal: number;
  discountAmount?: number;
  deliveryFeeCollected?: number;
  cogsAmount?: number | null;
  cogsStatus?: CostCertainty;
  deliveryCost?: number | null;
  deliveryCostStatus?: CostCertainty;
  deliveryZone?: string;
  packagingCost?: number;
  otherDirectCosts?: number;
}): OrderFinancialBreakdown {
  const warnings: string[] = [];

  // 1. المبالغ والمبيعات
  const productsSubtotal = Math.max(0, Number(params.productsSubtotal) || 0);
  const discountAmount = Math.max(0, Number(params.discountAmount) || 0);
  const netProductsAmount = Math.max(0, Number((productsSubtotal - discountAmount).toFixed(2)));

  const deliveryFeeCollected = params.deliveryFeeCollected !== undefined
    ? Math.max(0, Number(params.deliveryFeeCollected) || 0)
    : calculateCustomerDeliveryFee(netProductsAmount);

  const customerGrandTotal = Number((netProductsAmount + deliveryFeeCollected).toFixed(2));

  // 2. تكلفة الشراء (COGS)
  let cogsStatus: CostCertainty = params.cogsStatus || (params.cogsAmount != null ? 'actual' : 'unknown');
  let cogsAmount = params.cogsAmount != null && !isNaN(params.cogsAmount)
    ? Math.max(0, Number(params.cogsAmount.toFixed(2)))
    : null;
  let cogsEstimated = false;

  // توفير قيمة احتياطية آمنة ومعلنة عند غياب تكلفة الشراء (60% من صافي المنتجات)
  if (cogsAmount === null || cogsStatus === 'unknown') {
    cogsAmount = Number((netProductsAmount * TARIFF_STANDARDS.TARGET_COGS_MAX_RATIO).toFixed(2));
    cogsStatus = 'estimated';
    cogsEstimated = true;
    warnings.push('ℹ️ تم تقدير تكلفة الشراء تلقائياً بنسبة 60% لعدم توفر تكلفة شراء مسجلة.');
  }

  const effectiveCogs = cogsAmount;

  let cogsRatio: number | null = null;
  let cogsExceedsTarget = false;

  if (effectiveCogs !== null && netProductsAmount > 0) {
    // ⚠️ قاعدة ملزمة: رسوم التوصيل لا تدخل في مقام نسبة تكلفة الشراء
    cogsRatio = Number((effectiveCogs / netProductsAmount).toFixed(4));
    if (cogsRatio > TARIFF_STANDARDS.TARGET_COGS_MAX_RATIO) {
      cogsExceedsTarget = true;
      const pct = (cogsRatio * 100).toFixed(1);
      warnings.push(`⚠️ تنبيه تكلفة السلع: تكلفة الشراء (${pct}%) تتجاوز السقف المستهدف (60%) لقيمة المنتجات المباعة.`);
    }
  }

  // 3. تكلفة تنفيذ التوصيل
  let deliveryCostStatus: CostCertainty = params.deliveryCostStatus || (params.deliveryCost != null ? 'actual' : 'unknown');
  let deliveryCost = params.deliveryCost != null && !isNaN(params.deliveryCost)
    ? Math.max(0, Number(params.deliveryCost.toFixed(2)))
    : null;
  let deliveryCostEstimated = false;

  // توفير قيمة احتياطية آمنة ومعلنة عند غياب تكلفة التوصيل الفعلية
  if (deliveryCost === null || deliveryCostStatus === 'unknown') {
    deliveryCost = getEstimatedZoneDeliveryCost(params.deliveryZone);
    deliveryCostStatus = 'estimated';
    deliveryCostEstimated = true;
    warnings.push('ℹ️ تم تقدير تكلفة التوصيل وفق تعريفة المنطقة لعدم توفر تكلفة موصّل فعلية مسجلة.');
  }

  const effectiveDeliveryCost = deliveryCost;

  // 4. تكلفة التغليف والتكاليف المباشرة الإضافية
  const packagingCost = params.packagingCost !== undefined
    ? Math.max(0, Number(params.packagingCost) || 0)
    : TARIFF_STANDARDS.STANDARD_PACKAGING_COST;

  const otherDirectCosts = Math.max(0, Number(params.otherDirectCosts) || 0);

  // 5. التكلفة الإجمالية والربح التشغيلي قبل المصاريف العامة
  // المعادلة المعتمدة:
  // الربح التشغيلي قبل المصاريف العامة =
  // إيرادات المنتجات + رسوم توصيل العميل - تكلفة شراء المنتجات - تكلفة التوصيل - التكاليف المباشرة الإضافية
  const totalDirectCost = Number((effectiveCogs + effectiveDeliveryCost + packagingCost + otherDirectCosts).toFixed(2));
  const operatingProfitBeforeOverheads = Number((customerGrandTotal - totalDirectCost).toFixed(2));
  const grossProfit = operatingProfitBeforeOverheads;

  const grossMarginPercent = netProductsAmount > 0
    ? Number(((grossProfit / netProductsAmount) * 100).toFixed(2))
    : 0;

  const deliveryMargin = Number((deliveryFeeCollected - effectiveDeliveryCost).toFixed(2));
  const isEstimated = cogsEstimated || deliveryCostEstimated;

  return {
    productsSubtotal,
    discountAmount,
    netProductsAmount,
    deliveryFeeCollected,
    customerGrandTotal,
    cogsAmount,
    cogsStatus,
    cogsRatio,
    cogsExceedsTarget,
    deliveryCost,
    deliveryCostStatus,
    packagingCost,
    totalDirectCost,
    isEstimated,
    cogsEstimated,
    deliveryCostEstimated,
    effectiveCogs,
    effectiveDeliveryCost,
    otherDirectCosts,
    operatingProfitBeforeOverheads,
    grossProfit,
    grossMarginPercent,
    deliveryMargin,
    warnings,
  };
}

/**
 * ────────────────────────────────────────────────────────────
 * 5.ب المحرك المالي الموحد لتجميع وحساب الأرباح التشغيلية لمجموعة طلبات
 * (Unified Central Operating Financials Engine)
 * المصدر المركزي الوحيد لحسابات الطلبات والتوصيل ولوحة الأرباح
 * ────────────────────────────────────────────────────────────
 */
export function calculateOperatingFinancials(
  orders: Array<any>,
  options?: {
    defaultPackagingCostPerOrder?: number;
    defaultZoneDeliveryCost?: number;
    dailyPricesMap?: Record<number, { purchasePrice?: number; purchase?: number }>;
  }
): OperatingFinancialsSummary {
  const activeOrders = Array.isArray(orders)
    ? orders.filter(
        (o) =>
          o &&
          !o.is_deleted &&
          o.status !== 'cancelled' &&
          (Number(o.total) > 0 || (Array.isArray(o.items) && o.items.length > 0))
      )
    : [];

  const count = activeOrders.length;
  if (count === 0) {
    return {
      ordersCount: 0,
      productsRevenue: 0,
      customerDeliveryFees: 0,
      grossRevenue: 0,
      cogsTotal: 0,
      cogsRatioPercent: 0,
      cogsActualCount: 0,
      cogsEstimatedCount: 0,
      deliveryCostsTotal: 0,
      actualDeliveryCostsTotal: 0,
      estimatedDeliveryCostsTotal: 0,
      deliveryActualCount: 0,
      deliveryEstimatedCount: 0,
      packagingCostsTotal: 0,
      otherDirectCostsTotal: 0,
      totalDirectCosts: 0,
      operatingProfitBeforeOverheads: 0,
      operatingProfitMarginPercent: 0,
      operatingProfitToProductsMarginPercent: 0,
      averageOrderValue: 0,
      averageDeliveryCostPerOrder: 0,
      averageCustomerDeliveryFeePerOrder: 0,
      deliveryNetMargin: 0,
      isFullyActual: false,
      warnings: ['لا توجد طلبات مؤهلة للحساب في الفترة المحددة.'],
    };
  }

  let productsRevenue = 0;
  let customerDeliveryFees = 0;
  let grossRevenue = 0;
  let cogsTotal = 0;
  let cogsActualCount = 0;
  let cogsEstimatedCount = 0;
  let deliveryCostsTotal = 0;
  let actualDeliveryCostsTotal = 0;
  let estimatedDeliveryCostsTotal = 0;
  let deliveryActualCount = 0;
  let deliveryEstimatedCount = 0;
  let packagingCostsTotal = 0;
  let otherDirectCostsTotal = 0;
  const warnings: string[] = [];

  for (const order of activeOrders) {
    const productsSubtotal = Number(order.subtotal ?? (Number(order.total) - Number(order.delivery_fee ?? 0))) || 0;
    const discountAmount = Number(order.discount_amount) || 0;
    const deliveryFeeCollected = Number(order.delivery_fee ?? order.deliveryFee) || 0;

    // استخراج تكلفة الشراء الموثقة أو حسابها من الأصناف
    let cogsAmount = order.cogs_amount != null
      ? Number(order.cogs_amount)
      : (order.cogsAmount != null ? Number(order.cogsAmount) : null);
    let cogsStatus = order.cogs_status || order.cogsStatus;

    if (cogsAmount == null && Array.isArray(order.items) && order.items.length > 0) {
      const itemsCogs = calculateItemsCogs(order.items, options?.dailyPricesMap);
      if (itemsCogs.cogsAmount != null) {
        cogsAmount = itemsCogs.cogsAmount;
        cogsStatus = itemsCogs.cogsStatus;
      }
    }

    // استخراج تكلفة الموصّل الموثقة أو التقديرية
    const rawDeliveryCost =
      order.delivery_cost != null
        ? order.delivery_cost
        : order.actual_delivery_cost != null
        ? order.actual_delivery_cost
        : order.deliveryCost != null
        ? order.deliveryCost
        : order.driver_wage != null
        ? order.driver_wage
        : order.delivery_dispatch?.deliveryCost ?? order.delivery_dispatch?.agreedWage;

    const deliveryCost = rawDeliveryCost != null && Number.isFinite(Number(rawDeliveryCost))
      ? Number(rawDeliveryCost)
      : null;

    const deliveryCostStatus =
      order.delivery_cost_status ||
      order.deliveryCostStatus ||
      order.delivery_dispatch?.costCertainty ||
      (deliveryCost != null ? 'actual' : 'estimated');

    const packagingCost = order.packaging_cost != null
      ? Number(order.packaging_cost)
      : (options?.defaultPackagingCostPerOrder ?? TARIFF_STANDARDS.STANDARD_PACKAGING_COST);

    const otherDirectCosts = Number(order.other_direct_costs ?? order.direct_costs) || 0;

    const orderFin = calculateOrderFinancials({
      productsSubtotal,
      discountAmount,
      deliveryFeeCollected,
      cogsAmount,
      cogsStatus,
      deliveryCost,
      deliveryCostStatus,
      deliveryZone: order.delivery_zone || order.delivery_dispatch?.zone,
      packagingCost,
      otherDirectCosts,
    });

    productsRevenue += orderFin.netProductsAmount;
    customerDeliveryFees += orderFin.deliveryFeeCollected;
    grossRevenue += orderFin.customerGrandTotal;

    cogsTotal += orderFin.effectiveCogs;
    if (orderFin.cogsEstimated) {
      cogsEstimatedCount++;
    } else {
      cogsActualCount++;
    }

    deliveryCostsTotal += orderFin.effectiveDeliveryCost;
    if (orderFin.deliveryCostEstimated) {
      estimatedDeliveryCostsTotal += orderFin.effectiveDeliveryCost;
      deliveryEstimatedCount++;
    } else {
      actualDeliveryCostsTotal += orderFin.effectiveDeliveryCost;
      deliveryActualCount++;
    }

    packagingCostsTotal += orderFin.packagingCost;
    otherDirectCostsTotal += orderFin.otherDirectCosts;
  }

  // التقريب المحاسبي المنضبط لمنع أي تشوه بالكسور العشرية
  productsRevenue = Number(productsRevenue.toFixed(2));
  customerDeliveryFees = Number(customerDeliveryFees.toFixed(2));
  grossRevenue = Number(grossRevenue.toFixed(2));
  cogsTotal = Number(cogsTotal.toFixed(2));
  deliveryCostsTotal = Number(deliveryCostsTotal.toFixed(2));
  actualDeliveryCostsTotal = Number(actualDeliveryCostsTotal.toFixed(2));
  estimatedDeliveryCostsTotal = Number(estimatedDeliveryCostsTotal.toFixed(2));
  packagingCostsTotal = Number(packagingCostsTotal.toFixed(2));
  otherDirectCostsTotal = Number(otherDirectCostsTotal.toFixed(2));

  // إجمالي التكاليف المباشرة
  const totalDirectCosts = Number(
    (cogsTotal + deliveryCostsTotal + packagingCostsTotal + otherDirectCostsTotal).toFixed(2)
  );

  // المعادلة المركزية الإلزامية:
  // الربح التشغيلي قبل المصاريف العامة =
  // إيرادات المنتجات + رسوم توصيل العميل - تكلفة شراء المنتجات - تكلفة التوصيل - التكاليف المباشرة
  const operatingProfitBeforeOverheads = Number((grossRevenue - totalDirectCosts).toFixed(2));

  const cogsRatioPercent = productsRevenue > 0
    ? Number(((cogsTotal / productsRevenue) * 100).toFixed(2))
    : 0;

  const operatingProfitMarginPercent = grossRevenue > 0
    ? Number(((operatingProfitBeforeOverheads / grossRevenue) * 100).toFixed(2))
    : 0;

  const operatingProfitToProductsMarginPercent = productsRevenue > 0
    ? Number(((operatingProfitBeforeOverheads / productsRevenue) * 100).toFixed(2))
    : 0;

  const averageOrderValue = count > 0 ? Number((grossRevenue / count).toFixed(2)) : 0;
  const averageDeliveryCostPerOrder = count > 0 ? Number((deliveryCostsTotal / count).toFixed(2)) : 0;
  const averageCustomerDeliveryFeePerOrder = count > 0 ? Number((customerDeliveryFees / count).toFixed(2)) : 0;
  const deliveryNetMargin = Number((customerDeliveryFees - deliveryCostsTotal).toFixed(2));

  const isFullyActual = cogsEstimatedCount === 0 && deliveryEstimatedCount === 0 && count > 0;

  if (cogsEstimatedCount > 0) {
    warnings.push(`ℹ️ تم احتساب تكلفة الشراء تقديرياً (60%) لـ ${cogsEstimatedCount} من أصل ${count} طلبات لعدم اكتمال فواتير الشراء الصباحية.`);
  }
  if (deliveryEstimatedCount > 0) {
    warnings.push(`ℹ️ تم اعتماد تكلفة توصيل تقديرية لـ ${deliveryEstimatedCount} طلبات لم يتم إغلاق جولاتها وتحديد أجر السائق الفعلي لها بعد.`);
  }

  return {
    ordersCount: count,
    productsRevenue,
    customerDeliveryFees,
    grossRevenue,
    cogsTotal,
    cogsRatioPercent,
    cogsActualCount,
    cogsEstimatedCount,
    deliveryCostsTotal,
    actualDeliveryCostsTotal,
    estimatedDeliveryCostsTotal,
    deliveryActualCount,
    deliveryEstimatedCount,
    packagingCostsTotal,
    otherDirectCostsTotal,
    totalDirectCosts,
    operatingProfitBeforeOverheads,
    operatingProfitMarginPercent,
    operatingProfitToProductsMarginPercent,
    averageOrderValue,
    averageDeliveryCostPerOrder,
    averageCustomerDeliveryFeePerOrder,
    deliveryNetMargin,
    isFullyActual,
    warnings,
  };
}

/**
 * ────────────────────────────────────────────────────────────
 * 6. حساب ماليات الجولة المجمعة (Tour / Manifest Financials)
 * ────────────────────────────────────────────────────────────
 */
export function calculateTourFinancials(
  orders: { total?: number; delivery_fee?: number; delivery_dispatch?: any }[],
  zoneId: string,
  zoneName: string,
  driverCommissionPerOrder: number = TARIFF_STANDARDS.DEFAULT_DRIVER_ORDER_WAGE
): TourFinancialSummary {
  const count = orders.length;
  const safeCommission = Math.max(0, Number(driverCommissionPerOrder) || TARIFF_STANDARDS.DEFAULT_DRIVER_ORDER_WAGE);

  const totalCODToCollect = orders.reduce((sum, o: any) => sum + (o?.is_paid ? 0 : (Number(o.total) || 0)), 0);
  const totalDriverWage = orders.reduce((sum, o) => {
    const customCost = o.delivery_dispatch?.deliveryCost ?? o.delivery_dispatch?.agreedWage;
    return sum + (customCost != null && Number.isFinite(customCost) ? customCost : safeCommission);
  }, 0);
  const netDueToStore = totalCODToCollect - totalDriverWage;

  const totalFeesCollected = orders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
  const deliveryMarginTotal = totalFeesCollected - totalDriverWage;

  const isBatchedTour = count >= 2;
  const estimatedDeliveryCostPerOrder = count > 0
    ? Number((totalDriverWage / count).toFixed(2))
    : safeCommission;

  return {
    zoneId,
    zoneName,
    ordersCount: count,
    totalCODToCollect: Number(totalCODToCollect.toFixed(2)),
    driverWagePerOrder: safeCommission,
    totalDriverWage: Number(totalDriverWage.toFixed(2)),
    netDueToStore: Number(netDueToStore.toFixed(2)),
    estimatedDeliveryCostPerOrder,
    actualDeliveryCostTotal: Number(totalDriverWage.toFixed(2)),
    deliveryMarginTotal: Number(deliveryMarginTotal.toFixed(2)),
    isBatchedTour,
  };
}
