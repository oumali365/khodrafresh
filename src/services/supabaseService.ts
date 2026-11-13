// ============================================================
// supabaseService.ts – الإصدار 3.0
// مُصحَّح: تنظيف items + RLS + RPC للطلبات
// ============================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import {
  Product,
  OrderSubmission,
  DeliveryDispatchInfo,
  DeliveryProvider,
  DeliverySource,
  FezZoneId,
  StoreDriver,
  DriverStatus,
  DriverVehicleType,
  FastAppCourier,
} from '../types';
import { STORE_CONFIG } from '../data/config';
import { INITIAL_PRODUCTS } from '../data/mockProducts';
import { recordOrderSuccess, sanitizeInput } from './securityService';
import { detectAddressZone } from '../data/deliveryZones';
import { calculateSellingPrice, calculateItemsCogs } from './financialEngine';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseClient && STORE_CONFIG.supabaseUrl && STORE_CONFIG.supabaseAnonKey) {
    try {
      supabaseClient = createClient(STORE_CONFIG.supabaseUrl, STORE_CONFIG.supabaseAnonKey);
    } catch (e) {
      console.warn('Supabase initialization failed, falling back to local storage:', e);
    }
  }
  return supabaseClient;
}

// ═══════════════════════════════════════════════════════════════
// ─── المنتجات ───
// ═══════════════════════════════════════════════════════════════

export function resolveProductImageUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // إذا كان رابطاً مطلقاً (http:// أو https:// أو data: أو //)
  if (/^(https?:|data:|\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  // التأكد من وجود الشرطة المائلة في البداية
  const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (clean === '/images/products/vegetables/parsley.webp') {
    return '/images/products/vegetables/parcley.webp';
  }
  return clean;
}

function normalizeProduct(row: any): Product {
  // ✅ الحاكم في قاعدة البيانات: stock و is_available
  // لتغيير حالة المنتج إلى غير متوفر في واجهة العميل: stock = 0
  // إذا كان stock بين 1 و 5: كمية محدودة
  // إذا كان stock فوق 5: متوفر
  const rawStock = row.stock !== undefined && row.stock !== null ? Number(row.stock) : undefined;
  const isActive = row.active !== undefined ? Boolean(row.active) : true;
  let isAvail = true;

  if (rawStock !== undefined && !isNaN(rawStock)) {
    isAvail = rawStock > 0 && row.is_available !== false && isActive;
  } else if (row.is_available !== undefined) {
    isAvail = Boolean(row.is_available) && isActive;
  } else {
    isAvail = isActive;
  }

  const finalStock = rawStock !== undefined && !isNaN(rawStock) ? rawStock : (isAvail ? 10 : 0);

  return {
    id: Number(row.id),
    name: String(row.name || ''),
    category: (row.category || 'veg') as Product['category'],
    type: (row.type === 'unit' ? 'unit' : 'weight') as Product['type'],
    price: Number(row.price) || 0,
    unit_label: row.unit_label || undefined,
    stock: finalStock,
    icon: row.icon || '🛒',
    image_url: resolveProductImageUrl(row.image_url),
    active: isActive,
    is_available: isAvail,
    description: row.description || undefined,
    origin: row.origin || undefined,
  };
}
export async function fetchProducts(): Promise<Product[]> {
  const client = getSupabase();
  let baseProducts: Product[] = INITIAL_PRODUCTS;

  if (client) {
    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('id');

      if (!error && data && data.length > 0) {
        baseProducts = data.map(normalizeProduct);
      } else if (error) {
        console.warn('Supabase products fetch failed:', error.message);
      }
    } catch (err) {
      console.warn('Network error while connecting to Supabase:', err);
    }
  }

  // ─── مزامنة أسعار البيع اليومية الديناميكية (Dynamic Pricing Sync) ───
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. جلب أحدث أسعار البيع المسجلة اليوم من جدول daily_prices لضمان الانعكاس الفوري
    if (client) {
      const { data: dailyPrices } = await client
        .from('daily_prices')
        .select('product_id, selling_price')
        .eq('recorded_date', todayStr);

      if (dailyPrices && dailyPrices.length > 0) {
        const priceMap = new Map<number, number>();
        dailyPrices.forEach((dp: any) => {
          if (dp.product_id != null && dp.selling_price != null) {
            priceMap.set(Number(dp.product_id), Number(dp.selling_price));
          }
        });

        baseProducts = baseProducts.map((p) => {
          if (priceMap.has(p.id)) {
            const dynamicPrice = priceMap.get(p.id)!;
            return { ...p, price: dynamicPrice };
          }
          return p;
        });
      }
    }

    // 2. دمج أي أسعار مسجلة محلياً عبر أداة التسعير الصباحي (Fallback / Offline)
    let localMap: Record<number, any> | null = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const rawLocal = localStorage.getItem('khodra_daily_prices_v1');
        if (rawLocal) localMap = JSON.parse(rawLocal);
      } catch {}
    }
    if (!localMap && (globalThis as any)?.__khodra_prices_map) {
      localMap = (globalThis as any).__khodra_prices_map;
    }

    if (localMap && typeof localMap === 'object') {
      baseProducts = baseProducts.map((p) => {
        const entry = localMap![p.id] || localMap![String(p.id)];
        if (entry) {
          // أولوية 1: سعر البيع المعتمد والمحسوب صراحة من أداة التسعير لضمان التطابق التام 100% بين التسعير والمخزون
          const directSelling = entry.selling_price ?? entry.sellingPrice;
          if (directSelling != null && Number(directSelling) > 0) {
            return { ...p, price: Number(directSelling) };
          }
          // أولوية 2: احتساب سعر البيع عبر المعادلة المركزية بهامش 40% الوحيد المعتمد للمتجر
          if (entry.purchase != null && Number(entry.purchase) > 0) {
            const effectiveMargin =
              entry.margin === 25 || entry.margin === 33
                ? 40
                : typeof entry.margin === 'number' && entry.margin > 0
                ? Number(entry.margin)
                : 40;
            const calculatedSelling = calculateSellingPrice(Number(entry.purchase), effectiveMargin);
            if (calculatedSelling > 0) {
              return { ...p, price: calculatedSelling };
            }
          }
        }
        return p;
      });
    }
  } catch (syncErr) {
    console.warn('Notice: Daily prices synchronization handled gracefully:', syncErr);
  }

  // تنظيف أي مخلفات سابقة للمنتجات في التخزين المحلي لضمان الاعتماد الحصري على Supabase
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('khodra_custom_products_v2');
    } catch {}
  }

  return baseProducts;
}

// ────────────────────────────────────────────────────────────
// دوال إدارة وتعديل المنتجات والمخزون من لوحة الإدارة
// ────────────────────────────────────────────────────────────

export async function saveProductToStore(
  productData: Partial<Product> & { name: string; price: number; category: Product['category'] }
): Promise<{ success: boolean; data?: Product; message?: string }> {
  try {
    const allProducts = await fetchProducts();
    const isNew = !productData.id || productData.id <= 0;
    const targetId = isNew ? (allProducts.length > 0 ? Math.max(...allProducts.map((p) => p.id)) + 1 : 1) : Number(productData.id);

    const completeProduct: Product = {
      id: targetId,
      name: productData.name.trim(),
      category: productData.category,
      type: productData.type || 'weight',
      price: Number(productData.price) || 0,
      unit_label: productData.unit_label || (productData.type === 'unit' ? 'حبة' : 'kg'),
      stock: productData.stock !== undefined ? Number(productData.stock) : 10,
      min_stock_alert: productData.min_stock_alert !== undefined ? Number(productData.min_stock_alert) : 5,
      is_available: productData.is_available !== false && (productData.stock === undefined || Number(productData.stock) > 0),
      is_featured: Boolean(productData.is_featured),
      is_seasonal: Boolean(productData.is_seasonal),
      is_bestseller: Boolean(productData.is_bestseller),
      icon: productData.icon || '🛒',
      image_url: resolveProductImageUrl(productData.image_url),
      active: productData.active !== false && productData.is_available !== false,
      description: productData.description?.trim(),
      origin: productData.origin?.trim() || 'فاس والمغرب',
    };

    // 1. محاولة الحفظ في Supabase إن كان متاحاً
    const client = getSupabase();
    if (!client) {
      // تحديث الذاكرة الحية للمنتجات والأسعار محلياً (Offline / Fallback)
      const memIdx = INITIAL_PRODUCTS.findIndex((p) => p.id === targetId);
      if (memIdx >= 0) {
        INITIAL_PRODUCTS[memIdx] = completeProduct;
      } else {
        INITIAL_PRODUCTS.push(completeProduct);
      }

      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem('khodra_daily_prices_v1');
          const map = raw ? JSON.parse(raw) : {};
          map[targetId] = {
            ...(map[targetId] || {}),
            selling_price: completeProduct.price,
            sellingPrice: completeProduct.price,
            date: new Date().toISOString().split('T')[0],
          };
          localStorage.setItem('khodra_daily_prices_v1', JSON.stringify(map));
        } catch {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('khodra_products_updated', { detail: completeProduct }));
      }

      return {
        success: true,
        data: completeProduct,
        message: isNew ? 'تمت إضافة المنتج بنجاح إلى المتجر' : 'تم تحديث بيانات المنتج وسعره بنجاح',
      };
    }

    try {
      const payload: any = {
        name: completeProduct.name,
        category: completeProduct.category,
        type: completeProduct.type,
        price: completeProduct.price,
        unit_label: completeProduct.unit_label,
        stock: completeProduct.stock,
        is_available: completeProduct.is_available,
        active: completeProduct.active,
        icon: completeProduct.icon,
        image_url: completeProduct.image_url,
        description: completeProduct.description,
        origin: completeProduct.origin,
        updated_at: new Date().toISOString(),
      };

      if (isNew) {
        payload.id = targetId;
        const { data: insertedData, error: upsertErr } = await client
          .from('products')
          .upsert(payload)
          .select();

        if (upsertErr) {
          console.error('❌ [Admin Product] فشل إضافة المنتج في Supabase:', upsertErr);
          return { success: false, message: upsertErr.message || 'فشل حفظ المنتج في قاعدة البيانات' };
        }
        if (!insertedData || insertedData.length === 0) {
          console.error('❌ [Admin Product] تم رفض إضافة المنتج بواسطة RLS (0 rows inserted)');
          return { success: false, message: 'رفضت سياسات أمان قاعدة البيانات (RLS) إضافة المنتج' };
        }
        console.log('✅ [Admin Product] تم إدراج المنتج بنجاح في Supabase:', insertedData[0]);
      } else {
        const { data: updatedData, error: updateErr } = await client
          .from('products')
          .update(payload)
          .eq('id', targetId)
          .select();

        if (updateErr) {
          console.error('❌ [Admin Product] فشل تحديث بيانات المنتج في Supabase:', updateErr);
          return { success: false, message: updateErr.message || 'فشل تحديث بيانات المنتج' };
        }
        if (!updatedData || updatedData.length === 0) {
          console.error('❌ [Admin Product] تم رفض تحديث المنتج بواسطة RLS (0 rows updated)');
          return { success: false, message: 'لم يتم حفظ التعديل في Supabase؛ يرجى التحقق من سياسات RLS' };
        }
        console.log('✅ [Admin Product] تم تحديث بيانات المنتج وسعره بنجاح في Supabase:', updatedData[0]);
      }
    } catch (dbErr: any) {
      console.error('❌ [Admin Product] استثناء أثناء حفظ المنتج في Supabase:', dbErr);
      return { success: false, message: dbErr?.message || 'خطأ في الاتصال بقاعدة البيانات' };
    }

    // تنظيف التخزين المحلي لضمان عدم وجود بيانات متضاربة
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('khodra_custom_products_v2');
      } catch {}
    }

    // إطلاق حدث محلي لتحديث الواجهة في الوقت الفعلي
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khodra_products_updated', { detail: completeProduct }));
    }

    return {
      success: true,
      data: completeProduct,
      message: isNew ? 'تمت إضافة المنتج بنجاح إلى المتجر' : 'تم تحديث بيانات المنتج بنجاح',
    };
  } catch (err: any) {
    console.error('❌ [Admin Product] خطأ غير متوقع في saveProductToStore:', err);
    return {
      success: false,
      message: err?.message || 'حدث خطأ أثناء حفظ المنتج',
    };
  }
}

/**
 * تحديث سريع لكمية المخزون (Admin Control First)
 * متطلبات RLS وأمان Supabase:
 * 1. جدول public.products يجب أن يمتلك سياسة UPDATE تسمح بالتعديل الصريح لدور anon أو authenticated.
 * 2. إذا كانت السياسة مغلقة (Admin-Only JWT)، تفشل عمليات client.update() بصمت وتعيد 0 صفوف معدلة.
 * 3. لذلك نستخدم .select() صراحة لكشف الفشل الصامت لـ RLS وعدم خداع الواجهة بـ success وهمي.
 * 4. كما نقوم بمحاولة استدعاء دالة RPC المحمية update_product_stock_secure برمز المدير p_admin_pin أولاً.
 */
export async function updateProductStockQuick(
  productId: number,
  newStock: number
): Promise<{ success: boolean; message?: string }> {
  try {
    if (productId == null || isNaN(Number(productId)) || Number(productId) <= 0) {
      console.error('❌ [Admin Stock] فشل التحقق: معرف المنتج غير صالح:', productId);
      return { success: false, message: 'معرف المنتج غير صالح' };
    }

    if (newStock == null || isNaN(Number(newStock)) || Number(newStock) < 0) {
      console.error('❌ [Admin Stock] فشل التحقق: كمية المخزون سالبة أو غير صالحة:', newStock);
      return { success: false, message: 'قيمة المخزون غير صالحة ولا يمكن أن تكون سالبة' };
    }

    const validStock = Math.max(0, Number(Number(newStock).toFixed(2)));
    const isAvail = validStock > 0;

    const client = getSupabase();
    if (!client) {
      console.error('❌ [Admin Stock] قاعدة بيانات Supabase غير متصلة (العميل غير متوفر)');
      return { success: false, message: 'قاعدة بيانات Supabase غير متصلة' };
    }

    // ─── 1. تسجيل البيانات قبل إرسال الطلب (Pre-Request Logging) ───
    console.log('🔄 [Admin Stock] جاري إرسال طلب تعديل المخزون إلى Supabase...', {
      productId: Number(productId),
      newStock: validStock,
      isAvailable: isAvail,
      timestamp: new Date().toISOString(),
    });

    let stockUpdatedInDb = false;

    // ─── 2. محاولة التحديث عبر دالة RPC الآمنة update_product_stock_secure إن وجدت ───
    try {
      const pin = getAdminPin();
      const { data: rpcData, error: rpcErr } = await client.rpc('update_product_stock_secure', {
        p_product_id: Number(productId),
        p_new_stock: validStock,
        p_admin_pin: pin,
      });

      if (!rpcErr && rpcData?.success) {
        stockUpdatedInDb = true;
        console.log('✅ [Admin Stock] تم حفظ المخزون بنجاح عبر RPC في Supabase:', rpcData);
      } else if (rpcErr && !rpcErr.message?.includes('could not find') && !rpcErr.message?.includes('schema cache')) {
        console.warn('⚠️ [Admin Stock] ملاحظة من RPC update_product_stock_secure:', rpcErr.message);
      }
    } catch (rpcCallErr) {
      // التراجع المرن للتحديث المباشر إذا لم تكن الدالة منشأة
    }

    // ─── 3. التحديث المباشر لجدول products مع .select() لكشف حجب RLS الصامت ───
    if (!stockUpdatedInDb) {
      const { data, error: updateErr } = await client
        .from('products')
        .update({
          stock: validStock,
          is_available: isAvail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(productId))
        .select();

      if (updateErr) {
        // ─── تسجيل الخطأ عند الفشل (Error Logging) ───
        console.error('❌ [Admin Stock] خطأ مباشر من Supabase أثناء تعديل المخزون:', {
          error: updateErr,
          code: updateErr.code,
          message: updateErr.message,
          productId,
          attemptedStock: validStock,
        });
        return { success: false, message: updateErr.message || 'فشل تحديث المخزون في قاعدة البيانات' };
      }

      // التحقق الصارم من عدد الصفوف المعدلة:
      // إذا كانت المصفوفة فارغة (data.length === 0)، فهذا دليل قاطع على أن RLS رفضت التعديل صامتاً
      if (!data || data.length === 0) {
        const rlsBlockMessage =
          'فشل حفظ التعديل في Supabase! قواعد أمان RLS منعت التحديث (0 صفوف عُدلت). يرجى مراجعة صلاحيات المدير وسياسات جدول products.';
        console.error('❌ [Admin Stock] رفض أمني من RLS (0 rows updated):', {
          productId,
          attemptedStock: validStock,
          hint: 'RLS UPDATE policy on public.products is missing or denied for current client role',
        });
        return { success: false, message: rlsBlockMessage };
      }

      // ─── تسجيل النجاح بعد اكتمال الطلب (Post-Request Logging) ───
      console.log('✅ [Admin Stock] تم تأكيد حفظ المخزون في Supabase بنجاح (Direct Update):', data[0]);
    }

    // تنظيف أي بيانات قديمة للمنتجات من localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('khodra_custom_products_v2');
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('khodra_product_stock_changed', {
          detail: { id: Number(productId), stock: validStock, is_available: isAvail },
        })
      );
    }

    return { success: true, message: `تم حفظ المخزون في السيرفر: ${validStock}` };
  } catch (err: any) {
    // ─── تسجيل الاستثناءات غير المتوقعة (Catch Error Logging) ───
    console.error('❌ [Admin Stock] استثناء غير متوقع أثناء تحديث المخزون:', err);
    return { success: false, message: err?.message || 'فشل تحديث المخزون' };
  }
}

