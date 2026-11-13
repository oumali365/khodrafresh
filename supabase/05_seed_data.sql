-- ==============================================================================
-- 🌾 05_seed_data.sql – تعبئة البيانات الأولية (المنتجات، الإعدادات، التقييمات)
-- متجر خُضرة - فاس (Khodra Store)
--
-- المحتويات:
-- 1. إعدادات المتجر الأساسية (اسم المتجر، رقم الواتساب، رسوم التوصيل)
-- 2. تقييمات الزبائن الأولية لمدينة فاس
-- 3. قائمة المنتجات الكاملة بتسعيرة الدرهم المغربي والمصادر والأيقونات
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1️⃣ إعدادات المتجر العامة (store_settings)
-- ملاحظة: لا يتم تضمين أو الكتابة فوق admin_pin هنا لحماية الرمز السري في الإنتاج
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.store_settings (key, value, description)
VALUES
  ('store_name', 'خُضرة', 'اسم المتجر الرسمي'),
  ('store_city', 'فاس والنواحي', 'نطاق التغطية والعمليات'),
  ('whatsapp_number', '+212704274830', 'رقم الواتساب للتواصل والطلبات'),
  ('standard_delivery_fee', '15', 'رسوم التوصيل القياسية بالدرهم'),
  ('free_delivery_threshold', '250', 'حد الطلب للتوصيل المجاني بالدرهم')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- تهيئة أولية آمنة لـ admin_pin فقط إذا لم يكن موجوداً مسبقاً (لا يكتب أبداً فوق الرمز المخصص في الإنتاج)
