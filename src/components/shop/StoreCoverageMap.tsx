// ============================================================
// الملف: StoreCoverageMap.tsx – الإصدار 3.1
// خريطة نطاق التوصيل بهوية خضرة الموحّدة
// تحسينات: Ripple + شارة ذهبية + ظلال عضوية + ألوان موحّدة
// ============================================================
import React, { useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Lock,
  Navigation,
  Leaf,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── إحداثيات مركز التجهيز ───
const STORE_COORDINATES: [number, number] = [34.0185, -4.9995];

// ─── الأحياء المغطاة ───
const FEZ_LOCATIONS = [
  { name: 'طريق إيموزار', coords: [34.0165, -4.9940] as [number, number] },
  { name: 'حي الأطلس', coords: [34.0220, -5.0010] as [number, number] },
  { name: 'حي النرجس', coords: [34.0080, -4.9850] as [number, number] },
  { name: 'طريق عين الشقف', coords: [34.0040, -5.0150] as [number, number] },
  { name: 'حي السعادة', coords: [34.0190, -4.9810] as [number, number] },
  { name: 'شارع الحسن الثاني', coords: [34.0320, -4.9980] as [number, number] },
  { name: 'المدينة الجديدة (VN)', coords: [34.0350, -5.0020] as [number, number] },
  { name: 'طريق صفرو', coords: [34.0090, -4.9720] as [number, number] },
  { name: 'شارع الجيش الملكي', coords: [34.0390, -5.0110] as [number, number] },
  { name: 'حي زواغة', coords: [34.0260, -5.0450] as [number, number] },
];

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  title?: string;
  ariaLabel?: string;
}> = ({ onClick, className, children, rippleColor = 'rgba(45,106,63,0.20)', title, ariaLabel }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'map-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.background = rippleColor;
      btn.appendChild(ripple);

      window.setTimeout(() => ripple.remove(), 650);
    }
    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

export interface StoreCoverageMapProps {
  inFooter?: boolean;
}

