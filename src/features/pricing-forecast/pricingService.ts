// ============================================================
// src/features/pricing-forecast/pricingService.ts
// خدمة إدارة الموردين، التسعير التلقائي وحساب توقعات الطلب
// ============================================================

import { getSupabase, fetchProducts } from '../../services/supabaseService';
import { logger } from '../../utils/logger';
import { INITIAL_PRODUCTS } from '../../data/mockProducts';
import type {
  Supplier,
  ProductPriceRow,
} from './types';
import { DEFAULT_PROFIT_MARGIN } from './types';

// الموردون الأوليون المعتمدون في سوق الجملة بنسودة فاس
export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'الحاج المفضل بنجلون',
    phone: '0661234567',
    specialty: 'بطاطس وبصل وخضر شتوية (جناح أ - سوق بنسودة)',
    rating: 5,
    notes: 'مورد موثوق منذ 12 سنة، جودة بطاطس الشاوية وتادلة منتقاة.',
    is_active: true,
  },
  {
    id: 'sup-2',
    name: 'تعاونية سايس الفلاحية',
    phone: '0662345678',
    specialty: 'خضر ورقية، نعناع، كزبرة، بقدونس، وخس بلدي',
    rating: 5,
    notes: 'توريد يومي فجر كل صباح من ضيعات سايس وعين الشقف.',
    is_active: true,
  },
  {
    id: 'sup-3',
    name: 'ضيعات تادلة وسوس',
    phone: '0663456789',
    specialty: 'طماطم، فلفل، جزر، وقرع أحمر',
    rating: 4,
    notes: 'أسعار جملة تنافسية وجودة منتقاة للفرز الأول.',
    is_active: true,
  },
  {
    id: 'sup-4',
    name: 'مجموعة فواكه الأطلس والريف',
    phone: '0664567890',
    specialty: 'فواكه موسمية (تفاح، برتقال، حوامض، موز)',
    rating: 5,
    notes: 'توريد مباشر من صفرو وبركان وتاونات.',
    is_active: true,
  },
  {
    id: 'sup-5',
    name: 'تعاونية بلدي فاس للمونة والمجففات',
    phone: '0665678901',
    specialty: 'تمور المجهول، قطاني، زيت زيتون، وعسل حر',
    rating: 4,
    notes: 'مستودع الحي الصناعي سيدي إبراهيم بفاس.',
    is_active: true,
  },
];

const LOCAL_SUPPLIERS_KEY = 'khodra_suppliers_v1';
const LOCAL_PRICES_KEY = 'khodra_daily_prices_v1';

export function getStoredPricesMap(): Record<number, any> {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_PRICES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        (globalThis as any).__khodra_prices_map = parsed;
        return parsed;
      }
    } catch {}
  }
  return (globalThis as any).__khodra_prices_map || {};
}

export function setStoredPricesMap(map: Record<number, any>) {
  (globalThis as any).__khodra_prices_map = map;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_PRICES_KEY, JSON.stringify(map));
    } catch {}
  }
}

import {
  calculateSellingPrice as centralCalculateSellingPrice,
  calculateSellingPriceFromTargetMargin,
  calculateSellingPriceFromMarkup,
  calculateEstimatedPurchasePrice,
  analyzePricingMetrics,
  TARIFF_STANDARDS,
} from '../../services/financialEngine';

export const calculateSellingPrice = centralCalculateSellingPrice;
export { analyzePricingMetrics, calculateSellingPriceFromTargetMargin, calculateSellingPriceFromMarkup };

export const LOCAL_PRICE_AUDIT_KEY = 'khodra_price_audit_history_v1';


/**
 * حساب مؤشر الاتجاه مقارنة بالأمس
 */
export function determineTrend(todayPrice: number, yesterdayPrice: number): 'up' | 'down' | 'stable' {
  if (yesterdayPrice <= 0) return 'stable';
  const diff = todayPrice - yesterdayPrice;
  if (diff > 0.05) return 'up';      // السعر ارتفع (أحمر)
  if (diff < -0.05) return 'down';  // السعر انخفض (أخضر)
  return 'stable';
}

/**
 * جلب قائمة الموردين
 */
export async function getSuppliers(): Promise<Supplier[]> {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('suppliers')
        .select('*')
        .order('rating', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as Supplier[];
      }
    } catch (err) {
      logger.warn('Failed to fetch suppliers from Supabase, fallback to local', err);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_SUPPLIERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(DEFAULT_SUPPLIERS));
  return DEFAULT_SUPPLIERS;
}

/**
 * حفظ أو تحديث مورد
 */
