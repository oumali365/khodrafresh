-- ==============================================================================
-- 🚚 20261016000002_unify_dispatch_and_order_lifecycle.sql
-- توحيد إدارة الإرسال والسائقين ودورة حياة الطلب بين لوحة الطلبات وأسطول التوصيل
-- متجر خُضرة — فاس (Khodra Fès)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1️⃣ دالة تحديث بيانات السائق والإرسال الموحدة (update_order_dispatch_secure)
-- تضمن تحديث الحقول الأصلية (driver_id, driver_wage, actual_delivery_cost) 
-- وتوثيق كائن الإرسال كاملاً في security_flags->delivery_dispatch في استدعاء ذري واحد
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
  v_driver_id TEXT;
  v_delivery_cost NUMERIC;
  v_cost_certainty TEXT;
BEGIN
  PERFORM public.assert_is_admin(p_admin_pin);

  IF p_dispatch IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'بيانات التوصيل غير محددة');
  END IF;

  v_driver_id := NULLIF(p_dispatch->>'driverId', '');
  IF (p_dispatch->>'deliveryCost') IS NOT NULL AND (p_dispatch->>'deliveryCost') <> '' THEN
    v_delivery_cost := (p_dispatch->>'deliveryCost')::NUMERIC;
  ELSE
    v_delivery_cost := NULL;
  END IF;

  v_cost_certainty := COALESCE(NULLIF(p_dispatch->>'costCertainty', ''), 'actual');

  UPDATE public.orders
  SET 
    -- 1. تحديث الحقول المباشرة لجدول الطلبات لضمان استعلامات التقارير المالية والأسطول
    driver_id = COALESCE(v_driver_id, driver_id),
    driver_wage = COALESCE(v_delivery_cost, driver_wage),
    actual_delivery_cost = COALESCE(v_delivery_cost, actual_delivery_cost),
    delivery_cost_status = CASE 
      WHEN v_delivery_cost IS NOT NULL THEN v_cost_certainty 
      ELSE delivery_cost_status 
    END,
    -- 2. دمج كائن الإرسال كاملاً بداخل security_flags لضمان توافق الواجهة والمسودات
    security_flags = COALESCE(security_flags, '{}'::jsonb) || jsonb_build_object('delivery_dispatch', p_dispatch),
    updated_at = NOW()
  WHERE (id::TEXT = p_order_id OR order_code = p_order_id)
    AND (is_deleted IS NULL OR is_deleted = FALSE);

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'الطلب غير موجود أو تم حذفه');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حفظ وتوثيق بيانات السائق والتوصيل بنجاح',
    'affected_rows', v_updated_rows
  );
END;
$$;

COMMENT ON FUNCTION public.update_order_dispatch_secure IS
  'تحديث بيانات السائق والتوصيل ذرياً وتوحيد الحقول الأصلية وكائن JSON بجدول orders';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2️⃣ ترقية دالة إغلاق وأرشفة جولة التوصيل (close_zone_tour_atomic)
-- مزامنة كائن delivery_dispatch مع حالة التسليم لتجنب ظهور بيانات غير محدثة
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.close_zone_tour_atomic(
  p_order_ids TEXT[],
  p_driver_id TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_phone TEXT DEFAULT NULL,
  p_driver_commission NUMERIC DEFAULT 25.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_oid TEXT;
  v_existing_dispatch JSONB;
  v_merged_dispatch JSONB;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'delivered_count', 0, 'message', 'لا توجد طلبات في الجولة');
  END IF;

  FOREACH v_oid IN ARRAY p_order_ids
  LOOP
    -- استخراج كائن الإرسال الحالي لدمجه
    SELECT security_flags->'delivery_dispatch' INTO v_existing_dispatch
    FROM public.orders
    WHERE (id::TEXT = v_oid OR order_code = v_oid)
      AND (is_deleted IS NULL OR is_deleted = FALSE)
    LIMIT 1;

    v_merged_dispatch := COALESCE(v_existing_dispatch, '{}'::jsonb) || jsonb_build_object(
      'dispatchStatus', 'delivered',
      'driverId', COALESCE(NULLIF(p_driver_id, ''), v_existing_dispatch->>'driverId'),
      'driverName', COALESCE(NULLIF(p_driver_name, ''), v_existing_dispatch->>'driverName'),
      'driverPhone', COALESCE(NULLIF(p_driver_phone, ''), v_existing_dispatch->>'driverPhone'),
      'deliveryCost', COALESCE(p_driver_commission, (v_existing_dispatch->>'deliveryCost')::NUMERIC, 25.00),
      'costCertainty', 'actual'
    );

    UPDATE public.orders
    SET
      status = 'delivered',
      is_paid = TRUE,
      paid_at = COALESCE(paid_at, NOW()),
      financial_status = 'paid',
      is_archived = TRUE,
      archived_at = COALESCE(archived_at, NOW()),
      driver_id = COALESCE(NULLIF(p_driver_id, ''), driver_id),
      driver_wage = COALESCE(driver_wage, p_driver_commission),
      actual_delivery_cost = COALESCE(actual_delivery_cost, p_driver_commission),
      delivery_cost_status = 'actual',
      security_flags = COALESCE(security_flags, '{}'::jsonb) || jsonb_build_object('delivery_dispatch', v_merged_dispatch),
      updated_at = NOW()
    WHERE (id::TEXT = v_oid OR order_code = v_oid)
      AND (is_deleted IS NULL OR is_deleted = FALSE);

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- تحديث إحصائيات السائق في جدول store_drivers إذا كان محدداً
  IF p_driver_id IS NOT NULL AND p_driver_id <> '' THEN
    UPDATE public.store_drivers
    SET
      status = 'available',
      active_orders_count = GREATEST(0, active_orders_count - v_count),
      total_delivered_count = total_delivered_count + v_count,
      updated_at = NOW()
    WHERE id = p_driver_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'delivered_count', v_count,
    'message', format('تم إغلاق الجولة وتأكيد تسليم وأرشفة %s طلبات بنجاح في قاعدة البيانات', v_count)
  );
END;
$$;

COMMENT ON FUNCTION public.close_zone_tour_atomic IS
  'إغلاق جولة التوصيل ذرياً وتأكيد التسليم والأرشفة وسداد المبالغ النقدية وتوثيق السائق في سجلات Supabase.';

NOTIFY pgrst, 'reload schema';
