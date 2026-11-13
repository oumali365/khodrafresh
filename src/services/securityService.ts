// ============================================================
// securityService.ts – نظام الأمان والحماية لمتجر خُضرة
// يشمل: Cooldown (3 دقائق) + Rate Limit (3/ساعة) + Idempotency Key
// + بصمة الجهاز (Fingerprint) + Client ID + فحص الأرقام المغربية
// ============================================================

const CLIENT_ID_KEY = 'khodra_client_id_v2';
const LAST_ORDER_TIME_KEY = 'khodra_last_order_timestamp_v2';
const ORDER_HISTORY_TIMESTAMPS_KEY = 'khodra_order_timestamps_v2';

// ثوابت الحماية
export const SECURITY_CONFIG = {
  cooldownSeconds: 180,       // 3 دقائق فترة تهدئة بين الطلبات لنفس المستخدم
  maxOrdersPerHour: 3,        // أقصى عدد طلبات مسموح بها في الساعة الواحدة
  rateLimitWindowMs: 60 * 60 * 1000, // نافذة الساعة الواحدة (60 دقيقة)
};

/**
 * توليد أو استرجاع Client ID فريد ودائم للجهاز والمتصفح
 */
export function getClientId(): string {
  try {
    let clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
      const randomPart = Math.random().toString(36).substring(2, 10);
      const timePart = Date.now().toString(36);
      clientId = `kh_cli_${timePart}_${randomPart}`;
      localStorage.setItem(CLIENT_ID_KEY, clientId);
    }
    return clientId;
  } catch {
    return `kh_cli_temp_${Date.now()}`;
  }
}

/**
 * توليد بصمة فريدة للجهاز والمتصفح (Device Fingerprint)
 * دون انتهاك الخصوصية، عبر خصائص الشاشة والنظام
 */
export function getDeviceFingerprint(): string {
  try {
    const nav = typeof window !== 'undefined' ? window.navigator : ({} as any);
    const screen = typeof window !== 'undefined' ? window.screen : ({} as any);

    const components = [
      nav.userAgent || '',
      nav.language || '',
      screen.width || 0,
      screen.height || 0,
      screen.colorDepth || 0,
      window.devicePixelRatio || 1,
      nav.hardwareConcurrency || 2,
      new Date().getTimezoneOffset(),
    ];

    // خوارزمية Hash خفيفة وسريعة (DJB2)
    let hash = 5381;
    const str = components.join('###');
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `fp_${Math.abs(hash).toString(36)}`;
  } catch {
    return 'fp_unknown';
  }
}

/**
 * جلب عنوان IP العام للمستخدم للتتبع والحماية (مع مهلة قصيرة 2 ثانية)
 */
export async function fetchClientIp(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return data?.ip || null;
    }
  } catch {
    // فشل هادئ في حال انقطاع الشبكة أو حظر الطلب
  }
  return null;
}

/**
 * فحص فترة التهدئة (Cooldown 3 دقائق)
 * يمنع إرسال طلب ثانٍ متطابق أو سريع جداً قبل مرور 3 دقائق
 */
export function checkOrderCooldown(): {
  inCooldown: boolean;
  remainingSeconds: number;
  remainingFormatted: string;
} {
  try {
    const lastTimeStr = localStorage.getItem(LAST_ORDER_TIME_KEY);
    if (!lastTimeStr) {
      return { inCooldown: false, remainingSeconds: 0, remainingFormatted: '00:00' };
    }

    const lastTime = parseInt(lastTimeStr, 10);
    if (isNaN(lastTime)) {
      return { inCooldown: false, remainingSeconds: 0, remainingFormatted: '00:00' };
    }

    const elapsedSeconds = Math.floor((Date.now() - lastTime) / 1000);
    const remainingSeconds = SECURITY_CONFIG.cooldownSeconds - elapsedSeconds;

    if (remainingSeconds > 0) {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      return { inCooldown: true, remainingSeconds, remainingFormatted: formatted };
    }
  } catch {
    // ignore
  }

  return { inCooldown: false, remainingSeconds: 0, remainingFormatted: '00:00' };
}

/**
 * فحص معدل الطلبات في المتصفح (Rate Limit: أقصى حد 3 طلبات في الساعة)
 */
export function checkClientRateLimit(): {
  allowed: boolean;
  count: number;
  limit: number;
  resetInMinutes: number;
} {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_TIMESTAMPS_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];

    const now = Date.now();
    // تصفية الطوابع الزمنية التي مر عليها أقل من ساعة
    const recentTimestamps = timestamps.filter(
      (ts) => typeof ts === 'number' && now - ts < SECURITY_CONFIG.rateLimitWindowMs
    );

    // تحديث التخزين بالتنظيف التلقائي
    if (recentTimestamps.length !== timestamps.length) {
      localStorage.setItem(ORDER_HISTORY_TIMESTAMPS_KEY, JSON.stringify(recentTimestamps));
    }

    if (recentTimestamps.length >= SECURITY_CONFIG.maxOrdersPerHour) {
      const oldest = recentTimestamps[0] || now;
      const remainingMs = Math.max(0, (oldest + SECURITY_CONFIG.rateLimitWindowMs) - now);
      const resetInMinutes = Math.ceil(remainingMs / 60000);

      return {
        allowed: false,
        count: recentTimestamps.length,
        limit: SECURITY_CONFIG.maxOrdersPerHour,
        resetInMinutes,
      };
    }

    return {
      allowed: true,
      count: recentTimestamps.length,
      limit: SECURITY_CONFIG.maxOrdersPerHour,
      resetInMinutes: 0,
    };
  } catch {
    return { allowed: true, count: 0, limit: SECURITY_CONFIG.maxOrdersPerHour, resetInMinutes: 0 };
  }
}

