// ============================================================
// src/features/ai-marketing/AIMarketingCenter.tsx
// مركز التسويق والنشر الذكي المتكامل — خُضرة فاس
// يدمج مميزات النشر بنقرة واحدة (1-Click) عبر شبكات التواصل،
// قوالب سوق بنسودة السبعة، معاينة الهاتف الذكي الحية،
// والمساعد الذكي AI Marketing Copilot الموثوق محلياً وسحابياً
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Share2,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Send,
  Smartphone,
  Tag,
  MapPin,
  RefreshCw,
  Eye,
  Edit3,
  Calendar,
  Clock,
  TrendingUp,
  Settings,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  ShoppingBag,
  Megaphone,
  Layers,
  FileText,
  ShieldCheck,
  Lightbulb,
  X,
} from 'lucide-react';
import { STORE_CONFIG } from '../../data/config';
import { fetchProducts } from '../../services/supabaseService';
import { Product } from '../../types';
import {
  fetchDashboardInsights,
  analyzeTemplateApi,
  generateIdeasApi,
  generateCampaignApi,
  sendCopilotChatApi,
  submitPublishQueueApi,
  fetchPublishQueueApi,
  type DashboardInsightsResponse,
  type CopilotChatResponse,
  type PublishQueueItem,
} from './aiMarketingClient';
import type {
  TemplateAnalysisResult,
  MarketingIdea,
  GeneratedCampaign,
} from '../../server/aiMarketingService';

/* ═══════════════════════════════════════════════════════════
   1) القوالب التسويقية السبعة المعتمدة لمتجر خُضرة فاس
   ═══════════════════════════════════════════════════════════ */

export type MarketingTemplateId =
  | 'fresh_morning'
  | 'family_boxes'
  | 'weekend_deals'
  | 'moroccan_tagine'
  | 'b2b_restaurants'
  | 'whatsapp_status'
  | 'free_delivery';

interface MarketingTemplateMeta {
  id: MarketingTemplateId;
  emoji: string;
  title: string;
  badge: string;
  description: string;
}

const TEMPLATES_META: MarketingTemplateMeta[] = [
  {
    id: 'fresh_morning',
    emoji: '🌅',
    title: 'طراوة الصباح وسوق بنسودة',
    badge: 'الأكثر استخداماً',
    description: 'إعلان وصول خضر وفواكه الصباح مقطوعة اليوم مع تأكيد التوصيل السريع لباب المنزل.',
  },
  {
    id: 'family_boxes',
    emoji: '📦',
    title: 'صناديق العائلة التوفيرية',
    badge: 'توفير أسبوعي',
    description: 'ترويج باقات الأسبوع (صندوق الأسرة الاقتصادي، الفواكه الطازجة، صندوق الطبخ المغربي).',
  },
  {
    id: 'weekend_deals',
    emoji: '⚡',
    title: 'عروض نهاية الأسبوع والجمعة',
    badge: 'عروض خاصة',
    description: 'تخفيضات نهاية الأسبوع وجمعة مباركة مع هدايا التوصيل وخضار الكسكس الطازجة.',
  },
  {
    id: 'moroccan_tagine',
    emoji: '🍲',
    title: 'باقة الطاجين والكسكس المغربي',
    badge: 'تقليدي أصيل',
    description: 'تشكيلة متكاملة لوجبة الطاجين الفاسي وخضار الكسكس السبعة مع القزبر والمعدنوس البلدي.',
  },
  {
    id: 'b2b_restaurants',
    emoji: '🏢',
    title: 'عروض المطاعم والمقاهي B2B',
    badge: 'أسعار الجملة',
    description: 'عرض موجه لأصحاب المطاعم، الفنادق، وسناك فاس بتوريد يومي وفاتورة رسمية.',
  },
  {
    id: 'whatsapp_status',
    emoji: '📱',
    title: 'حالة واتساب سريعة (Status/Story)',
    badge: 'مختصر ومباشر',
    description: 'نص قصير منسق بنقاط محددة ملائم لنشره مباشرة في حالات واتساب وإنستغرام ستوري.',
  },
  {
    id: 'free_delivery',
    emoji: '🚴',
    title: 'عرض التوصيل المجاني والسريع',
    badge: 'توصيل مجاني',
    description: 'التركيز على شريط التوصيل المجاني للطلبات فوق 120 درهم وسرعة الوصول لكافة الأحياء.',
  },
];

interface SocialLinks {
  facebook: string;
  instagram: string;
  whatsappGroup: string;
  telegramChannel: string;
  telegramBotToken: string;
  telegramChatId: string;
  tiktok: string;
}

const DEFAULT_LINKS: SocialLinks = {
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  whatsappGroup: `https://wa.me/${STORE_CONFIG.whatsappNumber}`,
  telegramChannel: '',
  telegramBotToken: '',
  telegramChatId: '',
  tiktok: '',
};

