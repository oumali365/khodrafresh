// ============================================================
// deliveryZones.ts – نظام المسارات الذكية وكشف العناوين بمدينة فاس
// خُضرة فاس – تقسيم 4 مناطق ذكية مع استبعاد العناوين الخارجية
// ============================================================

export type FezZoneId = 'north' | 'central' | 'south' | 'east';

export interface FezZoneConfig {
  id: FezZoneId;
  name: string;
  badgeLabel: string;
  targetTime: string;
  color: string;
  badgeClass: string;
  dotColor: string;
  borderClass: string;
  bgClass: string;
  neighborhoods: string[];
  description: string;
  keywords: string[];
}

// ─── 1. تقسيم مدينة فاس إلى 4 مسارات ذكية معتمدة ───
export const FEZ_DELIVERY_ZONES: Record<FezZoneId, FezZoneConfig> = {
  // 🟢 المنطقة الشمالية (الأطلس، النرجس، سايس...)
  north: {
    id: 'north',
    name: 'المنطقة الشمالية',
    badgeLabel: '🟢 المنطقة الشمالية',
    targetTime: '20-30 دقيقة',
    color: '#059669',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dotColor: 'bg-emerald-500',
    borderClass: 'border-emerald-200',
    bgClass: 'bg-emerald-50/50',
    neighborhoods: ['الأطلس', 'النرجس', 'حي سايس', 'الشارع الملكي', 'شارع مصر', 'حي السعادة', 'حي الرياض', 'عين عمير'],
    description: 'شوارع واسعة، حركة سريعة للدراجات والتوصيل الفوري',
    keywords: [
      'نرجس', 'النرجس', 'narjiss', 'narjis',
      'أطلس', 'الأطلس', 'atlas', 'latlas',
      'سايس', 'saiss', 'sais',
      'الشارع الملكي', 'شارع مصر',
      'السعادة', 'saada', 'سعاده',
      'الرياض', 'riad', 'riad fes',
      'عين عمير', 'ain omair', 'ain amir'
    ],
  },

  // 🟡 المنطقة الوسطى (إيموزار، المدينة الجديدة...)
  central: {
    id: 'central',
    name: 'المنطقة الوسطى',
    badgeLabel: '🟡 المنطقة الوسطى',
    targetTime: '20-30 دقيقة',
    color: '#d97706',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    dotColor: 'bg-amber-500',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50/50',
    neighborhoods: ['طريق إيموزار', 'المدينة الجديدة (فلورنس)', 'حي أكدال', 'ملعب الخيل', 'مونفلوري', 'حي الوفاء'],
    description: 'قلب فاس العصري، نشاط سكني وتجاري مكثف',
    keywords: [
      'إيموزار', 'ايموزار', 'imouzzer', 'imouzer', 'route imouzzer',
      'المدينة الجديدة', 'ville nouvelle', 'ville-nouvelle',
      'فلورنس', 'florence', 'place florence',
      'أكدال', 'اكدال', 'agdal', 'agdal fes',
      'ملعب الخيل', 'champ de course', 'champ-de-course',
      'مونفلوري', 'مون فلوري', 'montfleuri', 'mont fleuri',
      'الوفاء', 'el wafa', 'wafa'
    ],
  },

  // 🟠 المنطقة الجنوبية (بنسودة، زواغة، عين هارون...)
  south: {
    id: 'south',
    name: 'المنطقة الجنوبية',
    badgeLabel: '🟠 المنطقة الجنوبية',
    targetTime: '25-35 دقيقة',
    color: '#ea580c',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    dotColor: 'bg-orange-500',
    borderClass: 'border-orange-200',
    bgClass: 'bg-orange-50/50',
    neighborhoods: ['بنسودة', 'زواغة', 'عين هارون', 'حي الأمل', 'الحي الصناعي بنسودة', 'عين قادوس', 'حي طارق', 'المرينيين'],
    description: 'قرب نقطة تموين الجملة بمقر بنسودة، تسليم سريع ومباشر',
    keywords: [
      'بنسودة', 'بنسودة فاس', 'bensouda', 'ben souda',
      'زواغة', 'زواغه', 'zouagha', 'zwagha',
      'عين هارون', 'ain harroun', 'ain haroun',
      'الأمل', 'حي الامل', 'amal', 'hay amal',
      'الحي الصناعي', 'zone industrielle',
      'قادوس', 'عين قادوس', 'kadous', 'ain kadous',
      'طارق', 'حي طارق', 'tariq', 'hay tariq',
      'المرينيين', 'مرينيين', 'merinides', 'marinides'
    ],
  },

  // 🟣 المنطقة الرابعة: المنطقة الشرقية والتراثية (طريق صفرو، الزهور، فاس البالي...)
  east: {
    id: 'east',
    name: 'المنطقة الشرقية والتراثية',
    badgeLabel: '🟣 المنطقة الشرقية',
    targetTime: '30-40 دقيقة',
    color: '#7c3aed',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    dotColor: 'bg-purple-500',
    borderClass: 'border-purple-200',
    bgClass: 'bg-purple-50/50',
    neighborhoods: ['حي الزهور', 'طريق صفرو', 'فاس البالي', 'الرصيف', 'باب الفتوح', 'باب بوجلود', 'سيدي بوجيدة', 'عين النقبي', 'عين الشقف'],
    description: 'أحياء الزهور وطريق صفرو والمعالم التاريخية بفاس العريقة',
    keywords: [
      'زهور', 'حي الزهور', 'الزهور', 'zohour', 'zouhour', 'hay zohour',
      'طريق صفرو', 'صفرو', 'route de sefrou', 'route sefrou', 'sefrou',
      'فاس البالي', 'فاس القديمة', 'fes el bali', 'fes bali', 'medina',
      'الرصيف', 'رصيف', 'rcif', "r'cif",
      'باب الفتوح', 'bab ftouh', 'bab fettouh',
      'باب بوجلود', 'bab boujloud', 'boujloud',
      'سيدي بوجيدة', 'sidi boujida', 'boujida',
      'عين النقبي', 'ain nokbi', 'ain noqbi',
      'عين الشقف', 'عين شقف', 'ain chkef', 'ain cheggag', 'راس الماء'
    ],
  },
};