export async function saveSupplier(supplier: Partial<Supplier> & { name: string }): Promise<Supplier> {
  const all = await getSuppliers();
  let updatedSupplier: Supplier;

  if (supplier.id) {
    const idx = all.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) {
      updatedSupplier = { ...all[idx], ...supplier } as Supplier;
      all[idx] = updatedSupplier;
    } else {
      updatedSupplier = {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone || '',
        specialty: supplier.specialty || 'خضر وفواكه عامة',
        rating: supplier.rating || 5,
        notes: supplier.notes || '',
        is_active: supplier.is_active ?? true,
      };
      all.push(updatedSupplier);
    }
  } else {
    updatedSupplier = {
      id: `sup-${Date.now()}`,
      name: supplier.name,
      phone: supplier.phone || '',
      specialty: supplier.specialty || 'خضر وفواكه عامة',
      rating: supplier.rating || 5,
      notes: supplier.notes || '',
      is_active: supplier.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    all.push(updatedSupplier);
  }

  localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(all));

  const client = getSupabase();
  if (client) {
    try {
      await client.from('suppliers').upsert({
        id: updatedSupplier.id,
        name: updatedSupplier.name,
        phone: updatedSupplier.phone,
        specialty: updatedSupplier.specialty,
        rating: updatedSupplier.rating,
        notes: updatedSupplier.notes,
        is_active: updatedSupplier.is_active,
      });
    } catch (err) {
      logger.warn('Failed to upsert supplier in Supabase', err);
    }
  }

  return updatedSupplier;
}

/**
 * حذف مورد
 */
export async function deleteSupplier(id: string): Promise<boolean> {
  const all = await getSuppliers();
  const filtered = all.filter((s) => s.id !== id);
  localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(filtered));

  const client = getSupabase();
  if (client) {
    try {
      await client.from('suppliers').delete().eq('id', id);
    } catch {}
  }
  return true;
}

/**
 * جلب جميع المنتجات مع أسعار الشراء والبيع وهوامش الربح المحدثة
 */
export async function getProductPricingRows(): Promise<{
  rows: ProductPriceRow[];
  suppliers: Supplier[];
}> {
  const suppliers = await getSuppliers();
  const defaultSupplier = suppliers[0] || DEFAULT_SUPPLIERS[0];

  // 1. جلب المصدر الموحد والأساسي لكافة منتجات المتجر والمخزون
  const baseProducts = await fetchProducts();

  // 2. جلب أحدث أسعار الشراء وهوامش الأمس المسجلة
  let savedPricesMap = getStoredPricesMap();

  // جلب الأسعار اليومية من Supabase إن وجدت لمزامنتها
  const client = getSupabase();
  if (client) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: dbDailyPrices } = await client
        .from('daily_prices')
        .select('*')
        .eq('recorded_date', todayStr);

      if (dbDailyPrices && Array.isArray(dbDailyPrices)) {
        dbDailyPrices.forEach((dp: any) => {
          if (dp.product_id != null) {
            savedPricesMap[Number(dp.product_id)] = {
              purchase: Number(dp.purchase_price) || 0,
              margin: Number(dp.margin_percentage) || DEFAULT_PROFIT_MARGIN,
              yesterday: Number(dp.yesterday_price || dp.purchase_price) || 0,
              supplierId: String(dp.supplier_id || defaultSupplier.id),
            };
          }
        });
      }
    } catch (e) {
      logger.warn('Failed to fetch daily prices from Supabase in pricingService:', e);
    }
  }

  const rows: ProductPriceRow[] = baseProducts.map((prod, index) => {
    // تعيين مورد مناسب حسب فئة المنتج
    let chosenSupplier = defaultSupplier;
    if (prod.category === 'veg') {
      chosenSupplier = prod.name.includes('نعناع') || prod.name.includes('قزبر') || prod.name.includes('خس')
        ? suppliers.find((s) => s.id === 'sup-2') || defaultSupplier
        : suppliers.find((s) => s.id === 'sup-1') || defaultSupplier;
    } else if (prod.category === 'fruit') {
      chosenSupplier = suppliers.find((s) => s.id === 'sup-4') || defaultSupplier;
    } else if (prod.category === 'grocery' || prod.category === 'dairy') {
      chosenSupplier = suppliers.find((s) => s.id === 'sup-5') || defaultSupplier;
    }

    const saved = savedPricesMap[prod.id];

    // احتساب هامش ربح 40% تلقائياً لتغطية مصاريف النقل، الإتلاف واللوجستيك (المعتمد الوحيد)
    let margin = saved && saved.margin !== undefined ? saved.margin : DEFAULT_PROFIT_MARGIN;
    if (margin === 25 || margin === 33) {
      margin = DEFAULT_PROFIT_MARGIN; // 40%
    }

    let purchasePrice = saved && saved.purchase
      ? saved.purchase
      : calculateEstimatedPurchasePrice(prod.price, margin);

    let yesterdayPrice = saved && saved.yesterday
      ? saved.yesterday
      : Number((purchasePrice * (0.95 + (index % 10) * 0.01)).toFixed(2));
    let supplierId = saved && saved.supplierId ? saved.supplierId : chosenSupplier.id;

    const supplierObj = suppliers.find((s) => s.id === supplierId) || chosenSupplier;
    const proposedSellingPrice = calculateSellingPrice(purchasePrice, margin);
    const trend = determineTrend(purchasePrice, yesterdayPrice);

    // حساب المقاييس الثلاثة المستقلة والتحقق من سقف 60%
    const metrics = analyzePricingMetrics(purchasePrice, proposedSellingPrice);

    // ─── المصدر الموحد الوحيد للمخزون والتوفر (لا تكرار ولا تعارض) ───
    const currentStock = prod.stock !== undefined ? Number(prod.stock) : 10;
    const isAvailable = prod.is_available !== false && prod.active !== false && currentStock > 0;

    return {
      id: prod.id,
      name: prod.name,
      category: prod.category,
      unit_label: prod.unit_label || (prod.type === 'unit' ? 'حبة' : 'kg'),
      icon: prod.icon || '🥬',
      image_url: prod.image_url,
      supplier_id: supplierId,
      supplier_name: supplierObj.name,
      purchase_price: purchasePrice,
      margin_percentage: margin,
      selling_price: proposedSellingPrice,
      yesterday_price: yesterdayPrice,
      trend,
      is_available: isAvailable,
      stock: currentStock,
      is_modified: false,
      cogs_ratio: metrics.cogsRatioPercent,
      gross_margin: metrics.grossMarginPercent,
      markup_percent: metrics.markupPercent,
      is_compliant: metrics.isCompliant,
      old_selling_price: prod.price,
    };
  });

  return { rows, suppliers };
}

