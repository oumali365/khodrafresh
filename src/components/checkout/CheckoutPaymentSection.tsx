// ============================================================
// CheckoutPaymentSection.tsx – الإصدار 2.0
// تحسين وضوح نصوص طرق الدفع + هوية خضرة الموحّدة
// ============================================================
import React, { useState } from 'react';
import {
  CreditCard,
  Banknote,
  Building2,
  Check,
  Copy,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { PaymentMethod } from '../../types';
import { MOROCCAN_BANKS } from '../../data/config';

// ═══════════════════════════════════════════════════════════
// مكوّن فرعي: تفاصيل التحويل البنكي
// ═══════════════════════════════════════════════════════════
interface CheckoutBankTransferProps {
  selectedBankId: string;
  onSelectBankId: (id: string) => void;
  receiptFile: File | null;
  receiptPreview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

export const CheckoutBankTransfer: React.FC<CheckoutBankTransferProps> = ({
  selectedBankId,
  onSelectBankId,
  receiptFile,
  receiptPreview,
  onFileChange,
  error,
}) => {
  const [copiedRib, setCopiedRib] = useState(false);

  const currentBank =
    MOROCCAN_BANKS.find((b) => b.id === selectedBankId) || MOROCCAN_BANKS[0];

  const handleCopyRib = (rib: string) => {
    const cleanRib = rib.replace(/\s+/g, '');
    navigator.clipboard.writeText(cleanRib).then(() => {
      setCopiedRib(true);
      setTimeout(() => setCopiedRib(false), 2000);
    });
  };

  const cleanBankLabel = (bank: typeof MOROCCAN_BANKS[0]) =>
    (bank.shortName || bank.name)
      .replace(/(البريد|بريد|التجاري|البنك|بنك|القرض|كاش)/gi, '')
      .replace(/[()\-–—]/g, '')
      .trim();

  return (
    <div className="mt-4 bg-gradient-to-br from-[#FAF8F3] to-white border-2 border-[#2D6A3F]/15 rounded-2xl p-4 sm:p-5 space-y-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      {/* ─── 1. اختيار البنك ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#2D6A3F] flex items-center justify-center shrink-0 border border-[#EAB308]/30">
            <Building2 className="w-3.5 h-3.5 text-[#EAB308]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-black text-[#1A3D24] flex items-center gap-2">
            اختر البنك للتحويل
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
          </span>
        </div>

        {/* شبكة البنوك */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {MOROCCAN_BANKS.map((b) => {
            const isSelected = selectedBankId === b.id;

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBankId(b.id)}
                className={`relative p-3 min-h-[80px] rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'border-[#2D6A3F] ring-2 ring-[#2D6A3F]/20 shadow-[0_4px_14px_rgba(45,106,63,0.20)] bg-[#2D6A3F]/8'
                    : 'border-[#2D6A3F]/15 hover:border-[#2D6A3F]/50 hover:bg-white bg-white'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EAB308] text-[#1A3D24] flex items-center justify-center border-2 border-white shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}

                <div className="w-full h-9 flex items-center justify-center mb-1.5">
                  {b.image ? (
                    <img
                      src={b.image}
                      alt={cleanBankLabel(b)}
                      className="max-h-8 max-w-[60px] object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-2xl">{b.icon}</span>
                  )}
                </div>
                <span className="text-[11px] font-black truncate max-w-full text-[#1A3D24] leading-tight">
                  {cleanBankLabel(b)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. تفاصيل الحساب ─── */}
      <div className="bg-white border-2 border-[#2D6A3F]/15 rounded-2xl p-4 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#2D6A3F]/10">
          <span className="text-xs font-black text-[#5A6B5F]">الحساب المعتمد</span>
          <div className="flex items-center gap-2 min-w-0">
            {currentBank.image && (
              <img
                src={currentBank.image}
                alt="Bank"
                className="h-6 w-auto max-w-[55px] object-contain shrink-0"
              />
            )}
            <span className="font-black text-sm text-[#1A3D24] truncate">
              {cleanBankLabel(currentBank)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#2D6A3F]/10">
          <span className="text-xs font-black text-[#5A6B5F]">اسم المستلم</span>
          <span className="font-black text-sm text-[#2D6A3F] truncate">
            {currentBank.beneficiary}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-black text-[#5A6B5F]">رقم الحساب (RIB)</span>
            <button
              type="button"
              onClick={() => handleCopyRib(currentBank.rib)}
              className={`inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 min-h-[34px] rounded-lg border-2 transition-all cursor-pointer active:scale-95 ${
                copiedRib
                  ? 'bg-[#2D6A3F]/10 text-[#1A3D24] border-[#2D6A3F]/40'
                  : 'bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] text-white border-[#EAB308]/30'
              }`}
            >
              {copiedRib ? (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>نسخ الـ RIB</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F3] border-2 border-dashed border-[#2D6A3F]/25 text-center">
            <code className="font-mono font-black text-[#1A3D24] tracking-[0.15em] text-sm sm:text-base select-all block break-all">
              {currentBank.rib}
            </code>
          </div>
        </div>
      </div>

      {/* ─── 3. رفع الوصل ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#2D6A3F] flex items-center justify-center shrink-0 border border-[#EAB308]/30">
            <Upload className="w-3.5 h-3.5 text-[#EAB308]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-black text-[#1A3D24]">
            إرفاق وصل التحويل
          </span>
          <span className="text-[#EA580C] font-black">*</span>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center bg-white cursor-pointer transition-all group ${
            receiptFile
              ? 'border-[#2D6A3F] bg-[#2D6A3F]/8'
              : 'border-[#2D6A3F]/25 hover:border-[#2D6A3F]/60 hover:bg-[#FAF8F3]'
          }`}
        >
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={onFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {receiptFile ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {receiptPreview ? (
                <img
                  src={receiptPreview}
                  alt="Receipt Preview"
                  className="w-20 h-20 object-cover rounded-xl border-2 border-[#2D6A3F] shadow-md shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#2D6A3F]/15 text-[#2D6A3F] flex items-center justify-center font-black text-sm border-2 border-[#2D6A3F]/40 shrink-0">
                  PDF
                </div>
              )}
              <div className="text-center sm:text-right min-w-0">
                <p className="text-sm font-black text-[#1A3D24] truncate max-w-[220px] mx-auto">
                  {receiptFile.name}
                </p>
                <span className="text-xs text-[#5A6B5F] font-bold">
                  {(receiptFile.size / 1024).toFixed(1)} KB
                </span>
                <p className="text-xs text-[#2D6A3F] font-black mt-1 flex items-center justify-center sm:justify-start gap-1">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>تم رفع الملف بنجاح</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-[#2D6A3F]/10 border border-[#2D6A3F]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-[#2D6A3F]" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-black text-[#1A3D24] mb-1">
                انقر لاختيار صورة الوصل
              </span>
              <span className="text-xs text-[#5A6B5F] font-bold">
                JPG, PNG, PDF (الحد الأقصى 5MB)
              </span>
            </div>
          )}
        </div>

        {error && (
          <p className="text-rose-600 text-xs font-black flex items-center gap-1.5 mt-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// المكوّن الرئيسي: CheckoutPaymentSection
// ═══════════════════════════════════════════════════════════
interface CheckoutPaymentSectionProps {
  paymentMethod: PaymentMethod;
  onChangePaymentMethod: (method: PaymentMethod) => void;
  selectedBankId: string;
  onSelectBankId: (id: string) => void;
  receiptFile: File | null;
  receiptPreview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  receiptError?: string;
}

export const CheckoutPaymentSection: React.FC<CheckoutPaymentSectionProps> = ({
  paymentMethod,
  onChangePaymentMethod,
  selectedBankId,
  onSelectBankId,
  receiptFile,
  receiptPreview,
  onFileChange,
  receiptError,
}) => {
  return (
    <div className="bg-white border-2 border-[#2D6A3F]/15 rounded-2xl p-4 sm:p-5 shadow-sm">
      {/* ════════ رأس البطاقة ════════ */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#2D6A3F]/10 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#2D6A3F]/10 border border-[#2D6A3F]/20 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-[#2D6A3F]" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm sm:text-base font-black text-[#1A3D24] flex items-center gap-2">
          طريقة الدفع
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
        </h3>
      </div>

      {/* ════════ خيارات الدفع — عمودية على الجوال، أفقية على التابلت ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* ═══ خيار 1: الدفع عند الاستلام ═══ */}
        <button
          type="button"
          onClick={() => onChangePaymentMethod('cod')}
          aria-pressed={paymentMethod === 'cod'}
          className={`relative flex items-center gap-3 p-3.5 sm:p-4 min-h-[68px] rounded-xl border-2 cursor-pointer transition-all text-right active:scale-[0.99] ${
            paymentMethod === 'cod'
              ? 'bg-[#2D6A3F]/8 border-[#2D6A3F] ring-2 ring-[#2D6A3F]/15 shadow-[0_4px_14px_rgba(45,106,63,0.15)]'
              : 'bg-white border-[#2D6A3F]/15 hover:border-[#2D6A3F]/50 hover:bg-[#FAF8F3]'
          }`}
        >
          {/* أيقونة دائرية */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              paymentMethod === 'cod'
                ? 'bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] border border-[#EAB308]/30'
                : 'bg-[#FAF8F3] border-2 border-[#2D6A3F]/20 text-[#2D6A3F]'
            }`}
          >
            <Banknote className="w-5 h-5" strokeWidth={2.5} />
          </div>

          {/* النص */}
          <div className="flex-1 min-w-0 text-right">
            <span className="block text-[13px] sm:text-sm font-black text-[#1A3D24] leading-tight">
              الدفع عند الاستلام
            </span>
            <span className="block text-[10px] sm:text-[11px] text-[#5A6B5F] font-bold mt-0.5 leading-tight">
              ادفع نقداً عند وصول الطلب
            </span>
          </div>

          {/* مؤشر الاختيار */}
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              paymentMethod === 'cod'
                ? 'bg-[#EAB308] border-[#EAB308]'
                : 'bg-white border-[#2D6A3F]/30'
            }`}
          >
            {paymentMethod === 'cod' && (
              <Check className="w-3 h-3 text-[#1A3D24] stroke-[3]" />
            )}
          </div>
        </button>

        {/* ═══ خيار 2: تحويل بنكي ═══ */}
        <button
          type="button"
          onClick={() => onChangePaymentMethod('bank')}
          aria-pressed={paymentMethod === 'bank'}
          className={`relative flex items-center gap-3 p-3.5 sm:p-4 min-h-[68px] rounded-xl border-2 cursor-pointer transition-all text-right active:scale-[0.99] ${
            paymentMethod === 'bank'
              ? 'bg-[#2D6A3F]/8 border-[#2D6A3F] ring-2 ring-[#2D6A3F]/15 shadow-[0_4px_14px_rgba(45,106,63,0.15)]'
              : 'bg-white border-[#2D6A3F]/15 hover:border-[#2D6A3F]/50 hover:bg-[#FAF8F3]'
          }`}
        >
          {/* أيقونة دائرية */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              paymentMethod === 'bank'
                ? 'bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] text-[#EAB308] border border-[#EAB308]/30'
                : 'bg-[#FAF8F3] border-2 border-[#2D6A3F]/20 text-[#2D6A3F]'
            }`}
          >
            <Building2 className="w-5 h-5" strokeWidth={2.5} />
          </div>

          {/* النص */}
          <div className="flex-1 min-w-0 text-right">
            <span className="block text-[13px] sm:text-sm font-black text-[#1A3D24] leading-tight">
              تحويل بنكي
            </span>
            <span className="block text-[10px] sm:text-[11px] text-[#5A6B5F] font-bold mt-0.5 leading-tight">
              حوّل المبلغ وأرفق الوصل
            </span>
          </div>

          {/* مؤشر الاختيار */}
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              paymentMethod === 'bank'
                ? 'bg-[#EAB308] border-[#EAB308]'
                : 'bg-white border-[#2D6A3F]/30'
            }`}
          >
            {paymentMethod === 'bank' && (
              <Check className="w-3 h-3 text-[#1A3D24] stroke-[3]" />
            )}
          </div>
        </button>
      </div>

      {/* ════════ تفاصيل التحويل البنكي ════════ */}
      {paymentMethod === 'bank' && (
        <CheckoutBankTransfer
          selectedBankId={selectedBankId}
          onSelectBankId={onSelectBankId}
          receiptFile={receiptFile}
          receiptPreview={receiptPreview}
          onFileChange={onFileChange}
          error={receiptError}
        />
      )}
    </div>
  );
};