export const StoreCoverageMap: React.FC<StoreCoverageMapProps> = ({ inFooter = true }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [isMobileDraggingActive, setIsMobileDraggingActive] = React.useState(false);

  // ─── تهيئة الخريطة ───
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const touch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(touch);

    const map = L.map(mapContainerRef.current, {
      center: STORE_COORDINATES,
      zoom: 13,
      zoomSnap: 0.5,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: !touch,
    });

    // ─── طبقة الخريطة ───
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // ─── دائرة التوصيل السريع (4.5 كم) — أخضر الهوية ───
    L.circle(STORE_COORDINATES, {
      color: '#2D6A3F',
      fillColor: '#2D6A3F',
      fillOpacity: 0.10,
      weight: 2,
      dashArray: '5, 6',
      radius: 4500,
    }).addTo(map);

    // ─── دائرة التغطية الشاملة (8.5 كم) — برتقالي الهوية ───
    L.circle(STORE_COORDINATES, {
      color: '#EA580C',
      fillColor: '#EA580C',
      fillOpacity: 0.04,
      weight: 1.5,
      dashArray: '3, 5',
      radius: 8500,
    }).addTo(map);

    // ─── أيقونة مركز المتجر (أخضر + ذهبي) ───
    const storeIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center cursor-pointer select-none">
          <span class="absolute -inset-2.5 rounded-full bg-[#2D6A3F]/30 animate-ping"></span>
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] border-2 border-[#EAB308] shadow-[0_4px_14px_rgba(45,106,63,0.40)] flex items-center justify-center text-white text-xl font-black">
            🌿
          </div>
        </div>
      `,
      className: 'custom-store-pin',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -24],
    });

    const storeMarker = L.marker(STORE_COORDINATES, { icon: storeIcon }).addTo(map);

    const storePopupContent = `
      <div style="direction: rtl; text-align: right; padding: 6px; font-family: inherit;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <span style="background: #EAB308; color: #1A3D24; border-radius: 6px; padding: 3px 8px; font-size: 10px; font-weight: 800;">المركز الرئيسي</span>
          <strong style="color: #1A3D24; font-size: 13px;">متجر خُضرة - فاس</strong>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #5A6B5F; line-height: 1.5;">
          📍 قرب مدارة الأطلس / طريق إيموزار، فاس.<br>
          🚚 مركز التجهيز والتوزيع اليومي.
        </p>
        <a href="https://www.google.com/maps/search/?api=1&query=34.0185,-4.9995" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(90deg, #EA580C, #C25E12); color: white; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(234,88,12,0.30);">
          افتح في Google Maps ↗
        </a>
      </div>
    `;

    storeMarker.bindPopup(storePopupContent, { maxWidth: 280 });

    // ─── نقاط الأحياء ───
    FEZ_LOCATIONS.forEach((loc) => {
      const locIcon = L.divIcon({
        html: `
          <div class="flex items-center gap-1 cursor-pointer select-none -translate-x-1/2 -translate-y-1/2 group">
            <span class="w-2.5 h-2.5 rounded-full bg-[#EA580C] border-2 border-white shadow-sm shrink-0 group-hover:scale-125 transition-transform"></span>
            <span class="map-location-label bg-white/95 text-[#1A3D24] px-1.5 py-0.5 rounded-md border border-[#2D6A3F]/20 shadow-sm text-[9.5px] sm:text-[10px] font-bold whitespace-nowrap transition-all group-hover:scale-105 group-hover:text-[#EA580C] group-hover:border-[#EA580C]/40">
              ${loc.name}
            </span>
          </div>
        `,
        className: 'custom-location-point',
        iconSize: [0, 0],
      });

      const marker = L.marker(loc.coords, { icon: locIcon }).addTo(map);

      marker.bindTooltip(
        `
        <div style="direction: rtl; text-align: right; font-family: inherit; font-size: 11px; font-weight: bold; color: #1A3D24;">
          📍 ${loc.name}
        </div>
      `,
        {
          direction: 'top',
          offset: [0, -6],
          opacity: 0.95,
        }
      );

      marker.bindPopup(
        `
        <div style="direction: rtl; text-align: right; font-family: inherit; padding: 4px;">
          <strong style="color: #EA580C; font-size: 12px;">📍 ${loc.name}</strong>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #2D6A3F; font-weight: 800; display: flex; align-items: center; gap: 4px;">
            ✓ مشمول بنطاق التوصيل اليومي
          </p>
        </div>
      `,
        { maxWidth: 180 }
      );
    });

    // ─── إخفاء/إظهار أسماء الأحياء حسب التكبير ───
    const handleZoomChange = () => {
      if (!mapContainerRef.current) return;
      if (map.getZoom() < 13) {
        mapContainerRef.current.classList.add('hide-map-labels');
      } else {
        mapContainerRef.current.classList.remove('hide-map-labels');
      }
    };

    map.on('zoomend', handleZoomChange);
    handleZoomChange();

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleResetCenter = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(STORE_COORDINATES, 13, { duration: 0.8 });
    }
  }, []);

  const handleToggleMobileDrag = useCallback(() => {
    if (!mapInstanceRef.current) return;
    if (isMobileDraggingActive) {
      mapInstanceRef.current.dragging.disable();
      setIsMobileDraggingActive(false);
    } else {
      mapInstanceRef.current.dragging.enable();
      setIsMobileDraggingActive(true);
    }
  }, [isMobileDraggingActive]);

  const content = (
    <div
      className={inFooter ? "w-full relative isolate z-10" : "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-10 sm:my-16 relative isolate z-10"}
      id="store-coverage-map-section"
    >
      {/* ═══════ الأنماط الحركية ═══════ */}
      <style>{`
        @keyframes mapRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .map-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: mapRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .map-ripple { animation: none; }
        }
      `}</style>

      {/* ═══════ شبكة الشارات منفصلة تماماً فوق بطاقة الخريطة (grid-cols-2) ═══════ */}
      {/* تم تقليص حجم النصوص والحشو، وإضافة هامش سفلي مريح (mb-5 sm:mb-6) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5 sm:mb-6 w-full">
        <div className="inline-flex items-center justify-center gap-1 text-[11px] sm:text-xs font-black text-emerald-300 bg-zinc-900/90 border-2 border-emerald-500/40 py-2 px-2.5 sm:px-3 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.12)] text-center transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-400 border-2 border-white shadow-sm shrink-0"></span>
          <span className="truncate">توصيل سريع (4.5 كم)</span>
        </div>
        <div className="inline-flex items-center justify-center gap-1 text-[11px] sm:text-xs font-black text-amber-300 bg-zinc-900/90 border-2 border-amber-500/40 py-2 px-2.5 sm:px-3 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.12)] text-center transition-all">
          <span className="w-2 h-2 rounded-full bg-amber-400 border-2 border-white shadow-sm shrink-0"></span>
          <span className="truncate">تغطية شاملة (8.5 كم)</span>
        </div>
      </div>

      {/* ═══════ بطاقة الخريطة ممتدة في الخلفية بالكامل مع إضاءة بيضاء فاخرة ═══════ */}
      <div className={`relative ${
        inFooter
          ? 'bg-zinc-950 border-2 border-white/25 sm:border-white/35 rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.09),0_10px_35px_rgba(0,0,0,0.6)]'
          : 'bg-white border border-[#2D6A3F]/12 rounded-[24px] sm:rounded-[36px] shadow-[0_2px_12px_rgba(45,106,63,0.06)]'
      } overflow-hidden backdrop-blur-sm isolate w-full h-[320px] sm:h-[400px] md:h-[460px]`}>

        {/* إضاءات محيطية بيضاء وخط إضاءة علوي مثل بطاقة الواتساب */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none z-20" />
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none z-10" />

        {/* الخريطة تملأ كامل البطاقة كخلفية مباشرة (تمديد كامل لعرض أوضح) */}
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0"
          style={{
            touchAction: !isMobileDraggingActive && isTouchDevice ? 'pan-y' : 'auto',
          }}
        />

        {/* ─── أزرار التحكم ─── */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 bg-white/95 backdrop-blur-sm p-1.5 rounded-2xl border border-[#2D6A3F]/15 shadow-[0_4px_14px_rgba(45,106,63,0.15)]">
              <RippleButton
                onClick={() => mapInstanceRef.current?.zoomIn()}
                title="تكبير"
                ariaLabel="تكبير"
                rippleColor="rgba(45,106,63,0.20)"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-[#FAF8F3] text-[#1A3D24] hover:text-[#2D6A3F] flex items-center justify-center transition-colors cursor-pointer border border-[#2D6A3F]/15"
              >
                <ZoomIn className="w-4 h-4 relative z-10" strokeWidth={2.5} />
              </RippleButton>

              <RippleButton
                onClick={() => mapInstanceRef.current?.zoomOut()}
                title="تصغير"
                ariaLabel="تصغير"
                rippleColor="rgba(45,106,63,0.20)"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-[#FAF8F3] text-[#1A3D24] hover:text-[#2D6A3F] flex items-center justify-center transition-colors cursor-pointer border border-[#2D6A3F]/15"
              >
                <ZoomOut className="w-4 h-4 relative z-10" strokeWidth={2.5} />
              </RippleButton>

              <RippleButton
                onClick={handleResetCenter}
                title="إعادة التمركز"
                ariaLabel="إعادة التمركز"
                rippleColor="rgba(45,106,63,0.20)"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-[#FAF8F3] text-[#1A3D24] hover:text-[#2D6A3F] flex items-center justify-center transition-colors cursor-pointer border border-[#2D6A3F]/15"
              >
                <RotateCcw className="w-4 h-4 relative z-10" strokeWidth={2.5} />
              </RippleButton>
            </div>

            {/* ─── شارة "المركز الرئيسي" ─── */}
            <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#2D6A3F]/15 shadow-md">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#2D6A3F] to-[#1A3D24] flex items-center justify-center">
                <Leaf className="w-3.5 h-3.5 text-[#EAB308]" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-black text-[#1A3D24]">
                متجر خُضرة - فاس
              </span>
            </div>

            {/* ─── زر التبديل للهاتف ─── */}
            {isTouchDevice && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-[280px]">
                <RippleButton
                  onClick={handleToggleMobileDrag}
                  rippleColor="rgba(255,255,255,0.30)"
                  className={`w-full py-2.5 px-4 rounded-full text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border-2 ${
                    isMobileDraggingActive
                      ? 'bg-gradient-to-l from-[#2D6A3F] to-[#1A3D24] text-white border-[#EAB308]'
                      : 'bg-white/95 backdrop-blur-sm text-[#1A3D24] border-[#2D6A3F]/20 hover:bg-white hover:border-[#2D6A3F]/40'
                  }`}
                >
                  {isMobileDraggingActive ? (
                    <>
                      <Lock className="w-4 h-4 text-[#EAB308] relative z-10" strokeWidth={2.5} />
                      <span className="relative z-10">التحريك مفعّل • انقر للقفل</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 text-[#EA580C] relative z-10" strokeWidth={2.5} />
                      <span className="relative z-10">انقر لتحريك الخريطة</span>
                    </>
                  )}
                </RippleButton>
              </div>
            )}
      </div>
    </div>
  );

  return content;
};

export default StoreCoverageMap;