/**
 * تحديث حالة توفر ومخزون المنتج في Supabase و LocalStorage
 * لتغيير حالة المنتج إلى غير متوفر في واجهة العميل وقاعدة البيانات: يتم تفريغ stock = 0
 * إذا أدخلنا بين 1 و 5 كمية محدودة، فوق 5 متوفر
 */
export async function updateProductAvailability(
  productId: number,
  isAvailable: boolean,
  stockQuantity?: number
): Promise<boolean> {
  try {
    const targetStock = isAvailable
      ? stockQuantity !== undefined && stockQuantity > 0
        ? stockQuantity
        : 10
      : 0;

    const raw = localStorage.getItem(LOCAL_PRICES_KEY);
    const savedMap = raw ? JSON.parse(raw) : {};
    savedMap[productId] = {
      ...(savedMap[productId] || {}),
      is_available: targetStock > 0,
      active: targetStock > 0,
      stock: targetStock,
    };
    localStorage.setItem(LOCAL_PRICES_KEY, JSON.stringify(savedMap));

    const client = getSupabase();
    if (client) {
      const payload: Record<string, any> = {
        stock: targetStock,
        active: targetStock > 0,
        is_available: targetStock > 0,
        updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await client
        .from('products')
        .update(payload)
        .eq('id', productId);

      if (updateErr) {
        logger.warn('Initial update with is_available failed, falling back to stock and active:', updateErr);
        await client
          .from('products')
          .update({
            stock: targetStock,
            active: targetStock > 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('khodra_products_availability_updated', {
          detail: { productId, isAvailable: targetStock > 0, stock: targetStock, timestamp: Date.now() },
        })
      );
      window.dispatchEvent(
        new CustomEvent('khodra_prices_updated', {
          detail: {
            updates: [],
            availabilityUpdates: [{ productId, isAvailable: targetStock > 0, stock: targetStock }],
            timestamp: Date.now(),
          },
        })
      );
    }

    return true;
  } catch (err) {
    logger.error('Failed to update product availability:', err);
    return false;
  }
}

/**
 * تحديث مباشر لكمية المخزون (0 = غير متوفر، 1-5 = كمية محدودة، >5 = متوفر)
 */
export async function updateProductStock(
  productId: number,
  newStock: number
): Promise<boolean> {
  const isAvailable = newStock > 0;
  return updateProductAvailability(productId, isAvailable, newStock);
}

/**
 * حفظ أسعار اليوم لمجموعة منتجات (دفعة واحدة أو منتج منفرد)
 */
export async function saveProductPrices(
  updates: {
    productId: number;
    purchasePrice: number;
    marginPercentage: number;
    supplierId: string;
    hasException?: boolean;
    exceptionReason?: string;
    oldPrice?: number;
    productName?: string;
    unitLabel?: string;
  }[],
  changeType: 'single' | 'batch' | 'bulk_margin' | 'supplier_sync' = 'batch'
): Promise<boolean> {
  try {
    const savedMap = { ...getStoredPricesMap() };

    const todayDate = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    const auditRecords: any[] = [];

    updates.forEach((u: any) => {
      const prev = savedMap[u.productId] || {};
      const newSelling = u.sellingPrice != null && Number(u.sellingPrice) > 0
        ? Number(u.sellingPrice)
        : calculateSellingPrice(u.purchasePrice, u.marginPercentage);
      const metrics = analyzePricingMetrics(u.purchasePrice, newSelling);

      savedMap[u.productId] = {
        ...prev,
        purchase: u.purchasePrice,
        margin: u.marginPercentage,
        selling_price: newSelling,
        sellingPrice: newSelling,
        supplierId: u.supplierId,
        yesterday: prev.purchase ? prev.purchase : u.purchasePrice,
        date: todayDate,
        hasException: Boolean(u.hasException),
        exceptionReason: u.exceptionReason,
      };

      // مزامنة الذاكرة الحية للمنتجات فوراً
      const memProd = INITIAL_PRODUCTS.find((p) => p.id === u.productId);
      if (memProd) {
        memProd.price = newSelling;
      }

      auditRecords.push({
        id: `audit-${Date.now()}-${u.productId}`,
        productId: u.productId,
        productName: u.productName || `منتج #${u.productId}`,
        supplierId: u.supplierId,
        unitLabel: u.unitLabel || 'kg',
        oldPurchasePrice: prev.purchase || null,
        newPurchasePrice: u.purchasePrice,
        oldSellingPrice: u.oldPrice || (prev.purchase ? calculateSellingPrice(prev.purchase, prev.margin || 40) : newSelling),
        newSellingPrice: newSelling,
        oldCogsRatio: prev.purchase && u.oldPrice ? Number(((prev.purchase / u.oldPrice) * 100).toFixed(2)) : undefined,
        newCogsRatio: metrics.cogsRatioPercent,
        newGrossMargin: metrics.grossMarginPercent,
        markupPercent: metrics.markupPercent,
        changeType,
        hasException: Boolean(u.hasException),
        exceptionReason: u.exceptionReason || null,
        timestamp,
        changedBy: 'مدير المتجر (Admin)',
      });
    });

    setStoredPricesMap(savedMap);

    // حفظ سجل التدقيق في التخزين المحلي
    if (typeof localStorage !== 'undefined') {
      try {
        const existingAuditRaw = localStorage.getItem(LOCAL_PRICE_AUDIT_KEY);
        const existingAudit = existingAuditRaw ? JSON.parse(existingAuditRaw) : [];
        const updatedAudit = [...auditRecords, ...existingAudit].slice(0, 500); // الاحتفاظ بآخر 500 حركة
        localStorage.setItem(LOCAL_PRICE_AUDIT_KEY, JSON.stringify(updatedAudit));
      } catch {}
    }

    // تنظيف أي بيانات قديمة للمنتجات المخزنة محلياً لضمان الاعتماد الحصري على Supabase
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('khodra_custom_products_v2');
      } catch {}
    }

    // مزامنة مع Supabase إذا كان متوفراً
    const client = getSupabase();
    if (client) {
      const recordsToInsert = updates.map((u: any) => {
        const sellingPrice = u.sellingPrice != null && Number(u.sellingPrice) > 0
          ? Number(u.sellingPrice)
          : calculateSellingPrice(u.purchasePrice, u.marginPercentage);
        const metrics = analyzePricingMetrics(u.purchasePrice, sellingPrice);
        return {
          product_id: u.productId,
          supplier_id: u.supplierId,
          purchase_price: u.purchasePrice,
          margin_percentage: u.marginPercentage,
          selling_price: sellingPrice,
          cogs_ratio: metrics.cogsRatioPercent,
          gross_margin_percent: metrics.grossMarginPercent,
          markup_percent: metrics.markupPercent,
          has_exception: Boolean(u.hasException),
          exception_reason: u.exceptionReason || null,
          recorded_date: todayDate,
          updated_at: timestamp,
        };
      });

      // 1. تحديث جدول أسعار السوق اليومية (daily_prices) بشكل آمن
      try {
        await client.from('daily_prices').upsert(recordsToInsert, {
          onConflict: 'product_id,recorded_date',
        });
      } catch (dpErr) {
        logger.warn('Could not upsert into daily_prices:', dpErr);
      }

      // 2. تحديث جدول المنتجات العام (products.price) لضمان مزامنة أسعار البيع للعملاء في المتجر فورياً
      for (const rec of recordsToInsert) {
        try {
          await client
            .from('products')
            .update({
              price: rec.selling_price,
              updated_at: timestamp,
            })
            .eq('id', rec.product_id);
        } catch (prodErr) {
          logger.warn(`Could not sync price to products table for id ${rec.product_id}`, prodErr);
        }
      }

      // 3. توثيق التعديل في سجل تدقيق الأسعار (price_change_history) إن وُجد الجدول
      try {
        const historyRows = auditRecords.map((a) => ({
          product_id: a.productId,
          product_name: a.productName,
          supplier_id: a.supplierId,
          unit_label: a.unitLabel,
          old_purchase_price: a.oldPurchasePrice,
          new_purchase_price: a.newPurchasePrice,
          old_selling_price: a.oldSellingPrice,
          new_selling_price: a.newSellingPrice,
          new_cogs_ratio: a.newCogsRatio,
          new_gross_margin: a.newGrossMargin,
          markup_percent: a.markupPercent,
          change_type: a.changeType,
          has_exception: a.hasException,
          exception_reason: a.exceptionReason,
          changed_by: a.changedBy,
          created_at: a.timestamp,
        }));
        await client.from('price_change_history').insert(historyRows);
      } catch (histErr) {
        logger.warn('Could not record price change history in Supabase, stored in local audit:', histErr);
      }
    }

    // 4. إرسال حدث متصفح فوري (Realtime CustomEvent) لتحديث الواجهة فوراً دون الحاجة لإعادة تحميل الصفحة
    if (typeof window !== 'undefined') {
      const priceChanges = updates.map((u) => {
        const selling = calculateSellingPrice(u.purchasePrice, u.marginPercentage);
        return {
          productId: u.productId,
          sellingPrice: selling,
          selling_price: selling,
        };
      });
      window.dispatchEvent(
        new CustomEvent('khodra_prices_updated', {
          detail: { updates: priceChanges, timestamp: Date.now() },
        })
      );
    }

    return true;
  } catch (err) {
    logger.error('Failed to save daily product prices', err);
    return false;
  }
}

/**
 * جلب سجل تدقيق تغيير الأسعار الموثق
 */
export async function getPriceChangeHistory(): Promise<any[]> {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('price_change_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: String(d.id),
          productId: Number(d.product_id),
          productName: String(d.product_name),
          supplierId: d.supplier_id,
          unitLabel: d.unit_label || 'kg',
          oldPurchasePrice: d.old_purchase_price,
          newPurchasePrice: Number(d.new_purchase_price),
          oldSellingPrice: Number(d.old_selling_price),
          newSellingPrice: Number(d.new_selling_price),
          newCogsRatio: Number(d.new_cogs_ratio),
          newGrossMargin: Number(d.new_gross_margin),
          markupPercent: Number(d.markup_percent),
          changeType: d.change_type,
          hasException: Boolean(d.has_exception),
          exceptionReason: d.exception_reason,
          timestamp: d.created_at,
          changedBy: d.changed_by,
        }));
      }
    } catch {}
  }

  try {
    const raw = localStorage.getItem(LOCAL_PRICE_AUDIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
}

/**
 * تطبيق هامش ربح موحد (40% المعتمد الوحيد) على جميع المنتجات دفعة واحدة
 * لضمان أمان خزينة المتجر وتغطية مصاريف النقل، الإتلاف واللوجستيك
 */
export async function applyGlobalMarginToAllProducts(
  marginPercentage: number = DEFAULT_PROFIT_MARGIN
): Promise<{ success: boolean; count: number }> {
  try {
    const { rows } = await getProductPricingRows();
    const updates = rows.map((r) => ({
      productId: r.id,
      purchasePrice: r.purchase_price,
      marginPercentage,
      supplierId: r.supplier_id,
    }));

    const success = await saveProductPrices(updates);
    return { success, count: updates.length };
  } catch (err) {
    logger.error('Failed applying global margin', err);
    return { success: false, count: 0 };
  }
}


