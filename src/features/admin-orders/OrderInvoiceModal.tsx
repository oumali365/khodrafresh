// ============================================================
// OrderInvoiceModal.tsx – نافذة معاينة وطباعة فاتورة الطلب
// ============================================================
import React, { useEffect } from 'react';
import { X, Printer, FileText, MapPin, Phone, User, Calendar, Package, TrendingUp, MessageCircle } from 'lucide-react';
import { DbOrder, OrderStatus } from '../../services/supabaseService';
import { STORE_CONFIG } from '../../data/config';

interface OrderInvoiceModalProps {
  order: DbOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الإنشاء',
  prepared: 'تم التجهيز',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
};

// تنسيق التاريخ
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ar-MA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// تنسيق المبلغ
function formatMoney(amount: number): string {
  return `${amount.toFixed(2)} DH`;
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  // إغلاق بزر Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  // ─── طباعة الفاتورة ───
  const handlePrint = () => {
    // استنساخ الفاتورة في نافذة جديدة للطباعة النظيفة
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      // بديل آمن داخل البيئات المقيدة أو عند حجب النوافذ المنبثقة
      window.print();
      return;
    }

    const invoiceHTML = document.getElementById('invoice-printable')?.outerHTML || '';
    const safeOrderCode = String(order.order_code || '').replace(/[<>&"']/g, '');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${safeOrderCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Tajawal', 'Almarai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #ffffff;
            color: #1A1814;
            direction: rtl;
            padding: 20px;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 3px solid #1E4327;
            margin-bottom: 20px;
          }
          .invoice-store-name {
            font-size: 28px;
            font-weight: 900;
            color: #1E4327;
          }
          .invoice-store-tagline {
            font-size: 13px;
            color: #524B3E;
            margin-top: 4px;
          }
          .invoice-meta {
            text-align: left;
            font-size: 12px;
            color: #524B3E;
            line-height: 1.6;
          }
          .invoice-meta strong {
            color: #1A1814;
          }
          .invoice-title {
            text-align: center;
            font-size: 22px;
            font-weight: 900;
            color: #C25E12;
            margin-bottom: 20px;
            padding: 12px;
            background: #FAF8F4;
            border-radius: 12px;
          }
          .invoice-section {
            margin-bottom: 18px;
          }
          .invoice-section-title {
            font-size: 14px;
            font-weight: 900;
            color: #1E4327;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid #E8E1D3;
          }
          .invoice-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 20px;
            font-size: 13px;
          }
          .invoice-info-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px dashed #E8E1D3;
          }
          .invoice-info-label {
            color: #524B3E;
            font-weight: 700;
          }
          .invoice-info-value {
            color: #1A1814;
            font-weight: 700;
          }
          .invoice-items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 13px;
          }
          .invoice-items-table th {
            background: #1E4327;
            color: #ffffff;
            padding: 10px 8px;
            text-align: right;
            font-weight: 900;
            font-size: 12px;
          }
          .invoice-items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #E8E1D3;
            text-align: right;
          }
          .invoice-items-table tr:nth-child(even) td {
            background: #FAF8F4;
          }
          .invoice-totals {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 2px solid #1E4327;
          }
          .invoice-total-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 14px;
          }
          .invoice-total-row.grand-total {
            padding: 12px 0;
            border-top: 2px solid #C25E12;
            margin-top: 8px;
            font-size: 18px;
            font-weight: 900;
            color: #C25E12;
          }
          .invoice-status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 900;
            background: #FAF8F4;
            border: 2px solid #E8E1D3;
            margin-top: 12px;
          }
          .invoice-footer {
            margin-top: 30px;
            padding-top: 16px;
            border-top: 1px dashed #D4C8B5;
            text-align: center;
            font-size: 12px;
            color: #524B3E;
            line-height: 1.8;
          }
          .invoice-footer .thanks {
            font-size: 16px;
            font-weight: 900;
            color: #C25E12;
            margin-bottom: 8px;
          }
          @media print {
            body { padding: 0; }
            .invoice-container { max-width: 100%; }
            @page { margin: 15mm; size: A4; }
          }
        </style>
      </head>
      <body>
        ${invoiceHTML}
      </body>
      </html>
    `);

    printWindow.document.close();

    // انتظار تحميل المحتوى ثم الطباعة
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  // ─── مشاركة الفاتورة عبر واتساب ───
  const handleWhatsAppInvoice = () => {
    const items = order.items
      .map((it) => {
        const isWeight = /^kg$/i.test(it.variantLabel || '');
        const qtyLabel = isWeight
          ? `${it.qty} kg`
          : `${it.qty}${it.variantLabel ? ` (${it.variantLabel})` : ''}`;
        return `  • ${it.name} × ${qtyLabel} = ${formatMoney(Number(it.lineTotal))}`;
      })
      .join('\n');

    const message = `
