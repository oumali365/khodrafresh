import { BankAccount, DeliverySlot } from '../types';
export { FEZ_DELIVERY_ZONES, OUT_OF_DELIVERY_CITIES, detectAddressZone } from './deliveryZones';
export type { FezZoneId, FezZoneConfig, AddressDetectionResult } from './deliveryZones';

export const STORE_CONFIG = {
  storeName: 'خُضرة',
  tagline: 'خضر وفواكه طازجة توصيل لباب منزلك',
  city: 'فاس والنواحي',
  whatsappNumber: '+212704274830',
  whatsappCleanNumber: '212704274830',
  currency: 'DH',
  standardDeliveryFee: 15,
  minOrderAmount: 70, // الحد الأدنى للطلب (70 د.م شامل رسوم التوصيل) لتأمين المتجر من الخسارة وتغطية تكاليف الإعداد والتوصيل
  freeDeliveryThreshold: 250,
  freshnessMaxItems: 12,
  weightStep: 0.5,
  weightMax: 10,
  cacheKey: 'khodra_cart_v2',
  supabaseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '',
  supabaseAnonKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '',
  cloudflareTurnstileSiteKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY) || '',
};

export const MOROCCAN_BANKS: BankAccount[] = [
  {
    id: 'barid',
    name: 'Al BARID (Barid Bank)',
    shortName: 'Al BARID',
    image: '/images/banks/barid-banque.webp',
    icon: '📮',
    rib: '350 810 0000000000000012 45',
    beneficiary: 'خُضرة فريش',
    city: 'فاس'
  },
  {
    id: 'chaabi',
    name: 'CHAABI (Banque Populaire)',
    shortName: 'CHAABI',
    image: '/images/banks/banque-populaire.webp',
    icon: '🐎',
    rib: '210 780 0000000000000034 67',
    beneficiary: 'خُضرة فريش',
    city: 'فاس'
  },
  {
    id: 'cih',
    name: 'CIH (العقاري والسياحي)',
    shortName: 'CIH',
    image: '/images/banks/cih-bank.webp',
    icon: '🏛️',
    rib: '230 640 0000000000000056 89',
    beneficiary: 'خُضرة فريش',
    city: 'فاس'
  },
  {
    id: 'tijjari',
    name: 'TIJJARI (Attijariwafa)',
    shortName: 'TIJJARI',
    image: '/images/banks/attijariwafa-bank.webp',
    icon: '🦅',
    rib: '007 810 0000000000000078 21',
    beneficiary: 'خُضرة فريش',
    city: 'فاس'
  },
  {
    id: 'boafrica',
    name: 'BMCE (Bank of Africa)',
    shortName: 'BMCE',
    image: '/images/banks/bank-of-africa.webp',
    icon: '🌍',
    rib: '000 240 0000000000000090 12',
    beneficiary: 'خُضرة فريش',
    city: 'فاس'
  },
  {
    id: 'cashplus',
    name: 'CASHPLUS (Cash Plus)',
    shortName: 'CASHPLUS',
    image: '/images/banks/cash-plus.webp',
    icon: '⚡',
    rib: '222 180 0000000000000100 34',
    beneficiary: 'خُضرة فريش',
    city: 'فاس'
  }
];

export const DELIVERY_SLOTS: DeliverySlot[] = [
  {
    id: 'instant_express',
    label: '⚡ توصيل فوري (inDrive Express خلال 45-60 دقيقة)',
    cutoffHour: 20,
    periodText: 'فوري الآن',
    isInstant: true,
  },
  {
    id: 'today_10_12',
    label: 'اليوم 10:00 و 12:00 (صباحاً)',
    cutoffHour: 9,
    periodText: 'صباحاً'
  },
  {
    id: 'today_18_21',
    label: 'اليوم 18:00 و 21:00 (مساءً)',
    cutoffHour: 18,
    periodText: 'مساءً'
  },
  {
    id: 'tomorrow_10_12',
    label: 'غداً 10:00 و 12:00 (صباحاً)',
    cutoffHour: null,
    periodText: 'صباحاً'
  },
  {
    id: 'tomorrow_18_21',
    label: 'غداً 18:00 و 21:00 (مساءً)',
    cutoffHour: null,
    periodText: 'مساءً'
  }
];

// ─── شركات وتطبيقات التوصيل الفوري بفاس ───
export const DELIVERY_PROVIDERS = [
  {
    id: 'indrive' as const,
    name: 'inDrive Delivery',
    badgeClass: 'bg-emerald-600 text-white',
    icon: '🚴',
    appUrl: 'https://indrive.com',
    recommended: true,
  },
  {
    id: 'done' as const,
    name: 'DONE Delivery',
    badgeClass: 'bg-indigo-600 text-white',
    icon: '⚡',
    appUrl: 'https://done.ma',
    recommended: false,
  },
  {
    id: 'yassir' as const,
    name: 'Yassir Express',
    badgeClass: 'bg-red-600 text-white',
    icon: '🛵',
    appUrl: 'https://yassir.com',
    recommended: false,
  },
  {
    id: 'glovo' as const,
    name: 'Glovo Express',
    badgeClass: 'bg-amber-500 text-black font-bold',
    icon: '🟡',
    appUrl: 'https://glovoapp.com',
    recommended: false,
  },
];

// نقطة التجميع والتموين الأساسية
export const STORE_PICKUP_HUB = {
  name: 'سوق الجملة للخضر والفواكه بنسودة / مقر خُضرة',
  address: 'المنطقة الصناعية بنسودة، فاس',
  mapsLink: 'https://maps.google.com/?q=Bensouda+Wholesale+Market+Fes',
};

