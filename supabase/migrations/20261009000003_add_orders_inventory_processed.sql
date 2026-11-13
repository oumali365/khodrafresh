-- ==============================================================================
-- 🏷️ 20261009000003_add_orders_inventory_processed.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: إضافة مؤشر معالجة المخزون (inventory_processed) لجدول الطلبات (orders)
-- لضمان عدم خصم الطلبات القديمة بأثر رجعي، وضمان Idempotency التام للطلبات الجديدة
-- ==============================================================================

-- 1. إضافة العمود مع القيمة الافتراضية FALSE
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS inventory_processed BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. فهرس لتسريع فرز الطلبات المعالجة وغير المعالجة
CREATE INDEX IF NOT EXISTS idx_orders_inventory_processed 
  ON public.orders (inventory_processed);

-- 3. توثيق العمود في قاموس بيانات PostgreSQL
COMMENT ON COLUMN public.orders.inventory_processed IS 
  'مؤشر يدل هل خُصم مخزون هذا الطلب بالفعل أم لا. الطلبات القديمة تأخذ FALSE ولن تمس، والطلبات المعالجة تأخذ TRUE لمنع الخصم المزدوج.';

-- ==============================================================================
-- 🔄 كود التراجع في حال الفشل (Rollback Script)
-- ==============================================================================
/*
BEGIN;
DROP INDEX IF EXISTS public.idx_orders_inventory_processed;
ALTER TABLE public.orders DROP COLUMN IF EXISTS inventory_processed;
COMMIT;
*/