INSERT INTO public.store_settings (key, value, description)
VALUES ('admin_pin', '090909', 'الرمز السري للوحة الإدارة (محجوب عن القراءة العامة عبر RLS)')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2️⃣ التقييمات الأولية (reviews)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.reviews (author, neighborhood, rating, comment, category, verified, is_deleted)
VALUES
  ('فاطمة الزهراء ب.', 'طريق إيموزار، فاس', 5, 'تبارك الله السلعة نقية وطازجة بحال إلا مشيتي للسوق نقيتيها بيدك، والتوصيل ديما فالموعد.', 'quality', TRUE, FALSE),
  ('أمين التازي', 'طريق عين الشقف، فاس', 5, 'خدمة في المستوى وكتوفر بزاف ديال الوقت، الخضرة كتوصل مقادة ومغسولة بعناية. برافو عليكم.', 'service', TRUE, FALSE),
  ('نادية بنجلون', 'حي الأطلس، فاس', 5, 'تعامل راقي وثقة كبيرة، الفواكه حلوة والخضر طرية بزاف. أول تجربة وأكيد ماشي الأخيرة.', 'quality', TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3️⃣ المنتجات الكاملة (products) – متطابقة 100% مع تطبيق المتجر
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.products (id, name, category, type, price, unit_label, stock, icon, image_url, active, description, origin)
VALUES
  (1, 'بطاطس بلدية', 'veg', 'weight', 7.00, 'kg', 120, '🥔', '/images/products/vegetables/potato.webp', TRUE, 'بطاطس بلدية حمراء ممتازة للقلي وأطباق الطاجين المغربي.', 'الشاوية / تادلة'),
  (2, 'طماطم طازجة', 'veg', 'weight', 7.00, 'kg', 85, '🍅', '/images/products/vegetables/tomato.webp', TRUE, 'طماطم حمراء ناضجة ومقرمشة، مثالية للسلطات والطبخ المغربي.', 'شتوكة آيت باها'),
  (3, 'باذنجان بلدي', 'veg', 'weight', 6.50, 'kg', 45, '🍆', '/images/products/vegetables/eggplant.webp', TRUE, 'باذنجان أسود لامع وخالٍ من المرارة، ممتاز لزعلوك والطاجين.', 'الغرب'),
  (4, 'كوسة خضراء (قرعة خضراء)', 'veg', 'weight', 7.00, 'kg', 50, '🥒', '/images/products/vegetables/zucchini.webp', TRUE, 'قرعة خضراء طرية وطازجة، مثالية للكسكس والطاجين.', 'الغرب'),
  (5, 'ثوم بلدي', 'veg', 'weight', 12.00, 'kg', 40, '🧄', '/images/products/vegetables/garlic.webp', TRUE, 'ثوم بلدي أحمر ذو نكهة قوية وغني بالفوائد الصحية.', 'سايس / فاس'),
  (6, 'جزر بلدي (خيزو)', 'veg', 'weight', 6.00, 'kg', 70, '🥕', '/images/products/vegetables/carrot.webp', TRUE, 'جزر برتقالي حلو ومقرمش، ممتاز للعصائر والطواجن والكسكس.', 'دكالة'),
  (7, 'قرنبيط (شيفلور)', 'veg', 'weight', 8.00, 'kg', 30, '🥦', '/images/products/vegetables/cauliflower.webp', TRUE, 'قرنبيط أبيض نقي وطازج، غني بالألياف والفيتامينات.', 'الغرب'),
  (8, 'فول أخضر طري', 'veg', 'weight', 9.00, 'kg', 40, '🫛', '/images/products/vegetables/fava-beans.webp', TRUE, 'فول أخضر بلدي طري، مثالي للكسكس والمنقوب والطاجين المغربي.', 'نواحي فاس'),
  (9, 'قرع أحمر (كرعة حمرا)', 'veg', 'weight', 7.00, 'kg', 45, '🎃', '/images/products/vegetables/pumpkin.webp', TRUE, 'قرع أحمر حلو وطري، ركن أساسي في الكسكس المغربي والتعسال.', 'دكالة'),
  (10, 'شمندر طازج (باربا)', 'veg', 'weight', 6.00, 'kg', 45, '🟣', '/images/products/vegetables/beetroot.webp', TRUE, 'باربا بلدية حلوة وغنية بالحديد، ممتازة للسلطات والعصائر.', 'سايس / فاس'),
  (11, 'ليمون حامض بلدي', 'veg', 'weight', 8.00, 'kg', 55, '🍋', '/images/products/vegetables/lemon.webp', TRUE, 'حامض بلدي فواح ذو عصارة وفيرة، ضروري للطبخ المغربي والسلطات.', 'تارودانت'),
  (12, 'بطاطا حلوة', 'veg', 'weight', 8.50, 'kg', 40, '🍠', '/images/products/vegetables/sweet-potato.webp', TRUE, 'بطاطا حلوة طرية وغنية بالطاقة، رائعة للطواجن والفرن.', 'الغرب'),
  (13, 'خيار مغربي', 'veg', 'weight', 6.00, 'kg', 50, '🥒', '/images/products/vegetables/cucumber.webp', TRUE, 'خيار طري ومنعش، منقى بعناية للسلطات والاستهلاك اليومي.', 'شتوكة / سوس'),
  (14, 'لفت محفور', 'veg', 'weight', 7.00, 'kg', 40, '🥕', '/images/products/vegetables/turnip-yellow.webp', TRUE, 'لفت محفور بلدي ذو مذاق مميز، لا يكتمل الكسكس المغربي بدونه.', 'سايس / فاس'),
  (15, 'فلفل أحمر حلو', 'veg', 'weight', 9.00, 'kg', 40, '🌶️', '/images/products/vegetables/pepper-red.webp', TRUE, 'فلفل أحمر حلو غني بفيتامين C، مثالي للشواء والتكتوكة والسلطات.', 'أكادير سوس'),
  (16, 'ملفوف أخضر (مكور)', 'veg', 'unit', 6.00, 'رأس', 35, '🥬', '/images/products/vegetables/cabbage.webp', TRUE, 'ملفوف أخضر طازج ومقرمش للكسكس المغربي والسلطات.', 'الغرب'),
  (17, 'فاصوليا خضراء (لوبيا شعرة)', 'veg', 'weight', 12.00, 'kg', 40, '🫛', '/images/products/vegetables/green-beans.webp', TRUE, 'لوبيا خضراء رقيقة وطرية بدون خيوط، ممتازة للسلطات والطواجن.', 'سوس ماسة'),
  (18, 'طماطم كرزية (سوريز)', 'veg', 'weight', 10.00, 'kg', 35, '🍅', '/images/products/vegetables/cherry-tomato.webp', TRUE, 'طماطم كرزية حلوة في العرجون، مثالية لتزيين الأطباق والسلطات.', 'شتوكة آيت باها'),
  (19, 'خس طازج (خص)', 'veg', 'unit', 4.50, 'رأس', 40, '🥬', '/images/products/vegetables/lettuce.webp', TRUE, 'خس أخضر مقرمش وطازج، مثالي للسلطات المغربية.', 'الغرب'),
  (20, 'بصل أبيض', 'veg', 'weight', 6.00, 'kg', 80, '🧅', '/images/products/vegetables/onion-white.webp', TRUE, 'بصل أبيض حلو المذاق، مثالي للتغميرة والسلطات والأطباق اليومية.', 'سايس / فاس'),
  (21, 'تفاح أحمر', 'fruit', 'weight', 14.00, 'kg', 55, '🍎', '/images/products/fruits/apple-red.webp', TRUE, 'تفاح أحمر حلو ومقرمش من بساتين الأطلس المتوسط.', 'ميدلت'),
  (22, 'تفاح أصفر (غولدن)', 'fruit', 'weight', 13.50, 'kg', 45, '🍏', '/images/products/fruits/apple-yellow.webp', TRUE, 'تفاح أصفر غولدن ديليشس حلو وعصيري، نخب أول.', 'ميدلت'),
  (23, 'تين طازج (كرموس بلدي)', 'fruit', 'weight', 25.00, 'kg', 20, '🟣', '/images/products/fruits/figs.webp', TRUE, 'تين طري حلو كالعسل، موسمي منتقى بعناية من مزارع الشمال.', 'تاونات / وزان'),
  (24, 'إجاص بلدي (بوعويد)', 'fruit', 'weight', 14.00, 'kg', 35, '🍐', '/images/products/fruits/pear.webp', TRUE, 'إجاص طازج ذو قوام زبدي حلو ورائحة فواحة مميزة.', 'صفرو / الأطلس'),
  (25, 'شمام (سويهلة)', 'fruit', 'weight', 7.50, 'kg', 30, '🍈', '/images/products/fruits/melon-charentais.webp', TRUE, 'سويهلة عسلية معطرة وحلوة المذاق، منعشة جداً صيفاً.', 'سوس ماسة'),
  (26, 'خوخ مفرطح (بوطبقا)', 'fruit', 'weight', 16.00, 'kg', 25, '🍑', '/images/products/fruits/peach-flat.webp', TRUE, 'خوخ بلدي مفرطح شديد الحلاوة وطري، منتقى بعناية.', 'الأطلس / إيموزار'),
  (27, 'مانجو استوائي', 'fruit', 'weight', 22.00, 'kg', 20, '🥭', '/images/products/fruits/mango.webp', TRUE, 'مانجو ناضج وعصيري غني بالفيتامينات والنكهة الاستوائية.', 'سوس ماسة'),
  (28, 'فراولة طازجة (فريز)', 'fruit', 'unit', 15.00, 'علبة 500غ', 30, '🍓', '/images/products/fruits/strawberry.webp', TRUE, 'فراولة حمراء نضرة وعطرة، مقطوفة طازجة حبة بحبة.', 'العرائش'),
  (29, 'كيوي ممتاز', 'fruit', 'weight', 20.00, 'kg', 25, '🥝', '/images/products/fruits/kiwi.webp', TRUE, 'كيوي أخضر منعش غني بفيتامين C والألياف الحيوية.', 'استيراد ممتاز'),
  (30, 'عنب أسود بلدي', 'fruit', 'weight', 18.00, 'kg', 30, '🍇', '/images/products/fruits/grape-black.webp', TRUE, 'عنب أسود حلو ومقرمش غني بمضادات الأكسدة الطبيعية.', 'بنسليمان / الغرب'),
  (31, 'أناناس استوائي', 'fruit', 'unit', 25.00, 'حبة', 15, '🍍', '/images/products/fruits/pineapple.webp', TRUE, 'أناناس حلو وعصيري، مثالي للعصائر وسلطات الفواكه.', 'استيراد طازج'),
  (32, 'جوز الهند (كوكو)', 'fruit', 'unit', 15.00, 'حبة', 20, '🥥', '/images/products/fruits/coconut.webp', TRUE, 'جوز هند طبيعي غني بالماء المنعش واللب الأبيض المغذي.', 'استيراد ممتاز'),
  (33, 'برتقال فالنسيا', 'fruit', 'weight', 6.00, 'kg', 100, '🍊', '/images/products/fruits/orange.webp', TRUE, 'برتقال بركان كثير العصارة وحلو المذاق، رفيق فطور الصباح.', 'بركان'),
  (34, 'عنب أبيض (مسكة)', 'fruit', 'weight', 16.00, 'kg', 30, '🍇', '/images/products/fruits/grape-white.webp', TRUE, 'عنب مسكة أبيض حلو بدون بذور، منعش ومقرمش.', 'الغرب'),
  (35, 'بطيخ أصفر (كانتالوب)', 'fruit', 'weight', 7.00, 'kg', 35, '🍈', '/images/products/fruits/melon-yellow.webp', TRUE, 'بطيخ أصفر كناري حلو المذاق وغني بالماء والانتعاش.', 'زاكورة / تادلة'),
  (36, 'رمان بلدي', 'fruit', 'weight', 14.00, 'kg', 30, '🍎', '/images/products/fruits/pomegranate.webp', TRUE, 'رمان بلدي ياقوتي حلو وحامض، غني بالفوائد الصحية ومضادات الأكسدة.', 'صفرو / تادلة'),
  (37, 'أفوكادو هاس', 'fruit', 'weight', 28.00, 'kg', 25, '🥑', '/images/products/fruits/avocado.webp', TRUE, 'أفوكادو هاس زبدي الملمس وفاخر، مثالي للعصائر وسلطات الطاقة.', 'الغرب'),
  (38, 'نكتارين (شهدية بلدية)', 'fruit', 'weight', 16.00, 'kg', 30, '🍑', '/images/products/fruits/nectarine.webp', TRUE, 'شهدية ملساء حمراء حلوة ومقرمشة، طازجة من بساتين الأطلس.', 'الأطلس المتوسط'),
  (39, 'كرز (حب الملوك)', 'fruit', 'weight', 30.00, 'kg', 15, '🍒', '/images/products/fruits/cherry.webp', TRUE, 'حب الملوك من مزارع صفرو الشهيرة، طازج وحلو المذاق.', 'صفرو'),
  (40, 'زبيب أسود بلدي', 'fruit', 'unit', 35.00, 'علبة 500غ', 40, '🍇', '/images/products/fruits/raisin-black.webp', TRUE, 'عنب مجفف أسود طبيعي 100% غني بالحديد، رائع للكسكس والوصفات الصحية.', 'تارودانت / درعة'),
  (113, 'مشمش مجفف فاخر', 'fruit', 'unit', 45.00, 'علبة 500غ', 30, '🍑', '/images/products/fruits/apricot-dried.webp', TRUE, 'مشمش مجفف ذهبي حبات كبيرة طرية وحلوة المذاق.', 'استيراد ممتاز'),
  (114, 'تين مجفف (شريحة بلدية)', 'fruit', 'unit', 40.00, 'علبة 500غ', 35, '🟣', '/images/products/fruits/figs-dried.webp', TRUE, 'شريحة بلدية تاوناتية مع زيت الزيتون أو الاستهلاك اليومي.', 'تاونات'),
  (115, 'برقوق مجفف (عين بقرة)', 'fruit', 'unit', 35.00, 'علبة 500غ', 40, '🟣', '/images/products/fruits/prune-dried.webp', TRUE, 'برقوق مجفف حبات ممتازة للتعسال وتزيين طاجين اللحم المغربي.', 'الأطلس'),
  (116, 'زبيب أشقر (ذهبي)', 'fruit', 'unit', 38.00, 'علبة 500غ', 35, '🍇', '/images/products/fruits/raisin-golden.webp', TRUE, 'زبيب ذهبي نقي وعالي الجودة، مثالي للكسكس والحلويات المغربية.', 'تارودانت'),
  (117, 'لوز بلدي بقشوره', 'fruit', 'unit', 50.00, 'علبة 500غ', 40, '🥜', '/images/products/fruits/almond-raw.webp', TRUE, 'لوز بلدي مغربي أصيل غني بالزيوت الطبيعية والنكهة القوية.', 'سوس / تافراوت'),
  (118, 'لوز مفسوخ (مقشر)', 'fruit', 'unit', 55.00, 'علبة 500غ', 30, '🥜', '/images/products/fruits/almond-blanched.webp', TRUE, 'لوز أبيض مقشر جاهز للقلي وتحضير أطباق المناسبات والبسطيلة.', 'تافراوت'),
  (119, 'جوز بلدي (كركاع)', 'fruit', 'unit', 60.00, 'علبة 500غ', 30, '🌰', '/images/products/fruits/walnut.webp', TRUE, 'كركاع بلدي أبيض حلو المذاق غني بالأوميغا 3 والدهون الصحية.', 'أزيلال / تاحناوت'),
  (120, 'فستق محمص ومملح (بيستاش)', 'fruit', 'unit', 65.00, 'علبة 500غ', 25, '🥜', '/images/products/fruits/pistachio.webp', TRUE, 'بيستاش محمص حبات مفتوحة ومقرمشة بنكهة مميزة.', 'استيراد ممتاز'),
  (121, 'كاجو محمص', 'fruit', 'unit', 65.00, 'علبة 500غ', 25, '🥜', '/images/products/fruits/cashew.webp', TRUE, 'حبات كاجو محمصة ومقرمشة غنية بالطاقة والبروتين.', 'استيراد فاخر'),
  (122, 'تمر مجهول ممتاز', 'fruit', 'unit', 60.00, 'علبة 1 كغ', 35, '🌴', '/images/products/fruits/dates-medjool.webp', TRUE, 'تمور مجهول بلدية حبات كبيرة ومعسلة من واحات تافيلالت الفيحاء.', 'أرفود / تافيلالت'),
  (123, 'موز بلدي', 'fruit', 'weight', 12.50, 'kg', 70, '🍌', '/images/products/fruits/banana.webp', TRUE, 'موز طبيعي ناضج ولذيذ، غني بالبوتاسيوم والطاقة الحيوية.', 'سوس ماسة'),
  (124, 'بطيخ أحمر (دلاح)', 'fruit', 'weight', 4.50, 'kg', 45, '🍉', '/images/products/fruits/watermelon.webp', TRUE, 'دلاح أحمر حلو ومرمل كثير الماء، منعش لأيام الصيف.', 'زاكورة / سوس'),
  (125, 'مشمش طازج بلدي', 'fruit', 'weight', 18.00, 'kg', 20, '🍑', '/images/products/fruits/apricot.webp', TRUE, 'مشمش بلدي حلو وعصيري، موسمي مقطوف طازجاً من الأطلس.', 'الأطلس المتوسط'),
  (41, 'حليب طازج', 'dairy', 'unit', 8.00, 'قارورة 1 لتر', 60, '🥛', '/images/products/dairy/milk.webp', TRUE, 'حليب طازج معقم يحافظ على كامل قيمته الغذائية.', 'تعاونية الحليب'),
  (42, 'زبدة بلدية', 'dairy', 'weight', 75.00, 'kg', 15, '🧈', '/images/products/dairy/butter.webp', TRUE, 'زبدة بلدية مخوضة تقليدياً بدون إضافات.', 'سوس'),
  (43, 'جبن أبيض', 'dairy', 'unit', 18.00, 'علبة 250غ', 30, '🧀', '/images/products/dairy/cheese-white.webp', TRUE, 'جبن تقليدي طبيعي محضر من حليب البقر المصفى.', 'الشاوية'),
  (44, 'لبن رايب', 'dairy', 'unit', 9.00, 'قارورة 1 لتر', 35, '🍶', '/images/products/dairy/lben.webp', TRUE, 'رايب بلدي مهدئ ومنعش، رفيق الكسكس المغربي.', 'تادلة'),
  (45, 'بيض بلدي', 'dairy', 'unit', 45.00, 'طبق 30 بيضة', 25, '🥚', '/images/products/dairy/eggs.webp', TRUE, 'بيض مزارع طبيعية خالٍ من الهرمونات.', 'دكالة'),
  (46, 'جبن مطبوخ', 'dairy', 'unit', 22.00, 'علبة 200غ', 40, '🧀', '/images/products/dairy/cheese-cooked.webp', TRUE, 'جبن مطبوخ طري، مثالي للفطور والسندويشات.', 'استيراد'),
  (47, 'زبادي طبيعي', 'dairy', 'unit', 5.00, 'علبة 125غ', 50, '🍶', '/images/products/dairy/yogurt.webp', TRUE, 'زبادي طبيعي منعش، غني بالبروبيوتيك.', 'تعاونية الحليب'),
  (48, 'جبن رومي', 'dairy', 'weight', 95.00, 'kg', 10, '🧀', '/images/products/dairy/cheese-romy.webp', TRUE, 'جبن رومي معتق، نكهة قوية ومميزة.', 'استيراد'),
  (49, 'حليب مركّز', 'dairy', 'unit', 15.00, 'علبة', 30, '🥛', '/images/products/dairy/condensed-milk.webp', TRUE, 'حليب مركّز محلى، مثالي للحلويات.', 'استيراد'),
  (50, 'قشطة طازجة', 'dairy', 'unit', 25.00, 'علبة 250غ', 20, '🍦', '/images/products/dairy/cream.webp', TRUE, 'قشطة طازجة غنية، مثالية للحلويات المغربية.', 'تعاونية الحليب'),
  (51, 'عسل حر', 'grocery', 'unit', 95.00, 'مرطبان 500غ', 18, '🍯', '/images/products/grocery/honey.webp', TRUE, 'عسل نحل خالص من جبال الأطلس، طبيعي بدون سكر مضاف.', 'إيموزار كندر'),
  (52, 'كسكس', 'grocery', 'unit', 14.00, 'كيس 1 كغ', 45, '🥣', '/images/products/grocery/couscous.webp', TRUE, 'حبات كسكس متوسطة مفتولة بحرفية لطهي سهل.', 'صناعة مغربية'),
  (53, 'شاي مغربي', 'grocery', 'unit', 18.00, 'علبة 250غ', 50, '🍵', '/images/products/grocery/tea.webp', TRUE, 'شاي أخضر رفيع لأتاي مغربي منعنع.', 'استيراد ممتاز'),
  (54, 'سكر', 'grocery', 'unit', 8.00, 'كيس 1 كغ', 100, '🧂', '/images/products/grocery/sugar.webp', TRUE, 'سكر أبيض ناعم للاستعمال اليومي.', 'صناعة مغربية'),
  (55, 'ملح', 'grocery', 'unit', 3.00, 'كيس 1 كغ', 120, '🧂', '/images/products/grocery/salt.webp', TRUE, 'ملح طعام ناعم مدعم باليود.', 'صناعة مغربية'),
  (56, 'دقيق فاخر', 'grocery', 'weight', 9.00, 'kg', 60, '🌾', '/images/products/grocery/flour.webp', TRUE, 'دقيق قمح صلب مطحون على الحجر وغني بالألياف.', 'مطاحن تقليدية'),
  (57, 'زيت زيتون بكر', 'grocery', 'unit', 85.00, 'قارورة 1 لتر', 40, '🫒', '/images/products/grocery/olive-oil.webp', TRUE, 'زيت زيتون خالص عصرة على البارد بنسبة حموضة أقل من 0.8%.', 'قلعة السراغنة'),
  (58, 'زيت مائدة', 'grocery', 'unit', 18.00, 'قارورة 1 لتر', 60, '🫗', '/images/products/grocery/vegetable-oil.webp', TRUE, 'زيت نباتي للطبخ اليومي.', 'صناعة مغربية'),
  (59, 'أرز', 'grocery', 'unit', 15.00, 'كيس 1 كغ', 50, '🍚', '/images/products/grocery/rice.webp', TRUE, 'أرز أبيض طويل الحبة، مثالي للطبخ المغربي.', 'استيراد'),
  (60, 'معكرونة', 'grocery', 'unit', 10.00, 'كيس 500غ', 55, '🍝', '/images/products/grocery/pasta.webp', TRUE, 'معكرونة إيطالية فاخرة، مثالية للوجبات السريعة.', 'استيراد'),
  (61, 'عدس', 'grocery', 'unit', 12.00, 'كيس 1 كغ', 40, '🫘', '/images/products/grocery/lentils.webp', TRUE, 'عدس مغربي ممتاز، غني بالبروتين.', 'دكالة'),
  (62, 'حمص', 'grocery', 'unit', 14.00, 'كيس 1 كغ', 35, '🫘', '/images/products/grocery/chickpeas.webp', TRUE, 'حمص بلدي، أساسي للحريرة والطاجين.', 'دكالة'),
  (63, 'فاصوليا بيضاء', 'grocery', 'unit', 13.00, 'كيس 1 كغ', 30, '🫘', '/images/products/grocery/white-beans.webp', TRUE, 'فاصوليا بيضاء طازجة، مثالية للطاجين.', 'دكالة'),
  (64, 'زعتر', 'grocery', 'unit', 8.00, 'كيس 100غ', 45, '🌿', '/images/products/grocery/thyme.webp', TRUE, 'زعتر مجفف معطر، مثالي للشاي والتوابل.', 'الأطلس'),
  (65, 'قرفة', 'grocery', 'unit', 12.00, 'كيس 100غ', 40, '🪵', '/images/products/grocery/cinnamon.webp', TRUE, 'قرفة عيدان فاخرة، مثالية للحلويات والمشروبات.', 'استيراد'),
  (66, 'عصير برتقال طازج', 'drinks', 'unit', 18.00, 'قارورة 1 لتر', 30, '🧃', '/images/products/drinks/orange-juice.webp', TRUE, 'عصير برتقال صافٍ بدون ماء ولا سكر مضاف.', 'خضرة فريش'),
  (67, 'عصير ليمون', 'drinks', 'unit', 16.00, 'قارورة 1 لتر', 25, '🥤', '/images/products/drinks/lemon-juice.webp', TRUE, 'مشروب منعش محضر من الحامض البلدي والنعناع.', 'خضرة فريش'),
  (68, 'ماء معدني', 'drinks', 'unit', 26.00, 'حزمة 6×1.5 لتر', 50, '💧', '/images/products/drinks/mineral-water.webp', TRUE, 'ماء معدني نقي متوازن المعادن من ينابيع الأطلس.', 'عين سايس'),
  (69, 'عصير تفاح', 'drinks', 'unit', 20.00, 'قارورة 1 لتر', 25, '🧃', '/images/products/drinks/apple-juice.webp', TRUE, 'عصير تفاح طبيعي بدون سكر مضاف.', 'خضرة فريش'),
  (70, 'عصير مانجو', 'drinks', 'unit', 22.00, 'قارورة 1 لتر', 20, '🧃', '/images/products/drinks/mango-juice.webp', TRUE, 'عصير مانجو استوائي كثيف وغني بالفيتامينات.', 'خضرة فريش'),
  (71, 'عصير فراولة', 'drinks', 'unit', 20.00, 'قارورة 1 لتر', 22, '🧃', '/images/products/drinks/strawberry-juice.webp', TRUE, 'عصير فراولة طازج، حلو ومنعش.', 'خضرة فريش'),
  (72, 'مشروب غازي', 'drinks', 'unit', 10.00, 'قارورة 1 لتر', 60, '🥤', '/images/products/drinks/soda.webp', TRUE, 'مشروب غازي منعش، متوفر بنكهات متعددة.', 'استيراد'),
  (73, 'عصير أناناس', 'drinks', 'unit', 22.00, 'قارورة 1 لتر', 18, '🧃', '/images/products/drinks/pineapple-juice.webp', TRUE, 'عصير أناناس حامض حلو، غني بفيتامين C.', 'خضرة فريش'),
  (74, 'عصير رمان', 'drinks', 'unit', 24.00, 'قارورة 1 لتر', 15, '🧃', '/images/products/drinks/pomegranate-juice.webp', TRUE, 'عصير رمان طبيعي، غني بمضادات الأكسدة.', 'خضرة فريش'),
  (75, 'عصير أفوكادو', 'drinks', 'unit', 25.00, 'كأس 500ml', 12, '🥤', '/images/products/drinks/avocado-juice.webp', TRUE, 'عصير أفوكادو دسم ومغذي، مثالي للفطور.', 'خضرة فريش'),
  (76, 'سائل غسيل الأواني', 'cleaning', 'unit', 14.50, 'قارورة 750 مل', 40, '🧼', '/images/products/cleaning/dish-soap.webp', TRUE, 'تركيبة فعالة تزيل الدهون الصعبة وتحافظ على نعومة اليدين.', 'جودة معتمدة'),
  (77, 'منظف أرضيات', 'cleaning', 'unit', 19.00, 'قارورة 1 لتر', 35, '🧴', '/images/products/cleaning/floor-cleaner.webp', TRUE, 'مطهر ومعطر للأرضيات يدوم شذاه العطر في أرجاء البيت.', 'جودة معتمدة'),
  (78, 'صابون بلدي', 'cleaning', 'unit', 12.00, 'علبة 500غ', 45, '🫧', '/images/products/cleaning/black-soap.webp', TRUE, 'صابون أسود تقليدي أصيل طبيعي 100% غني بفيتامين E.', 'مراكش'),
  (79, 'مبيض ملابس', 'cleaning', 'unit', 15.00, 'قارورة 1 لتر', 30, '🧴', '/images/products/cleaning/bleach.webp', TRUE, 'مبيض قوي للملابس البيضاء، فعال ضد البقع.', 'جودة معتمدة'),
  (80, 'مناديل ورقية', 'cleaning', 'unit', 10.00, 'علبة', 60, '🧻', '/images/products/cleaning/tissues.webp', TRUE, 'مناديل ورقية ناعمة، مثالية للاستخدام اليومي.', 'استيراد'),
  (81, 'سمن بلدي حار', 'dairy', 'unit', 35.00, 'مرطبان 250غ', 20, '🧈', '/images/products/dairy/smen.webp', TRUE, 'سمن بلدي مغربي معتق ذو نكهة أصيلة للكسكس والطواجن الفاسية.', 'فاس / سايس'),
  (82, 'جبن موزاريلا مبشور', 'dairy', 'unit', 24.00, 'كيس 200غ', 30, '🧀', '/images/products/dairy/mozzarella.webp', TRUE, 'جبن موزاريلا طبيعي سهل الذوبان للبيتزا والمخبوزات والكراتان.', 'تعاونية الحليب'),
  (83, 'جبن إيدام أحمر', 'dairy', 'weight', 88.00, 'kg', 15, '🧀', '/images/products/dairy/edam.webp', TRUE, 'جبن أحمر كلاسيكي ممتاز للسندويشات ومائدة الفطور.', 'استيراد ممتاز'),
  (84, 'ياغورت فواكه', 'dairy', 'unit', 14.00, 'حزمة 4 علب', 40, '🍶', '/images/products/dairy/fruit-yogurt.webp', TRUE, 'زبادي كريمي غني بقطع الفواكه الطبيعية، وجبة خفيفة ومغذية.', 'تعاونية الحليب'),
  (85, 'حليب الشوكولاتة', 'dairy', 'unit', 6.50, 'قارورة 200 مل', 45, '🧃', '/images/products/dairy/choco-milk.webp', TRUE, 'حليب كامل الدسم مع الكاكاو الغني بالطاقة، محبب للأطفال والرياضيين.', 'تعاونية الحليب'),
  (86, 'طماطم مصبرة مركزة', 'grocery', 'unit', 11.00, 'علبة 400غ', 60, '🥫', '/images/products/grocery/tomato-paste.webp', TRUE, 'معجون طماطم مغربي مركز وطبيعي 100% ممتاز للحريرة والطواجن.', 'مكناس'),
  (87, 'قهوة مطحونة معطرة', 'grocery', 'unit', 26.00, 'علبة 250غ', 35, '☕', '/images/products/grocery/coffee.webp', TRUE, 'بن رفيع محمص ومطحون بالأعشاب والبهارات الفاسية الأصيلة.', 'فاس العتيقة'),
  (88, 'كمون بلدي مطحون', 'grocery', 'unit', 12.00, 'كيس 100غ', 50, '🌿', '/images/products/grocery/cumin.webp', TRUE, 'كمون بلدي منقى ومطحون طازج ذو رائحة نفاذة ونكهة فريدة.', 'الرحامنة'),
  (89, 'فلفل أسود (إبزار)', 'grocery', 'unit', 14.00, 'كيس 100غ', 45, '🧂', '/images/products/grocery/black-pepper.webp', TRUE, 'إبزار حب مطحون ناعم طازج، بهار لا غنى عنه في كل مائدة.', 'استيراد ممتاز'),
  (90, 'شعرية السفة رقيقة', 'grocery', 'unit', 11.50, 'كيس 500غ', 40, '🌾', '/images/products/grocery/seffa.webp', TRUE, 'شعرية قمح صلب رقيقة ممتازة لتحضير السفة المغربية الملكية.', 'صناعة مغربية'),
  (91, 'عصير جزر بالبرتقال', 'drinks', 'unit', 17.00, 'قارورة 1 لتر', 25, '🥕', '/images/products/drinks/carrot-orange-juice.webp', TRUE, 'مزيج مغربي كلاسيكي غني بفيتامين A و C وطاقة منعشة.', 'خضرة فريش'),
  (92, 'مشروب لوز بالحليب', 'drinks', 'unit', 28.00, 'قارورة 750 مل', 20, '🥛', '/images/products/drinks/almond-milk.webp', TRUE, 'عصير لوز بلدي بالحليب وماء الزهر، مشروب الضيافة الفاسية الأصيل.', 'فاس'),
  (93, 'ماء زهر مقطر', 'drinks', 'unit', 18.00, 'قارورة 250 مل', 30, '🌸', '/images/products/drinks/orange-blossom-water.webp', TRUE, 'ماء زهر طبيعي مقطر تقليدياً للحلويات والشاي والأفراح.', 'فاس العتيقة'),
  (94, 'ماء غازي طبيعي', 'drinks', 'unit', 8.50, 'قارورة 1 لتر', 45, '🫧', '/images/products/drinks/sparkling-water.webp', TRUE, 'مياه فوّارة طبيعية غنية بالمعادن تساعد على الهضم والانتعاش.', 'والماس'),
  (95, 'شاي مثلج بالخوخ والنعناع', 'drinks', 'unit', 15.00, 'قارورة 1 لتر', 25, '🧊', '/images/products/drinks/iced-tea.webp', TRUE, 'شاي مثلج منعش بنكهة الخوخ والنعناع الطبيعي لأيام الصيف الحارة.', 'خضرة فريش'),
  (96, 'مسحوق غسيل أوتوماتيك', 'cleaning', 'unit', 48.00, 'كيس 2 كغ', 30, '🧺', '/images/products/cleaning/laundry-powder.webp', TRUE, 'مسحوق عالي الفعالية ينظف الملابس البيضاء والملونة برائحة زهرية تدوم.', 'جودة معتمدة'),
  (97, 'معطر جو برائحة العود والخزامى', 'cleaning', 'unit', 22.00, 'بخاخ 300 مل', 35, '🌸', '/images/products/cleaning/air-freshener.webp', TRUE, 'معطر فندقي فاخر برائحة العود والخزامى يضفي بهجة وأناقة للبيت.', 'صناعة مغربية'),
  (98, 'صابون سائل لليدين بالخزامى', 'cleaning', 'unit', 16.50, 'مضخة 500 مل', 40, '🧴', '/images/products/cleaning/hand-soap.webp', TRUE, 'صابون رغوي مرطب ومعقم لليدين بزيت الخزامى الطبيعي والجلسرين.', 'جودة معتمدة'),
  (99, 'منظف وملمع الزجاج', 'cleaning', 'unit', 14.00, 'بخاخ 750 مل', 35, '🪟', '/images/products/cleaning/glass-cleaner.webp', TRUE, 'تركيبة مضادة للبخار تمنح المرايا والبلور لمعاناً كريستالياً نقياً.', 'جودة معتمدة'),
  (100, 'طقم إسفنج وسلك جلي أواني', 'cleaning', 'unit', 12.00, 'حزمة 4 قطع', 50, '🧽', '/images/products/cleaning/sponge-pack.webp', TRUE, 'إسفنج مزدوج ناعم مع سلك إينوكس مقاوم للصدأ لجلي سريع ونظيف.', 'جودة معتمدة'),
  (101, 'بصل أحمر', 'veg', 'weight', 6.50, 'kg', 90, '🧅', '/images/products/vegetables/onion-red.webp', TRUE, 'بصل أحمر طازج ذو نكهة قوية وغني بالفوائد الصحية.', 'سايس / فاس'),
  (102, 'فلفل حار أحمر (مزاود)', 'veg', 'weight', 12.00, 'kg', 30, '🌶️', '/images/products/vegetables/hot-pepper.webp', TRUE, 'فلفل حار أحمر بلدي لعشاق المذاق الحار مع الطاجين والكسكس.', 'أكادير سوس'),
  (103, 'سفرجل بلدي', 'veg', 'weight', 12.00, 'kg', 30, '🍐', '/images/products/vegetables/quince.webp', TRUE, 'سفرجل بلدي عطر، مثالي للتعسال وتحضير طاجين اللحم بالسفرجل.', 'نواحي فاس / صفرو'),
  (104, 'جلبانة خضراء (بازلاء)', 'veg', 'weight', 14.00, 'kg', 35, '🫛', '/images/products/vegetables/peas.webp', TRUE, 'جلبانة طرية وحلوة المذاق، أساسية في الطواجن المغربية.', 'الغرب'),
  (105, 'لفت أبيض بلدي', 'veg', 'weight', 6.50, 'kg', 50, '🥕', '/images/products/vegetables/turnip-white.webp', TRUE, 'لفت أبيض طري وحلو، أساسي للكسكس والطواجن المغربية.', 'سايس / فاس'),
  (106, 'فجل أحمر طازج', 'veg', 'unit', 3.00, 'ربطة', 45, '🌱', '/images/products/vegetables/radish.webp', TRUE, 'فجل أحمر مقرمش ومنعش، مقطوف يومياً للسلطات والمائدة.', 'مزارع فاس'),
  (107, 'نعناع طازج', 'veg', 'unit', 2.00, 'باقة', 70, '🌿', '/images/products/vegetables/mint.webp', TRUE, 'نعناع أخضر معطر، أساسي لأتاي مغربي أصيل.', 'مزارع فاس'),
  (108, 'كزبرة طازجة (قزبر)', 'veg', 'unit', 2.50, 'باقة', 60, '🌿', '/images/products/vegetables/coriander.webp', TRUE, 'قزبر أخضر طازج ومعطر، ركن أساسي للحريرة والشرمولة المغربية.', 'مزارع فاس'),
  (109, 'لويزة خضراء طازجة', 'veg', 'unit', 3.00, 'باقة', 40, '🌿', '/images/products/vegetables/verbena.webp', TRUE, 'لويزة خضراء عطرة ومهدئة للأعصاب، رائعة مع الشاي أو الحليب.', 'مزارع فاس'),
  (110, 'بقدونس طازج (معدنوس)', 'veg', 'unit', 2.50, 'باقة', 60, '🌿', '/images/products/vegetables/parcley.webp', TRUE, 'معدنوس أخضر طازج مقطوف صبيحة اليوم للسلطات والطبخ.', 'مزارع فاس'),
  (111, 'فلفل أخضر حلو', 'veg', 'weight', 8.50, 'kg', 50, '🫑', '/images/products/vegetables/pepper-green.webp', TRUE, 'فلفل أخضر حلو طازج ومقرمش، مثالي للسلطات، الشكشوكة والتكتوكة المغربية.', 'سوس ماسة'),
  (112, 'فلفل أصفر حلو', 'veg', 'weight', 11.00, 'kg', 35, '🫑', '/images/products/vegetables/pepper-yellow.webp', TRUE, 'فلفل أصفر حلو زاهي وغني بفيتامين C، رائع للسلطات الراقية والأطباق المشوية.', 'سوس ماسة'),
  (901, 'صندوق عائلة صغيرة', 'veg', 'unit', 89.00, 'صندوق', 100, '🥬', '/images/family-boxes/family-box-small.webp', TRUE, 'تشكيلة متوازنة ومختارة بعناية من الخضار والفواكه لـ 2-3 أفراد.', 'مزارع مغربية ممتازة'),
  (902, 'صندوق عائلة متوسطة', 'veg', 'unit', 139.00, 'صندوق', 100, '🥬', '/images/family-boxes/family-box-medium.webp', TRUE, 'سلة أسبوعية غنية تغطي احتياجات 4-5 أفراد خضار وفواكه طازجة.', 'مزارع مغربية ممتازة'),
  (903, 'صندوق عائلة كبيرة (VIP)', 'veg', 'unit', 199.00, 'صندوق', 100, '👑', '/images/family-boxes/family-box-large.webp', TRUE, 'سلة ملكية شاملة وكاملة لـ 6-8 أفراد تكفي الأسبوع كاملاً.', 'مزارع مغربية ممتازة')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  price = EXCLUDED.price,
  unit_label = EXCLUDED.unit_label,
  stock = EXCLUDED.stock,
  icon = EXCLUDED.icon,
  image_url = EXCLUDED.image_url,
  active = EXCLUDED.active,
  description = EXCLUDED.description,
  origin = EXCLUDED.origin,
  updated_at = NOW();
