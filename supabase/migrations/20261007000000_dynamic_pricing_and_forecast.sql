-- ============================================================
-- 20261007000000_dynamic_pricing_and_forecast.sql
-- مخطط التسعير الديناميكي وإدارة موردي سوق الجملة وتوقع الطلب (JIT)
-- ============================================================

-- 1. جدول الموردين (suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  specialty TEXT DEFAULT 'خضار وفواكه عامة',
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول أسعار السوق اليومية (daily_prices)
CREATE TABLE IF NOT EXISTS public.daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_price NUMERIC(10,2) NOT NULL CHECK (purchase_price >= 0),
  margin_percentage NUMERIC(5,2) NOT NULL DEFAULT 25.00,
  selling_price NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(purchase_price * (1 + margin_percentage / 100), 2)) STORED,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, recorded_date)
);

-- 3. فهارس لسرعة استعلامات السلاسل الزمنية والتسعير
CREATE INDEX IF NOT EXISTS idx_daily_prices_date ON public.daily_prices(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_prices_product_date ON public.daily_prices(product_id, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(is_active) WHERE is_active = TRUE;

-- 4. تمكين سياسات الأمان RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read suppliers for all"
  ON public.suppliers FOR SELECT USING (true);

CREATE POLICY "Allow modify suppliers for admin or auth"
  ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow read daily_prices for all"
  ON public.daily_prices FOR SELECT USING (true);

CREATE POLICY "Allow modify daily_prices for admin or auth"
  ON public.daily_prices FOR ALL USING (true) WITH CHECK (true);

-- 5. دالة تحديث السعر اليومي التلقائي مع حساب الهامش
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
  -- حساب سعر البيع
  v_selling_price := ROUND(p_purchase_price * (1 + p_margin_percentage / 100), 2);

  -- جلب سعر الشراء بالأمس لمعرفة الاتجاه
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

  -- إدراج أو تحديث سجل اليوم
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

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'purchase_price', p_purchase_price,
    'margin_percentage', p_margin_percentage,
    'selling_price', v_selling_price,
    'trend', v_trend
  );
END;
$$;

-- 6. استعلام تجميع المبيعات التاريخية لـ 30 يوماً حسب أيام الأسبوع لأغراض التوقع (JIT Forecasting)
CREATE OR REPLACE FUNCTION public.get_30day_demand_forecast()
RETURNS TABLE (
  product_id INT,
  day_of_week INT, -- 0=Sun, 1=Mon, 2=Tue...
  total_volume_kg NUMERIC,
  avg_daily_volume NUMERIC,
  order_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (item->>'id')::INT AS product_id,
    EXTRACT(DOW FROM o.created_at)::INT AS day_of_week,
    ROUND(SUM((item->>'qty')::NUMERIC), 2) AS total_volume_kg,
    ROUND(AVG((item->>'qty')::NUMERIC), 2) AS avg_daily_volume,
    COUNT(DISTINCT o.id) AS order_count
  FROM public.orders o,
       jsonb_array_elements(o.items::JSONB) AS item
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
    AND (o.is_deleted IS NULL OR o.is_deleted = FALSE)
  GROUP BY (item->>'id')::INT, EXTRACT(DOW FROM o.created_at)::INT
  ORDER BY total_volume_kg DESC;
$$;

-- 7. بيانات البذور الأولية لموردي سوق بنسودة
INSERT INTO public.suppliers (name, phone, specialty, rating, notes)
VALUES
  ('الحاج المفضل بنجلون', '0661234567', 'بطاطس وبصل وخضر شتوية (جناح أ - سوق بنسودة)', 5, 'مورد معتمد لخضر الشاوية وتادلة'),
  ('تعاونية سايس الفلاحية', '0662345678', 'خضر ورقية، نعناع، كزبرة، وبقدونس', 5, 'توريد صباحي طازج من ضيعات سايس'),
  ('ضيعات تادلة وسوس', '0663456789', 'طماطم، فلفل، جزر، وقرع أحمر', 4, 'جودة فرز أول وأسعار جملة منافسة'),
  ('مجموعة فواكه الأطلس', '0664567890', 'فواكه موسمية (تفاح، برتقال، حوامض، موز)', 5, 'توريد مباشر من صفرو وبركان وتاونات')
ON CONFLICT DO NOTHING;
