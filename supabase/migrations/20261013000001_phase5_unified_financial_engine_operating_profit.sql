-- ==============================================================================
-- 📊 20261013000001_phase5_unified_financial_engine_operating_profit.sql
-- المرحلة الخامسة: المحرك المالي الموحد والأرباح التشغيلية وتحديث ترحيلات Supabase
-- متجر خُضرة — فاس (Khodra Fès)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1️⃣ ترقية جدول الطلبات (orders) بحقول المحرك المالي والربح التشغيلي المباشر
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cogs_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cogs_status TEXT DEFAULT 'estimated',
  ADD COLUMN IF NOT EXISTS cogs_ratio NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS actual_delivery_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS driver_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS delivery_cost_status TEXT DEFAULT 'estimated',
  ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC(10,2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS other_direct_costs NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS direct_costs NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS operating_profit NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS operating_profit_margin NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS financial_notes TEXT;

-- إضافة قيود التحقق بأمان من درجات التوثيق (Cost Certainty)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_cogs_status_v2'
  ) THEN
    ALTER TABLE public.orders
      DROP CONSTRAINT IF EXISTS chk_orders_cogs_status;
    ALTER TABLE public.orders
      ADD CONSTRAINT chk_orders_cogs_status_v2
      CHECK (cogs_status IN ('actual', 'estimated', 'unknown'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_delivery_cost_status_v2'
  ) THEN
    ALTER TABLE public.orders
      DROP CONSTRAINT IF EXISTS chk_orders_delivery_cost_status;
    ALTER TABLE public.orders
      ADD CONSTRAINT chk_orders_delivery_cost_status_v2
      CHECK (delivery_cost_status IN ('actual', 'estimated', 'unknown'));
  END IF;
END $$;

-- فهارس تسريع الاستعلامات والتقارير المالية الموحدة
CREATE INDEX IF NOT EXISTS idx_orders_delivery_fee ON public.orders(delivery_fee);
CREATE INDEX IF NOT EXISTS idx_orders_cogs_amount ON public.orders(cogs_amount);
CREATE INDEX IF NOT EXISTS idx_orders_operating_profit ON public.orders(operating_profit);
CREATE INDEX IF NOT EXISTS idx_orders_active_created ON public.orders(created_at DESC) WHERE (is_deleted IS NULL OR is_deleted = FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2️⃣ مشغّل (Trigger) حساب ومزامنة الأرباح التشغيلية تلقائياً لكل طلب
-- يضمن المعادلة المعتمدة:
-- الربح التشغيلي قبل المصاريف العامة = (إيرادات المنتجات + رسوم توصيل العميل)
--                                   - تكلفة شراء المنتجات المباعة
--                                   - تكلفة التوصيل الفعلية
--                                   - التكاليف المباشرة الإضافية
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_order_operating_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal NUMERIC(10,2);
  v_fee NUMERIC(10,2);
  v_cogs NUMERIC(10,2);
  v_del_cost NUMERIC(10,2);
  v_pack NUMERIC(10,2);
  v_other NUMERIC(10,2);
  v_total_direct NUMERIC(10,2);
  v_gross_rev NUMERIC(10,2);
  v_profit NUMERIC(10,2);
BEGIN
  v_subtotal := COALESCE(NEW.subtotal, (NEW.total - COALESCE(NEW.delivery_fee, 0.00)), 0.00);
  v_fee := COALESCE(NEW.delivery_fee, 0.00);
  v_pack := COALESCE(NEW.packaging_cost, 2.00);
  v_other := COALESCE(NEW.other_direct_costs, NEW.direct_costs, 0.00);

  -- 1) توحيد حقول تكلفة التوصيل (delivery_cost / actual_delivery_cost / driver_cost / driver_wage)
  v_del_cost := COALESCE(
    NEW.actual_delivery_cost,
    NEW.delivery_cost,
    NEW.driver_cost,
    NEW.driver_wage,
    CASE
      WHEN NEW.delivery_zone = 'south' THEN 15.00
      WHEN NEW.delivery_zone = 'east' THEN 25.00
      ELSE 20.00
    END
  );
  NEW.actual_delivery_cost := v_del_cost;
  NEW.delivery_cost := v_del_cost;
  NEW.driver_cost := v_del_cost;

  -- 2) توفير قيمة احتياطية آمنة ومعلنة لـ COGS بنسبة 60% عند الغياب
  IF NEW.cogs_amount IS NULL OR NEW.cogs_amount <= 0 THEN
    v_cogs := ROUND((v_subtotal * 0.60)::numeric, 2);
    NEW.cogs_amount := v_cogs;
    NEW.cogs_status := 'estimated';
  ELSE
    v_cogs := NEW.cogs_amount;
  END IF;

  IF v_subtotal > 0 THEN
    NEW.cogs_ratio := ROUND(((v_cogs / v_subtotal) * 100)::numeric, 2);
  ELSE
    NEW.cogs_ratio := 0.00;
  END IF;

  -- 3) حساب إجمالي التكاليف المباشرة والربح التشغيلي قبل المصاريف العامة
  v_total_direct := ROUND((v_cogs + v_del_cost + v_pack + v_other)::numeric, 2);
  NEW.direct_costs := v_total_direct;

  v_gross_rev := ROUND((v_subtotal + v_fee)::numeric, 2);
  v_profit := ROUND((v_gross_rev - v_total_direct)::numeric, 2);
  NEW.operating_profit := v_profit;

  IF v_gross_rev > 0 THEN
    NEW.operating_profit_margin := ROUND(((v_profit / v_gross_rev) * 100)::numeric, 2);
  ELSE
    NEW.operating_profit_margin := 0.00;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_operating_financials ON public.orders;
