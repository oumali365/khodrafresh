import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShoppingBag } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // إذا كان الخطأ بسبب تحديث ملفات الموقع أو انتهاء صلاحية chunk
    const isChunkError =
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Loading chunk');

    if (isChunkError && !sessionStorage.getItem('khodra_chunk_reloaded')) {
      sessionStorage.setItem('khodra_chunk_reloaded', 'true');
      window.location.reload();
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetApp = () => {
    try {
      localStorage.removeItem('khodra_cart_v2');
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    } catch {
      // Ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#F2EEE4] flex items-center justify-center p-4 font-['Tajawal'] text-right"
        >
          <div className="bg-white border border-[#D4C8B5] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-lg text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#C25E12] flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <ShoppingBag className="w-8 h-8 text-[#1E4327]" />
            </div>

            <h1 className="text-xl font-black text-[#112616] mb-2">
              متجر خُضرة - تحديث جديد
            </h1>

            <p className="text-sm text-[#524B3E] mb-6 leading-relaxed">
              تم تحديث المتجر بنسخة جديدة لتقديم تجربة تسوق أفضل. يرجى الضغط على الزر أدناه لإعادة تحديث الصفحة.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-[#1E4327] hover:bg-[#112616] text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحديث المتجر</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetApp}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                إعادة ضبط الذاكرة المؤقتة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
