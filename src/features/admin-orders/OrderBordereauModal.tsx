// ============================================================
// OrderBordereauModal.tsx
// ملصق الشحن والتوصيل الفوري (Bordereau de Livraison)
// مخصص للصناديق العازلة (50L) وسائقي inDrive / DONE / Yassir بفاس
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  Phone,
  MapPin,
  Truck,
  Layers,
  Copy,
  Check,
  Send,
  ExternalLink,
} from 'lucide-react';
import { DbOrder, detectFezZone } from '../../services/supabaseService';
import {
  STORE_CONFIG,
  DELIVERY_PROVIDERS,
  STORE_PICKUP_HUB,
  FEZ_DELIVERY_ZONES,
} from '../../data/config';

interface OrderBordereauModalProps {
  order: DbOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

function toWhatsApp(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('212')) return digits;
  if (digits.startsWith('0')) return '212' + digits.slice(1);
  return digits;
}

export const OrderBordereauModal: React.FC<OrderBordereauModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // ─── إغلاق بـ Escape ───
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  // ─── بيانات التوصيل ───
  const dispatch = order.delivery_dispatch;
  const provider =
    DELIVERY_PROVIDERS.find((p) => p.id === dispatch?.provider) ||
    DELIVERY_PROVIDERS[0];
  const detectedZone = detectFezZone(order.address || '');
  const zoneKey = (dispatch?.zone || order.delivery_zone || detectedZone || 'north') as keyof typeof FEZ_DELIVERY_ZONES;
  const zoneInfo = FEZ_DELIVERY_ZONES[zoneKey] || FEZ_DELIVERY_ZONES.north;
  const safeTotal = Number(order.total ?? 0);
  const deliveryCost = dispatch?.deliveryCost ?? 25;
  const mapUrl =
    order.maps_link ||
    (order.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address + ' فاس')}`
      : '');

  // ─── بناء نص الملصق للنسخ أو الإرسال عبر واتساب ───
  const buildBordereauText = (): string => {
    const itemsLines =
      order.items.length > 0
        ? order.items
            .map((it, i) => {
              const isWeight = /^kg$/i.test(it.variantLabel || '');
              const qtyLabel = isWeight
                ? `${it.qty} kg`
                : `${it.qty}${it.variantLabel ? ` (${it.variantLabel})` : ''}`;
              return `  ${i + 1}. ${it.name} × ${qtyLabel} = ${Number(it.lineTotal).toFixed(2)} DH`;
            })
            .join('\n')
        : '  (صندوق خضار وفواكه طازجة)';

    return [
      `🏷️ *ملصق شحن فوري - متجر خُضرة 🌿*`,
      `📦 *رقم الطلب:* ${order.order_code}`,
      `📅 *التاريخ:* ${new Date(order.created_at).toLocaleDateString('ar-MA')} - فاس`,
      `────────────────────`,
      `🚴 *شركة التوصيل:* ${provider.name}`,
      `🧭 *المسار:* ${zoneInfo.name} (${zoneInfo.targetTime})`,
      `👤 *السائق:* ${dispatch?.driverName || 'بانتظار التخصيص'}${dispatch?.driverPhone ? ` (${dispatch.driverPhone})` : ''}`,
      `🚚 *أجرة التوصيل:* ${deliveryCost} درهم`,
      `────────────────────`,
      `📍 *نقطة الانطلاق:*`,
      `${STORE_PICKUP_HUB.name} - ${STORE_PICKUP_HUB.address}`,
      ``,
      `🏠 *بيانات الزبون والتسليم:*`,
      `👤 *الاسم:* ${order.customer_name}`,
      `📞 *الهاتف:* ${order.phone}`,
      `📍 *العنوان:* ${order.address}`,
      mapUrl ? `🗺️ *الموقع:* ${mapUrl}` : '',
      `────────────────────`,
      `💵 *المبلغ المطلوب تحصيله (COD): ${safeTotal.toFixed(2)} درهم*`,
      `────────────────────`,
      `🛒 *محتويات الطرد (${order.items.length} أصناف):*`,
      itemsLines,
    ]
      .filter(Boolean)
      .join('\n');
  };

  // ─── نسخ الملصق ───
  const handleCopyBordereau = async () => {
    const text = buildBordereauText();
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  // ─── إرسال الملصق عبر واتساب للسائق ───
  const handleSendWhatsApp = () => {
    const text = buildBordereauText();
    const driverWa = toWhatsApp(dispatch?.driverPhone || '');
    const url = driverWa
      ? `https://wa.me/${driverWa}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // ─── طباعة الملصق (متوافق مع المتصفح والـ iFrame والهواتف) ───
  const handlePrint = () => {
    const safeOrderCode = String(order.order_code || '').replace(/[<>&"']/g, '');
    const itemsRowsHtml = order.items
      .map((item, idx) => {
        const isWeight = /^kg$/i.test(item.variantLabel || '');
        const qtyDisplay = isWeight ? `${item.qty} kg` : item.qty;
        const extraLabel = item.variantLabel && !isWeight ? `<span style="color:#57534e">(${item.variantLabel})</span>` : '';
        return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${item.name}</strong> ${extraLabel}</td>
          <td style="text-align:center;font-weight:700" dir="ltr">${qtyDisplay}</td>
          <td style="text-align:left;font-family:monospace;font-weight:700" dir="ltr">${Number(item.lineTotal).toFixed(2)} DH</td>
        </tr>`;
      })
      .join('');

    const htmlDocument = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>ملصق شحن ${safeOrderCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;
            background: #ffffff;
            color: #111827;
            padding: 16px;
            direction: rtl;
          }
          .bordereau-box {
            border: 2px solid #111827;
            border-radius: 12px;
            padding: 18px;
            max-width: 620px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px dashed #1f2937;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .logo { font-size: 24px; font-weight: 900; color: #15803d; }
          .sub { font-size: 12px; color: #4b5563; font-weight: 600; margin-top: 2px; }
          .badge {
            background: #111827;
            color: #ffffff;
            padding: 5px 12px;
            font-size: 14px;
            font-weight: 900;
            border-radius: 6px;
            display: inline-block;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 12px;
          }
          .box {
            border: 1px solid #d6d3d1;
            background: #fafaf9;
            border-radius: 8px;
            padding: 10px;
          }
          .box-green {
            border: 1px solid #a7f3d0;
            background: #ecfdf5;
            border-radius: 8px;
            padding: 10px;
          }
          .label { font-size: 11px; font-weight: 700; color: #57534e; margin-bottom: 3px; }
          .val { font-size: 13px; font-weight: 800; color: #1c1917; }
          .customer-box {
            border: 2px solid #1c1917;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 12px;
            background: #ffffff;
          }
          .customer-name { font-size: 18px; font-weight: 900; color: #111827; margin: 4px 0; }
          .customer-phone { font-size: 15px; font-weight: 800; font-family: monospace; color: #065f46; margin-bottom: 6px; }
          .customer-addr {
            background: #f5f5f4;
            padding: 8px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #292524;
          }
          .cod-banner {
            background: #fef3c7;
            border: 2px solid #d97706;
            padding: 12px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 12px;
          }
          .cod-amount { font-size: 26px; font-weight: 900; color: #78350f; margin: 2px 0; }
          .layers {
            border: 1px solid #d6d3d1;
            background: #f5f5f4;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 12px;
            font-size: 11px;
          }
          .layer-row {
            display: flex;
            justify-content: space-between;
            background: #ffffff;
            padding: 5px 8px;
            border-radius: 4px;
            border: 1px solid #e7e5e4;
            margin-top: 4px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
          th, td { border: 1px solid #d6d3d1; padding: 6px 8px; text-align: right; }
          th { background: #e7e5e4; font-weight: 800; }
          .footer {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px dashed #a8a29e;
            text-align: center;
            font-size: 11px;
            color: #57534e;
            font-weight: 700;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="bordereau-box">
          <div class="header">
            <div>
              <div class="logo">خُضرة 🌿</div>
              <div class="sub">طازج من بنسودة إلى باب المنزل • توصيل فوري بفاس</div>
            </div>
            <div style="text-align:left">
              <span class="badge">${safeOrderCode}</span>
              <div class="sub" style="margin-top:4px">${new Date(order.created_at).toLocaleDateString('ar-MA')} - فاس</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="box">
              <div class="label">📍 نقطة الانطلاق:</div>
              <div class="val">${STORE_PICKUP_HUB.name}</div>
              <div style="font-size:11px;color:#57534e;margin-top:2px">${STORE_PICKUP_HUB.address}</div>
            </div>
            <div class="box-green">
              <div class="label" style="color:#065f46">🚴 شركة التوصيل والمسار:</div>
              <div class="val" style="color:#064e3b">${provider.icon} ${provider.name}</div>
              <div style="font-size:11px;color:#047857;font-weight:700;margin-top:2px">${zoneInfo.name} (${zoneInfo.targetTime})</div>
            </div>
          </div>

          <div class="customer-box">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="label">بيانات الزبون والموقع:</span>
              <span style="background:#e7e5e4;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800">${zoneInfo.name}</span>
            </div>
            <div class="customer-name">${order.customer_name}</div>
            <div class="customer-phone" dir="ltr">📞 ${order.phone}</div>
            <div class="customer-addr">🏠 ${order.address}</div>
          </div>

          <div class="cod-banner">
            <div style="font-size:12px;font-weight:800;color:#78350f">المبلغ المطلوب تحصيله من الزبون (COD):</div>
            <div class="cod-amount">${safeTotal.toFixed(2)} درهم</div>
            <div style="font-size:11px;font-weight:700;color:#92400e">شامل المنتجات والتوصيل • نقداً عند التسليم</div>
          </div>

          <div class="grid-2">
            <div class="box">
              <div class="label">👤 السائق المكلف:</div>
              <div class="val">${dispatch?.driverName || 'بانتظار التخصيص'}</div>
              ${dispatch?.driverPhone ? `<div style="font-family:monospace;font-size:12px;margin-top:2px" dir="ltr">${dispatch.driverPhone}</div>` : ''}
            </div>
            <div class="box">
              <div class="label">🚚 تكلفة رحلة السائق:</div>
              <div class="val" style="color:#065f46">${deliveryCost} درهم</div>
            </div>
          </div>

          <div class="layers">
            <div style="font-weight:800;color:#1c1917;margin-bottom:4px">📦 التوضيب القياسي في الصندوق العازل (50L):</div>
            <div class="layer-row"><span>🔝 <strong>الطبقة العليا:</strong> فواكه حساسة وطماطم</span><span style="color:#15803d;font-weight:700">لا أوزان فوقها</span></div>
            <div class="layer-row"><span>🔸 <strong>الطبقة الوسطى:</strong> ورقيات وأعشاب طازجة</span><span>أكياس تهوية</span></div>
            <div class="layer-row"><span>🔻 <strong>الطبقة السفلى:</strong> خضار ثقيلة (بطاطس، بصل)</span><span>قاعدة الصندوق</span></div>
          </div>

          <div>
            <div style="font-size:12px;font-weight:800;margin-bottom:4px">🛒 محتويات الطرد (${order.items.length} أصناف):</div>
            <table>
              <thead>
                <tr>
                  <th style="width:32px">#</th>
                  <th>المنتج</th>
                  <th style="width:70px;text-align:center">الكمية</th>
                  <th style="width:95px;text-align:left">المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="footer">
            متجر خُضرة 🌿 • توصيل فوري بفاس • واتساب الإدارة: <span dir="ltr">${STORE_CONFIG.whatsappNumber}</span>
          </div>
        </div>
      </body>
      </html>
    `;

    // طباعة آمنة عبر iframe مخفي (تعمل دائماً حتى مع حظر النوافذ المنبثقة)
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc && iframe.contentWindow) {
        doc.open();
        doc.write(htmlDocument);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }, 250);
        return;
      }
    } catch {
      // fallback
    }

    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`ملصق الشحن للطلب ${order.order_code}`}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl border-2 border-[#E8E1D3] overflow-hidden my-auto text-right"
      >
        {/* ─── Header Bar ─── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 bg-gradient-to-l from-[#163920] to-[#0E2615] text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 bg-white/15 border border-white/20 rounded-xl shrink-0">
              <Truck className="w-5 h-5 text-[#F5D76E]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate">ملصق الشحن الفوري (Bordereau)</h2>
              <p className="text-[11px] text-emerald-100/90 font-bold truncate">
                طلب {order.order_code} • {provider.name} ({zoneInfo.name})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5D76E] hover:bg-[#eab308] text-[#112616] rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الملصق</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Area قابلة للطباعة ─── */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-[#F7F4EC]">
          <div
            id="bordereau-printable"
            className="bg-white border-2 border-stone-900 rounded-2xl p-4 sm:p-5 shadow-sm mx-auto max-w-xl"
          >
            {/* Logo + Code */}
            <div className="flex items-center justify-between border-b-2 border-dashed border-stone-800 pb-3 mb-4">
              <div>
                <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                  خُضرة 🌿
                </span>
                <p className="text-[11px] sm:text-xs font-bold text-stone-600 mt-0.5">
                  طازج من بنسودة إلى باب المنزل • فاس
                </p>
              </div>
              <div className="text-left">
                <span className="inline-block bg-stone-900 text-white text-xs font-black px-3 py-1 rounded-lg tabular-nums">
                  {order.order_code}
                </span>
                <p className="text-[11px] text-stone-500 font-bold mt-1">
                  {new Date(order.created_at).toLocaleDateString('ar-MA')} - فاس
                </p>
              </div>
            </div>

            {/* Hub & Provider */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              <div className="border border-stone-200 bg-stone-50 rounded-xl p-2.5">
                <p className="text-[11px] font-bold text-stone-500">📍 نقطة الانطلاق:</p>
                <p className="text-xs font-black text-stone-800 mt-0.5">{STORE_PICKUP_HUB.name}</p>
                <p className="text-[10px] text-stone-500 mt-0.5">{STORE_PICKUP_HUB.address}</p>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-2.5">
                <p className="text-[11px] font-bold text-emerald-800">🚴 شركة التوصيل:</p>
                <p className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-1 mt-0.5">
                  <span>{provider.icon}</span>
                  <span>{provider.name}</span>
                </p>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  المسار: {zoneInfo.name} ({zoneInfo.targetTime})
                </p>
              </div>
            </div>

            {/* Customer & Address */}
            <div className="border-2 border-stone-900 rounded-xl p-3 bg-white mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-stone-500">
                  بيانات الزبون والتسليم:
                </span>
                <span className="text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">
                  {zoneInfo.name}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 mb-1">
                {order.customer_name}
              </h3>
              <div className="flex items-center gap-2 text-stone-800 font-mono font-black text-sm sm:text-base mb-2">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span dir="ltr">{order.phone}</span>
              </div>
              <div className="flex items-start justify-between gap-2 text-xs text-stone-700 bg-stone-100 p-2.5 rounded-lg">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-[#C25E12] shrink-0 mt-0.5" />
                  <span className="font-bold leading-snug">{order.address}</span>
                </div>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>GPS</span>
                  </a>
                )}
              </div>
            </div>

            {/* COD Callout */}
            <div className="bg-amber-100/90 border-2 border-amber-500 rounded-xl p-3 text-center mb-3">
              <p className="text-xs font-black text-amber-900">
                💵 المبلغ المطلوب تحصيله من الزبون (COD):
              </p>
              <div className="text-2xl sm:text-3xl font-black text-amber-950 my-0.5 tabular-nums">
                {safeTotal.toFixed(2)} <span className="text-base">درهم</span>
              </div>
              <p className="text-[11px] font-bold text-amber-800">
                شامل المنتجات والتوصيل • يُحصّل نقداً عند التسليم
              </p>
            </div>

            {/* Driver & Cost */}
            <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs border border-stone-200 rounded-xl p-2.5 bg-stone-50">
              <div>
                <span className="text-stone-500 font-bold block text-[11px]">👤 السائق المكلف:</span>
                <span className="font-black text-stone-900">
                  {dispatch?.driverName || 'بانتظار التخصيص'}
                </span>
                {dispatch?.driverPhone && (
                  <span className="block font-mono font-bold text-emerald-800 mt-0.5" dir="ltr">
                    {dispatch.driverPhone}
                  </span>
                )}
              </div>
              <div>
                <span className="text-stone-500 font-bold block text-[11px]">🚚 تكلفة رحلة السائق:</span>
                <span className="font-black text-emerald-800">
                  {deliveryCost} درهم
                </span>
              </div>
            </div>

            {/* Packaging Guide */}
            <div className="border border-stone-300 rounded-xl p-2.5 bg-stone-100/80 mb-3 text-[11px]">
              <p className="font-black text-stone-800 mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                <span>التوضيب في الصندوق العازل (50L):</span>
              </p>
              <div className="space-y-1 text-stone-700">
                <div className="flex justify-between bg-white px-2.5 py-1 rounded-md border border-stone-200">
                  <span>🔝 <strong>العليا:</strong> فواكه حساسة وطماطم</span>
                  <span className="text-emerald-700 font-bold">لا أوزان فوقها</span>
                </div>
                <div className="flex justify-between bg-white px-2.5 py-1 rounded-md border border-stone-200">
                  <span>🔸 <strong>الوسطى:</strong> ورقيات وأعشاب طازجة</span>
                  <span className="text-stone-500 font-semibold">أكياس تهوية</span>
                </div>
                <div className="flex justify-between bg-white px-2.5 py-1 rounded-md border border-stone-200">
                  <span>🔻 <strong>السفلى:</strong> خضار ثقيلة (بطاطس، بصل)</span>
                  <span className="text-stone-500 font-semibold">قاعدة الصندوق</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-stone-200 pt-2.5 mb-2">
              <p className="text-xs font-black text-stone-800 mb-1.5">
                🛒 محتويات الطرد ({order.items.length} أصناف):
              </p>
              <table className="w-full text-xs text-right border border-stone-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-stone-200 text-stone-800 font-black">
                    <th className="p-1.5 border border-stone-300">المنتج</th>
                    <th className="p-1.5 border border-stone-300 text-center">الكمية</th>
                    <th className="p-1.5 border border-stone-300 text-left">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => {
                    const isWeight = /^kg$/i.test(item.variantLabel || '');
                    return (
                      <tr key={idx} className="border-b border-stone-200">
                        <td className="p-1.5 font-bold text-stone-800">
                          {item.name}{' '}
                          {item.variantLabel && !isWeight ? (
                            <span className="text-stone-500 font-normal">({item.variantLabel})</span>
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="p-1.5 text-center font-black tabular-nums" dir="ltr">
                          {isWeight ? `${item.qty} kg` : item.qty}
                        </td>
                        <td className="p-1.5 text-left font-mono font-bold tabular-nums" dir="ltr">
                          {Number(item.lineTotal).toFixed(2)} DH
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] font-bold text-stone-500 border-t border-dashed border-stone-300 pt-2">
              متجر خُضرة 🌿 • توصيل فوري بفاس • <span dir="ltr">{STORE_CONFIG.whatsappNumber}</span>
            </div>
          </div>
        </div>

        {/* ─── Footer Actions ─── */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#E8E1D3] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#163920] hover:bg-[#0E2615] text-white text-xs font-black cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <Printer className="w-4 h-4 text-[#F5D76E]" />
              <span>طباعة الملصق</span>
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال للسائق (واتساب)</span>
            </button>
            <button
              type="button"
              onClick={handleCopyBordereau}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-xs font-black cursor-pointer transition-all active:scale-95 ${
                isCopied
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                  : 'bg-[#F7F4EC] hover:bg-[#EAE2D2] border-[#E8E1D3] text-[#112616]'
              }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'تم النسخ' : 'نسخ النص'}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-black cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
