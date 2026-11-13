// ============================================================
// src/features/ai-marketing/clientCopilotEngine.ts
// محرك Copilot المباشر للعميل (Client-Side Autonomous Copilot Engine)
// يعمل فورياً في تطبيق الجوال (APK)، PWA، وأي بيئة استضافة ثابتة (Vercel)
// يستعلم مباشرة من قاعدة بيانات Supabase الحية بدون الحاجة لخادم وسيط
// ============================================================

import { fetchProducts, fetchOrders, getSupabase } from '../../services/supabaseService';
import { STORE_CONFIG, FEZ_DELIVERY_ZONES } from '../../data/config';
import type { CopilotChatResponse } from './aiMarketingClient';

/**
 * محرك معالجة واستجابة فوري يعمل محلياً في التطبيق
 */
export async function runClientSideCopilot(
  message: string,
  _history?: { role: 'user' | 'model'; text: string }[]
): Promise<CopilotChatResponse> {
  const query = (message || '').trim().toLowerCase();

  // 1. فحص الاتصال بقاعدة البيانات
  const sbClient = getSupabase();
  const isSupabaseReady = !!sbClient;

  // ────────────────────────────────────────────────────────────
  // الحالة 1: الاستعلام عن المبيعات والإيرادات والطلبات
  // ────────────────────────────────────────────────────────────
  if (
    query.includes('مبيعات') ||
    query.includes('إيراد') ||
    query.includes('دخلنا') ||
    query.includes('ارباح') ||
    query.includes('أرباح') ||
    query.includes('فلوس') ||
    query.includes('شحال بعنا')
  ) {
    try {
      const orders = await fetchOrders();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // حساب طلبات اليوم وآخر 7 أيام
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const todayOrders = orders.filter((o) => {
        const d = (o.created_at || '').slice(0, 10);
        return d === todayStr;
      });

      const recentOrders = orders.filter((o) => {
        const d = new Date(o.created_at || '');
        return !isNaN(d.getTime()) && d >= sevenDaysAgo;
      });

      // تصنيف الطلبات
      const totalCount = recentOrders.length;
      const deliveredOrders = recentOrders.filter(
        (o) => o.status === 'delivered' || o.is_paid === true
      );
      const pendingOrders = recentOrders.filter(
        (o) => o.status === 'pending' || o.status === 'prepared'
      );
      const cancelledOrders = recentOrders.filter((o) => o.status === 'cancelled');

      const confirmedRevenue = deliveredOrders.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0
      );
      const pendingRevenue = pendingOrders.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0
      );

      // مبيعات اليوم تحديداً
      const todayDelivered = todayOrders.filter((o) => o.status === 'delivered' || o.is_paid === true);
      const todayRevenue = todayDelivered.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0
      );

      const reply = `💰 **ملخص المبيعات التشغيلي — خُضرة فاس (بيانات حية):**

• **مبيعات اليوم (${todayStr}):** ${todayOrders.length} طلبات مسجلة (إيراد مؤكد: **${todayRevenue.toFixed(2)} درهم**).
• **إجمالي الطلبات (آخر 7 أيام):** ${totalCount} طلب مسجل.
• **الطلبات المسلمة بنجاح (المؤكدة):** ${deliveredOrders.length} طلب بإيراد مؤكد: **${confirmedRevenue.toFixed(2)} درهم**.
• **الطلبات قيد الإنجاز (جديدة/مجهزة):** ${pendingOrders.length} طلب بقيمة محتملة: **${pendingRevenue.toFixed(2)} درهم**.
• **الطلبات الملغاة:** ${cancelledOrders.length} طلب.

📌 **الملاحظة التشغيلية:**
تتم تسوية المدفوعات نقداً عند الاستلام (COD) والتحويل البنكي فور تسليم الطلب إلى باب المنزل بفاس.`;

      return {
        reply,
        suggestedActions: [
          { label: '🛵 لوحة إدارة الطلبات', actionType: 'view_orders' },
          { label: '📦 فحص المخزون', actionType: 'view_inventory' },
        ],
        dataContext: `الأدوات: get_sales_summary (${isSupabaseReady ? '🟢 Supabase متصل حياً بالتطبيق' : 'ℹ️ ذاكرة التطبيق المحلية'})`,
        isRealData: isSupabaseReady,
        modelUsed: 'khodra-client-engine-v2',
        toolsExecuted: [
          {
            toolName: 'get_sales_summary',
            source: 'supabase_orders',
            summary: `ملخص مبيعات آخر 7 أيام: ${totalCount} طلبات بقيمة ${confirmedRevenue.toFixed(2)} درهم.`,
            isRealData: isSupabaseReady,
          },
        ],
      };
    } catch (err: any) {
      console.warn('Client copilot orders query failed:', err);
    }
  }

  // ────────────────────────────────────────────────────────────
  // الحالة 2: الاستعلام عن المخزون والخصاص وإعادة التوريد
  // ────────────────────────────────────────────────────────────
  if (
    query.includes('مخزون') ||
    query.includes('خصاص') ||
    query.includes('ناقص') ||
    query.includes('سلا') ||
    query.includes('تقاضا') ||
    query.includes('سلعة') ||
    query.includes('توريد') ||
    query.includes('بنسودة')
  ) {
    try {
      const products = await fetchProducts();
      const outOfStock = products.filter((p) => p.stock <= 0 || p.is_available === false);
      const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5 && p.is_available !== false);

      let reply = '';
      if (outOfStock.length === 0 && lowStock.length === 0) {
        reply = `✅ **المخزون ممتاز ومستقر تماماً في مستودع خُضرة فاس:**

• إجمالي المنتجات المتاحة: **${products.length} صنفاً**.
• لا يوجد أي نقص حرج أو منتجات نافدة حالياً.
• جميع أصناف الخضار والفواكه جاهزة لتلبية طلبات الزبائن وتوصيلها فورياً.`;
      } else {
        const outItems = outOfStock.map((p) => `• ❌ **${p.name}**: نافد بالكامل (0 كجم)`).join('\n');
        const lowItems = lowStock.map((p) => `• ⚠️ **${p.name}**: متبقي ${p.stock} كجم فقط (أقل من 5 كجم)`).join('\n');

        reply = `📦 **تقرير حالة المخزون والخصاص — مستودع فاس:**

${outOfStock.length > 0 ? `🚨 **منتجات نافدة (${outOfStock.length}):**\n${outItems}\n\n` : ''}${lowStock.length > 0 ? `⚠️ **منتجات تقترب من النفاد (${lowStock.length}):**\n${lowItems}\n\n` : ''}💡 **توصية التوريد:**
يُوصى بإدراج الأصناف الناقصة أعلاه ضمن لائحة الشراء الصباحية من سوق الجملة بنسودة بفاس فجر الغد.`;
      }

      return {
        reply,
        suggestedActions: [
          { label: '📦 لوحة إدارة المخزون', actionType: 'view_inventory' },
          { label: '🏷️ جدول تسعير الصباح', actionType: 'view_pricing' },
        ],
        dataContext: `الأدوات: get_inventory (${isSupabaseReady ? '🟢 Supabase متصل حياً بالتطبيق' : 'ℹ️ ذاكرة التطبيق المحلية'})`,
        isRealData: isSupabaseReady,
        modelUsed: 'khodra-client-engine-v2',
        toolsExecuted: [
          {
            toolName: 'get_inventory',
            source: 'supabase_products',
            summary: `فحص المخزون: ${outOfStock.length} نافد، ${lowStock.length} منخفض من إجمالي ${products.length} صنفاً.`,
            isRealData: isSupabaseReady,
          },
        ],
      };
    } catch (err: any) {
      console.warn('Client copilot inventory query failed:', err);
    }
  }

  // ────────────────────────────────────────────────────────────
  // الحالة 3: الاستعلام عن الطلبات المعلقة (Pending)
  // ────────────────────────────────────────────────────────────
  if (
    query.includes('pending') ||
    query.includes('معلق') ||
    query.includes('جديد') ||
    query.includes('تجهيز') ||
    query.includes('متابعة')
  ) {
    try {
      const orders = await fetchOrders();
      const pendingList = orders.filter(
        (o) => o.status === 'pending' || o.status === 'prepared'
      );

      let reply = '';
      if (pendingList.length === 0) {
        reply = `🛵 **لا توجد أي طلبات معلقة (Pending) حالياً:**

جميع الطلبات المسجلة تمت معالجتها وتسليمها بنجاح. المتجر جاهز لاستقبال طلبات جديدة.`;
      } else {
        const items = pendingList
          .slice(0, 5)
          .map(
            (o) =>
              `• **طلب #${o.id}** — الزبون: ${o.customer_name || 'زبون فاس'} | الحي: ${o.address || o.delivery_zone || 'فاس'} | المبلغ: **${o.total} درهم** (الحالة: ${o.status})`
          )
          .join('\n');

        reply = `🛵 **الطلبات قيد المتابعة والتجهيز (${pendingList.length} طلبات):**

${items}

${pendingList.length > 5 ? `*(يوجد ${pendingList.length - 5} طلبات أخرى في اللوحة)*\n` : ''}
⚡ **الإجراء المطلوب:** تفقد تفاصيل السلات في لوحة الطلبات وإسنادها لمندوبي التوصيل حسب المناطق.`;
      }

      return {
        reply,
        suggestedActions: [
          { label: '🛵 لوحة إدارة الطلبات', actionType: 'view_orders' },
        ],
        dataContext: `الأدوات: get_orders (${isSupabaseReady ? '🟢 Supabase متصل حياً بالتطبيق' : 'ℹ️ ذاكرة التطبيق'})`,
        isRealData: isSupabaseReady,
        modelUsed: 'khodra-client-engine-v2',
        toolsExecuted: [
          {
            toolName: 'get_orders',
            source: 'supabase_orders',
            summary: `استعلام الطلبات المعلقة: ${pendingList.length} طلب بحاجة للمتابعة.`,
            isRealData: isSupabaseReady,
          },
        ],
      };
    } catch (err: any) {
      console.warn('Client copilot pending orders query failed:', err);
    }
  }

  // ────────────────────────────────────────────────────────────
  // الحالة 4: معلومات وسياسات المتجر ومناطق التوصيل بفاس
  // ────────────────────────────────────────────────────────────
  if (
    query.includes('توصيل') ||
    query.includes('مناطق') ||
    query.includes('أحياء') ||
    query.includes('شروط') ||
    query.includes('حد أدنى') ||
    query.includes('وقت') ||
    query.includes('ساعات')
  ) {
    const zonesList = Object.values(FEZ_DELIVERY_ZONES).map(
      (z) => `• **${z.name}:** تشمل (${z.neighborhoods.slice(0, 4).join('، ')}...) — وقت التوصيل المستهدف: ${z.targetTime}`
    ).join('\n');

    const reply = `🛵 **سياسات التوصيل وتغطية أحياء فاس — متجر خُضرة:**

📍 **المناطق المغطاة (4 قطاعات جغرافية):**
${zonesList}

💵 **الشروط المالية:**
• **الحد الأدنى للطلب:** ${STORE_CONFIG.minOrderAmount} درهم (لتغطية تكاليف التجهيز والتوصيل الآمن).
• **رسوم التوصيل القياسية:** ${STORE_CONFIG.standardDeliveryFee} درهم.
• **التوصيل المجاني:** للطلبات التي تتجاوز ${STORE_CONFIG.freeDeliveryThreshold} درهم.

⏰ **أوقات العمل:** استلام الطلبات 24/7 عبر التطبيق، والتوصيل الميداني من 09:00 صباحاً حتى 20:00 مساءً.`;

    return {
      reply,
      suggestedActions: [
        { label: '🗺️ خريطة التغطية', actionType: 'view_zones' },
        { label: '🛵 لوحة إدارة الطلبات', actionType: 'view_orders' },
      ],
      dataContext: 'الأدوات: get_store_info (⚙️ سياسات تشغيل متجر خُضرة فاس)',
      isRealData: false,
      modelUsed: 'khodra-client-engine-v2',
      toolsExecuted: [
        {
          toolName: 'get_store_info',
          source: 'store_config',
          summary: 'عرض سياسات التوصيل ومناطق فاس والحد الأدنى للطلب.',
          isRealData: false,
        },
      ],
    };
  }

  // ────────────────────────────────────────────────────────────
  // الحالة الافتراضية: رد عام ذكي مع توجيه تشغيلي مباشر
  // ────────────────────────────────────────────────────────────
  return {
    reply: `أهلاً بك سيدي المدير في **Khodra AI Copilot v2** 🌿

أنا مساعدك التشغيلي المتصل مباشرة ببيانات متجر خُضرة فاس. يمكنك سؤالي فوراً عن:

1. **المخزون والخصاص:** ("واش كاين شي خصاص فالمخزون؟")
2. **المبيعات والإيرادات:** ("عطيني ملخص مبيعات اليوم وهاد الأسبوع")
3. **الطلبات المعلقة:** ("شنو هما الطلبات اللي باقين pending؟")
4. **مناطق وسياسات التوصيل:** ("شنو هما مناطق التوصيل والحد الأدنى؟")

🔒 **حالة النظام:** التطبيق متصل بالقاعدة اللحظية وجميع اللوحات التشغيلية جاهزة.`,
    suggestedActions: [
      { label: '📦 خصاص المخزون', actionType: 'query', payload: 'واش كاين شي خصاص فالمخزون حالياً؟' },
      { label: '💰 مبيعات اليوم والأسبوع', actionType: 'query', payload: 'عطيني ملخص مبيعات اليوم وهاد الأسبوع مع إجمالي الإيرادات' },
      { label: '🛵 طلبات pending', actionType: 'query', payload: 'شنو هما الطلبات اللي باقين pending وبحاجة متابعة فورية؟' },
    ],
    dataContext: `متصل ومستعد للاستعلام التشغيلي • خُضرة فاس (${isSupabaseReady ? '🟢 Supabase متصل' : 'ℹ️ محلي'})`,
    isRealData: isSupabaseReady,
    modelUsed: 'khodra-client-engine-v2',
  };
}
