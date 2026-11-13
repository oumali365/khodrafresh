-- ============================================================
-- 20261006000002_fix_function_overload_ambiguity.sql
-- حل نهائي لمشكلة تضارب وتعدد توقيعات الدوال في Supabase / PostgreSQL:
-- "Could not choose the best candidate function"
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1️⃣ دالة حذف الطلب الآمنة (delete_order_secure)
-- إسقاط جميع التوقيعات المتضاربة القديمة أولاً
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_order_secure(BIGINT, TEXT);
DROP FUNCTION IF EXISTS public.delete_order_secure(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_order_secure(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.delete_order_secure(BIGINT);
DROP FUNCTION IF EXISTS public.delete_order_secure(TEXT);

-- إنشاء الدالة الموحدة الوحيدة بدون أي تكرار
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

-- ────────────────────────────────────────────────────────────
-- 2️⃣ دالة حذف التعليق الآمنة (delete_review_secure)
-- إسقاط جميع التوقيعات المتضاربة القديمة
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_review_secure(BIGINT, TEXT);
DROP FUNCTION IF EXISTS public.delete_review_secure(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_review_secure(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.delete_review_secure(BIGINT);
DROP FUNCTION IF EXISTS public.delete_review_secure(TEXT);

-- إنشاء الدالة الموحدة الوحيدة
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
  v_affected_rows INT;
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  IF p_hard_delete = TRUE THEN
    DELETE FROM public.customer_reviews
    WHERE id::TEXT = p_review_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  ELSE
    UPDATE public.customer_reviews
    SET is_deleted = TRUE,
        updated_at = NOW()
    WHERE id::TEXT = p_review_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  END IF;

  IF v_affected_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'التعليق غير موجود');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حذف التعليق بنجاح',
    'affected_rows', v_affected_rows
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3️⃣ دالة تحديث حالة الطلب (update_order_status_secure)
-- توحيد التوقيع لتفادي التضارب بين TEXT و BIGINT
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_order_status_secure(BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_order_status_secure(TEXT, TEXT, TEXT);

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
  v_affected_rows INT;
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  IF p_new_status NOT IN ('pending', 'prepared', 'confirmed', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'حالة الطلب غير صالحة: %', p_new_status;
  END IF;

  UPDATE public.orders
  SET status = (CASE WHEN p_new_status = 'confirmed' THEN 'prepared' ELSE p_new_status END),
      updated_at = NOW()
  WHERE (id::TEXT = p_order_id OR order_code = p_order_id);
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  IF v_affected_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'الطلب غير موجود');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث حالة الطلب بنجاح',
    'affected_rows', v_affected_rows
  );
END;
$$;

-- إشعار Supabase PostgREST لتحديث كاش المخطط فوراً
NOTIFY pgrst, 'reload schema';
