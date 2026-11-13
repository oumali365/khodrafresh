// ============================================================
// KhodraAICopilotModal.tsx – نافذة المساعد التشغيلي الذكي المستقلة
// خُضرة AI Copilot v2 — متصل بقاعدة بيانات Supabase الحية
// استعلامات لحظية لقراءة المخزون، الطلبات، والمبيعات بسوق بنسودة
// تصميم داكن متناسق بالأخضر الزمردي والتركوازي مع واجهة سريعة الاستجابة
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import {
  sendCopilotChatApi,
  fetchDashboardInsights,
  type DashboardInsightsResponse,
} from '../ai-marketing/aiMarketingClient';
import type { AdminRoute } from '../layout/AdminPageLayout';

export interface KhodraAICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateAdmin?: (route: AdminRoute) => void;
}

const QUICK_SUGGESTIONS = [
  { label: '📦 خصاص المخزون', q: 'واش كاين شي خصاص فالمخزون حالياً؟' },
  { label: '💰 مبيعات اليوم والأسبوع', q: 'عطيني ملخص مبيعات اليوم وهاد الأسبوع مع إجمالي الإيرادات' },
  { label: '🛵 طلبات معلقة pending', q: 'شنو هما الطلبات اللي باقين pending وبحاجة متابعة فورية؟' },
];

