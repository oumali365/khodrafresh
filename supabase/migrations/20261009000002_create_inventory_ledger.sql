-- ==============================================================================
-- 📋 20261009000002_create_inventory_ledger.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: إنشاء جدول سجل حركات المخزون للتدقيق المحاسبي الصارم وتتبع التغييرات
-- مع فهارس فريدة جزئية لمنع الخصم أو الإرجاع المزدوج (Strict Idempotency)
-- ==============================================================================

-- 1. إنشاء جدول سجل حركات المخزون
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  quantity_delta NUMERIC(10,2) NOT NULL, -- سالبة عند الخصم (-1.50) وموجبة عند الإرجاع (+1.50)
  movement_type TEXT NOT NULL CHECK (
    movement_type IN ('order_deduct', 'order_restore', 'manual_adjustment', 'morning_stockin')
  ),
  stock_before NUMERIC(10,2) NOT NULL,
  stock_after NUMERIC(10,2) NOT NULL,
  reason TEXT,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. فهارس تسريع الاستعلامات والتقارير
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_product 
  ON public.inventory_ledger (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_order 
  ON public.inventory_ledger (order_id);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_created_at 
  ON public.inventory_ledger (created_at DESC);

-- 3. 🔒 فهارس فريدة جزئية لمنع التكرار نهائياً (Idempotency Enforcers)
-- يمنع خصم نفس المنتج لنفس الطلب أكثر من مرة واحدة
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_ledger_deduct_unique
  ON public.inventory_ledger (order_id, product_id, movement_type)
  WHERE movement_type = 'order_deduct';

-- يمنع استرجاع نفس المنتج لنفس الطلب أكثر من مرة واحدة
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_ledger_restore_unique
  ON public.inventory_ledger (order_id, product_id, movement_type)
  WHERE movement_type = 'order_restore';

-- 4. تفعيل سياسات الأمان RLS
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read inventory ledger for authenticated and admin" ON public.inventory_ledger;
CREATE POLICY "Allow read inventory ledger for authenticated and admin" 
  ON public.inventory_ledger FOR SELECT USING (true);

-- توثيق الجدول
COMMENT ON TABLE public.inventory_ledger IS 
  'سجل تدقيق كامل لكافة حركات المخزون مع الكميات السابقة واللاحقة والفهارس الفريدة لمنع التكرار.';

-- ==============================================================================
-- 🔄 كود التراجع في حال الفشل (Rollback Script)
-- ==============================================================================
/*
BEGIN;
DROP TABLE IF EXISTS public.inventory_ledger CASCADE;
COMMIT;
*/
