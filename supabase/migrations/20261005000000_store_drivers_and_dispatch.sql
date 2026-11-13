-- ==============================================================================
-- 🚚 20261005000000_store_drivers_and_dispatch.sql
-- فريق التوصيل الداخلي وإدارة المسارات الذكية لمتجر خُضرة - فاس
-- ==============================================================================

-- 1. التأكد من وجود مفتاح store_drivers في جدول إعدادات المتجر store_settings
INSERT INTO public.store_settings (key, value, description, updated_at)
VALUES (
  'store_drivers',
  '[
    {"id":"drv-1","name":"يوسف العلمي","phone":"0661234567","vehicleType":"moto","zonePreference":"north","status":"available","commissionPerOrder":25,"vehiclePlate":"12-A-3456","notes":"خبير بشوارع فاس وشارع الجيش الملكي وطريق مكناس","activeOrdersCount":0,"totalDeliveredCount":142},
    {"id":"drv-2","name":"رشيد بنجلون","phone":"0672345678","vehicleType":"moto","zonePreference":"central","status":"available","commissionPerOrder":25,"vehiclePlate":"18-B-7890","notes":"متخصص بأحياء الأطلس، الدكارات، والمدينة الجديدة","activeOrdersCount":0,"totalDeliveredCount":98},
    {"id":"drv-3","name":"طارق الفاسي","phone":"0663456789","vehicleType":"car","zonePreference":"south","status":"on_delivery","commissionPerOrder":30,"vehiclePlate":"22-C-1122","notes":"سيارة مجهزة لصناديق الخضار العائلية الكبيرة","activeOrdersCount":2,"totalDeliveredCount":215},
    {"id":"drv-4","name":"أمين الوزاني","phone":"0664567890","vehicleType":"van","zonePreference":"all","status":"available","commissionPerOrder":35,"vehiclePlate":"15-D-9988","notes":"فان نقل مبرد للجولات الكبرى والطلبات المجمعة","activeOrdersCount":0,"totalDeliveredCount":310}
  ]',
  'فريق التوصيل الداخلي لمتجر خُضرة مع تفاصيل المركبات والمناطق المفضلة',
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- 2. جدول منفصل لسائقي المتجر في حال الرغبة في التوسع المستقبلي
CREATE TABLE IF NOT EXISTS public.store_drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'moto' CHECK (vehicle_type IN ('moto', 'car', 'van', 'scooter', 'bicycle')),
  zone_preference TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_delivery', 'off_duty')),
  commission_per_order NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  vehicle_plate TEXT,
  notes TEXT,
  active_orders_count INTEGER NOT NULL DEFAULT 0,
  total_delivered_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.store_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of active drivers"
  ON public.store_drivers FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to drivers"
  ON public.store_drivers FOR ALL
  USING (true)
  WITH CHECK (true);
