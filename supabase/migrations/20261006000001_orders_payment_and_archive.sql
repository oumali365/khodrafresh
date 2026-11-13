-- ============================================================
-- 20261006000001_orders_payment_and_archive.sql
-- إضافة أعمدة تأكيد الدفع النقدي والأرشفة لجدول الطلبات (orders)
-- ============================================================

-- 1. إضافة الأعمدة في حال لم تكن موجودة
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. إنشاء فهارس لسرعة تصفية الطلبات المسلمة والمؤرشفة
CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders(is_paid);
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(is_archived);

-- 3. دالة RPC لتحديث حالة الدفع بشكل آمن
CREATE OR REPLACE FUNCTION set_order_payment(p_order_id TEXT, p_is_paid BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET 
    is_paid = p_is_paid,
    paid_at = CASE WHEN p_is_paid THEN NOW() ELSE NULL END
  WHERE id::TEXT = p_order_id OR order_code = p_order_id;
  RETURN FOUND;
END;
$$;

-- 4. دالة RPC لتحديث حالة الأرشفة بشكل آمن
CREATE OR REPLACE FUNCTION set_order_archive(p_order_id TEXT, p_is_archived BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET 
    is_archived = p_is_archived,
    archived_at = CASE WHEN p_is_archived THEN NOW() ELSE NULL END
  WHERE id::TEXT = p_order_id OR order_code = p_order_id;
  RETURN FOUND;
END;
$$;
