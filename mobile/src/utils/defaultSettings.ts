/**
 * Default user settings — yeni kullanıcı veya ayar sıfırlama için.
 */

import { UserSettings } from '../types';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  wakeUpTime: '08:00',
  sleepTime: '23:00',
  notificationSound: 'default',
  vibrationEnabled: true,
  fullScreenAlarmEnabled: true,
  language: 'tr',
  alarmSound: 'alarm',
  alarmVolume: 80,
  snoozeDuration: 5,
  maxSnoozeCount: 3,
  // Aşağıdaki alanlar UserSettings tipinde yoksa optional; ek alanlar için
  // geriye dönük uyumluluk: undefined bırakılırsa medicineStore merge davranışına
  // bırakılır.
} as UserSettings;

export function createDefaultUserSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...overrides,
  };
}
