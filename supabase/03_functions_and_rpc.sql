-- ==============================================================================
-- ⚡ 03_functions_and_rpc.sql – الدوال المحمية والعمليات الآمنة (RPC)
-- متجر خُضرة - فاس (Khodra Store)
--
-- التحصينات الأمنية المطبقة:
-- 1. دعم المصادقة عبر Supabase Auth (auth.uid() + auth.jwt() -> app_metadata.role = 'admin')
-- 2. حماية verify_admin_pin ضد التخمين (Brute-Force Lockout: 5 محاولات / 15 دقيقة)
-- 3. إزالة أي رمز PIN افتراضي مكشوف من الكود المصدري
-- 4. تثبيت SET search_path = public في جميع دوال SECURITY DEFINER
-- 5. حظر قراءة admin_pin أو أي مفتاح سري عبر get_store_setting
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1️⃣ التحقق من جلسة المدير عبر Supabase Auth (auth.uid() + auth.jwt())
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2️⃣ دالة التحقق من رمز PIN للمدير على الخادم (مع حماية Brute-Force)
-- ─────────────────────────────────────────────────────────────────────────────
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
  -- إذا كان المدير مسجلاً دخوله عبر Supabase Auth JWT، نعتمد جلسته فوراً
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  IF p_pin IS NULL OR LENGTH(TRIM(p_pin)) < 4 THEN
    RETURN FALSE;
  END IF;

  -- استخراج الـ IP الحقيقي لتسجيل وحظر محاولات التخمين (Brute-Force Protection)
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

  -- فحص عدد المحاولات الفاشلة خلال آخر 15 دقيقة لنفس عنوان الـ IP (لمنع حجب المدير الشرعي من جهاز آخر)
  SELECT COUNT(*)
  INTO v_failed_attempts
  FROM public.order_security_logs
  WHERE attempt_type = 'admin_pin_failed'
    AND ip_address = v_real_ip
    AND created_at > (NOW() - INTERVAL '15 minutes');

  IF v_failed_attempts >= 5 THEN
    RAISE EXCEPTION 'ADMIN_LOCKED: تم قفل التحقق مؤقتاً بسبب كثرة المحاولات الخاطئة. يرجى الانتظار 15 دقيقة.';
  END IF;

  -- جلب الرمز المخزن في قاعدة البيانات (بدون أي قيمة افتراضية مكشوفة في الكود)
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

-- دالة حارسة داخلية تتحقق من صلاحية المدير (عبر JWT أو PIN الخادم المحمي)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3️⃣ دالة جلب الطلبات المحمية (get_orders_secure)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_orders_secure(p_admin_pin TEXT DEFAULT NULL)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  RETURN QUERY
  SELECT *
  FROM public.orders
  WHERE (is_deleted IS NULL OR is_deleted = FALSE)
    AND (deleted_at IS NULL)
  ORDER BY created_at DESC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4️⃣ دالة تحديث حالة الطلب (update_order_status_secure)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_order_status_secure(
  p_order_id TEXT,
  p_new_status TEXT,
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

  IF p_new_status NOT IN ('pending', 'prepared', 'confirmed', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS: حالة الطلب غير معتمدة';
  END IF;

  UPDATE public.orders
  SET status = (CASE WHEN p_new_status = 'confirmed' THEN 'prepared' ELSE p_new_status END),
      updated_at = NOW()
  WHERE (id::TEXT = p_order_id OR order_code = p_order_id)
    AND (is_deleted IS NULL OR is_deleted = FALSE);

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'الطلب غير موجود أو محذوف');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5️⃣ دالة تحديث بيانات السائق والتوصيل بأمان (update_order_dispatch_secure)
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 6️⃣ دالة حذف الطلب الآمنة (delete_order_secure)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_order_secure(
  p_order_id TEXT,
  p_admin_pin TEXT DEFAULT NULL,
  p_hard_delete BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected_rows INT;
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  IF p_hard_delete = TRUE THEN
    DELETE FROM public.orders
    WHERE (id::TEXT = p_order_id OR order_code = p_order_id);
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  ELSE
    UPDATE public.orders
    SET is_deleted = TRUE,
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE (id::TEXT = p_order_id OR order_code = p_order_id);
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  END IF;

  IF v_affected_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'الطلب غير موجود بالفعل');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_hard_delete THEN 'تم الحذف النهائي' ELSE 'تم وضع علامة الحذف بنجاح' END,
    'affected_rows', v_affected_rows
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7️⃣ دالة إفراغ سلة المحذوفات نهائياً (purge_deleted_orders_secure)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_deleted_orders_secure(p_admin_pin TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  DELETE FROM public.orders
  WHERE is_deleted = TRUE OR deleted_at IS NOT NULL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'purged_count', v_deleted_count);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8️⃣ دالة حذف التقييم الآمنة (delete_review_secure)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_review_secure(
  p_review_id TEXT,
  p_admin_pin TEXT DEFAULT NULL,
  p_hard_delete BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected INT;
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  IF p_hard_delete THEN
    DELETE FROM public.reviews WHERE id::TEXT = p_review_id;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  ELSE
    UPDATE public.reviews
    SET is_deleted = TRUE,
        deleted_at = NOW()
    WHERE id::TEXT = p_review_id;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('success', true, 'affected_rows', v_affected);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9️⃣ دالة جلب وتحديث إعدادات المتجر (مع حظر صارم لاسترجاع admin_pin)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_store_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val TEXT;
BEGIN
  -- 🔒 حظر قراءة أي مفتاح سري أو رمز PIN عبر هذه الدالة العامة
  IF p_key IS NULL
     OR LOWER(TRIM(p_key)) IN ('admin_pin', 'secret_key', 'webhook_secret')
     OR LOWER(TRIM(p_key)) LIKE '%_pin%'
     OR LOWER(TRIM(p_key)) LIKE '%_secret%' THEN
    RAISE EXCEPTION 'ACCESS_DENIED: غير مصرح بقراءة هذا الإعداد الحساس';
  END IF;

  SELECT value INTO v_val
  FROM public.store_settings
  WHERE key = p_key
  LIMIT 1;

  RETURN v_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_store_setting_secure(
  p_key TEXT,
  p_value TEXT,
  p_admin_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  IF p_key = 'admin_pin' AND (p_value IS NULL OR LENGTH(TRIM(p_value)) < 4) THEN
    RAISE EXCEPTION 'INVALID_PIN_LENGTH: الرمز السري الجديد يجب ألا يقل عن 4 خانات';
  END IF;

  INSERT INTO public.store_settings (key, value, updated_at)
  VALUES (p_key, TRIM(p_value), NOW())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'key', p_key);
END;
$$;
