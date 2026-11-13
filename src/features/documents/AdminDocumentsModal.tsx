// ============================================================
// AdminDocumentsModal.tsx – مركز وثائق المشروع والعقود التشغيلية (PDF A4)
// يجمع ملفات التمويل والاحتضان (Pitch Deck, Business Plan, Financial Study)
// والعقود القانونية الرسمية لشركة خُضرة (SARL) بروابط مخصصة جاهزة للطباعة A4
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Bike,
  Building2,
  Handshake,
  Sparkles,
  FolderKanban,
  Cpu,
  Code,
} from 'lucide-react';

export interface AdminDocumentsModalProps {
  isOpen?: boolean;
  standalone?: boolean;
  onClose?: () => void;
}

interface DocItem {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  badge: string;
  buttonLabel: string;
  accent: 'emerald' | 'amber' | 'orange' | 'blue';
  Icon: React.FC<{ className?: string }>;
}

const TECH_ARCHITECTURE_DOC: DocItem = {
  id: 'system-architecture',
  code: '05_System_Architecture',
  title: 'الدليل التقني الشامل وهندسة الآليات (PDF)',
  subtitle: 'دليل شامل لهندسة النظام ووحدات الإدارة وقواعد البيانات',
  description:
    'دليل تقني مستقل يشرح بنية المشروع وهندسته المعمارية، وحدات إدارة المتجر (الطلبات، التوصيل، المالية، العقود، التسويق، التسعير JIT)، دورة حياة الطلبات، التقنيات المستخدمة (React 19 + Supabase + PWA + GPS)، وإرشادات مستقبلية.',
  url: '/docs/system-architecture.html',
  badge: 'دليل تقني • PDF',
  buttonLabel: 'فتح وطباعة الدليل التقني (PDF)',
  accent: 'emerald',
  Icon: Cpu,
};

const PROJECT_DOCS: DocItem[] = [
  {
    id: 'pitch-deck',
    code: '01_Pitch_Deck',
    title: 'العرض التقديمي للمستثمرين (Pitch Deck — A4)',
    subtitle: 'موجه للجان Technopark Fès • Tamwilcom • INDH',
    description:
      'ملخص تنفيذي في 6 شرائح مركزة يعرض المشكلة والحل، الجاهزية التقنية الكاملة للمنصة (MVP)، حجم سوق فاس، والاحتياج التمويلي.',
    url: '/docs/pitch-deck.html',
    badge: 'وثيقة 01 • PDF',
    buttonLabel: 'فتح وطباعة العرض التقديمي (PDF)',
    accent: 'amber',
    Icon: Sparkles,
  },
  {
    id: 'business-plan',
    code: '02_Business_Plan',
    title: 'خطة العمل والدراسة التقنية والتشغيلية (A4)',
    subtitle: 'Étude Technique MVP + خطة التوصيل وتجميع المسارات بفاس',
    description:
      'توثيق البنية المعمارية (React 19 + PWA + Supabase + 6 طبقات أمان + خرائط GPS)، الدورة اليومية من بنسودة، مؤشرات الأداء KPIs، وإطار شركة SARL.',
    url: '/docs/business-plan.html',
    badge: 'وثيقة 02 • PDF',
    buttonLabel: 'فتح وطباعة خطة العمل (PDF)',
    accent: 'emerald',
    Icon: Briefcase,
  },
  {
    id: 'financial-study',
    code: '03_Financial_Study',
    title: 'الدراسة المالية الموحدة وميزانية التجهيز (A4)',
    subtitle: 'ميزانية الاستثمار (12K / 100K د.م) + توقعات 12 شهراً و3 سنوات',
    description:
      'جدول استثماري متكامل، حساب نقطة التعادل واقتصاديات الطلب الواحد، وجدول التدفقات النقدية الشهري للسنة الأولى والآفاق الثلاثية.',
    url: '/docs/financial-study.html',
    badge: 'وثيقة 03 • PDF',
    buttonLabel: 'فتح وطباعة الدراسة المالية (PDF)',
    accent: 'orange',
    Icon: TrendingUp,
  },
];

