// ============================================================
// src/server/copilotService.ts
// محرك Khodra AI Copilot v3 — المساعد التشغيلي الذكي لمتجر خُضرة فاس
// ترقية الذكاء الحواري: فهم الأسئلة المركبة، ذاكرة سياق المحادثة،
// حل الإشارات والضمائر، جداول المقارنة، ومنع التعديل بنظام القراءة فقط الصارم
// ============================================================

import { getGeminiClient, GEMINI_MODEL } from './geminiClient';
import {
  COPILOT_FUNCTION_DECLARATIONS,
  dispatchCopilotTool,
  ToolExecutionResult,
  executeGetInventory,
  executeGetSalesSummary,
  executeGetOrders,
  executeGetProducts,
  executeGetInventoryMovements,
  executeGetStoreInfo,
} from './copilotTools';

export interface CopilotChatHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface CopilotAction {
  label: string;
  actionType: string;
  payload?: any;
}

export type QuestionIntent =
  | 'data_mutation_attempt'
  | 'context_follow_up'
  | 'ambiguous_clarification'
  | 'schema_limitation'
  | 'sales_comparison'
  | 'compound_multi_tool'
  | 'products_pricing'
  | 'inventory_health'
  | 'orders_tracking'
  | 'sales_period'
  | 'inventory_movements'
  | 'store_info'
  | 'general_advice';

export interface CopilotMetadata {
  intent: QuestionIntent;
  dataSource: 'supabase_live' | 'store_config' | 'none' | 'unavailable' | 'error';
  timePeriodAnalyzed?: string;
  limitations?: string[];
  toolsCount: number;
  isRealData: boolean;
  status:
    | 'success'
    | 'empty'
    | 'error'
    | 'not_configured'
    | 'general'
    | 'needs_clarification'
    | 'security_blocked';
}

export interface CopilotResponse {
  reply: string;
  toolsExecuted: {
    toolName: string;
    source: string;
    status?: string;
    summary: string;
    isRealData: boolean;
    data?: any;
    errorMessage?: string;
  }[];
  suggestedActions: CopilotAction[];
  dataContext: string;
  isRealData: boolean;
  modelUsed: string;
  metadata?: CopilotMetadata;
}

export interface ExtractedConversationContext {
  lastMentionedProducts: string[];
  lastPeriod?: 'today' | 'yesterday' | 'last_7_days' | 'previous_7_days' | 'this_month' | 'last_month' | 'all_time';
  lastPeriodLabel?: string;
  lastTopic?: 'inventory' | 'orders' | 'sales' | 'products' | 'movements' | 'pricing';
  lastOrders: string[];
  lastAssistantText?: string;
  hasPreviousExchanges: boolean;
  followUpType?: 'sort' | 'why_reason' | 'availability_check' | 'compare' | 'details';
}

const COMMON_PRODUCE_NAMES = [
  'بطاطس', 'طماطم', 'بصل', 'بصل أحمر', 'بصل أبيض', 'جزر', 'خيار', 'فلفل', 'فلفل حار',
  'فلفل أحمر', 'باذنجان', 'قرع', 'قرع أحمر', 'كوسة', 'لفت', 'لفت أبيض', 'لفت أصفر',
  'شمندر', 'لوبيا', 'جلبانة', 'فول', 'ثوم', 'ليمون', 'حامض', 'خس', 'نعناع', 'قزبر',
  'معدنوس', 'كرفس', 'لويزة', 'سفرجل', 'فجل', 'تفاح', 'برتقال', 'موز', 'فراولة'
];

// ────────────────────────────────────────────────────────────
// التعليمات النظامية الموسعة لنموذج الذكاء الاصطناعي (Gemini)
// ────────────────────────────────────────────────────────────
const COPILOT_SYSTEM_INSTRUCTION = `
أنت "خُضرة AI Copilot v3" — المساعد التشغيلي والإداري الذكي الرسمي لمنصة "خُضرة — فاس" (Khodra Fès).
أنت شريك حقيقي لمدير المتجر وفريق العمليات في مدينة فاس والمغرب.

القواعد الصارمة والإلزامية للذكاء الحواري ونزاهة البيانات:
1. 🔒 وضع القراءة فقط والأمان التام (Strict Read-Only Mode):
   - أنت تعمل في وضع القراءة والتحليل الحصري.
   - إذا طلب المستخدم تعديل المخزون، تغيير أسعار، حذف أو تعديل طلب، أو كتابة أي بيانات، ارفض التنفيذ صراحة وبشكل مهذب ووضح أنك مساعد قراءة وتحليل، ووجهه للوحة الإدارية المخصصة لذلك.

2. 🧠 فهم الأسئلة المركبة (Compound & Multi-part Questions):
   - عند طرح أسئلة مركبة تربط بين مجالين (مثلاً: المخزون مع الطلبات، المبيعات مع المخزون، أو النواقص مع الأسعار):
     * استدعِ كل الأدوات الضرورية في نفس الوقت دون تكرار.
     * طابق وادمج النتائج تشغيلياً (مثل: فحص سلات الطلبات المعلقة ومطابقتها مع السلع الناقصة أو النافدة في المستودع).
     * ابدأ دائماً بالخلاصة التنفيذية المباشرة (الخلاصة أولاً)، ثم اعرض التفاصيل والجداول.

3. 💬 ذاكرة سياق المحادثة ومتابعة الحوار (Conversational Context Memory):
   - تابع سياق المحادثة والأسئلة السابقة داخل الجلسة.
   - افهم الضمائر والإشارات النسبية اعتماداً على ما ذُكر في الإجابة السابقة:
     * «هاد المنتجات»، «هاد الخضار» ⬅️ المنتجات المذكورة في الرد السابق.
     * «رتبهم»، «رتبهم حسب السعر»، «من الأرخص للأغلى» ⬅️ رتب المنتجات المذكورة بجداول واضحة.
     * «قارنهم»، «قارن بيناتهم» ⬅️ قارن العناصر أو الفترتين المذكورتين.
     * «وشنو السبب؟»، «علاش؟» ⬅️ حلل الأسباب استناداً لسجل الحركات والمبيعات الحية.
     * «واش متوفرين دابا؟» ⬅️ أعد فحص المخزون اللحظي الحي فوراً ولا تعتمد على الأرقام القديمة.
   - ⚠️ تنبيه حيوي: لا تعتبر المعلومات السابقة دليلاً كافياً على الحالة الحالية؛ أعد استدعاء الأدوات لجلب البيانات اللحظية دائماً.

4. 📊 أسلوب الإجابة والهيكلة الذكية:
   - تحدث بلغة المستخدم: ادعم الدارجة المغربية الأصيلة والعربية الفصحى الإدارية.
   - ابدأ بالخلاصة أولاً في سطر أو سطرين واضحة ومباشرة.
   - استخدم الجداول المنظمة (Markdown Tables) أو القوائم المنقطة لتسهيل المقارنة وقراءة الأرقام.
   - وضّح دائماً: الفترة الزمنية المحللة، حالة الطلبات، والعملة (درهم مغربي DH).
   - فرّق بين الأرقام الحقيقية المؤكدة من Supabase وبين التوصيات التشغيلية.

5. ⚠️ حدود المخطط والشفافية (Schema Boundaries):
   - صرّح بوضوح أن جدول الطلبات يسجل إجمالي السلة ورسوم التوصيل، بينما تكاليف شراء الجملة (COGS) ومصاريف وقود التوصيل ورواتب السائقين غير متوفرة في المخطط، ولذلك لا يمكن حساب "صافي الربح (Net Profit)" تجنباً لأي اختلاق.

6. ❓ الأسئلة الغامضة:
   - إذا كان السؤال شديد الاقتضاب (مثل "شحال؟" أو "تقرير") بدون سياق سابق، اطلب توضيحاً مقتضباً واعرض الخيارات المتاحة.
`;

// ────────────────────────────────────────────────────────────
// دالة استخراج سياق المحادثة والذاكرة المؤقتة للجلسة
// ────────────────────────────────────────────────────────────
export function extractConversationContext(
  history: CopilotChatHistoryMessage[] = []
): ExtractedConversationContext {
  const result: ExtractedConversationContext = {
    lastMentionedProducts: [],
    lastOrders: [],
    hasPreviousExchanges: Array.isArray(history) && history.length > 0,
  };

  if (!result.hasPreviousExchanges) return result;

  // فحص آخر رسائل في المحادثة (النافذة المتحركة)
  const recent = history.slice(-6);
  let lastAssistantMsg = '';
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].role === 'model' && !lastAssistantMsg) {
      lastAssistantMsg = recent[i].text;
      break;
    }
  }
  result.lastAssistantText = lastAssistantMsg;

  const productSet = new Set<string>();

  if (lastAssistantMsg) {
    // استخراج الكلمات المحددة بين **
    const boldMatches = lastAssistantMsg.matchAll(/\*\*([^\*\:\n\r]+)\*\*/g);
    for (const match of boldMatches) {
      const candidate = match[1].trim();
      if (
        candidate.length > 1 &&
        candidate.length < 30 &&
        !candidate.includes('الخلاصة') &&
        !candidate.includes('المبيعات') &&
        !candidate.includes('الطلب') &&
        !candidate.includes('التقرير') &&
        !candidate.includes('تقرير') &&
        !candidate.includes('المخزون') &&
        !candidate.includes('Supabase') &&
        !candidate.includes('درهم') &&
        !candidate.includes('DH') &&
        !candidate.includes('فاس') &&
        !candidate.includes('تنبيه') &&
        !candidate.includes('بيانات')
      ) {
        const cleanName = candidate.replace(/^\d+[\.\-\s]+/, '').trim();
        if (cleanName) productSet.add(cleanName);
      }
    }

    // فحص أسماء المنتجات الزراعية الشائعة في الرد
    for (const prod of COMMON_PRODUCE_NAMES) {
      if (lastAssistantMsg.includes(prod)) {
        productSet.add(prod);
      }
    }

    // استخراج أكواد الطلبات
    const orderMatches = lastAssistantMsg.match(/KH-[A-Za-z0-9]+/g);
    if (orderMatches) {
      result.lastOrders = Array.from(new Set(orderMatches)).slice(0, 5);
    }

    // استخراج الفترة الزمنية
    if (lastAssistantMsg.includes('آخر 7 أيام')) {
      result.lastPeriod = 'last_7_days';
      result.lastPeriodLabel = 'آخر 7 أيام';
    } else if (lastAssistantMsg.includes('أمس') || lastAssistantMsg.includes('البارح')) {
      result.lastPeriod = 'yesterday';
      result.lastPeriodLabel = 'أمس';
    } else if (lastAssistantMsg.includes('اليوم')) {
      result.lastPeriod = 'today';
      result.lastPeriodLabel = 'اليوم';
    } else if (lastAssistantMsg.includes('الشهر')) {
      result.lastPeriod = 'this_month';
      result.lastPeriodLabel = 'هذا الشهر';
    }

    // استخراج الموضوع السابق
    if (
      lastAssistantMsg.includes('المخزون') ||
      lastAssistantMsg.includes('التوريد') ||
      lastAssistantMsg.includes('بنسودة')
    ) {
      result.lastTopic = 'inventory';
    } else if (lastAssistantMsg.includes('طلب') || lastAssistantMsg.includes('توصيل')) {
      result.lastTopic = 'orders';
    } else if (lastAssistantMsg.includes('مبيعات') || lastAssistantMsg.includes('إيراد')) {
      result.lastTopic = 'sales';
    } else if (lastAssistantMsg.includes('أسعار') || lastAssistantMsg.includes('ثمن')) {
      result.lastTopic = 'pricing';
    }
  }

  result.lastMentionedProducts = Array.from(productSet).slice(0, 10);
  return result;
}

