-- ==============================================================================
-- 🔄 20261009000005_rpc_restore_order_inventory.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: دالة RPC لاسترجاع مخزون طلب ملغى أو محذوف، مع حماية ضد الاسترجاع المزدوج
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.restore_order_inventory(
  p_order_id BIGINT, 
  p_reason TEXT DEFAULT 'إلغاء الطلب'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_ledger RECORD;
  v_current_stock NUMERIC(10,2);
  v_new_stock NUMERIC(10,2);
  v_restore_qty NUMERIC(10,2);
  v_restored_count INT := 0;
BEGIN
  -- 1. قفل صف الطلب
  SELECT id, inventory_processed, order_code
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: الطلب رقم % غير موجود', p_order_id;
  END IF;

  -- 2. إذا لم يكن المخزون قد خُصم أصلاً، نتوقف بأمان (Idempotent)
  IF v_order.inventory_processed = FALSE THEN
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'لم يتم خصم مخزون لهذا الطلب مسبقاً، لا حاجة للاسترجاع',
      'restored_count', 0
    );
  END IF;

  -- 3. استرجاع الكميات المخصومة المسجلة في inventory_ledger
  FOR v_ledger IN 
    SELECT product_id, ABS(quantity_delta) AS qty_to_restore
    FROM public.inventory_ledger
    WHERE order_id = p_order_id 
      AND movement_type = 'order_deduct'
  LOOP
    v_restore_qty := v_ledger.qty_to_restore;

    -- التحقق من عدم وجود حركة إرجاع سابقة لنفس المنتج في نفس الطلب
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_ledger 
      WHERE order_id = p_order_id 
        AND product_id = v_ledger.product_id 
        AND movement_type = 'order_restore'
    ) THEN
      
      -- قفل صف المنتج وتحديث المخزون
      SELECT stock INTO v_current_stock
      FROM public.products
      WHERE id = v_ledger.product_id
      FOR UPDATE;

      -- إضافة الكمية المسترجعة وتفعيل التوفر تلقائياً
      UPDATE public.products
      SET 
        stock = stock + v_restore_qty,
        is_available = TRUE,
        updated_at = NOW()
      WHERE id = v_ledger.product_id
      RETURNING stock INTO v_new_stock;

      -- تسجيل حركة الاسترجاع
      INSERT INTO public.inventory_ledger (
        product_id,
        order_id,
        quantity_delta,
        movement_type,
        stock_before,
        stock_after,
        reason,
        created_by
      ) VALUES (
        v_ledger.product_id,
        p_order_id,
        v_restore_qty,
        'order_restore',
        v_current_stock,
        v_new_stock,
        format('%s للطلب %s', p_reason, v_order.order_code),
        'system'
      );

      v_restored_count := v_restored_count + 1;
    END IF;
  END LOOP;

  -- 4. إعادة حالة inventory_processed إلى FALSE
  UPDATE public.orders
  SET 
    inventory_processed = FALSE,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'restored_count', v_restored_count
  );
END;
$$;

COMMENT ON FUNCTION public.restore_order_inventory(BIGINT, TEXT) IS 
  'تسترجع كميات المخزون للطلب في حال الإلغاء أو الحذف وتسجلها في جدول التدقيق.';

-- ==============================================================================
-- 🔄 كود التراجع في حال الفشل (Rollback Script)
-- ==============================================================================
/*
BEGIN;
DROP FUNCTION IF EXISTS public.restore_order_inventory(BIGINT, TEXT);
COMMIT;
*/
