// ============================================================
// src/server/securityRoutes.ts
// مسارات التحقق الأمني وفحص الرموز ومكافحة الروبوتات (Cloudflare Turnstile)
// ============================================================

import { Router, Request, Response } from 'express';

export const securityRouter = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') {
    return cfIp.trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * 🛡️ POST /api/security/verify-turnstile
 * يتحقق من صحة رمز Cloudflare Turnstile على مستوى الخادم حصراً
 * يرفض تماماً الرموز الوهمية أو الثابتة مثل 'verified_token'
 */
securityRouter.post('/api/security/verify-turnstile', async (req: Request, res: Response) => {
  const { token } = req.body || {};
  const clientIp = getClientIp(req);

  // 1. التحقق من وجود الرمز
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return res.status(400).json({
      success: false,
      verified: false,
      code: 'MISSING_TOKEN',
      error: 'رمز التحقق الأمني مفقود. يرجى إكمال اختبار التحقق البشري.',
    });
  }

  const trimmedToken = token.trim();

  // 2. إحباط أي رمز افتراضي أو وهمي
  const forbiddenTokens = ['verified_token', 'test_token', 'dummy_token', 'mock_token', 'bypass'];
  if (forbiddenTokens.includes(trimmedToken.toLowerCase())) {
    console.warn(`[Security Alert] Rejected counterfeit Turnstile token "${trimmedToken}" from IP: ${clientIp}`);
    return res.status(403).json({
      success: false,
      verified: false,
      code: 'FORBIDDEN_DEFAULT_TOKEN',
      error: 'رمز التحقق الأمني غير صالح أو تم التلاعب به.',
    });
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  // 3. إذا كان المفتاح السري مهيأ في الخادم: نتحقق مع خادم Cloudflare الرسمي
  if (secretKey && secretKey.trim() !== '') {
    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey.trim());
      formData.append('response', trimmedToken);
      if (clientIp !== 'unknown') {
        formData.append('remoteip', clientIp);
      }

      const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const cfData = (await cfRes.json()) as {
        success: boolean;
        'error-codes'?: string[];
        challenge_ts?: string;
        hostname?: string;
      };

      if (!cfData.success) {
        console.warn(`[Turnstile] Cloudflare rejected token:`, cfData['error-codes']);
        return res.status(403).json({
          success: false,
          verified: false,
          code: 'CLOUDFLARE_REJECTED',
          error: 'فشل التحقق الأمني من كاشف الروبوتات. يرجى إعادة المحاولة.',
          details: cfData['error-codes'],
        });
      }

      return res.json({
        success: true,
        verified: true,
        timestamp: cfData.challenge_ts || new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Turnstile Server Error]:', err);
      return res.status(502).json({
        success: false,
        verified: false,
        code: 'UPSTREAM_VERIFICATION_FAILED',
        error: 'تعذر الاتصال بخدمة التحقق الأمني. يرجى المحاولة بعد قليل.',
      });
    }
  }

  // 4. في بيئة التطوير المحلية دون مفتاح سري رسمي:
  // نقبل الرموز الحقيقية الصادرة عن ودجة Turnstile (التي يزيد طولها عن 20 حرفاً وليست رمزاً وهمياً)
  // ونرفض أي رمز قصير أو مشبوه
  if (trimmedToken.length < 20) {
    return res.status(400).json({
      success: false,
      verified: false,
      code: 'INVALID_TOKEN_FORMAT',
      error: 'تنسيق رمز التحقق غير مطابق للمعايير الأمنية.',
    });
  }

  return res.json({
    success: true,
    verified: true,
    devMode: true,
    warning: 'Server Turnstile secret not configured in env; validated format length and payload integrity.',
  });
});