// ────────────────────────────────────────────────────────────
// دالة تصنيف نية السؤال بدقة (Question Intent Classifier)
// ────────────────────────────────────────────────────────────
export function classifyQuestionIntent(
  userMessage: string,
  history: CopilotChatHistoryMessage[] = []
): QuestionIntent {
  const trimmed = userMessage.trim();
  const q = trimmed.toLowerCase();
  const hasHistory = Array.isArray(history) && history.length > 0;

  // 0. محاولات تعديل أو حذف أو كتابة في قاعدة البيانات (Data Mutation Security)
  const isMutation =
    q.includes('تعديل') ||
    q.includes('عدل') ||
    q.includes('بدل الثمن') ||
    q.includes('بدل السعر') ||
    q.includes('غير الثمن') ||
    q.includes('غير السعر') ||
    q.includes('تغيير السعر') ||
    q.includes('تغيير الثمن') ||
    q.includes('زيد فالمخزون') ||
    q.includes('زيد في المخزون') ||
    q.includes('نقص من المخزون') ||
    q.includes('أضف كمية') ||
    q.includes('اضف كمية') ||
    q.includes('إضافة كمية') ||
    q.includes('أضف منتج') ||
    q.includes('اضف منتج') ||
    q.includes('مسح المنتج') ||
    q.includes('حذف المنتج') ||
    q.includes('مسح الطلب') ||
    q.includes('حذف الطلب') ||
    q.includes('إلغاء الطلب') ||
    q.includes('الغاء الطلب') ||
    q.includes('غير حالة الطلب') ||
    q.includes('تغيير حالة الطلب') ||
    q.includes('update products') ||
    q.includes('delete from') ||
    q.includes('drop table') ||
    q.includes('insert into');

  if (isMutation) {
    return 'data_mutation_attempt';
  }

  // 1. الأسئلة الغامضة جداً التي تحتاج توضيحاً (فقط إذا لم يكن هناك سياق متابعة)
  if (
    trimmed.length <= 15 &&
    (q === 'شحال' ||
      q === 'شحال؟' ||
      q === 'شحال كاين' ||
      q === 'شحال كاين؟' ||
      q === 'تقرير' ||
      q === 'عطيني تقرير' ||
      q === 'الوضعية' ||
      q === 'الوضع دابا' ||
      q === 'شنو كاين')
  ) {
    return 'ambiguous_clarification';
  }

  // 1.ب. أسئلة المقارنة المقتضبة بدون سياق
  if (!hasHistory && (q === 'قارن' || q === 'قارن؟' || q === 'مقارنة')) {
    return 'ambiguous_clarification';
  }

  // 2. أسئلة المتابعة المعتمدة على السياق السابق داخل نفس الجلسة
  const isFollowUpPattern =
    q.startsWith('رتبهم') ||
    q.includes('رتبهم') ||
    q.includes('رتب هاد') ||
    q.includes('رتب هذه') ||
    q.includes('رتب لي') ||
    q.includes('رتبهم حسب') ||
    q.includes('وشنو السبب') ||
    q.includes('شنو السبب') ||
    q.includes('ما هو السبب') ||
    q.includes('علاش') ||
    q.includes('شنو هو السبب') ||
    q.includes('قارنهم') ||
    q.includes('قارن بيناتهم') ||
    q.includes('المقارنة بيناتهم') ||
    q.includes('هاد المنتجات') ||
    q.includes('هاد الخضار') ||
    q.includes('هاد السلع') ||
    q.includes('واش متوفرين دابا') ||
    q.includes('واش متوفرين دابا؟') ||
    q.includes('شحال ثمنهم') ||
    q.includes('شحال الثمن ديالهم') ||
    q.includes('شحال الثمن ديال هاد') ||
    q.includes('من الأرخص للأغلى') ||
    q.includes('من الأغلى للأرخص');

  if (hasHistory && isFollowUpPattern) {
    return 'context_follow_up';
  }

  // 3. الأسئلة التي تتطلب بيانات غير موجودة في المخطط (الربح الصافي، تكاليف الشراء، مصاريف الوقود)
  if (
    q.includes('ربح صافي') ||
    q.includes('الربح الصافي') ||
    q.includes('صافي الأرباح') ||
    q.includes('صافي الربح') ||
    q.includes('net profit') ||
    q.includes('تكلفة الشراء') ||
    q.includes('رأس مال السلعة') ||
    q.includes('سعر الشراء من الفلاح') ||
    q.includes('cogs') ||
    q.includes('مصاريف الديزل') ||
    q.includes('مصاريف الوقود') ||
    q.includes('رواتب السائقين') ||
    q.includes('مصاريف التشغيل')
  ) {
    return 'schema_limitation';
  }

  // 4. المقارنة بين فترتين زمنيتين محددتين
  if (
    (q.includes('قارن') || q.includes('مقارنة') || q.includes('انخفض أداؤها') || q.includes('مقارنة بالفترة')) &&
    (q.includes('مبيعات') ||
      q.includes('أمس') ||
      q.includes('البارح') ||
      q.includes('اليوم') ||
      q.includes('أسبوع') ||
      q.includes('سيمانة') ||
      q.includes('شهر') ||
      q.includes('فترة') ||
      q.includes('أيام') ||
      q.includes('ايام') ||
      q.includes('قبل'))
  ) {
    return 'sales_comparison';
  }

  // 5. الأسئلة المركبة متعددة الأدوات:
  const isTopSellers =
    q.includes('أكثر مبيع') ||
    q.includes('الأكثر مبيع') ||
    q.includes('top selling') ||
    q.includes('أكثر طلباً');
  const isStockCheck =
    q.includes('مخزون') ||
    q.includes('متوفر') ||
    q.includes('ستوك') ||
    q.includes('كافي') ||
    q.includes('نافد');
  const isReorderCheck =
    q.includes('إعادة التوريد') ||
    q.includes('إعادة توريد') ||
    q.includes('الناقصة') ||
    q.includes('نقص');
  const isPriceCheck =
    q.includes('سعر') || q.includes('أسعار') || q.includes('أثمنة') || q.includes('ثمن');
  const isPendingOrders =
    q.includes('طلبات جديدة') ||
    q.includes('pending') ||
    q.includes('معلقة') ||
    q.includes('الطلبات المعلقة');

  // أ. ربط المخزون بالطلبات
  const isOrdersAndStock =
    (q.includes('مخزون') || q.includes('ستوك') || q.includes('سلع') || q.includes('منتجات')) &&
    (q.includes('طلب') || q.includes('طلبات') || q.includes('orders') || q.includes('pending'));

  // ب. المبيعات والمخزون
  const isSalesAndStock =
    (isTopSellers && isStockCheck) ||
    ((q.includes('مبيعات') || q.includes('إيرادات')) && (q.includes('مخزون') || q.includes('ستوك')));

  // ج. المبيعات والطلبات
  const isSalesAndOrders =
    (q.includes('مبيعات') || q.includes('إيراد')) &&
    (q.includes('طلبات جديدة') || q.includes('طلبات اليوم') || q.includes('عدد الطلبات وحالاتها'));

  // د. إعادة التوريد والأسعار
  const isReorderAndPrice =
    (isReorderCheck && isPriceCheck) ||
    (q.includes('النواقص') && (q.includes('ثمن') || q.includes('سعر')));

  if (
    isOrdersAndStock ||
    isSalesAndStock ||
    isSalesAndOrders ||
    isReorderAndPrice ||
    (isPendingOrders && isStockCheck)
  ) {
    return 'compound_multi_tool';
  }

  // 6. الأسئلة الإرشادية العامة
  if (
    (q.includes('كيفاش نحافظ') ||
      q.includes('كيف أحافظ') ||
      q.includes('طريقة تخزين') ||
      q.includes('تخزين') ||
      q.includes('تغليف') ||
      q.includes('نصيحة') ||
      q.includes('نصائح') ||
      q.includes('طراوة')) &&
    (q.includes('ورقية') ||
      q.includes('نعناع') ||
      q.includes('قزبر') ||
      q.includes('معدنوس') ||
      q.includes('خضار') ||
      q.includes('خضر') ||
      q.includes('فواكه') ||
      q.includes('محل'))
  ) {
    return 'general_advice';
  }

  // 7. حركات وتدقيق المخزون
  if (
    q.includes('حركات') ||
    q.includes('حركة') ||
    q.includes('ledger') ||
    q.includes('سجل التدقيق') ||
    q.includes('تعديل المخزون') ||
    q.includes('سجل الحركات') ||
    q.includes('خصم المخزون')
  ) {
    return 'inventory_movements';
  }

  // 8. المخزون والكميات وإعادة التوريد
  if (
    q.includes('مخزون') ||
    q.includes('ستوك') ||
    q.includes('stock') ||
    q.includes('إعادة التوريد') ||
    q.includes('إعادة توريد') ||
    q.includes('توريد') ||
    q.includes('خصاص') ||
    q.includes('ناقص') ||
    q.includes('نفاد') ||
    q.includes('سالا') ||
    q.includes('تقاضى') ||
    q.includes('شحال بقى')
  ) {
    return 'inventory_health';
  }

  // 9. المبيعات والإيرادات
  if (
    q.includes('مبيعات') ||
    q.includes('إيرادات') ||
    q.includes('شحال دخلنا') ||
    q.includes('دخل') ||
    q.includes('أرباح') ||
    q.includes('فلوس') ||
    q.includes('sales') ||
    q.includes('revenue') ||
    q.includes('متوسط السلة') ||
    q.includes('ملخص اليوم')
  ) {
    return 'sales_period';
  }

  // 10. الطلبات والتوصيل
  if (
    q.includes('طلب') ||
    q.includes('طلبات') ||
    q.includes('orders') ||
    q.includes('pending') ||
    q.includes('كوموند') ||
    q.includes('قيد الانتظار') ||
    q.includes('مجهزة') ||
    q.includes('مسلمة') ||
    q.includes('توصيل') ||
    q.includes('livraison')
  ) {
    return 'orders_tracking';
  }

  // 11. المنتجات والأسعار وتعداد الكتالوج
  if (
    q.includes('كم عدد المنتجات') ||
    q.includes('عدد المنتجات') ||
    q.includes('منتجات متوفرة') ||
    q.includes('أثمنة') ||
    q.includes('أسعار') ||
    q.includes('سعر') ||
    q.includes('ثمن') ||
    q.includes('خضار') ||
    q.includes('فواكه') ||
    q.includes('طماطم') ||
    q.includes('بطاطس') ||
    q.includes('بصل') ||
    q.includes('جزر') ||
    q.includes('كتالوج')
  ) {
    return 'products_pricing';
  }

  // 12. معلومات وسياسات المتجر
  if (
    q.includes('مناطق التوصيل') ||
    q.includes('فاس') ||
    q.includes('شروط التوصيل') ||
    q.includes('التوصيل بالمجان') ||
    q.includes('الحد الأدنى للطلب') ||
    q.includes('أوقات العمل') ||
    q.includes('طرق الدفع')
  ) {
    return 'store_info';
  }

  return 'store_info';
}

