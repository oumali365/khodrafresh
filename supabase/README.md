# 🗄️ دليل إدارة وتحديث قاعدة بيانات Supabase – متجر خُضرة فاس 🌿

تمت هيكلة وتأمين جميع ملفات استعلامات SQL في مجلد `/supabase` بالكامل لتكون موحدة، متوافقة مع المزامنة التلقائية عبر GitHub (`supabase/migrations/`)، ومحمية بسياسات RLS ودوال RPC المؤمنة.

---

## 🛡️ التحصينات الأمنية المطبقة

1. **حماية الإعدادات السرية (`store_settings`):**
   - حجب قراءة `admin_pin` وأي مفاتيح سرية من جدول `store_settings` عبر سياسة RLS ودالة `get_store_setting`.
   - إزالة جدول `store_settings` من البث اللحظي (`supabase_realtime`) لمنع تسريب التغييرات عبر WebSockets.
2. **مصادقة المدير (`Supabase Auth JWT` + `Brute-Force Lockout`):**
   - دعم التحقق من هوية المدير عبر `auth.uid()` و `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`.
   - حماية التحقق من الرمز السري على الخادم بحد أقصى 5 محاولات خاطئة كل 15 دقيقة مع تسجيل المحاولات في `order_security_logs`.
   - إزالة جميع الرموز الافتراضية الثابتة من الكود المصدري.
3. **حماية الطلبات والتقييمات (`orders` & `reviews`):**
   - فرض قيم الخادم الحقيقية (`created_at := NOW()`, `status := 'pending'`, `is_deleted := FALSE`) داخل تريغر `BEFORE INSERT`.
   - استخراج عنوان الـ IP الفعلي من رؤوس الشبكة (`cf-connecting-ip` / `x-forwarded-for`) لفرض فترة التهدئة (`Cooldown` 180 ثانية) وسقف الطلبات (`Rate Limit` 3 طلبات/ساعة).

---

## 📁 هيكلية ملفات SQL

| اسم الملف | الوظيفة والمحتوى |
| :--- | :--- |
| **`00_master_setup.sql`** | **الملف الشامل الموحد (All-in-One)**: ينشئ الجداول، التريغرات الأمنية، دوال RPC، سياسات RLS، بيانات المنتجات، والتزامن اللحظي في خطوة واحدة. |
| `01_schema_tables.sql` | إنشاء وتحديث جداول `products`, `orders`, `reviews`, `store_settings`, `order_security_logs` مع الفهارس. |
| `02_security_and_triggers.sql` | تريغرات الحماية وفحص الهاتف المغربي وفترة التهدئة (Cooldown) وسقف الطلبات (Rate Limit). |
| `03_functions_and_rpc.sql` | دوال الخادم المحمية (`is_admin`, `assert_is_admin`, `get_orders_secure`, `update_order_status_secure`, `delete_order_secure`, `update_order_dispatch_secure`). |
| `04_rls_policies.sql` | سياسات أمان الصفوف (RLS) المقيدة للإدراج والقراءة. |
| `05_seed_data.sql` | البيانات الأولية للمنتجات الـ 100 وتقييمات الزبائن وإعدادات المتجر العامة. |
| `06_realtime_setup.sql` | تفعيل `supabase_realtime` لجداول `orders`, `reviews`, `products`. |
| `migrations/` | ملفات الترحيل القياسية للمزامنة التلقائية مع GitHub Integration في Supabase. |
