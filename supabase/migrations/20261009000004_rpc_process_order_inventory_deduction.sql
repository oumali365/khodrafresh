-- ==============================================================================
-- ⚡ 20261009000004_rpc_process_order_inventory_deduction.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: دالة RPC لمعالجة وخصم مخزون طلب معين ذرياً مع قفل الصفوف (Row Locking)
-- ومنع البيع الزائد (Overselling) وضمان Idempotency التام
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_order_inventory_deduction(p_order_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_product_id BIGINT;
  v_quantity NUMERIC(10,2);
  v_current_stock NUMERIC(10,2);
  v_new_stock NUMERIC(10,2);
  v_items_count INT := 0;
BEGIN
  -- 1. قفل صف الطلب والتحقق من وجوده
  SELECT id, items, inventory_processed, status, order_code
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: الطلب رقم % غير موجود', p_order_id;
  END IF;

  -- 2. التحقق من الـ Idempotency: إذا عولج مسبقاً لا يتم تكرار الخصم نهائياً
  IF v_order.inventory_processed = TRUE THEN
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'تمت معالجة مخزون هذا الطلب مسبقاً (Idempotent)',
      'already_processed', true
    );
  END IF;

  -- 3. المرور على جميع عناصر الطلب
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    -- استخراج المعرف بأمان (يدعم 'id' أو 'product_id')
    v_product_id := COALESCE((v_item->>'id')::BIGINT, (v_item->>'product_id')::BIGINT);

    -- استخراج الكمية كـ NUMERIC(10,2) دون أي تقريب لـ INT ودون استخدام Math.floor
    v_quantity := ROUND((v_item->>'qty')::NUMERIC, 2);

    -- معالجة المنتجات الصالحة ذات الكميات الموجبة
    IF v_product_id IS NOT NULL AND v_quantity > 0 THEN
      
      -- قفل صف المنتج في جدول products لمنع أي تسابق تزامني (Concurrency Lock)
      SELECT stock INTO v_current_stock
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'PRODUCT_NOT_FOUND: المنتج رقم % غير موجود', v_product_id;
      END IF;

      -- التحقق من كفاية المخزون ومنع الـ Overselling تماماً
      IF v_current_stock < v_quantity THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:available=%:requested=%', 
          v_product_id, v_current_stock, v_quantity;
      END IF;

      -- خصم المخزون وتحديث is_available تلقائياً بناءً على الرصيد فقط (مع الحفاظ على active لقرار المدير)
      UPDATE public.products 
      SET 
        stock = stock - v_quantity,
        is_available = ((stock - v_quantity) > 0),
        updated_at = NOW()
      WHERE id = v_product_id 
        AND stock >= v_quantity
      RETURNING stock INTO v_new_stock;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:available=%:requested=%', 
          v_product_id, v_current_stock, v_quantity;
      END IF;

      -- تسجيل الحركة في جدول التدقيق (محمية أيضاً بالـ Partial Unique Index)
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
        v_product_id,
        p_order_id,
        -v_quantity,
        'order_deduct',
        v_current_stock,
        v_new_stock,
        format('خصم مخزون للطلب %s', v_order.order_code),
        'system'
      );

      v_items_count := v_items_count + 1;
    END IF;
  END LOOP;

  -- 4. تحديث مؤشر الطلب بأنه تمت معالجة مخزونه بنجاح
  UPDATE public.orders
  SET 
    inventory_processed = TRUE,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'items_deducted', v_items_count
  );
END;
$$;

COMMENT ON FUNCTION public.process_order_inventory_deduction(BIGINT) IS 
  'تخصم كميات الطلب ذرياً من جدول المنتجات وتسجلها في الـ ledger مع فحص عدم نفاد المخزون.';

-- ==============================================================================
-- 🔄 كود التراجع في حال الفشل (Rollback Script)
-- ==============================================================================
/*
BEGIN;
DROP FUNCTION IF EXISTS public.process_order_inventory_deduction(BIGINT);
COMMIT;
*/