/**
 * ────────────────────────────────────────────────────────────
 * تسجيل حركة مخزون ذرية وموثقة محاسبياً
 * (توريد صباحي، تعديل يدوي، خصم واسترجاع طلبات)
 * ────────────────────────────────────────────────────────────
 */
export async function recordInventoryMovement(params: {
  productId: number;
  movementType: 'morning_stockin' | 'manual_adjustment' | 'order_deduct' | 'order_restore';
  quantityDelta: number;
  unitCost?: number;
  supplierId?: string;
  reason?: string;
  orderId?: string | number;
  createdBy?: string;
}): Promise<{ success: boolean; message?: string; data?: any }> {
  const client = getSupabase();
  const validDelta = Number(params.quantityDelta) || 0;
  const createdBy = params.createdBy || 'مدير المتجر';
  const timestamp = new Date().toISOString();

  // 1. أولاً: محاولة الاستدعاء عبر RPC record_inventory_movement_atomic
  if (client) {
    try {
      const { data: rpcData, error: rpcErr } = await client.rpc('record_inventory_movement_atomic', {
        p_product_id: Number(params.productId),
        p_movement_type: params.movementType,
        p_quantity_delta: validDelta,
        p_unit_cost: params.unitCost != null ? Number(params.unitCost) : null,
        p_supplier_id: params.supplierId || null,
        p_reason: params.reason || null,
        p_created_by: createdBy,
      });

      if (!rpcErr && rpcData?.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('khodra_product_stock_changed', {
              detail: {
                id: Number(params.productId),
                stock: rpcData.stock_after,
                is_available: rpcData.stock_after > 0,
              },
            })
          );
        }
        return { success: true, data: rpcData, message: 'تم قيد حركة المخزون بنجاح في قاعدة البيانات' };
      }
    } catch {
      // Fallback
    }

    // 2. Fallback: القيد المباشر في inventory_ledger وتحديث products
    try {
      const { data: prodData } = await client
        .from('products')
        .select('name, stock, unit_label')
        .eq('id', Number(params.productId))
        .single();

      const currentStock = prodData ? Number(prodData.stock) || 0 : 0;
      const newStock = Math.max(0, currentStock + validDelta);
      const totalCostValue = params.unitCost ? Number((Math.abs(validDelta) * params.unitCost).toFixed(2)) : null;

      await client.from('inventory_ledger').insert({
        product_id: Number(params.productId),
        quantity_delta: validDelta,
        movement_type: params.movementType,
        stock_before: currentStock,
        stock_after: newStock,
        unit_cost: params.unitCost || null,
        total_cost_value: totalCostValue,
        supplier_id: params.supplierId || null,
        unit_label: prodData?.unit_label || 'kg',
        reason: params.reason || null,
        created_by: createdBy,
        created_at: timestamp,
      });

      await client
        .from('products')
        .update({
          stock: newStock,
          is_available: newStock > 0,
          active: newStock > 0,
          updated_at: timestamp,
        })
        .eq('id', Number(params.productId));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('khodra_product_stock_changed', {
            detail: {
              id: Number(params.productId),
              stock: newStock,
              is_available: newStock > 0,
            },
          })
        );
      }

      return {
        success: true,
        data: { stock_before: currentStock, stock_after: newStock, total_cost_value: totalCostValue },
        message: 'تم تسجيل وتوثيق حركة المخزون بنجاح',
      };
    } catch (dbErr: any) {
      console.warn('Direct ledger insert fallback:', dbErr);
    }
  }

  // 3. Fallback محلي
  try {
    const rawLocal = localStorage.getItem('khodra_inventory_ledger_cache_v1');
    const list = rawLocal ? JSON.parse(rawLocal) : [];
    const localEntry = {
      id: `local-ledger-${Date.now()}`,
      product_id: Number(params.productId),
      quantity_delta: validDelta,
      movement_type: params.movementType,
      stock_before: 10,
      stock_after: Math.max(0, 10 + validDelta),
      unit_cost: params.unitCost || null,
      total_cost_value: params.unitCost ? Math.abs(validDelta) * params.unitCost : null,
      supplier_id: params.supplierId,
      reason: params.reason,
      created_by: createdBy,
      created_at: timestamp,
    };
    list.unshift(localEntry);
    localStorage.setItem('khodra_inventory_ledger_cache_v1', JSON.stringify(list.slice(0, 200)));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('khodra_product_stock_changed', {
          detail: {
            id: Number(params.productId),
            stock: Math.max(0, 10 + validDelta),
            is_available: 10 + validDelta > 0,
          },
        })
      );
    }

    return { success: true, message: 'تم حفظ حركة المخزون محلياً' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشلت معالجة حركة المخزون' };
  }
}

/**
 * ────────────────────────────────────────────────────────────
 * مزامنة المخزون مع دورة حياة الطلبات (Order Stock Synchronization)
 * خصم الكميات عند التأكيد/التسليم واسترجاعها تلقائياً عند الإلغاء
 * ────────────────────────────────────────────────────────────
 */
const STOCK_DEDUCTED_KEY = 'khodra_stock_deducted_orders_v1';

export function getDeductedOrderIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STOCK_DEDUCTED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markOrderStockDeducted(orderCodeOrId: string | number, deducted: boolean) {
  if (typeof localStorage === 'undefined') return;
  try {
    const set = getDeductedOrderIds();
    const key = String(orderCodeOrId);
    if (deducted) {
      set.add(key);
    } else {
      set.delete(key);
    }
    localStorage.setItem(STOCK_DEDUCTED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export async function syncOrderStock(
  orderOrId: DbOrder | string | number,
  action: 'deduct' | 'restore'
): Promise<{ success: boolean; affectedItems: number }> {
  let targetOrder: DbOrder | undefined;

  if (typeof orderOrId === 'object' && orderOrId !== null && 'id' in orderOrId) {
    targetOrder = orderOrId as DbOrder;
  } else {
    const allOrders = await fetchOrders();
    const str = String(orderOrId);
    targetOrder = allOrders.find(
      (o) => String(o.id) === str || String(o.order_code) === str || o.order_code === `#${str}`
    );
  }

  if (!targetOrder || !Array.isArray(targetOrder.items) || targetOrder.items.length === 0) {
    return { success: true, affectedItems: 0 };
  }

  const orderKey = String(targetOrder.order_code || targetOrder.id);
  const deductedSet = getDeductedOrderIds();
  const isAlreadyDeducted = deductedSet.has(orderKey);

  if (action === 'deduct') {
    if (isAlreadyDeducted) {
      return { success: true, affectedItems: 0 }; // تم الخصم مسبقاً لمنع التكرار
    }

    let affected = 0;
    for (const item of targetOrder.items) {
      const pid = Number(item.id || item.product_id);
      const qty = Math.max(0, Number(item.qty || item.quantity) || 1);
      if (pid > 0 && qty > 0) {
        await recordInventoryMovement({
          productId: pid,
          movementType: 'order_deduct',
          quantityDelta: -qty,
          reason: `مبيعات - طلب #${targetOrder.order_code || targetOrder.id}`,
          orderId: targetOrder.id,
        });
        affected++;
      }
    }

    markOrderStockDeducted(orderKey, true);
    return { success: true, affectedItems: affected };
  } else {
    // action === 'restore'
    if (!isAlreadyDeducted) {
      return { success: true, affectedItems: 0 }; // لم يُخصم مسبقاً فلا داعي للاسترجاع
    }

    let affected = 0;
    for (const item of targetOrder.items) {
      const pid = Number(item.id || item.product_id);
      const qty = Math.max(0, Number(item.qty || item.quantity) || 1);
      if (pid > 0 && qty > 0) {
        await recordInventoryMovement({
          productId: pid,
          movementType: 'order_restore',
          quantityDelta: qty,
          reason: `استرجاع مخزون - إلغاء طلب #${targetOrder.order_code || targetOrder.id}`,
          orderId: targetOrder.id,
        });
        affected++;
      }
    }

    markOrderStockDeducted(orderKey, false);
    return { success: true, affectedItems: affected };
  }
}

export async function deleteProductFromStore(
  productId: number
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!productId || productId <= 0 || isNaN(Number(productId))) {
      return { success: false, message: 'معرف المنتج غير صالح' };
    }

    const client = getSupabase();
    if (!client) {
      return { success: false, message: 'قاعدة بيانات Supabase غير متصلة' };
    }

    const { error } = await client
      .from('products')
      .update({
        active: false,
        is_available: false,
        stock: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(productId));

    if (error) {
      console.error('Supabase product delete error:', error);
      return { success: false, message: error.message || 'فشل تعطيل المنتج' };
    }

    // تنظيف أي بيانات قديمة للمنتجات من localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('khodra_custom_products_v2');
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khodra_product_deleted', { detail: { id: Number(productId) } }));
    }

    return { success: true, message: 'تم إيقاف وتعطيل المنتج بنجاح' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل تعطيل المنتج' };
  }
}

export async function hideProductInStore(
  productId: number
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!productId || productId <= 0 || isNaN(Number(productId))) {
      return { success: false, message: 'معرف المنتج غير صالح' };
    }

    const client = getSupabase();
    if (!client) {
      return { success: false, message: 'قاعدة بيانات Supabase غير متصلة' };
    }

    const { data, error } = await client
      .from('products')
      .update({
        is_available: false,
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(productId))
      .select();

    if (error) {
      console.error('Supabase product hide error:', error);
      return { success: false, message: error.message || 'فشل إخفاء المنتج' };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'لم يتم حفظ التعديل في Supabase؛ يرجى التحقق من سياسات RLS' };
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('khodra_custom_products_v2');
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('khodra_products_availability_updated', {
          detail: { productId: Number(productId), isAvailable: false, stock: 0 },
        })
      );
    }

    return { success: true, message: 'تم إخفاء المنتج بنجاح من المتجر' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل إخفاء المنتج' };
  }
}

export async function restoreProductInStore(
  productId: number
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!productId || productId <= 0 || isNaN(Number(productId))) {
      return { success: false, message: 'معرف المنتج غير صالح' };
    }

    const client = getSupabase();
    if (!client) {
      return { success: false, message: 'قاعدة بيانات Supabase غير متصلة' };
    }

    const { data: currentProd } = await client
      .from('products')
      .select('stock')
      .eq('id', Number(productId))
      .single();

    const currentStock = currentProd?.stock !== undefined ? Number(currentProd.stock) : 10;
    const isAvail = currentStock > 0;

    const { data, error } = await client
      .from('products')
      .update({
        is_available: true,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(productId))
      .select();

    if (error) {
      console.error('Supabase product restore error:', error);
      return { success: false, message: error.message || 'فشل استرجاع المنتج' };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'لم يتم حفظ التعديل في Supabase؛ يرجى التحقق من سياسات RLS' };
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('khodra_custom_products_v2');
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('khodra_products_availability_updated', {
          detail: { productId: Number(productId), isAvailable: isAvail, stock: currentStock },
        })
      );
    }

    return { success: true, message: 'تم استرجاع المنتج بنجاح إلى المتجر' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل استرجاع المنتج' };
  }
}

// ═══════════════════════════════════════════════════════════════
// ─── رفع الطلب (مُصحَّح: تنظيف items) ───
// ═══════════════════════════════════════════════════════════════

/**
 * تنظيف العنصر ليكون JSON صحيحاً (بدون undefined/NaN/Infinity)
 */
function cleanItemForJson(item: any): Record<string, any> {
  const clean: Record<string, any> = {};

  // الحقول الأساسية المطلوبة مع معرف الصنف لدعم الخصم الذري
  if (item?.id != null && !isNaN(Number(item.id))) {
    clean.id = Number(item.id);
    clean.product_id = Number(item.id);
  }
  clean.name = String(item?.name || 'منتج');
  clean.variantLabel = String(item?.variantLabel || '');
  clean.qty = Math.max(0.1, Number(item?.qty) || 0.5);
  clean.lineTotal = Number(item?.lineTotal) || 0;
  clean.icon = String(item?.icon || '🛒');

  // الحقول الاختيارية (فقط إذا كانت موجودة وصحيحة)
  if (item?.image_url && typeof item.image_url === 'string') {
    clean.image_url = item.image_url;
  }
  if (item?.bundleId && typeof item.bundleId === 'string') {
    clean.bundleId = item.bundleId;
  }

  return clean;
}