// ────────────────────────────────────────────────────────────
// استخراج الفترة الزمنية من نص السؤال
// ────────────────────────────────────────────────────────────
function extractSalesPeriod(text: string): {
  period: 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'all_time';
  label: string;
} {
  const q = text.toLowerCase();
  if (q.includes('أمس') || q.includes('البارح') || q.includes('yesterday')) {
    return { period: 'yesterday', label: 'أمس' };
  }
  if (
    q.includes('آخر 7 أيام') ||
    q.includes('هاد السيمانة') ||
    q.includes('هذا الأسبوع') ||
    q.includes('أسبوع') ||
    q.includes('سيمانة')
  ) {
    return { period: 'last_7_days', label: 'آخر 7 أيام' };
  }
  if (
    q.includes('هذا الشهر') ||
    q.includes('هاد الشهر') ||
    q.includes('شهر') ||
    q.includes('this month')
  ) {
    return { period: 'this_month', label: 'هذا الشهر' };
  }
  if (
    q.includes('كامل الفترة') ||
    q.includes('كلشي') ||
    q.includes('all time') ||
    q.includes('تاريخ المتجر')
  ) {
    return { period: 'all_time', label: 'جميع الفترات' };
  }
  return { period: 'today', label: 'اليوم' };
}

// ────────────────────────────────────────────────────────────
// محرك المحادثة الرئيسي لـ Copilot v3
// ────────────────────────────────────────────────────────────
let geminiCooldownUntil = 0;

export async function executeCopilotChat(
  userMessage: string,
  history: CopilotChatHistoryMessage[] = [],
  options?: { preferDeterministic?: boolean }
): Promise<CopilotResponse> {
  const gemini = getGeminiClient();
  const toolsExecuted: ToolExecutionResult[] = [];
  const detectedIntent = classifyQuestionIntent(userMessage, history);

  // 1. إذا كان السؤال محاولة تعديل بيانات، نرفض التنفيذ لحماية أمان المتجر (Read-Only)
  if (detectedIntent === 'data_mutation_attempt') {
    return handleMutationAttempt(userMessage);
  }

  // 2. إذا كان السؤال غامضاً جداً، نطلب توضيحاً مقتضباً دون استدعاء LLM
  if (detectedIntent === 'ambiguous_clarification') {
    return handleAmbiguousQuestion(userMessage);
  }

  // 3. إذا كان عميل Gemini متاحاً، ننفذ دورة Function Calling الذكية مع الحفاظ على سياق المحادثة
  const isCooldownActive = Date.now() < geminiCooldownUntil;
  if (!options?.preferDeterministic && gemini && !isCooldownActive) {
    try {
      const contents: any[] = [];
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        contents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      const timeoutMs = 6000;
      const generateWithTimeout = (callOptions: any) =>
        Promise.race([
          gemini.models.generateContent(callOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API call timed out after 6s')), timeoutMs)
          ),
        ]) as Promise<any>;

      const response = await generateWithTimeout({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
          temperature: 0.2,
          tools: [{ functionDeclarations: COPILOT_FUNCTION_DECLARATIONS }],
        },
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        // تنفيذ أدوات القراءة بالتوازي
        const toolResponses = await Promise.all(
          functionCalls.map(async (call: any) => {
            const result = await dispatchCopilotTool(call.name, call.args);
            toolsExecuted.push(result);
            return {
              name: call.name,
              response: result.data,
            };
          })
        );

        const candidateContent = response.candidates?.[0]?.content;
        const toolFollowUpContents = [
          ...contents,
          candidateContent || {
            role: 'model',
            parts: functionCalls.map((fc: any) => ({
              functionCall: { name: fc.name, args: fc.args },
            })),
          },
          {
            role: 'user',
            parts: toolResponses.map((tr) => ({
              functionResponse: {
                name: tr.name,
                response: tr.response,
              },
            })),
          },
        ];

        const finalGen = await generateWithTimeout({
          model: GEMINI_MODEL,
          contents: toolFollowUpContents,
          config: {
            systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
            temperature: 0.2,
          },
        });

        let replyText = finalGen.text || 'تم فحص بيانات المتجر بنجاح.';
        if (!replyText.includes('الخلاصة')) {
          replyText = `**الخلاصة:** ${replyText}`;
        }
        const actions = extractSuggestedActions(userMessage, toolsExecuted);
        const hasRealData = toolsExecuted.some(
          (t) => t.isRealData === true && t.source === 'supabase_live' && t.status === 'success'
        );

        const metadata = buildResponseMetadata(detectedIntent, toolsExecuted, userMessage);

        return {
          reply: replyText,
          toolsExecuted: toolsExecuted.map((t) => ({
            toolName: t.toolName,
            source: t.source,
            status: t.status,
            summary: t.summary,
            isRealData: t.isRealData,
            data: t.data,
            errorMessage: t.errorMessage,
          })),
          suggestedActions: actions,
          dataContext: buildDataContextSummary(toolsExecuted),
          isRealData: hasRealData,
          modelUsed: GEMINI_MODEL,
          metadata,
        };
      }

      if (response.text) {
        let replyText = response.text;
        if (!replyText.includes('الخلاصة')) {
          replyText = `**الخلاصة:** ${replyText}`;
        }
        return {
          reply: replyText,
          toolsExecuted: [],
          suggestedActions: extractSuggestedActions(userMessage, []),
          dataContext: 'إجابة إرشادية عامة (لم يتم استدعاء أدوات المتجر).',
          isRealData: false,
          modelUsed: GEMINI_MODEL,
          metadata: {
            intent: detectedIntent,
            dataSource: 'none',
            toolsCount: 0,
            isRealData: false,
            status: 'general',
            limitations: ['إجابة استشارية عامة لا ترتبط ببيانات المخزون اللحظية.'],
          },
        };
      }
    } catch (err: any) {
      if (
        err?.status === 429 ||
        String(err?.message).includes('429') ||
        String(err?.message).includes('RESOURCE_EXHAUSTED') ||
        String(err?.message).includes('timed out')
      ) {
        geminiCooldownUntil = Date.now() + 60000;
        console.warn('[CopilotService] Gemini API 429/timeout reached. Activating deterministic engine fallback for 60s.');
      } else {
        console.warn('[CopilotService] Gemini execution fallback:', err?.message || err);
      }
    }
  }

  // في حال تعذر Gemini أو انقضاء مهلته، يتولى المحرك الحتمي المتقدم المعالجة مع الحفاظ الكامل على السياق
  return await executeDeterministicCopilot(userMessage, history);
}

// ────────────────────────────────────────────────────────────
// معالجة محاولات تعديل البيانات (Security Rejection Handler)
// ────────────────────────────────────────────────────────────
function handleMutationAttempt(userMessage: string): CopilotResponse {
  let reply = `🔒 **رفض التنفيذ — المساعد يعمل بوضع القراءة فقط (Strict Read-Only Mode):**\n\n`;
  reply += `**الخلاصة:** لا يمكن للمساعد الذكي تعديل أو كتابة أي بيانات في قاعدة البيانات.\n\n`;
  reply += `استلمت طلبك المتضمن محاولة تعديل بيانات ("${userMessage}").\n\n`;
  reply += `🛡️ **ضوابط الأمان ونزاهة منصة خُضرة فاس:**\n`;
  reply += `• صُمم Khodra AI Copilot ليكون **مساعداً تحليلياً واستشارياً فقط**؛ لا يمتلك أي أدوات كتابة أو صلاحيات لتغيير المخزون، أو تعديل أسعار البيع، أو حذف أو تعديل الطلبات.\n`;
  reply += `• هذا الإجراء إلزامي لحماية أمان المتجر وضمان عدم تغيير أي بيانات تشغيلية دون مصادقة إدارية بشرية صريحة.\n\n`;
  reply += `⚙️ **لتنفيذ هذا الإجراء يدوياً وبصورة آمنة:**\n`;
  if (userMessage.includes('مخزون') || userMessage.includes('stock')) {
    reply += `يرجى الانتقال إلى **لوحة إدارة المخزون** وتحديث الكميات عبر نموذج الحركات المعتمد.\n`;
  } else if (userMessage.includes('ثمن') || userMessage.includes('سعر') || userMessage.includes('price')) {
    reply += `يرجى الانتقال إلى **لوحة تسعير الصباح** لتعديل سعر البيع أو هامش الربح.\n`;
  } else if (userMessage.includes('طلب') || userMessage.includes('order')) {
    reply += `يرجى الانتقال إلى **لوحة إدارة الطلبات والأسطول** لتحديث حالة الطلب أو تعديله.\n`;
  } else {
    reply += `يرجى استخدام اللوحة الإدارية المخصصة لذلك في قائمة الإدارة.\n`;
  }

  const actions: CopilotAction[] = [
    { label: '📦 فتح لوحة المخزون', actionType: 'view_inventory' },
    { label: '💵 فتح لوحة التسعير', actionType: 'view_pricing' },
    { label: '🛵 فتح لوحة الطلبات', actionType: 'view_orders' },
  ];

  return {
    reply,
    toolsExecuted: [],
    suggestedActions: actions,
    dataContext: 'أمان النظام: تم حظر محاولة التعديل لحماية وضع القراءة فقط.',
    isRealData: false,
    modelUsed: 'khodra-security-guard',
    metadata: {
      intent: 'data_mutation_attempt',
      dataSource: 'none',
      toolsCount: 0,
      isRealData: false,
      status: 'security_blocked',
      limitations: [
        'المساعد التشغيلي للقراءة والتحليل فقط، ولا يمتلك أي صلاحيات تعديل أو حذف في قاعدة البيانات.',
      ],
    },
  };
}