🧾 *فاتورة الطلب ${order.order_code}*

👤 *العميل:* ${order.customer_name}
📞 *الهاتف:* ${order.phone}
📍 *العنوان:* ${order.address}

📦 *المنتجات:*
${items}

🚚 *التوصيل:* ${formatMoney(order.delivery_fee)}
💰 *الإجمالي:* ${formatMoney(order.total)}

📅 *التاريخ:* ${formatDate(order.created_at)}
📌 *الحالة:* ${STATUS_LABELS[order.status]}

شكراً لتسوقكم من ${STORE_CONFIG.storeName} 🌿
    `.trim();

    const wa = (order.phone || '').replace(/\D/g, '').replace(/^0/, '212');
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full sm:max-w-3xl shadow-2xl z-10 sm:rounded-3xl flex flex-col max-h-screen sm:max-h-[95vh] overflow-hidden my-auto">

        {/* ─── Header ─── */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#1E4327] to-[#2E5336] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#F5D76E]" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg">فاتورة الطلب</h2>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 font-medium">
                {order.order_code} • {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Invoice Content (قابل للطباعة) ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF8F4]">
          <div
            id="invoice-printable"
            className="invoice-container bg-white border border-[#E8E1D3] rounded-2xl p-6 sm:p-8 shadow-sm max-w-2xl mx-auto"
            style={{ fontFamily: "'Tajawal', 'Almarai', sans-serif" }}
          >
            {/* ─── ترويسة المتجر ─── */}
            <div className="invoice-header flex justify-between items-start pb-5 border-b-[3px] border-[#1E4327] mb-6">
              <div>
                <div className="invoice-store-name text-2xl sm:text-3xl font-black text-[#1E4327] flex items-center gap-2">
                  <span>🌿</span>
                  <span>{STORE_CONFIG.storeName}</span>
                </div>
                <div className="invoice-store-tagline text-xs text-[#524B3E] mt-1 font-medium">
                  {STORE_CONFIG.tagline}
                </div>
              </div>
              <div className="invoice-meta text-left text-[11px] sm:text-xs text-[#524B3E] leading-relaxed">
                <div><strong>📅 التاريخ:</strong> {formatDate(order.created_at)}</div>
                <div><strong>📞</strong> {STORE_CONFIG.whatsappNumber}</div>
                <div><strong>📍</strong> {STORE_CONFIG.city}</div>
              </div>
            </div>

            {/* ─── عنوان الفاتورة ─── */}
            <div className="invoice-title text-center text-lg sm:text-xl font-black text-[#C25E12] bg-[#FAF8F4] rounded-xl py-3 mb-6">
              🧾 فاتورة رقم {order.order_code}
            </div>

            {/* ─── معلومات العميل ─── */}
            <div className="invoice-section mb-6">
              <div className="invoice-section-title text-sm font-black text-[#1E4327] pb-2 border-b border-[#E8E1D3] mb-3">
                👤 معلومات العميل
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="invoice-info-row flex justify-between py-2 border-b border-dashed border-[#E8E1D3]">
                  <span className="text-[#524B3E] font-bold">الاسم الكامل:</span>
                  <span className="text-[#1A1814] font-black">{order.customer_name}</span>
                </div>
                <div className="invoice-info-row flex justify-between py-2 border-b border-dashed border-[#E8E1D3]">
                  <span className="text-[#524B3E] font-bold">رقم الهاتف:</span>
                  <span className="text-[#1A1814] font-black" dir="ltr">{order.phone}</span>
                </div>
                <div className="invoice-info-row flex justify-between py-2 border-b border-dashed border-[#E8E1D3] sm:col-span-2">
                  <span className="text-[#524B3E] font-bold shrink-0">العنوان:</span>
                  <span className="text-[#1A1814] font-black text-left">{order.address}</span>
                </div>
              </div>
            </div>

            {/* ─── جدول المنتجات ─── */}
            <div className="invoice-section mb-6">
              <div className="invoice-section-title text-sm font-black text-[#1E4327] pb-2 border-b border-[#E8E1D3] mb-3">
                📦 المنتجات المطلوبة
              </div>

              {order.items.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#8C8474] italic">
                  لا توجد تفاصيل للمنتجات
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="invoice-items-table w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#1E4327] text-white">
                        <th className="px-2 py-2.5 text-right font-black text-[11px] sm:text-xs">#</th>
                        <th className="px-2 py-2.5 text-right font-black text-[11px] sm:text-xs">المنتج</th>
                        <th className="px-2 py-2.5 text-center font-black text-[11px] sm:text-xs">الكمية</th>
                        <th className="px-2 py-2.5 text-center font-black text-[11px] sm:text-xs">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 1 ? 'bg-[#FAF8F4]' : ''}
                        >
                          <td className="px-2 py-2.5 text-right text-[#524B3E] font-bold">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-2.5 text-right text-[#1A1814] font-black">
                            {item.icon && <span className="ml-1">{item.icon}</span>}
                            {item.name}
                            {item.variantLabel && !/^kg$/i.test(item.variantLabel) && (
                              <span className="text-[10px] text-[#8C8474] font-medium block">
                                {item.variantLabel}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center text-[#1A1814] font-bold" dir="ltr">
                            {/^kg$/i.test(item.variantLabel || '') ? `${item.qty} kg` : item.qty}
                          </td>
                          <td className="px-2 py-2.5 text-center text-[#C25E12] font-black whitespace-nowrap">
                            {formatMoney(Number(item.lineTotal))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── المجاميع ─── */}
            <div className="invoice-totals pt-4 border-t-2 border-[#1E4327]">
              <div className="invoice-total-row flex justify-between py-1.5 text-xs sm:text-sm">
                <span className="text-[#524B3E] font-bold">المجموع الفرعي:</span>
                <span className="text-[#1A1814] font-black">{formatMoney(order.subtotal)}</span>
              </div>
              <div className="invoice-total-row flex justify-between py-1.5 text-xs sm:text-sm">
                <span className="text-[#524B3E] font-bold">رسوم التوصيل:</span>
                <span className="text-[#1A1814] font-black">{formatMoney(order.delivery_fee)}</span>
              </div>
              <div className="invoice-total-row grand-total flex justify-between items-center py-3 mt-2 border-t-2 border-[#C25E12] text-base sm:text-lg font-black text-[#C25E12]">
                <span>الإجمالي الكلي:</span>
                <span>{formatMoney(order.total)}</span>
              </div>
            </div>

            {/* ─── الحالة ─── */}
            <div className="text-center mt-4">
              <span className="invoice-status-badge inline-block px-4 py-1.5 rounded-full text-xs font-black bg-[#FAF8F4] border-2 border-[#E8E1D3] text-[#1E4327]">
                📌 الحالة: {STATUS_LABELS[order.status]}
              </span>
            </div>

            {/* ─── ملاحظات ─── */}
            {order.note && (
              <div className="invoice-section mt-6 pt-4 border-t border-dashed border-[#D4C8B5]">
                <div className="text-xs font-black text-[#1E4327] mb-2">📝 ملاحظات الطلب:</div>
                <div className="text-xs text-[#524B3E] leading-relaxed bg-[#FAF8F4] rounded-lg p-3">
                  {order.note.split(' | ').map((part, i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
                      <span className="text-[#C25E12] shrink-0">•</span>
                      <span>{part}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── التذييل ─── */}
            <div className="invoice-footer text-center mt-8 pt-4 border-t border-dashed border-[#D4C8B5] text-xs text-[#524B3E] leading-relaxed">
              <div className="thanks text-base font-black text-[#C25E12] mb-2">
                شكراً لتسوقكم من {STORE_CONFIG.storeName} 🌿
              </div>
              <div>نتمنى لكم تجربة تسوق ممتعة!</div>
              <div className="mt-3 text-[11px]">
                للاستفسار: {STORE_CONFIG.whatsappNumber}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer: Action Buttons ─── */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#E8E1D3] flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1E4327] to-[#2E5336] hover:from-[#112616] hover:to-[#1E4327] text-white font-black text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <Printer className="w-4 h-4 text-[#F5D76E]" />
            <span>طباعة / حفظ PDF</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppInvoice}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>إرسال عبر واتساب</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm cursor-pointer active:scale-95 transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};