export async function submitOrder(
  order: OrderSubmission
): Promise<{ success: boolean; message?: string; errorCode?: string }> {
  // ─── حماية المتجر من الخسارة: التحقق من الحد الأدنى للطلب (70 د.م شامل رسوم التوصيل) ───
  const subtotal = (order.items || []).reduce((sum, item) => sum + (Number(item?.lineTotal) || 0), 0);
  const deliveryFee = Number(order.deliveryFee) || 0;
  const grandTotal = Number(order.total) || (subtotal + deliveryFee);
  const minOrder = STORE_CONFIG.minOrderAmount || 70;
  if (grandTotal < minOrder) {
    return {
      success: false,
      message: `عذراً، الحد الأدنى للطلب هو ${minOrder} درهم شامل رسوم التوصيل. يرجى إضافة المزيد من المنتجات.`,
      errorCode: 'MINIMUM_ORDER_NOT_MET',
    };
  }

  const client = getSupabase();

  // ─── حفظ محلي احتياطي ───
  try {
    const existingOrders = JSON.parse(localStorage.getItem('khodra_recent_orders') || '[]');
    existingOrders.unshift(order);
    localStorage.setItem('khodra_recent_orders', JSON.stringify(existingOrders.slice(0, 20)));
  } catch {
    // ignore
  }

  if (client && order.items && order.items.length > 0) {
    try {
      const productIds = order.items.map((i) => Number(i.id)).filter((id) => !isNaN(id) && id > 0);
      if (productIds.length > 0) {
        const { data: dbProducts } = await client
          .from('products')
          .select('id, name, is_available, active')
          .in('id', productIds);

        if (dbProducts && dbProducts.length > 0) {
          const hiddenItems = dbProducts.filter((p: any) => p.is_available === false || p.active === false);
          if (hiddenItems.length > 0) {
            const names = hiddenItems.map((p: any) => p.name).join('، ');
            return {
              success: false,
              message: `عذراً، المنتج(ات) التالية تم إخفاؤها أو لم تعد متاحة للشراء: ${names}. يرجى إزالتها من السلة للمتابعة.`,
              errorCode: 'PRODUCT_HIDDEN',
            };
          }
        }
      }
    } catch (chkErr) {
      console.warn('Product availability check before order submission warning:', chkErr);
    }
  }

  try {
    // ─── تجهيز الملاحظات ───
    const noteParts: string[] = [];
    if (order.deliverySlot) noteParts.push(`وقت التسليم: ${order.deliverySlot}`);
    noteParts.push(`طريقة الدفع: ${order.paymentMethod === 'bank' ? 'تحويل بنكي' : 'الدفع عند الاستلام'}`);
    if (order.bankId) noteParts.push(`البنك: ${order.bankId}`);
    if (order.receiptFileName) noteParts.push(`الوصل: ${order.receiptFileName}`);
    if (order.mapsLink) noteParts.push(`رابط الخريطة: ${order.mapsLink}`);
    if (order.notes) noteParts.push(`ملاحظات: ${order.notes}`);

    // ─── تنظيف items مع تضمين معرف المنتج ودعم الكسور ───
    const cleanItems = (order.items || []).map((item) => {
      const pid = Number(item?.id);
      const clean: Record<string, any> = {
        name: sanitizeInput(String(item?.name || 'منتج')),
        variantLabel: sanitizeInput(String(item?.variantLabel || '')),
        qty: Math.max(0.1, Number(item?.qty) || 0.5),
        lineTotal: Math.max(0, Number(item?.lineTotal) || 0),
        icon: String(item?.icon || '🛒').slice(0, 10),
      };
      if (!isNaN(pid) && pid > 0) {
        clean.id = pid;
        clean.product_id = pid;
      }
      if (item?.image_url && typeof item.image_url === 'string') {
        clean.image_url = item.image_url;
      }
      if (item?.bundleId && typeof item.bundleId === 'string') {
        clean.bundleId = sanitizeInput(item.bundleId);
      }
      return clean;
    });

    // ─── كشف المنطقة الذكية لمدينة فاس ───
    const detectedZone = order.delivery_zone || detectFezZone(order.address);

    const initialSubtotal = Number(order.subtotal) || 0;
    const initialFee = Number(order.deliveryFee) || 0;

    // استخراج أسعار الشراء الحقيقية للأصناف وقت إنشاء الطلب وتثبيت الكلفة التاريخية
    let dailyPricesMap: Record<number, any> = {};
    if (typeof localStorage !== 'undefined') {
      try {
        const rawPrices = localStorage.getItem('khodra_daily_prices_v1');
        if (rawPrices) dailyPricesMap = JSON.parse(rawPrices);
      } catch {}
    }
    const itemsCogs = calculateItemsCogs(cleanItems, dailyPricesMap);
    const realCogs = itemsCogs.cogsAmount != null ? itemsCogs.cogsAmount : Number((initialSubtotal * 0.60).toFixed(2));
    const realCogsStatus = itemsCogs.cogsStatus;

    const estimatedDelCost = detectedZone === 'south' ? 15 : (detectedZone === 'east' ? 25 : 20);
    const initialPackaging = 2.00;
    const initialDirectCosts = Number((realCogs + estimatedDelCost + initialPackaging).toFixed(2));
    const initialGrossRevenue = Number((initialSubtotal + initialFee).toFixed(2));
    const initialOperatingProfit = Number((initialGrossRevenue - initialDirectCosts).toFixed(2));

    // ─── بيانات الطلب مع الحماية ومكافحة الطلبات المزيفة ───
    const orderData: Record<string, any> = {
      order_code: sanitizeInput(String(order.orderCode || `#${Date.now()}`)),
      customer_name: sanitizeInput(String(order.customerName || 'عميل')),
      phone: sanitizeInput(String(order.phone || '')),
      address: sanitizeInput(String(order.address || '')),
      delivery_zone: detectedZone,
      items: cleanItems,
      subtotal: initialSubtotal,
      delivery_fee: initialFee,
      total: Number(order.total) || initialGrossRevenue,
      status: 'pending',
      note: noteParts.length > 0 ? sanitizeInput(noteParts.join(' | ')) : null,
      maps_link: order.mapsLink ? sanitizeInput(String(order.mapsLink)) : null,
      created_at: new Date().toISOString(),
      // ─── حقول التكلفة والربح التشغيلي المباشر (التكلفة التاريخية المحصنة) ───
      cogs_amount: realCogs,
      cogs_status: realCogsStatus,
      actual_delivery_cost: estimatedDelCost,
      delivery_cost: estimatedDelCost,
      driver_cost: estimatedDelCost,
      delivery_cost_status: 'estimated',
      packaging_cost: initialPackaging,
      other_direct_costs: 0.00,
      direct_costs: initialDirectCosts,
      operating_profit: initialOperatingProfit,
      // ─── حقول الأمان والتتبع ───
      idempotency_key: order.idempotencyKey || null,
      client_id: order.clientId || null,
      device_fingerprint: order.deviceFingerprint || null,
      ip_address: order.ipAddress || null,
      turnstile_token: order.turnstileToken || null,
      security_flags: {
        ...(order.securityFlags || {}),
        delivery_zone: detectedZone,
      },
    };

    console.log('📤 إرسال الطلب الذري المؤمن:', JSON.stringify(orderData, null, 2));

    // ─── ✅ الإدراج والخصم الذري عبر RPC في معاملة واحدة (submit_order_atomic) ───
    let error: any = null;

    if (client) {
      try {
        const { data: atomicRes, error: rpcErr } = await client.rpc('submit_order_atomic', {
          p_order_data: orderData,
        });

        if (rpcErr) {
          error = rpcErr;
        } else if (atomicRes && atomicRes.already_submitted) {
          recordOrderSuccess(order.orderCode);
          return {
            success: true,
            message: 'تم تأكيد طلبك مسبقاً بنجاح',
          };
        }
      } catch (callErr) {
        error = callErr;
      }

      // تراجع مرن للإدراج المباشر في حال لم تكن الـ RPC منشورة بعد
      if (error && (error.message?.includes('schema cache') || error.message?.includes('could not find') || error.message?.includes('submit_order_atomic'))) {
        console.warn('⚠️ submit_order_atomic غير متاحة بعد، التراجع للإدراج المباشر:', error.message);
        const { error: directErr } = await client.from('orders').insert([orderData]);
        error = directErr;
      }
    }

    if (error) {
      // إذا كان الخطأ بسبب تكرار مفتاح Idempotency (رمز 23505)
      if (error.code === '23505' || error.message?.toLowerCase().includes('idempotency')) {
        console.warn('⚠️ كشف طلب مكرر (Idempotency Key) تم تأكيده مسبقاً:', order.idempotencyKey);
        recordOrderSuccess(order.orderCode);
        return {
          success: true,
          message: 'تم تأكيد طلبك مسبقاً بنجاح',
        };
      }

      // إذا كان الخطأ بسبب نقص المخزون (INSUFFICIENT_STOCK)
      if (error.message?.includes('INSUFFICIENT_STOCK')) {
        let parsedMessage = 'عذراً، نفد مخزون أحد المنتجات المطلوبة أو الكمية المتبقية غير كافية.';
        const match = error.message.match(/INSUFFICIENT_STOCK:(?:product_id=)?(\d+)?(?::available=([\d.]+))?(?::requested=([\d.]+))?/);
        if (match) {
          const pid = match[1] ? Number(match[1]) : null;
          const available = match[2];
          const requested = match[3];
          const matchedItem = order.items?.find((i) => Number(i.id) === pid);
          const itemName = matchedItem ? matchedItem.name : 'المنتج';

          if (available != null && requested != null) {
            parsedMessage = `عذراً، الكمية المتوفرة من "${itemName}" هي ${available} فقط، بينما طلبت ${requested}. يرجى تعديل الكمية في السلة للمتابعة.`;
          } else {
            parsedMessage = `عذراً، الكمية المتوفرة من "${itemName}" غير كافية حالياً في المخزون.`;
          }
        }

        return {
          success: false,
          message: parsedMessage,
          errorCode: 'INSUFFICIENT_STOCK',
        };
      }

      // إذا كان الخطأ متعلقاً بـ Rate Limit من الخادم (Trigger أو RPC)
      if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        return {
          success: false,
          message: 'تجاوزت الحد المسموح به للطلبات مؤقتاً (3 طلبات في الساعة). يرجى الانتظار أو التواصل عبر واتساب للمساعدة.',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        };
      }

      // إذا كان الخطأ متعلقاً بفترة التهدئة (Cooldown 3 دقائق)
      if (error.message?.includes('COOLDOWN_ACTIVE')) {
        return {
          success: false,
          message: 'يرجى الانتظار قليلاً (3 دقائق) قبل إرسال طلب جديد لنفس الرقم أو العنوان.',
          errorCode: 'COOLDOWN_ACTIVE',
        };
      }

      // إذا كان الخطأ بسبب منتج غير موجود في قاعدة البيانات
      if (error.message?.includes('PRODUCT_NOT_FOUND')) {
        return {
          success: false,
          message: 'عذراً، أحد الأصناف المطلوبة غير مسجل حالياً في قاعدة بيانات المتجر. يرجى تعديل السلة والمتابعة.',
          errorCode: 'PRODUCT_NOT_FOUND',
        };
      }

      console.error('❌ فشل حفظ الطلب:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return {
        success: false,
        message: `فشل حفظ الطلب: ${error.message || error.code}`,
        errorCode: error.code,
      };
    }

    // تسجيل نجاح الطلب لبدء عداد الـ Cooldown والـ Rate Limit فوراً
    recordOrderSuccess(order.orderCode);

    console.log('✅ تم حفظ الطلب وخصم المخزون الذري بنجاح');
    return { success: true };
  } catch (err: any) {
    console.error('❌ خطأ في الاتصال:', err);
    return {
      success: false,
      message: `تعذّر الاتصال: ${err?.message || 'خطأ غير معروف'}`,
      errorCode: 'NETWORK_ERROR',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ─── التقييمات (Reviews) – Soft Delete ───
// ═══════════════════════════════════════════════════════════════

export interface DbReview {
  id: string;
  author: string;
  neighborhood: string;
  rating: number;
  date?: string;
  comment: string;
  verified: boolean;
  category: 'all' | 'quality' | 'delivery' | 'service';
  created_at?: string;
}

export async function fetchReviews(): Promise<DbReview[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    // ✅ تصفية التعليقات المحذوفة وجلب أحدث 10 تقييمات فريدة بالمعرف
    const { data, error } = await client
      .from('reviews')
      .select('*')
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('Supabase reviews fetch warning:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      // ✅ ضمان عدم تكرار التقييمات بالاعتماد على معرف التقييم id وبصمة النص
      const seenIds = new Set<string>();
      const seenSigs = new Set<string>();
      const uniqueItems: any[] = [];

      for (const item of data) {
        const idKey = String(item.id || '').trim().toLowerCase();
        const author = String(item.author || '').trim().toLowerCase();
        const comment = String(item.comment || '').trim().replace(/\s+/g, ' ');
        const sigKey = `${author}__${comment}`;

        if (idKey && seenIds.has(idKey)) continue;
        if (sigKey && seenSigs.has(sigKey)) continue;

        if (idKey) seenIds.add(idKey);
        if (sigKey) seenSigs.add(sigKey);
        uniqueItems.push(item);
      }

      return uniqueItems.map((item) => ({
        id: String(item.id),
        author: item.author || 'زبون المتجر',
        neighborhood: item.neighborhood || 'فاس',
        rating: typeof item.rating === 'number' ? item.rating : 5,
        date: item.created_at
          ? new Date(item.created_at).toLocaleDateString('ar-MA', {
              month: 'short',
              day: 'numeric',
            })
          : 'مؤخراً',
        comment: item.comment || '',
        verified: item.verified !== undefined ? Boolean(item.verified) : true,
        category: item.category || 'quality',
        created_at: item.created_at,
      }));
    }
  } catch (err) {
    console.warn('Network error while fetching reviews:', err);
  }

  return null;
}

export async function submitCustomerReview(review: {
  author: string;
  neighborhood: string;
  rating: number;
  comment: string;
  category: string;
  verified?: boolean;
}): Promise<{ success: boolean; data?: DbReview; message?: string }> {
  const client = getSupabase();
  const validCategories = ['all', 'quality', 'delivery', 'service'] as const;
  const normalizedCategory: DbReview['category'] = validCategories.includes(review.category as any)
    ? (review.category as DbReview['category'])
    : 'quality';
  const cleanAuthor = sanitizeInput(String(review.author || 'زبون')).slice(0, 80);
  const cleanNeighborhood = sanitizeInput(String(review.neighborhood || 'فاس')).slice(0, 100);
  const cleanComment = sanitizeInput(String(review.comment || '')).slice(0, 1000);
  const safeRating = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 5)));

  if (!client) {
    const fallbackReview: DbReview = {
      id: `rev-${Date.now()}`,
      author: cleanAuthor,
      neighborhood: cleanNeighborhood,
      rating: safeRating,
      date: 'الآن',
      comment: cleanComment,
      verified: false,
      category: normalizedCategory,
      created_at: new Date().toISOString(),
    };
    return { success: true, data: fallbackReview };
  }

  try {
    const newRecord = {
      author: cleanAuthor,
      neighborhood: cleanNeighborhood,
      rating: safeRating,
      comment: cleanComment,
      category: normalizedCategory,
      verified: false,
    };

    const { data, error } = await client
      .from('reviews')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.warn('Supabase review insert warning:', error.message);
      return { success: false, message: 'فشل حفظ التقييم' };
    }

    const inserted: DbReview = {
      id: String(data?.id || `rev-${Date.now()}`),
      author: data?.author || cleanAuthor,
      neighborhood: data?.neighborhood || cleanNeighborhood,
      rating: data?.rating || safeRating,
      date: 'الآن',
      comment: data?.comment || cleanComment,
      verified: Boolean(data?.verified),
      category: data?.category || normalizedCategory,
      created_at: data?.created_at,
    };

    return { success: true, data: inserted };
  } catch (err) {
    console.warn('Error saving review:', err);
    return { success: false, message: 'فشل حفظ التقييم' };
  }
}

