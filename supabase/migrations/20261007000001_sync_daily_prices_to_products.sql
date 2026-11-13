-- ============================================================
-- 20261007000001_sync_daily_prices_to_products.sql
-- المزامنة التلقائية اللحظية لأسعار البيع في المتجر مع أسعار السوق الصباحية (JIT)
-- ============================================================

-- 1. دالة المشغّل (Trigger Function) لتحديث سعر البيع في جدول المنتجات تلقائياً
CREATE OR REPLACE FUNCTION public.sync_daily_price_to_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- عند إدراج أو تعديل أي سجل في daily_prices، يتم تحديث سعر البيع في products فوراً
  IF NEW.selling_price IS NOT NULL AND NEW.selling_price > 0 THEN
    UPDATE public.products
    SET 
      price = NEW.selling_price,
      updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. إنشاء المشغّل على جدول أسعار السوق اليومية (daily_prices)
DROP TRIGGER IF EXISTS trg_sync_daily_prices_to_products ON public.daily_prices;
CREATE TRIGGER trg_sync_daily_prices_to_products
AFTER INSERT OR UPDATE ON public.daily_prices
FOR EACH ROW
EXECUTE FUNCTION public.sync_daily_price_to_products();

-- 3. تحديث دالة RPC: update_daily_price_secure لمزامنة جدول المنتجات أيضاً
CREATE OR REPLACE FUNCTION public.update_daily_price_secure(
  p_product_id INT,
  p_purchase_price NUMERIC,
  p_margin_percentage NUMERIC,
  p_supplier_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selling_price NUMERIC;
  v_yesterday_price NUMERIC;
  v_trend TEXT := 'stable';
BEGIN
  -- 1. حساب سعر البيع تلقائياً
  v_selling_price := ROUND(p_purchase_price * (1 + p_margin_percentage / 100), 2);

  -- 2. مقارنة سعر اليوم بسعر الأمس لمعرفة مؤشر الصعود أو الهبوط
  SELECT purchase_price INTO v_yesterday_price
  FROM public.daily_prices
  WHERE product_id = p_product_id 
    AND recorded_date < CURRENT_DATE
  ORDER BY recorded_date DESC
  LIMIT 1;

  IF v_yesterday_price IS NOT NULL THEN
    IF p_purchase_price > v_yesterday_price THEN
      v_trend := 'up';
    ELSIF p_purchase_price < v_yesterday_price THEN
      v_trend := 'down';
    END IF;
  END IF;

  -- 3. إدراج أو تحديث سجل اليوم في جدول daily_prices
  INSERT INTO public.daily_prices (
    product_id,
    supplier_id,
    purchase_price,
    margin_percentage,
    recorded_date,
    updated_at
  )
  VALUES (
    p_product_id,
    p_supplier_id,
    p_purchase_price,
    p_margin_percentage,
    CURRENT_DATE,
    NOW()
  )
  ON CONFLICT (product_id, recorded_date)
  DO UPDATE SET
    supplier_id = EXCLUDED.supplier_id,
    purchase_price = EXCLUDED.purchase_price,
    margin_percentage = EXCLUDED.margin_percentage,
    updated_at = NOW();

  -- 4. تحديث سعر البيع فوراً في جدول المنتجات الرئيسي لمتجر العملاء
  UPDATE public.products
  SET 
    price = v_selling_price,
    updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'purchase_price', p_purchase_price,
    'margin_percentage', p_margin_percentage,
    'selling_price', v_selling_price,
    'trend', v_trend,
    'message', 'تم تحديث سعر الشراء والبيع ومزامنتهما مع متجر العملاء بنجاح'
  );
END;
$$;

-- 4. تفعيل البث اللحظي (Realtime) لجدولي المنتجات والأسعار اليومية
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN
    -- الجدول مضاف مسبقاً
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_prices;
  EXCEPTION WHEN duplicate_object THEN
    -- الجدول مضاف مسبقاً
    NULL;
  END;
END $$;
