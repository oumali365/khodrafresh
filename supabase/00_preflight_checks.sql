-- ==============================================================================
-- 🔍 00_preflight_checks.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: استعلامات تشخيصية قبلية لفحص حالة قاعدة البيانات قبل تطبيق الترحيلات
-- ==============================================================================

-- 1️⃣ فحص إجمالي عدد المنتجات وتوزيعها حسب التصنيف
SELECT 
  category, 
  COUNT(*) AS total_products,
  COUNT(*) FILTER (WHERE type = 'weight') AS weight_products,
  COUNT(*) FILTER (WHERE type = 'unit') AS unit_products
FROM public.products
GROUP BY category
ORDER BY total_products DESC;

-- 2️⃣ فحص نوع عمود المخزون الحالي في جدول products
SELECT 
  table_name, 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products' 
  AND column_name = 'stock';

-- 3️⃣ فحص هل يوجد أي منتج بمخزون سالب أو قيمة NULL
SELECT 
  id, name, category, stock, active, is_available
FROM public.products
WHERE stock < 0 OR stock IS NULL;

-- 4️⃣ فحص تفصيلي لحالة active و is_available والمخزون
SELECT 
  COUNT(*) FILTER (WHERE active = FALSE) AS total_inactive,
  COUNT(*) FILTER (WHERE is_available = FALSE) AS total_unavailable,
  COUNT(*) FILTER (WHERE active = TRUE AND stock = 0) AS active_with_zero_stock,
  COUNT(*) FILTER (WHERE active = TRUE AND stock > 0) AS active_with_positive_stock,
  COUNT(*) FILTER (WHERE active = FALSE AND stock > 0) AS inactive_with_positive_stock
FROM public.products;

-- 5️⃣ فحص عدد الطلبات الإجمالية والطلبات النشطة والملغاة
SELECT 
  status,
  COUNT(*) AS order_count,
  MIN(created_at) AS earliest_order,
  MAX(created_at) AS latest_order
FROM public.orders
WHERE (is_deleted IS NULL OR is_deleted = FALSE)
GROUP BY status;

-- 6️⃣ فحص هل جدول inventory_ledger أو عمود inventory_processed موجودان مسبقاً
SELECT 
  table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'inventory_ledger'
  ) AS ledger_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'inventory_processed'
  ) AS processed_column_exists;

-- 7️⃣ قائمة الدوال والمشغّلات الحالية ذات الصلة بالطلبات والمنتجات
SELECT 
  routine_name, 
  routine_type, 
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'process_order_inventory_deduction',
    'restore_order_inventory',
    'submit_order_atomic',
    'sync_product_active_and_available',
    'check_order_security_rate_limit'
  );