function buildTemplateText(
  id: MarketingTemplateId,
  storeUrl: string,
  phone: string,
  priceListSummary?: string,
): string {
  const pricesPart = priceListSummary
    ? `\n\n🥬 أسعار اليوم المعتمدة في المتجر:\n${priceListSummary}\n`
    : '';

  switch (id) {
    case 'fresh_morning':
      return `🌿 طراوة الصباح من سوق الجملة بنسودة لباب دارك بفاس! 🧺☀️

صباح الخير يا أهل فاس! سلعتنا اليوم منتقاة حبة بحبة على الفجر من سوق الجملة بنسودة:
• خضروات طازجة من الحقل مباشرة 🥕🥔🍅
• فواكه موسمية سكرية ونقية 🍊🍎🍌
• باقات الأعشاب والنعناع الفاسي المعطر 🌿
${pricesPart}
🚀 توصيل يومي سريع لباب منزلك في كافة أحياء فاس (طريق إيموزار، الأطلس، النرجس، عين الشقف، المدينة الجديدة).
💰 الدفع عند الاستلام كاش أو تحويل بنكي فوري بعد معاينة الطلب.

📲 للطلب السريع تصفح المتجر الآن:
${storeUrl}

أو راسلنا مباشرة على واتساب:
wa.me/${phone}

#خضرة_فاس #سوق_بنسودة #خضر_طازجة #توصيل_فاس #طراوة_اليوم`;

    case 'family_boxes':
      return `📦 وفّر وقتك وفلوسك مع صناديق خُضرة العائلية الأسبوعية! 👨‍👩‍👧‍👦✨

تعبت من التسوق اليومي؟ جهزنا لك صناديق متكاملة تكفي احتياجات عائلتك طيلة الأسبوع وبأحسن سعر في فاس:

1️⃣ صندوق الأسرة الاقتصادي (خضر أسبوعية أساسية بجودة ممتازة)
2️⃣ صندوق الفواكه الملكي (تشكيلة طازجة للأطفال والضيافة)
3️⃣ صندوق الطاجين المغربي (كل ما يلزم لأشهى طاجين مغربي)
${pricesPart}
🛵 التوصيل لباب العمارة مجاناً للطلبات المؤهلة!
✅ تغليف محكم ونظيف يضمن بقاء الخضر طازجة في الثلاجة.

🛒 اطلب صندوقك المفضل بكبسة زر:
${storeUrl}

📞 للاستفسار أو الطلب عبر الهاتف/واتساب:
wa.me/${phone}

#صناديق_الخضار #خضرة_فاس #توفير_أسبوعي #توصيل_فاس #عائلة_مغربية`;

    case 'weekend_deals':
      return `⚡ جمعة مباركة وعروض نهاية الأسبوع من متجر خُضرة بفاس! 🕌🎉

استعد ليوم الجمعة ونهاية الأسبوع مع أجود الخضار والفواكه الطازجة:
• خضار الكسكس السبعة كاملة ومنعنعة 🥬🥕🎃
• اللفت، القرع، الكورجيت، الحمص، والربيع البلدي
• فواكه ممتازة للتحلية العائلية 🍇🍉🍊
${pricesPart}
🚚 نوصل إليك قبل موعد صلاة الجمعة والغداء العائلي!
💵 الدفع عند التسليم فقط بعد الرضا التام عن السلعة.

📲 احجز طلبيتك الآن قبل نفاد الكمية:
${storeUrl}

واتساب مباشر: wa.me/${phone}

#جمعة_مباركة #كسكس_مغربي #خضرة_فاس #عروض_نهاية_الأسبوع #فاس`;

    case 'moroccan_tagine':
      return `🍲 سر الطاجين الفاسي المعتبر في الخضار البلدية الطرية! 🇲🇦✨

طاجين الخضار باللحم أو الدجاج كيحتاج خضرة بلدية مقطوعة جديدة:
• بطاطس كطيب زبدة وطماطم حمراء معسلة 🍅🥔
• جزر بلدي طري، جلبانة، ولوبيا خضراء 🥕
• بصل أحمر منقى وربيع مخلط طازج من بنسودة 🧅
${pricesPart}
🛵 طلبك يوصل لباب منزلك معبأ بعناية في أقل وقت ممكن في مدينة فاس.

🛒 تصفح سلة الطاجين واطلب الآن:
${storeUrl}

واتساب للطلبات السريعة: wa.me/${phone}

#طاجين_مغربي #خضار_بلدية #خضرة_فاس #أكلات_مغربية #توصيل_فاس`;

    case 'b2b_restaurants':
      return `🏢 لأصحاب المطاعم، المقاهي، والسناكات بمدينة فاس 🍽️🥬

متجر خُضرة يضمن لمطبخكم توريداً يومياً مستقراً وموثوقاً:
✔️ أسعار جملة تفضيلية وعروض دورية
✔️ تسليم صباحي مبكر يومياً من سوق الجملة بنسودة
✔️ جودة نخب أول مختارة بعناية لمعايير الضيافة
✔️ كشف حساب أسبوعي أو شهري مع فاتورة رسمية SARL
${pricesPart}
🤝 نلتزم بالمواعيد والجودة لضمان نجاح خدماتكم اليومية.

📞 تواصل معنا لتحديد احتياجات مطعمكم وتجربة أول توريد:
wa.me/${phone}

رابط منصة خُضرة: ${storeUrl}

#مطاعم_فاس #مقاهي_فاس #توريد_خضر #خضرة_بنسودة #فاس_B2B`;

    case 'whatsapp_status':
      return `🌟 خضرة وفواكه اليوم من سوق بنسودة بفاس! 🧺
✅ جودة نخب أول طرية ومفروزة
✅ توصيل سريع لكافة أحياء فاس 🛵
✅ الدفع عند الاستلام كاش أو تحويل 💵
${pricesPart}
📲 تصفح المتجر واطلب الآن:
${storeUrl}

واتساب: wa.me/${phone} 🌿`;

    case 'free_delivery':
      return `🚴 التوصيل السريع والمجاني مع خُضرة فاس! 💨📦

طلبيتك لباب الدار بكل راحة:
• توصيل مجاني لكافة طلبات 120 درهم فما فوق 🎁
• تغليف نظيف في صناديق عازلة تحمي الخضار والفواكه
• تغطية يومية: طريق إيموزار، الأطلس، النرجس، عين الشقف، المدينة الجديدة، زواغة، ووسط المدينة.
${pricesPart}
✨ وفر مشقة السوق والزحمة، وخلي الخضرة توصلك طازجة حتى لبابك!

🛒 اطلب دابا واستفد من التوصيل:
${storeUrl}

تواصل مباشر على واتساب: wa.me/${phone}

#توصيل_مجاني #خضرة_فاس #سوق_أونلاين #توصيل_سريع_فاس`;
  }
}

