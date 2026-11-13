-- ==============================================================================
-- 📦 20261009000001_migrate_products_stock_to_numeric.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: تحويل نوع مخزون المنتجات (products.stock) من INTEGER إلى NUMERIC(10,2)
-- لدعم الأوزان الكسرية بدقة (مثل 0.5 كغ، 1.5 كغ، 2.5 كغ) دون فقدان البيانات
-- ==============================================================================

-- 1. معالجة أي قيم سالبة أو فارغة مسبقاً قبل الترحيل لضمان سلامة البيانات
UPDATE public.products 
SET stock = 0 
WHERE stock < 0 OR stock IS NULL;

-- 2. تحويل نوع العمود بأمان مع الحفاظ التام على قيم المخزون الحالية للـ 125 منتجاً
ALTER TABLE public.products 
  ALTER COLUMN stock TYPE NUMERIC(10,2) 
  USING COALESCE(stock, 0)::NUMERIC(10,2);

-- 3. تعيين القيمة الافتراضية بدقة كسرية
ALTER TABLE public.products 
  ALTER COLUMN stock SET DEFAULT 0.00;

-- 4. إضافة قيد التحقق الصارم لضمان عدم قبول أي مخزون سالب
ALTER TABLE public.products 
  DROP CONSTRAINT IF EXISTS chk_products_stock_non_negative;

ALTER TABLE public.products 
  ADD CONSTRAINT chk_products_stock_non_negative 
  CHECK (stock >= 0);

-- 5. توثيق العمود في قاموس بيانات PostgreSQL
COMMENT ON COLUMN public.products.stock IS 
  'المخزون الفعلي للمنتج يدعم الكسور العشرية بدقة NUMERIC(10,2) (مثل 12.50 كغ أو 5 وحدات). Source of Truth.';

-- ==============================================================================
-- 🔄 كود التراجع في حال الفشل (Rollback Script)
-- ==============================================================================
/*
BEGIN;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_products_stock_non_negative;
ALTER TABLE public.products ALTER COLUMN stock TYPE INTEGER USING ROUND(stock)::INTEGER;
ALTER TABLE public.products ALTER COLUMN stock SET DEFAULT 0;
COMMIT;
*/
