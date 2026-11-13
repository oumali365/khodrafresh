// ============================================================
// الملف: CheckoutModal.tsx – الإصدار 4.1
// تأكيد الطلب بهوية خضرة الموحّدة
// مع الحفاظ الكامل على كل وظائف الحماية
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { X, ShoppingBag, Sparkles } from 'lucide-react';
import { CartItem, PaymentMethod, OrderSubmission } from '../../types';
import { STORE_CONFIG, MOROCCAN_BANKS, DELIVERY_SLOTS } from '../../data/config';
import { detectAddressZone } from '../../data/deliveryZones';
import {
  getClientId,
  getDeviceFingerprint,
  fetchClientIp,
  checkOrderCooldown,
  checkClientRateLimit,
  generateIdempotencyKey,
  validateMoroccanPhone,
  validateCustomerName,
  sanitizeInput,
} from '../../services/securityService';
import {
  calculateCustomerDeliveryFee,
  TARIFF_STANDARDS,
} from '../../services/financialEngine';
import { CheckoutCartSummary } from './CheckoutCartSummary';
import { CheckoutAddressSection } from './CheckoutAddressSection';
import { CheckoutPaymentSection } from './CheckoutPaymentSection';
import { CheckoutSecuritySubmit } from './CheckoutSecuritySubmit';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onSubmitOrder: (order: OrderSubmission) => Promise<void>;
}