// ─── 2. القائمة السوداء للمدن والمناطق خارج مدينة فاس (Out of Area Blacklist) ───
export const OUT_OF_DELIVERY_CITIES = [
  'الرباط', 'rabat',
  'الدار البيضاء', 'البيضاء', 'كازا', 'casablanca', 'casa',
  'مراكش', 'marrakech', 'marrakesh',
  'طنجة', 'طنجة البوغاز', 'tanger', 'tangier',
  'أكادير', 'agadir',
  'مكناس', 'meknes', 'حمرية',
  'وجدة', 'oujda',
  'القنيطرة', 'kenitra',
  'تطوان', 'tetouan',
  'تمارة', 'temara',
  'سلا', 'sale', 'سلا الجديدة',
  'الجديدة', 'el jadida', 'eljadida',
  'آسفي', 'اسفي', 'safi',
  'المحمدية', 'mohammedia',
  'الناظور', 'nador',
  'بني ملال', 'beni mellal',
  'خريبكة', 'khouribga',
  'تازة', 'taza',
  'بركان', 'berkane',
  'الخميسات', 'khemisset',
  'كلميم', 'guelmim',
  'العيون', 'laayoune',
  'الداخلة', 'dakhla',
  'ورزازات', 'ouarzazate',
  'الحسيمة', 'al hoceima',
  'أصيلة', 'asilah',
  'المعاريف', 'حي المعاريف', 'gauthier', 'bourgone', // أحياء كازا
  'أكدال الرباط', 'حي الرياض الرباط', 'حسان', // أحياء الرباط
  'جيليز', 'gueliz', 'الداوديات', 'جليز', // أحياء مراكش
];

export interface AddressDetectionResult {
  status: 'accepted' | 'rejected' | 'ambiguous';
  zoneId?: FezZoneId;
  zoneConfig?: FezZoneConfig;
  zoneBadge?: string;
  zoneName?: string;
  estimatedTime?: string;
  confidence: 'high' | 'medium' | 'low';
  matchedKeyword?: string;
  message?: string;
}

/**
 * دالة تنظيف النص العربي واللاتيني للمطابقة الذكية
 */
function normalizeSearchText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // تشكيل
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[-_.,/\\()#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 🧠 الفلترة الذكية لكشف عنوان الزبون:
 * - سيناريو 1: عنوان صحيح ومطابق لأحد مسارات فاس الـ 4 -> accepted
 * - سيناريو 2: عنوان خارج فاس (مدينة أخرى) -> rejected
 * - سيناريو 3: عنوان عام وغامض (مثل "شارع محمد الخامس") -> ambiguous
 */
export function detectAddressZone(rawAddress: string = ''): AddressDetectionResult {
  const norm = normalizeSearchText(rawAddress);

  if (!norm || norm.length < 3) {
    return {
      status: 'ambiguous',
      confidence: 'low',
    };
  }

  // 1️⃣ فحص إذا كان العنوان يذكر مدينة أخرى خارج فاس (سيناريو 2: مرفوض فوراً)
  for (const city of OUT_OF_DELIVERY_CITIES) {
    const normCity = normalizeSearchText(city);
    // التحقق من ورود اسم المدينة ككلمة مستقلة أو محاطة بفواصل
    const regex = new RegExp(`(^|\\s)${normCity}(\\s|$)`, 'i');
    if (regex.test(norm)) {
      return {
        status: 'rejected',
        confidence: 'high',
        matchedKeyword: city,
        message: `⚠️ خارج نطاق التوصيل: متجر خُضرة يخدم حصرياً أحياء مدينة فاس ونواحيها المعتمدة في الوقت الحالي.`,
      };
    }
  }

  // 2️⃣ فحص التطابق مع مسارات فاس الأربعة (سيناريو 1: مقبول)
  const zoneIds: FezZoneId[] = ['north', 'central', 'south', 'east'];

  for (const zid of zoneIds) {
    const zone = FEZ_DELIVERY_ZONES[zid];
    for (const kw of zone.keywords) {
      const normKw = normalizeSearchText(kw);
      if (norm.includes(normKw)) {
        return {
          status: 'accepted',
          zoneId: zid,
          zoneConfig: zone,
          zoneBadge: zone.badgeLabel,
          zoneName: zone.name,
          estimatedTime: zone.targetTime,
          confidence: 'high',
          matchedKeyword: kw,
          message: `${zone.badgeLabel} - التوصيل متوقع خلال ${zone.targetTime}`,
        };
      }
    }
  }

  // 3️⃣ إذا ذكر الزبون كلمة "فاس" أو "fes" بدون تحديد حي واضح
  if (norm.includes('فاس') || norm.includes('fes') || norm.includes('fez')) {
    return {
      status: 'ambiguous',
      confidence: 'medium',
      message: 'تم تحديد مدينة فاس، سيتم مراجعة الحي بدقة من طرف فريق التوصيل.',
    };
  }

  // 4️⃣ سيناريو 3: عنوان غامض أو غير محدد (مثل: "شارع محمد الخامس"، "عمارة 4")
  // لا نظهر رسالة سلبية ولا إيجابية، ونقبل الطلب ليراجعه المدير يدوياً
  return {
    status: 'ambiguous',
    confidence: 'low',
  };
}
