// ============================================================
// src/server/supabaseServerClient.ts
// عميل Supabase المخصص للواجهة الخلفية (Server-Side)
// يدعم الاستعلام الآمن للقراءة فقط من جداول المتجر
// يلتزم بالسرية الصارمة: لا تُعرض أو تُمرر أي مفاتيح في السجلات أو الاستجابات
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverSupabase: SupabaseClient | null = null;
let hasLoggedInit = false;

export interface SafeSupabaseStatus {
  isConfigured: boolean;
  hasUrl: boolean;
  keyRole: 'service_role' | 'anon' | 'missing';
  clientReady: boolean;
}

interface SupabaseCredentials {
  url: string;
  key: string;
  role: 'service_role' | 'anon';
}

/**
 * تنظيف القيمة من علامات التنصيص والمسافات الزائدة
 */
function cleanEnvValue(val?: string | null): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

/**
 * استخراج بيانات الاتصال بـ Supabase من متغيرات البيئة بصورة موحدة وآمنة
 */
function getSupabaseCredentials(): SupabaseCredentials | null {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const url = cleanEnvValue(rawUrl);

  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rawAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const serviceKey = cleanEnvValue(rawServiceKey);
  const anonKey = cleanEnvValue(rawAnonKey);

  const key = serviceKey || anonKey;
  const role: 'service_role' | 'anon' = serviceKey ? 'service_role' : 'anon';

  if (url && key && url.startsWith('http')) {
    return { url, key, role };
  }
  return null;
}

/**
 * الحصول على عميل Supabase للواجهة الخلفية
 */
export function getServerSupabase(): SupabaseClient | null {
  if (serverSupabase) return serverSupabase;

  const creds = getSupabaseCredentials();

  if (creds) {
    try {
      serverSupabase = createClient(creds.url, creds.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      if (!hasLoggedInit) {
        console.log(`✅ [Supabase Server] Client initialized successfully (Role: ${creds.role})`);
        hasLoggedInit = true;
      }
    } catch (err: any) {
      console.warn('⚠️ [Supabase Server] Client initialization failed:', err?.message || err);
      serverSupabase = null;
    }
  } else if (!hasLoggedInit) {
    console.log('ℹ️ [Supabase Server] Credentials not configured in env (read-only safe fallback)');
    hasLoggedInit = true;
  }

  return serverSupabase;
}

/**
 * التحقق من توفر متغيرات الاتصال بقاعدة البيانات
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseCredentials() !== null;
}

/**
 * الحصول على حالة اتصال Supabase بصورة آمنة ومجردة من الأسرار
 */
export function getSupabaseConnectionStatus(): SafeSupabaseStatus {
  const creds = getSupabaseCredentials();
  const rawUrl = cleanEnvValue(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);

  return {
    isConfigured: creds !== null,
    hasUrl: Boolean(rawUrl && rawUrl.startsWith('http')),
    keyRole: creds ? creds.role : 'missing',
    clientReady: getServerSupabase() !== null,
  };
}

/**
 * فحص الاتصال الفعلي بقاعدة البيانات عبر استعلام تجريبي خفيف
 * يعيد تقريراً منظماً يميز بين: نجاح الاتصال، فشل الاستعلام، أو عدم توفر الإعدادات
 */
export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  status: 'connected' | 'query_error' | 'not_configured';
  message: string;
  keyRole: 'service_role' | 'anon' | 'missing';
}> {
  const status = getSupabaseConnectionStatus();
  if (!status.isConfigured) {
    return {
      ok: false,
      status: 'not_configured',
      message: 'متغيرات الاتصال بـ Supabase غير مهيأة في بيئة الخادم.',
      keyRole: 'missing',
    };
  }

  const client = getServerSupabase();
  if (!client) {
    return {
      ok: false,
      status: 'not_configured',
      message: 'تعذر إنشاء عميل Supabase على الخادم.',
      keyRole: status.keyRole,
    };
  }

  try {
    const { error, count } = await client
      .from('products')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return {
        ok: false,
        status: 'query_error',
        message: `فشل استعلام فحص الاتصال: ${error.message}`,
        keyRole: status.keyRole,
      };
    }

    return {
      ok: true,
      status: 'connected',
      message: `تم التحقق بنجاح من اتصال قاعدة بيانات Supabase (سجل المنتجات: ${count ?? 0} عنصر).`,
      keyRole: status.keyRole,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 'query_error',
      message: `خطأ شبكة أثناء فحص الاتصال بـ Supabase: ${err?.message || 'خطأ غير معروف'}`,
      keyRole: status.keyRole,
    };
  }
}