// ═══════ زر Ripple ═══════
const RippleButton: React.FC<{
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
  rippleColor?: string;
  ariaLabel?: string;
}> = ({ onClick, className, children, rippleColor = 'rgba(255,255,255,0.30)', ariaLabel }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'checkout-ripple';
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
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </button>
  );
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onSubmitOrder,
}) => {
  if (!isOpen) return null;

  const currentHour = new Date().getHours();

  const validFirstSlot =
    DELIVERY_SLOTS.find(
      (slot) => slot.cutoffHour === null || currentHour < slot.cutoffHour
    )?.id || DELIVERY_SLOTS[DELIVERY_SLOTS.length - 1].id;

  // ─── بيانات الزبون والعنوان ───
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ─── التوصيل والدفع ───
  const [deliverySlot, setDeliverySlot] = useState(validFirstSlot);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [selectedBankId, setSelectedBankId] = useState('barid');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // ─── الأخطاء وحالة الإرسال ───
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  // ─── أنظمة الحماية ───
  const [cooldown, setCooldown] = useState(() => checkOrderCooldown());
  const [rateLimit, setRateLimit] = useState(() => checkClientRateLimit());
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string | null>(null);

  // ─── كشف المسار ───
  const zoneDetection = React.useMemo(() => detectAddressZone(street), [street]);

  useEffect(() => {
    fetchClientIp().then((ip) => {
      if (ip) setIpAddress(ip);
    });

    const interval = setInterval(() => {
      setCooldown(checkOrderCooldown());
      setRateLimit(checkClientRateLimit());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ─── الحسابات المالية الموحدة ───
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = calculateCustomerDeliveryFee(subtotal);
  const isFreeDelivery = deliveryFee === 0;
  const grandTotal = Number((subtotal + deliveryFee).toFixed(2));
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);


  const currentBank =
    MOROCCAN_BANKS.find((b) => b.id === selectedBankId) || MOROCCAN_BANKS[0];

  const targetCity = 'فاس';

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('خاصية تحديد الموقع غير مدعومة في جهازك أو متصفحك');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLocationCoords({
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
        });
        setErrors((prev) => {
          const next = { ...prev };
          delete next.location;
          return next;
        });
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocationError('يرجى السماح بصلاحية الموقع (GPS) في المتصفح لتحديد موقع التوصيل بدقة');
        } else if (err.code === 2) {
          setLocationError('تعذر التقاط إحداثيات الموقع بدقة، يرجى تفعيل الـ GPS وإعادة المحاولة');
        } else {
          setLocationError('انتهت مهلة تحديد الموقع، يرجى إعادة المحاولة للتثبيت');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const generateGoogleMapsUrl = () => {
    if (locationCoords) {
      return `https://www.google.com/maps/search/?api=1&query=${locationCoords.lat},${locationCoords.lng}`;
    }
    const parts = [street.trim(), targetCity, 'المغرب'].filter(Boolean);
    if (!street.trim()) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join('، '))}`;
  };

  const getFullAddress = () => {
    const parts = [street.trim(), targetCity].filter(Boolean);
    return parts.join('، ');
  };

  const currentMapsUrl = generateGoogleMapsUrl();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: 'حجم الملف يجب ألا يتجاوز 5 ميغابايت' }));
      return;
    }

    setReceiptFile(file);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.receipt;
      return next;
    });

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const nameCheck = validateCustomerName(name);
    if (!nameCheck.valid) {
      newErrors.name = nameCheck.error || 'يرجى إدخال اسم صحيح';
    }

    const phoneCheck = validateMoroccanPhone(phone);
    if (!phoneCheck.valid) {
      newErrors.phone = phoneCheck.error || 'يرجى إدخال رقم هاتف مغربي صحيح';
    }

    const cleanStreet = sanitizeInput(street);
    if (!cleanStreet || cleanStreet.length < 3) {
      newErrors.street = 'يرجى إدخال اسم الشارع / الزنقة بوضوح';
    } else if (zoneDetection.status === 'rejected') {
      newErrors.street = 'العنوان خارج نطاق التوصيل لمدينة فاس (نخدم أحياء فاس فقط)';
    }

    if (!deliverySlot) {
      newErrors.deliverySlot = 'يرجى اختيار وقت التسليم المناسب';
    }

    if (paymentMethod === 'bank' && !receiptFile) {
      newErrors.receipt = 'يرجى إرفاق صورة أو وصل التحويل البنكي للمتابعة';
    }

    if (!locationCoords || typeof locationCoords.lat !== 'number' || typeof locationCoords.lng !== 'number') {
      newErrors.location = 'يرجى تحديد موقعك الحالي (GPS) بدقة عبر الزر المخصص لإكمال تأكيد الطلب';
    }

    const minOrderAmount = STORE_CONFIG.minOrderAmount || 70;
    if (!items || items.length === 0) {
      newErrors.cart = 'السلة فارغة، يرجى اختيار بعض الخضر أو الفواكه أولاً';
    } else if (grandTotal < minOrderAmount) {
      newErrors.cart = `الحد الأدنى للطلب هو ${minOrderAmount} ${STORE_CONFIG.currency} شامل رسوم التوصيل. ينقصك ${(minOrderAmount - grandTotal).toFixed(2)} ${STORE_CONFIG.currency}.`;
    } else if (grandTotal <= 0 || grandTotal > 50000) {
      newErrors.cart = 'قيمة الطلب غير صحيحة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (cooldown.inCooldown) {
      setErrors((prev) => ({
        ...prev,
        security: `⏳ فترة التهدئة الأمنية مفعلة: يرجى الانتظار ${cooldown.remainingFormatted} قبل إرسال طلب جديد لنفس الزبون لتفادي التكرار.`,
      }));
      return;
    }

    if (!rateLimit.allowed) {
      setErrors((prev) => ({
        ...prev,
        security: `🛑 تجاوزت الحد الأقصى للطلبات في الساعة (3 طلبات). يرجى التواصل معنا عبر واتساب لمتابعة طلبك.`,
      }));
      return;
    }

    if (!validateForm()) {
      let firstErrorField: string | null = null;
      const nameCheck = validateCustomerName(name);
      const phoneCheck = validateMoroccanPhone(phone);
      const cleanStreet = sanitizeInput(street);

      if (!nameCheck.valid) {
        firstErrorField = 'name';
      } else if (!phoneCheck.valid) {
        firstErrorField = 'phone';
      } else if (!cleanStreet || cleanStreet.length < 3 || zoneDetection.status === 'rejected') {
        firstErrorField = 'street';
      } else if (!locationCoords || typeof locationCoords.lat !== 'number' || typeof locationCoords.lng !== 'number') {
        firstErrorField = 'location';
      } else if (!deliverySlot) {
        firstErrorField = 'slot';
      } else if (paymentMethod === 'bank' && !receiptFile) {
        firstErrorField = 'receipt';
      }

      if (firstErrorField) {
        setTimeout(() => {
          const targetId = `checkout-field-${firstErrorField}`;
          const el = document.getElementById(targetId) || document.getElementById('checkout-address-card');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
      return;
    }

    setIsSubmitting(true);

    // 🛡️ فحص صارم لرمز التحقق الأمني (Turnstile) ومنع الرموز الافتراضية
    if (!turnstileToken || turnstileToken.trim() === '' || turnstileToken === 'verified_token') {
      setErrors((prev) => ({
        ...prev,
        security: 'يرجى إكمال اختبار التحقق الأمني البشري قبل تأكيد الطلب.',
      }));
      setIsSubmitting(false);
      return;
    }

    try {
      const verifyRes = await fetch('/api/security/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success || !verifyData.verified) {
        setErrors((prev) => ({
          ...prev,
          security: verifyData.error || 'فشل التحقق الأمني من كاشف الروبوتات. يرجى إعادة الاختبار.',
        }));
        setIsSubmitting(false);
        return;
      }
    } catch (vErr) {
      console.warn('[Security] Notice on Turnstile verification call:', vErr);
    }

    const orderCode = '#' + Math.floor(1000 + Math.random() * 9000);
    const chosenSlot =
      DELIVERY_SLOTS.find((s) => s.id === deliverySlot)?.label || deliverySlot;
    const fullAddress = getFullAddress() || sanitizeInput(street);
    const mapsLink = generateGoogleMapsUrl();

    const clientId = getClientId();
    const deviceFingerprint = getDeviceFingerprint();
    const phoneCheck = validateMoroccanPhone(phone);
    const cleanCustomerPhone = phoneCheck.cleanPhone || phone.trim();

    const idempotencyKey = generateIdempotencyKey(
      clientId,
      cleanCustomerPhone,
      grandTotal,
      totalItems
    );

    const submission: OrderSubmission = {
      orderCode,
      customerName: sanitizeInput(name),
      phone: cleanCustomerPhone,
      address: fullAddress,
      delivery_zone: zoneDetection.zoneId || 'north',
      street: sanitizeInput(street),
      city: targetCity,
      coordinates: locationCoords || undefined,
      mapsLink: mapsLink || undefined,
      deliverySlot: chosenSlot,
      paymentMethod,
      bankId: paymentMethod === 'bank' ? currentBank.name : undefined,
      items,
      subtotal,
      deliveryFee,
      total: grandTotal,
      receiptFileName: receiptFile ? receiptFile.name : undefined,
      status: 'جاري التجهيز',
      created_at: new Date().toISOString(),
      idempotencyKey,
      clientId,
      deviceFingerprint,
      ipAddress: ipAddress || undefined,
      turnstileToken: turnstileToken.trim(),
      securityFlags: {
        verified_at: new Date().toISOString(),
        client_cooldown_passed: true,
        source: 'khodra_web_pwa',
        delivery_zone: zoneDetection.zoneId || 'north',
        zone_status: zoneDetection.status,
      },
    };

    try {
      await onSubmitOrder(submission);
    } catch (err: any) {
      console.error('Submit order caught error:', err);
      const errMsg = err?.message || 'تعذر تأكيد الطلب. يرجى مراجعة الكميات بالسلة.';
      setErrors((prev) => ({
        ...prev,
        cart: errMsg,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes checkoutRippleExpand {
          0%   { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .checkout-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          transform: scale(0);
          animation: checkoutRippleExpand 0.65s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .checkout-ripple { animation: none; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-[#FBF9F5] border-2 border-[#2D6A3F]/15 rounded-[24px] w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">

          {/* ════════ رأس النافذة — بهوية خضرة ════════ */}
          <div className="relative p-4 sm:p-5 bg-gradient-to-l from-[#2D6A3F] via-[#234F30] to-[#1A3D24] text-white flex items-center justify-between shrink-0 shadow-sm overflow-hidden">
            {/* دوائر ضوئية */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#EAB308]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#2D6A3F]/40 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-[#EAB308]/40 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-[#EAB308]" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-black flex items-center gap-2 text-white">
                  <span>تأكيد الطلب</span>
                  <Sparkles className="w-4 h-4 text-[#EAB308]" strokeWidth={2.5} />
                </h2>
                <p className="text-[11px] sm:text-xs text-emerald-100/90 font-bold">
                  أكمل بياناتك لإتمام الطلب
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="relative w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* ════════ جسم النموذج ════════ */}
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 text-right bg-[#FBF9F5]"
          >
            {/* تنبيه الحد الأدنى للطلب الترحيبي (70 د.م شامل التوصيل) */}
            {grandTotal < (STORE_CONFIG.minOrderAmount || 70) && (
              <div className="p-3 bg-emerald-50/85 border border-emerald-200/90 rounded-2xl text-[#163920] text-xs font-bold flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🥬</span>
                  <span className="leading-relaxed">
                    مرحباً بك! الحد الأدنى للطلب هو <strong>{STORE_CONFIG.minOrderAmount || 70} {STORE_CONFIG.currency}</strong> شامل التوصيل (تبقى <strong>{((STORE_CONFIG.minOrderAmount || 70) - grandTotal).toFixed(2)} {STORE_CONFIG.currency}</strong>).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-[#163920] text-white rounded-xl text-xs font-black shrink-0 hover:bg-[#0E2615] cursor-pointer"
                >
                  + إضافة منتجات
                </button>
              </div>
            )}

            {/* 1. ملخص السلة */}
            <CheckoutCartSummary
              items={items}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              isFreeDelivery={isFreeDelivery}
              grandTotal={grandTotal}
              totalItems={totalItems}
            />

            {/* 2. عنوان ووقت التوصيل */}
            <CheckoutAddressSection
              name={name}
              onNameChange={(val) => {
                setName(val);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              phone={phone}
              onPhoneChange={(val) => {
                setPhone(val);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              street={street}
              onStreetChange={(val) => {
                setStreet(val);
                if (errors.street) setErrors((prev) => ({ ...prev, street: '' }));
              }}
              currentHour={currentHour}
              deliverySlot={deliverySlot}
              onSelectSlot={(slotId) => {
                setDeliverySlot(slotId);
                if (errors.deliverySlot) {
                  setErrors((prev) => ({ ...prev, deliverySlot: '' }));
                }
              }}
              deliverySlotError={errors.deliverySlot}
              locationCoords={locationCoords}
              isLocating={isLocating}
              locationError={locationError}
              onGetLocation={handleGetLocation}
              currentMapsUrl={currentMapsUrl}
              errors={errors}
              zoneDetection={zoneDetection}
            />

            {/* 3. طريقة الدفع */}
            <CheckoutPaymentSection
              paymentMethod={paymentMethod}
              onChangePaymentMethod={(method) => setPaymentMethod(method)}
              selectedBankId={selectedBankId}
              onSelectBankId={(id) => setSelectedBankId(id)}
              receiptFile={receiptFile}
              receiptPreview={receiptPreview}
              onFileChange={handleFileChange}
              receiptError={errors.receipt}
            />

            {/* 4. الأمان وزر التأكيد */}
            <CheckoutSecuritySubmit
              isSubmitting={isSubmitting}
              cooldown={cooldown}
              rateLimit={rateLimit}
              errors={errors}
              grandTotal={grandTotal}
              onTurnstileVerify={(token) => setTurnstileToken(token)}
              isZoneRejected={zoneDetection.status === 'rejected'}
              isBelowMinOrder={grandTotal < (STORE_CONFIG.minOrderAmount || 70)}
              minOrderAmount={STORE_CONFIG.minOrderAmount || 70}
            />
          </form>
        </div>
      </div>
    </>
  );
};