CREATE TRIGGER trg_sync_order_operating_financials
  BEFORE INSERT OR UPDATE OF subtotal, delivery_fee, total, cogs_amount, actual_delivery_cost, delivery_cost, driver_cost, packaging_cost, other_direct_costs
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_operating_financials();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3️⃣ دالة RPC لحساب ملخص الأرباح التشغيلية مباشرة في قاعدة البيانات
-- calculate_operating_financials_summary(start_date, end_date)
-- المصدر المركزي لاستخراج الأرباح التشغيلية الحقيقية وتفاصيلها دون تكرار في الواجهة
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_operating_financials_summary(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders_count BIGINT := 0;
  v_products_revenue NUMERIC(12,2) := 0.00;
  v_delivery_fees NUMERIC(12,2) := 0.00;
  v_gross_revenue NUMERIC(12,2) := 0.00;
  v_cogs_total NUMERIC(12,2) := 0.00;
  v_delivery_costs_total NUMERIC(12,2) := 0.00;
  v_actual_delivery_costs NUMERIC(12,2) := 0.00;
  v_estimated_delivery_costs NUMERIC(12,2) := 0.00;
  v_delivery_actual_count BIGINT := 0;
  v_delivery_estimated_count BIGINT := 0;
  v_cogs_actual_count BIGINT := 0;
  v_cogs_estimated_count BIGINT := 0;
  v_packaging_costs NUMERIC(12,2) := 0.00;
  v_other_direct_costs NUMERIC(12,2) := 0.00;
  v_total_direct_costs NUMERIC(12,2) := 0.00;
  v_operating_profit NUMERIC(12,2) := 0.00;
  v_operating_margin NUMERIC(5,2) := 0.00;
  v_aov NUMERIC(10,2) := 0.00;
  v_avg_delivery_cost NUMERIC(10,2) := 0.00;
  v_delivery_net_margin NUMERIC(12,2) := 0.00;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(subtotal), 0.00),
    COALESCE(SUM(COALESCE(delivery_fee, 0.00)), 0.00),
    COALESCE(SUM(COALESCE(total, subtotal + COALESCE(delivery_fee, 0.00))), 0.00),
    COALESCE(SUM(COALESCE(cogs_amount, ROUND((subtotal * 0.60)::numeric, 2))), 0.00),
    COALESCE(SUM(COALESCE(actual_delivery_cost, delivery_cost, 20.00)), 0.00),
    COALESCE(SUM(CASE WHEN delivery_cost_status = 'actual' THEN COALESCE(actual_delivery_cost, delivery_cost, 20.00) ELSE 0.00 END), 0.00),
    COALESCE(SUM(CASE WHEN delivery_cost_status <> 'actual' OR delivery_cost_status IS NULL THEN COALESCE(actual_delivery_cost, delivery_cost, 20.00) ELSE 0.00 END), 0.00),
    COUNT(*) FILTER (WHERE delivery_cost_status = 'actual'),
    COUNT(*) FILTER (WHERE delivery_cost_status <> 'actual' OR delivery_cost_status IS NULL),
    COUNT(*) FILTER (WHERE cogs_status = 'actual'),
    COUNT(*) FILTER (WHERE cogs_status <> 'actual' OR cogs_status IS NULL),
    COALESCE(SUM(COALESCE(packaging_cost, 2.00)), 0.00),
    COALESCE(SUM(COALESCE(other_direct_costs, direct_costs, 0.00)), 0.00)
  INTO
    v_orders_count,
    v_products_revenue,
    v_delivery_fees,
    v_gross_revenue,
    v_cogs_total,
    v_delivery_costs_total,
    v_actual_delivery_costs,
    v_estimated_delivery_costs,
    v_delivery_actual_count,
    v_delivery_estimated_count,
    v_cogs_actual_count,
    v_cogs_estimated_count,
    v_packaging_costs,
    v_other_direct_costs
  FROM public.orders
  WHERE (is_deleted IS NULL OR is_deleted = FALSE)
    AND status <> 'cancelled'
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  IF v_orders_count > 0 THEN
    v_total_direct_costs := v_cogs_total + v_delivery_costs_total + v_packaging_costs + v_other_direct_costs;
    v_operating_profit := v_gross_revenue - v_total_direct_costs;
    
    IF v_gross_revenue > 0 THEN
      v_operating_margin := ROUND(((v_operating_profit / v_gross_revenue) * 100)::numeric, 2);
    END IF;

    v_aov := ROUND((v_gross_revenue / v_orders_count)::numeric, 2);
    v_avg_delivery_cost := ROUND((v_delivery_costs_total / v_orders_count)::numeric, 2);
    v_delivery_net_margin := ROUND((v_delivery_fees - v_delivery_costs_total)::numeric, 2);
  END IF;

  RETURN jsonb_build_object(
    'orders_count', v_orders_count,
    'products_revenue', v_products_revenue,
    'customer_delivery_fees', v_delivery_fees,
    'gross_revenue', v_gross_revenue,
    'cogs_total', v_cogs_total,
    'delivery_costs_total', v_delivery_costs_total,
    'actual_delivery_costs_total', v_actual_delivery_costs,
    'estimated_delivery_costs_total', v_estimated_delivery_costs,
    'delivery_actual_count', v_delivery_actual_count,
    'delivery_estimated_count', v_delivery_estimated_count,
    'cogs_actual_count', v_cogs_actual_count,
    'cogs_estimated_count', v_cogs_estimated_count,
    'packaging_costs_total', v_packaging_costs,
    'other_direct_costs_total', v_other_direct_costs,
    'total_direct_costs', v_total_direct_costs,
    'operating_profit_before_overheads', v_operating_profit,
    'operating_profit_margin_percent', v_operating_margin,
    'average_order_value', v_aov,
    'average_delivery_cost_per_order', v_avg_delivery_cost,
    'delivery_net_margin', v_delivery_net_margin,
    'is_fully_actual', (v_cogs_estimated_count = 0 AND v_delivery_estimated_count = 0 AND v_orders_count > 0)
  );
END;
$$;

COMMENT ON FUNCTION public.calculate_operating_financials_summary(TIMESTAMPTZ, TIMESTAMPTZ) IS
  'حساب وتلخيص الأرباح التشغيلية والتكاليف المباشرة للطلبات مركزياً وفق معادلة المرحلة الخامسة المعتمدة.';