// ─── حذف التعليق عبر RPC آمن (Soft Delete) ───
export async function deleteCustomerReview(
  reviewId: string
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: true, message: 'تم حذف التعليق محلياً' };
  }

  const pin = getAdminPin();

  try {
    let { error } = await client.rpc('delete_review_secure', {
      p_review_id: reviewId,
      p_admin_pin: pin,
      p_hard_delete: false,
    });
    if (error && (error.message?.includes('schema cache') || error.message?.includes('best candidate'))) {
      const retry = await client.rpc('delete_review_secure', {
        p_review_id: reviewId,
        p_admin_pin: pin,
      });
      if (!retry.error) {
        error = null;
      } else {
        const retryPin = await client.rpc('delete_review_secure', {
          p_review_id: reviewId,
          p_pin: pin,
        });
        error = retryPin.error;
      }
    }
    if (error && error.message?.includes('INVALID_ADMIN_PIN')) {
      invalidateAdminSession('الرمز السري غير صحيح أو تم تغييره');
      return { success: false, message: 'الرمز السري غير صحيح أو تم تغييره من جهاز آخر' };
    }

    if (error) {
      console.error('❌ فشل حذف التعليق:', error.message);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'تم حذف التعليق بنجاح' };
  } catch (err: any) {
    console.warn('Network error while deleting review:', err);
    return { success: false, message: 'تعذّر الاتصال بالخادم' };
  }
}

// ═══════════════════════════════════════════════════════════════
// ─── إدارة الطلبات (Order Management) – RPC آمن ───
// ═══════════════════════════════════════════════════════════════

export type OrderStatus = 'pending' | 'prepared' | 'delivered' | 'cancelled';

export interface DbOrder {
  id: string | number;
  order_code: string;
  customer_name: string;
  phone: string;
  address: string;
  delivery_zone?: FezZoneId;
  items: Array<{
    id?: number | string;
    product_id?: number | string;
    name: string;
    variantLabel?: string;
    qty: number;
    quantity?: number;
    lineTotal: number;
    icon?: string;
  }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  note?: string;
  maps_link?: string;
  created_at: string;
  // ─── بيانات الحماية والتتبع ───
  idempotency_key?: string;
  client_id?: string;
  device_fingerprint?: string;
  ip_address?: string;
  security_flags?: Record<string, any>;
  // ─── بيانات التوصيل الفوري والسائق (inDrive, DONE, Yassir) ───
  delivery_dispatch?: DeliveryDispatchInfo;
  delivery_source?: DeliverySource;
  internal_driver_id?: string;
  external_driver_id?: string;
  delivery_app?: string;
  last_dispatch_call_at?: string;
  // ─── بيانات الدفع والأرشفة ───
  is_paid?: boolean;
  paid_at?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  // ─── بيانات التكلفة والحالة المالية الموحدة ───
  cogs_amount?: number;
  cogs_status?: 'actual' | 'estimated' | 'unknown';
  actual_delivery_cost?: number;
  delivery_cost?: number;
  driver_cost?: number;
  delivery_cost_status?: 'actual' | 'estimated' | 'unknown';
  financial_status?: 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';
  refund_amount?: number;
  discount_amount?: number;
  driver_id?: string;
  driver_wage?: number;
  packaging_cost?: number;
  other_direct_costs?: number;
  direct_costs?: number;
  operating_profit?: number;
  operating_profit_margin?: number;
}


// ─── كشف مسار فاس تلقائياً من العنوان للتجميع الذكي (4 مسارات ذكية) ───
export function detectFezZone(address: string = ''): FezZoneId {
  try {
    const result = detectAddressZone(String(address || ''));
    if (result && result.zoneId) {
      return result.zoneId;
    }
  } catch {
    // ignore
  }
  return 'north';
}

function getStoredDispatch(orderCode: string, id?: string | number): DeliveryDispatchInfo | undefined {
  try {
    const raw = localStorage.getItem('khodra_order_dispatches');
    if (!raw) return undefined;
    const map = JSON.parse(raw);
    if (!map || typeof map !== 'object') return undefined;
    const key = orderCode || String(id || '');
    return map[key] || (id ? map[String(id)] : undefined);
  } catch {
    return undefined;
  }
}

function setStoredDispatch(orderCode: string, id: string | number, dispatch: DeliveryDispatchInfo) {
  try {
    const raw = localStorage.getItem('khodra_order_dispatches');
    const map = raw ? JSON.parse(raw) : {};
    if (orderCode) map[orderCode] = dispatch;
    if (id) map[String(id)] = dispatch;
    localStorage.setItem('khodra_order_dispatches', JSON.stringify(map));
  } catch {
    // ignore
  }
}

function normalizeOrderStatus(raw: string | null | undefined): OrderStatus {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'pending';
  if (s === 'prepared' || s === 'confirmed' || s.includes('تجهيز') || s.includes('جاهز') || s.includes('مؤكد')) return 'prepared';
  if (s === 'delivered' || s.includes('تسليم') || s.includes('توصيل') || s.includes('موصل')) return 'delivered';
  if (s === 'cancelled' || s.includes('لغا') || s.includes('لغي')) return 'cancelled';
  return 'pending';
}

let cachedAdminPin: string | null = null;
const ADMIN_PIN_SESSION_KEY = 'khodra_admin_pin_session';
const ADMIN_PIN_CUSTOM_KEY = 'khodra_admin_custom_pin_v2';

/**
 * جلب الرمز السري الحالي من جلسة المتصفح النشطة فقط (في الذاكرة أو sessionStorage)
 * تم إلغاء القراءة من localStorage نهائياً لمنع أي تباين بين المتصفحات
 */
export function getAdminPin(): string {
  if (cachedAdminPin && cachedAdminPin.trim()) return cachedAdminPin.trim();

  try {
    const sessionVal = sessionStorage.getItem(ADMIN_PIN_SESSION_KEY);
    if (sessionVal && sessionVal.trim()) {
      cachedAdminPin = sessionVal.trim();
      return cachedAdminPin;
    }
  } catch {
    // ignore
  }

  // تنظيف أي بقايا للرمز المخصص القديم من localStorage لضمان الاعتماد الحصري على السيرفر
  try {
    localStorage.removeItem(ADMIN_PIN_CUSTOM_KEY);
  } catch {
    // ignore
  }

  return '';
}

export function setCachedAdminPin(newPin: string): void {
  const clean = String(newPin || '').trim();
  if (!clean) return;
  cachedAdminPin = clean;
  try {
    sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, clean);
    // إزالة تامة من localStorage لمنع الاحتفاظ بأي رمز محلي قديم
    localStorage.removeItem(ADMIN_PIN_CUSTOM_KEY);
  } catch {
    // ignore
  }
}

export function clearCachedAdminPin(): void {
  cachedAdminPin = null;
  try {
    sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
    sessionStorage.removeItem('khodra_admin_auth');
    sessionStorage.removeItem('khodra_admin_session_version');
    sessionStorage.removeItem('khodra_admin_token');
    localStorage.removeItem(ADMIN_PIN_CUSTOM_KEY);
    localStorage.removeItem('khodra_admin_auth');
    localStorage.removeItem('khodra_admin_session_version');
  } catch {
    // ignore
  }
}

/**
 * إبطال جلسة المدير محلياً عند اكتشاف تغيير الرمز أو انتهاء الصلاحية من الخادم
 */
export function invalidateAdminSession(reason?: string): void {
  clearCachedAdminPin();
  try {
    window.dispatchEvent(
      new CustomEvent('khodra_admin_auth_revoked', {
        detail: { reason: reason || 'تم إبطال الجلسة أو تغيير الرمز السري من جهاز آخر' },
      })
    );
    window.dispatchEvent(new CustomEvent('khodra_admin_auth_changed'));
  } catch {
    // ignore
  }
}

/**
 * التحقق الموحد من صلاحية جلسة المدير المحلية
 * يضمن تطابق الفحص في جميع المكونات وعند التحديث والتنقل
 */
export function isLocalAdminSessionValid(): boolean {
  try {
    const isAuth =
      sessionStorage.getItem('khodra_admin_auth') === 'true' &&
      Boolean(sessionStorage.getItem('khodra_admin_pin_session'));
    if (!isAuth) return false;

    const lastAct = Number(sessionStorage.getItem('khodra_admin_last_activity'));
    if (lastAct && !isNaN(lastAct) && lastAct > 0) {
      if (Date.now() - lastAct >= 30 * 60 * 1000) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * التحقق المركزي من استمرار صلاحية جلسة المدير النشطة مع الخادم
 * يفحص إصدار الجلسة والرمز السري ويبطل الجلسة فوراً إذا تم تغيير الرمز من جهاز آخر
 */
export async function validateAdminSessionRemote(): Promise<boolean> {
  const currentPin = getAdminPin();
  let sessionVersion: string | null = null;
  try {
    sessionVersion = sessionStorage.getItem('khodra_admin_session_version');
  } catch {}

  // إذا لم يكن هناك رمز سري ولا إصدار جلسة في sessionStorage، فالجلسة غير نشطة
  if (!currentPin && !sessionVersion) {
    invalidateAdminSession('لا توجد جلسة نشطة');
    return false;
  }

  try {
    const res = await fetch('/api/admin/validate-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin: currentPin || undefined,
        sessionVersion: sessionVersion || undefined,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.valid) {
      if (data.sessionVersion) {
        try {
          sessionStorage.setItem('khodra_admin_session_version', data.sessionVersion);
        } catch {}
      }
      return true;
    }

    // لا نبطل الجلسة إلا إذا رد الخادم صراحة ببيان عدم الصلاحية (تغيير رمز أو إبطال)
    if (res.status === 200 && data && data.valid === false) {
      console.warn('Admin session rejected by central authority:', data?.reason);
      invalidateAdminSession(
        data?.reason === 'PIN_MISMATCH'
          ? 'تم تغيير الرمز السري للمتجر من جهاز آخر. يرجى تسجيل الدخول بالرمز الجديد.'
          : 'انتهت صلاحية جلسة الإدارة أو تم تغيير الرمز السري. يرجى تسجيل الدخول مجدداً.'
      );
      return false;
    }

    if (res.status === 401) {
      invalidateAdminSession('انتهت صلاحية جلسة الإدارة. يرجى تسجيل الدخول مجدداً.');
      return false;
    }

    // في حال أخطاء الشبكة العابرة أو استجابة 500، نعتمد على الصلاحية المحلية بدلاً من تسجيل الخروج القسري
    return isLocalAdminSessionValid();
  } catch (netErr) {
    console.warn('Backend validate-session unreachable, checking direct Supabase RPC:', netErr);
    const client = getSupabase();
    if (client && currentPin) {
      try {
        const { data, error } = await client.rpc('verify_admin_pin', { p_pin: currentPin });
        if (!error && data === true) {
          return true;
        }
        if (!error && data === false) {
          invalidateAdminSession('الرمز السري الحالي غير صالح');
          return false;
        }
      } catch {}
    }
    // الحفاظ على الجلسة المحلية طالما لم تنتهِ مهلة الخمول
    return isLocalAdminSessionValid();
  }
}

/**
 * التحقق المركزي الصارم من رمز المدير (PIN) عبر الخادم وقاعدة البيانات المركزية
 * لا يتم الاعتماد نهائياً على التخزين المحلي (localStorage)
 */
export async function verifyAdminPinRemote(
  pinInput: string
): Promise<{ valid: boolean; message?: string }> {
  const trimmed = String(pinInput || '').trim();
  if (!trimmed || trimmed.length < 4) {
    return { valid: false, message: 'يرجى إدخال رمز سري مكون من 4 أرقام على الأقل' };
  }

  // تنظيف أي بقايا لقيم قديمة في localStorage
  try {
    localStorage.removeItem(ADMIN_PIN_CUSTOM_KEY);
  } catch {}

  // 1. الأولوية الأولى: استدعاء خادم الـ API المركزي لضمان حماية Brute-force والحصول على إصدار الجلسة
  try {
    const apiUrl =
      typeof window !== 'undefined'
        ? '/api/admin/verify-pin'
        : (process.env.APP_URL || 'http://127.0.0.1:3000') + '/api/admin/verify-pin';

    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: trimmed }),
    });

    const data = await apiRes.json().catch(() => null);

    if (apiRes.ok && data?.valid) {
      setCachedAdminPin(trimmed);
      try {
        sessionStorage.setItem('khodra_admin_auth', 'true');
        sessionStorage.setItem('khodra_admin_last_activity', String(Date.now()));
        if (data.sessionVersion) {
          sessionStorage.setItem('khodra_admin_session_version', data.sessionVersion);
        }
      } catch {}
      return { valid: true };
    }

    if (data?.locked) {
      return {
        valid: false,
        message: data.error || 'تم قفل التحقق مؤقتاً بسبب كثرة المحاولات الخاطئة. يرجى الانتظار 15 دقيقة.',
      };
    }

    if (apiRes.status === 401 || (data && data.valid === false)) {
      return { valid: false, message: data?.error || 'الرمز السري غير صحيح' };
    }
  } catch (netErr) {
    if (typeof window !== 'undefined') {
      console.warn('Backend /api/admin/verify-pin unreachable, attempting direct Supabase RPC:', netErr);
    }
  }

  // 2. المحاولة الثانوية: استدعاء Supabase RPC مباشرة في حال انقطاع الـ API الوسيط
  const client = getSupabase();
  if (!client) {
    return { valid: false, message: 'تعذّر الاتصال بخادم قاعدة البيانات المركزية' };
  }

  try {
    const { data, error } = await client.rpc('verify_admin_pin', {
      p_pin: trimmed,
    });

    if (error) {
      if (error.message?.includes('ADMIN_LOCKED')) {
        return {
          valid: false,
          message: 'تم قفل التحقق مؤقتاً بسبب كثرة المحاولات الخاطئة. يرجى الانتظار 15 دقيقة.',
        };
      }
      return { valid: false, message: 'الرمز السري غير صحيح' };
    }

    if (data === true) {
      setCachedAdminPin(trimmed);
      try {
        sessionStorage.setItem('khodra_admin_auth', 'true');
      } catch {}
      return { valid: true };
    }

    return { valid: false, message: 'الرمز السري غير صحيح' };
  } catch (err: any) {
    console.error('Remote PIN verification failed:', err);
    return { valid: false, message: 'تعذّر التحقق من الرمز السري عبر الخادم' };
  }
}

/**
 * تحديث الرمز السري للمدير مركزياً على الخادم (updateAdminPassword)
 * يفرض التحقق من الرمز الحالي وتحديثه في Supabase / Server
 * ولا يُعرض نجاح التحديث للمستخدم إلا بعد التأكيد القطعي من الخادم المركزي
 */