// ────────────────────────────────────────────────────────────
// معالجة الأسئلة الغامضة لطلب التوضيح (Ambiguity Handler)
// ────────────────────────────────────────────────────────────
function handleAmbiguousQuestion(userMessage: string): CopilotResponse {
  const reply = `❓ **سؤالك يحتاج إلى توضيح أكثر سيدي المدير:**\n\nلقد استلمت استفسارك ("${userMessage}")، ولكي أزودك بأرقام وإحصائيات دقيقة وحقيقية من النظام، يرجى تحديد المجال المطلوب:\n\n1. 💰 **المبيعات والإيرادات:** هل تقصد مبيعات اليوم، مبيعات أمس، أم إجمالي الأسبوع بالدرهم؟\n2. 📦 **المخزون وإعادة التوريد:** هل تود فحص السلع الناقصة لبرمجتها من سوق بنسودة فجر الغد؟\n3. 🛵 **الطلبات والتوصيل:** هل تريد متابعة الطلبات الجديدة المعلقة (pending) وحالات السائقين؟\n4. 💵 **أسعار الكتالوج:** هل تبحث عن سعر أو توفر صنف خضار أو فاكهة محدد؟`;

  const actions: CopilotAction[] = [
    { label: '💰 مبيعات اليوم', actionType: 'view_sales' },
    { label: '📦 فحص المخزون والنواقص', actionType: 'view_inventory' },
    { label: '🛵 الطلبات قيد الانتظار', actionType: 'view_orders' },
  ];

  return {
    reply,
    toolsExecuted: [],
    suggestedActions: actions,
    dataContext: 'طلب توضيح (سؤال مقتضب يحتاج تحديد مجال الاستعلام).',
    isRealData: false,
    modelUsed: 'khodra-clarification-router',
    metadata: {
      intent: 'ambiguous_clarification',
      dataSource: 'none',
      toolsCount: 0,
      isRealData: false,
      status: 'needs_clarification',
      limitations: [
        'السؤال مقتضب ولا يحتوي على مؤشرات أو فترات زمنية كافية لتنفيذ استعلام دقيق.',
      ],
    },
  };
}

