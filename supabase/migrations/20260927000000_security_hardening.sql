-- ==============================================================================
-- 🛡️ 20260927000000_security_hardening.sql
-- ترحيل التحصينات الأمنية الشاملة (لمزامنة GitHub التلقائية مع Supabase)
-- ==============================================================================

BEGIN;

-- 1️⃣ إزالة store_settings من البث اللحظي العام
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'store_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.store_settings;
  END IF;
END $$;

-- 2️⃣ حجب قراءة admin_pin من جدول store_settings
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

-- 3️⃣ دعم المصادقة عبر Supabase Auth JWT + Brute-Force Protection
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.role() <> 'authenticated' THEN
    RETURN FALSE;
  END IF;

  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    FALSE
  );
END;
$$;

DROP FUNCTION IF EXISTS public.verify_admin_pin(TEXT);
CREATE OR REPLACE FUNCTION public.verify_admin_pin(p_pin TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_pin TEXT;
  v_failed_attempts INT;
  v_real_ip TEXT;
BEGIN
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  IF p_pin IS NULL OR LENGTH(TRIM(p_pin)) < 4 THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_real_ip := SPLIT_PART(
      COALESCE(
        current_setting('request.headers', true)::json->>'cf-connecting-ip',
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        'unknown'
      ),
      ',', 1
    );
  EXCEPTION WHEN OTHERS THEN
    v_real_ip := 'unknown';
  END;

  SELECT COUNT(*)
  INTO v_failed_attempts
  FROM public.order_security_logs
  WHERE attempt_type = 'admin_pin_failed'
    AND ip_address = v_real_ip
    AND created_at > (NOW() - INTERVAL '15 minutes');

  IF v_failed_attempts >= 5 THEN
    RAISE EXCEPTION 'ADMIN_LOCKED: تم قفل التحقق مؤقتاً بسبب كثرة المحاولات الخاطئة. يرجى الانتظار 15 دقيقة.';
  END IF;

  SELECT value INTO v_stored_pin
  FROM public.store_settings
  WHERE key = 'admin_pin'
  LIMIT 1;

  IF v_stored_pin IS NULL OR TRIM(v_stored_pin) = '' THEN
    RETURN FALSE;
  END IF;

  IF TRIM(p_pin) = TRIM(v_stored_pin) THEN
    RETURN TRUE;
  ELSE
    INSERT INTO public.order_security_logs (attempt_type, ip_address, reason, payload)
    VALUES (
      'admin_pin_failed',
      v_real_ip,
      'محاولة إدخال رمز مدير غير صحيح',
      jsonb_build_object('timestamp', NOW())
    );
    RETURN FALSE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_is_admin(p_admin_pin TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN;
  END IF;

  IF p_admin_pin IS NOT NULL AND public.verify_admin_pin(p_admin_pin) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'INVALID_ADMIN_PIN: غير مصرح لك بتنفيذ هذه العملية الإدارية';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val TEXT;
BEGIN
  IF p_key IS NULL
     OR LOWER(TRIM(p_key)) IN ('admin_pin', 'secret_key', 'webhook_secret')
     OR LOWER(TRIM(p_key)) LIKE '%_pin%'
     OR LOWER(TRIM(p_key)) LIKE '%_secret%' THEN
    RAISE EXCEPTION 'ACCESS_DENIED: غير مصرح بقراءة هذا الإعداد الحساس';
  END IF;

  SELECT value INTO v_val FROM public.store_settings WHERE key = p_key LIMIT 1;
  RETURN v_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_dispatch_secure(
  p_order_id TEXT,
  p_dispatch JSONB,
  p_admin_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_rows INT;
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  UPDATE public.orders
  SET security_flags = COALESCE(security_flags, '{}'::jsonb) || jsonb_build_object('delivery_dispatch', p_dispatch),
      updated_at = NOW()
  WHERE (id::TEXT = p_order_id OR order_code = p_order_id)
    AND (is_deleted IS NULL OR is_deleted = FALSE);

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'الطلب غير موجود');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4️⃣ تحصين سياسات إدراج الطلبات والتقييمات
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

ALTER TABLE public.reviews ALTER COLUMN verified SET DEFAULT FALSE;

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

COMMIT;