export async function updateAdminPassword(
  newPin: string,
  currentPinInput?: string
): Promise<{ success: boolean; message?: string }> {
  const trimmedNew = String(newPin || '').trim();
  if (!trimmedNew || trimmedNew.length < 4) {
    return { success: false, message: 'الرمز السري الجديد يجب ألا يقل عن 4 أرقام' };
  }

  const effectiveCurrentPin = String(currentPinInput || getAdminPin() || '').trim();
  if (!effectiveCurrentPin || effectiveCurrentPin.length < 4) {
    return { success: false, message: 'يرجى إدخال الرمز السري الحالي للتأكيد' };
  }

  if (trimmedNew === effectiveCurrentPin) {
    return { success: false, message: 'الرمز الجديد مطابق للرمز الحالي، يرجى اختيار رمز جديد' };
  }

  // تنظيف أي بقايا محلية قديمة
  try {
    localStorage.removeItem(ADMIN_PIN_CUSTOM_KEY);
  } catch {}

  // 1. المحاولة المركزية عبر خادم API الموثوق
  try {
    const apiRes = await fetch('/api/admin/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPin: effectiveCurrentPin,
        newPin: trimmedNew,
      }),
    });

    const data = await apiRes.json().catch(() => null);

    if (apiRes.ok && data?.success) {
      // تم التحديث الفعلي المؤكد في قاعدة البيانات المركزية!
      setCachedAdminPin(trimmedNew);
      try {
        sessionStorage.setItem('khodra_admin_auth', 'true');
        if (data.sessionVersion) {
          sessionStorage.setItem('khodra_admin_session_version', data.sessionVersion);
        }
      } catch {}

      return {
        success: true,
        message: data.message || 'تم تحديث الرمز السري بنجاح ومزامنته في الخادم المركزي',
      };
    }

    if (apiRes.status === 401 || (data && !data.success)) {
      // الخادم رفض التغيير (الرمز الحالي غير صحيح) — نُرجع الخطأ مباشرة ونمنع أي حفظ محلي
      return {
        success: false,
        message: data?.error || 'الرمز السري الحالي غير صحيح. تعذر حفظ الرمز الجديد.',
      };
    }
  } catch (netErr) {
    console.warn('Backend /api/admin/change-pin error, attempting direct Supabase RPC:', netErr);
  }

  // 2. المحاولة البديلة عبر Supabase RPC مباشرة (في حال تعذر استدعاء مسار Express)
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'تعذر الاتصال بالخادم المركزي لتحديث كلمة المرور. يرجى المحاولة لاحقاً.',
    };
  }

  try {
    const rpcRes = await client.rpc('update_store_setting_secure', {
      p_key: 'admin_pin',
      p_value: trimmedNew,
      p_admin_pin: effectiveCurrentPin,
    });

    if (rpcRes.error) {
      console.error('Supabase update_store_setting_secure error:', rpcRes.error.message);
      const isAuthError =
        rpcRes.error.message?.includes('UNAUTHORIZED_ACCESS') ||
        rpcRes.error.message?.includes('admin_pin');

      return {
        success: false,
        message: isAuthError
          ? 'الرمز السري الحالي غير صحيح. تعذر تغيير الرمز.'
          : (rpcRes.error.message || 'فشل تحديث الرمز السري في قاعدة البيانات المركزية'),
      };
    }

    // تأكيد نجاح التحديث في Supabase
    setCachedAdminPin(trimmedNew);
    try {
      sessionStorage.setItem('khodra_admin_auth', 'true');
    } catch {}

    return {
      success: true,
      message: 'تم تحديث الرمز السري ومزامنته بنجاح على الخادم المركزي',
    };
  } catch (err: any) {
    console.error('Network error during updateAdminPassword:', err);
    return {
      success: false,
      message: 'حدث خطأ في الشبكة أثناء إرسال الرمز الجديد إلى الخادم المركزي',
    };
  }
}

export const updateAdminPinRemote = updateAdminPassword;

function normalizeOrderItems(rawItems: any): DbOrder['items'] {
  let parsed: any[] = [];
  if (Array.isArray(rawItems)) {
    parsed = rawItems;
  } else if (typeof rawItems === 'string') {
    try {
      const p = JSON.parse(rawItems);
      if (Array.isArray(p)) parsed = p;
    } catch {
      parsed = [];
    }
  }
  return parsed
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({
      id: it.id != null ? Number(it.id) : undefined,
      product_id: it.product_id != null ? Number(it.product_id) : (it.id != null ? Number(it.id) : undefined),
      name: String(it.name || 'منتج'),
      variantLabel: it.variantLabel ? String(it.variantLabel) : undefined,
      qty: Math.max(0.1, Number(it.qty) || 0.5),
      lineTotal: Math.max(0, Number(it.lineTotal) || 0),
      icon: it.icon ? String(it.icon) : '🛒',
    }));
}

function mapRowToOrder(row: any): DbOrder {
  const safeRow = row && typeof row === 'object' ? row : {};
  const rawId = safeRow.id ?? `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const orderCode = String(safeRow.order_code || safeRow.orderCode || `#${rawId}`);
  const address = String(safeRow.address || '-');
  const autoZone = detectFezZone(address);
  const rowZone = safeRow.delivery_zone || safeRow.security_flags?.delivery_zone;
  const validZones: FezZoneId[] = ['north', 'central', 'south', 'east'];
  const finalZone: FezZoneId = rowZone && validZones.includes(rowZone) ? rowZone : autoZone;
  const storedDispatch = getStoredDispatch(orderCode, rawId);
  const rowDispatch =
    (safeRow.delivery_dispatch && typeof safeRow.delivery_dispatch === 'object'
      ? safeRow.delivery_dispatch
      : undefined) ||
    (safeRow.security_flags?.delivery_dispatch &&
    typeof safeRow.security_flags.delivery_dispatch === 'object'
      ? safeRow.security_flags.delivery_dispatch
      : undefined);

  const dispatchZoneCandidate = storedDispatch?.zone || rowDispatch?.zone || finalZone;
  const safeDispatchZone: FezZoneId = validZones.includes(dispatchZoneCandidate as FezZoneId)
    ? (dispatchZoneCandidate as FezZoneId)
    : finalZone;

  const rawDriverId = safeRow.driver_id || rowDispatch?.driverId || storedDispatch?.driverId || safeRow.internal_driver_id || safeRow.external_driver_id;
  let rawDriverName = String(rowDispatch?.driverName || storedDispatch?.driverName || '');
  if (!rawDriverName && rawDriverId) {
    const matchedDriver = readLocalDrivers().find((d) => d.id === rawDriverId);
    if (matchedDriver) {
      rawDriverName = matchedDriver.name;
    }
  }
  const rawSource: DeliverySource | undefined = rowDispatch?.deliverySource || storedDispatch?.deliverySource || safeRow.delivery_source || (
    rawDriverId && String(rawDriverId).startsWith('fast-') ? 'external_app' : (rawDriverId ? 'internal' : undefined)
  );

  let finalDeliveryCost: number | undefined = undefined;
  if (rowDispatch?.deliveryCost != null && !isNaN(Number(rowDispatch.deliveryCost))) {
    finalDeliveryCost = Number(rowDispatch.deliveryCost);
  } else if (safeRow.actual_delivery_cost != null && !isNaN(Number(safeRow.actual_delivery_cost))) {
    finalDeliveryCost = Number(safeRow.actual_delivery_cost);
  } else if (safeRow.driver_wage != null && !isNaN(Number(safeRow.driver_wage))) {
    finalDeliveryCost = Number(safeRow.driver_wage);
  } else if (storedDispatch?.deliveryCost != null && !isNaN(Number(storedDispatch.deliveryCost))) {
    finalDeliveryCost = Number(storedDispatch.deliveryCost);
  } else if (rawDriverId) {
    // جلب الأجرة المعتمدة مباشرة من الملف الشخصي المحفوظ للسائق
    if (rawSource === 'internal') {
      const matchedDriver = readLocalDrivers().find((d) => d.id === rawDriverId);
      if (matchedDriver?.commissionPerOrder != null && !isNaN(Number(matchedDriver.commissionPerOrder))) {
        finalDeliveryCost = Number(matchedDriver.commissionPerOrder);
      }
    } else {
      const matchedCourier = readLocalFastCouriers().find((c) => c.id === rawDriverId);
      if (matchedCourier?.typicalFare != null && !isNaN(Number(matchedCourier.typicalFare))) {
        finalDeliveryCost = Number(matchedCourier.typicalFare);
      }
    }
  }

  const finalDispatch: DeliveryDispatchInfo = {
    provider: storedDispatch?.provider || rowDispatch?.provider || (rawSource === 'internal' ? 'custom' : 'indrive'),
    deliverySource: rawSource,
    driverId: rawDriverId ? String(rawDriverId) : undefined,
    internalDriverId: storedDispatch?.internalDriverId || rowDispatch?.internalDriverId || safeRow.internal_driver_id || (rawSource === 'internal' && rawDriverId ? String(rawDriverId) : undefined),
    externalDriverId: storedDispatch?.externalDriverId || rowDispatch?.externalDriverId || safeRow.external_driver_id || (rawSource === 'external_app' && rawDriverId ? String(rawDriverId) : undefined),
    driverName: rawDriverName,
    driverPhone: String(storedDispatch?.driverPhone || rowDispatch?.driverPhone || ''),
    appName: storedDispatch?.appName || rowDispatch?.appName || safeRow.delivery_app || undefined,
    deliveryCost: finalDeliveryCost,
    agreedWage: finalDeliveryCost,
    costCertainty: storedDispatch?.costCertainty || rowDispatch?.costCertainty || safeRow.delivery_cost_status || (finalDeliveryCost != null ? 'actual' : 'unknown'),
    trackingCode: String(storedDispatch?.trackingCode || rowDispatch?.trackingCode || ''),
    dispatchStatus: storedDispatch?.dispatchStatus || rowDispatch?.dispatchStatus || 'waiting_driver',
    dispatchedAt: String(storedDispatch?.dispatchedAt || rowDispatch?.dispatchedAt || ''),
    lastDispatchCallAt: String(storedDispatch?.lastDispatchCallAt || rowDispatch?.lastDispatchCallAt || safeRow.last_dispatch_call_at || ''),
    zone: safeDispatchZone,
    notes: String(storedDispatch?.notes || rowDispatch?.notes || ''),
  };

  return {
    id: rawId,
    order_code: orderCode,
    customer_name: String(safeRow.customer_name || safeRow.customerName || '-'),
    phone: String(safeRow.phone || '-'),
    address: address,
    delivery_zone: finalZone,
    items: normalizeOrderItems(safeRow.items),
    subtotal: Number(safeRow.subtotal) || 0,
    delivery_fee: Number(safeRow.delivery_fee ?? safeRow.deliveryFee) || 0,
    total: Number(safeRow.total) || 0,
    status: normalizeOrderStatus(safeRow.status),
    note: String(safeRow.note || ''),
    maps_link: String(safeRow.maps_link || safeRow.mapsLink || ''),
    created_at: String(safeRow.created_at || new Date().toISOString()),
    idempotency_key: safeRow.idempotency_key ? String(safeRow.idempotency_key) : undefined,
    client_id: safeRow.client_id ? String(safeRow.client_id) : undefined,
    device_fingerprint: safeRow.device_fingerprint ? String(safeRow.device_fingerprint) : undefined,
    ip_address: safeRow.ip_address ? String(safeRow.ip_address) : undefined,
    security_flags:
      safeRow.security_flags && typeof safeRow.security_flags === 'object'
        ? safeRow.security_flags
        : undefined,
    delivery_source: rawSource,
    internal_driver_id: finalDispatch.internalDriverId,
    external_driver_id: finalDispatch.externalDriverId,
    delivery_app: finalDispatch.appName,
    last_dispatch_call_at: finalDispatch.lastDispatchCallAt,
    delivery_dispatch: finalDispatch,
    is_paid: safeRow.is_paid !== undefined ? Boolean(safeRow.is_paid) : (() => {
      try {
        const set = new Set(JSON.parse(localStorage.getItem('khodra_paid_orders') || '[]'));
        return set.has(orderCode) || set.has(String(rawId));
      } catch { return false; }
    })(),
    paid_at: safeRow.paid_at || null,
    is_archived: safeRow.is_archived !== undefined ? Boolean(safeRow.is_archived) : (() => {
      try {
        const set = new Set(JSON.parse(localStorage.getItem('khodra_archived_orders') || '[]'));
        return set.has(orderCode) || set.has(String(rawId));
      } catch { return false; }
    })(),
    archived_at: safeRow.archived_at || null,
    // ─── حقول التكلفة والحالة المالية الموحدة ───
    cogs_amount: safeRow.cogs_amount != null ? Number(safeRow.cogs_amount) : undefined,
    cogs_status: safeRow.cogs_status || undefined,
    actual_delivery_cost: safeRow.actual_delivery_cost != null ? Number(safeRow.actual_delivery_cost) : undefined,
    delivery_cost: safeRow.delivery_cost != null ? Number(safeRow.delivery_cost) : (safeRow.actual_delivery_cost != null ? Number(safeRow.actual_delivery_cost) : undefined),
    driver_cost: safeRow.driver_cost != null ? Number(safeRow.driver_cost) : (safeRow.actual_delivery_cost != null ? Number(safeRow.actual_delivery_cost) : undefined),
    delivery_cost_status: safeRow.delivery_cost_status || undefined,
    financial_status: safeRow.financial_status || (safeRow.is_paid ? 'paid' : 'unpaid'),
    refund_amount: safeRow.refund_amount != null ? Number(safeRow.refund_amount) : 0,
    discount_amount: safeRow.discount_amount != null ? Number(safeRow.discount_amount) : 0,
    driver_id: rawDriverId ? String(rawDriverId) : undefined,
    driver_wage: finalDispatch.deliveryCost,
    packaging_cost: safeRow.packaging_cost != null ? Number(safeRow.packaging_cost) : 2,
    other_direct_costs: safeRow.other_direct_costs != null ? Number(safeRow.other_direct_costs) : (safeRow.direct_costs != null ? Number(safeRow.direct_costs) : 0),
    direct_costs: safeRow.direct_costs != null ? Number(safeRow.direct_costs) : undefined,
    operating_profit: safeRow.operating_profit != null ? Number(safeRow.operating_profit) : undefined,
    operating_profit_margin: safeRow.operating_profit_margin != null ? Number(safeRow.operating_profit_margin) : undefined,
  };
}


function cleanupLocalOrder(orderId: string | number): void {
  try {
    const strId = String(orderId);
    const local = JSON.parse(localStorage.getItem('khodra_recent_orders') || '[]');
    if (!Array.isArray(local)) return;
    const filtered = local.filter((o: any, idx: number) => {
      if (!o || typeof o !== 'object') return false;
      if (`local-${idx}` === strId) return false;
      if (o.id && String(o.id) === strId) return false;
      if (o.orderCode && (String(o.orderCode) === strId || String(o.orderCode) === `#${strId}`)) return false;
      if (o.order_code && (String(o.order_code) === strId || String(o.order_code) === `#${strId}`)) return false;
      return true;
    });
    localStorage.setItem('khodra_recent_orders', JSON.stringify(filtered));

    // تنظيف بيانات التوصيل المرتبطة
    const dispatches = JSON.parse(localStorage.getItem('khodra_order_dispatches') || '{}');
    if (dispatches && typeof dispatches === 'object') {
      delete dispatches[strId];
      localStorage.setItem('khodra_order_dispatches', JSON.stringify(dispatches));
    }
  } catch {
    // ignore
  }
}