// ────────────────────────────────────────────────────────────
// المحرك الحتمي الذكي الشامل (Deterministic Engine v3)
// ────────────────────────────────────────────────────────────
export async function executeDeterministicCopilot(
  userMessage: string,
  history: CopilotChatHistoryMessage[] = []
): Promise<CopilotResponse> {
  const intent = classifyQuestionIntent(userMessage, history);
  const context = extractConversationContext(history);
  const toolsExecuted: ToolExecutionResult[] = [];
  let reply = '';
  const actions: CopilotAction[] = [];
  let limitations: string[] = [];
  let timePeriodLabel = 'اليوم';

  switch (intent) {
    // ══════════════════════════════════════════════════════════
    // 0️⃣ محاولة تعديل بيانات (Mutation Guard)
    // ══════════════════════════════════════════════════════════
    case 'data_mutation_attempt': {
      return handleMutationAttempt(userMessage);
    }

    // ══════════════════════════════════════════════════════════
    // 1️⃣ أسئلة المتابعة والربط بسياق المحادثة السابق (Follow-up Context)
    // ══════════════════════════════════════════════════════════
    case 'context_follow_up': {
      const q = userMessage.toLowerCase();
      const isSort = q.includes('رتب') || q.includes('ترتيب') || q.includes('من الأرخص') || q.includes('من الأغلى');
      const isWhy = q.includes('علاش') || q.includes('سبب') || q.includes('وشنو السبب') || q.includes('لماذا');
      const isAvail = q.includes('واش متوفر') || q.includes('متوفرين دابا') || q.includes('شحال كاين');

      // ── أ. المتابعة بفرز وترتيب المنتجات السابقة ──
      if (isSort) {
        const prodsRes = await executeGetProducts({ limit: 100 });
        toolsExecuted.push(prodsRes);

        if (prodsRes.status === 'not_configured') {
          const mentionedStr = context.lastMentionedProducts.length > 0 ? ` (${context.lastMentionedProducts.slice(0, 4).join('، ')})` : '';
          reply = `**الخلاصة أولاً:** تعذر استخراج الأسعار الحية لإجراء **الترتيب** للمنتجات المذكورة سابقاً${mentionedStr} نظراً لعدم تهيئة بيانات الاتصال بـ Supabase على الخادم.\n\n⚠️ **تنبيه:** يرجى إعداد الاتصال بقاعدة البيانات لجلب الأسعار الحية وإجراء الترتيب المطلوب.`;
        } else if (prodsRes.status === 'query_error' || prodsRes.status === 'connection_error') {
          reply = `❌ **خطأ استعلام:** تعذر جلب الأسعار بسبب خطأ في قاعدة البيانات: ${prodsRes.errorMessage}`;
        } else if (prodsRes.status === 'empty') {
          reply = `ℹ️ لا توجد منتجات مسجلة في جدول products لترتيبها.`;
        } else {
          const allProds = prodsRes.data.products || [];
          let targetList = allProds;

          if (context.lastMentionedProducts.length > 0) {
            const matched = allProds.filter((p: any) =>
              context.lastMentionedProducts.some(
                (name) => p.name.includes(name) || name.includes(p.name)
              )
            );
            if (matched.length > 0) targetList = matched;
          }

          // الترتيب حسب السعر (افتراضياً تصاعدياً إلا إذا طُلب العكس)
          const isDesc = q.includes('الأغلى') || q.includes('تنازلي');
          targetList.sort((a: any, b: any) =>
            isDesc ? b.price - a.price : a.price - b.price
          );

          reply = `📊 **ترتيب المنتجات المذكورة سابقاً حسب السعر بالدرهم (بيانات حية محدثة من Supabase):**\n\n`;
          reply += `**الخلاصة:** تم فحص الأسعار اللحظية لـ **${targetList.length} منتجات** وإعادة ترتيبها ${isDesc ? 'من الأغلى إلى الأرخص' : 'من الأقل سعراً إلى الأعلى'}:\n\n`;
          reply += `| الترتيب | المنتج | السعر الحالي | المخزون اللحظي | حالة التوفر |\n`;
          reply += `| :---: | :--- | :---: | :---: | :---: |\n`;

          targetList.slice(0, 10).forEach((p: any, idx: number) => {
            const availBadge = p.is_available ? '✅ متوفر' : '⚠️ نافد/حرج';
            reply += `| ${idx + 1} | **${p.name}** | ${p.price.toFixed(2)} DH/${p.unit} | ${p.stock} ${p.unit} | ${availBadge} |\n`;
          });

          reply += `\n💡 *ملاحظة تشغيلية:* هذه الأسعار والمخزون تم جلبها مباشرة الآن من قاعدة البيانات لضمان أحدث حالة متوفرة.`;
          actions.push({ label: '💵 مراجعة أسعار اليوم', actionType: 'view_pricing' });
          actions.push({ label: '📦 فحص المخزون بالكامل', actionType: 'view_inventory' });
        }
      }
      // ── ب. المتابعة بالسؤال عن الأسباب (وشنو السبب؟ / علاش؟) ──
      else if (isWhy) {
        const [movementsRes, salesRes] = await Promise.all([
          executeGetInventoryMovements({ limit: 12 }),
          executeGetSalesSummary({ period: 'today' }),
        ]);
        toolsExecuted.push(movementsRes, salesRes);

        reply = `🔍 **تحليل أسباب حالة المخزون والعمليات المذكورة بناءً على سجلات المتجر الحية:**\n\n`;
        reply += `**الخلاصة:** استناداً إلى سجل حركات المخزون (inventory_ledger) وسجل مبيعات اليوم، نلخص الأسباب التشغيلية في النقاط التالية:\n\n`;

        if (movementsRes.status === 'success' && movementsRes.data.movements?.length > 0) {
          const deducts = movementsRes.data.movements.filter(
            (m: any) => m.movement_type === 'order_deduct'
          );
          reply += `1. **حركات الخصم التلقائي عند تأكيد الطلبات:**\n`;
          reply += `   تم تسجيل **${deducts.length} حركة خصم** في سجل التدقيق مؤخراً لتجهيز طلبيات الزبناء المسجلة في فاس.\n\n`;
        } else {
          reply += `1. **حركات المخزون:** لا توجد حركات خصم مسجلة حديثاً في جدول inventory_ledger.\n\n`;
        }

        if (salesRes.status === 'success') {
          reply += `2. **حجم المبيعات والإقبال اليومي:**\n`;
          reply += `   تم تسجيل **${salesRes.data.total_orders} طلب** بإيراد مؤكد قدره **${salesRes.data.delivered_revenue_dh} درهم**، مما رفع معدل استهلاك الأصناف الأساسية لطاجين الغداء.\n\n`;
        }

        reply += `3. **توقيت التوريد الصباحي من سوق بنسودة:**\n`;
        reply += `   الأصناف الأساسية تُشترى فجراً من سوق الجملة، وعند نفاد الدفعة الأولى لا يتم تزويدها ثانية حتى فجر اليوم التالي لتفادي السلع غير الطازجة.\n`;

        actions.push({ label: '📦 فحص سجل الحركات الكامل', actionType: 'view_inventory' });
      }
      // ── ج. المتابعة بالتحقق من التوفر اللحظي الحي ──
      else if (isAvail) {
        const invRes = await executeGetInventory({ filter: 'all' });
        toolsExecuted.push(invRes);

        if (invRes.status === 'success') {
          reply = `📦 **الفحص اللحظي لتوفر المنتجات المذكورة (إعادة جلب حي للبيانات):**\n\n`;
          reply += `**الخلاصة:** أعدنا فحص جدول products الآن للتأكد من الكميات الحالية دون الاعتماد على بيانات الذاكرة القديمة:\n\n`;
          reply += `| المنتج | المخزون المتبقي | التقييم اللحظي | التوجيه التشغيلي |\n`;
          reply += `| :--- | :---: | :---: | :--- |\n`;

          const invItems = [
            ...(invRes.data.healthy_sample || []),
            ...(invRes.data.low_stock_list || []),
            ...(invRes.data.out_of_stock_list || []),
          ];

          let matched = invItems.filter((i: any) =>
            context.lastMentionedProducts.some(
              (name) => i.name.includes(name) || name.includes(i.name)
            )
          );

          if (matched.length === 0) matched = invItems.slice(0, 5);

          matched.forEach((item: any) => {
            const badge =
              item.stock <= 0
                ? '❌ نافد (0 كجم)'
                : item.stock <= 5
                ? '⚠️ حرج (<= 5 كجم)'
                : '✅ متوفر بأمان';
            const action =
              item.stock <= 0
                ? 'برمجة شراء عاجل من سوق بنسودة'
                : item.stock <= 5
                ? 'إعادة التزويد لمنع النفاد'
                : 'جاهز لتجهيز الطلبات';
            reply += `| **${item.name}** | ${item.stock} ${item.unit} | ${badge} | ${action} |\n`;
          });

          reply += `\n🔒 *تأكيد الأمان والدقة:* هذه الأرقام مستخرجة مباشرة من حالة قاعدة البيانات اللحظية.`;
          actions.push({ label: '📦 فتح لوحة المخزون', actionType: 'view_inventory' });
        } else {
          reply = `⚠️ تعذر استعلام المخزون اللحظي: ${invRes.summary}`;
        }
      }
      // ── د. متابعة عامة بالتفاصيل ──
      else {
        const prodsRes = await executeGetProducts({ limit: 30 });
        toolsExecuted.push(prodsRes);
        reply = `🌿 **تفاصيل المنتجات المذكورة في المحادثة السابقة:**\n\n`;
        reply += `**الخلاصة:** تتبعنا استفسارك المتعلق بالسياق السابق (${context.lastMentionedProducts.join('، ') || 'المنتجات الأخيرة'}):\n\n`;
        if (prodsRes.status === 'success') {
          reply += `| المنتج | الفئة | السعر | التوفر |\n`;
          reply += `| :--- | :---: | :---: | :---: |\n`;
          prodsRes.data.products?.slice(0, 6).forEach((p: any) => {
            reply += `| **${p.name}** | ${p.category} | ${p.price} DH | ${p.is_available ? '✅ متوفر' : '❌ نافد'} |\n`;
          });
        }
        actions.push({ label: '📦 فحص المخزون', actionType: 'view_inventory' });
      }
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 2️⃣ الأسئلة المركبة متعددة الأدوات (Compound Multi-Tool)
    // ══════════════════════════════════════════════════════════
    case 'compound_multi_tool': {
      const q = userMessage.toLowerCase();
      const isOrdersAndStock =
        (q.includes('طلب') || q.includes('orders') || q.includes('pending')) &&
        (q.includes('مخزون') || q.includes('ستوك') || q.includes('نقص') || q.includes('نافد') || q.includes('ربط'));

      // ── أ. سؤال مركب يربط المخزون بالطلبات ──
      if (isOrdersAndStock) {
        limitations = [
          'تم ربط قائمة الطلبات قيد الانتظار (pending) مع قائمة المخزون اللحظي للمستودع.',
          'الطلبات المكتملة أو الملغاة تم استبعادها من فحص نقص التجهيز.',
        ];

        const [ordersRes, invRes] = await Promise.all([
          executeGetOrders({ status: 'pending', limit: 25 }),
          executeGetInventory({ filter: 'all' }),
        ]);
        toolsExecuted.push(ordersRes, invRes);

        if (ordersRes.status === 'not_configured' || invRes.status === 'not_configured') {
          reply = `⚠️ **تنبيه الاتصال بقاعدة البيانات:**\n\nقاعدة بيانات Supabase غير مهيأة على الخادم. تعذر الربط المركب بين المخزون والطلبات.`;
          actions.push({ label: '🛵 لوحة الطلبات', actionType: 'view_orders' });
        } else if (ordersRes.status === 'query_error' || invRes.status === 'query_error') {
          reply = `❌ **خطأ استعلام:** تعذر إتمام أحد الاستعلامات المركبة من قاعدة البيانات.`;
          actions.push({ label: '🛵 لوحة الطلبات', actionType: 'view_orders' });
        } else {
          const pendingOrders = ordersRes.data.orders || [];
          const invData = invRes.data;
          const outOfStockNames = new Set((invData.out_of_stock_list || []).map((i: any) => i.name));
          const lowStockNames = new Set((invData.low_stock_list || []).map((i: any) => i.name));

          reply = `🛵📦 **تحليل مركب: ربط المخزون اللحظي بالطلبات المعلقة (Pending Orders):**\n\n`;

          // الخلاصة التنفيذية أولاً
          const totalPending = pendingOrders.length;
          const affectedOrders: any[] = [];

          pendingOrders.forEach((ord: any) => {
            const items = ord.items || [];
            const atRiskItems: string[] = [];
            items.forEach((it: any) => {
              const name = it.name || '';
              if (outOfStockNames.has(name)) {
                atRiskItems.push(`❌ ${name} (نافد بالمستودع)`);
              } else if (lowStockNames.has(name)) {
                atRiskItems.push(`⚠️ ${name} (كمية محدودة)`);
              }
            });
            if (atRiskItems.length > 0) {
              affectedOrders.push({
                order: ord,
                risks: atRiskItems,
              });
            }
          });

          reply += `**الخلاصة أولاً:**\n`;
          reply += `• إجمالي الطلبات قيد الانتظار: **${totalPending} طلبات**\n`;
          reply += `• طلبات آمنة التجهيز بالكامل: **${totalPending - affectedOrders.length} طلبات**\n`;
          reply += `• طلبات تتأثر بنقص أو نفاد المخزون: **${affectedOrders.length} طلبات**\n\n`;

          if (affectedOrders.length > 0) {
            reply += `| كود الطلب | العميل / الحي | إجمالي السلة | السلع المتأثرة بالنقص بالمستودع |\n`;
            reply += `| :---: | :--- | :---: | :--- |\n`;
            affectedOrders.slice(0, 6).forEach((item) => {
              reply += `| **${item.order.order_code}** | ${item.order.customer_name} (${item.order.delivery_zone}) | ${item.order.total_dh} DH | ${item.risks.join('، ')} |\n`;
            });
            reply += `\n🚨 **توصية تشغيلية عاجلة:** يرجى التنسيق فوراً مع فريق التجهيز أو برمجة جلب النواقص فجراً من سوق بنسودة لتفادي تأخير التوصيل.\n`;
          } else if (totalPending > 0) {
            reply += `✅ **حالة ممتازة:** جميع الطلبات قيد الانتظار تتوفر سلعها بكميات آمنة في المستودع ويمكن تجهيزها للتوصيل الفوري دون عراقيل.\n`;
          } else {
            reply += `ℹ️ لا توجد طلبات معلقة قيد الانتظار حالياً في النظام.\n`;
          }

          actions.push({ label: '🛵 إدارة وتوزيع الطلبات', actionType: 'view_orders' });
          actions.push({ label: '📦 فتح لوحة المخزون', actionType: 'view_inventory' });
        }
      }
      // ── ب. سؤال مركب يربط المبيعات بالمخزون (الأكثر مبيعاً + فحص المخزون) ──
      else {
        limitations = [
          'تم دمج إحصائيات المبيعات التاريخية مع الجرد اللحظي لجدول المنتجات دون تكرار.',
        ];

        const [salesRes, invRes] = await Promise.all([
          executeGetSalesSummary({ period: 'all_time' }),
          executeGetInventory({ filter: 'all' }),
        ]);
        toolsExecuted.push(salesRes, invRes);

        if (salesRes.status === 'not_configured' || invRes.status === 'not_configured') {
          reply = `⚠️ **تنبيه الاتصال بقاعدة البيانات:**\n\nتعذر تنفيذ الاستعلام المركب لعدم تهيئة بيانات الاتصال بـ Supabase على الخادم.`;
          actions.push({ label: '📦 فتح لوحة المخزون', actionType: 'view_inventory' });
        } else if (salesRes.status === 'query_error' || invRes.status === 'query_error') {
          reply = `❌ **خطأ استعلام:** تعذر إتمام أحد الاستعلامات المركبة من قاعدة البيانات.`;
          actions.push({ label: '📦 فتح لوحة المخزون', actionType: 'view_inventory' });
        } else {
          const topItems = salesRes.data.top_selling_items || [];
          const invData = invRes.data;

          reply = `🧺 **تحليل مركب: المنتجات الأكثر طلباً وحالة مخزونها اللحظي بالمستودع:**\n\n`;
          reply += `**الخلاصة:** تم فحص المنتجات الأكثر طلباً في سلات الزبناء ومطابقتها مع كمياتها الحالية بالمستودع:\n\n`;

          if (topItems.length > 0) {
            reply += `| المنتج | إجمالي الطلب | عدد الطلبات | الوضع اللحظي بالمستودع |\n`;
            reply += `| :--- | :---: | :---: | :--- |\n`;

            topItems.slice(0, 5).forEach((item: any) => {
              const inLow = invData.low_stock_list?.find((x: any) => x.name === item.name);
              const inOut = invData.out_of_stock_list?.find((x: any) => x.name === item.name);

              let stockVerdict = '✅ متوفر بأمان';
              if (inOut) stockVerdict = '❌ نافد (0 كجم) — توريد عاجل!';
              else if (inLow) stockVerdict = `⚠️ محدود (${inLow.stock} ${inLow.unit})`;

              reply += `| **${item.name}** | ${item.total_quantity} ${item.unit} | ${item.in_orders_count} طلب | ${stockVerdict} |\n`;
            });
            reply += `\n📦 **مؤشر صحة المخزون العام:** ${invData.inventory_health_percentage}%\n`;
          } else {
            reply += `لا توجد بيانات كافية في سجل الطلبات للمنتجات الأكثر مبيعاً.\n`;
          }

          actions.push({ label: '📦 مراجعة المخزون الكامل', actionType: 'view_inventory' });
          actions.push({ label: '💵 مراجعة أسعار سوق بنسودة', actionType: 'view_pricing' });
        }
      }
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 3️⃣ أسئلة خارج المخطط وحدود البيانات (Schema Limitations)
    // ══════════════════════════════════════════════════════════
    case 'schema_limitation': {
      const sales = await executeGetSalesSummary({ period: 'today' });
      toolsExecuted.push(sales);
      limitations = [
        'جدول الطلبات يسجل إجمالي البيع ومصاريف التوصيل، بينما تكاليف الشراء بالجملة (COGS) ومصاريف الوقود ورواتب السائقين غير مسجلة في المخطط.',
        'لا يمكن احتساب صافي الربح (Net Profit) بدقة تجنباً لاختلاق بيانات غير مؤكدة.',
        'لا تسجل قاعدة البيانات تكاليف الشراء أو مصاريف التشغيل لحساب صافي الربح.',
      ];

      reply = `⚠️ **تنبيه الشفافية وحدود بيانات النظام (Schema Boundaries):**\n\n`;
      reply += `**الخلاصة:** لا يمكن احتساب صافي الربح (Net Profit) أو مصاريف الديزل لأنها غير مسجلة في قاعدة البيانات.\n\n`;
      reply += `تعتمد منصة خُضرة على الشفافية التامة؛ جدول الطلبات \`orders\` في قاعدة البيانات يسجل بدقة:\n`;
      reply += `• إجمالي قيمة السلة للزبون (\`total\`)\n`;
      reply += `• مصاريف التوصيل (\`delivery_fee\`)\n`;
      reply += `• حالة الطلب (مسلم، قيد الانتظار، ملغي)\n\n`;
      reply += `🚫 **البيانات غير المتوفرة في المخطط الحالي:**\n`;
      reply += `تكلفة شراء السلع بالجملة من الفلاحين أو سوق بنسودة (COGS)، ومصاريف استهلاك الوقود للمركبات، ورواتب الموزعين **غير مسجلة في جداول قاعدة البيانات الحالية**.\n\n`;
      reply += `لذا، **لا يمكن احتساب صافي الربح (Net Profit)** بدقة في هذه المرحلة، والتزاماً بنزاهة المنصة، لن نختلق أي تقديرات غير مؤكدة.\n\n`;

      if (sales.status === 'success') {
        const d = sales.data;
        reply += `📊 **البيانات المتاحة والمؤكدة لـ (${d.period}):**\n`;
        reply += `• إجمالي الإيرادات المؤكدة (الطلبات المسلمة): **${d.delivered_revenue_dh} درهم** (${d.delivered_orders_count} طلب مسلّم)\n`;
        reply += `• طلبات قيد الإنجاز: **${d.pending_orders_count} طلب** بقيمة محتملة: **${d.pending_potential_revenue_dh} درهم**\n`;
      } else if (sales.status === 'empty') {
        reply += `ℹ️ *لا توجد طلبات مسجلة اليوم لحساب الإيرادات المتاحة.*`;
      } else {
        reply += `⚠️ *تعذر الاتصال بقاعدة البيانات لجلب الإيرادات.*`;
      }

      actions.push({ label: '💰 مراجعة إيرادات اليوم', actionType: 'view_sales' });
      actions.push({ label: '🛵 استعلام الطلبات المسلمة', actionType: 'view_orders' });
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 4️⃣ مقارنة المبيعات بين فترتين (Sales Comparison)
    // ══════════════════════════════════════════════════════════
    case 'sales_comparison': {
      const q = userMessage.toLowerCase();
      let p1: any = 'today';
      let p2: any = 'yesterday';
      let labelComp = 'اليوم مقارنة بأمس';

      if (q.includes('أسبوع') || q.includes('سيمانة')) {
        p1 = 'last_7_days';
        p2 = 'previous_7_days';
        labelComp = 'آخر 7 أيام مقارنة بالـ 7 أيام السابقة';
      } else if (q.includes('شهر')) {
        p1 = 'this_month';
        p2 = 'last_month';
        labelComp = 'هذا الشهر مقارنة بالشهر الماضي';
      }

      timePeriodLabel = labelComp;
      limitations = [
        'المقارنة مبنية حصراً على الطلبات المسلمة (Delivered Orders).',
        'الطلبات الملغاة تم استبعادها من حساب الإيرادات المقارنة.',
      ];

      const [res1, res2] = await Promise.all([
        executeGetSalesSummary({ period: p1 }),
        executeGetSalesSummary({ period: p2 }),
      ]);
      toolsExecuted.push(res1, res2);

      if (res1.status === 'not_configured' || res2.status === 'not_configured') {
        reply = `⚠️ **تنبيه الاتصال بقاعدة البيانات:**\n\nقاعدة بيانات Supabase غير مهيأة على الخادم. تعذر إجراء مقارنة المبيعات بين الفترتين.`;
        actions.push({ label: '🛵 عرض الطلبات', actionType: 'view_orders' });
      } else if (res1.status === 'query_error' || res2.status === 'query_error') {
        reply = `❌ **خطأ في استعلام المقارنة:**\n\nحدث خطأ أثناء جلب بيانات إحدى الفترتين من قاعدة البيانات.`;
        actions.push({ label: '🛵 عرض الطلبات', actionType: 'view_orders' });
      } else {
        const d1 = res1.data;
        const d2 = res2.data;

        const rev1 = d1.delivered_revenue_dh || 0;
        const rev2 = d2.delivered_revenue_dh || 0;
        const diffRev = Math.round((rev1 - rev2) * 100) / 100;

        const ord1 = d1.delivered_orders_count || 0;
        const ord2 = d2.delivered_orders_count || 0;
        const diffOrd = ord1 - ord2;

        reply = `📊 **تقرير مقارنة المبيعات التشغيلية (${labelComp}) — بيانات حية:**\n\n`;
        reply += `**الخلاصة أولاً:**\n`;
        const revTrend = diffRev > 0 ? '🟢 زيادة' : diffRev < 0 ? '🔴 تراجع' : '⚪ استقرار';
        reply += `سجلت الفترة الحالية **${revTrend} في الإيرادات بقيمة ${Math.abs(diffRev)} درهم** مع فارق **${diffOrd >= 0 ? '+' : ''}${diffOrd} طلب مسلّم**.\n\n`;

        reply += `| المؤشر التشغيلي | الفترة الحالية (${d1.period}) | الفترة السابقة (${d2.period}) | الفرق والتغير |\n`;
        reply += `| :--- | :---: | :---: | :---: |\n`;
        reply += `| إيرادات التسليم المؤكدة | **${rev1} DH** | **${rev2} DH** | ${diffRev >= 0 ? '+' : ''}${diffRev} DH |\n`;
        reply += `| الطلبات المسلمة بنجاح | **${ord1} طلب** | **${ord2} طلب** | ${diffOrd >= 0 ? '+' : ''}${diffOrd} طلب |\n`;
        reply += `| متوسط السلة (AOV) | **${d1.average_order_value_dh || 0} DH** | **${d2.average_order_value_dh || 0} DH** | ${((d1.average_order_value_dh || 0) - (d2.average_order_value_dh || 0)).toFixed(2)} DH |\n\n`;

        if (d1.top_selling_items?.length > 0) {
          reply += `🔥 الصنف الأكثر طلباً حالياً: **${d1.top_selling_items[0].name}** (${d1.top_selling_items[0].total_quantity} ${d1.top_selling_items[0].unit})\n`;
        }

        actions.push({ label: '📢 إطلاق حملة لتنشيط المبيعات', actionType: 'create_campaign' });
        actions.push({ label: '🛵 استعلام الطلبات الحالية', actionType: 'view_orders' });
      }
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 5️⃣ المخزون وتحليل أولويات إعادة التوريد (Inventory Health)
    // ══════════════════════════════════════════════════════════
    case 'inventory_health': {
      const q = userMessage.toLowerCase();
      const isReorderQuery =
        q.includes('إعادة التوريد') ||
        q.includes('إعادة توريد') ||
        q.includes('خاصنا نجيبو') ||
        q.includes('النواقص');

      const inv = await executeGetInventory({ filter: 'all' });
      toolsExecuted.push(inv);

      if (inv.status === 'not_configured') {
        reply = `⚠️ **تنبيه الاتصال بقاعدة البيانات:**\n\nقاعدة بيانات Supabase غير مهيأة على الخادم. تعذر فحص المخزون اللحظي للمتجر.`;
        actions.push({ label: '📦 فتح لوحة المخزون', actionType: 'view_inventory' });
      } else if (inv.status === 'query_error' || inv.status === 'connection_error') {
        reply = `❌ **خطأ استعلام:** تعذر فحص المخزون بسبب خطأ في قاعدة البيانات: ${inv.errorMessage}`;
        actions.push({ label: '📦 فتح لوحة المخزون', actionType: 'view_inventory' });
      } else if (inv.status === 'empty') {
        reply = `📦 **تقرير المخزون:** تم الاتصال بقاعدة البيانات بنجاح: لا توجد منتجات مسجلة في جدول products.`;
        actions.push({ label: '➕ إضافة منتجات جديدة', actionType: 'view_inventory' });
      } else {
        const { data } = inv;
        const lowCount = data.low_stock_count || 0;
        const outCount = data.out_of_stock_count || 0;
        const reorderList = data.reorder_recommendations || [];

        if (isReorderQuery) {
          reply = `🛒 **قائمة أولويات إعادة التوريد من سوق الجملة بنسودة — فاس (بيانات حية):**\n\n`;
          reply += `**الخلاصة:** يوجد **${reorderList.length} صنفاً** بحاجة لإعادة التزويد من سوق بنسودة لتفادي نفاد السلات.\n\n`;

          if (reorderList.length === 0) {
            reply += `✅ **المخزون مكتمل وممتاز!** جميع الـ **${data.total_products} منتجاً** المسجلة تتوفر على كميات آمنة (> 5 كجم).\n`;
          } else {
            reply += `| الترتيب | الصنف المطلوب | الكمية المتبقية | مستوى الأولوية | الإجراء التشغيلي |\n`;
            reply += `| :---: | :--- | :---: | :---: | :--- |\n`;
            reorderList.slice(0, 8).forEach((item: any, i: number) => {
              reply += `| ${i + 1} | **${item.name}** | ${item.stock} ${item.unit} | ${item.priority.includes('عاجل') ? '🚨 عاجل' : '⚠️ مرتفع'} | ${item.action} |\n`;
            });
            reply += `\n💡 *توجيه تشغيلي:* يرجى إدراج هذه الأصناف في قائمة مشتريات فجر الغد من سوق بنسودة.\n`;
          }
        } else {
          reply = `📦 **تقرير المخزون اللحظي لمتجر خُضرة فاس (بيانات حية من Supabase):**\n\n`;
          reply += `**الخلاصة أولاً:**\n`;
          reply += `المستودع يحتوي على **${data.total_products} منتجاً** مسجلاً بنسبة صحة مخزون **${data.inventory_health_percentage}%**.\n\n`;
          reply += `• **المتوفر بأمان (> 5 كجم/وحدة):** ${data.available_healthy_count} منتج\n`;
          reply += `• **المنتجات منخفضة المخزون (1 إلى 5):** ${lowCount} منتجات\n`;
          reply += `• **المنتجات غير المتوفرة (0):** ${outCount} منتج\n\n`;

          if (lowCount > 0 || outCount > 0) {
            reply += `| المنتج الحرج | المخزون المتبقي | الحالة |\n`;
            reply += `| :--- | :---: | :---: |\n`;
            data.low_stock_list?.slice(0, 5).forEach((item: any) => {
              reply += `| **${item.name}** | ${item.stock} ${item.unit} | ⚠️ مخزون محدود |\n`;
            });
            data.out_of_stock_list?.slice(0, 5).forEach((item: any) => {
              reply += `| **${item.name}** | ${item.stock} ${item.unit} | ❌ نافد (0 كجم) |\n`;
            });
          }
        }

        actions.push({ label: '📦 فتح لوحة المخزون لإعادة التزويد', actionType: 'view_inventory' });
        actions.push({ label: '💵 مراجعة أسعار سوق بنسودة', actionType: 'view_pricing' });
      }
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 6️⃣ المنتجات والأسعار وتعداد الكتالوج (Products Pricing)
    // ══════════════════════════════════════════════════════════
    case 'products_pricing': {
      const q = userMessage.toLowerCase();
      const isCountQuery =
        q.includes('كم عدد') ||
        q.includes('شحال من منتوج') ||
        q.includes('عدد المنتجات') ||
        q.includes('شحال كاين من صنف');

      const prods = await executeGetProducts({ limit: 100 });
      toolsExecuted.push(prods);

      if (prods.status === 'not_configured') {
        reply = `⚠️ **تنبيه الاتصال بقاعدة البيانات:**\n\nقاعدة بيانات Supabase غير مهيأة على الخادم. تعذر جلب المنتجات وأسعارها الحقيقية.`;
        actions.push({ label: '💵 مراجعة الأسعار في الإدارة', actionType: 'view_pricing' });
      } else if (prods.status === 'query_error' || prods.status === 'connection_error') {
        reply = `❌ **خطأ استعلام:** تعذر جلب المنتجات بسبب خطأ في قاعدة البيانات: ${prods.errorMessage}`;
        actions.push({ label: '💵 مراجعة الأسعار في الإدارة', actionType: 'view_pricing' });
      } else if (prods.status === 'empty') {
        reply = `🌿 **قائمة المنتجات:** تم الاتصال بقاعدة البيانات بنجاح، ولكن لا توجد منتجات مسجلة حالياً في جدول products.`;
        actions.push({ label: '➕ إضافة منتجات جديدة', actionType: 'view_inventory' });
      } else {
        const { data } = prods;
        const total = data.total_returned || 0;
        const available = data.total_available_in_batch || 0;
        const outOfStock = data.total_out_of_stock_in_batch || 0;

        if (isCountQuery) {
          reply = `🌿 **إحصائية المنتجات المسجلة بمتجر خُضرة فاس (بيانات حية من Supabase):**\n\n`;
          reply += `**الخلاصة أولاً:**\n`;
          reply += `يضم الكتالوج **${total} منتجاً مسجلاً**، منها **${available} منتجاً متوفراً** وجاهزاً للطلب الفوري بنسبة جاهزية **${total > 0 ? Math.round((available / total) * 100) : 100}%**.\n\n`;
          reply += `• **المنتجات المتوفرة:** **${available} منتج**\n`;
          reply += `• **المنتجات غير المتوفرة حالياً:** **${outOfStock} منتج**\n\n`;
          reply += `جميع هذه الأصناف مربوطة بأسعار السوق اليومي ويتم تزويدها صباح كل يوم من سوق الجملة بنسودة بفاس.`;
        } else {
          reply = `🌿 **قائمة أسعار عينة من منتجات متجر خُضرة فاس (بيانات حية):**\n\n`;
          reply += `**الخلاصة:** إجمالي المنتجات المسجلة في المتجر هو **${total} منتجاً** (${available} متوفر).\n\n`;
          reply += `| المنتج | السعر المعتمد | الوحدة | حالة التوفر | المخزون اللحظي |\n`;
          reply += `| :--- | :---: | :---: | :---: | :---: |\n`;
          data.products.slice(0, 8).forEach((p: any) => {
            const availBadge = p.is_available ? '✅ متوفر' : '❌ نافد';
            reply += `| **${p.name}** | ${p.price.toFixed(2)} DH | ${p.unit} | ${availBadge} | ${p.stock} |\n`;
          });
        }

        actions.push({ label: '💵 مراجعة وتحديث أسعار اليوم', actionType: 'view_pricing' });
        actions.push({ label: '📦 فحص المخزون بالكامل', actionType: 'view_inventory' });
      }
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 7️⃣ المبيعات والإيرادات لفترة محددة (Sales Period)
    // ══════════════════════════════════════════════════════════
    case 'sales_period': {
      const parsed = extractSalesPeriod(userMessage);
      timePeriodLabel = parsed.label;
      limitations = [
        'الإيرادات محسوبة حصراً على الطلبات المسلمة (Delivered Orders).',
        'الطلبات المعلقة والملغاة تم فرزها بشكل منفصل.',
      ];

      const sales = await executeGetSalesSummary({ period: parsed.period });
      toolsExecuted.push(sales);

      if (sales.status === 'not_configured') {
        reply = `⚠️ **تنبيه الاتصال بقاعدة البيانات:**\n\nقاعدة بيانات Supabase غير مهيأة على الخادم. تعذر جلب تقرير المبيعات الحقيقي.`;
        actions.push({ label: '🛵 عرض الطلبات', actionType: 'view_orders' });
      } else if (sales.status === 'query_error' || sales.status === 'connection_error') {
        reply = `❌ **خطأ استعلام:** تعذر حساب تقرير المبيعات بسبب خطأ في قاعدة البيانات: ${sales.errorMessage}`;
        actions.push({ label: '🛵 عرض الطلبات', actionType: 'view_orders' });
      } else if (sales.status === 'empty') {
        reply = `💰 **ملخص المبيعات التشغيلي (${sales.data?.period || parsed.label}) — خُضرة فاس:**\n\nتم الاتصال بقاعدة البيانات بنجاح: لا توجد طلبات مسجلة في هذه الفترة المحددة حتى الآن لحساب الإيرادات.`;
        actions.push({ label: '🛵 عرض الطلبات', actionType: 'view_orders' });
        actions.push({ label: '📢 إطلاق حملة تسويقية لتنشيط المبيعات', actionType: 'create_campaign' });
      } else {
        const { data } = sales;
        reply = `💰 **ملخص المبيعات التشغيلي (${data.period}) — خُضرة فاس (بيانات حية):**\n\n`;
        reply += `**الخلاصة أولاً:**\n`;
        reply += `سجلت منصة خُضرة **${data.total_orders} طلباً** بإجمالي إيراد تسليم مؤكد قدره **${data.delivered_revenue_dh} درهم** (${data.delivered_orders_count} طلب مسلّم).\n\n`;
        reply += `• **الطلبات المسلمة بنجاح:** **${data.delivered_orders_count} طلب** | الإيراد: **${data.delivered_revenue_dh} DH**\n`;
        reply += `• **الطلبات قيد الإنجاز (جديدة/مجهزة):** **${data.pending_orders_count} طلب** | بقيمة محتملة: **${data.pending_potential_revenue_dh} DH**\n`;
        reply += `• **الطلبات الملغاة:** ${data.cancelled_orders_count} طلبات\n`;
        reply += `• **متوسط قيمة الطلب (AOV):** **${data.average_order_value_dh} درهم**\n\n`;

        if (data.top_selling_items?.length > 0) {
          reply += `| الصنف الأكثر طلباً | الكمية المطلوبة | عدد الطلبات |\n`;
          reply += `| :--- | :---: | :---: |\n`;
          data.top_selling_items.slice(0, 5).forEach((item: any) => {
            reply += `| **${item.name}** | ${item.total_quantity} ${item.unit} | ${item.in_orders_count} طلب |\n`;
          });
        }

        actions.push({ label: '🛵 استعلام الطلبات الحالية', actionType: 'view_orders' });
        actions.push({ label: '📢 إنشاء حملة ترويجية للمبيعات', actionType: 'create_campaign' });
      }
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 8️⃣ الطلبات ومتابعة التوصيل (Orders Tracking)
    // ══════════════════════════════════════════════════════════
    case 'orders_tracking': {
      const q = userMessage.toLowerCase();
      const statusFilter = q.includes('جديد') || q.includes('pending') ? 'pending' : 'all';
      const orders = await executeGetOrders({ status: statusFilter, limit: 15 });
      toolsExecuted.push(orders);

      if (orders.status === 'not_configured') {
        reply = `⚠️ **تنبيه الاتصال بقاعدة البيانات:**\n\nقاعدة بيانات Supabase غير مهيأة على الخادم. تعذر جلب سجل الطلبات الحقيقي للمتجر.`;
        actions.push({ label: '🛵 لوحة الطلبات والأسطول', actionType: 'view_orders' });
      } else if (orders.status === 'query_error' || orders.status === 'connection_error') {
        reply = `❌ **خطأ استعلام:** تعذر جلب الطلبات بسبب خطأ في قاعدة البيانات: ${orders.errorMessage}`;
        actions.push({ label: '🛵 لوحة الطلبات والأسطول', actionType: 'view_orders' });
      } else if (orders.status === 'empty') {
        reply = `🛵 **حالة الطلبات الحالية (${orders.data?.period_label || 'اليوم'}):**\n\nتم الاتصال بقاعدة البيانات بنجاح: لا توجد طلبات مسجلة حالياً في النظام تطابق هذا البحث.`;
        actions.push({ label: '🛵 لوحة الطلبات', actionType: 'view_orders' });
      } else {
        const { data } = orders;
        reply = `🛵 **حالة الطلبات الحالية (${data.period_label}) — بيانات حية من Supabase:**\n\n`;
        reply += `**الخلاصة أولاً:**\n`;
        reply += `تم رصد **${data.total_orders_found} طلبات** في النظام، منها **${data.counts_by_status.pending} طلبات قيد الانتظار** تحتاج متابعة فورية.\n\n`;
        reply += `• **قيد الانتظار (جديدة):** **${data.counts_by_status.pending}** طلب\n`;
        reply += `• **تم التجهيز بالمستودع:** ${data.counts_by_status.prepared} طلب\n`;
        reply += `• **تم التوصيل بنجاح:** ${data.counts_by_status.delivered} طلب\n`;
        reply += `• **ملغية:** ${data.counts_by_status.cancelled} طلب\n\n`;

        if (data.orders?.length > 0) {
          reply += `| كود الطلب | العميل | المنطقة | الحالة | الإجمالي |\n`;
          reply += `| :---: | :--- | :---: | :---: | :---: |\n`;
          data.orders.slice(0, 5).forEach((ord: any) => {
            reply += `| **${ord.order_code}** | ${ord.customer_name} | منطقة ${ord.delivery_zone} | ${ord.status_arabic} | **${ord.total_dh} DH** |\n`;
          });
        }

        actions.push({ label: '🛵 إدارة وتوزيع الطلبات على السائقين', actionType: 'view_orders' });
      }
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 9️⃣ حركات وتدقيق المخزون (Inventory Movements)
    // ══════════════════════════════════════════════════════════
    case 'inventory_movements': {
      const movements = await executeGetInventoryMovements({ limit: 10 });
      toolsExecuted.push(movements);

      if (movements.status === 'not_configured') {
        reply = `⚠️ **تنبيه الاتصال بقاعدة البيانات:**\n\nقاعدة بيانات Supabase غير مهيأة على الخادم. تعذر جلب سجل حركات المخزون.`;
        actions.push({ label: '📦 فحص المخزون', actionType: 'view_inventory' });
      } else if (movements.status === 'query_error' || movements.status === 'connection_error') {
        reply = `❌ **خطأ استعلام:** تعذر جلب حركات المخزون: ${movements.errorMessage}`;
        actions.push({ label: '📦 فحص المخزون', actionType: 'view_inventory' });
      } else if (movements.status === 'empty') {
        reply = `📋 **سجل حركات وتدقيق المخزون:** تم الاتصال بقاعدة البيانات بنجاح: سجل التدقيق (inventory_ledger) خالٍ حالياً. يتم تسجيل الحركات تلقائياً عند اعتماد الطلبات أو التزويد الصباحي.`;
        actions.push({ label: '📦 فحص المخزون', actionType: 'view_inventory' });
      } else {
        const { data } = movements;
        reply = `📋 **سجل حركات وتدقيق المخزون (Inventory Ledger) — بيانات حية:**\n\n`;
        reply += `**الخلاصة أولاً:** تم تسجيل **${data.total_movements} حركات أخيرة** موثقة في النظام:\n\n`;
        reply += `| المنتج | نوع الحركة | التغيير | المخزون بعد العملية | السبب |\n`;
        reply += `| :--- | :---: | :---: | :---: | :--- |\n`;
        data.movements.slice(0, 6).forEach((m: any) => {
          reply += `| **${m.product_name}** | ${m.movement_type_arabic} | **${m.delta_formatted}** | ${m.stock_after} | ${m.reason} |\n`;
        });
        actions.push({ label: '📦 فحص المخزون الحالي', actionType: 'view_inventory' });
      }
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 🔟 نصائح وإرشادات تشغيلية عامة (General Advice)
    // ══════════════════════════════════════════════════════════
    case 'general_advice': {
      limitations = ['هذه إرشادات تشغيلية عامة ولا تستند إلى بيانات المخزون اللحظية.'];
      reply = `🌿 **دليل الإرشادات التشغيلية للحفاظ على طراوة الخضر والورقيات:**\n\n`;
      reply += `**الخلاصة أولاً:** للحفاظ على جودة ونضارة الخضر لأطول فترة وتقليل الهدر، اتبع التوجيهات المعتمدة التالية:\n\n`;
      reply += `1. **الخضر الورقية (النعناع، القزبر، المعدنوس، الكرفس):**\n`;
      reply += `   • تجنب رشها بالماء بكميات كثيرة إذا كانت ستُخزن لساعات، فالرطوبة الزائدة تعفن الأوراق.\n`;
      reply += `   • الطريقة المثالية: لف القيعان بقطعة قماش خيش رطبة ووضعها في مكان جيد التهوية بعيداً عن الشمس المباشرة.\n\n`;
      reply += `2. **الدرنات (البطاطس، البصل):**\n`;
      reply += `   • لا تخزن البطاطس والبصل في نفس الصندوق لأن غازات البصل تسرع تبرعم البطاطس.\n`;
      reply += `   • احفظهما في مكان مظلم وبارد وجاف مع تهوية مستمرة من الأسفل.\n\n`;
      reply += `3. **الطماطم والخيار:**\n`;
      reply += `   • الطماطم تفقد نكهتها وطراوتها الطبيعية إذا وضعت في تبريد شديد؛ احفظها في درجة حرارة الغرفة (15-18°C) ورتبها حبة بحبة مع توجيه العنق لأسفل.\n\n`;
      reply += `💡 *ملاحظة:* هذه توجيهات تشغيلية عامة لرفع جودة التخزين وتقليل الهدر، وليست مبنية على بيانات مخزون المتجر اللحظية.`;

      actions.push({ label: '📦 فحص كميات الورقيات الحالية', actionType: 'view_inventory' });
      actions.push({ label: '💵 مراجعة أسعار الورقيات اليوم', actionType: 'view_pricing' });
      break;
    }

    // ══════════════════════════════════════════════════════════
    // 1️⃣1️⃣ معلومات وسياسات المتجر (Store Info)
    // ══════════════════════════════════════════════════════════
    default: {
      const storeInfo = executeGetStoreInfo();
      toolsExecuted.push(storeInfo);

      reply = `أهلاً بك سيدي المدير في **Khodra AI Copilot v3** 🌿\n\n`;
      reply += `**الخلاصة:** أنا مساعدك التشغيلي المتصل بقاعدة بيانات متجر خُضرة فاس. يمكنك سؤالي عن:\n\n`;
      reply += `1. **المخزون وإعادة التوريد:** ("كم عدد المنتجات المتوفرة؟" أو "ما المنتجات التي تحتاج إلى إعادة التوريد؟")\n`;
      reply += `2. **الأسئلة المركبة:** ("ربط المخزون بالطلبات" أو "المنتجات الأكثر مبيعاً وهل مخزونها كافي؟")\n`;
      reply += `3. **المبيعات والمقارنات:** ("ما إجمالي مبيعات آخر 7 أيام؟" أو "قارن المبيعات بين اليوم وأمس")\n`;
      reply += `4. **متابعة السياق:** ("رتبهم حسب السعر"، "وشنو السبب؟"، "واش متوفرين دابا؟")\n`;
      reply += `5. **متابعة الطلبات:** ("الطلبات المعلقة اليوم" أو "الطلبات حسب المناطق")\n`;
      reply += `6. **سياسات المتجر بفاس:** مناطق التوصيل الأربعة، الحد الأدنى 70 DH، والتوصيل المجاني فوق 250 DH.\n\n`;
      reply += `🔒 **ملاحظة أمان:** أعمل في وضع القراءة فقط (Strict Read-Only) لحماية بيانات المتجر من أي تعديل غير مصرح.\n`;

      actions.push({ label: '📦 فحص المخزون', actionType: 'view_inventory' });
      actions.push({ label: '💰 ملخص مبيعات اليوم', actionType: 'view_sales' });
      actions.push({ label: '🛵 استعلام الطلبات الجديدة', actionType: 'view_orders' });
      break;
    }
  }

  if (!reply.includes('الخلاصة')) {
    reply = `**الخلاصة أولاً:** ${reply}`;
  }

  const hasRealData = toolsExecuted.some(
    (t) => t.isRealData === true && t.source === 'supabase_live' && t.status === 'success'
  );

  const metadata = buildResponseMetadata(
    intent,
    toolsExecuted,
    userMessage,
    limitations,
    timePeriodLabel
  );

  return {
    reply,
    toolsExecuted: toolsExecuted.map((t) => ({
      toolName: t.toolName,
      source: t.source,
      status: t.status,
      summary: t.summary,
      isRealData: t.isRealData,
      data: t.data,
      errorMessage: t.errorMessage,
    })),
    suggestedActions: actions,
    dataContext: buildDataContextSummary(toolsExecuted),
    isRealData: hasRealData,
    modelUsed: 'khodra-deterministic-router-v3',
    metadata,
  };
}

// ────────────────────────────────────────────────────────────
// دالة بناء البيانات الوصفية للمصدر والقيود (Metadata Builder)
// ────────────────────────────────────────────────────────────
function buildResponseMetadata(
  intent: QuestionIntent,
  tools: ToolExecutionResult[],
  _userMessage: string,
  extraLimitations: string[] = [],
  timePeriodLabel?: string
): CopilotMetadata {
  const hasLiveSuccess = tools.some((t) => t.source === 'supabase_live' && t.status === 'success');
  const hasLiveEmpty = tools.some((t) => t.source === 'supabase_live' && t.status === 'empty');
  const hasError = tools.some((t) => t.status === 'query_error' || t.status === 'connection_error');
  const hasNotConfigured = tools.some((t) => t.status === 'not_configured');
  const hasStoreConfig = tools.some((t) => t.source === 'store_config');

  let dataSource: 'supabase_live' | 'store_config' | 'none' | 'unavailable' | 'error' = 'none';
  if (hasLiveSuccess || hasLiveEmpty) dataSource = 'supabase_live';
  else if (hasStoreConfig) dataSource = 'store_config';
  else if (hasNotConfigured) dataSource = 'unavailable';
  else if (hasError) dataSource = 'error';

  let status:
    | 'success'
    | 'empty'
    | 'error'
    | 'not_configured'
    | 'general'
    | 'needs_clarification'
    | 'security_blocked' = 'general';

  if (intent === 'data_mutation_attempt') status = 'security_blocked';
  else if (intent === 'ambiguous_clarification') status = 'needs_clarification';
  else if (hasNotConfigured) status = 'not_configured';
  else if (hasError) status = 'error';
  else if (hasLiveSuccess) status = 'success';
  else if (hasLiveEmpty) status = 'empty';

  const limitations = [...extraLimitations];
  if (intent === 'schema_limitation') {
    if (
      !limitations.includes('لا تسجل قاعدة البيانات تكاليف الشراء أو مصاريف التشغيل لحساب صافي الربح.')
    ) {
      limitations.push('لا تسجل قاعدة البيانات تكاليف الشراء أو مصاريف التشغيل لحساب صافي الربح.');
    }
  }

  return {
    intent,
    dataSource,
    timePeriodAnalyzed: timePeriodLabel,
    limitations: limitations.length > 0 ? limitations : undefined,
    toolsCount: tools.length,
    isRealData: hasLiveSuccess,
    status,
  };
}

// ────────────────────────────────────────────────────────────
// استخراج أزرار الإجراءات السريعة بناءً على السياق والأدوات المنفذة
// ────────────────────────────────────────────────────────────
function extractSuggestedActions(
  userMessage: string,
  tools: ToolExecutionResult[]
): CopilotAction[] {
  const actions: CopilotAction[] = [];
  const q = userMessage.toLowerCase();

  const usedToolNames = new Set(tools.map((t) => t.toolName));

  if (usedToolNames.has('get_inventory') || q.includes('مخزون') || q.includes('stock')) {
    actions.push({ label: '📦 فتح لوحة إدارة المخزون', actionType: 'view_inventory' });
    actions.push({ label: '💵 مراجعة أسعار السوق الصباحي', actionType: 'view_pricing' });
  }

  if (usedToolNames.has('get_orders') || q.includes('طلب') || q.includes('orders')) {
    actions.push({ label: '🛵 إدارة وتوزيع أسطول الطلبات', actionType: 'view_orders' });
  }

  if (usedToolNames.has('get_sales_summary') || q.includes('مبيعات') || q.includes('حملة')) {
    actions.push({ label: '✨ إنشاء حملة تسويقية لمبيعات اليوم', actionType: 'create_campaign' });
    actions.push({ label: '📱 إرسال تنبيه واتساب للزبائن', actionType: 'publish_whatsapp' });
  }

  if (actions.length === 0) {
    actions.push({ label: '📦 فحص المخزون', actionType: 'view_inventory' });
    actions.push({ label: '🛵 الطلبات الحالية', actionType: 'view_orders' });
    actions.push({ label: '✨ أفكار تسويقية', actionType: 'create_campaign' });
  }

  return actions.slice(0, 3);
}

// ────────────────────────────────────────────────────────────
// تلخيص سياق البيانات ومصدرها الحقيقي بكل شفافية ونزاهة
// ────────────────────────────────────────────────────────────
function buildDataContextSummary(tools: ToolExecutionResult[]): string {
  if (tools.length === 0) {
    return 'خُضرة فاس — وضع الاستعلام التشغيلي (لم تُنفذ أدوات).';
  }

  const summaries = tools.map((t) => {
    let badge = '📋 غير متوفر';
    if (t.source === 'supabase_live' && t.status === 'success') {
      badge = '⚡ بيانات حية من Supabase';
    } else if (t.source === 'supabase_live' && t.status === 'empty') {
      badge = 'ℹ️ Supabase متصل (الجدول فارغ)';
    } else if (t.status === 'query_error' || t.status === 'connection_error') {
      badge = '❌ خطأ في استعلام Supabase';
    } else if (t.status === 'not_configured') {
      badge = '⚠️ Supabase غير مهيأة على الخادم';
    } else if (t.source === 'store_config') {
      badge = '⚙️ إعدادات المتجر العامة';
    }
    return `${t.toolName} (${badge})`;
  });

  return `الأدوات: ${summaries.join(' • ')}`;
}
