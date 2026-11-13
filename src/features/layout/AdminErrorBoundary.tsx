import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: any;
  retryCount: number;
}

function restoreMainPageInteractivity() {
  try {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.pointerEvents = '';
  } catch {}
}

export class AdminErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, retryCount: 0 };

  static getDerivedStateFromError(error: any): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Admin Panel error caught by AdminErrorBoundary:', error, errorInfo);
    // تأكيد استعادة تمرير وتفاعل الصفحة الرئيسية فوراً لمنع أي تجمد
    restoreMainPageInteractivity();
  }

  componentWillUnmount() {
    restoreMainPageInteractivity();
  }

  handleRecover = () => {
    restoreMainPageInteractivity();
    this.setState((prev) => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  handleRetry = () => {
    restoreMainPageInteractivity();
    this.setState((prev) => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm text-right"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border-2 border-red-300 rounded-[24px] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-black text-base text-[#112616]">
                تنبيه أثناء عرض لوحة الإدارة
              </h3>
              <p className="text-xs text-[#524B3E] leading-relaxed">
                حدث خطأ مؤقت غير متوقع أثناء معالجة بيانات الطلبات. تم حماية وتأمين الصفحة الرئيسية لمتجرك لمنع أي تعطل.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleRecover}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-l from-[#163920] to-[#0E2615] hover:from-[#0E2615] hover:to-[#071A0C] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Home className="w-4 h-4 text-[#F5D76E]" />
                <span>العودة للمتجر بأمان</span>
              </button>
              <button
                type="button"
                onClick={this.handleRetry}
                className="py-3 px-4 rounded-xl bg-[#F7F4EC] hover:bg-[#EAE2D2] text-[#524B3E] font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <React.Suspense fallback={null} key={this.state.retryCount}>
        {this.props.children}
      </React.Suspense>
    );
  }
}
