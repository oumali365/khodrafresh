-- ==============================================================================
-- 🚀 20261009000006_rpc_submit_order_atomic.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: إنشاء الطلب وخصم مخزونه ذرياً في نفس المعاملة (Single DB Transaction)
-- متوافق 100% مع حقول الأمان والمشغّل trg_check_order_security_rate_limit
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.submit_order_atomic(
  p_order_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id BIGINT;
  v_order_code TEXT;
  v_deduct_result JSONB;
BEGIN
  v_order_code := p_order_data->>'order_code';

  -- 1. إدراج الطلب في جدول orders
  -- سيعمل المشغل trg_check_order_security_rate_limit تلقائياً لفحص الـ Cooldown والـ Rate Limit
  INSERT INTO public.orders (
    order_code,
    customer_name,
    phone,
    address,
    delivery_zone,
    items,
    subtotal,
    delivery_fee,
    total,
    status,
    note,
    maps_link,
    idempotency_key,
    client_id,
    device_fingerprint,
    ip_address,
    turnstile_token,
    security_flags,
    inventory_processed,
    created_at,
    updated_at
  ) VALUES (
    v_order_code,
    p_order_data->>'customer_name',
    p_order_data->>'phone',
    p_order_data->>'address',
    COALESCE(p_order_data->>'delivery_zone', 'north'),
    COALESCE(p_order_data->'items', '[]'::jsonb),
    (p_order_data->>'subtotal')::NUMERIC(10,2),
    (p_order_data->>'delivery_fee')::NUMERIC(10,2),
    (p_order_data->>'total')::NUMERIC(10,2),
    'pending',
    p_order_data->>'note',
    p_order_data->>'maps_link',
    p_order_data->>'idempotency_key',
    p_order_data->>'client_id',
    p_order_data->>'device_fingerprint',
    p_order_data->>'ip_address',
    p_order_data->>'turnstile_token',
    COALESCE(p_order_data->'security_flags', '{}'::jsonb),
    FALSE,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- 2. تنفيذ الخصم الذري في نفس المعاملة
  -- إذا لم يكفِ المخزون لأي صنف كسر أو عدد صحيح، سيتم إلقاء استثناء ويتراجع الـ INSERT كاملاً
  v_deduct_result := public.process_order_inventory_deduction(v_order_id);

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'deduction', v_deduct_result
  );

EXCEPTION
  WHEN unique_violation THEN
    -- في حال تكرار idempotency_key، يتم استرجاع الطلب المؤكد مسبقاً بنجاح دون أي تكرار للخصم
    IF p_order_data->>'idempotency_key' IS NOT NULL THEN
      SELECT id, order_code INTO v_order_id, v_order_code
      FROM public.orders
      WHERE idempotency_key = p_order_data->>'idempotency_key'
      LIMIT 1;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'success', true,
          'order_id', v_order_id,
          'order_code', v_order_code,
          'already_submitted', true,
          'message', 'تم تأكيد هذا الطلب مسبقاً بنجاح (Idempotent)'
        );
      END IF;
    END IF;
    RAISE;

  WHEN OTHERS THEN
    -- إعادة رفع الأخطاء الأخرى للواجهة (مثل INSUFFICIENT_STOCK أو RATE_LIMIT)
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.submit_order_atomic(JSONB) IS 
  'تنشئ الطلب وتفحص وتخصم المخزون ذرياً في نفس العملية (All-or-Nothing).';

-- ==============================================================================
-- 🔄 كود التراجع في حال الفشل (Rollback Script)
-- ==============================================================================
/*
BEGIN;
DROP FUNCTION IF EXISTS public.submit_order_atomic(JSONB);
COMMIT;
*/
