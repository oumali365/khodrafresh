-- ==============================================================================
-- 🔒 04_rls_policies.sql – سياسات الأمان على مستوى الصفوف (Row Level Security)
-- متجر خُضرة - فاس (Khodra Store)
--
-- السياسات المؤمنة:
-- 1. جدول الطلبات orders: إدراج مقيد بشروط صحة الأسعار والحقول، والتحكم الكامل للمدير الموثق.
-- 2. جدول المنتجات products: قراءة المنتجات المفعلة فقط (active=true).
-- 3. جدول التقييمات reviews: قراءة غير المحذوفة وإدراج مقيد بشروط الطول والتصنيف.
-- 4. جدول الإعدادات store_settings: حجب تام لصف admin_pin عن القراءة العامة.
-- 5. جدول سجلات الأمان order_security_logs: محمي وخاص بالنظام والمدير.
-- ==============================================================================

-- 1️⃣ تفعيل نظام RLS على كافة الجداول
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_security_logs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2️⃣ سياسات جدول الطلبات (orders)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
CREATE POLICY "orders_public_insert"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND (is_deleted IS NULL OR is_deleted = FALSE)
    AND deleted_at IS NULL
    AND subtotal > 0
    AND delivery_fee >= 0
    AND total >= subtotal
    AND total = (subtotal + delivery_fee)
    AND LENGTH(TRIM(customer_name)) BETWEEN 2 AND 100
    AND LENGTH(TRIM(address)) BETWEEN 3 AND 500
    AND LENGTH(REGEXP_REPLACE(phone, '[^\d]', '', 'g')) BETWEEN 9 AND 15
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) BETWEEN 1 AND 100
  );

DROP POLICY IF EXISTS "orders_authenticated_admin_all" ON public.orders;
CREATE POLICY "orders_authenticated_admin_all"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all"
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3️⃣ سياسات جدول المنتجات (products)
-- ⚠️ متطلبات RLS وأمان إدارة المنتجات والمخزون (Admin Control First):
-- 1. المتجر يتيح القراءة العامة للمنتجات المفعلة (active = true).
-- 2. للتعديل والإضافة المباشرة من لوحة الإدارة المتصلة بمفتاح anon أو authenticated:
--    إذا تم قصر سياسة UPDATE على جلسات auth.uid() الإدارية فقط دون توفير سياسة
--    لـ anon، فإن PostgREST يرفض التعديل صامتاً بتعديل 0 صفوف (0 rows updated)
--    مما يتسبب في عودة الواجهة للقيمة القديمة فور عمل refetch من السيرفر.
-- 3. لذلك: إما استخدام دالة RPC المحمية update_product_stock_secure (SECURITY DEFINER)،
--    أو السماح بالتحديث المنضبط للمخزون والأسعار عبر السياسة التالية:
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_public_select" ON public.products;
CREATE POLICY "products_public_select"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (active = TRUE);

DROP POLICY IF EXISTS "products_public_update" ON public.products;
CREATE POLICY "products_public_update"
  ON public.products
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    (stock IS NULL OR stock >= 0)
    AND (price IS NULL OR price >= 0)
  );

DROP POLICY IF EXISTS "products_public_insert" ON public.products;
CREATE POLICY "products_public_insert"
  ON public.products
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL
    AND LENGTH(TRIM(name)) > 0
    AND price >= 0
    AND (stock IS NULL OR stock >= 0)
  );

DROP POLICY IF EXISTS "products_authenticated_admin_all" ON public.products;
CREATE POLICY "products_authenticated_admin_all"
  ON public.products
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all"
  ON public.products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4️⃣ سياسات جدول التقييمات (reviews)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.reviews ALTER COLUMN verified SET DEFAULT FALSE;

DROP POLICY IF EXISTS "reviews_public_select" ON public.reviews;
CREATE POLICY "reviews_public_select"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_deleted IS NULL OR is_deleted = FALSE);

DROP POLICY IF EXISTS "reviews_public_insert" ON public.reviews;
CREATE POLICY "reviews_public_insert"
  ON public.reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (is_deleted IS NULL OR is_deleted = FALSE)
    AND deleted_at IS NULL
    AND rating BETWEEN 1 AND 5
    AND category IN ('all', 'quality', 'delivery', 'service')
    AND LENGTH(TRIM(author)) BETWEEN 2 AND 80
    AND LENGTH(TRIM(neighborhood)) BETWEEN 2 AND 100
    AND LENGTH(TRIM(comment)) BETWEEN 3 AND 1000
  );

DROP POLICY IF EXISTS "reviews_authenticated_admin_all" ON public.reviews;
CREATE POLICY "reviews_authenticated_admin_all"
  ON public.reviews
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;
CREATE POLICY "reviews_admin_all"
  ON public.reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5️⃣ سياسات جدول إعدادات المتجر (store_settings) – حجب تام لـ admin_pin
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "store_settings_public_select" ON public.store_settings;
CREATE POLICY "store_settings_public_select"
  ON public.store_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key NOT IN ('admin_pin', 'secret_key', 'webhook_secret')
    AND key NOT LIKE '%_pin%'
    AND key NOT LIKE '%_secret%'
  );

DROP POLICY IF EXISTS "store_settings_authenticated_admin_all" ON public.store_settings;
CREATE POLICY "store_settings_authenticated_admin_all"
  ON public.store_settings
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "store_settings_admin_all" ON public.store_settings;
CREATE POLICY "store_settings_admin_all"
  ON public.store_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6️⃣ سياسات سجلات الحماية (order_security_logs)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "logs_authenticated_admin_select" ON public.order_security_logs;
CREATE POLICY "logs_authenticated_admin_select"
  ON public.order_security_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "logs_admin_all" ON public.order_security_logs;
CREATE POLICY "logs_admin_all"
  ON public.order_security_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7️⃣ منح الصلاحيات الصريحة (Explicit Table Grants)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;

GRANT SELECT ON public.order_security_logs TO authenticated;
GRANT ALL ON public.order_security_logs TO service_role;
