# 🌿 دليل نظام المخزون المتقدم — خُضرة فاس (Khodra Fès)
### Architecture & Migrations Guide (v2.0 — October 2026)

---

## 📌 نظرة عامة (Overview)
هذا الدليل يوثق بنية نظام المخزون الفعلي لمتجر **خُضرة بفاس**.
تم تصميم النظام ليكون:
1. **Supabase هو المصدر الوحيد للحقيقة (Single Source of Truth)**.
2. **دعم الكسور العشرية (`NUMERIC(10,2)`) للأوزان (مثل 0.5 كغ، 1.5 كغ)**.
3. **الخصم الذري الصارم (Atomic Deduction) ومنع البيع الزائد (No Overselling)**.
4. **حماية تامة ضد التكرار (Strict Idempotency via Partial Unique Indexes)**.
5. **سجل محاسبي وتدقيقي تاريخي كامل لكافة الحركات (`inventory_ledger`)**.

---

## 🗂️ ملفات الترحيل والتسلسل الإلزامي (Execution Sequence)

لتطبيق الترحيلات بنجاح دون أي تعارض في التبعيات، يجب تنفيذ الملفات بالترتيب التالي:

| الترتيب | اسم الملف | الوصف والهدف |
| :---: | :--- | :--- |
| **0** | `supabase/00_preflight_checks.sql` | **(اختياري/تشخيصي)**: فحص حالة الجداول والمخزون الحالي قبل البدء. |
| **1** | `supabase/migrations/20261009000001_migrate_products_stock_to_numeric.sql` | تحويل `products.stock` من `INTEGER` إلى `NUMERIC(10,2)` وإضافة قيد `CHECK (stock >= 0)`. |
| **2** | `supabase/migrations/20261009000002_create_inventory_ledger.sql` | إنشاء جدول التدقيق المحاسبي `inventory_ledger` والفهارس الجزئية الفريدة. |
| **3** | `supabase/migrations/20261009000003_add_orders_inventory_processed.sql` | إضافة عمود `inventory_processed` إلى جدول `orders`. |
| **4** | `supabase/migrations/20261009000004_rpc_process_order_inventory_deduction.sql` | دالة RPC لخصم المخزون ذرياً مع قفل الصفوف (`FOR UPDATE`). |
| **5** | `supabase/migrations/20261009000005_rpc_restore_order_inventory.sql` | دالة RPC لاسترجاع كميات المخزون للطلب عند الإلغاء أو الحذف. |
| **6** | `supabase/migrations/20261009000006_rpc_submit_order_atomic.sql` | دالة RPC الذرية لإنشاء الطلب وخصم مخزونه في عملية واحدة (`All-or-Nothing`). |
| **7** | `supabase/migrations/20261009000007_update_trigger_sync_active.sql` | فك الارتباط التلقائي بين `active` و `is_available` (حالة المخزون لا تطفئ قرار المدير). |
| **8** | `supabase/08_test_scenarios.sql` | **(اختبار وتحقق)**: تشغيل سيناريوهات الخصم الكسري ومنع Overselling والاسترجاع. |

---

## ⚠️ قواعد وقرارات تشغيلية هامة (Critical Rules)

### 1. توقيت الخصم (Order Lifecycle)
- **الخصم يتم عند إنشاء الطلب (`status = 'pending'`)**:
  - بمجرد تأكيد الزبون للطلب عبر `submit_order_atomic`، يتم فحص رصيد السلع وحجزها وخصمها فورياً من جدول `products`.
  - هذا يضمن عدم قدرة أي زبون آخر على شراء نفس السلعة المتبقية.
- **الاسترجاع عند الإلغاء (`status = 'cancelled'`)**:
  - في حال ألغى المدير الطلب أو حذفه، تستدعى `restore_order_inventory` لإعادة الكميات بالكامل.

### 2. الفصل بين `is_available` و `active`
- `is_available`: حالة نظام تلقائية تتغير حسب المخزون (`stock > 0 = true`, `stock = 0 = false`).
- `active`: قرار إداري وسيادي للمدير (مثلاً إيقاف صنف موسمي). المشغلات التلقائية **لا تعدل** هذا الحقل أبداً عند نفاد الكمية.

### 3. صمام الأمان ضد التكرار (Double Deduction Protection)
- يمنع `idx_inventory_ledger_deduct_unique` تسجيل حركتي خصم لنفس المنتج في نفس الطلب.
- عمود `orders.inventory_processed` يمنع إعادة معالجة أي طلب تم خصمه مسبقاً.

---

## 🔄 كيفية التراجع (Rollback Strategy)
كل ملف من ملفات الترحيل يحتوي في نهايته على سكريبت تراجع معلق (`Rollback Script`) يمكن تشغيله بشكل عكسي (من رقم 7 نزولاً لرقم 1) إذا دعت الحاجة.