const LEGAL_CONTRACTS: DocItem[] = [
  {
    id: 'driver-contract',
    code: 'KH-DRV-A4',
    title: 'عقد شراكة سائق التوصيل (نموذج رسمي A4)',
    subtitle: 'شركة خُضرة للتجارة الإلكترونية (SARL) — فاس',
    description:
      'طباعة أو حفظ عقد الشراكة المعتمد لسائقي التوصيل بفاس بصيغة PDF جاهز للتوقيع والمصادقة (شامل التزامات الصندوق العازل وتحصيل مبالغ COD).',
    url: '/docs/driver-contract.html',
    badge: 'عقد تشغيلي • PDF',
    buttonLabel: 'طباعة عقد السائق (PDF)',
    accent: 'emerald',
    Icon: Bike,
  },
  {
    id: 'b2b-contract',
    code: 'KH-B2B-A4',
    title: 'عقد توريد بالجملة للمطاعم والفنادق (B2B — نموذج رسمي)',
    subtitle: 'توريد دوري للخضر والفواكه الطازجة للمؤسسات بفاس',
    description:
      'صيغة تعاقدية رسمية باسم شركة خُضرة (SARL) لتزويد المطاعم، الفنادق، المقاهي، والمصحات بالمنتجات الطازجة مع جدول الكميات والفوترة.',
    url: '/docs/b2b-contract.html',
    badge: 'عقد B2B • A4 PDF',
    buttonLabel: 'طباعة عقد التوريد B2B (PDF)',
    accent: 'amber',
    Icon: Building2,
  },
  {
    id: 'partner-contract',
    code: 'KH-PTR-A4',
    title: 'عقد شراكة واستثمار تجاري (SARL — نموذج رسمي A4)',
    subtitle: 'اتفاقية توزيع الحصص الاجتماعية والحكامة للمستثمرين',
    description:
      'ينظم علاقة الشريك المؤسس (حامل المنصة التقنية والإدارة) مع الشريك المستثمر، نسب الحصص الاجتماعية (Parts Sociales)، وتوزيع الأرباح.',
    url: '/docs/partner-contract.html',
    badge: 'عقد شراكة • PDF',
    buttonLabel: 'طباعة عقد الشراكة (PDF)',
    accent: 'blue',
    Icon: Handshake,
  },
];

