-- ==============================================================================
-- 📊 20261012000001_unified_financial_model_and_order_costs.sql
-- المرحلة 2: توحيد نموذج البيانات ومحرك الحسابات وتوثيق التكاليف الفعلية والتقديرية
-- متجر خُضرة — فاس (Khodra Fès)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1️⃣ ترقية جدول الطلبات (orders) بحقول التكلفة والحالة المالية وتجميد السجلات
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cogs_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cogs_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS actual_delivery_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS delivery_cost_status TEXT DEFAULT 'estimated',
  ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS driver_id TEXT,
  ADD COLUMN IF NOT EXISTS driver_wage NUMERIC(10,2);

-- إضافة قيود التحقق بأمان في حال لم تكن موجودة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_cogs_status'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT chk_orders_cogs_status
      CHECK (cogs_status IN ('actual', 'estimated', 'unknown'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_delivery_cost_status'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT chk_orders_delivery_cost_status
      CHECK (delivery_cost_status IN ('actual', 'estimated', 'unknown'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_financial_status'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT chk_orders_financial_status
      CHECK (financial_status IN ('unpaid', 'paid', 'partially_refunded', 'refunded'));
  END IF;
END $$;

-- فهارس تسريع الاستعلامات المالية والأرشفة
CREATE INDEX IF NOT EXISTS idx_orders_financial_status ON public.orders(financial_status);
CREATE INDEX IF NOT EXISTS idx_orders_cogs_status ON public.orders(cogs_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2️⃣ دالة استعلام الطلب الفردي الآمنة (get_single_order_secure)
-- تحل مشكلة حجب الاستعلام المباشر عبر RLS لعملاء anon، وتجلب تفاصيل الطلب كاملة
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_single_order_secure(
  p_order_id TEXT,
  p_admin_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_stored_pin TEXT;
BEGIN
  -- جلب رمز الإدارة للتحقق في حال تمريره
  IF p_admin_pin IS NOT NULL AND p_admin_pin <> '' THEN
    SELECT value INTO v_stored_pin
    FROM public.store_settings
    WHERE key = 'admin_pin'
    LIMIT 1;

    IF v_stored_pin IS NOT NULL AND v_stored_pin <> p_admin_pin THEN
      RAISE EXCEPTION 'INVALID_ADMIN_PIN: الرمز السري غير صحيح';
    END IF;
  END IF;

  -- استعلام الطلب بالمعرف الرقمي أو كود الطلب مع استبعاد المحذوفة
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE (id::TEXT = p_order_id OR order_code = p_order_id)
    AND (is_deleted IS NULL OR is_deleted = FALSE)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_order);
END;
$$;

COMMENT ON FUNCTION public.get_single_order_secure(TEXT, TEXT) IS
  'جلب تفاصيل طلب مفرد بأمان وتجاوز قيود RLS للواجهة الإدارية.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3️⃣ دالة تجميد التكاليف المالية للطلب (snapshot_order_costs_secure)
-- تضمن الحفاظ على الأرقام التاريخية وعدم إعادة كتابتها عند تعديل التعريفات الجديدة
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.snapshot_order_costs_secure(
  p_order_id TEXT,
  p_cogs NUMERIC DEFAULT NULL,
  p_cogs_status TEXT DEFAULT 'actual',
  p_delivery_cost NUMERIC DEFAULT NULL,
  p_delivery_cost_status TEXT DEFAULT 'actual',
  p_driver_id TEXT DEFAULT NULL,
  p_driver_wage NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  UPDATE public.orders
  SET
    cogs_amount = COALESCE(p_cogs, cogs_amount),
    cogs_status = CASE WHEN p_cogs IS NOT NULL THEN p_cogs_status ELSE cogs_status END,
    actual_delivery_cost = COALESCE(p_delivery_cost, actual_delivery_cost),
    delivery_cost_status = CASE WHEN p_delivery_cost IS NOT NULL THEN p_delivery_cost_status ELSE delivery_cost_status END,
    driver_id = COALESCE(p_driver_id, driver_id),
    driver_wage = COALESCE(p_driver_wage, driver_wage),
    updated_at = NOW()
  WHERE (id::TEXT = p_order_id OR order_code = p_order_id)
  RETURNING id, order_code, cogs_amount, cogs_status, actual_delivery_cost, delivery_cost_status, driver_wage
  INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_updated.id,
    'order_code', v_updated.order_code,
    'cogs_amount', v_updated.cogs_amount,
    'cogs_status', v_updated.cogs_status,
    'actual_delivery_cost', v_updated.actual_delivery_cost,
    'delivery_cost_status', v_updated.delivery_cost_status,
    'driver_wage', v_updated.driver_wage
  );
END;
$$;

COMMENT ON FUNCTION public.snapshot_order_costs_secure IS
  'تجميد التكاليف الفعلية للطلب وتوثيق درجتها لمنع تأثرها بتغيير التعريفات اللاحقة.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4️⃣ دالة إغلاق وأرشفة جولة التوصيل المركزية في قاعدة البيانات (close_zone_tour_atomic)
-- تحفظ التسليم والأرشفة والتحصيل والتكلفة الفعلية في قاعدة البيانات بدلاً من المتصفح
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
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'delivered_count', 0, 'message', 'لا توجد طلبات في الجولة');
  END IF;

  FOREACH v_oid IN ARRAY p_order_ids
  LOOP
    UPDATE public.orders
    SET
      status = 'delivered',
      is_paid = TRUE,
      paid_at = COALESCE(paid_at, NOW()),
      financial_status = 'paid',
      is_archived = TRUE,
      archived_at = COALESCE(archived_at, NOW()),
      driver_id = COALESCE(p_driver_id, driver_id),
      driver_wage = COALESCE(driver_wage, p_driver_commission),
      actual_delivery_cost = COALESCE(actual_delivery_cost, p_driver_commission),
      delivery_cost_status = 'actual',
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
  'إغلاق جولة التوصيل ذرياً وتحديث الأرشفة والتحصيل والتكلفة الفعلية مركزياً في جدول orders.';
