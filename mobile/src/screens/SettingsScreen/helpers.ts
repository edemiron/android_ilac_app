/**
 * SettingsScreen — pure helpers.
 *
 * Sprint 11.4: SettingsScreen.tsx (220 satir) ek helper extraction.
 * Dev mode tap detection + dev mode config constants.
 */

/** Dev mode'a gecmek icin gereken tap sayisi. */
export const DEV_MODE_TAP_COUNT = 5;

/** Tap'ler arasi max sure (ms). */
export const DEV_MODE_TAP_TIMEOUT = 3000;

/**
 * Tap'larin dev mode'u tetikleyip tetiklemedigini kontrol et.
 * Tap araligi timeout'u asmamali.
 */
export function shouldTriggerDevMode(
  tapCount: number,
  lastTapTime: number,
  now: number = Date.now()
): boolean {
  if (now - lastTapTime > DEV_MODE_TAP_TIMEOUT) {
    return false;
  }
  return tapCount >= DEV_MODE_TAP_COUNT;
}

/**
 * Tap'larin zaman asimini kontrol et (dev mode sifirlama).
 */
export function isDevModeTapExpired(lastTapTime: number, now: number = Date.now()): boolean {
  return now - lastTapTime > DEV_MODE_TAP_TIMEOUT;
}

/**
 * Settings kategorileri — settings screen section basliklari.
 */
export const SETTINGS_SECTIONS = {
  GENERAL: 'general',
  NOTIFICATIONS: 'notifications',
  ALARMS: 'alarms',
  SECURITY: 'security',
  ACCOUNT: 'account',
} as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[keyof typeof SETTINGS_SECTIONS];
