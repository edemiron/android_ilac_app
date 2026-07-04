/**
 * SecurityScreen helpers + UI constants.
 *
 * Sprint 5.3: SecurityScreen.tsx (886 satir) helper extraction.
 * Pure helpers + UI text constants ayri modulde toplandi.
 */

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Vibration } from 'react-native';

export type HapticType = 'light' | 'success' | 'error';

/**
 * Haptic feedback tetikleme. Hata durumunda Vibration fallback.
 */
export function triggerHaptic(type: HapticType): void {
  try {
    const hapticType =
      type === 'success'
        ? 'notificationSuccess'
        : type === 'error'
          ? 'notificationError'
          : 'impactLight';
    ReactNativeHapticFeedback.trigger(hapticType, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } catch {
    Vibration.vibrate(50);
  }
}

export interface SecurityRequirementCheckResult {
  ok: boolean;
  message?: string;
}

/**
 * Security toggle prerequisite check.
 * hasPin veya biometric available olmadan securityEnabled=true yapilamaz.
 */
export function checkSecurityRequirement(
  enabled: boolean,
  hasPin: boolean,
  biometricAvailable: boolean,
  language: 'tr' | 'en'
): SecurityRequirementCheckResult {
  if (enabled && !hasPin && !biometricAvailable) {
    return {
      ok: false,
      message:
        language === 'tr'
          ? 'Güvenliği aktif etmek için PIN veya biyometrik kimlik doğrulama ayarlamalısınız.'
          : 'You need to set up PIN or biometric authentication to enable security.',
    };
  }
  return { ok: true };
}

export interface BiometricRequirementResult {
  ok: boolean;
  message?: string;
}

/**
 * Biometric toggle prerequisite check.
 * hasPin olmadan biometric acilamaz.
 */
export function checkBiometricRequirement(
  enabled: boolean,
  hasPin: boolean,
  language: 'tr' | 'en'
): BiometricRequirementResult {
  if (enabled && !hasPin) {
    return {
      ok: false,
      message:
        language === 'tr'
          ? 'Biyometrik kullanmadan önce PIN ayarlamanız gerekiyor.'
          : 'You need to set up a PIN before using biometrics.',
    };
  }
  return { ok: true };
}

/**
 * Lock timeout option list (UI icin).
 */
export const LOCK_TIMEOUT_OPTIONS = [
  { value: 0, label_tr: 'Hemen', label_en: 'Immediately' },
  { value: 1, label_tr: '1 dakika', label_en: '1 minute' },
  { value: 5, label_tr: '5 dakika', label_en: '5 minutes' },
  { value: 15, label_tr: '15 dakika', label_en: '15 minutes' },
  { value: 30, label_tr: '30 dakika', label_en: '30 minutes' },
  { value: 60, label_tr: '1 saat', label_en: '1 hour' },
] as const;

export function formatLockTimeoutLabel(minutes: number, language: 'tr' | 'en'): string {
  const option = LOCK_TIMEOUT_OPTIONS.find(o => o.value === minutes);
  if (option) return language === 'tr' ? option.label_tr : option.label_en;
  return `${minutes} ${language === 'tr' ? 'dakika' : 'minutes'}`;
}
