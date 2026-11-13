// ============================================================
// CheckoutAddressSection.tsx – الإصدار 2.0
// عنوان التوصيل + فترات التوصيل + تحديد الموقع GPS
// بهوية خضرة الموحّدة
// ============================================================
import React from 'react';
import {
  MapPin,
  Clock,
  AlertCircle,
  LocateFixed,
  Check,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { DELIVERY_SLOTS, STORE_CONFIG } from '../../data/config';
import { AddressDetectionResult } from '../../data/deliveryZones';

interface CheckoutAddressSectionProps {
  name: string;
  onNameChange: (val: string) => void;
  phone: string;
  onPhoneChange: (val: string) => void;
  street: string;
  onStreetChange: (val: string) => void;
  currentHour: number;
  deliverySlot: string;
  onSelectSlot: (slotId: string) => void;
  deliverySlotError?: string;
  locationCoords: { lat: number; lng: number } | null;
  isLocating: boolean;
  locationError: string | null;
  onGetLocation: () => void;
  currentMapsUrl: string;
  errors: Record<string, string>;
  zoneDetection?: AddressDetectionResult;
}

export const CheckoutAddressSection: React.FC<CheckoutAddressSectionProps> = ({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  street,
  onStreetChange,
  currentHour,
  deliverySlot,
  onSelectSlot,
  deliverySlotError,
  locationCoords,
  isLocating,
  locationError,
  onGetLocation,
  currentMapsUrl,
  errors,
  zoneDetection,
}) => {
  return (
    <div
      id="checkout-address-card"
      className="bg-white border-2 border-[#2D6A3F]/15 rounded-2xl p-4 sm:p-5 shadow-sm"
    >
      {/* ════════ رأس البطاقة ════════ */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#2D6A3F]/10 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#2D6A3F]/10 border border-[#2D6A3F]/20 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-[#2D6A3F]" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm sm:text-base font-black text-[#1A3D24] flex items-center gap-2">
          عنوان وتوقيت التوصيل بمدينة فاس
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
        </h3>
      </div>

      <div className="space-y-3.5">
        {/* ════════ الاسم الكامل ════════ */}
        <div id="checkout-field-name">
          <label className="block text-xs sm:text-sm font-black text-[#1A3D24] mb-1.5">
            الاسم الكامل <span className="text-[#EA580C]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="مثال: يوسف الإدريسي"
            className={`w-full px-4 py-3 rounded-xl border-2 text-sm text-[#1A3D24] bg-[#FAF8F3] focus:bg-white focus:outline-none transition-all placeholder:text-[#8A8170] font-medium ${
              errors.name
                ? 'border-rose-400 ring-2 ring-rose-100'
                : 'border-[#2D6A3F]/15 focus:border-[#2D6A3F]/50 focus:ring-2 focus:ring-[#2D6A3F]/12'
            }`}
          />
          {errors.name && (
            <p className="text-rose-600 text-xs font-black mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        {/* ════════ رقم الهاتف ════════ */}
        <div id="checkout-field-phone">
          <label className="block text-xs sm:text-sm font-black text-[#1A3D24] mb-1.5">
            رقم الهاتف <span className="text-[#EA580C]">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="0612345678"
            dir="ltr"
            className={`w-full px-4 py-3 rounded-xl border-2 text-sm text-[#1A3D24] bg-[#FAF8F3] focus:bg-white focus:outline-none transition-all placeholder:text-[#8A8170] font-medium tabular-nums ${
              errors.phone
                ? 'border-rose-400 ring-2 ring-rose-100'
                : 'border-[#2D6A3F]/15 focus:border-[#2D6A3F]/50 focus:ring-2 focus:ring-[#2D6A3F]/12'
            }`}
          />
          {errors.phone && (
            <p className="text-rose-600 text-xs font-black mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{errors.phone}</span>
            </p>
          )}
        </div>

        {/* ════════ الشارع / الحي ════════ */}
        <div id="checkout-field-street">
          <label className="block text-xs sm:text-sm font-black text-[#1A3D24] mb-1.5">
            الشارع / الزنقة / الحي <span className="text-[#EA580C]">*</span>
          </label>
          <input
            type="text"
            value={street}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="مثال: حي النرجس، عمارة 5 / طريق إيموزار..."
            className={`w-full px-4 py-3 rounded-xl border-2 text-sm text-[#1A3D24] bg-[#FAF8F3] focus:bg-white focus:outline-none transition-all placeholder:text-[#8A8170] font-medium ${
              zoneDetection?.status === 'rejected' || errors.street
                ? 'border-rose-400 ring-2 ring-rose-100'
                : zoneDetection?.status === 'accepted'
                ? 'border-[#2D6A3F] ring-2 ring-[#2D6A3F]/20'
                : 'border-[#2D6A3F]/15 focus:border-[#2D6A3F]/50 focus:ring-2 focus:ring-[#2D6A3F]/12'
            }`}
          />

          {/* ✅ سيناريو 1: عنوان صحيح في فاس */}
          {zoneDetection?.status === 'accepted' && (
            <div className="mt-2.5 p-3 rounded-xl bg-[#2D6A3F]/8 border border-[#2D6A3F]/30 flex items-center justify-between text-xs font-black text-[#1A3D24] animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2D6A3F] shrink-0 shadow-[0_0_8px_rgba(45,106,63,0.5)]" />
                <div>
                  <span className="font-black text-[#1A3D24]">{zoneDetection.zoneBadge}</span>
                  <span className="text-[#5A6B5F] text-[11px] block font-bold">
                    وقت التوصيل التقديري: {zoneDetection.estimatedTime}
                  </span>
                </div>
              </div>
              <span className="bg-[#EAB308]/25 text-[#1A3D24] border border-[#EAB308]/50 px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0">
                منطقة معتمدة ✓
              </span>
            </div>
          )}

          {/* ❌ سيناريو 2: عنوان خارج فاس */}
          {zoneDetection?.status === 'rejected' && (
            <div className="mt-2.5 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-right space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-2 text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <p className="font-black text-xs sm:text-sm text-rose-900">
                    ⚠️ خارج نطاق التوصيل
                  </p>
                  <p className="text-[11px] sm:text-xs text-rose-700 font-medium leading-relaxed mt-0.5">
                    عذراً، متجر خُضرة يقدم خدماته حالياً حصرياً لمدينة فاس وأحيائها المعتمدة.
                  </p>
                </div>
              </div>

              {/* قائمة المناطق المعتمدة */}
              <div className="bg-white/95 p-2.5 rounded-xl border border-rose-200 text-[11px] space-y-1.5">
                <p className="font-black text-[#1A3D24] text-xs">المناطق المعتمدة للتوصيل بفاس:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-bold text-[#5A6B5F]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2D6A3F] shrink-0" />
                    <span>المنطقة الشمالية: الأطلس، النرجس، سايس</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EAB308] shrink-0" />
                    <span>المنطقة الوسطى: إيموزار، فلورنس، أكدال</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EA580C] shrink-0" />
                    <span>المنطقة الجنوبية: بنسودة، زواغة، عين هارون</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span>المنطقة الشرقية: طريق صفرو، الزهور، فاس البالي</span>
                  </div>
                </div>
              </div>

              {/* زر واتساب */}
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappCleanNumber}?text=${encodeURIComponent(
                  `السلام عليكم، أردت الاستفسار عن التوصيل لعنواني خارج فاس (${street})`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-black text-xs transition-all shadow-sm active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>تواصل معنا عبر واتساب للاستفسار</span>
              </a>
            </div>
          )}

          {errors.street && zoneDetection?.status !== 'rejected' && (
            <p className="text-rose-600 text-xs font-black mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{errors.street}</span>
            </p>
          )}
        </div>

        {/* ════════ فترات التوصيل ════════ */}
        <div id="checkout-field-slot" className="pt-2 pb-1 border-t border-[#2D6A3F]/10">
          <div className="flex items-center gap-2 mb-2.5">
            <Clock className="w-4 h-4 text-[#EA580C]" strokeWidth={2.5} />
            <label className="text-xs sm:text-sm font-black text-[#1A3D24]">
              وقت التسليم المفضل <span className="text-[#EA580C]">*</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DELIVERY_SLOTS.map((slot) => {
              const isPassed =
                slot.cutoffHour !== null && currentHour >= slot.cutoffHour;
              const isSelected = deliverySlot === slot.id;

              return (
                <label
                  key={slot.id}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isPassed
                      ? 'opacity-40 bg-gray-100 border-gray-200 cursor-not-allowed'
                      : isSelected
                      ? 'bg-[#2D6A3F]/8 border-[#2D6A3F] ring-2 ring-[#2D6A3F]/20 shadow-[0_4px_14px_rgba(45,106,63,0.15)]'
                      : 'bg-[#FAF8F3] border-[#2D6A3F]/15 hover:border-[#2D6A3F]/50 hover:bg-white active:scale-[0.99]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deliverySlot"
                    value={slot.id}
                    disabled={isPassed}
                    checked={isSelected}
                    onChange={() => onSelectSlot(slot.id)}
                    className="mt-0.5 accent-[#2D6A3F] w-4 h-4 cursor-pointer"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-black text-[#1A3D24] leading-snug">
                      {slot.label}
                    </span>
                    {isPassed && (
                      <span className="text-[11px] text-rose-600 font-bold mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                        <span>انتهى حجز هذه الفترة</span>
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {deliverySlotError && (
            <p className="text-rose-600 text-xs font-black flex items-center gap-1 mt-2">
              <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{deliverySlotError}</span>
            </p>
          )}
        </div>

        {/* ════════ زر تحديد الموقع ════════ */}
        <div id="checkout-field-location" className="pt-2 border-t border-[#2D6A3F]/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <LocateFixed className="w-4 h-4 text-[#EA580C]" strokeWidth={2.5} />
              <label className="text-xs sm:text-sm font-black text-[#1A3D24]">
                تحديد الموقع الجغرافي (GPS) <span className="text-[#EA580C]">*</span>
              </label>
            </div>
            {locationCoords && (
              <span className="text-[11px] font-black text-[#1A3D24] bg-[#2D6A3F]/15 border border-[#2D6A3F]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[2.5] text-[#2D6A3F]" />
                مُثبت ({locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onGetLocation}
            disabled={isLocating}
            className={`w-full min-h-[52px] py-3 px-4 rounded-xl border-2 text-sm font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer touch-manipulation select-none active:scale-[0.98] ${
              locationCoords
                ? 'bg-[#2D6A3F]/10 text-[#1A3D24] border-[#2D6A3F] shadow-[0_4px_14px_rgba(45,106,63,0.20)]'
                : errors.location
                ? 'bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] text-white border-rose-400 ring-2 ring-rose-300 shadow-md'
                : 'bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] hover:from-[#3A8152] hover:to-[#2D6A3F] text-white border-[#EAB308]/25 shadow-[0_4px_14px_rgba(45,106,63,0.30)] hover:shadow-[0_6px_22px_rgba(45,106,63,0.42)]'
            }`}
          >
            {isLocating ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري تحديد موقعك...</span>
              </>
            ) : locationCoords ? (
              <>
                <Check className="w-5 h-5 text-[#2D6A3F] stroke-[2.5]" />
                <span>تم تحديد موقعك بدقة</span>
              </>
            ) : (
              <>
                <LocateFixed className="w-5 h-5 text-[#EAB308]" strokeWidth={2.5} />
                <span>حدد موقعك الحالي</span>
              </>
            )}
          </button>

          {errors.location && !locationCoords && (
            <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border-2 border-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" strokeWidth={2.5} />
              <p className="text-xs text-rose-800 font-black leading-relaxed">{errors.location}</p>
            </div>
          )}

          {locationError && (
            <div className="mt-2.5 p-3 rounded-xl bg-[#FEF3C7] border border-[#EAB308]/50 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#92400E] mt-0.5" strokeWidth={2.5} />
              <p className="text-xs text-[#92400E] font-bold">{locationError}</p>
            </div>
          )}

          {currentMapsUrl && (
            <a
              href={currentMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-white hover:bg-[#2D6A3F]/8 active:scale-[0.98] border-2 border-[#2D6A3F] text-[#1A3D24] font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>معاينة على الخريطة</span>
              <ExternalLink className="w-4 h-4 text-[#2D6A3F] shrink-0" strokeWidth={2.5} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};