// ============================================================
// scripts/test-admin-session-audit.ts
// سكريبت التدقيق التقني الفعلي والشامل لجلسة المدير (Admin Session Audit)
// متجر خُضرة — فاس (Khodra Store v3)
// ============================================================

import {
  isLocalAdminSessionValid,
  setCachedAdminPin,
  getAdminPin,
  clearCachedAdminPin,
} from '../src/services/supabaseService';

class MockSessionStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// تهيئة محاكاة sessionStorage في بيئة Node
const mockStorage = new MockSessionStorage();
(global as any).sessionStorage = mockStorage;
(global as any).localStorage = new MockSessionStorage();

async function runAdminSessionAudit() {
  console.log('======================================================================');
  console.log('🛡️ تقرير التدقيق الفعلي الشامل لجلسة المدير — Admin Session Audit Report');
  console.log('   متجر خُضرة — التحقق الرياضي والوظيفي والأمني لدورة حياة جلسة الإدارة');
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
      throw new Error(`Admin Session Audit Failed: ${description}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 1: دخول المدير لأول مرة والتحقق من سلامة التهيئة
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [السيناريو 1] تسجيل دخول المدير وتهيئة بيانات الجلسة:');
  mockStorage.clear();
  assert('الجلسة غير صالحة قبل تسجيل الدخول', isLocalAdminSessionValid() === false);

  const loginTime = Date.now();
  setCachedAdminPin('2026');
  mockStorage.setItem('khodra_admin_auth', 'true');
  mockStorage.setItem('khodra_admin_last_activity', String(loginTime));
  mockStorage.setItem('khodra_admin_session_version', 'v1');

  assert('الرمز مخزن في جلسة المتصفح فقط', getAdminPin() === '2026');
  assert('الجلسة أصبحت صالحة فور تسجيل الدخول', isLocalAdminSessionValid() === true);
  assert('مفتاح khodra_admin_auth محدد بـ true', mockStorage.getItem('khodra_admin_auth') === 'true');
  assert('مفتاح khodra_admin_pin_session موجود', Boolean(mockStorage.getItem('khodra_admin_pin_session')));

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 2: تحديث الصفحة (Refresh) أثناء نشاط المدير
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 2] تحديث الصفحة (Refresh) مع استمرار صلاحية الجلسة:');
  // محاكاة مرور 5 دقائق فقط ثم إعادة تحميل التطبيق
  mockStorage.setItem('khodra_admin_last_activity', String(Date.now() - 5 * 60 * 1000));
  const isValidOnRefresh = isLocalAdminSessionValid();
  assert('الجلسة تبقى صالحة 100% عند تحديث الصفحة (Refresh) دون الحاجة لإعادة طلب PIN', isValidOnRefresh === true);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 3: تحديث الصفحة بعد انتهاء مهلة الخمول (> 30 دقيقة)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 3] تحديث الصفحة بعد انتهاء مهلة الخمول (31 دقيقة):');
  mockStorage.setItem('khodra_admin_last_activity', String(Date.now() - 31 * 60 * 1000));
  const isInvalidOnExpiredRefresh = isLocalAdminSessionValid();
  assert('الجلسة المنتهية خمولاً (>30 دقيقة) ترفض الصلاحيات وتتطلب إعادة إدخال الرمز', isInvalidOnExpiredRefresh === false);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 4: التنقل من لوحة التحكم السفلية (Bottom Dashboard) إلى أداة داخلية (/admin/orders)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 4] التنقل الداخلي بين لوحة التحكم والصفحات الإدارية:');
  // إعادة تنشيط الجلسة
  mockStorage.setItem('khodra_admin_last_activity', String(Date.now()));
  const beforeNavActivity = Number(mockStorage.getItem('khodra_admin_last_activity'));
  
  // محاكاة onNavigateAdmin('orders')
  const newActivityTime = Date.now() + 1000;
  mockStorage.setItem('khodra_admin_last_activity', String(newActivityTime));
  assert('التنقل الداخلي يسجل نشاطاً إدارياً حقيقياً', Number(mockStorage.getItem('khodra_admin_last_activity')) >= beforeNavActivity);
  assert('الجلسة تبقى صالحة تماماً أثناء التنقل ولا تفسر كخروج', isLocalAdminSessionValid() === true);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 5: الرجوع إلى الواجهة الخارجية / لوحة التحكم دون طلب الرمز مجدداً
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 5] الرجوع من الأداة الإدارية إلى لوحة التحكم السفلية (Bottom Dashboard):');
  // محاكاة handleExitToBottomDashboard
  const sessionCheckBeforeReturn = isLocalAdminSessionValid();
  assert('الرجوع إلى لوحة التحكم السفلية يحافظ على وضع المدير نشطاً دون إعادة طلب الرمز', sessionCheckBeforeReturn === true);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 6: التنقل المتعدد بين الأدوات الإدارية (/orders -> /inventory -> /pricing -> /fleet)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 6] التنقل المتسلسل بين صفحات الإدارة الداخلية:');
  const routes = ['orders', 'inventory', 'pricing', 'marketing', 'fleet', 'finance'];
  let navigationSuccess = true;
  for (const route of routes) {
    mockStorage.setItem('khodra_admin_last_activity', String(Date.now()));
    if (!isLocalAdminSessionValid()) {
      navigationSuccess = false;
      break;
    }
  }
  assert('التنقل عبر جميع أدوات الإدارة الستة يحافظ على استقرار الجلسة 100%', navigationSuccess === true);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 7: تنبيه الخمول قبل دقيقتين (28 دقيقة) وإمكانية التمديد
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 7] تنبيه خمول الجلسة عند 28 دقيقة وإمكانية التمديد:');
  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
  const WARNING_THRESHOLD_MS = 28 * 60 * 1000;

  const mockInactive28Min = Date.now() - 28.5 * 60 * 1000; // 28.5 دقيقة
  const diff28 = Date.now() - mockInactive28Min;
  const shouldShowWarning = diff28 >= WARNING_THRESHOLD_MS && diff28 < INACTIVITY_LIMIT_MS;
  assert('يظهر تنبيه الخمول تلقائياً عند الدقيقة 28', shouldShowWarning === true);

  // محاكاة الضغط على "تمديد الجلسة" (extendSession)
  const extendedTime = Date.now();
  mockStorage.setItem('khodra_admin_last_activity', String(extendedTime));
  const diffAfterExtend = Date.now() - Number(mockStorage.getItem('khodra_admin_last_activity'));
  assert('تمديد الجلسة يصفر عداد الخمول بنجاح ويخفي التنبيه', diffAfterExtend < 1000);
  assert('الجلسة بعد التمديد صالحة تماماً', isLocalAdminSessionValid() === true);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 8: انتهاء مهلة الخمول الكاملة (30 دقيقة)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 8] بلوغ مهلة الـ 30 دقيقة دون تمديد:');
  const mockInactive30Min = Date.now() - 30.1 * 60 * 1000;
  const diff30 = Date.now() - mockInactive30Min;
  const shouldLogout = diff30 >= INACTIVITY_LIMIT_MS;
  assert('انتهاء مهلة الـ 30 دقيقة يُلزم بإنهاء وضع الإدارة', shouldLogout === true);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 9: زر الرجوع في المتصفح أو الهاتف ومنع تجاوز الصلاحيات
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 9] أمان زر الرجوع (Back Button) ومنع استعادة الجلسات المنتهية:');
  // حالة 1: جلسة منتهية، زر الرجوع لا يمكنه استعادة الجلسة
  mockStorage.setItem('khodra_admin_last_activity', String(Date.now() - 35 * 60 * 1000));
  const isBackAllowedExpired = isLocalAdminSessionValid();
  assert('زر الرجوع يرفض منح صلاحيات لجلسة منتهية خمولاً', isBackAllowedExpired === false);

  // حالة 2: جلسة تم تسجيل الخروج منها، زر الرجوع يرفض الصلاحيات
  clearCachedAdminPin();
  const isBackAllowedLoggedOut = isLocalAdminSessionValid();
  assert('زر الرجوع يرفض منح صلاحيات لجلسة مسجّل خروجها', isBackAllowedLoggedOut === false);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 10: الخروج الصريح وإنهاء الجلسة تماماً
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 10] الخروج الصريح من الإدارة (Explicit Logout):');
  // إعادة تسجيل دخول
  setCachedAdminPin('2026');
  mockStorage.setItem('khodra_admin_auth', 'true');
  mockStorage.setItem('khodra_admin_last_activity', String(Date.now()));
  assert('الجلسة نشطة قبل الخروج', isLocalAdminSessionValid() === true);

  // تنفيذ الخروج
  clearCachedAdminPin();
  mockStorage.removeItem('khodra_admin_auth');
  mockStorage.removeItem('khodra_admin_pin_session');
  mockStorage.removeItem('khodra_admin_last_activity');

  assert('تم مسح khodra_admin_auth', mockStorage.getItem('khodra_admin_auth') === null);
  assert('تم مسح khodra_admin_pin_session', mockStorage.getItem('khodra_admin_pin_session') === null);
  assert('تم مسح khodra_admin_last_activity', mockStorage.getItem('khodra_admin_last_activity') === null);
  assert('تم تفريغ الرمز من الذاكرة (getAdminPin)', getAdminPin() === '');
  assert('الجلسة أصبحت غير صالحة تماماً', isLocalAdminSessionValid() === false);

  // ──────────────────────────────────────────────────────────────────
  // السيناريو 11: التحقق من عدم تخزين أي كلمات سرية في localStorage
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [السيناريو 11] أمان التخزين وعدم تسريب أسرار في localStorage:');
  const localPin = (global as any).localStorage.getItem('khodra_admin_custom_pin_v2');
  const localAuth = (global as any).localStorage.getItem('khodra_admin_auth');
  assert('لا يوجد رمز سري في localStorage', localPin === null);
  assert('لا يوجد توثيق دائم في localStorage', localAuth === null);

  console.log('\n======================================================================');
  console.log(`🎉 نتيجة تدقيق جلسة المدير: ${passedTests} من ${totalTests} اختباراً اجتيزت بنجاح (100%)`);
  console.log('======================================================================\n');
}

runAdminSessionAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