export const AdminDocumentsModal: React.FC<AdminDocumentsModalProps> = ({
  isOpen = false,
  standalone = false,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (standalone) return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, standalone]);

  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen && !standalone) return null;

  const handleCopyUrl = async (id: string, path: string) => {
    try {
      const fullUrl = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  const panelContent = (
    <div className={`relative bg-[#FAF8F4] w-full ${
      standalone
        ? 'max-w-7xl mx-auto shadow-md rounded-3xl min-h-[700px]'
        : 'sm:max-w-5xl shadow-2xl sm:rounded-3xl max-h-screen sm:max-h-[94vh]'
    } flex flex-col overflow-hidden text-right border-2 border-[#E8E1D3]`}>
        {/* ═══════ الرأس ═══════ */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#1A3D24] via-[#2D6A3F] to-[#163920] text-white flex items-center justify-between gap-3 shrink-0 shadow-md border-b-2 border-[#EAB308]/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-[#EAB308]/40 flex items-center justify-center shadow-inner shrink-0">
              <FolderKanban className="w-6 h-6 text-[#F5D76E]" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg flex items-center gap-2">
                <span>مركز وثائق المشروع والعقود الرسمية (A4 PDF)</span>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] bg-[#EAB308]/20 text-[#FEF08A] border border-[#EAB308]/40 font-black">
                  SARL • جاهز للطباعة
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 font-semibold mt-0.5">
                ملفات التمويل والاحتضان (Technopark / Tamwilcom / INDH) والعقود التشغيلية بصيغة A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.open('/docs/system-architecture.html', '_blank')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-900 text-[#FEF08A] text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 border border-[#EAB308]/40"
              title="طباعة الدليل التقني الشامل وهندسة المنصة (A4 PDF)"
            >
              <Cpu className="w-4 h-4 text-[#F5D76E]" />
              <span>الدليل التقني المستقل (A4)</span>
            </button>
            <button
              type="button"
              onClick={() => window.open('/docs/funding-dossier.html', '_blank')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 border border-[#F5D76E]/30"
              title="طباعة الملف الموحد الكامل في 3 صفحات A4"
            >
              <Printer className="w-4 h-4 text-[#FEF08A]" />
              <span>طباعة الملف الشامل (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ═══════ المحتوى القابل للتمرير ═══════ */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* ⚠️ تم حذف بطاقة الدليل التقني المكررة من هنا ⚠️ */}

          {/* بطاقة الملف الشامل الموحد (Hero Banner) */}
          <div className="bg-gradient-to-l from-[#FEF3C7] via-[#FFFBEB] to-white border-2 border-[#EAB308]/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#1A3D24] text-[#F5D76E] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-[#1A3D24]">
                    الملف الشامل الموحّد للتمويل والاحتضان (3 صفحات A4 متكاملة)
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#1A3D24] text-[#FEF08A]">
                    موصى به للجان التمويل
                  </span>
                </div>
                <p className="text-xs text-[#524B3E] font-semibold mt-1 leading-relaxed">
                  يجمع العرض التقديمي + الدراسة التقنية للمنصة + خطة التشغيل بفاس + الدراسة المالية وميزانية 100,000 د.م في ملف PDF واحد منسق.
                </p>
                <div className="text-[11px] text-[#787163] font-mono mt-1 dir-ltr inline-block">
                  /docs/funding-dossier.html
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => handleCopyUrl('full-dossier', '/docs/funding-dossier.html')}
                className="px-3 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#1A3D24] border border-[#D6D0C4] text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="نسخ الرابط المباشر"
              >
                {copiedId === 'full-dossier' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#5A6B5F]" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => window.open('/docs/funding-dossier.html', '_blank')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-l from-[#EA580C] to-[#C25E12] hover:from-[#F97316] hover:to-[#EA580C] text-white text-xs font-black cursor-pointer shadow-sm transition-all active:scale-95"
              >
                <Printer className="w-4 h-4 text-[#FEF08A]" />
                <span>فتح وطباعة الملف الشامل (PDF)</span>
              </button>
            </div>
          </div>

          {/* ═══════ القسم 1: وثائق المشروع والتمويل (01 - 03) ═══════ */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E1D3]">
              <h3 className="text-sm sm:text-base font-black text-[#1A3D24] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2D6A3F]" />
                <span>أولاً: وثائق دراسة المشروع والتمويل (مجلد documents)</span>
              </h3>
              <span className="text-[11px] font-bold text-[#5A6B5F]">
                روابط مخصصة جاهزة للطباعة A4
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {PROJECT_DOCS.map((doc) => {
                const IconComp = doc.Icon;
                const isCopied = copiedId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="bg-white border-2 border-[#2D6A3F]/15 hover:border-[#2D6A3F]/45 rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#1A3D24] border border-emerald-200">
                          {doc.badge}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(doc.id, doc.url)}
                          className="text-[11px] font-bold text-[#5A6B5F] hover:text-[#1A3D24] inline-flex items-center gap-1 cursor-pointer"
                          title="نسخ الرابط المخصص"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-black">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرابط</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-start gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-[#163920] text-[#F5D76E] flex items-center justify-center shrink-0 mt-0.5">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-[#112616] leading-snug">
                            {doc.title}
                          </h4>
                          <p className="text-[11px] font-bold text-[#EA580C] mt-0.5">
                            {doc.subtitle}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#524B3E] leading-relaxed mb-3 font-medium">
                        {doc.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.open(doc.url, '_blank')}
                        className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#163920] hover:bg-[#0E2615] text-white text-xs font-black cursor-pointer shadow-xs transition-all active:scale-95"
                      >
                        <Printer className="w-4 h-4 text-[#F5D76E]" />
                        <span>{doc.buttonLabel}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════ القسم 2: العقود التشغيلية والقانونية (من ضمنها عقد السائق المنقول) ═══════ */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E1D3]">
              <h3 className="text-sm sm:text-base font-black text-[#1A3D24] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                <span>ثانياً: العقود التشغيلية والقانونية المعتمدة (شركة خُضرة SARL — A4)</span>
              </h3>
              <span className="text-[11px] font-bold text-[#5A6B5F]">
                جاهزة للطباعة والتوقيع والمصادقة
              </span>
            </div>

            <div className="space-y-3">
              {LEGAL_CONTRACTS.map((contract) => {
                const IconComp = contract.Icon;
                const isCopied = copiedId === contract.id;
                const isDriver = contract.id === 'driver-contract';

                return (
                  <div
                    key={contract.id}
                    className={`rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-xs transition-all ${
                      isDriver
                        ? 'bg-gradient-to-l from-emerald-50 to-white border-2 border-emerald-300/90'
                        : 'bg-white border-2 border-[#E8E1D3] hover:border-[#2D6A3F]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#163920] text-[#F5D76E] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-[#112616]">
                            {contract.title}
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#163920]/10 text-[#163920]">
                            {contract.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#524B3E] mt-1 leading-relaxed font-medium">
                          {contract.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(contract.id, contract.url)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-[#1A3D24] border border-stone-300 text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        title="نسخ رابط العقد"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#5A6B5F]" />
                            <span>الرابط</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => window.open(contract.url, '_blank')}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#163920] hover:bg-[#0E2615] text-white text-xs font-black cursor-pointer shadow-xs transition-all active:scale-95"
                      >
                        <Printer className="w-4 h-4 text-[#F5D76E]" />
                        <span>{contract.buttonLabel}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════ القسم 3: الدليل التقني والهندسي المستقل للمنصة ═══════ */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E1D3]">
              <h3 className="text-sm sm:text-base font-black text-[#1A3D24] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#16A34A]" />
                <span>ثالثاً: الدليل التقني والهندسي المستقل للمنصة (خاص بالمالك وفريق التطوير)</span>
              </h3>
              <span className="text-[11px] font-bold text-[#5A6B5F]">
                مستقل تماماً عن التمويل والعقود • A4 PDF
              </span>
            </div>

            <div className="bg-white border-2 border-emerald-600/30 hover:border-emerald-600/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-all">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#1A3D24] text-[#F5D76E] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Code className="w-5 h-5 text-[#F5D76E]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {TECH_ARCHITECTURE_DOC.badge}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 font-bold">
                      {TECH_ARCHITECTURE_DOC.code}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-[#112616] leading-snug">
                    {TECH_ARCHITECTURE_DOC.title}
                  </h4>
                  <p className="text-[11px] font-bold text-[#EA580C] mt-0.5">
                    {TECH_ARCHITECTURE_DOC.subtitle}
                  </p>
                  <p className="text-xs text-[#524B3E] mt-1.5 leading-relaxed font-medium max-w-3xl">
                    {TECH_ARCHITECTURE_DOC.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(TECH_ARCHITECTURE_DOC.id, TECH_ARCHITECTURE_DOC.url)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-[#1A3D24] border border-stone-300 text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="نسخ الرابط المباشر"
                >
                  {copiedId === TECH_ARCHITECTURE_DOC.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#5A6B5F]" />
                      <span>الرابط</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(TECH_ARCHITECTURE_DOC.url, '_blank')}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A3D24] hover:bg-[#122A1A] text-white text-xs font-black cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4 text-[#F5D76E]" />
                  <span>{TECH_ARCHITECTURE_DOC.buttonLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );

  if (standalone) {
    return (
      <div className="w-full space-y-4">
        {panelContent}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="وثائق المشروع والعقود التشغيلية"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      {panelContent}
    </div>
  );
};