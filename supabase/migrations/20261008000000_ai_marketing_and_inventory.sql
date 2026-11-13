-- ============================================================
-- 20261008000000_ai_marketing_and_inventory.sql
-- مخطط نظام التسويق بالذكاء الاصطناعي وإدارة المخزون والحملات
-- منصة خُضرة — فاس (Khodra Fès)
-- ============================================================

-- 1️⃣ جدول حملات التسويق (marketing_campaigns)
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  target_audience TEXT,
  selected_products JSONB DEFAULT '[]'::jsonb,
  strategy TEXT,
  offer_details TEXT,
  campaign_score INT DEFAULT 85 CHECK (campaign_score >= 0 AND campaign_score <= 100),
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'archived')),
  channels JSONB DEFAULT '["whatsapp", "instagram"]'::jsonb,
  duration_days INT DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2️⃣ جدول منشورات ومحتوى الحملة (marketing_posts)
CREATE TABLE IF NOT EXISTS public.marketing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'instagram', 'facebook', 'story', 'product_desc')),
  headline TEXT,
  caption TEXT NOT NULL,
  cta TEXT,
  hashtags JSONB DEFAULT '[]'::jsonb,
  suggested_time TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'queued', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3️⃣ جدول قوالب التسويق المعتمدة (marketing_templates)
CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'fresh',
  emoji TEXT DEFAULT '🌿',
  badge TEXT,
  description TEXT,
  template_body TEXT NOT NULL,
  default_score INT DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4️⃣ جدول تحليلات القوالب بالذكاء الاصطناعي (ai_template_analyses)
CREATE TABLE IF NOT EXISTS public.ai_template_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT,
  template_text TEXT NOT NULL,
  marketing_score INT NOT NULL CHECK (marketing_score >= 0 AND marketing_score <= 100),
  criteria_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  enhanced_version TEXT,
  model_used TEXT DEFAULT 'gemini-3.8-flash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5️⃣ جدول سجل عمليات التوليد بالذكاء الاصطناعي (ai_generation_runs)
CREATE TABLE IF NOT EXISTS public.ai_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  model TEXT DEFAULT 'gemini-3.8-flash',
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'fallback')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6️⃣ جدول طابور النشر المعتمد وضوابط الأمان (marketing_publish_queue)
CREATE TABLE IF NOT EXISTS public.marketing_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.marketing_posts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('queued', 'approved', 'processing', 'published', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  retry_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7️⃣ جدول سجل التدقيق للعمليات الحساسة (marketing_audit_logs)
CREATE TABLE IF NOT EXISTS public.marketing_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  actor_role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8️⃣ فهارس الأداء السريع
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created ON public.marketing_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_campaign ON public.marketing_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_runs_created ON public.ai_generation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_status ON public.marketing_publish_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_marketing_audit_created ON public.marketing_audit_logs(created_at DESC);

-- 9️⃣ تمكين سياسات الأمان RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_template_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_publish_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read marketing templates" ON public.marketing_templates FOR SELECT USING (true);
CREATE POLICY "Allow admin all marketing campaigns" ON public.marketing_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin all marketing posts" ON public.marketing_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin all template analyses" ON public.ai_template_analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin all ai runs" ON public.ai_generation_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin all publish queue" ON public.marketing_publish_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin all audit logs" ON public.marketing_audit_logs FOR ALL USING (true) WITH CHECK (true);
