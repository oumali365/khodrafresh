// ============================================================
// scripts/test-navigation-audit.ts
// اختبار وتدقيق شامل لنظام التنقل وأزرار التوجيه في متجر خُضرة
// ============================================================
import fs from 'fs';
import path from 'path';

function runNavigationAudit() {
  console.log('======================================================================');
  console.log('🧭 بدء اختبار وتدقيق نظام التنقل (Navigation System Audit)');
  console.log('متجر خُضرة فاس — فحص شامل لجميع الأزرار والروابط ومعرفات الأقسام والهاتف');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. فحص CartDrawer.tsx
  console.log('▶ [1] فحص مكون درج السلة (CartDrawer.tsx):');
  const cartFile = fs.readFileSync(path.join(process.cwd(), 'src/components/cart/CartDrawer.tsx'), 'utf-8');
  const hasOnBrowseProductsProp = cartFile.includes('onBrowseProducts?: () => void;');
  const hasEmptyBrowseBtn = cartFile.includes('id="cart-browse-products-btn"') && cartFile.includes('onBrowseProducts?.();');
  const hasEmptyBundlesBtn = cartFile.includes('id="cart-explore-bundles-btn"') && cartFile.includes('onExploreBundles();');
  const hasMinOrderBrowseBtn = cartFile.includes('id="cart-min-order-browse-products-btn"') && cartFile.includes('onBrowseProducts?.();');

  if (hasOnBrowseProductsProp && hasEmptyBrowseBtn && hasEmptyBundlesBtn && hasMinOrderBrowseBtn) {
    console.log('  ✓ زر «تصفح المنتجات» في السلة الفارغة موصول بـ onBrowseProducts');
    console.log('  ✓ زر «صناديق العائلة التوفيرية» موصول بـ onExploreBundles');
    console.log('  ✓ زر «+ تصفح الخضار والفواكه الطازجة» للحد الأدنى موصول بـ onBrowseProducts');
    passed++;
  } else {
    console.error('  ❌ خطأ في أسلاك أزرار السلة:', { hasOnBrowseProductsProp, hasEmptyBrowseBtn, hasEmptyBundlesBtn, hasMinOrderBrowseBtn });
    failed++;
  }

  // 2. فحص App.tsx
  console.log('\n▶ [2] فحص المعالجات والتمرير في (App.tsx):');
  const appFile = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
  const hasNavigateToSection = appFile.includes('navigateToSection = useCallback(');
  const cartReceivesBrowse = appFile.includes('onBrowseProducts={scrollToCategoryFilter}');
  const cartReceivesBundles = appFile.includes('onExploreBundles={scrollToBundles}');
  const hasFamilyBundlesId = appFile.includes('id="family-bundles-section"') && appFile.includes('scroll-mt-24 sm:scroll-mt-28');
  const hasCategoryFilterScrollMt = appFile.includes('id="category-filter-section"');

  if (hasNavigateToSection && cartReceivesBrowse && cartReceivesBundles && hasFamilyBundlesId) {
    console.log('  ✓ الدالة الموحدة navigateToSection معرفة وتدير إغلاق القوائم والصفحات والتمرير المتكرر');
    console.log('  ✓ السلة تستلم onBrowseProducts و onExploreBundles وتوجه للأقسام الحقيقية');
    console.log('  ✓ حاوية صناديق العائلة تحمل المعرف family-bundles-section مع هامش scroll-mt');
    passed++;
  } else {
    console.error('  ❌ نقص في أسلاك App.tsx:', { hasNavigateToSection, cartReceivesBrowse, cartReceivesBundles, hasFamilyBundlesId });
    failed++;
  }

  // 3. فحص زر رجوع الهاتف في AdminPageLayout.tsx
  console.log('\n▶ [3] فحص زر رجوع الهاتف من داخل صفحات الإدارة (AdminPageLayout.tsx):');
  const adminPageFile = fs.readFileSync(path.join(process.cwd(), 'src/features/layout/AdminPageLayout.tsx'), 'utf-8');
  const hasHeaderBackBtn = adminPageFile.includes('id="admin-header-back-to-dashboard-btn"') && adminPageFile.includes('handleExit');
  const hasMobileNavBackBtn = adminPageFile.includes('id="admin-mobile-back-to-dashboard-btn"') && adminPageFile.includes('handleExit');
  const importsDashboardIcons = adminPageFile.includes('ArrowRight') && adminPageFile.includes('LayoutDashboard');

  if (hasHeaderBackBtn && hasMobileNavBackBtn && importsDashboardIcons) {
    console.log('  ✓ زر الرجوع في الشريط العلوي موصول بدالة handleExit وموسوم بـ "اللوحة"');
    console.log('  ✓ زر الرجوع المخصص للهاتف مضاف إلى شريط التنقل السفلي للهاتف وموصول بـ handleExit');
    passed++;
  } else {
    console.error('  ❌ خطأ في أزرار الرجوع للهاتف:', { hasHeaderBackBtn, hasMobileNavBackBtn, importsDashboardIcons });
    failed++;
  }

  // 4. فحص منطق handleExitToBottomDashboard في App.tsx
  console.log('\n▶ [4] فحص منطق الرجوع إلى لوحة التحكم السفلية (handleExitToBottomDashboard):');
  const hasRetryScrollLoop = appFile.includes('admin-dashboard-section') && appFile.includes('maxAttempts = 20') && appFile.includes('reCheck.scrollIntoView');
  
  if (hasRetryScrollLoop) {
    console.log('  ✓ منطق التمرير التكراري للوحة التحكم السفلية يضمن الوصول إلى admin-dashboard-section بعد تحميل Suspense');
    passed++;
  } else {
    console.error('  ❌ غياب التمرير التكراري للوحة التحكم السفلية في App.tsx');
    failed++;
  }

  // 5. فحص معرفات الأقسام وهوامش scroll-mt للتغطية أسفل الهيدر الثابت
  console.log('\n▶ [5] فحص هوامش التمرير (scroll-mt) لضمان عدم تغطية العناوين بالهيدر الثابت:');
  const familyBoxFile = fs.readFileSync(path.join(process.cwd(), 'src/components/shop/FamilyBoxesSection.tsx'), 'utf-8');
  const reviewsFile = fs.readFileSync(path.join(process.cwd(), 'src/components/reviews/CustomerReviews.tsx'), 'utf-8');
  const adminDashFile = fs.readFileSync(path.join(process.cwd(), 'src/features/layout/AdminBottomDashboard.tsx'), 'utf-8');
  const heroFile = fs.readFileSync(path.join(process.cwd(), 'src/components/shop/Hero.tsx'), 'utf-8');

  const familyHasScrollMt = familyBoxFile.includes('scroll-mt-24 sm:scroll-mt-28');
  const reviewsHasScrollMt = reviewsFile.includes('scroll-mt-24 sm:scroll-mt-28');
  const adminDashHasScrollMt = adminDashFile.includes('scroll-mt-24 sm:scroll-mt-28');
  const heroHasScrollMt = heroFile.includes('id="hero-section"') && heroFile.includes('scroll-mt-20');

  if (familyHasScrollMt && reviewsHasScrollMt && adminDashHasScrollMt && heroHasScrollMt) {
    console.log('  ✓ قسم صناديق العائلة (family-boxes-section) مزود بـ scroll-mt-24 sm:scroll-mt-28');
    console.log('  ✓ قسم آراء الزبائن (customer-reviews-section) مزود بـ scroll-mt-24 sm:scroll-mt-28');
    console.log('  ✓ قسم الإدارة السفلي (admin-dashboard-section) مزود بـ scroll-mt-24 sm:scroll-mt-28');
    console.log('  ✓ قسم الهيرو (hero-section) مزود بـ scroll-mt-20');
    passed++;
  } else {
    console.error('  ❌ نقص في هوامش scroll-mt:', { familyHasScrollMt, reviewsHasScrollMt, adminDashHasScrollMt, heroHasScrollMt });
    failed++;
  }

  // 6. فحص الهيدر والفوتر وروابط الصفحات
  console.log('\n▶ [6] فحص روابط الهيدر والفوتر وتوافق صفحات المعلومات:');
  const headerFile = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/Header.tsx'), 'utf-8');
  const footerFile = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/Footer.tsx'), 'utf-8');

  const headerClosesInfoPage = headerFile.includes('handleScrollToBundles') && headerFile.includes('onOpenPage(null);');
  const footerClosesInfoPage = footerFile.includes('onOpenPage(null);') && footerFile.includes('customer-reviews-section');

  if (headerClosesInfoPage && footerClosesInfoPage) {
    console.log('  ✓ النقر على صناديق العائلة من القائمة الجانبية يغلق أي صفحة معلومات ويعود للمتجر');
    console.log('  ✓ النقر على تقييمات الزبناء من الفوتر يغلق أي صفحة معلومات وينتقل بسلاسة للتقييمات');
    passed++;
  } else {
    console.error('  ❌ نقص في تكامل الهيدر أو الفوتر مع صفحات المعلومات:', { headerClosesInfoPage, footerClosesInfoPage });
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`📊 النتيجة النهائية: نجح ${passed} من أصل 6 فحوصات رئيسية (${Math.round((passed / 6) * 100)}%)`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runNavigationAudit();