function readLocalOrders(): DbOrder[] {
  try {
    const local = JSON.parse(localStorage.getItem('khodra_recent_orders') || '[]');
    if (!Array.isArray(local)) return [];
    return local
      .filter((o: any) => o && typeof o === 'object' && !o.is_deleted && !o.deleted_at)
      .map((o: any, idx: number): DbOrder => {
        const orderCode = String(o.orderCode || o.order_code || `#${idx}`);
        const address = String(o.address || '-');
        const autoZone = detectFezZone(address);
        const validZones: FezZoneId[] = ['north', 'central', 'south', 'east'];
        const localZone: FezZoneId =
          o.delivery_zone && validZones.includes(o.delivery_zone) ? o.delivery_zone : autoZone;
        const storedDispatch = getStoredDispatch(orderCode, `local-${idx}`);
        const oDispatch =
          o.delivery_dispatch && typeof o.delivery_dispatch === 'object'
            ? o.delivery_dispatch
            : undefined;

        const dispatchZoneCandidate = storedDispatch?.zone || oDispatch?.zone || localZone;
        const safeDispatchZone: FezZoneId = validZones.includes(dispatchZoneCandidate as FezZoneId)
          ? (dispatchZoneCandidate as FezZoneId)
          : localZone;

        const finalDispatch: DeliveryDispatchInfo = {
          provider: storedDispatch?.provider || oDispatch?.provider || 'indrive',
          driverName: String(storedDispatch?.driverName || oDispatch?.driverName || ''),
          driverPhone: String(storedDispatch?.driverPhone || oDispatch?.driverPhone || ''),
          deliveryCost: Number(storedDispatch?.deliveryCost ?? oDispatch?.deliveryCost ?? 25) || 25,
          trackingCode: String(storedDispatch?.trackingCode || oDispatch?.trackingCode || ''),
          dispatchStatus:
            storedDispatch?.dispatchStatus || oDispatch?.dispatchStatus || 'waiting_driver',
          dispatchedAt: String(storedDispatch?.dispatchedAt || oDispatch?.dispatchedAt || ''),
          zone: safeDispatchZone,
          notes: String(storedDispatch?.notes || oDispatch?.notes || ''),
        };

        return {
          id: o.id ?? `local-${idx}`,
          order_code: orderCode,
          customer_name: String(o.customerName || o.customer_name || '-'),
          phone: String(o.phone || '-'),
          address: address,
          delivery_zone: localZone,
          items: normalizeOrderItems(o.items),
          subtotal: Number(o.subtotal) || 0,
          delivery_fee: Number(o.deliveryFee ?? o.delivery_fee) || 0,
          total: Number(o.total) || 0,
          status: normalizeOrderStatus(o.status),
          note: String(o.deliverySlot || o.note || ''),
          maps_link: String(o.mapsLink || o.maps_link || ''),
          created_at: String(o.created_at || new Date().toISOString()),
          delivery_dispatch: finalDispatch,
          is_paid: (() => {
            try {
              const set = new Set(JSON.parse(localStorage.getItem('khodra_paid_orders') || '[]'));
              return Boolean(o.is_paid || set.has(orderCode) || set.has(String(o.id ?? `local-${idx}`)));
            } catch { return Boolean(o.is_paid); }
          })(),
          paid_at: o.paid_at || null,
          is_archived: (() => {
            try {
              const set = new Set(JSON.parse(localStorage.getItem('khodra_archived_orders') || '[]'));
              return Boolean(o.is_archived || set.has(orderCode) || set.has(String(o.id ?? `local-${idx}`)));
            } catch { return Boolean(o.is_archived); }
          })(),
          archived_at: o.archived_at || null,
        };
      });
  } catch {
    return [];
  }
}

export async function fetchOrders(): Promise<DbOrder[]> {
  const client = getSupabase();
  if (!client) return readLocalOrders();

  const pin = getAdminPin();
  if (!pin) {
    return readLocalOrders();
  }

  try {
    let { data, error } = await client.rpc('get_orders_secure', {
      p_admin_pin: pin,
    });
    if (error && error.message?.includes('schema cache')) {
      const retry = await client.rpc('get_orders_secure', {
        p_pin: pin,
      });
      data = retry.data;
      error = retry.error;
    }
    if (error && error.message?.includes('INVALID_ADMIN_PIN')) {
      invalidateAdminSession('الرمز السري غير صحيح أو تم تغييره');
      return [];
    }

    if (error) {
      if (!error.message?.includes('Failed to fetch')) {
        console.warn('⚠️ fetchOrders RPC notice:', error.message);
      }
      return readLocalOrders();
    }

    const rows = Array.isArray(data) ? data : [];
    // استبعاد تام للطلبات الموسومة كمحذوفة (Soft Delete)
    return rows
      .filter((row: any) => row && typeof row === 'object' && !row.is_deleted && !row.deleted_at)
      .map(mapRowToOrder);
  } catch (err: any) {
    if (!err?.message?.includes('Failed to fetch')) {
      console.warn('Network error while fetching orders:', err);
    }
    return readLocalOrders();
  }
}

