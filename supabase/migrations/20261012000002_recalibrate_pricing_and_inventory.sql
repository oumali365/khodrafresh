-- ==============================================================================
-- 📈 20261012000002_recalibrate_pricing_and_inventory.sql
-- المرحلة 3 — إعادة ضبط التسعير والمخزون وفق القاعدة التجارية لخُضرة فاس
-- 1. توثيق سجل تغييرات الأسعار (price_change_history) قبل وبعد التعديل
-- 2. ترقية سجل حركات المخزون (inventory_ledger) لربط تكلفة الشراء، التالف، والمرتجعات
-- 3. دوال ذرية لتطبيق التعديلات الجماعية وتوثيق حركات المخزون للتدقيق المحاسبي
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1️⃣ ترقية جدول سجل حركات المخزون (inventory_ledger)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_ledger
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_cost_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS supplier_id TEXT,
  ADD COLUMN IF NOT EXISTS unit_label TEXT;

-- تحديث قيد التحقق من نوع الحركة ليدعم التالف والفاقد والمرتجعات
ALTER TABLE public.inventory_ledger
  DROP CONSTRAINT IF EXISTS inventory_ledger_movement_type_check;

ALTER TABLE public.inventory_ledger
  ADD CONSTRAINT inventory_ledger_movement_type_check
  CHECK (
    movement_type IN (
      'order_deduct',
      'order_restore',
      'manual_adjustment',
      'morning_stockin',
      'waste_loss',
      'supplier_return'
    )
  );