/**
 * تسجيل نجاح طلب جديد لتفعيل الـ Cooldown وعداد الـ Rate Limit
 */
export function recordOrderSuccess(orderCode: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const now = Date.now();
    localStorage.setItem(LAST_ORDER_TIME_KEY, now.toString());

    const raw = localStorage.getItem(ORDER_HISTORY_TIMESTAMPS_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps.push(now);

    // تصفية أقدم من ساعة
    const valid = timestamps.filter((ts) => now - ts < SECURITY_CONFIG.rateLimitWindowMs);
    localStorage.setItem(ORDER_HISTORY_TIMESTAMPS_KEY, JSON.stringify(valid));
  } catch (e) {
    console.warn('Failed to record order security timestamp:', e);
  }
}

/**
 * توليد مفتاح منع التكرار (Idempotency Key)
 * يمنع إنشاء طلبين إذا ضغط المستخدم مرتين أو حدثت إعادة إرسال شبكية
 */
export function generateIdempotencyKey(
  clientId: string,
  phone: string,
  cartTotal: number,
  itemsCount: number
): string {
  const cleanPhone = phone.replace(/\D/g, '');
  // نافذة زمنية مدتها 5 دقائق لضمان ثبات المفتاح في نفس محاولة الطلب
  const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000));
  return `idemp_${clientId.slice(-8)}_${cleanPhone.slice(-6)}_${cartTotal.toFixed(0)}t${itemsCount}_w${timeWindow}`;
}

/**
 * تنظيف المدخلات النصية من أي شفرات خبيثة أو هجمات XSS
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // إزالة وسوم HTML
    .replace(/javascript:/gi, '')
    .replace(/[;%]/g, ' ')
    .trim();
}

/**
 * فحص دقيق لرقم الهاتف المغربي ومنع الأرقام العشوائية أو الوهمية
 */
export function validateMoroccanPhone(phoneInput: string): {
  valid: boolean;
  cleanPhone: string;
  error?: string;
} {
  const cleaned = phoneInput.replace(/[\s\-\.\(\)]/g, '');

  if (!cleaned) {
    return { valid: false, cleanPhone: '', error: 'يرجى إدخال رقم الهاتف للتواصل' };
  }

  // تحويل الصيغ الدولية (+212 أو 00212 أو 212) إلى الصيغة المحلية 06/07/05
  let localFormat = cleaned;
  if (localFormat.startsWith('+212')) {
    localFormat = '0' + localFormat.slice(4);
  } else if (localFormat.startsWith('00212')) {
    localFormat = '0' + localFormat.slice(5);
  } else if (localFormat.startsWith('212')) {
    localFormat = '0' + localFormat.slice(3);
  } else if (!localFormat.startsWith('0') && (localFormat.startsWith('6') || localFormat.startsWith('7') || localFormat.startsWith('5'))) {
    localFormat = '0' + localFormat;
  }

  // التحقق من الطول وصيغة البداية المغربية
  const moroccanRegex = /^0[567]\d{8}$/;
  if (!moroccanRegex.test(localFormat)) {
    return {
      valid: false,
      cleanPhone: localFormat,
      error: 'يرجى إدخال رقم هاتف مغربي صحيح مكون من 10 أرقام (مثال: 0612345678)',
    };
  }

  // كشف الأرقام الوهمية أو المتكررة (مثل 0600000000 أو 0612345678 التسلسلي)
  const afterPrefix = localFormat.slice(2);
  const isRepeating = /^(\d)\1{7}$/.test(afterPrefix); // 8 أرقام متطابقة
  const isSequential = '0123456789'.includes(afterPrefix) || '9876543210'.includes(afterPrefix);

  if (isRepeating || isSequential || afterPrefix === '00000000' || afterPrefix === '12345678') {
    return {
      valid: false,
      cleanPhone: localFormat,
      error: 'رقم الهاتف يبدو غير حقيقي. يرجى إدخال رقم هاتفكم الفعلي للتواصل',
    };
  }

  return { valid: true, cleanPhone: localFormat };
}

/**
 * كشف الأسماء الوهمية أو محاولات السبام
 */
export function validateCustomerName(nameInput: string): {
  valid: boolean;
  cleanName: string;
  error?: string;
} {
  const cleaned = sanitizeInput(nameInput);

  if (!cleaned || cleaned.length < 3) {
    return { valid: false, cleanName: cleaned, error: 'الاسم يجب أن يحتوي على 3 أحرف على الأقل' };
  }

  if (cleaned.length > 50) {
    return { valid: false, cleanName: cleaned, error: 'الاسم طويل جداً' };
  }

  // كشف الأسماء التجريبية والمشبوهة
  const lower = cleaned.toLowerCase();
  const fakePatterns = ['test', 'asdf', 'qwerty', '123', 'admin', 'تجربة', 'تست', 'fake'];
  if (fakePatterns.some((pattern) => lower.includes(pattern))) {
    return { valid: false, cleanName: cleaned, error: 'يرجى إدخال اسمك الفعلي' };
  }

  // التأكد من أنه لا يحتوي على أرقام فقط
  if (/^\d+$/.test(cleaned)) {
    return { valid: false, cleanName: cleaned, error: 'الاسم لا يمكن أن يكون أرقاماً فقط' };
  }

  return { valid: true, cleanName: cleaned };
}
