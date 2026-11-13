-- ============================================================
-- 20261006000000_fast_couriers.sql
-- جدول إدارة كباتن تطبيقات التوصيل السريع (inDrive, Glovo, Yassir, Careem)
-- ============================================================

CREATE TABLE IF NOT EXISTS fast_app_couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  app TEXT NOT NULL CHECK (app IN ('indrive','glovo','yassir','careem','other')),
  app_name_custom TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'moto',
  zone TEXT NOT NULL DEFAULT 'all',
  typical_fare NUMERIC(10,2) DEFAULT 20.00,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس لتسريع استعلامات الكباتن النشطين
CREATE INDEX IF NOT EXISTS idx_fast_couriers_active ON fast_app_couriers(is_active) WHERE is_active = TRUE;

-- سياسات الأمان RLS (Row Level Security)
ALTER TABLE fast_app_couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active fast couriers"
  ON fast_app_couriers FOR SELECT
  USING (true);

CREATE POLICY "Allow full access for authenticated and service role"
  ON fast_app_couriers FOR ALL
  USING (true)
  WITH CHECK (true);
