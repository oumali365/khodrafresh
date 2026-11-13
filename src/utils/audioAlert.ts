// ============================================================
// src/utils/audioAlert.ts
// نظام التنبيه الصوتي المضمون للطلبات الجديدة
// متوافق 100% مع قيود Autoplay في كافة المتصفحات والهواتف
// ============================================================

const NOTIFICATION_SOUND_KEY = 'khodra_notification_sound';

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      try {
        sharedAudioCtx = new AudioContextClass();
      } catch {
        sharedAudioCtx = null;
      }
    }
  }
  return sharedAudioCtx;
}

// فك قفل الصوت تلقائياً عند أول لمسة أو نقرة من المستخدم على الصفحة
export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      isAudioUnlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === 'running') {
    isAudioUnlocked = true;
  }
}

if (typeof window !== 'undefined') {
  const handleUserInteraction = () => {
    unlockAudioContext();
  };
  window.addEventListener('click', handleUserInteraction, { passive: true });
  window.addEventListener('touchstart', handleUserInteraction, { passive: true });
  window.addEventListener('keydown', handleUserInteraction, { passive: true });
}

export function isNotificationSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(NOTIFICATION_SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_SOUND_KEY, String(enabled));
  } catch {}
}

/**
 * تشغيل نغمة تنبيه نقية ومميزة (نغمة جرس مزدوجة D5 -> A5)
 * @param force إذا كانت true، يتم تشغيل الصوت حتى لو كان التنبيه مكتوماً (مثلاً عند اختبار الصوت)
 */
export function playOrderAlertSound(force = false): boolean {
  if (!force && !isNotificationSoundEnabled()) {
    return false;
  }

  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // النغمة الأولى: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // النغمة الثانية: A5 (880 Hz) - أعلى وأوضح
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);

    return true;
  } catch (err) {
    console.warn('Audio alert playback error:', err);
    return false;
  }
}
