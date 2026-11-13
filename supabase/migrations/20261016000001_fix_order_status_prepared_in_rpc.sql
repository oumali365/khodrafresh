-- ==============================================================================
-- 🏷️ 20261016000001_fix_order_status_prepared_in_rpc.sql
-- إصلاح دالة تحديث حالة الطلب (update_order_status_secure) لقبول حالة 'prepared' (تم التجهيز)
-- وتفادي رفض نقل الطلبات من قسم المراجعة إلى قسم التجهيز
-- ==============================================================================

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
  v_actual_status TEXT;
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  -- التحقق من صلاحية الحالة الجديدة وقبول 'prepared' و 'confirmed'
  IF p_new_status NOT IN ('pending', 'prepared', 'confirmed', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'حالة الطلب غير صالحة: %', p_new_status;
  END IF;

  v_actual_status := CASE WHEN p_new_status = 'confirmed' THEN 'prepared' ELSE p_new_status END;

  UPDATE public.orders
  SET status = v_actual_status,
      updated_at = NOW()
  WHERE (id::TEXT = p_order_id OR order_code = p_order_id)
    AND (is_deleted IS NULL OR is_deleted = FALSE);
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  IF v_affected_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الطلب غير موجود أو تم حذفه'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث حالة الطلب بنجاح',
    'status', v_actual_status,
    'affected_rows', v_affected_rows
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
