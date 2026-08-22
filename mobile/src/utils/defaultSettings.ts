/**
 * Default user settings — yeni kullanıcı veya ayar sıfırlama için.
 *
 * Sprint 1 güncelleme: Tüm UserSettings zorunlu alanlar eklendi
 * (security, TTS, persistent notification). Cast ('as UserSettings')
 * kaldırıldı çünkü TS strict modda tam uyumlu olması gerekiyor.
 */

import type { UserSettings } from '../types';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  // Temel saat ayarları
  wakeUpTime: '08:00',
  sleepTime: '23:00',

  // Bildirim ayarları
  notificationSound: 'default',
  vibrationEnabled: true,
  fullScreenAlarmEnabled: true,
  language: 'tr',

  // Alarm ayarları
  alarmSound: 'alarm',
  alarmVolume: 80,

  // Erteleme ayarları
  snoozeDuration: 5,
  maxSnoozeCount: 3,

  // Sessiz saatler
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',

  // Alarm modu (telefon sessizde bile çal)
  alarmModeEnabled: true,

  // İlaç çakışma aralığı
  conflictIntervalMinutes: 10,

  // Güvenlik ayarları (Sprint 1'de eklenen alanlar)
  securityEnabled: false,
  securityType: 'none',
  biometricsEnabled: false,
  lockTimeout: 0,

  // TTS ayarları
  ttsEnabled: true,
  ttsVolume: 80,
  ttsRepeatCount: 1,
  ttsSpeakMedicineName: true,
  ttsSpeakDosage: true,
  ttsSpeakInstructions: true,

  // Kalıcı bildirim ayarları
  persistentNotificationEnabled: false,
  persistentNotificationDuration: 30,

  // Kolay mod (Büyük yazı & Sade arayüz)
  seniorModeEnabled: false,
};

export function createDefaultUserSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...overrides,
  };
}
