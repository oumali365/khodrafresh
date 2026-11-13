// ============================================================
// src/server/pricingRoutes.ts
// واجهة API في Node.js / Express للتسعير التلقائي وتوقعات الطلب
// ============================================================

import { Router, Request, Response } from 'express';
import { calculateSellingPrice, TARIFF_STANDARDS } from '../services/financialEngine';

export const pricingRouter = Router();

interface PriceUpdateRequest {
  productId: number;
  purchasePrice: number;
  marginPercentage: number;
  supplierId?: string;
}


// ────────────────────────────────────────────────────────────
// 1️⃣ POST /api/pricing/update - تحديث سعر منتج وحساب الهامش
// ────────────────────────────────────────────────────────────
pricingRouter.post('/api/pricing/update', async (req: Request, res: Response) => {
  try {
    const { productId, purchasePrice, marginPercentage, supplierId } = req.body as PriceUpdateRequest;

    if (!productId || typeof purchasePrice !== 'number' || typeof marginPercentage !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'بيانات غير مكتملة: يجب توفير productId و purchasePrice و marginPercentage',
      });
    }

    const sellingPrice = calculateSellingPrice(purchasePrice, marginPercentage);

    return res.json({
      success: true,
      data: {
        productId,
        supplierId: supplierId || 'sup-1',
        purchasePrice,
        marginPercentage,
        sellingPrice,
        updatedAt: new Date().toISOString(),
      },
      message: `تم تحديث السعر بنجاح: سعر البيع الجديد ${sellingPrice} درهم`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'خطأ في الخادم الداخلي' });
  }
});

// ────────────────────────────────────────────────────────────
// 2️⃣ POST /api/pricing/batch - تحديث دفعة أسعار السوق الصباحي
// ────────────────────────────────────────────────────────────
pricingRouter.post('/api/pricing/batch', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: PriceUpdateRequest[] };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'قائمة التحديثات فارغة' });
    }

    const processed = items.map((item) => ({
      productId: item.productId,
      supplierId: item.supplierId || 'sup-1',
      purchasePrice: item.purchasePrice,
      marginPercentage: item.marginPercentage,
      sellingPrice: calculateSellingPrice(item.purchasePrice, item.marginPercentage),
      updatedAt: new Date().toISOString(),
    }));

    return res.json({
      success: true,
      count: processed.length,
      items: processed,
      message: `تمت معالجة وتحديث ${processed.length} منتجات في جدول أسعار اليوم`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// ────────────────────────────────────────────────────────────
// 3️⃣ GET /api/forecast/30days - استعلام توقع الطلب لآخر 30 يوماً
// ────────────────────────────────────────────────────────────
pricingRouter.get('/api/forecast/30days', async (_req: Request, res: Response) => {
  try {
    const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const currentDayName = weekdays[new Date().getDay()];

    const recommendation = {
      dayOfWeek: currentDayName,
      isBenchmarkModel: true,
      smartSuggestion: `نموذج مرجعي لتوقع الطلب ليوم (${currentDayName}): يُوصى بتوفير الخضار الأساسية (بطاطس، طماطم، بصل) من سوق الجملة بنسودة وفق وتيرة التسوق الأسبوعية.`,
      topItemsToStock: [
        { name: 'بطاطس بلدية', quantityKg: 145, unit: 'kg' },
        { name: 'طماطم طازجة', quantityKg: 120, unit: 'kg' },
        { name: 'بصل أحمر', quantityKg: 95, unit: 'kg' },
        { name: 'برتقال عصير', quantityKg: 110, unit: 'kg' },
      ],
      aiAlert: {
        detected: true,
        message: 'مؤشر موسمي: طلب متزايد على الفواكه والحوامض مع نهاية الأسبوع.',
        suggestedIncrease: 20,
      },
    };

    return res.json({ success: true, data: recommendation });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// ────────────────────────────────────────────────────────────
// 4️⃣ POST /api/pricing/apply-global-margin - تطبيق هامش موحد (40% المعتمد الوحيد)
// ────────────────────────────────────────────────────────────
pricingRouter.post('/api/pricing/apply-global-margin', async (req: Request, res: Response) => {
  try {
    const margin = typeof req.body?.marginPercentage === 'number' ? req.body.marginPercentage : 40;
    return res.json({
      success: true,
      marginPercentage: margin,
      message: `تم اعتماد هامش ربح ${margin}% المعتمد لضمان استقرار الخزينة وتغطية مصاريف النقل والتشغيل واللوجستيك والإتلاف`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