export const KhodraAICopilotModal: React.FC<KhodraAICopilotModalProps> = ({
  isOpen,
  onClose,
  onNavigateAdmin,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(null);
  const [dismissAlert, setDismissAlert] = useState(false);

  const [chatMessages, setChatMessages] = useState<
    {
      role: 'user' | 'assistant';
      text: string;
      actions?: { label: string; actionType: string; payload?: any }[];
      dataContext?: string;
      toolsExecuted?: {
        toolName: string;
        source: string;
        summary: string;
        isRealData: boolean;
        data?: any;
      }[];
      isRealData?: boolean;
      metadata?: any;
    }[]
  >([
    {
      role: 'assistant',
      text: `مرحباً بك سيدي المدير في Khodra AI Copilot v2 🌿

أنا مساعدك التشغيلي المتصل مباشرة بقاعدة بيانات Supabase لمتجر خُضرة فاس، في وضع القراءة فقط الآمن (Read-Only).

يمكنك الاستفسار عن المخزون اللحظي، المبيعات اليومية، حالة الطلبات المعلقة، أو اقتراحات الترويج بسوق بنسودة.`,
      actions: [
        { label: '📦 خصاص المخزون', actionType: 'query', payload: 'واش كاين شي خصاص فالمخزون حالياً؟' },
        { label: '💰 مبيعات اليوم والأسبوع', actionType: 'query', payload: 'عطيني ملخص مبيعات اليوم وهاد الأسبوع مع إجمالي الإيرادات' },
        { label: '🛵 طلبات pending', actionType: 'query', payload: 'شنو هما الطلبات اللي باقين pending وبحاجة متابعة فورية؟' },
      ],
      dataContext: 'جاهز للاستعلام التشغيلي • خُضرة فاس',
      isRealData: false,
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [expandedToolIndex, setExpandedToolIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // قفل التمرير بالخلفية عند فتح المودال
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // إغلاق عبر مفتاح Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // جلب الرؤى الذكية اللحظية عند الفتح
  useEffect(() => {
    if (isOpen && !insights) {
      fetchDashboardInsights()
        .then((data) => setInsights(data))
        .catch(() => {});
    }
  }, [isOpen, insights]);

  // التمرير التلقائي لأسفل عند وصول رسالة جديدة
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading, isOpen]);

  // التركيز على حقل الإدخال عند الفتح
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendChat = async (textToSend?: string) => {
    const query = (textToSend || chatInput).trim();
    if (!query || isChatLoading) return;

    const newHistory = [
      ...chatMessages.slice(-6).map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      })),
    ];

    setChatMessages((prev) => [...prev, { role: 'user', text: query }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await sendCopilotChatApi(query, newHistory);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply,
          actions: res.suggestedActions,
          dataContext: res.dataContext,
          toolsExecuted: res.toolsExecuted,
          isRealData: res.isRealData,
          metadata: res.metadata,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'تعذر الاتصال بالخادم مؤقتاً، يرجى المحاولة بعد قليل أو فحص البيانات مباشرة في اللوحة المعنية.',
          actions: [
            { label: '📦 فحص المخزون الحالي', actionType: 'view_inventory' },
            { label: '🛵 فحص الطلبات الواردة', actionType: 'view_orders' },
          ],
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleActionClick = (action: { label: string; actionType: string; payload?: any }) => {
    if (action.actionType === 'query' && action.payload) {
      handleSendChat(action.payload);
    } else if (action.actionType === 'view_orders') {
      onClose();
      if (onNavigateAdmin) {
        onNavigateAdmin('orders');
      } else {
        window.history.pushState({ admin: 'orders' }, '', '/admin/orders');
        window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'orders' }));
      }
    } else if (action.actionType === 'view_inventory' || action.actionType === 'open_inventory') {
      onClose();
      if (onNavigateAdmin) {
        onNavigateAdmin('inventory');
      } else {
        window.history.pushState({ admin: 'inventory' }, '', '/admin/inventory');
        window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'inventory' }));
      }
    } else if (action.actionType === 'view_pricing') {
      onClose();
      if (onNavigateAdmin) {
        onNavigateAdmin('pricing');
      } else {
        window.history.pushState({ admin: 'pricing' }, '', '/admin/pricing');
        window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'pricing' }));
      }
    } else if (action.actionType === 'switch_publisher' || action.actionType === 'use_template') {
      onClose();
      if (onNavigateAdmin) {
        onNavigateAdmin('marketing');
      } else {
        window.history.pushState({ admin: 'marketing' }, '', '/admin/marketing');
        window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'marketing' }));
      }
    }
  };

  // انتقاء التنبيه الأهم فقط
  const topAlert =
    !dismissAlert && insights?.insights?.length
      ? insights.insights.find((i) => i.type === 'warning') || insights.insights[0]
      : null;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="خُضرة AI Copilot"
      dir="rtl"
    >
      {/* خلفية معتمة مع ضبابية خفيفة */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* نافذة المودال المستقلة */}
      <div
        className={`relative bg-[#090D10] text-stone-100 w-full ${
          isMaximized
            ? 'h-[96vh] max-w-[98vw] rounded-2xl'
            : 'max-w-3xl h-[88vh] max-h-[820px] rounded-2xl sm:rounded-3xl'
        } border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden transition-all duration-200 z-10`}
      >
        {/* ═══════ 1. رأس النافذة المختصر والمرتب ═══════ */}
        <header className="px-3.5 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-l from-[#042d2a] via-[#073631] to-[#041d1a] border-b border-cyan-500/40 text-white flex items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-teal-500/10 border border-cyan-400/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-sm sm:text-base text-white tracking-tight font-['Almarai'] truncate">
                  خُضرة AI Copilot v2
                </h2>

                {/* شارة وضع القراءة فقط المحمي */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  وضع القراءة فقط الآمن
                </span>
              </div>
              <p className="text-[11px] text-cyan-100/70 truncate mt-0.5 font-medium hidden xs:block">
                المساعد التشغيلي الذكي لمتجر خُضرة فاس
              </p>
            </div>
          </div>

          {/* أزرار التحكم بالنافذة (تكبير + إغلاق) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isMaximized ? 'استعادة الحجم' : 'تكبير النافذة'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/50 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="إغلاق النافذة"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ═══════ 2. القسم الأوسط: أهم تنبيه (عند الحاجة) + 3 اقتراحات سريعة تلتف بـ flex-wrap ═══════ */}
        <div className="bg-[#0b171c]/95 border-b border-cyan-900/40 p-2.5 sm:p-3 space-y-2 shrink-0">
          {/* إظهار أهم تنبيه فقط عند توفره */}
          {topAlert && (
            <div
              className={`flex items-center justify-between gap-2 p-2 rounded-xl text-xs border ${
                topAlert.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div
                className="flex items-center gap-1.5 min-w-0 flex-1 cursor-default"
                title={`${topAlert.title}: ${topAlert.description}`}
              >
                {topAlert.type === 'warning' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="font-bold shrink-0">{topAlert.title}:</span>
                <span className="text-[11px] opacity-90 truncate">{topAlert.description}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSendChat(topAlert.description)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                    topAlert.type === 'warning'
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/30'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/30'
                  }`}
                >
                  فحص الآن
                </button>
                <button
                  type="button"
                  onClick={() => setDismissAlert(true)}
                  className="text-stone-400 hover:text-white p-0.5 cursor-pointer"
                  title="إغلاق التنبيه"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* 3 اقتراحات سريعة تلتف بتلقائية بـ flex-wrap دون أي تمرير أفقي */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-bold text-cyan-300/80 flex items-center gap-1 shrink-0">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>اقتراحات سريعة:</span>
            </span>
            {QUICK_SUGGESTIONS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isChatLoading}
                onClick={() => handleSendChat(chip.q)}
                className="px-2.5 py-1 rounded-xl bg-[#122429] hover:bg-[#1a3840] text-cyan-100 hover:text-white border border-cyan-600/40 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 active:scale-95 shadow-xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════ 3. سجل المحادثة: هو وحده القابل للتمرير العمودي ═══════ */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5 text-xs sm:text-sm select-text">
          {chatMessages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={i}
                className={`flex gap-2 sm:gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/30 border border-cyan-400/40 flex items-center justify-center shrink-0 text-cyan-300 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3 sm:p-3.5 leading-relaxed shadow-sm break-words ${
                    isUser
                      ? 'bg-gradient-to-l from-emerald-800 to-green-900 text-white rounded-br-xs border border-emerald-600/40'
                      : 'bg-[#101b20] text-stone-100 rounded-bl-xs border border-cyan-800/40'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed font-sans">{msg.text}</p>

                  {/* سياق البيانات */}
                  {msg.dataContext && (
                    <div className="mt-2 pt-1.5 border-t border-cyan-900/40 flex items-center gap-1.5 text-[10px] text-cyan-300/80 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span className="truncate">{msg.dataContext}</span>
                    </div>
                  )}

                  {/* الأدوات المنفذة لقراءة البيانات الحية */}
                  {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-cyan-900/40 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold">
                        <span className="flex items-center gap-1 text-cyan-300">
                          <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>الأدوات المنفذة ({msg.toolsExecuted.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedToolIndex(expandedToolIndex === i ? null : i)}
                          className="text-cyan-400 hover:text-cyan-200 cursor-pointer flex items-center gap-0.5"
                        >
                          <span>{expandedToolIndex === i ? 'إخفاء' : 'تفاصيل'}</span>
                          {expandedToolIndex === i ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {expandedToolIndex === i && (
                        <div className="space-y-1 pt-1">
                          {msg.toolsExecuted.map((tool, tIdx) => (
                            <div
                              key={tIdx}
                              className="bg-[#081215] p-2 rounded-xl border border-cyan-900/50 text-[10px] font-mono text-cyan-200 break-words"
                            >
                              <div className="flex items-center justify-between font-bold text-white flex-wrap gap-1">
                                <span>🛠️ {tool.toolName}</span>
                                {tool.isRealData ? (
                                  <span className="text-emerald-400">بيانات Supabase حية ✓</span>
                                ) : tool.source === 'store_config' ? (
                                  <span className="text-cyan-400">إعدادات المتجر ⚙️</span>
                                ) : (
                                  <span className="text-amber-400">غير متوفر / خالٍ ⚠️</span>
                                )}
                              </div>
                              <p className="text-stone-300 mt-0.5">{tool.summary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* قيود وحدود المخطط والبيانات إن وجدت */}
                  {msg.metadata?.limitations && msg.metadata.limitations.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-amber-900/40 text-[10px] text-amber-300 font-mono space-y-1 bg-amber-950/20 p-2 rounded-xl">
                      <div className="font-bold flex items-center gap-1 text-amber-400">
                        <span>⚠️ قيود وحدود التحليل:</span>
                      </div>
                      {msg.metadata.limitations.map((lim: string, lIdx: number) => (
                        <p key={lIdx} className="text-amber-200/90 leading-tight">
                          • {lim}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* الإجراءات المقترحة بنقرة واحدة بتنسيق flex-wrap */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-cyan-900/40 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          onClick={() => handleActionClick(act)}
                          className="px-2.5 py-1 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 hover:text-white border border-cyan-600/50 text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* مؤشر التحميل */}
          {isChatLoading && (
            <div className="flex gap-2 sm:gap-2.5 justify-start">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center shrink-0 text-cyan-300 animate-pulse mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#101b20] text-cyan-300 rounded-2xl rounded-bl-xs p-3 border border-cyan-800/40 text-xs flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>جارٍ فحص بيانات Supabase والإجابة بدقة...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ═══════ 4. حقل الإدخال الثابت في أسفل النافذة ═══════ */}
        <div className="p-2.5 sm:p-3.5 bg-[#081215] border-t border-cyan-900/60 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="اسأل عن المخزون، المبيعات، الطلبات، أو خطط التسويق..."
              disabled={isChatLoading}
              className="flex-1 bg-[#101b20] border-2 border-cyan-900/60 focus:border-cyan-400 rounded-xl sm:rounded-2xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 outline-none transition-all disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={isChatLoading || !chatInput.trim()}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-l from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">إرسال</span>
            </button>
          </form>

          {/* شريط الإحصاء والتحكم السفلي المقتضب */}
          <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-[10px] text-stone-400 px-1">
            <span className="flex items-center gap-1 text-emerald-400/90 font-medium truncate">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>وضع القراءة فقط الآمن (Read-Only)</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setChatMessages((prev) => [prev[0]]);
              }}
              className="hover:text-stone-200 cursor-pointer flex items-center gap-1 shrink-0"
              title="مسح سجل المحادثة والبدء من جديد"
            >
              <RotateCcw className="w-3 h-3" />
              <span>مسح المحادثة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
