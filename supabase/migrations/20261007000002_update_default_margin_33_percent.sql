-- ============================================================
-- 20261007000002_update_default_margin_33_percent.sql
-- رفع هامش الربح الافتراضي إلى 33% لضمان تغطية مصاريف التشغيل والنقل واللوجستيك والإتلاف
-- ============================================================

-- 1. تعديل القيمة الافتراضية لعمود هامش الربح في جدول أسعار اليوم
ALTER TABLE public.daily_prices 
  ALTER COLUMN margin_percentage SET DEFAULT 33.00;

-- 2. ترقية السجلات السابقة ذات الهامش القديم (25%) إلى الهامش الآمن الجديد (33%)
UPDATE public.daily_prices
SET 
  margin_percentage = 33.00,
  updated_at = NOW()
WHERE margin_percentage = 25.00 OR margin_percentage IS NULL;

-- 3. تحديث أسعار البيع في جدول المنتجات الرئيسي لتعكس الهامش الجديد (33%)
UPDATE public.products p
SET 
  price = dp.selling_price,
  updated_at = NOW()
FROM public.daily_prices dp
WHERE p.id = dp.product_id
  AND dp.recorded_date = CURRENT_DATE;

-- 4. تحديث دالة RPC لتكون القيمة الافتراضية للهامش هي 33%
CREATE OR REPLACE FUNCTION public.update_daily_price_secure(
  p_product_id INT,
  p_purchase_price NUMERIC,
  p_margin_percentage NUMERIC DEFAULT 33.00,
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
  v_margin NUMERIC;
BEGIN
  -- استخدام 33% في حال تم تمرير قيمة فارغة أو صفرية أقل من المقبول
  v_margin := COALESCE(NULLIF(p_margin_percentage, 0), 33.00);

  -- 1. حساب سعر البيع تلقائياً
  v_selling_price := ROUND(p_purchase_price * (1 + v_margin / 100), 2);

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
    v_margin,
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
    'margin_percentage', v_margin,
    'selling_price', v_selling_price,
    'trend', v_trend,
    'message', 'تم اعتماد هامش 33% ومزامنة سعر البيع مع المتجر بنجاح'
  );
END;
$$;
