import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface AdminSessionContextType {
  extendSession: () => void;
}

const AdminSessionContext = createContext<AdminSessionContextType | undefined>(undefined);

export const AdminSessionProvider: React.FC<{ children: React.ReactNode; isAdmin: boolean; onLogout: () => void }> = ({ children, isAdmin, onLogout }) => {
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const showWarningRef = useRef(false);

  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    try {
      sessionStorage.setItem('khodra_admin_last_activity', String(Date.now()));
    } catch {}
    showWarningRef.current = false;
    setShowInactivityWarning(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      showWarningRef.current = false;
      setShowInactivityWarning(false);
      return;
    }

    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 دقيقة
    const WARNING_THRESHOLD_MS = 28 * 60 * 1000; // 28 دقيقة (تنبيه قبل دقيقتين)

    // تهيئة وقت آخر نشاط من sessionStorage إن وجد وكان صالحاً ضمن المهلة
    try {
      const storedLastActivity = Number(sessionStorage.getItem('khodra_admin_last_activity'));
      if (
        storedLastActivity &&
        !isNaN(storedLastActivity) &&
        storedLastActivity > 0 &&
        Date.now() - storedLastActivity < INACTIVITY_LIMIT_MS
      ) {
        lastActivityRef.current = storedLastActivity;
      } else {
        lastActivityRef.current = Date.now();
        sessionStorage.setItem('khodra_admin_last_activity', String(Date.now()));
      }
    } catch {
      lastActivityRef.current = Date.now();
    }

    let lastStorageSync = Date.now();
    const updateActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // تحديث التخزين المؤقت مرة كل 10 ثوانٍ كحد أقصى لمنع إرهاق التخزين مع الحفاظ على الدقة
      if (now - lastStorageSync > 10000) {
        lastStorageSync = now;
        try {
          sessionStorage.setItem('khodra_admin_last_activity', String(now));
        } catch {}
      }

      if (showWarningRef.current) {
        showWarningRef.current = false;
        setShowInactivityWarning(false);
      }
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'keydown', 'touchstart', 'pointerdown', 'click', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, updateActivity, { passive: true }));
    window.addEventListener('khodra_admin_route_changed', updateActivity);

    const interval = setInterval(() => {
      const inactiveDuration = Date.now() - lastActivityRef.current;
      if (inactiveDuration >= INACTIVITY_LIMIT_MS) {
        onLogout();
      } else if (inactiveDuration >= WARNING_THRESHOLD_MS && !showWarningRef.current) {
        showWarningRef.current = true;
        setShowInactivityWarning(true);
      }
    }, 5000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, updateActivity));
      window.removeEventListener('khodra_admin_route_changed', updateActivity);
      clearInterval(interval);
    };
  }, [isAdmin, onLogout]);

  return (
    <AdminSessionContext.Provider value={{ extendSession }}>
      {children}
      {showInactivityWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-2 border-amber-500 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-2xl font-black">
              ⏰
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">تنبيه خمول الجلسة</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                ستنتهي جلسة الإدارة بعد دقيقتين لعدم وجود نشاط. هل تريد تمديد الجلسة؟
              </p>
            </div>
            <button
              type="button"
              onClick={extendSession}
              className="w-full py-3 rounded-xl bg-[#163920] hover:bg-[#0E2615] text-white font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
            >
              تمديد الجلسة
            </button>
          </div>
        </div>
      )}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => {
  const context = useContext(AdminSessionContext);
  if (context === undefined) {
    return {
      extendSession: () => {},
    };
  }
  return context;
};
