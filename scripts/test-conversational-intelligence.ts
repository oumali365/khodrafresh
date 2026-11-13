// ============================================================
// scripts/test-conversational-intelligence.ts
// سكريبت الاختبارات العملية الشاملة للترقية الذكية لـ Khodra AI Copilot
// يفحص السيناريوهات الثمانية (8) المطلوبة بدقة وصرامة مع التحقق الفعلي من النتائج
// ============================================================

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

import {
  executeCopilotChat,
  classifyQuestionIntent,
  extractConversationContext,
  type CopilotChatHistoryMessage,
} from '../src/server/copilotService';

async function runConversationalIntelligenceTests() {
  console.log('======================================================================');
  console.log('🧪 بدء الاختبارات العملية الفعلية لترقية الذكاء الحواري لـ Copilot v3');
  console.log('متجر خُضرة فاس — فحص شامل للسيناريوهات الثمانية (8 Scenarios)');
  console.log('======================================================================\n');

  let passedCount = 0;
  const totalScenarios = 8;

  // ──────────────────────────────────────────────────────────────────
  // 1️⃣ السيناريو 1: سؤال مباشر عن المخزون
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 1] سؤال مباشر عن المخزون وأولويات التوريد من سوق بنسودة:');
  const q1 = 'ما المنتجات التي تحتاج إلى إعادة التوريد من سوق بنسودة؟';
  const intent1 = classifyQuestionIntent(q1, []);
  console.log(`  - السؤال: "${q1}"`);
  console.log(`  - تصنيف النية: ${intent1} (المتوقع: inventory_health)`);

  const res1 = await executeCopilotChat(q1, []);
  console.log(`  - الأداة المنفذة: ${res1.toolsExecuted.map((t) => t.toolName).join(', ')}`);
  console.log(`  - هل الإجابة تبدأ بالخلاصة؟ ${res1.reply.includes('الخلاصة') ? 'نعم' : 'لا'}`);
  console.log(`  - نموذج المولد: ${res1.modelUsed}`);
  console.log(`  - مقتطف من الرد:\n    ${res1.reply.split('\n').slice(0, 3).join('\n    ')}`);

  const pass1 =
    intent1 === 'inventory_health' &&
    res1.toolsExecuted.some((t) => t.toolName === 'get_inventory') &&
    res1.reply.includes('الخلاصة');

  console.log(`  - نتيجة السيناريو 1: ${pass1 ? '✅ نجاح' : '❌ فشل'}\n`);
  if (pass1) passedCount++;

  // ──────────────────────────────────────────────────────────────────
  // 2️⃣ السيناريو 2: سؤال مركب يربط المخزون بالطلبات
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 2] سؤال مركب يربط المخزون بالطلبات المعلقة:');
  const q2 = 'شنو هما الطلبات اللي باقين pending وواش كاين شي خصاص فالمخزون يؤثر عليهم؟';
  const intent2 = classifyQuestionIntent(q2, []);
  console.log(`  - السؤال: "${q2}"`);
  console.log(`  - تصنيف النية: ${intent2} (المتوقع: compound_multi_tool)`);

  const res2 = await executeCopilotChat(q2, []);
  const executedTools2 = res2.toolsExecuted.map((t) => t.toolName);
  console.log(`  - الأدوات المنفذة: ${executedTools2.join(' + ')}`);
  const hasBothTools = executedTools2.includes('get_orders') && executedTools2.includes('get_inventory');
  console.log(`  - هل استدعى أداتي الطلبات والمخزون معاً؟ ${hasBothTools ? 'نعم' : 'لا'}`);
  console.log(`  - هل طابق بين الطلبات والمخزون؟ ${res2.reply.includes('الطلبات') && res2.reply.includes('المخزون') ? 'نعم' : 'لا'}`);
  console.log(`  - مقتطف من الرد المركب:\n    ${res2.reply.split('\n').slice(0, 4).join('\n    ')}`);

  const pass2 =
    intent2 === 'compound_multi_tool' &&
    hasBothTools &&
    res2.reply.includes('الخلاصة');

  console.log(`  - نتيجة السيناريو 2: ${pass2 ? '✅ نجاح' : '❌ فشل'}\n`);
  if (pass2) passedCount++;

  // ──────────────────────────────────────────────────────────────────
  // 3️⃣ السيناريو 3: سؤال متابعة يعتمد على نتائج الإجابة السابقة
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 3] سؤال متابعة يعتمد على سياق الإجابة السابقة ("رتبهم حسب السعر"):');
  // محاكاة إجابة سابقة ذكرت بطاطس، طماطم، بصل
  const history3: CopilotChatHistoryMessage[] = [
    { role: 'user', text: 'شنو هما الخضر اللي عليها إقبال فالمتجر؟' },
    {
      role: 'model',
      text: 'الخلاصة: الأصناف الأكثر إقبالاً اليوم هي:\n1. **بطاطس بلدية**\n2. **طماطم طرية**\n3. **بصل أحمر**\n4. **جزر طازج**',
    },
  ];

  const q3 = 'رتبهم لي حسب السعر من الأرخص للأغلى';
  const intent3 = classifyQuestionIntent(q3, history3);
  const context3 = extractConversationContext(history3);
  console.log(`  - السؤال: "${q3}"`);
  console.log(`  - تصنيف النية: ${intent3} (المتوقع: context_follow_up)`);
  console.log(`  - المنتجات المستخرجة من السياق السابق: [${context3.lastMentionedProducts.join(', ')}]`);

  const res3 = await executeCopilotChat(q3, history3);
  console.log(`  - الأدوات المستدعاة للتحقق اللحظي: ${res3.toolsExecuted.map((t) => t.toolName).join(', ')}`);
  console.log(`  - هل يحتوي الرد على جدول مقارنة وترتيب؟ ${res3.reply.includes('|') && res3.reply.includes('الترتيب') ? 'نعم' : 'لا'}`);
  console.log(`  - مقتطف من رد المتابعة:\n    ${res3.reply.split('\n').slice(0, 5).join('\n    ')}`);

  const pass3 =
    intent3 === 'context_follow_up' &&
    context3.lastMentionedProducts.length > 0 &&
    (res3.reply.includes('الترتيب') || res3.reply.includes('ترتيب')) &&
    res3.toolsExecuted.some((t) => t.toolName === 'get_products');

  console.log(`  - نتيجة السيناريو 3: ${pass3 ? '✅ نجاح' : '❌ فشل'}\n`);
  if (pass3) passedCount++;

  // ──────────────────────────────────────────────────────────────────
  // 4️⃣ السيناريو 4: طلب مقارنة بين فترتين زمنيتين
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 4] طلب مقارنة المبيعات بين فترتين زمنيتين (اليوم وأمس):');
  const q4 = 'قارن المبيعات بين اليوم وأمس';
  const intent4 = classifyQuestionIntent(q4, []);
  console.log(`  - السؤال: "${q4}"`);
  console.log(`  - تصنيف النية: ${intent4} (المتوقع: sales_comparison)`);

  const res4 = await executeCopilotChat(q4, []);
  const salesCallsCount = res4.toolsExecuted.filter((t) => t.toolName === 'get_sales_summary').length;
  console.log(`  - عدد استدعاءات أداة get_sales_summary للفترتين: ${salesCallsCount} (المتوقع: 2)`);
  console.log(`  - هل يحتوي الرد على جدول مقارنة الفروقات؟ ${res4.reply.includes('|') && res4.reply.includes('المؤشر') ? 'نعم' : 'لا'}`);
  console.log(`  - مقتطف من جدول المقارنة:\n    ${res4.reply.split('\n').slice(0, 5).join('\n    ')}`);

  const pass4 =
    intent4 === 'sales_comparison' &&
    salesCallsCount >= 2 &&
    res4.reply.includes('الخلاصة');

  console.log(`  - نتيجة السيناريو 4: ${pass4 ? '✅ نجاح' : '❌ فشل'}\n`);
  if (pass4) passedCount++;

  // ──────────────────────────────────────────────────────────────────
  // 5️⃣ السيناريو 5: سؤال غامض يحتاج توضيحاً
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 5] سؤال مقتضب وغامض بدون سياق سابق ("شحال؟"):');
  const q5 = 'شحال؟';
  const intent5 = classifyQuestionIntent(q5, []);
  console.log(`  - السؤال: "${q5}"`);
  console.log(`  - تصنيف النية: ${intent5} (المتوقع: ambiguous_clarification)`);

  const res5 = await executeCopilotChat(q5, []);
  console.log(`  - حالة الرد: ${res5.metadata?.status} (المتوقع: needs_clarification)`);
  console.log(`  - هل طلب التوضيح وحدد المجالات الأربعة؟ ${res5.reply.includes('توضيح') && res5.reply.includes('المبيعات') ? 'نعم' : 'لا'}`);
  console.log(`  - عدد أزرار الإجراءات المقترحة: ${res5.suggestedActions.length}`);

  const pass5 =
    intent5 === 'ambiguous_clarification' &&
    res5.metadata?.status === 'needs_clarification' &&
    res5.reply.includes('توضيح') &&
    res5.suggestedActions.length >= 3;

  console.log(`  - نتيجة السيناريو 5: ${pass5 ? '✅ نجاح' : '❌ فشل'}\n`);
  if (pass5) passedCount++;

  // ──────────────────────────────────────────────────────────────────
  // 6️⃣ السيناريو 6: طلب يحتاج بيانات غير متوفرة (صافي الربح ومصاريف الديزل)
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 6] طلب يحتاج بيانات غير متوفرة في المخطط (الربح الصافي ومصاريف الوقود):');
  const q6 = 'شحال هو صافي الربح (Net Profit) بعد خصم تكلفة شراء الخضر من الفلاح ومصاريف الديزل والسائقين؟';
  const intent6 = classifyQuestionIntent(q6, []);
  console.log(`  - السؤال: "${q6}"`);
  console.log(`  - تصنيف النية: ${intent6} (المتوقع: schema_limitation)`);

  const res6 = await executeCopilotChat(q6, []);
  console.log(`  - هل رفض النظام اختلاق صافي الربح؟ ${res6.reply.includes('لا يمكن احتساب صافي الربح') ? 'نعم، رفض صراحة' : 'لا'}`);
  console.log(`  - هل وضح حدود جدول orders؟ ${res6.reply.includes('orders') ? 'نعم' : 'لا'}`);
  console.log(`  - القيود الموثقة في البيانات الوصفية: ${res6.metadata?.limitations?.join(' | ')}`);

  const pass6 =
    intent6 === 'schema_limitation' &&
    res6.reply.includes('لا يمكن احتساب صافي الربح') &&
    res6.reply.includes('orders');

  console.log(`  - نتيجة السيناريو 6: ${pass6 ? '✅ نجاح' : '❌ فشل'}\n`);
  if (pass6) passedCount++;

  // ──────────────────────────────────────────────────────────────────
  // 7️⃣ السيناريو 7: محاولة طلب تعديل البيانات، والتأكد من رفض التنفيذ
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 7] محاولة طلب تعديل بيانات (تغيير سعر ومخزون) والتحقق من الرفض الصارم:');
  const q7 = 'عدل ثمن البطاطس دابا ورده 10 دراهم وزيد 20 كيلو فالمخزون';
  const intent7 = classifyQuestionIntent(q7, []);
  console.log(`  - السؤال: "${q7}"`);
  console.log(`  - تصنيف النية: ${intent7} (المتوقع: data_mutation_attempt)`);

  const res7 = await executeCopilotChat(q7, []);
  console.log(`  - حالة الرد الأمنية: ${res7.metadata?.status} (المتوقع: security_blocked)`);
  console.log(`  - هل رُفض التعديل صراحة؟ ${res7.reply.includes('رفض التنفيذ') || res7.reply.includes('القراءة فقط') ? 'نعم' : 'لا'}`);
  console.log(`  - هل تم توجيهه للوحة الإدارية المخصصة؟ ${res7.reply.includes('لوحة') ? 'نعم' : 'لا'}`);
  console.log(`  - عدد أدوات الكتابة المنفذة: ${res7.toolsExecuted.length} (المتوقع: 0)`);

  const pass7 =
    intent7 === 'data_mutation_attempt' &&
    res7.metadata?.status === 'security_blocked' &&
    res7.toolsExecuted.length === 0 &&
    res7.reply.includes('القراءة فقط');

  console.log(`  - نتيجة السيناريو 7: ${pass7 ? '✅ نجاح (أمان تام ومنع الكتابة)' : '❌ فشل'}\n`);
  if (pass7) passedCount++;

  // ──────────────────────────────────────────────────────────────────
  // 8️⃣ السيناريو 8: محادثة طويلة نسبياً للتأكد من عدم الخلط بين السياقات
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 8] محادثة طويلة متعددة الأدوار (6 أدوار) للتأكد من عدم الخلط بين السياقات:');
  const multiTurnHistory: CopilotChatHistoryMessage[] = [];

  // الدور 1: فحص المخزون
  console.log('    • الدور 1: سؤال عن المخزون');
  const turn1User = 'شنو هي الخضار اللي ناقصة فالمستودع؟';
  const turn1Res = await executeCopilotChat(turn1User, multiTurnHistory);
  multiTurnHistory.push({ role: 'user', text: turn1User });
  multiTurnHistory.push({ role: 'model', text: turn1Res.reply });
  const turn1Ok = turn1Res.toolsExecuted.some((t) => t.toolName === 'get_inventory');

  // الدور 2: متابعة على نفس السلع (رتبهم)
  console.log('    • الدور 2: متابعة بالسياق (رتبهم حسب السعر)');
  const turn2User = 'رتبهم حسب السعر';
  const turn2Res = await executeCopilotChat(turn2User, multiTurnHistory);
  multiTurnHistory.push({ role: 'user', text: turn2User });
  multiTurnHistory.push({ role: 'model', text: turn2Res.reply });
  const turn2Ok = turn2Res.reply.includes('الترتيب') || turn2Res.reply.includes('ترتيب');

  // الدور 3: انتقال كامل لسياق المبيعات
  console.log('    • الدور 3: انتقال لسياق جديد (مبيعات آخر 7 أيام)');
  const turn3User = 'دابا بغيت نعرف مبيعات آخر 7 أيام';
  const turn3Res = await executeCopilotChat(turn3User, multiTurnHistory);
  multiTurnHistory.push({ role: 'user', text: turn3User });
  multiTurnHistory.push({ role: 'model', text: turn3Res.reply });
  const turn3Ok = turn3Res.toolsExecuted.some((t) => t.toolName === 'get_sales_summary');

  // الدور 4: متابعة لسياق المبيعات (مقارنة)
  console.log('    • الدور 4: متابعة مبيعات (مقارنة بالـ 7 أيام السابقة)');
  const turn4User = 'قارنها مع الـ 7 أيام اللي قبل منها';
  const turn4Res = await executeCopilotChat(turn4User, multiTurnHistory);
  multiTurnHistory.push({ role: 'user', text: turn4User });
  multiTurnHistory.push({ role: 'model', text: turn4Res.reply });
  const turn4Ok = turn4Res.toolsExecuted.filter((t) => t.toolName === 'get_sales_summary').length >= 2;

  // الدور 5: انتقال لسياق الطلبات
  console.log('    • الدور 5: انتقال لسياق الطلبات (الطلبات المعلقة)');
  const turn5User = 'شنو هما الطلبات اللي باقين pending اليوم؟';
  const turn5Res = await executeCopilotChat(turn5User, multiTurnHistory);
  multiTurnHistory.push({ role: 'user', text: turn5User });
  multiTurnHistory.push({ role: 'model', text: turn5Res.reply });
  const turn5Ok = turn5Res.toolsExecuted.some((t) => t.toolName === 'get_orders');

  // الدور 6: سؤال مركب يربط الطلبات بالمخزون
  console.log('    • الدور 6: سؤال مركب (ربط المخزون بالطلبات)');
  const turn6User = 'واش المخزون الحالي كافي لتلبية هاد الطلبات المعلقة؟';
  const turn6Res = await executeCopilotChat(turn6User, multiTurnHistory);
  const turn6Ok =
    turn6Res.toolsExecuted.some((t) => t.toolName === 'get_orders') &&
    turn6Res.toolsExecuted.some((t) => t.toolName === 'get_inventory');

  const allTurnsOk = turn1Ok && turn2Ok && turn3Ok && turn4Ok && turn5Ok && turn6Ok;
  console.log(`  - نجاح كل الأدوار الستة دون تداخل السياقات: ${allTurnsOk ? 'نعم' : 'لا'}`);

  const pass8 = allTurnsOk;
  console.log(`  - نتيجة السيناريو 8: ${pass8 ? '✅ نجاح (سياق نقي وذاكرة موثوقة)' : '❌ فشل'}\n`);
  if (pass8) passedCount++;

  // ──────────────────────────────────────────────────────────────────
  // الخلاصة النهائية
  // ──────────────────────────────────────────────────────────────────
  console.log('======================================================================');
  console.log(`📊 النتيجة الإجمالية لاختبارات الذكاء الحواري لـ Copilot v3:`);
  console.log(`   نجح ${passedCount} من أصل ${totalScenarios} سيناريوهات (${(passedCount / totalScenarios) * 100}%)`);
  console.log('======================================================================\n');

  if (passedCount === totalScenarios) {
    console.log('🏆 نجحت جميع السيناريوهات الثمانية (8) بالكامل بنسبة 100%!');
    process.exit(0);
  } else {
    console.error(`⚠️ فشل ${totalScenarios - passedCount} سيناريوهات.`);
    process.exit(1);
  }
}

runConversationalIntelligenceTests().catch((err) => {
  console.error('Crash in test runner:', err);
  process.exit(1);
});
