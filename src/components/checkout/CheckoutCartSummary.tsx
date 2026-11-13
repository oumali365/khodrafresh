// ============================================================
// CheckoutCartSummary.tsx – الإصدار 2.0
// ملخص السلة القابل للطي بهوية خضرة الموحّدة
// ============================================================
import React, { useState } from 'react';
import { Package, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { CartItem } from '../../types';

interface CheckoutCartSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  isFreeDelivery: boolean;
  grandTotal: number;
  totalItems: number;
}

export const CheckoutCartSummary: React.FC<CheckoutCartSummaryProps> = ({
  items,
  deliveryFee,
  isFreeDelivery,
  grandTotal,
  totalItems,
}) => {
  const [showCartSummary, setShowCartSummary] = useState(false);

  return (
    <div className="bg-white border-2 border-[#2D6A3F]/15 rounded-2xl overflow-hidden shadow-sm">

      {/* ════════ رأس قابل للنقر ════════ */}
      <button
        type="button"
        onClick={() => setShowCartSummary(!showCartSummary)}
        className={`w-full flex items-center justify-between gap-3 p-4 transition-colors cursor-pointer active:scale-[0.99] ${
          showCartSummary
            ? 'bg-[#2D6A3F]/8 hover:bg-[#2D6A3F]/12'
            : 'hover:bg-[#FAF8F3]'
        }`}
        aria-expanded={showCartSummary}
        aria-label={`ملخص السلة: ${items.length} صنف بقيمة ${grandTotal.toFixed(2)} درهم`}
      >
        {/* ═══ يمين: الأيقونة والمعلومات ═══ */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              showCartSummary
                ? 'bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] border border-[#EAB308]/30'
                : 'bg-[#2D6A3F]/10 border border-[#2D6A3F]/20'
            }`}
          >
            <Package
              className={`w-4 h-4 transition-colors ${
                showCartSummary ? 'text-[#EAB308]' : 'text-[#2D6A3F]'
              }`}
              strokeWidth={2.5}
            />
          </div>
          <div className="text-right min-w-0">
            <span className="text-sm font-black text-[#1A3D24] flex items-center gap-1.5">
              ملخص السلة
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
            </span>
            <span className="text-[11px] text-[#5A6B5F] font-bold block mt-0.5">
              {items.length} صنف • {totalItems} قطعة
            </span>
          </div>
        </div>

        {/* ═══ يسار: السعر + السهم ═══ */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-base sm:text-lg font-black text-[#EA580C] tabular-nums" dir="ltr">
            {grandTotal.toFixed(2)} <span className="text-xs">DH</span>
          </span>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              showCartSummary
                ? 'bg-[#2D6A3F]/15 text-[#2D6A3F]'
                : 'bg-[#FAF8F3] text-[#5A6B5F] border border-[#2D6A3F]/15'
            }`}
          >
            {showCartSummary ? (
              <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
            )}
          </div>
        </div>
      </button>

      {/* ════════ المحتوى القابل للطي ════════ */}
      {showCartSummary && (
        <div className="border-t-2 border-[#2D6A3F]/10 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200 bg-[#FBF9F5]">

          {/* قائمة المنتجات */}
          {items.map((i) => (
            <div
              key={i.key}
              className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-[#2D6A3F]/12 hover:border-[#2D6A3F]/30 gap-2 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[#FAF8F3] border border-[#2D6A3F]/15 flex items-center justify-center text-lg shrink-0">
                  {i.icon}
                </span>
                <div className="text-right min-w-0">
                  <p className="text-xs font-black text-[#1A3D24] truncate">
                    {i.name}
                  </p>
                  <p className="text-[10px] text-[#5A6B5F] font-bold truncate" dir="ltr">
                    {/^kg$/i.test(i.variantLabel || '')
                      ? `${i.qty} kg`
                      : `${i.qty} × ${i.variantLabel || 'وحدة'}`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-[#EA580C] tabular-nums shrink-0" dir="ltr">
                {i.lineTotal.toFixed(2)} <span className="text-[10px]">DH</span>
              </span>
            </div>
          ))}

          {/* ملخص التوصيل */}
          <div className="pt-3 mt-2 border-t border-[#2D6A3F]/10 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#5A6B5F] font-bold flex items-center gap-1.5">
                <Truck
                  className={`w-3.5 h-3.5 ${
                    isFreeDelivery ? 'text-[#2D6A3F]' : 'text-[#EA580C]'
                  }`}
                  strokeWidth={2.5}
                />
                <span>رسوم التوصيل:</span>
              </span>
              <span
                className={`font-black tabular-nums flex items-center gap-1 ${
                  isFreeDelivery
                    ? 'text-[#2D6A3F]'
                    : 'text-[#1A3D24]'
                }`}
                dir="ltr"
              >
                {isFreeDelivery ? (
                  <>
                    <span className="text-[10px] bg-[#2D6A3F]/15 border border-[#2D6A3F]/30 px-1.5 py-0.5 rounded-md">
                      🎉 مجاني
                    </span>
                  </>
                ) : (
                  <>
                    {deliveryFee.toFixed(2)} <span className="text-[10px]">DH</span>
                  </>
                )}
              </span>
            </div>

            {/* المجموع الكلي */}
            <div className="pt-2 border-t border-[#2D6A3F]/10 flex justify-between items-center">
              <span className="text-xs font-black text-[#1A3D24] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
                المجموع الكلي:
              </span>
              <span className="text-sm font-black text-[#EA580C] tabular-nums" dir="ltr">
                {grandTotal.toFixed(2)} <span className="text-xs">DH</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};