-- فهارس تسريع البحث والتدقيق المحاسبي
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_movement_type
  ON public.inventory_ledger (movement_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_supplier
  ON public.inventory_ledger (supplier_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2️⃣ إنشاء جدول سجل تدقيق تغيير الأسعار (price_change_history)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  supplier_id TEXT,
  supplier_name TEXT,
  unit_label TEXT,
  old_purchase_price NUMERIC(10,2),
  new_purchase_price NUMERIC(10,2) NOT NULL,
  old_selling_price NUMERIC(10,2),
  new_selling_price NUMERIC(10,2) NOT NULL,
  old_cogs_ratio NUMERIC(5,2),
  new_cogs_ratio NUMERIC(5,2) NOT NULL,
  old_gross_margin NUMERIC(5,2),
  new_gross_margin NUMERIC(5,2) NOT NULL,
  markup_percent NUMERIC(5,2),
  change_type TEXT NOT NULL CHECK (change_type IN ('single', 'batch', 'bulk_margin', 'supplier_sync')),
  has_exception BOOLEAN DEFAULT FALSE,
  exception_reason TEXT,
  changed_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_change_history_product
  ON public.price_change_history (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_change_history_created_at
  ON public.price_change_history (created_at DESC);

ALTER TABLE public.price_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select price change history for all" ON public.price_change_history;
CREATE POLICY "Allow select price change history for all"
  ON public.price_change_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert price change history for authenticated and anon" ON public.price_change_history;
CREATE POLICY "Allow insert price change history for authenticated and anon"
  ON public.price_change_history FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3️⃣ ترقية جدول أسعار اليوم (daily_prices) بحقول التحقق من سقف التكلفة
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.daily_prices
  ADD COLUMN IF NOT EXISTS cogs_ratio NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS gross_margin_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS markup_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS has_exception BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exception_reason TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4️⃣ دالة ذرية لتسجيل حركات المخزون (الدخول الصباحي، التالف، المرتجع، التعديل اليدوي)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_inventory_movement_atomic(
  p_product_id BIGINT,
  p_movement_type TEXT,
  p_quantity_delta NUMERIC,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_supplier_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock NUMERIC(10,2);
  v_new_stock NUMERIC(10,2);
  v_unit_label TEXT;
  v_product_name TEXT;
  v_ledger_id UUID;
  v_total_cost NUMERIC(10,2);
BEGIN
  -- 1. قفل صف المنتج لمنع تضارب المعاملات المتزامنة
  SELECT name, stock, unit_label
  INTO v_product_name, v_current_stock, v_unit_label
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRODUCT_NOT_FOUND');
  END IF;

  v_current_stock := COALESCE(v_current_stock, 0);
  v_new_stock := v_current_stock + p_quantity_delta;

  -- منع هبوط المخزون تحت الصفر إلا في حالات التالف أو التعديل المبرر
  IF v_new_stock < 0 THEN
    v_new_stock := 0;
  END IF;

  -- حساب القيمة المالية للحركة
  IF p_unit_cost IS NOT NULL AND p_unit_cost > 0 THEN
    v_total_cost := ROUND(ABS(p_quantity_delta) * p_unit_cost, 2);
  ELSE
    v_total_cost := NULL;
  END IF;

  -- 2. إدراج الحركة في جدول سجل المخزون للتدقيق
  INSERT INTO public.inventory_ledger (
    product_id,
    quantity_delta,
    movement_type,
    stock_before,
    stock_after,
    unit_cost,
    total_cost_value,
    supplier_id,
    unit_label,
    reason,
    created_by,
    created_at
  ) VALUES (
    p_product_id,
    p_quantity_delta,
    p_movement_type,
    v_current_stock,
    v_new_stock,
    p_unit_cost,
    v_total_cost,
    p_supplier_id,
    v_unit_label,
    p_reason,
    p_created_by,
    NOW()
  )
  RETURNING id INTO v_ledger_id;

  -- 3. تحديث جدول المنتجات
  UPDATE public.products
  SET
    stock = v_new_stock,
    is_available = (v_new_stock > 0),
    active = (v_new_stock > 0),
    updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'product_name', v_product_name,
    'movement_type', p_movement_type,
    'quantity_delta', p_quantity_delta,
    'stock_before', v_current_stock,
    'stock_after', v_new_stock,
    'total_cost_value', v_total_cost,
    'ledger_id', v_ledger_id
  );
END;
$$;

COMMENT ON FUNCTION public.record_inventory_movement_atomic IS
  'تسجيل حركة مخزون ذرية وموثقة (دخول صباحي، تالف، مرتجع) مع تحديث رصيد المنتج.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5️⃣ دالة تطبيق وتوثيق تحديثات الأسعار الجماعية ذرياً
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_batch_prices_atomic(
  p_updates JSONB,
  p_changed_by TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_product_id BIGINT;
  v_supplier_id TEXT;
  v_purchase_price NUMERIC(10,2);
  v_selling_price NUMERIC(10,2);
  v_margin NUMERIC(5,2);
  v_cogs_ratio NUMERIC(5,2);
  v_gross_margin NUMERIC(5,2);
  v_markup NUMERIC(5,2);
  v_has_exception BOOLEAN;
  v_exception_reason TEXT;
  v_today_date DATE := CURRENT_DATE;
  v_old_prod RECORD;
  v_updated_count INT := 0;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    v_product_id := (v_item->>'productId')::BIGINT;
    v_supplier_id := COALESCE(v_item->>'supplierId', 'sup-1');
    v_purchase_price := (v_item->>'purchasePrice')::NUMERIC(10,2);
    v_selling_price := (v_item->>'sellingPrice')::NUMERIC(10,2);
    v_has_exception := COALESCE((v_item->>'hasException')::BOOLEAN, FALSE);
    v_exception_reason := v_item->>'exceptionReason';

    -- جلب المنتج الحالي لمعرفة السعر السابق
    SELECT id, name, price, unit_label INTO v_old_prod
    FROM public.products
    WHERE id = v_product_id;

    IF FOUND THEN
      -- حساب النسب
      IF v_selling_price > 0 THEN
        v_cogs_ratio := ROUND((v_purchase_price / v_selling_price) * 100, 2);
        v_gross_margin := ROUND(((v_selling_price - v_purchase_price) / v_selling_price) * 100, 2);
      ELSE
        v_cogs_ratio := 0;
        v_gross_margin := 0;
      END IF;

      IF v_purchase_price > 0 THEN
        v_markup := ROUND(((v_selling_price - v_purchase_price) / v_purchase_price) * 100, 2);
      ELSE
        v_markup := 0;
      END IF;

      -- 1. تحديث أو إدراج في daily_prices
      INSERT INTO public.daily_prices (
        product_id,
        supplier_id,
        purchase_price,
        selling_price,
        margin_percentage,
        cogs_ratio,
        gross_margin_percent,
        markup_percent,
        has_exception,
        exception_reason,
        recorded_date,
        updated_at
      ) VALUES (
        v_product_id,
        v_supplier_id,
        v_purchase_price,
        v_selling_price,
        v_gross_margin,
        v_cogs_ratio,
        v_gross_margin,
        v_markup,
        v_has_exception,
        v_exception_reason,
        v_today_date,
        NOW()
      )
      ON CONFLICT (product_id, recorded_date)
      DO UPDATE SET
        supplier_id = EXCLUDED.supplier_id,
        purchase_price = EXCLUDED.purchase_price,
        selling_price = EXCLUDED.selling_price,
        margin_percentage = EXCLUDED.margin_percentage,
        cogs_ratio = EXCLUDED.cogs_ratio,
        gross_margin_percent = EXCLUDED.gross_margin_percent,
        markup_percent = EXCLUDED.markup_percent,
        has_exception = EXCLUDED.has_exception,
        exception_reason = EXCLUDED.exception_reason,
        updated_at = NOW();

      -- 2. تحديث سعر البيع المباشر في products
      UPDATE public.products
      SET
        price = v_selling_price,
        updated_at = NOW()
      WHERE id = v_product_id;

      -- 3. توثيق التغيير في سجل التدقيق price_change_history
      INSERT INTO public.price_change_history (
        product_id,
        product_name,
        supplier_id,
        unit_label,
        old_purchase_price,
        new_purchase_price,
        old_selling_price,
        new_selling_price,
        new_cogs_ratio,
        new_gross_margin,
        markup_percent,
        change_type,
        has_exception,
        exception_reason,
        changed_by,
        created_at
      ) VALUES (
        v_product_id,
        v_old_prod.name,
        v_supplier_id,
        v_old_prod.unit_label,
        NULL,
        v_purchase_price,
        v_old_prod.price,
        v_selling_price,
        v_cogs_ratio,
        v_gross_margin,
        v_markup,
        'batch',
        v_has_exception,
        v_exception_reason,
        p_changed_by,
        NOW()
      );

      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', format('تم اعتماد وتوثيق أسعار %s منتجاً بنجاح', v_updated_count)
  );
END;
$$;

COMMENT ON FUNCTION public.apply_batch_prices_atomic IS
  'تحديث الأسعار وتوثيق التدقيق التاريخي في سجل التغييرات ذرياً.';
