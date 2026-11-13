-- ==============================================================================
-- ⚙️ 20261009000007_update_trigger_sync_active.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: فك الارتباط المتبادل بين active و is_available
-- القاعدة:
--   - is_available: حالة تشغيلية ديناميكية تتبع رصيد المخزون (stock > 0).
--   - active: قرار إداري خاص بالمدير فقط ولا يتم تعطيله تلقائياً عند نفاد الكمية.
-- ==============================================================================

-- 1. تحديث دالة المشغّل لربط is_available بالمخزون دون التعديل على active
CREATE OR REPLACE FUNCTION public.sync_product_active_and_available()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- يتم تحديث حالة التوفر is_available تلقائياً بناءً على رصيد المخزون الكسري
  IF NEW.stock IS NOT NULL THEN
    NEW.is_available := (NEW.stock > 0);
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- 2. إعادة إنشاء المشغّل على جدول products ليعمل فقط عند تعديل المخزون
DROP TRIGGER IF EXISTS trg_sync_product_active_and_available ON public.products;

CREATE TRIGGER trg_sync_product_active_and_available
BEFORE INSERT OR UPDATE OF stock ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_active_and_available();

COMMENT ON FUNCTION public.sync_product_active_and_available() IS 
  'تزامن حالة is_available مع رصيد المخزون (stock > 0) دون المساس بقرار المدير في حقل active.';

-- ==============================================================================
-- 🔄 كود التراجع في حال الفشل (Rollback Script)
-- ==============================================================================
/*
BEGIN;
DROP TRIGGER IF EXISTS trg_sync_product_active_and_available ON public.products;
CREATE OR REPLACE FUNCTION public.sync_product_active_and_available()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_available IS NOT NULL AND (OLD.is_available IS DISTINCT FROM NEW.is_available) THEN
    NEW.active := NEW.is_available;
  ELSIF NEW.active IS NOT NULL AND (OLD.active IS DISTINCT FROM NEW.active) THEN
    NEW.is_available := NEW.active;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sync_product_active_and_available
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_active_and_available();
COMMIT;
*/
