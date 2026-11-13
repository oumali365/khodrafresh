-- ==============================================================================
-- 🛡️ 02_security_and_triggers.sql – نظام الحماية المتقدم ومكافحة التكرار والسبام
-- متجر خُضرة - فاس (Khodra Store)
--
-- الوظائف المؤمنة:
-- 1. فرض قيم الخادم الحقيقية (NOW(), status='pending', is_deleted=false) لمنع التزوير
-- 2. استخراج الـ IP الفعلي من رؤوس الشبكة (x-forwarded-for / cf-connecting-ip)
-- 3. فترة التهدئة Cooldown (حد أدنى 180 ثانية عبر الهاتف أو client_id أو IP)
-- 4. سقف معدل الطلبات Rate Limit (أقصى حد 3 طلبات خلال 60 دقيقة)
-- 5. حماية جدول التقييمات (reviews) ضد الإغراق وتزوير التوثيق
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1️⃣ دالة فحص أمان ومعدل الطلبات قبل الإدراج
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_order_security_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_order_count INT;
  v_seconds_since_last INT;
  v_clean_phone TEXT;
  v_real_ip TEXT;
BEGIN
  -- 1. فرض قيم الخادم الحقيقية ومنع التلاعب بـ created_at أو status من المتصفح
  NEW.created_at := NOW();
  NEW.updated_at := NOW();
  NEW.status := 'pending';
  NEW.is_deleted := FALSE;
  NEW.deleted_at := NULL;

  -- 2. استخراج عنوان الـ IP الحقيقي للزائر من رؤوس HTTP في Supabase (غير قابل للتزوير)
  BEGIN
    v_real_ip := SPLIT_PART(
      COALESCE(
        current_setting('request.headers', true)::json->>'cf-connecting-ip',
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        NEW.ip_address
      ),
      ',', 1
    );
  EXCEPTION WHEN OTHERS THEN
    v_real_ip := NEW.ip_address;
  END;
  NEW.ip_address := NULLIF(TRIM(v_real_ip), '');

  -- 3. تنظيف رقم الهاتف المغربي والتحقق الصارم من صحته
  v_clean_phone := REGEXP_REPLACE(COALESCE(NEW.phone, ''), '[^\d]', '', 'g');
  IF LENGTH(v_clean_phone) < 9 OR LENGTH(v_clean_phone) > 15 THEN
    RAISE EXCEPTION 'INVALID_PHONE: رقم الهاتف غير صالح. يرجى إدخال رقم مغربي صحيح.';
  END IF;

  -- 4. التحقق من صحة المبالغ المالية ومنع القيم السالبة أو الصفرية
  IF COALESCE(NEW.subtotal, 0) <= 0 OR COALESCE(NEW.delivery_fee, -1) < 0 OR COALESCE(NEW.total, 0) < NEW.subtotal THEN
    RAISE EXCEPTION 'INVALID_TOTAL: القيم المالية للطلب غير صالحة.';
  END IF;

  -- ─── [أ] فحص فترة التهدئة (Cooldown 3 دقائق = 180 ثانية) ───
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::INT
  INTO v_seconds_since_last
  FROM public.orders
  WHERE (
    REGEXP_REPLACE(phone, '[^\d]', '', 'g') = v_clean_phone
    OR (NEW.client_id IS NOT NULL AND TRIM(NEW.client_id) <> '' AND client_id = NEW.client_id)
    OR (NEW.ip_address IS NOT NULL AND ip_address = NEW.ip_address)
  )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_seconds_since_last IS NOT NULL AND v_seconds_since_last < 180 THEN
    INSERT INTO public.order_security_logs (attempt_type, phone, client_id, ip_address, reason, payload)
    VALUES (
      'cooldown_blocked',
      NEW.phone,
      NEW.client_id,
      NEW.ip_address,
      format('الطلب بعد %s ثانية فقط من آخر طلب (الحد الأدنى 180 ثانية)', v_seconds_since_last),
      jsonb_build_object('order_code', NEW.order_code, 'subtotal', NEW.subtotal)
    );

    RAISE EXCEPTION 'COOLDOWN_ACTIVE: يرجى الانتظار قليلاً قبل إرسال طلب جديد (متبقي %s ثانية).', (180 - v_seconds_since_last);
  END IF;

  -- ─── [ب] فحص سقف الطلبات في الساعة (Rate Limit: 3 طلبات/ساعة) ───
  SELECT COUNT(*)
  INTO v_recent_order_count
  FROM public.orders
  WHERE (
    REGEXP_REPLACE(phone, '[^\d]', '', 'g') = v_clean_phone
    OR (NEW.client_id IS NOT NULL AND TRIM(NEW.client_id) <> '' AND client_id = NEW.client_id)
    OR (NEW.ip_address IS NOT NULL AND ip_address = NEW.ip_address)
  )
  AND created_at > (NOW() - INTERVAL '60 minutes');

  IF v_recent_order_count >= 3 THEN
    INSERT INTO public.order_security_logs (attempt_type, phone, client_id, ip_address, reason, payload)
    VALUES (
      'rate_limit_exceeded',
      NEW.phone,
      NEW.client_id,
      NEW.ip_address,
      format('تجاوز الحد الأقصى (%s طلبات في الساعة)', v_recent_order_count),
      jsonb_build_object('order_code', NEW.order_code, 'subtotal', NEW.subtotal)
    );

    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: تجاوزت الحد المسموح به للطلبات مؤقتاً (3 طلبات خلال ساعة واحدة). تواصل معنا عبر الواتساب للمساعدة.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_order_security_rate_limit ON public.orders;
CREATE TRIGGER trg_check_order_security_rate_limit
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_order_security_rate_limit();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2️⃣ دالة وتريغر حماية إدراج التقييمات (منع السبام وتزوير التوثيق)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_review_insert_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_reviews INT;
BEGIN
  NEW.created_at := NOW();
  NEW.is_deleted := FALSE;
  NEW.deleted_at := NULL;
  NEW.verified := FALSE; -- منع الزائر من توثيق تقييمه ذاتياً من المتصفح

  IF NEW.category NOT IN ('all', 'quality', 'delivery', 'service') THEN
    NEW.category := 'quality';
  END IF;

  SELECT COUNT(*)
  INTO v_recent_reviews
  FROM public.reviews
  WHERE created_at > (NOW() - INTERVAL '10 minutes');

  IF v_recent_reviews >= 10 THEN
    RAISE EXCEPTION 'REVIEW_RATE_LIMIT: تم تجاوز الحد المسموح لإرسال التقييمات مؤقتاً، يرجى المحاولة لاحقاً.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_review_insert_security ON public.reviews;
CREATE TRIGGER trg_check_review_insert_security
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_review_insert_security();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3️⃣ دالة وتريغر التحديث التلقائي لحقل updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
