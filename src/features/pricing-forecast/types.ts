// ============================================================
// src/features/pricing-forecast/types.ts
// تعريف أنواع نظام التسعير الديناميكي وإدارة الموردين وتوقع الطلب
// متوافق مع القاعدة التجارية لخُضرة (حد تكلفة الشراء 60%، هامش إجمالي 40%)
// ============================================================

import type { ProductCategory } from '../../types';

/**
 * 40%: متوسط هامش الربح المعتمد والوحيد للمتجر من سعر البيع (Sole Approved Target Gross Margin)
 * يحقق حد تكلفة شراء 60% بدقة: سعر البيع = تكلفة الشراء ÷ 0.60
 * مثال: 5 ÷ 0.60 = 8.33 دراهم
 */
export const DEFAULT_TARGET_GROSS_MARGIN = 40;

/**
 * 60%: الحد الأقصى المستهدف لنسبة تكلفة شراء السلع من سعر البيع وحدها
 */
export const TARGET_MAX_COGS_RATIO = 60;

/**
 * 40%: متوسط هامش الربح الوحيد المعتمد للمتجر
 */
export const DEFAULT_PROFIT_MARGIN = DEFAULT_TARGET_GROSS_MARGIN;

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  rating: number; // 1 to 5
  notes?: string;
  is_active: boolean;
  created_at?: string;
}

export type PriceTrend = 'up' | 'down' | 'stable';

export interface ProductPriceRow {
  id: number;
  name: string;
  category: ProductCategory;
  unit_label: string;
  icon: string;
  image_url?: string;
  supplier_id: string;
  supplier_name: string;
  purchase_price: number;       // سعر الشراء بالدرهم
  margin_percentage: number;    // هامش الربح الإجمالي المستهدف % (الافتراضي 40%)
  selling_price: number;        // سعر البيع المحسوب تلقائياً (5 ÷ 0.60 = 8.33)
  yesterday_price: number;      // سعر الشراء بالأمس للمقارنة
  trend: PriceTrend;            // مؤشر الاتجاه
  is_available: boolean;        // حالة التوفر المنطقية (متوفر / غير متوفر)
  stock?: number;               // كمية المخزون في Supabase: 0 غير متوفر، 1-5 كمية محدودة، >5 متوفر
  is_modified?: boolean;        // مؤشر التعديل اللحظي
  last_updated?: string;

  // ─── مقاييس التسعير الثلاثة المنفصلة بوضوح ───
  cogs_ratio: number;           // نسبة تكلفة الشراء = (التكلفة ÷ سعر البيع) × 100
  gross_margin: number;         // هامش الربح الإجمالي = ((سعر البيع - التكلفة) ÷ سعر البيع) × 100
  markup_percent: number;       // نسبة الزيادة على التكلفة = ((سعر البيع - التكلفة) ÷ التكلفة) × 100
  is_compliant: boolean;        // هل تكلفة الشراء <= 60%؟
  has_exception?: boolean;      // استثناء إداري معتمد في حال تجاوز 60%
  exception_reason?: string;    // سبب الاستثناء الإداري
  old_selling_price?: number;   // السعر السابق قبل التعديل
}

export interface PriceChangeAuditRecord {
  id: string;
  productId: number;
  productName: string;
  supplierId?: string;
  supplierName?: string;
  unitLabel?: string;
  oldPurchasePrice?: number;
  newPurchasePrice: number;
  oldSellingPrice: number;
  newSellingPrice: number;
  oldCogsRatio?: number;
  newCogsRatio: number;
  newGrossMargin: number;
  markupPercent: number;
  changeType: 'single' | 'batch' | 'bulk_margin' | 'supplier_sync';
  hasException?: boolean;
  exceptionReason?: string;
  timestamp: string;
  changedBy: string;
}

export interface DailyPriceDbRecord {
  id?: string;
  product_id: number;
  supplier_id: string;
  purchase_price: number;
  margin_percentage: number;
  selling_price: number;
  cogs_ratio?: number;
  gross_margin_percent?: number;
  markup_percent?: number;
  has_exception?: boolean;
  exception_reason?: string;
  recorded_date: string;
  updated_at?: string;
}


