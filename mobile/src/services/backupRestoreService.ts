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
 * UTF-8 metnini güvenli Base64 formatına dönüştürür (Türkçe karakter ve özel sembol uyumlu).
 */
export function utf8ToBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const utf8Bytes: number[] = [];

  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      utf8Bytes.push(charCode);
    } else if (charCode < 0x800) {
      utf8Bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8Bytes.push(
        0xe0 | (charCode >> 12),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    } else {
      // Surrogate pair
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8Bytes.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    }
  }

  let output = '';
  let i = 0;
  while (i < utf8Bytes.length) {
    const b1 = utf8Bytes[i++];
    const b2 = i < utf8Bytes.length ? utf8Bytes[i++] : NaN;
    const b3 = i < utf8Bytes.length ? utf8Bytes[i++] : NaN;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    let enc3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    let enc4 = isNaN(b2) || isNaN(b3) ? 64 : b3 & 63;

    output +=
      chars.charAt(enc1) +
      chars.charAt(enc2) +
      (enc3 === 64 ? '=' : chars.charAt(enc3)) +
      (enc4 === 64 ? '=' : chars.charAt(enc4));
  }

  return output;
}

/**
 * Base64 metnini UTF-8 string formatına çözer.
 */
export function base64ToUtf8(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];

  let i = 0;
  while (i < cleanBase64.length) {
    const enc1 = chars.indexOf(cleanBase64.charAt(i++));
    const enc2 = chars.indexOf(cleanBase64.charAt(i++));
    const enc3 = chars.indexOf(cleanBase64.charAt(i++));
    const enc4 = chars.indexOf(cleanBase64.charAt(i++));

    const b1 = (enc1 << 2) | (enc2 >> 4);
    const b2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const b3 = ((enc3 & 3) << 6) | enc4;

    bytes.push(b1);
    if (enc3 !== 64 && enc3 !== -1) bytes.push(b2);
    if (enc4 !== 64 && enc4 !== -1) bytes.push(b3);
  }

  let str = '';
  let idx = 0;
  while (idx < bytes.length) {
    const b1 = bytes[idx++];
    if (b1 < 0x80) {
      str += String.fromCharCode(b1);
    } else if (b1 >= 0xc0 && b1 < 0xe0) {
      const b2 = bytes[idx++];
      str += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else if (b1 >= 0xe0 && b1 < 0xf0) {
      const b2 = bytes[idx++];
      const b3 = bytes[idx++];
      str += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
    } else if (b1 >= 0xf0) {
      const b2 = bytes[idx++];
      const b3 = bytes[idx++];
      const b4 = bytes[idx++];
      const codePoint =
        ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
      str += String.fromCodePoint(codePoint);
    }
  }

  return str;
}

/**
 * Yedek paketini JSON dosyası olarak paylaşım ekranında açar (WhatsApp, E-posta, Dosyalara Kaydet vb.).
 */
export async function shareBackup(
  payload: BackupPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    const filename = `ilac-hatirlatici-yedek-${dateStr}`;
    const jsonString = JSON.stringify(payload, null, 2);

    // Android/iOS native share standard Base64 Data URL with internal storage provider
    const base64Data = utf8ToBase64(jsonString);
    const url = `data:application/json;base64,${base64Data}`;

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
