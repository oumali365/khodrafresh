-- ============================================================
-- 20261007000003_add_is_available_to_products.sql
-- إضافة ومزامنة حقل حالة التوفر المنطقية (is_available & active) في جدول المنتجات
-- ============================================================

-- 1. إضافة عمود is_available إن لم يكن موجوداً
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- 2. مزامنة القيم الحالية مع حقل active
UPDATE public.products
SET is_available = COALESCE(active, TRUE)
WHERE is_available IS NULL;

-- 3. دالة ومُشغّل التزامن التلقائي المتبادل بين active و is_available
CREATE OR REPLACE FUNCTION public.sync_product_active_and_available()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- إذا تم تحديث is_available يتم تحديث active تلقائياً
  IF NEW.is_available IS NOT NULL AND (OLD.is_available IS DISTINCT FROM NEW.is_available) THEN
    NEW.active := NEW.is_available;
  -- وإذا تم تحديث active يتم تحديث is_available تلقائياً
  ELSIF NEW.active IS NOT NULL AND (OLD.active IS DISTINCT FROM NEW.active) THEN
    NEW.is_available := NEW.active;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_active_and_available ON public.products;
CREATE TRIGGER trg_sync_product_active_and_available
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_active_and_available();
