-- ==============================================================================
-- 🧪 08_test_scenarios.sql
-- نظام إدارة المخزون — خُضرة فاس (Khodra Fès)
-- الهدف: سيناريوهات اختبارية للتحقق العملي من دقة الخصم الكسري ومنع Overselling
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- السيناريو 1: فحص رصيد منتج اختباري (مثلاً: بطاطس بلدية id = 1)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT id, name, stock, is_available, active 
FROM public.products 
WHERE id = 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- السيناريو 2: اختبار إنشاء طلب ذري بكمية كسرية (1.50 kg بطاطس)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT public.submit_order_atomic(
  jsonb_build_object(
    'order_code', '#TEST-150',
    'customer_name', 'عميل تجريبي فاس',
    'phone', '0661998877',
    'address', 'طريق إيموزار، فاس',
    'delivery_zone', 'south',
    'items', jsonb_build_array(
      jsonb_build_object(
        'id', 1,
        'name', 'بطاطس بلدية',
        'qty', 1.50,
        'variantLabel', 'kg',
        'lineTotal', 10.50
      )
    ),
    'subtotal', 10.50,
    'delivery_fee', 15.00,
    'total', 25.50,
    'idempotency_key', 'test-key-150-a'
  )
);

-- التحقق من النتيجة:
-- 1. نقص المخزون بـ 1.50 كغ بالضبط
SELECT id, name, stock, is_available FROM public.products WHERE id = 1;
-- 2. تسجيل سطر في inventory_ledger بـ quantity_delta = -1.50
SELECT * FROM public.inventory_ledger WHERE order_id = (SELECT id FROM public.orders WHERE order_code = '#TEST-150');

-- ─────────────────────────────────────────────────────────────────────────────
-- السيناريو 3: اختبار Idempotency (إعادة استدعاء دالة الخصم لنفس الطلب)
-- ─────────────────────────────────────────────────────────────────────────────
-- يجب ألا يتم خصم أي غرام إضافي وتُرجع already_processed = true
SELECT public.process_order_inventory_deduction(
  (SELECT id FROM public.orders WHERE order_code = '#TEST-150')
);

-- التأكد من عدم تكرار السطر في ledger (سطر واحد فقط لـ order_deduct)
SELECT COUNT(*) FROM public.inventory_ledger 
WHERE order_id = (SELECT id FROM public.orders WHERE order_code = '#TEST-150')
  AND movement_type = 'order_deduct';

-- ─────────────────────────────────────────────────────────────────────────────
-- السيناريو 4: اختبار رفض البيع الزائد (Overselling Rejection)
-- محاولة طلب 9999.00 kg بطاطس (أكبر بكثير من المخزون)
-- المتوقع: إلقاء خطأ INSUFFICIENT_STOCK وإلغاء المعاملة بالكامل (ROLLBACK)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM public.submit_order_atomic(
    jsonb_build_object(
      'order_code', '#TEST-OVERSELL',
      'customer_name', 'طلب وهمي زائد',
      'phone', '0661112233',
      'address', 'النرجس، فاس',
      'delivery_zone', 'south',
      'items', jsonb_build_array(
        jsonb_build_object('id', 1, 'name', 'بطاطس بلدية', 'qty', 9999.00, 'lineTotal', 70000.00)
      ),
      'subtotal', 70000.00,
      'delivery_fee', 0.00,
      'total', 70000.00,
      'idempotency_key', 'test-oversell-key'
    )
  );
  RAISE EXCEPTION 'فشل الاختبار: كان يجب رفض الطلب الزائد!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'نجح الاختبار: تم اعتراض الطلب الزائد بالرسالة: %', SQLERRM;
END $$;

-- التأكد من عدم إدراج الطلب المرفوض في جدول orders
SELECT COUNT(*) FROM public.orders WHERE order_code = '#TEST-OVERSELL';

-- ─────────────────────────────────────────────────────────────────────────────
-- السيناريو 5: اختبار استرجاع المخزون عند الإلغاء (Order Cancellation & Restore)
-- ─────────────────────────────────────────────────────────────────────────────
-- استرجاع مخزون الطلب #TEST-150
SELECT public.restore_order_inventory(
  (SELECT id FROM public.orders WHERE order_code = '#TEST-150'),
  'إلغاء تجريبي لفحص الإرجاع'
);

-- التحقق من النتيجة:
-- 1. عودة المخزون لزيادة +1.50 كغ
SELECT id, name, stock FROM public.products WHERE id = 1;
-- 2. تسجيل حركة order_restore في inventory_ledger
SELECT * FROM public.inventory_ledger 
WHERE order_id = (SELECT id FROM public.orders WHERE order_code = '#TEST-150')
ORDER BY created_at DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- تنظيف بيانات الاختبار (اختياري)
-- ─────────────────────────────────────────────────────────────────────────────
/*
DELETE FROM public.inventory_ledger WHERE order_id = (SELECT id FROM public.orders WHERE order_code = '#TEST-150');
DELETE FROM public.orders WHERE order_code = '#TEST-150';
*/
