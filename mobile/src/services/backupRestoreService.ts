/**
 * Backup & Restore Service
 *
 * Yerel JSON formatında tam veri yedekleme, dışa aktarma ve geri yükleme servisi.
 * Çevrimdışı ve anonim kullanıcılar için cihazlar arası veri taşınabilirliği sağlar.
 */

import { format } from 'date-fns';
import Share from 'react-native-share';
import { Medicine, MedicineLog, ReminderTime, UserSettings } from '../types';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('BackupRestoreService');

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  version: number;
  exportDate: string;
  appName: string;
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  medicineLogs: MedicineLog[];
  settings: UserSettings;
}

export interface ValidationResult {
  isValid: boolean;
  payload?: BackupPayload;
  error?: string;
  summary?: {
    medicineCount: number;
    reminderCount: number;
    logCount: number;
  };
}

/**
 * Mevcut mağaza verilerinden doğrulanmış bir yedekleme paketi oluşturur.
 */
export function createBackupPayload(
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  medicineLogs: MedicineLog[],
  settings: UserSettings
): BackupPayload {
  return {
    version: BACKUP_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    appName: 'İlaç Hatırlatıcı',
    medicines: Array.isArray(medicines) ? medicines : [],
    reminderTimes: Array.isArray(reminderTimes) ? reminderTimes : [],
    medicineLogs: Array.isArray(medicineLogs) ? medicineLogs : [],
    settings: settings || ({} as UserSettings),
  };
}

function cleanPrototypeKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanPrototypeKeys);
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = cleanPrototypeKeys(value);
  }
  return clean;
}

/**
 * JSON string veya nesnesini doğrular.
 */
export function validateBackupPayload(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Geçersiz veri formatı (JSON nesnesi bekleniyor).' };
  }

  const sanitized = cleanPrototypeKeys(data) as Partial<BackupPayload>;
  const obj = sanitized;

  if (typeof obj.version !== 'number' || obj.version > BACKUP_SCHEMA_VERSION) {
    return { isValid: false, error: 'Desteklenmeyen veya geçersiz yedekleme sürümü.' };
  }

  if (!Array.isArray(obj.medicines)) {
    return { isValid: false, error: 'İlaç listesi eksik veya bozuk.' };
  }

  if (!Array.isArray(obj.reminderTimes)) {
    return { isValid: false, error: 'Hatırlatıcı saatleri listesi eksik veya bozuk.' };
  }

  // İlaçların temel alanlarını doğrula
  for (const med of obj.medicines) {
    if (!med || typeof med.id !== 'string' || typeof med.name !== 'string') {
      return { isValid: false, error: 'İlaç listesinde eksik veya bozuk kayıtlar mevcut.' };
    }
  }

  // Hatırlatıcı saatlerinin temel alanlarını doğrula
  for (const rt of obj.reminderTimes) {
    if (
      !rt ||
      typeof rt.id !== 'string' ||
      typeof rt.medicineId !== 'string' ||
      typeof rt.time !== 'string'
    ) {
      return { isValid: false, error: 'Hatırlatıcı listesinde eksik veya bozuk kayıtlar mevcut.' };
    }
  }

  const payload: BackupPayload = {
    version: obj.version,
    exportDate: obj.exportDate || new Date().toISOString(),
    appName: obj.appName || 'İlaç Hatırlatıcı',
    medicines: obj.medicines,
    reminderTimes: obj.reminderTimes,
    medicineLogs: Array.isArray(obj.medicineLogs) ? obj.medicineLogs : [],
    settings: (obj.settings && typeof obj.settings === 'object'
      ? obj.settings
      : {}) as UserSettings,
  };

  return {
    isValid: true,
    payload,
    summary: {
      medicineCount: payload.medicines.length,
      reminderCount: payload.reminderTimes.length,
      logCount: payload.medicineLogs.length,
    },
  };
}

/**
 * JSON metnini parse eder ve doğrular.
 */
export function parseAndValidateBackupJson(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    return validateBackupPayload(parsed);
  } catch (e) {
    log.error('JSON parse hatası', e);
    return { isValid: false, error: 'JSON formatı okunamadı veya dosya bozuk.' };
  }
}

/**
 * Yedek paketini JSON dosyası olarak paylaşım ekranında açar (WhatsApp, E-posta, Dosyalara Kaydet vb.).
 */
export async function shareBackup(
  payload: BackupPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    const filename = `ilac-hatirlatici-yedek-${dateStr}.json`;
    const jsonString = JSON.stringify(payload, null, 2);

    // URI encoded data URL
    const url = `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`;

    await Share.open({
      title: 'İlaç Hatırlatıcı Veri Yedeği',
      subject: `İlaç Hatırlatıcı Yedeği (${dateStr})`,
      message: 'İlaç Hatırlatıcı uygulama veri yedeğidir. Uygulama içinden geri yükleyebilirsiniz.',
      filename,
      url,
      type: 'application/json',
    });

    log.info('Yedek başarıyla paylaşıldı', { filename });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err?.message?.includes('User did not share') || err?.message?.includes('cancelled')) {
      log.debug('Kullanıcı paylaşımı iptal etti');
      return { success: false, error: 'cancelled' };
    }
    log.error('Yedek paylaşım hatası', error);
    return { success: false, error: err?.message || 'Bilinmeyen hata' };
  }
}