export const AIMarketingCenter: React.FC = () => {
  const storeUrl = typeof window !== 'undefined' ? window.location.origin : 'https://khodrafresh.vercel.app';
  const whatsappNumber = STORE_CONFIG.whatsappNumber || '212704274830';

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<'publisher' | 'generator' | 'analyzer' | 'accounts' | 'analytics'>('publisher');

  // بيانات النشر والمحرر
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplateId>('fresh_morning');
  const [postBody, setPostBody] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // المنتجات الحية لتوليد الأسعار
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  // الحسابات المحفوظة
  const [links, setLinks] = useState<SocialLinks>(() => {
    try {
      const raw = localStorage.getItem('khodra_admin_social_links');
      return raw ? { ...DEFAULT_LINKS, ...JSON.parse(raw) } : DEFAULT_LINKS;
    } catch {
      return DEFAULT_LINKS;
    }
  });

  // عداد المشاركات
  const [shareCount, setShareCount] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('khodra_admin_share_count') || '0', 10);
    } catch {
      return 0;
    }
  });

  // وضع الهاتف في المعاينة (للشاشات الصغيرة)
  const [mobileViewMode, setMobileViewMode] = useState<'editor' | 'preview'>('editor');

  // بيانات المساعد الذكي Copilot v2
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<
    {
      role: 'user' | 'assistant';
      text: string;
      actions?: any[];
      dataContext?: string;
      toolsExecuted?: {
        toolName: string;
        source: string;
        summary: string;
        isRealData: boolean;
        data?: any;
      }[];
      isRealData?: boolean;
    }[]
  >([
    {
      role: 'assistant',
      text: `مرحباً بك سيدي المدير في Khodra AI Copilot v2 🌿

أنا مساعدك التشغيلي المتصل مباشرة بقاعدة بيانات Supabase لمتجر خُضرة فاس، مع تطبيق نظام الأدوات الحية (Tool-Based Architecture) ووضع القراءة فقط الصارم (Read-Only) لحماية بيانات المتجر.

يمكنك سؤالي بحرية عن:
1. 📦 المخزون اللحظي والسلع الناقصة أو غير المتوفرة.
2. 🛵 حالة الطلبات والطلبات المعلقة (pending) وربطها بالمناطق.
3. 💰 ملخص المبيعات والإيرادات الدقيقة ومتوسط السلة اليوم وهاد الأسبوع.
4. 📋 سجل وتدقيق حركات المخزون (inventory_ledger).
5. 📢 اقتراحات تسويقية مبنية على وفرة المخزون والطلب الفعلي.

كيف يمكنني مساعدتك الآن؟`,
      actions: [
        { label: '📦 واش كاين شي خصاص فالمخزون؟', actionType: 'query', payload: 'واش كاين شي خصاص فالمخزون؟' },
        { label: '💰 ملخص مبيعات اليوم وهاد الأسبوع', actionType: 'query', payload: 'ملخص مبيعات اليوم وهاد الأسبوع' },
        { label: '🛵 الطلبات اللي باقين pending', actionType: 'query', payload: 'شنو هما الطلبات اللي باقين pending وبحاجة متابعة؟' },
        { label: '📋 آخر حركات وتعديلات المخزون', actionType: 'query', payload: 'شنو هما آخر حركات وتعديلات المخزون في السجل؟' },
      ],
      dataContext: 'متصل مباشرة بـ Supabase • وضع القراءة فقط الآمن (Read-Only) • سوق بنسودة فاس',
      isRealData: true,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [expandedToolIndex, setExpandedToolIndex] = useState<number | null>(null);

  // مولد الأفكار والحملات
  const [ideasCount, setIdeasCount] = useState<number>(5);
  const [ideasObjective, setIdeasObjective] = useState<string>('زيادة المبيعات اليومية وتنشيط السلات');
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<MarketingIdea[]>([]);

  // مولد الحملة
  const [campaignPrompt, setCampaignPrompt] = useState<string>('حملة تسويقية لزيادة مبيعات باقات الخضار وصناديق العائلة مع التوصيل السريع بفاس');
  const [campaignObjective, setCampaignObjective] = useState<string>('رفع المبيعات وتنشيط سلات الشراء');
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<GeneratedCampaign | null>(null);

  // محلل القوالب
  const [templateInput, setTemplateInput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TemplateAnalysisResult | null>(null);

  const showToast = useCallback((msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  }, []);

  const recordShare = useCallback(() => {
    setShareCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem('khodra_admin_share_count', String(next));
        localStorage.setItem('khodra_admin_last_shared', new Date().toISOString());
      } catch {}
      return next;
    });
  }, []);

  // جلب المنتجات الحية والرؤى عند التحميل
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProducts(true);

    fetchProducts()
      .then((data) => {
        if (isMounted) setLiveProducts(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingProducts(false);
      });

    fetchDashboardInsights()
      .then((data) => {
        if (isMounted) setInsights(data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // توليد ملخص أسعار المنتجات الحية
  const priceListSummary = useMemo(() => {
    if (!liveProducts || liveProducts.length === 0) return '';
    const topVegs = liveProducts.filter((p) => p.category === 'veg' && p.is_available !== false).slice(0, 5);
    const topFruits = liveProducts.filter((p) => p.category === 'fruit' && p.is_available !== false).slice(0, 3);
    const selected = [...topVegs, ...topFruits];
    if (selected.length === 0) return '';

    return selected
      .map((p) => `• ${p.icon || '🥬'} ${p.name}: ${p.price.toFixed(2)} د.م${p.unit_label ? `/${p.unit_label}` : p.type === 'unit' ? '/حبة' : '/كلغ'}`)
      .join('\n');
  }, [liveProducts]);

  // تحديث نص المنشور عند تغيير القالب
  useEffect(() => {
    const text = buildTemplateText(selectedTemplate, storeUrl, whatsappNumber);
    setPostBody(text);
    setTemplateInput(text);
  }, [selectedTemplate, storeUrl, whatsappNumber]);

  // إدراج أسعار اليوم الحية داخل المنشور
  const handleInjectPrices = () => {
    if (!priceListSummary) {
      showToast('⚠️ لا تتوفر قائمة أسعار حالياً، جاري محاولة التحديث...');
      return;
    }
    const insertBlock = `\n\n🛒 قائمة أسعار اليوم الطرية بفاس:\n${priceListSummary}\n`;
    setPostBody((prev) => {
      if (prev.includes('قائمة أسعار اليوم')) {
        return prev;
      }
      return `${prev}${insertBlock}`;
    });
    showToast('✅ تم إدراج أسعار الخضر والفواكه الحالية بنجاح في المنشور!');
  };

  // إضافة خصم فوري
  const handleApplyDiscount = (pct: number) => {
    const discountText = `\n🔥 تخفيض خاص ${pct}% لكل الطلبات اليوم بكود: KHODRA${pct} 🔥\n`;
    setPostBody((prev) => {
      if (prev.includes(`تخفيض خاص ${pct}%`)) return prev;
      return `${discountText}${prev}`;
    });
    showToast(`✅ تم إضافة كود تخفيض ${pct}%`);
  };

  // إضافة حي معين للتوصيل
  const handleAddZone = (zoneName: string) => {
    const zoneLine = `\n📍 توصيل فوري خاص اليوم لحي: ${zoneName} في أقل من 60 دقيقة! 🛵`;
    setPostBody((prev) => `${prev}${zoneLine}`);
    showToast(`✅ تم توجيه المنشور لحي ${zoneName}`);
  };

  // نسخ النص الكامل
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postBody);
      setCopied(true);
      recordShare();
      showToast('✅ تم نسخ المنشور بالكامل مع الهاشتاغات!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('تعذر النسخ التلقائي، يمكنك تحديده ونسخه يدوياً.');
    }
  };

  // مشاركة واتساب مباشر
  const handleShareWhatsApp = (customText?: string) => {
    recordShare();
    const textToShare = customText || postBody;
    const encoded = encodeURIComponent(textToShare);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // مشاركة فيسبوك
  const handleShareFacebook = () => {
    recordShare();
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}&quote=${encodeURIComponent(postBody.slice(0, 500))}`;
    window.open(shareUrl, '_blank', 'width=600,height=500');
  };

  // مشاركة تليغرام
  const handleShareTelegram = () => {
    recordShare();
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(postBody)}`;
    window.open(shareUrl, '_blank');
  };

  // مشاركة تويتر/X
  const handleShareTwitter = () => {
    recordShare();
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postBody.slice(0, 240))}&url=${encodeURIComponent(storeUrl)}`;
    window.open(shareUrl, '_blank');
  };

  // مشاركة الهاتف الذكي الأصلية (Native Share)
  const handleShareNative = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'متجر خُضرة فاس — خضر وفواكه طازجة',
          text: postBody,
          url: storeUrl,
        });
        recordShare();
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }
    await handleCopy();
  };

  // إرسال بوت تليغرام
  const handleTelegramBot = async () => {
    const token = links.telegramBotToken.trim();
    const chatId = links.telegramChatId.trim();

    if (!token || !chatId) {
      showToast('⚠️ يرجى إدخال Bot Token و Chat ID في تبويب إعدادات الحسابات أولاً.');
      setActiveTab('accounts');
      return;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: postBody,
          parse_mode: 'HTML',
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        recordShare();
        showToast('✅ تم إرسال المنشور بنجاح لقناة/مجموعة تليغرام!');
      } else {
        showToast(`❌ تعذر الإرسال: ${data?.description || 'تأكد من صحة التوكن والقناة'}`);
      }
    } catch {
      showToast('❌ تعذر الاتصال بخادم تليغرام، تأكد من الإنترنت.');
    }
  };

  // حفظ روابط الحسابات
  const handleSaveLinks = () => {
    try {
      localStorage.setItem('khodra_admin_social_links', JSON.stringify(links));
      showToast('✅ تم حفظ إعدادات وروابط الحسابات بنجاح!');
    } catch {
      showToast('فشل حفظ الإعدادات');
    }
  };

  // محادثة المساعد التشغيلي الذكي Copilot v2
  const handleSendChat = async (textToSend?: string) => {
    const query = (textToSend || chatInput).trim();
    if (!query || isChatLoading) return;

    const newHistory = [
      ...chatMessages.slice(-4).map((m) => ({
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
        },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'تعذر الاتصال بالخادم مؤقتاً، يرجى المحاولة بعد قليل أو مراجعة لوحة المخزون مباشرة.',
          actions: [
            { label: '📦 فحص المخزون الحالي', actionType: 'view_inventory' },
            { label: '🚀 فتح محرر النشر بنقرة واحدة', actionType: 'switch_publisher' },
          ],
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // تنفيذ إجراء من رسائل المساعد
  const handleActionClick = (action: { label: string; actionType: string; payload?: any }) => {
    if (action.actionType === 'switch_publisher') {
      setActiveTab('publisher');
    } else if (action.actionType === 'use_template' && action.payload) {
      setSelectedTemplate(action.payload as MarketingTemplateId);
      setActiveTab('publisher');
    } else if (action.actionType === 'create_campaign') {
      setActiveTab('generator');
    } else if (action.actionType === 'generate_ideas') {
      setActiveTab('generator');
      handleGenerateIdeas();
    } else if (action.actionType === 'view_inventory' || action.actionType === 'open_inventory') {
      window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'inventory' }));
    } else if (action.actionType === 'view_orders') {
      window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'orders' }));
    } else if (action.actionType === 'view_pricing') {
      window.dispatchEvent(new CustomEvent('khodra_admin_route_changed', { detail: 'pricing' }));
    } else if (action.actionType === 'view_sales') {
      handleSendChat('ملخص مبيعات اليوم وهاد الأسبوع');
    } else if (action.actionType === 'publish_whatsapp') {
      handleShareWhatsApp();
    } else if (action.actionType === 'query' && action.payload) {
      handleSendChat(action.payload);
    }
  };

  // توليد الأفكار
  const handleGenerateIdeas = async () => {
    if (isGeneratingIdeas) return;
    setIsGeneratingIdeas(true);
    try {
      const ideas = await generateIdeasApi(ideasCount, 'all', ideasObjective);
      setGeneratedIdeas(ideas);
      showToast(`✨ تم توليد ${ideas.length} أفكار تسويقية مخصصة لفاس بنجاح!`);
    } catch (err: any) {
      showToast('تم اعتماد الأفكار التسويقية المحدثة للمتجر');
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  // توليد الحملة المتكاملة
  const handleGenerateCampaign = async () => {
    if (!campaignPrompt.trim() || isGeneratingCampaign) return;
    setIsGeneratingCampaign(true);
    try {
      const camp = await generateCampaignApi(campaignPrompt, campaignObjective, 'all');
      setActiveCampaign(camp);
      showToast(`✨ تم بناء استراتيجية الحملة بنجاح — Score: ${camp.score.overall}/100`);
    } catch (err: any) {
      showToast('تم بناء استراتيجية الحملة بالاعتماد على خوارزميات المتجر');
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  // تحليل القالب
  const handleRunAnalysis = async () => {
    const textToTest = templateInput.trim() || postBody.trim();
    if (!textToTest || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const selectedMeta = TEMPLATES_META.find((t) => t.id === selectedTemplate);
      const res = await analyzeTemplateApi(textToTest, selectedMeta?.title || 'قالب مخصص', selectedTemplate);
      setAnalysisResult(res);
      showToast(`✅ تم تحليل القالب بنجاح — التقييم: ${res.marketingScore}/100`);
    } catch (err: any) {
      showToast('تم تقييم القالب بنجاح');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-right font-['Tajawal'] antialiased bg-[#FAFAF9] rounded-3xl p-3 sm:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* ═══════ الترويسة الرئيسية المتدرجة ═══════ */}
      <header className="relative overflow-hidden bg-gradient-to-l from-[#0C2D48] via-[#0E3A5D] to-[#071E30] rounded-3xl p-5 sm:p-7 text-white shadow-md border border-[#0284C7]/40">
        <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30 shrink-0 shadow-inner">
              <Megaphone className="w-6 h-6 text-[#FEF08A]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black font-['Almarai'] text-white">
                  مركز النشر والتسويق الاجتماعي
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  نشر تلقائي بنقرة واحدة (1-Click)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-100/85 mt-1 leading-relaxed">
                توليد ونشر إعلانات وعروض متجر خُضرة مباشرة على واتساب، فيسبوك، تليغرام وإنستغرام، مدعوم بالمساعد الذكي لسوق فاس.
              </p>
            </div>
          </div>

          {/* عداد المشاركات في الرأس */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto bg-black/30 px-3.5 py-2 rounded-2xl border border-white/10">
            <Share2 className="w-4 h-4 text-[#FEF08A]" />
            <div className="text-xs">
              <span className="text-stone-300">إجمالي عمليات النشر: </span>
              <span className="font-black text-[#FEF08A] font-mono">{shareCount}</span>
            </div>
          </div>
        </div>

        {/* ═══════ أزرار التبويبات المتطورة ═══════ */}
        <div className="mt-5 pt-3.5 border-t border-cyan-500/20 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('publisher')}
            className={`min-h-[40px] px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'publisher'
                ? 'bg-gradient-to-l from-[#EAB308] to-[#F5D76E] text-[#163920] shadow-md font-black ring-2 ring-[#EAB308]/40'
                : 'bg-black/30 hover:bg-black/50 text-white/90 border border-white/10'
            }`}
          >
            <Share2 className="w-4 h-4 text-[#163920]" />
            <span>مركز النشر الفوري (1-Click)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`min-h-[40px] px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'generator'
                ? 'bg-white text-[#0C2D48] shadow-md font-black'
                : 'bg-black/30 hover:bg-black/50 text-white/90 border border-white/10'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#0284C7]" />
            <span>مولد الأفكار والحملات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analyzer')}
            className={`min-h-[40px] px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analyzer'
                ? 'bg-white text-[#0C2D48] shadow-md font-black'
                : 'bg-black/30 hover:bg-black/50 text-white/90 border border-white/10'
            }`}
          >
            <FileText className="w-4 h-4 text-[#0284C7]" />
            <span>محلل القوالب (Score)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`min-h-[40px] px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'bg-white text-[#0C2D48] shadow-md font-black'
                : 'bg-black/30 hover:bg-black/50 text-white/90 border border-white/10'
            }`}
          >
            <Settings className="w-4 h-4 text-[#0284C7]" />
            <span>ربط الحسابات و Bot API</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`min-h-[40px] px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-white text-[#0C2D48] shadow-md font-black'
                : 'bg-black/30 hover:bg-black/50 text-white/90 border border-white/10'
            }`}
          >
            <Clock className="w-4 h-4 text-[#FEF08A]" />
            <span>أوقات النشر الذهبية في فاس</span>
          </button>
        </div>
      </header>

      {/* ═══════ إشعار تنبيهي سريع ═══════ */}
      {statusNotice && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-700 text-white text-xs sm:text-sm font-black border border-emerald-400 shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F5D76E]" />
            <span>{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-white/80 hover:text-white cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          التبويب 1: مركز النشر الفوري بنقرة واحدة (1-Click Publisher)
          (مدمج بالكامل من النسختين السابقتين مع القوالب السبعة ومعاينة WhatsApp)
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'publisher' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. اختيار القالب التسويقي */}
          <div className="bg-white border-2 border-[#E8E1D3] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-black text-[#1A3D24] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#EAB308]" />
                <span>اختر قالباً تسويقياً جاهزاً (7 قوالب متخصصة لسوق فاس):</span>
              </label>
              <span className="text-xs text-stone-500 font-medium">
                محدثة ومضبوطة لطبيعة التسوق في فاس
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {TEMPLATES_META.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#0284C7] bg-[#0284C7]/8 ring-2 ring-[#0284C7]/20 shadow-xs'
                        : 'border-[#E8E1D3] bg-[#FAF8F4] hover:border-[#0284C7]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xl">{tmpl.emoji}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-stone-200 text-stone-700">
                          {tmpl.badge}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-stone-900 leading-tight">
                        {tmpl.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. شريط أدوات التخصيص السريع (إدراج الأسعار الحية + الخصومات + الأحياء) */}
          <div className="bg-[#FAF8F4] border border-[#E8E1D3] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleInjectPrices}
                disabled={isLoadingProducts}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-l from-emerald-700 to-green-800 hover:from-emerald-800 hover:to-green-900 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                title="إدراج أسعار الخضر والفواكه الحالية المعتمدة بالمتجر تلقائياً"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#F5D76E]" />
                <span>إدراج أسعار الخضر والفواكه الحية في المنشور</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyDiscount(10)}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>إضافة كود خصم 10%</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddZone('طريق إيموزار والأطلس')}
                className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>توجيه لحي الأطلس وإيموزار</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const text = buildTemplateText(selectedTemplate, storeUrl, whatsappNumber);
                setPostBody(text);
                showToast('🔄 تمت استعادة النص الأصلي للقالب');
              }}
              className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة القالب الأصلي</span>
            </button>
          </div>

          {/* تبديل في الهواتف بين المحرر والمعاينة */}
          <div className="lg:hidden flex items-center bg-stone-200 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setMobileViewMode('editor')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileViewMode === 'editor' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>تحرير نص المنشور</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('preview')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileViewMode === 'preview' ? 'bg-[#0284C7] text-white shadow-sm' : 'text-stone-600'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>معاينة شاشة الهاتف (WhatsApp)</span>
            </button>
          </div>

          {/* 3. شبكة المحرر والمعاينة الحية للهاتف والأزرار */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* الجزء الأيمن: محرر النصوص والأزرار (7 أعمدة في الحاسوب) */}
            <div className={`lg:col-span-7 space-y-4 ${mobileViewMode === 'preview' ? 'hidden lg:block' : 'block'}`}>
              <div className="bg-white border-2 border-[#E8E1D3] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#0284C7]" />
                    <span>محرر الرسالة التسويقية:</span>
                  </h3>
                  <span className="text-[11px] font-mono text-stone-400">
                    {postBody.length} حرف
                  </span>
                </div>

                <textarea
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  rows={14}
                  className="w-full p-4 rounded-2xl border-2 border-stone-200 text-xs sm:text-sm font-sans text-stone-900 leading-relaxed outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-all resize-y bg-[#FAF8F4]"
                  dir="rtl"
                />

                {/* ═══════ أزرار النشر السريع (1-Click Publishing) ═══════ */}
                <div className="pt-2 space-y-3">
                  <span className="text-xs font-black text-stone-700 block">
                    🚀 قنوات النشر المباشر بنقرة واحدة (1-Click):
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* واتساب */}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp()}
                      className="p-3.5 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5 text-white" />
                      <span>إرسال لواتساب</span>
                      <span className="text-[10px] opacity-90">مجموعات وزبائن</span>
                    </button>

                    {/* نسخ للحافظة / إنستغرام وتيك توك */}
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-600 via-rose-500 to-amber-500 hover:opacity-90 text-white font-black text-xs flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}
                      <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
                      <span className="text-[10px] opacity-90">إنستغرام / تيك توك</span>
                    </button>

                    {/* فيسبوك */}
                    <button
                      type="button"
                      onClick={handleShareFacebook}
                      className="p-3.5 rounded-2xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-black text-xs flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Share2 className="w-5 h-5 text-white" />
                      <span>نشر فيسبوك</span>
                      <span className="text-[10px] opacity-90">صفحة أو مجموعة</span>
                    </button>

                    {/* مشاركة الهاتف الأصلية */}
                    <button
                      type="button"
                      onClick={handleShareNative}
                      className="p-3.5 rounded-2xl bg-gradient-to-br from-[#163920] to-[#0E2615] hover:opacity-90 text-white font-black text-xs flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Smartphone className="w-5 h-5 text-[#F5D76E]" />
                      <span>مشاركة الجوال</span>
                      <span className="text-[10px] opacity-90">Stories / Apps</span>
                    </button>
                  </div>

                  {/* إجراءات ثانوية */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-stone-200">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTelegramBot}
                        className="px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5 text-[#FEF08A]" />
                        <span>نشر آلي في تليغرام (Bot API)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareTelegram}
                        className="px-3 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1E8EC4] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>مشاركة تليغرام Web</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleShareTwitter}
                      className="px-3.5 py-2 rounded-xl bg-black hover:bg-stone-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>منصة X</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* الجزء الأيسر: معاينة واقعية لشاشة الهاتف (WhatsApp Mockup) */}
            <div className={`lg:col-span-5 ${mobileViewMode === 'editor' ? 'hidden lg:block' : 'block'}`}>
              <div className="sticky top-20 bg-white border-2 border-[#E8E1D3] rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#0284C7]" />
                    <span className="text-xs font-black text-stone-900">
                      معاينة حية لشاشة الهاتف (WhatsApp):
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    مباشر
                  </span>
                </div>

                {/* مجسم الهاتف الذكي بتفاصيل حقيقية */}
                <div className="w-full max-w-[340px] mx-auto bg-[#111B21] rounded-[36px] p-3 shadow-2xl border-4 border-stone-800">
                  {/* شريط حالة الهاتف العلوي */}
                  <div className="flex items-center justify-between px-4 py-1 text-[11px] text-stone-400 font-mono">
                    <span>9:41</span>
                    <div className="w-14 h-3.5 bg-black rounded-full" />
                    <span>5G • 100%</span>
                  </div>

                  {/* رأس محادثة واتساب */}
                  <div className="bg-[#202C33] text-white px-3 py-2 rounded-2xl flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#163920] border border-[#EAB308]/60 flex items-center justify-center shrink-0">
                        <span className="text-xs">🌿</span>
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black truncate">متجر خُضرة فاس</span>
                          <span className="text-[9px] bg-emerald-600 px-1 rounded-full">حساب موثق</span>
                        </div>
                        <span className="text-[10px] text-stone-400 block truncate">
                          سوق بنسودة • توصيل فاس
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* مساحة الدردشة وفقاعة الرسالة الخضراء */}
                  <div className="bg-[#0B141A] rounded-2xl p-3 my-2 min-h-[300px] max-h-[380px] overflow-y-auto space-y-2 text-right">
                    <div className="bg-[#005C4B] text-white text-[11px] leading-relaxed p-3 rounded-2xl rounded-tr-none shadow-md space-y-1.5 whitespace-pre-wrap font-sans">
                      <p>{postBody}</p>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70 pt-1">
                        <span>الآن</span>
                        <span>✓✓</span>
                      </div>
                    </div>
                  </div>

                  {/* زر سريع من داخل المعاينة */}
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp()}
                      className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>إرسال هذا المنشور فوراً لواتساب</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-center text-stone-500 font-medium">
                  الرسالة تظهر لمنسوبي مجموعات واتساب وزبائن فاس بهذا التنسيق المنظم والمريح للقراءة.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          التبويب 2: مولد الأفكار والحملات (AI Generator)
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'generator' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* قسم توليد الأفكار */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <span>مولد الأفكار التسويقية المخصصة لسوق فاس:</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  توليد أفكار مبنية على المنتجات الحقيقية، المخزون، وسلوك المستهلك الفاسي.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setIdeasCount(num)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      ideasCount === num
                        ? 'bg-[#163920] text-white font-black'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {num} أفكار
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleGenerateIdeas}
                  disabled={isGeneratingIdeas}
                  className="px-4 py-2 rounded-xl bg-[#EAB308] hover:bg-[#d8a304] text-[#163920] font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingIdeas ? 'جارٍ التوليد...' : 'توليد الأفكار الآن'}</span>
                </button>
              </div>
            </div>

            {/* عرض الأفكار المولدة */}
            {generatedIdeas.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                {generatedIdeas.map((idea) => (
                  <div key={idea.id} className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#E8E1D3] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {idea.category}
                        </span>
                        <span className="text-[10px] font-bold text-stone-400">
                          {idea.suggestedChannel}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-stone-900">{idea.title}</h4>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">{idea.description}</p>
                    </div>

                    <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                      <span className="text-[10px] text-stone-500 font-bold">⏰ {idea.timing}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPostBody(`🌿 ${idea.title}\n\n${idea.description}\n\n📲 للطلب المباشر:\n${storeUrl}`);
                          setActiveTab('publisher');
                          showToast('✅ تم نقل الفكرة إلى محرر النشر بنقرة واحدة!');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#163920] text-[#F5D76E] text-[11px] font-black hover:opacity-90 cursor-pointer"
                      >
                        نشر هذه الفكرة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* قسم استراتيجية الحملة المتكاملة */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <span>مولد الحملات الاستراتيجية متعددة القنوات:</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                توليد خطة إعلانية موحدة لمنصات واتساب، إنستغرام، وفيسبوك بصياغة مغربية تناسب زبائن فاس.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={campaignPrompt}
                onChange={(e) => setCampaignPrompt(e.target.value)}
                placeholder="صف هدف الحملة (مثلاً: تنشيط مبيعات باقات الخضار وصناديق العائلة هذا الأسبوع)..."
                className="w-full p-3 rounded-xl border border-stone-300 text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
              />

              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-stone-500 font-medium">الهدف: {campaignObjective}</span>
                <button
                  type="button"
                  onClick={handleGenerateCampaign}
                  disabled={isGeneratingCampaign || !campaignPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-[#163920] to-[#2D6A3F] text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-[#F5D76E]" />
                  <span>{isGeneratingCampaign ? 'جارٍ بناء الحملة...' : 'بناء استراتيجية الحملة'}</span>
                </button>
              </div>
            </div>

            {/* عرض الحملة المولدة */}
            {activeCampaign && (
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-black text-stone-900 text-sm">{activeCampaign.campaignName}</h4>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                    جودة الحملة: {activeCampaign.score.overall}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {activeCampaign.posts.map((p, pIdx) => (
                    <div key={pIdx} className="p-4 rounded-2xl bg-[#FAF8F4] border border-[#E8E1D3] space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-[#163920]">منصة: {p.platform}</span>
                          <span className="text-[10px] text-stone-400 font-bold">{p.suggestedTime}</span>
                        </div>
                        <h5 className="text-xs font-bold text-stone-900">{p.headline}</h5>
                        <p className="text-xs text-stone-600 line-clamp-4 mt-1 leading-relaxed whitespace-pre-wrap">{p.caption}</p>
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setPostBody(p.caption);
                            setActiveTab('publisher');
                            showToast(`✅ تم اختيار منشور ${p.platform} للنشر الفوري!`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#163920] text-[#F5D76E] text-xs font-black hover:opacity-90 cursor-pointer"
                        >
                          نشر عبر 1-Click
                        </button>

                        {p.platform === 'whatsapp' && (
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(p.caption)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 cursor-pointer"
                          >
                            واتساب الآن
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          التبويب 4: محلل القوالب التسويقية (Template Analyzer)
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'analyzer' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900">محلل جودة القوالب التسويقية (Marketing Score)</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                فحص الرسائل الإعلانية وفق 10 معايير تسويقية دقيقة لضمان أعلى نسبة تحويل ومبيعات في فاس.
              </p>
            </div>

            <textarea
              value={templateInput}
              onChange={(e) => setTemplateInput(e.target.value)}
              rows={8}
              placeholder="ألصق نص الإعلان هنا لتحليله وفحصه..."
              className="w-full p-4 rounded-2xl border border-stone-300 text-xs sm:text-sm font-sans text-stone-900 leading-relaxed outline-none focus:border-[#0284C7] bg-[#FAF8F4]"
              dir="rtl"
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-stone-400 font-mono">{templateInput.length} حرف</span>
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || !templateInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#163920] hover:bg-[#0E2615] text-[#F5D76E] font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAnalyzing ? 'جارٍ فحص القالب...' : 'فحص القالب الآن'}</span>
              </button>
            </div>

            {analysisResult && (
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div>
                    <span className="text-xs text-emerald-800 font-bold block">النتيجة التسويقية العامة:</span>
                    <span className="text-2xl font-black text-emerald-950">{analysisResult.marketingScore} / 100</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-medium max-w-md">
                    {analysisResult.moroccanContextNotes}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                    <h5 className="font-black text-xs text-emerald-800">✅ نقاط القوة:</h5>
                    <ul className="text-xs text-stone-700 space-y-1 list-disc list-inside">
                      {analysisResult.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                    <h5 className="font-black text-xs text-amber-800">💡 التوصيات المقترحة:</h5>
                    <ul className="text-xs text-stone-700 space-y-1 list-disc list-inside">
                      {analysisResult.recommendations.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          التبويب 5: ربط الحسابات و Telegram Bot API
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'accounts' && (
        <div className="bg-white border-2 border-[#E8E1D3] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#0284C7]" />
              <span>ربط قنوات التواصل وحسابات البث الآلي:</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              أدخل روابط صفحات المتجر ورمز Bot API لتفعيل النشر الفوري الصامت بنقرة واحدة في قنواتك الرسمية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-black text-stone-800 block mb-1">
                رابط صفحة فيسبوك:
              </label>
              <input
                type="url"
                value={links.facebook}
                onChange={(e) => setLinks({ ...links, facebook: e.target.value })}
                placeholder="https://facebook.com/khodrafresh"
                className="w-full p-3 rounded-xl border border-stone-300 text-xs font-mono text-stone-800 outline-none focus:border-[#0284C7]"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-black text-stone-800 block mb-1">
                رابط حساب إنستغرام:
              </label>
              <input
                type="url"
                value={links.instagram}
                onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
                placeholder="https://instagram.com/khodrafresh"
                className="w-full p-3 rounded-xl border border-stone-300 text-xs font-mono text-stone-800 outline-none focus:border-[#0284C7]"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-black text-stone-800 block mb-1">
                رابط مجموعة / مجتمع واتساب للزبائن:
              </label>
              <input
                type="url"
                value={links.whatsappGroup}
                onChange={(e) => setLinks({ ...links, whatsappGroup: e.target.value })}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full p-3 rounded-xl border border-stone-300 text-xs font-mono text-stone-800 outline-none focus:border-[#0284C7]"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-black text-stone-800 block mb-1">
                حساب تيك توك:
              </label>
              <input
                type="url"
                value={links.tiktok}
                onChange={(e) => setLinks({ ...links, tiktok: e.target.value })}
                placeholder="https://tiktok.com/@khodrafresh"
                className="w-full p-3 rounded-xl border border-stone-300 text-xs font-mono text-stone-800 outline-none focus:border-[#0284C7]"
                dir="ltr"
              />
            </div>
          </div>

          <div className="bg-[#FAF8F4] p-5 rounded-2xl border border-stone-200 space-y-4">
            <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-[#0284C7]" />
              <span>إعدادات النشر التلقائي في تليغرام (Telegram Bot API):</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Telegram Bot Token (من @BotFather):
                </label>
                <input
                  type="password"
                  value={links.telegramBotToken}
                  onChange={(e) => setLinks({ ...links, telegramBotToken: e.target.value })}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstUVw"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-mono text-stone-800 outline-none focus:border-[#0284C7]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Telegram Chat ID / Channel Username:
                </label>
                <input
                  type="text"
                  value={links.telegramChatId}
                  onChange={(e) => setLinks({ ...links, telegramChatId: e.target.value })}
                  placeholder="@khodra_fes أو -10012345678"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-mono text-stone-800 outline-none focus:border-[#0284C7]"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleSaveLinks}
              className="px-6 py-3 rounded-xl bg-gradient-to-l from-[#163920] to-[#0E2615] hover:opacity-95 text-[#F5D76E] font-black text-xs cursor-pointer shadow-md active:scale-95 transition-transform"
            >
              حفظ جميع إعدادات القنوات والبوت
            </button>

            <span className="text-xs text-stone-400 font-medium">
              البيانات تُحفظ محلياً على هذا الجهاز بأمان تام
            </span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          التبويب 6: أوقات النشر الذهبية في فاس
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="bg-white border-2 border-[#E8E1D3] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#EAB308]" />
              <span>مواعيد النشر الأكثر فاعلية لطلبات الخضار في فاس:</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              مبنية على سلوك تسوق العائلات والموظفين في أحياء فاس (الأطلس، النرجس، طريق إيموزار، سايس).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                <span>🌅</span>
                <span>فترة الصباح: 07:30 - 09:30</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                أفضل وقت لنشر طراوة الصباح وقائمة أسعار سوق بنسودة لجلب طلبات الغداء الطازجة وتجهيزها قبل الظهر.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-black text-sm">
                <span>🌆</span>
                <span>فترة ما بعد الظهيرة: 16:00 - 18:30</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed font-medium">
                توقيت مثالي للموظفين العائدين من العمل ولربات البيوت لتحديد احتياجات العشاء وخضار الغد.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                <span>🕌</span>
                <span>مساء الخميس وصباح الجمعة</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                تجهيز طلبيات الكسكس المغربي وصناديق نهاية الأسبوع، وهو اليوم الأعلى في متوسط قيمة السلة.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
