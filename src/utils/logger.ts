// ============================================================
// logger.ts - نظام تسجيل قياسي لمتجر خُضرة
// ============================================================

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.info(`[Khodra INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[Khodra WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[Khodra ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.debug(`[Khodra DEBUG] ${message}`, ...args);
    }
  },
};
