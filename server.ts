// ============================================================
// server.ts - الخادم الرئيسي المتكامل لمنصة خُضرة — فاس
// يدمج Express API الخلفية مع وسائط تطوير Vite
// ============================================================

// ① تحميل متغيرات البيئة أولاً قبل أي استيراد آخر
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { pricingRouter } from './src/server/pricingRoutes';
import { aiRouter } from './src/server/aiRoutes';
import { adminAuthRouter } from './src/server/adminAuthRoutes';
import { securityRouter } from './src/server/securityRoutes';
import { getSupabaseConnectionStatus } from './src/server/supabaseServerClient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // ② رؤوس CORS — تسمح للواجهة بالاتصال بالـ API
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // ③ معالجة نصوص JSON مع حد حجم آمن
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ④ مسار فحص الصحة — يظهر ما إذا كانت الخدمات مهيأة بدون كشف أي أسرار
  app.get('/api/health', (_req: Request, res: Response) => {
    const supabase = getSupabaseConnectionStatus();
    res.json({
      status: 'ok',
      service: 'Khodra Fès Fullstack Server',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      supabaseConfigured: supabase.isConfigured,
      supabaseStatus: {
        hasUrl: supabase.hasUrl,
        keyRole: supabase.keyRole,
        clientReady: supabase.clientReady,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // ⑤ ربط مسارات الواجهة الخلفية
  app.use(pricingRouter);
  app.use(aiRouter);
  app.use(adminAuthRouter);
  app.use(securityRouter);

  if (!isProduction) {
    // وضع التطوير: تركيب وسائط Vite داخل Express
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('⚡ Vite dev middleware mounted successfully in Express');
  } else {
    // وضع الإنتاج: تقديم الملفات المبنية من مجلد dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`📦 Serving production build from ${distPath}`);
  }

  // ⑥ معالج الأخطاء العام
  app.use((err: any, _req: Request, res: Response, _next: any) => {
    console.error('[Server Error]', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'خطأ داخلي في الخادم',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ مُحمّل' : '❌ مفقود'}`);
    const sb = getSupabaseConnectionStatus();
    console.log(`🗄️ Supabase Server Client: ${sb.isConfigured ? `✅ مهيأ (${sb.keyRole})` : 'ℹ️ غير مهيأ (وضع الاستعلام الآمن)'}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting Khodra server:', err);
  process.exit(1);
});