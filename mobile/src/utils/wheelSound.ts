import { NativeModules, Platform } from 'react-native';

export const WHEEL_SOUND_THROTTLE_MS = 25;

let lastSoundTime = 0;

/**
 * Testlerde throttle durumunu sıfırlamak için kullanılır.
 */
export function resetWheelSoundThrottle(): void {
  lastSoundTime = 0;
}

/**
 * Tarih çarkı (WheelColumn) her adım atladığında mekanik tıkırtı ("çıt") sesini çalar.
 * 25ms throttle ile yüksek hızlı kaydırmalarda akustik bozulmayı önlerken
 * 40Hz'e kadar doğal ve tatmin edici mekanik çark hissi sunar.
 */
export function playWheelTickSound(): void {
  const now = Date.now();
  if (now - lastSoundTime < WHEEL_SOUND_THROTTLE_MS) {
    return;
  }
  lastSoundTime = now;

  if (Platform.OS === 'android') {
    try {
      const module = NativeModules?.WheelSoundModule;
      if (module && typeof module.playTick === 'function') {
        module.playTick();
      }
    } catch {
      // Non-critical UI sound effect failure
    }
  }
}