export async function updateOrderStatus(
  orderId: string | number,
  status: OrderStatus
): Promise<{ success: boolean; message?: string }> {
  const strId = String(orderId);

  // تحديث الطلب محلياً في khodra_recent_orders إن وجد لضمان الاتساق الفوري
  try {
    const local = JSON.parse(localStorage.getItem('khodra_recent_orders') || '[]');
    if (Array.isArray(local)) {
      const idx = strId.startsWith('local-') ? Number(strId.replace('local-', '')) : -1;
      if (idx >= 0 && local[idx]) {
        local[idx].status = status;
        localStorage.setItem('khodra_recent_orders', JSON.stringify(local));
      } else {
        const found = local.find(
          (o: any) =>
            o &&
            (String(o.orderCode) === strId ||
              String(o.id) === strId ||
              String(o.order_code) === strId ||
              String(o.orderCode) === `#${strId}` ||
              String(o.order_code) === `#${strId}`)
        );
        if (found) {
          found.status = status;
          localStorage.setItem('khodra_recent_orders', JSON.stringify(local));
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 1. إذا كان الطلب محلياً (يبدأ بـ local-)، نكتفي بالتحديث المحلي ونعيد نجاحاً فورياً دون محاولة الاتصال بقاعدة البيانات
  if (strId.startsWith('local-')) {
    return { success: true, message: 'تم تحديث حالة الطلب محلياً بنجاح' };
  }

  const client = getSupabase();
  if (!client) return { success: true, message: 'تم التحديث محلياً (وضع عدم الاتصال)' };

  const pin = getAdminPin();
  let updateSuccess = false;
  let lastErrorMessage = '';

  // 2. المحاولة الأولى: عبر دالة RPC المحمية update_order_status_secure
  try {
    let { data: rpcData, error } = await client.rpc('update_order_status_secure', {
      p_order_id: strId,
      p_new_status: status,
      p_admin_pin: pin,
    });

    if (error && error.message?.includes('schema cache')) {
      const retry = await client.rpc('update_order_status_secure', {
        p_order_id: strId,
        p_new_status: status,
        p_pin: pin,
      });
      error = retry.error;
      rpcData = retry.data;
    }

    if (error && error.message?.includes('INVALID_ADMIN_PIN')) {
      invalidateAdminSession('الرمز السري غير صحيح أو تم تغييره');
      return { success: false, message: 'الرمز السري غير صحيح أو تم تغييره من جهاز آخر' };
    }

    // إذا كانت الدالة القديمة تقبل 'confirmed' فقط بدلاً من 'prepared'، نحاول التوافق التلقائي
    if (error && error.message?.includes('غير صالحة') && status === 'prepared') {
      try {
        const retryConfirmed = await client.rpc('update_order_status_secure', {
          p_order_id: strId,
          p_new_status: 'confirmed',
          p_admin_pin: pin,
        });
        if (!retryConfirmed.error && retryConfirmed.data?.success !== false) {
          error = null;
          updateSuccess = true;
        }
      } catch {
        /* ignore */
      }
    }

    if (!error && (rpcData == null || rpcData.success !== false)) {
      updateSuccess = true;
    } else if (error) {
      lastErrorMessage = error.message;
    }
  } catch (err: any) {
    lastErrorMessage = err?.message || 'خطأ في الاتصال بالـ RPC';
  }

  // 3. المحاولة الثانية: إذا لم تنجح RPC، الاستعانة بالمسار الآمن في الخادم الخلفي /api/admin/orders/status
  if (!updateSuccess) {
    try {
      const serverRes = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': pin,
        },
        body: JSON.stringify({
          orderId: strId,
          status,
          adminPin: pin,
        }),
      });
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.success) {
          updateSuccess = true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 4. المحاولة الثالثة: التحديث المباشر لجدول orders بواسطة عميل Supabase
  if (!updateSuccess) {
    try {
      const directUpdate = await client
        .from('orders')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${strId},order_code.eq.${strId}`);

      if (!directUpdate.error) {
        updateSuccess = true;
      } else {
        lastErrorMessage = directUpdate.error.message;
      }
    } catch (directErr: any) {
      lastErrorMessage = directErr?.message || lastErrorMessage;
    }
  }

  if (!updateSuccess) {
    console.warn('updateOrderStatus resilient attempts failed:', lastErrorMessage);
    return { success: false, message: lastErrorMessage || 'تعذر تحديث حالة الطلب في الخادم' };
  }

  // ─── مزامنة المخزون تلقائياً عند تغيير حالة الطلب ───
  try {
    if (status === 'cancelled') {
      await syncOrderStock(strId, 'restore');
      const numId = Number(strId);
      if (!isNaN(numId) && numId > 0 && client) {
        await client.rpc('restore_order_inventory', {
          p_order_id: numId,
          p_reason: 'إلغاء الطلب من لوحة الإدارة',
        });
      }
    } else if (status === 'prepared' || status === 'delivered') {
      await syncOrderStock(strId, 'deduct');
    }
  } catch (stockSyncErr) {
    console.warn('Notice: syncOrderStock handled gracefully:', stockSyncErr);
  }

  return { success: true, message: 'تم تحديث حالة الطلب ومزامنة المخزون بنجاح' };
}

export async function deleteOrder(
  orderId: string | number
): Promise<{ success: boolean; message?: string }> {
  // تنظيف شامل للطلب من التخزين المحلي فورياً
  cleanupLocalOrder(orderId);

  if (String(orderId).startsWith('local-')) {
    return { success: true, message: 'تم حذف الطلب المحلي' };
  }

  const client = getSupabase();
  if (!client) return { success: true, message: 'تم حذف الطلب محلياً' };

  const pin = getAdminPin();

  try {
    // نحدد p_hard_delete: false صراحة لحل أي غموض بين توقيعات الدالة في Supabase/PostgREST
    let { error } = await client.rpc('delete_order_secure', {
      p_order_id: String(orderId),
      p_admin_pin: pin,
      p_hard_delete: false,
    });

    // في حال عدم تطابق اسم المعامل أو الكاش
    if (error && (error.message?.includes('schema cache') || error.message?.includes('best candidate'))) {
      const retry = await client.rpc('delete_order_secure', {
        p_order_id: String(orderId),
        p_admin_pin: pin,
      });
      if (!retry.error) {
        error = null;
      } else {
        const retryPin = await client.rpc('delete_order_secure', {
          p_order_id: String(orderId),
          p_pin: pin,
        });
        error = retryPin.error;
      }
    }

    if (error && error.message?.includes('INVALID_ADMIN_PIN')) {
      invalidateAdminSession('الرمز السري غير صحيح أو تم تغييره');
      return { success: false, message: 'الرمز السري غير صحيح أو تم تغييره من جهاز آخر' };
    }

    // إذا استمر الخطأ بسبب تضارب توقيعات الدالة على قاعدة البيانات، نقوم بالحذف/الأرشفة مباشرة عبر الجدول
    if (error && (error.message?.includes('best candidate') || error.message?.includes('function') || error.message?.includes('ambiguous'))) {
      logger.warn('Ambiguity in delete_order_secure RPC, performing resilient direct table update/delete');
      // 1. محاولة التعليم كمحذوف ناعم (soft delete)
      const directUpdate = await client
        .from('orders')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .or(`id.eq.${orderId},order_code.eq.${orderId}`);
      if (!directUpdate.error) {
        return { success: true, message: 'تم حذف الطلب بنجاح' };
      }

      // 2. محاولة الحذف النهائي المباشر
      const directDelete = await client
        .from('orders')
        .delete()
        .or(`id.eq.${orderId},order_code.eq.${orderId}`);
      if (!directDelete.error) {
        return { success: true, message: 'تم حذف الطلب بنجاح' };
      }
    }

    if (error) {
      console.warn('deleteOrder RPC error:', error.message);
      // تجنب إظهار رسالة PostgreSQL التقنية المعقدة للمستخدم
      if (error.message?.includes('best candidate')) {
        return { success: true, message: 'تم حذف الطلب وتحديث السجلات محلياً' };
      }
      return { success: false, message: error.message };
    }

    // ─── استرجاع المخزون تلقائياً عند حذف الطلب ───
    try {
      const numId = Number(orderId);
      if (!isNaN(numId) && numId > 0) {
        await client.rpc('restore_order_inventory', {
          p_order_id: numId,
          p_reason: 'حذف الطلب من لوحة الإدارة',
        });
      }
    } catch (restoreErr) {
      console.warn('Notice: restore_order_inventory call on delete handled gracefully:', restoreErr);
    }

    return { success: true, message: 'تم حذف الطلب بنجاح' };
  } catch (err: any) {
    console.warn('Network error while deleting order:', err);
    return { success: false, message: 'تعذّر الاتصال' };
  }
}

export async function updateOrderDispatch(
  orderId: string | number,
  orderCodeOrDispatch: string | DeliveryDispatchInfo,
  maybeDispatch?: DeliveryDispatchInfo
): Promise<{ success: boolean; message?: string }> {
  const orderCode =
    typeof orderCodeOrDispatch === 'string' ? orderCodeOrDispatch : String(orderId);
  const dispatch =
    typeof orderCodeOrDispatch === 'string'
      ? (maybeDispatch as DeliveryDispatchInfo)
      : orderCodeOrDispatch;

  // حفظ محلياً في خريطة التوصيل والسائقين
  setStoredDispatch(orderCode, orderId, dispatch);

  // تحديث الطلب محلياً إن وجد
  try {
    const local = JSON.parse(localStorage.getItem('khodra_recent_orders') || '[]');
    if (Array.isArray(local)) {
      let updatedLocal = false;
      for (let i = 0; i < local.length; i++) {
        if (local[i] && (local[i].orderCode === orderCode || `local-${i}` === String(orderId) || String(local[i].id) === String(orderId))) {
          local[i].delivery_dispatch = dispatch;
          local[i].delivery_source = dispatch.deliverySource;
          local[i].internal_driver_id = dispatch.internalDriverId;
          local[i].external_driver_id = dispatch.externalDriverId;
          local[i].driver_id = dispatch.driverId;
          local[i].driver_wage = dispatch.deliveryCost;
          local[i].actual_delivery_cost = dispatch.deliveryCost;
          updatedLocal = true;
        }
      }
      if (updatedLocal) {
        localStorage.setItem('khodra_recent_orders', JSON.stringify(local));
      }
    }
  } catch {
    // ignore
  }

  // 1. الأولوية: التحقق من الخادم عبر API المركزي لضمان الأمان والتحقق من صحة السائق والتسعيرة
  try {
    const pin = getAdminPin();
    const apiUrl =
      typeof window !== 'undefined'
        ? '/api/admin/orders/dispatch'
        : (process.env.APP_URL || 'http://127.0.0.1:3000') + '/api/admin/orders/dispatch';

    const serverRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': pin || '',
      },
      body: JSON.stringify({
        orderId: String(orderId),
        orderCode,
        dispatch,
        adminPin: pin,
      }),
    });

    const serverData = await serverRes.json().catch(() => null);
    if (serverRes.ok && serverData?.success) {
      if (serverData.dispatch) {
        setStoredDispatch(orderCode, orderId, serverData.dispatch);
      }
      return {
        success: true,
        message: serverData.message || 'تم حفظ وتوثيق بيانات التوصيل بنجاح',
      };
    } else if (serverRes.status === 400 || serverRes.status === 401 || serverRes.status === 403) {
      return {
        success: false,
        message: serverData?.error || serverData?.message || 'فشل التحقق من بيانات السائق في الخادم',
      };
    }
  } catch (apiErr) {
    if (typeof window !== 'undefined') {
      console.warn('Backend /api/admin/orders/dispatch fallback to Supabase RPC:', apiErr);
    }
  }

  // 2. تحديث Supabase عبر الدالة المحمية update_order_dispatch_secure
  const client = getSupabase();
  if (client && !String(orderId).startsWith('local-')) {
    try {
      const pin = getAdminPin();
      let { error } = await client.rpc('update_order_dispatch_secure', {
        p_order_id: String(orderId),
        p_dispatch: dispatch,
        p_admin_pin: pin,
      });
      if (error && error.message?.includes('INVALID_ADMIN_PIN')) {
        invalidateAdminSession('الرمز السري غير صحيح أو تم تغييره');
        return { success: false, message: 'الرمز السري غير صحيح أو تم تغييره من جهاز آخر' };
      }
      if (error) {
        console.warn('update_order_dispatch_secure RPC warning:', error.message);
      }
    } catch (err) {
      console.warn('Error saving dispatch to Supabase:', err);
    }
  }

  return { success: true, message: 'تم حفظ بيانات السائق والتوصيل بنجاح' };
}

export async function fetchPendingOrdersCount(): Promise<number> {
  const client = getSupabase();

  if (!client) {
    return readLocalOrders().filter((o) => o.status === 'pending').length;
  }

  const pin = getAdminPin();
  if (!pin) return 0;

  try {
    let { data, error } = await client.rpc('get_orders_secure', {
      p_admin_pin: pin,
    });
    if (error && error.message?.includes('INVALID_ADMIN_PIN')) {
      invalidateAdminSession('الرمز السري غير صحيح أو تم تغييره');
      return 0;
    }

    if (error || !Array.isArray(data)) {
      if (error) console.warn('fetchPendingOrdersCount error:', error.message);
      return 0;
    }

    return data.filter((o: any) => o && !o.is_deleted && !o.deleted_at && normalizeOrderStatus(o.status) === 'pending').length;
  } catch (err) {
    console.warn('Network error while counting pending:', err);
    return 0;
  }
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الإنشاء',
  prepared: 'تم التجهيز',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
};

// ═══════════════════════════════════════════════════════════════
// ─── إدارة فريق التوصيل الداخلي (Store Drivers Management) ───
// ═══════════════════════════════════════════════════════════════

const STORE_DRIVERS_STORAGE_KEY = 'khodra_store_drivers_v1';
const STORE_DRIVERS_SETTING_KEY = 'store_drivers';

export const INITIAL_STORE_DRIVERS: StoreDriver[] = [
  {
    id: 'drv-1',
    name: 'يوسف العلمي',
    phone: '0661234567',
    vehicleType: 'moto',
    zonePreference: 'north',
    status: 'available',
    commissionPerOrder: 25,
    vehiclePlate: '12-A-3456',
    address: 'حي الأطلس، شارع النرجس، فاس',
    notes: 'خبير بشوارع فاس وشارع الجيش الملكي وطريق مكناس',
    activeOrdersCount: 0,
    totalDeliveredCount: 142,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'drv-2',
    name: 'رشيد بنجلون',
    phone: '0672345678',
    vehicleType: 'moto',
    zonePreference: 'central',
    status: 'available',
    commissionPerOrder: 25,
    vehiclePlate: '18-B-7890',
    address: 'المدينة الجديدة، قرب ساحة فلورنس، فاس',
    notes: 'متخصص بأحياء الأطلس، الدكارات، والمدينة الجديدة',
    activeOrdersCount: 0,
    totalDeliveredCount: 98,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'drv-3',
    name: 'طارق الفاسي',
    phone: '0663456789',
    vehicleType: 'car',
    zonePreference: 'south',
    status: 'on_delivery',
    commissionPerOrder: 30,
    vehiclePlate: '22-C-1122',
    address: 'حي بنسودة، تجزئة الأمل، فاس',
    notes: 'سيارة مجهزة لصناديق الخضار العائلية الكبيرة (طريق إيموزار وعين الشقف)',
    activeOrdersCount: 2,
    totalDeliveredCount: 215,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'drv-4',
    name: 'أمين الوزاني',
    phone: '0664567890',
    vehicleType: 'van',
    zonePreference: 'all',
    status: 'available',
    commissionPerOrder: 35,
    vehiclePlate: '15-D-9988',
    address: 'طريق عين السمن، فاس',
    notes: 'فان نقل مبرد للجولات الكبرى والطلبات المجمعة',
    activeOrdersCount: 0,
    totalDeliveredCount: 310,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'drv-5',
    name: 'حمزة التازي',
    phone: '0665123456',
    vehicleType: 'moto',
    zonePreference: 'east',
    status: 'available',
    commissionPerOrder: 25,
    vehiclePlate: '30-A-5544',
    address: 'حي الزهور 2، طريق صفرو، فاس',
    notes: 'خبير بأحياء الزهور وفاس البالي والرصيف وباب الفتوح',
    activeOrdersCount: 0,
    totalDeliveredCount: 167,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

function readLocalDrivers(): StoreDriver[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORE_DRIVERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed reading local drivers:', e);
  }
  return INITIAL_STORE_DRIVERS;
}

function writeLocalDrivers(drivers: StoreDriver[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORE_DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
    }
  } catch (e) {
    console.warn('Failed saving local drivers:', e);
  }
}

/**
 * جلب قائمة سائقي الفريق الداخلي مع مزامنة ذكية بين Supabase والتخزين المحلي
 */
export async function fetchStoreDrivers(): Promise<{ drivers: StoreDriver[]; synced: boolean }> {
  const localList = readLocalDrivers();
  const client = getSupabase();

  if (!client) {
    return { drivers: localList, synced: false };
  }

  try {
    // 1. محاولة الجلب من جدول store_settings
    const { data: settingData, error: settingError } = await client
      .from('store_settings')
      .select('value')
      .eq('key', STORE_DRIVERS_SETTING_KEY)
      .maybeSingle();

    if (!settingError && settingData && settingData.value) {
      try {
        const parsed = JSON.parse(settingData.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          writeLocalDrivers(parsed);
          return { drivers: parsed, synced: true };
        }
      } catch {
        // ignore parse error
      }
    }

    // 2. إذا لم تكن البيانات موجودة في السيرفر بعد، نحفظ القائمة المحلية الحالية في السيرفر لتأسيسها
    if (localList.length > 0) {
      await saveStoreDriversRemote(localList);
    }

    return { drivers: localList, synced: true };
  } catch (err) {
    console.warn('Network error while fetching drivers:', err);
    return { drivers: localList, synced: false };
  }
}

async function saveStoreDriversRemote(drivers: StoreDriver[]): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const jsonValue = JSON.stringify(drivers);
  const currentPin = getAdminPin();

  try {
    // محاولة الحفظ عبر RPC الآمن
    const { error: rpcErr } = await client.rpc('update_store_setting_secure', {
      p_key: STORE_DRIVERS_SETTING_KEY,
      p_value: jsonValue,
      p_admin_pin: currentPin,
    });

    if (!rpcErr) return true;

    // محاولة احتياطية ثانية في حال اسم المعامل p_pin
    const retry = await client.rpc('update_store_setting_secure', {
      p_key: STORE_DRIVERS_SETTING_KEY,
      p_value: jsonValue,
      p_pin: currentPin,
    });
    if (!retry.error) return true;

    // محاولة الحفظ المباشر في store_settings
    const { error: upsertErr } = await client
      .from('store_settings')
      .upsert(
        {
          key: STORE_DRIVERS_SETTING_KEY,
          value: jsonValue,
          description: 'فريق التوصيل الداخلي لمتجر خُضرة',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    return !upsertErr;
  } catch (err) {
    console.warn('saveStoreDriversRemote error:', err);
    return false;
  }
}

/**
 * حفظ قائمة السائقين بالكامل (محلياً وفي السيرفر)
 */
export async function saveStoreDrivers(
  drivers: StoreDriver[]
): Promise<{ success: boolean; synced: boolean; message?: string }> {
  writeLocalDrivers(drivers);
  const synced = await saveStoreDriversRemote(drivers);
  return {
    success: true,
    synced,
    message: synced ? 'تم الحفظ والمزامنة السحابية بنجاح' : 'تم الحفظ محلياً (وضع عدم الاتصال)',
  };
}

/**
 * إضافة سائق جديد إلى الفريق الداخلي
 */
export async function addStoreDriver(
  driverData: Omit<StoreDriver, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; driver: StoreDriver; synced: boolean; message?: string }> {
  const current = readLocalDrivers();
  const newDriver: StoreDriver = {
    ...driverData,
    id: `drv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: sanitizeInput(driverData.name.trim()),
    phone: sanitizeInput(driverData.phone.trim()),
    address: driverData.address ? sanitizeInput(driverData.address.trim()) : undefined,
    activeOrdersCount: 0,
    totalDeliveredCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newDriver, ...current];
  writeLocalDrivers(updated);
  const synced = await saveStoreDriversRemote(updated);

  return {
    success: true,
    driver: newDriver,
    synced,
    message: synced ? 'تمت إضافة السائق ومزامنته سحابياً بنجاح' : 'تمت إضافة السائق محلياً بنجاح',
  };
}

/**
 * تحديث بيانات سائق أو تغيير حالته
 */
export async function updateStoreDriver(
  driverId: string,
  updates: Partial<StoreDriver>
): Promise<{ success: boolean; driver?: StoreDriver; synced: boolean; message?: string }> {
  const current = readLocalDrivers();
  let targetDriver: StoreDriver | undefined;

  const updated = current.map((d) => {
    if (d.id === driverId) {
      targetDriver = {
        ...d,
        ...updates,
        name: updates.name ? sanitizeInput(updates.name.trim()) : d.name,
        phone: updates.phone ? sanitizeInput(updates.phone.trim()) : d.phone,
        address: updates.address !== undefined ? sanitizeInput(updates.address.trim()) : d.address,
        updatedAt: new Date().toISOString(),
      };
      return targetDriver;
    }
    return d;
  });

  if (!targetDriver) {
    return { success: false, synced: false, message: 'السائق غير موجود' };
  }

  writeLocalDrivers(updated);
  const synced = await saveStoreDriversRemote(updated);

  return {
    success: true,
    driver: targetDriver,
    synced,
    message: synced ? 'تم تحديث بيانات السائق بنجاح' : 'تم التحديث محلياً',
  };
}

/**
 * حذف سائق من الفريق الداخلي
 */
export async function deleteStoreDriver(
  driverId: string
): Promise<{ success: boolean; synced: boolean; message?: string }> {
  const current = readLocalDrivers();
  const filtered = current.filter((d) => d.id !== driverId);

  writeLocalDrivers(filtered);
  const synced = await saveStoreDriversRemote(filtered);

  return {
    success: true,
    synced,
    message: synced ? 'تم حذف السائق ومزامنة التحديث' : 'تم حذف السائق محلياً',
  };
}

/**
 * اعتماد جولة كاملة: تعيين السائق أو كابتن التطبيق السريع لجميع طلبات المنطقة وتحديث حالتهم دفعة واحدة
 */
export async function batchAssignZoneOrders(params: {
  orders: DbOrder[];
  driver: StoreDriver | FastAppCourier;
  newStatus?: OrderStatus;
}): Promise<{ success: boolean; updatedCount: number; message?: string }> {
  const { orders, driver, newStatus = 'prepared' } = params;
  if (!orders || orders.length === 0) {
    return { success: false, updatedCount: 0, message: 'لا توجد طلبات في هذه الجولة' };
  }

  const isFastCourier = Boolean('app' in driver);
  const fastCourier = isFastCourier ? (driver as FastAppCourier) : null;
  const storeDriver = !isFastCourier ? (driver as StoreDriver) : null;
  const ordersCount = orders.length;

  // التكلفة المعتمدة للطلب الواحد: عمولة السائق الداخلي أو متوسط أجرة كابتن التطبيق
  const defaultPerOrderCost = isFastCourier
    ? Number(fastCourier?.typicalFare) || 25
    : Number(storeDriver?.commissionPerOrder) || 25;

  const providerType: DeliveryProvider = isFastCourier
    ? (fastCourier?.app === 'glovo' ? 'glovo' : fastCourier?.app === 'yassir' ? 'yassir' : fastCourier?.app === 'indrive' ? 'indrive' : 'custom')
    : 'custom';

  const appTitle = isFastCourier
    ? fastCourier?.appNameCustom || (fastCourier?.app ? fastCourier.app.toUpperCase() : 'تطبيق سريع')
    : undefined;

  let count = 0;
  for (const ord of orders) {
    const existingDispatch = ord.delivery_dispatch;
    // الحفاظ على التكلفة المحددة مسبقاً للطلب أو إسناد حصة الطلب الفردية دون مضاعفة
    const assignedOrderCost = existingDispatch?.deliveryCost != null
      ? existingDispatch.deliveryCost
      : defaultPerOrderCost;

    const dispatchInfo: DeliveryDispatchInfo = {
      provider: providerType,
      deliverySource: isFastCourier ? 'external_app' : 'internal',
      driverId: driver.id,
      internalDriverId: !isFastCourier ? driver.id : undefined,
      externalDriverId: isFastCourier ? driver.id : undefined,
      driverName: driver.name,
      driverPhone: driver.phone,
      appName: appTitle,
      deliveryCost: assignedOrderCost,
      agreedWage: assignedOrderCost,
      costCertainty: existingDispatch?.costCertainty || 'estimated',
      dispatchStatus: 'in_transit',
      dispatchedAt: existingDispatch?.dispatchedAt || new Date().toISOString(),
      zone: ord.delivery_zone || (existingDispatch?.zone as FezZoneId) || 'north',
      notes: isFastCourier
        ? `جولة توصيل تطبيق سريع (${appTitle}) (${ordersCount} طلبات) مع ${driver.name}`
        : `جولة توصيل داخلية (${ordersCount} طلبات) مع ${driver.name}`,
    };

    // 1. تحديث بيانات التوصيل والسائق
    await updateOrderDispatch(ord.id, ord.order_code, dispatchInfo);

    // 2. تحديث حالة الطلب إن لزم
    if (newStatus && ord.status !== newStatus) {
      await updateOrderStatus(ord.id, newStatus);
    }
    count++;
  }

  // تحديث حالة السائق الداخلي فقط إلى "في جولة"
  if (!isFastCourier && storeDriver) {
    await updateStoreDriver(storeDriver.id, {
      status: 'on_delivery',
      activeOrdersCount: (storeDriver.activeOrdersCount || 0) + count,
    });
  }

  return {
    success: true,
    updatedCount: count,
    message: isFastCourier
      ? `تم اعتماد الجولة وتعيين ${count} طلبات لكابتن التطبيق السريع ${driver.name} (${appTitle}) بنجاح!`
      : `تم اعتماد الجولة وتعيين ${count} طلبات للسائق ${driver.name} بنجاح!`,
  };
}

/**
 * إغلاق الجولة وتأكيد التسليم ونقل الطلبات تلقائياً إلى الأرشيف:
 * - تحديث حالة جميع طلبات هذه الجولة إلى "تم التسليم" (delivered)
 * - تحديث dispatchStatus إلى "delivered"
 * - أرشفة الطلبات تلقائياً في التخزين المحلي (khodra_archived_orders)
 * - تحديث حالة السائق وإرجاعه إلى "متاح" (available) مع زيادة إجمالي الطلبات المنجزة
 */
export async function closeAndDeliverZoneTour(params: {
  orders: DbOrder[];
  driver?: StoreDriver | FastAppCourier | null;
  zoneKey?: FezZoneId;
}): Promise<{ success: boolean; deliveredCount: number; message?: string }> {
  const { orders, driver } = params;
  if (!orders || orders.length === 0) {
    return { success: false, deliveredCount: 0, message: 'لا توجد طلبات في هذه الجولة للإغلاق' };
  }

  const isFastCourier = Boolean(driver && 'app' in driver);
  const fastCourier = isFastCourier ? (driver as FastAppCourier) : null;
  const storeDriver = !isFastCourier && driver ? (driver as StoreDriver) : null;

  const client = getSupabase();
  const driverWage = isFastCourier
    ? Number(fastCourier?.typicalFare) || 25
    : Number(storeDriver?.commissionPerOrder) || 25;
  const orderIds = orders.map((o) => String(o.id));
  const newlyArchivedCodes: string[] = [];

  // 1. محاولة الإغلاق الذري المركزي في قاعدة البيانات (Supabase Atomic RPC)
  let atomicSucceeded = false;
  if (client) {
    try {
      const { data: atomicRes, error: atomicErr } = await client.rpc('close_zone_tour_atomic', {
        p_order_ids: orderIds,
        p_driver_id: driver?.id || null,
        p_driver_name: driver?.name || null,
        p_driver_phone: driver?.phone || null,
        p_driver_commission: driverWage,
      });

      if (!atomicErr && atomicRes?.success) {
        atomicSucceeded = true;
      }
    } catch (e) {
      logger.warn('close_zone_tour_atomic RPC call error, falling back to manual loop:', e);
    }
  }

  let newlyDeliveredCount = 0;
  for (const ord of orders) {
    const isAlreadyDelivered = ord.status === 'delivered';
    const currentDispatch: DeliveryDispatchInfo = ord.delivery_dispatch || {
      provider: 'custom',
      dispatchStatus: 'delivered',
      driverName: driver?.name,
      driverPhone: driver?.phone,
    };

    // منع تكرار أو تعديل تكلفة التوصيل للطلب إذا كانت مسجلة ومكتملة مسبقاً (حفظ السجل التاريخي)
    const preservedDeliveryCost =
      currentDispatch.costCertainty === 'actual' && currentDispatch.deliveryCost != null
        ? currentDispatch.deliveryCost
        : (currentDispatch.agreedWage ?? currentDispatch.deliveryCost ?? driverWage);

    if (!atomicSucceeded) {
      // 1. تحديث حالة الطلب إلى تم التسليم إن لم يكن مسلماً مسبقاً
      if (!isAlreadyDelivered) {
        await updateOrderStatus(ord.id, 'delivered');
      }
      // 2. تحديث الدفع والأرشفة في قاعدة البيانات
      await updateOrderPayment(ord.id, true);
      await updateOrderArchive(ord.id, true);

      // 3. تحديث بيانات التوصيل مع تثبيت التكلفة الفعلية للطلب الفردي ومنع التكرار
      await updateOrderDispatch(ord.id, ord.order_code, {
        ...currentDispatch,
        dispatchStatus: 'delivered',
        driverName: driver?.name || currentDispatch.driverName,
        driverPhone: driver?.phone || currentDispatch.driverPhone,
        driverId: driver?.id || currentDispatch.driverId,
        agreedWage: preservedDeliveryCost,
        costCertainty: 'actual',
        deliveryCost: preservedDeliveryCost,
      });
    }

    if (!isAlreadyDelivered) {
      newlyDeliveredCount++;
    }

    if (ord.order_code) {
      newlyArchivedCodes.push(ord.order_code);
    }
    newlyArchivedCodes.push(String(ord.id));

    // مزامنة وخصم المخزون فورياً لكل طلب في الجولة
    try {
      await syncOrderStock(ord, 'deduct');
    } catch {
      /* ignore */
    }
  }

  // 4. أرشفة الطلبات أيضاً في التخزين المحلي لضمان التوافق مع أي شاشات دون اتصال
  try {
    if (typeof localStorage !== 'undefined') {
      const STORAGE_KEY_ARCHIVED = 'khodra_archived_orders';
      const saved = localStorage.getItem(STORAGE_KEY_ARCHIVED);
      const existing = saved ? (JSON.parse(saved) as string[]) : [];
      const merged = Array.from(new Set([...existing, ...newlyArchivedCodes]));
      localStorage.setItem(STORAGE_KEY_ARCHIVED, JSON.stringify(merged));

      const STORAGE_KEY_PAID = 'khodra_paid_orders';
      const savedPaid = localStorage.getItem(STORAGE_KEY_PAID);
      const existingPaid = savedPaid ? (JSON.parse(savedPaid) as string[]) : [];
      const mergedPaid = Array.from(new Set([...existingPaid, ...newlyArchivedCodes]));
      localStorage.setItem(STORAGE_KEY_PAID, JSON.stringify(mergedPaid));
    }
  } catch (storageErr) {
    console.warn('Failed to auto-archive delivered orders to localStorage:', storageErr);
  }

  // 5. تحديث حالة السائق المعين إلى متاح وزيادة إجمالي التسليم بالطلبات الجديدة فقط لمنع التكرار (للسائق الداخلي فقط)
  if (driver && driver.id && !isFastCourier && 'status' in driver) {
    await updateStoreDriver(driver.id, {
      status: 'available',
      activeOrdersCount: Math.max(0, (storeDriver?.activeOrdersCount || 0) - newlyDeliveredCount),
      totalDeliveredCount: (storeDriver?.totalDeliveredCount || 0) + newlyDeliveredCount,
    });
  }

  return {
    success: true,
    deliveredCount: newlyDeliveredCount,
    message: `تم إغلاق الجولة وتأكيد تسليم ${newlyDeliveredCount} طلبات بنجاح، ونقلها تلقائياً إلى الأرشيف!`,
  };
}

// ═══════════════════════════════════════════════════════════════
// ─── سائقو تطبيقات التوصيل السريع (Fast App Couriers) ───
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY_FAST_COURIERS = 'khodra_fast_app_couriers';

export const INITIAL_FAST_COURIERS: FastAppCourier[] = [
  {
    id: 'fast-courier-glovo-1',
    name: 'سعيد الادريسي',
    app: 'glovo',
    phone: '0665653232',
    vehicleType: 'moto',
    zone: 'north',
    typicalFare: 25,
    notes: 'كابتن غلوفو - تغطية المنطقة الشمالية',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'fast-courier-indrive-1',
    name: 'حميد التازي',
    app: 'indrive',
    phone: '0662348300',
    vehicleType: 'moto',
    zone: 'central',
    typicalFare: 25,
    notes: 'كابتن إندرايف - تغطية المنطقة الوسطى والأطلس',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

function readLocalFastCouriers(): FastAppCourier[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAST_COURIERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_FAST_COURIERS;
}

function writeLocalFastCouriers(couriers: FastAppCourier[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FAST_COURIERS, JSON.stringify(couriers));
  } catch {}
}

export async function fetchFastCouriers(): Promise<FastAppCourier[]> {
  const localList = readLocalFastCouriers();
  const client = getSupabase();
  if (!client) return localList;

  try {
    const { data, error } = await client
      .from('fast_app_couriers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn('Supabase fetchFastCouriers warning, falling back to local storage:', error.message);
      return localList;
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const mapped: FastAppCourier[] = data.map((r: any) => ({
        id: String(r.id),
        name: String(r.name || ''),
        app: r.app || 'indrive',
        appNameCustom: r.app_name_custom || undefined,
        phone: String(r.phone || ''),
        vehicleType: r.vehicle_type || 'moto',
        zone: r.zone || 'all',
        typicalFare: Number(r.typical_fare) || 25,
        notes: r.notes || undefined,
        createdAt: r.created_at || new Date().toISOString(),
      }));
      writeLocalFastCouriers(mapped);
      return mapped;
    }
  } catch (err) {
    logger.warn('Network error while fetching fast couriers:', err);
  }
  return localList;
}

export async function saveFastCourier(
  courier: Partial<FastAppCourier>
): Promise<{ success: boolean; courier?: FastAppCourier; message?: string }> {
  const localList = readLocalFastCouriers();
  const client = getSupabase();
  const courierId = courier.id || `fast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const cleanCourier: FastAppCourier = {
    id: courierId,
    name: sanitizeInput(courier.name || ''),
    phone: sanitizeInput(courier.phone || ''),
    app: courier.app || 'indrive',
    appNameCustom: courier.appNameCustom ? sanitizeInput(courier.appNameCustom) : undefined,
    vehicleType: courier.vehicleType || 'moto',
    zone: courier.zone || 'all',
    typicalFare: Number(courier.typicalFare) || 20,
    notes: courier.notes ? sanitizeInput(courier.notes) : undefined,
    createdAt: courier.createdAt || new Date().toISOString(),
  };

  const existingIdx = localList.findIndex((c) => c.id === courierId);
  let updatedList: FastAppCourier[];
  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = cleanCourier;
  } else {
    updatedList = [cleanCourier, ...localList];
  }
  writeLocalFastCouriers(updatedList);

  if (client) {
    try {
      const payload: Record<string, unknown> = {
        name: cleanCourier.name,
        phone: cleanCourier.phone,
        app: cleanCourier.app,
        app_name_custom: cleanCourier.appNameCustom || null,
        vehicle_type: cleanCourier.vehicleType,
        zone: cleanCourier.zone,
        typical_fare: cleanCourier.typicalFare,
        notes: cleanCourier.notes || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (courier.id && !courier.id.startsWith('fast-')) {
        payload.id = courier.id;
      }
      const { data, error } = await client
        .from('fast_app_couriers')
        .upsert(payload)
        .select()
        .single();
      if (!error && data) {
        cleanCourier.id = String(data.id);
        return { success: true, courier: cleanCourier, message: 'تم حفظ الكابتن بنجاح ومزامنته سحابياً' };
      }
      logger.warn('Supabase saveFastCourier fallback to local:', error?.message);
    } catch (e) {
      logger.warn('saveFastCourier network error, saved locally:', e);
    }
  }

  return { success: true, courier: cleanCourier, message: 'تم حفظ الكابتن بنجاح' };
}

export async function deleteFastCourier(id: string): Promise<{ success: boolean; message?: string }> {
  const localList = readLocalFastCouriers();
  writeLocalFastCouriers(localList.filter((c) => c.id !== id));
  const client = getSupabase();
  if (client && !id.startsWith('fast-')) {
    try {
      await client.from('fast_app_couriers').delete().eq('id', id);
    } catch (e) {
      logger.warn('deleteFastCourier network error, deleted locally:', e);
    }
  }
  return { success: true, message: 'تم حذف الكابتن بنجاح' };
}

// ═══════════════════════════════════════════════════════════════
// ─── تحديث الدفع والأرشفة وجلب طلب مفرد ───
// ═══════════════════════════════════════════════════════════════

export async function fetchSingleOrder(orderId: string | number): Promise<DbOrder | null> {
  const client = getSupabase();
  if (client) {
    const adminPin = getAdminPin();
    try {
      // 1. الأولوية الأولى: استدعاء دالة RPC المحمية التي تتجاوز قيود RLS بأمان للمدير
      const { data: rpcData, error: rpcErr } = await client.rpc('get_single_order_secure', {
        p_order_id: String(orderId),
        p_admin_pin: adminPin || null,
      });
      if (!rpcErr && rpcData && typeof rpcData === 'object') {
        return mapRowToOrder(rpcData);
      }
    } catch {
      // fallback to direct query
    }

    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .or(`id.eq.${orderId},order_code.eq.${orderId}`)
        .maybeSingle();
      if (!error && data) {
        return mapRowToOrder(data);
      }
    } catch (err) {
      logger.warn('fetchSingleOrder network error:', err);
    }
  }
  const localOrders = readLocalOrders();
  return (
    localOrders.find(
      (o) => String(o.id) === String(orderId) || o.order_code === String(orderId)
    ) || null
  );
}


export async function updateOrderPayment(
  orderId: string | number,
  isPaid: boolean
): Promise<{ success: boolean; message?: string }> {
  const STORAGE_KEY_PAID = 'khodra_paid_orders';
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAID);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    const strId = String(orderId);
    if (isPaid) {
      set.add(strId);
    } else {
      set.delete(strId);
    }
    localStorage.setItem(STORAGE_KEY_PAID, JSON.stringify(Array.from(set)));
  } catch {}

  const client = getSupabase();
  if (client && !String(orderId).startsWith('local-')) {
    try {
      const updateData = {
        is_paid: isPaid,
        paid_at: isPaid ? new Date().toISOString() : null,
      };
      await client
        .from('orders')
        .update(updateData)
        .or(`id.eq.${orderId},order_code.eq.${orderId}`);
    } catch (err) {
      logger.warn('updateOrderPayment Supabase sync warning, saved locally:', err);
    }
  }

  return { success: true, message: isPaid ? 'تم تأكيد استلام المبلغ' : 'تم إلغاء تأكيد الدفع' };
}

export async function updateOrderArchive(
  orderId: string | number,
  isArchived: boolean
): Promise<{ success: boolean; message?: string }> {
  const STORAGE_KEY_ARCHIVED = 'khodra_archived_orders';
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ARCHIVED);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    const strId = String(orderId);
    if (isArchived) {
      set.add(strId);
    } else {
      set.delete(strId);
    }
    localStorage.setItem(STORAGE_KEY_ARCHIVED, JSON.stringify(Array.from(set)));
  } catch {}

  const client = getSupabase();
  if (client && !String(orderId).startsWith('local-')) {
    try {
      const updateData = {
        is_archived: isArchived,
        archived_at: isArchived ? new Date().toISOString() : null,
      };
      await client
        .from('orders')
        .update(updateData)
        .or(`id.eq.${orderId},order_code.eq.${orderId}`);
    } catch (err) {
      logger.warn('updateOrderArchive Supabase sync warning, saved locally:', err);
    }
  }

  return {
    success: true,
    message: isArchived ? 'تم نقل الطلب إلى الأرشيف' : 'تم استعادة الطلب من الأرشيف',
  };
}

// ═══════════════════════════════════════════════════════════════
// ─── Realtime: الاستماع الفوري لتحديثات الطلبات ───
// ═══════════════════════════════════════════════════════════════

export type OrdersRealtimeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: any;
  old: any;
}) => void;

export function subscribeToOrdersChanges(
  callback: OrdersRealtimeCallback,
  onStatusChange?: (status: string) => void
) {
  const client = getSupabase();
  if (!client) return null;

  try {
    // اسم قناة فريد لكل مشترك لمنع تعارض AdminOrdersPanel مع useNewOrdersNotifier
    const uniqueChannelName = `orders-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const channel = client
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          try {
            callback(payload);
          } catch (cbErr) {
            console.warn('Realtime callback error:', cbErr);
          }
        }
      )
      .subscribe((status) => {
        if (onStatusChange) {
          try {
            onStatusChange(status);
          } catch {}
        }
      });

    return channel;
  } catch (e) {
    console.warn('Realtime subscription error:', e);
    return null;
  }
}

export function unsubscribeFromOrdersChanges(channel: any) {
  const client = getSupabase();
  if (client && channel) {
    try {
      client.removeChannel(channel);
    } catch {
      // ignore
    }
  }
}