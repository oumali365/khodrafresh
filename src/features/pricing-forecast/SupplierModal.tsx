// ============================================================
// src/features/pricing-forecast/SupplierModal.tsx
// نافذة إدارة الموردين - تصميم عصري واحترافي لمتجر "خُضرة"
// ============================================================

import React, { useState } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Star,
  Phone,
  Check,
  Building2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Supplier } from './types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Partial<Supplier> & { name: string }) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  onSaveSupplier,
  onDeleteSupplier,
}) => {
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setSpecialty('خضار أساسية (سوق بنسودة)');
    setRating(5);
    setNotes('');
    setErrorMessage(null);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setPhone(sup.phone);
    setSpecialty(sup.specialty);
    setRating(sup.rating || 5);
    setNotes(sup.notes || '');
    setErrorMessage(null);
    setIsCreatingNew(true);
  };

  const handleCancelForm = () => {
    setIsCreatingNew(false);
    setEditingSupplier(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('يرجى إدخال اسم المورد أو التعاونية');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSaveSupplier({
        id: editingSupplier ? editingSupplier.id : undefined,
        name: name.trim(),
        phone: phone.trim(),
        specialty: specialty.trim(),
        rating,
        notes: notes.trim(),
        is_active: true,
      });
      setIsCreatingNew(false);
      setEditingSupplier(null);
    } catch {
      setErrorMessage('تعذر حفظ بيانات المورد، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, supName: string) => {
    if (confirm(`هل أنت متأكد من حذف المورد "${supName}"؟`)) {
      await onDeleteSupplier(id);
      if (editingSupplier?.id === id) {
        setIsCreatingNew(false);
        setEditingSupplier(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden text-right flex flex-col max-h-[92vh]">
        {/* الترويسة العلوية الأنيقة */}
        <div className="p-5 sm:p-6 bg-gradient-to-l from-[#163920] to-[#122F1B] text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-[#F5D76E] shadow-2xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg font-['Almarai'] text-white">
                إدارة موردي سوق الجملة (بنسودة / فاس)
              </h3>
              <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                تسجيل شركاء التوريد، أجنحة السوق، وتقييم جودة السلع
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white cursor-pointer transition-all active:scale-95"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* جسم النافذة */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* شريط الإجراء العلوي */}
          {!isCreatingNew && (
            <div className="flex items-center justify-between bg-[#FAFAF9] p-3.5 sm:p-4 rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="font-bold text-stone-700 text-xs sm:text-sm">
                الموردون المسجلون: <strong className="text-[#163920] font-black">{suppliers.length}</strong>
              </span>
              <button
                type="button"
                onClick={handleStartCreate}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-gradient-to-l from-[#163920] to-[#2D6A3F] hover:from-[#0E2615] hover:to-[#225330] text-white font-black text-xs inline-flex items-center gap-2 shadow-2xs active:scale-97 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 text-[#F5D76E]" />
                <span>إضافة مورد جديد</span>
              </button>
            </div>
          )}

          {/* نموذج إضافة / تعديل المورد */}
          {isCreatingNew && (
            <form onSubmit={handleSubmit} className="bg-emerald-50/40 p-5 rounded-3xl border border-emerald-300/70 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/70">
                <h4 className="font-black text-sm text-[#163920] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#163920]" />
                  <span>{editingSupplier ? `تعديل بيانات: ${editingSupplier.name}` : 'إضافة مورد جديد'}</span>
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-stone-500 hover:text-stone-800 text-xs font-bold cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 text-xs font-bold flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    اسم المورد أو التعاونية: *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: الحاج المفضل بنجلون"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-200 bg-white text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#163920] focus:border-[#163920]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    رقم الهاتف / الواتساب:
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06XXXXXXXX"
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-200 bg-white text-stone-900 font-mono text-left font-bold focus:outline-none focus:ring-2 focus:ring-[#163920] focus:border-[#163920]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    التخصص ومنطقة التوريد:
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="مثال: خضر ورقية، بطاطس وبصل، فواكه موسمية"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-200 bg-white text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#163920] focus:border-[#163920]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    تقييم الجودة والموثوقية:
                  </label>
                  <div className="flex items-center gap-2 min-h-[44px] px-3.5 bg-white rounded-2xl border border-stone-200">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="cursor-pointer transition-transform hover:scale-115 p-1"
                        title={`${star} نجوم`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="mr-2 font-black text-amber-800 text-xs">
                      {rating} / 5 نجوم
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ملاحظات وموقع الجناح في سوق بنسودة:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: جناح البطاطس رقم 14، توريد فجر الإثنين والخميس..."
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#163920] focus:border-[#163920]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-emerald-200/70">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="min-h-[44px] px-4 py-2 rounded-2xl border border-stone-200 text-stone-700 hover:bg-stone-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 py-2 rounded-2xl bg-gradient-to-l from-[#163920] to-[#2D6A3F] hover:from-[#0E2615] hover:to-[#225330] text-white font-black inline-flex items-center gap-2 shadow-2xs active:scale-97 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 text-[#F5D76E]" />
                  <span>{editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ═══════ بطاقات الموردين: grid-cols-2 ═══════ */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-stone-800 flex items-center gap-1.5">
              <span>قائمة الموردين المعتمدين</span>
              <span className="text-[11px] text-stone-400 font-normal">({suppliers.length} مورد)</span>
            </h4>

            {suppliers.length === 0 ? (
              <div className="p-10 text-center text-stone-500 bg-[#FAFAF9] rounded-3xl border border-dashed border-stone-300">
                لا يوجد موردون مسجلون حالياً. انقر على "إضافة مورد جديد" لإضافة أول شريك توريد.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {suppliers.map((sup) => (
                  <div
                    key={sup.id}
                    className="p-4 rounded-3xl bg-white border border-stone-200/90 hover:border-[#163920]/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-3 text-right"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-black text-sm text-stone-900">{sup.name}</h5>
                          <p className="text-xs text-stone-500 font-medium mt-0.5">{sup.specialty}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 bg-amber-50 px-2 py-0.5 rounded-xl border border-amber-200/60">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-black text-amber-800 tabular-nums">{sup.rating}</span>
                        </div>
                      </div>

                      {sup.notes && (
                        <p className="text-[11px] text-stone-500 mt-2 line-clamp-2 italic bg-[#FAFAF9] p-2 rounded-xl border border-stone-100">
                          {sup.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                      {sup.phone ? (
                        <a
                          href={`tel:${sup.phone}`}
                          className="min-h-[38px] inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#163920] hover:text-emerald-700"
                          dir="ltr"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#163920]" />
                          <span>{sup.phone}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-stone-400">بدون هاتف</span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(sup)}
                          className="min-h-[38px] min-w-[38px] rounded-xl text-stone-600 hover:text-[#163920] hover:bg-stone-100 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sup.id, sup.name)}
                          className="min-h-[38px] min-w-[38px] rounded-xl text-stone-400 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* تذييل النافذة */}
        <div className="p-4 sm:p-5 bg-[#FAFAF9] border-t border-stone-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-stone-500 font-medium">
            يتم ربط الموردين مباشرة بجدول تسعير سوق بنسودة اليومي.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-2xl bg-[#163920] hover:bg-[#0E2615] text-white font-bold cursor-pointer transition-all active:scale-97 shadow-2xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
