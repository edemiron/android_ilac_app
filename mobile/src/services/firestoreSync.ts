import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Medicine, ReminderTime, MedicineLog, UserSettings } from '../types';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('FirestoreSync');

/**
 * Türkçe karakter encoding sorunlarını düzelt
 * Unicode escape sequence'ları decode et (\u00fc -> ü)
 */
function sanitizeString(str: string | undefined | null): string {
  if (!str) return str as string;
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function sanitizeMedicine(medicine: Medicine): Medicine {
  return {
    ...medicine,
    name: sanitizeString(medicine.name) || medicine.name,
    dosage: medicine.dosage ? sanitizeString(medicine.dosage) : medicine.dosage,
  };
}

/**
 * Firestore undefined değerleri kabul etmiyor.
 * Bu fonksiyon objedeki undefined değerleri temizler.
 */
function sanitizeForFirestore<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const sanitized: Partial<T> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      sanitized[key as keyof T] = obj[key] as T[keyof T];
    }
  }
  return sanitized;
}

// Collection isimleri
const COLLECTIONS = {
  USERS: 'users',
  MEDICINES: 'medicines',
  REMINDER_TIMES: 'reminderTimes',
  MEDICINE_LOGS: 'medicineLogs',
  SETTINGS: 'settings',
};

// Kullanıcı doküman referansı
const getUserDocRef = (userId: string) => doc(db, COLLECTIONS.USERS, userId);

// Alt koleksiyon referansları
const getMedicinesRef = (userId: string) =>
  collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEDICINES);

const getReminderTimesRef = (userId: string) =>
  collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.REMINDER_TIMES);

const getMedicineLogsRef = (userId: string) =>
  collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEDICINE_LOGS);

const getSettingsDocRef = (userId: string) =>
  doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.SETTINGS, 'userSettings');

// ============ İLAÇLAR ============

// Tüm ilaçları kaydet (batch)
export async function syncMedicinesToCloud(userId: string, medicines: Medicine[]): Promise<void> {
  const batch = writeBatch(db);
  const medicinesRef = getMedicinesRef(userId);

  // Önce mevcut tüm ilaçları sil
  const existingDocs = await getDocs(medicinesRef);
  existingDocs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Yeni ilaçları ekle
  medicines.forEach(medicine => {
    const docRef = doc(medicinesRef, medicine.id);
    batch.set(docRef, {
      ...sanitizeForFirestore(medicine as unknown as Record<string, unknown>),
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();
}

// Tek bir ilaç kaydet
export async function saveMedicineToCloud(userId: string, medicine: Medicine): Promise<void> {
  const docRef = doc(getMedicinesRef(userId), medicine.id);
  await setDoc(docRef, {
    ...sanitizeForFirestore(medicine as unknown as Record<string, unknown>),
    updatedAt: Timestamp.now(),
  });
}

// İlaç sil
export async function deleteMedicineFromCloud(userId: string, medicineId: string): Promise<void> {
  const docRef = doc(getMedicinesRef(userId), medicineId);
  await deleteDoc(docRef);
}

// Tüm ilaçları getir
export async function getMedicinesFromCloud(userId: string): Promise<Medicine[]> {
  const medicinesRef = getMedicinesRef(userId);
  const snapshot = await getDocs(medicinesRef);

  // Türkçe karakter encoding sorunlarını düzelt
  return snapshot.docs.map(doc =>
    sanitizeMedicine({
      ...doc.data(),
      id: doc.id,
    } as Medicine)
  );
}

// ============ HATIRLATMA ZAMANLARI ============

// Tüm hatırlatma zamanlarını kaydet
export async function syncReminderTimesToCloud(
  userId: string,
  reminderTimes: ReminderTime[]
): Promise<void> {
  const batch = writeBatch(db);
  const timesRef = getReminderTimesRef(userId);

  // Mevcut tüm zamanları sil
  const existingDocs = await getDocs(timesRef);
  existingDocs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Yeni zamanları ekle
  reminderTimes.forEach(time => {
    const docRef = doc(timesRef, time.id);
    batch.set(docRef, sanitizeForFirestore(time as unknown as Record<string, unknown>));
  });

  await batch.commit();
}

// Tüm hatırlatma zamanlarını getir
export async function getReminderTimesFromCloud(userId: string): Promise<ReminderTime[]> {
  const timesRef = getReminderTimesRef(userId);
  const snapshot = await getDocs(timesRef);

  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  })) as ReminderTime[];
}

// ============ İLAÇ LOGLARI ============

// Tüm logları kaydet
export async function syncMedicineLogsToCloud(userId: string, logs: MedicineLog[]): Promise<void> {
  const batch = writeBatch(db);
  const logsRef = getMedicineLogsRef(userId);

  // Son 30 günlük logları kaydet (eski logları temizle)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentLogs = logs.filter(log => new Date(log.scheduledTime) >= thirtyDaysAgo);

  // Mevcut logları sil
  const existingDocs = await getDocs(logsRef);
  existingDocs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Yeni logları ekle
  recentLogs.forEach(log => {
    const docRef = doc(logsRef, log.id);
    batch.set(docRef, sanitizeForFirestore(log as unknown as Record<string, unknown>));
  });

  await batch.commit();
}

// Tek bir log kaydet
export async function saveMedicineLogToCloud(userId: string, log: MedicineLog): Promise<void> {
  const docRef = doc(getMedicineLogsRef(userId), log.id);
  await setDoc(docRef, sanitizeForFirestore(log as unknown as Record<string, unknown>));
}

// Tüm logları getir
export async function getMedicineLogsFromCloud(userId: string): Promise<MedicineLog[]> {
  const logsRef = getMedicineLogsRef(userId);
  const snapshot = await getDocs(logsRef);

  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  })) as MedicineLog[];
}

// ============ AYARLAR ============

// Ayarları kaydet
export async function syncSettingsToCloud(userId: string, settings: UserSettings): Promise<void> {
  const docRef = getSettingsDocRef(userId);
  await setDoc(docRef, {
    ...settings,
    updatedAt: Timestamp.now(),
  });
}

// Ayarları getir
export async function getSettingsFromCloud(userId: string): Promise<UserSettings | null> {
  const docRef = getSettingsDocRef(userId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      wakeUpTime: data.wakeUpTime ?? '08:00',
      sleepTime: data.sleepTime ?? '23:00',
      notificationSound: data.notificationSound ?? 'default',
      vibrationEnabled: data.vibrationEnabled ?? true,
      fullScreenAlarmEnabled: data.fullScreenAlarmEnabled ?? true,
      language: data.language ?? 'tr',
      alarmSound: data.alarmSound ?? 'alarm',
      alarmVolume: data.alarmVolume ?? 80,
      snoozeDuration: data.snoozeDuration ?? 5,
      quietHoursEnabled: data.quietHoursEnabled ?? false,
      quietHoursStart: data.quietHoursStart ?? '23:00',
      quietHoursEnd: data.quietHoursEnd ?? '07:00',
      alarmModeEnabled: data.alarmModeEnabled ?? true,
      conflictIntervalMinutes: data.conflictIntervalMinutes ?? 10,
    };
  }

  return null;
}

// ============ TAM SENKRONİZASYON ============

export interface SyncData {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  medicineLogs: MedicineLog[];
  settings: UserSettings;
}

// Timeout wrapper fonksiyonu
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ]);
};

// Tüm verileri buluta yükle
export async function uploadAllDataToCloud(userId: string, data: SyncData): Promise<void> {
  log.debug('Veriler buluta yükleniyor');

  try {
    await withTimeout(
      Promise.all([
        syncMedicinesToCloud(userId, data.medicines),
        syncReminderTimesToCloud(userId, data.reminderTimes),
        syncMedicineLogsToCloud(userId, data.medicineLogs),
        syncSettingsToCloud(userId, data.settings),
      ]),
      30000, // 30 saniye timeout
      'Senkronizasyon zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.'
    );

    log.debug('Veriler buluta yüklendi');
  } catch (error: unknown) {
    log.error('Buluta yükleme hatası', error);
    // Offline hatası için özel mesaj
    const errorObj = error as { code?: string; message?: string };
    if (errorObj.code === 'unavailable' || errorObj.message?.includes('offline')) {
      throw new Error('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
    }
    throw error;
  }
}

// Tüm verileri buluttan indir
export async function downloadAllDataFromCloud(userId: string): Promise<SyncData | null> {
  log.debug('Veriler buluttan indiriliyor');

  try {
    const [medicines, reminderTimes, medicineLogs, settings] = await withTimeout(
      Promise.all([
        getMedicinesFromCloud(userId),
        getReminderTimesFromCloud(userId),
        getMedicineLogsFromCloud(userId),
        getSettingsFromCloud(userId),
      ]),
      30000, // 30 saniye timeout
      'Veri indirme zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.'
    );

    // Eğer hiç veri yoksa null döndür
    if (medicines.length === 0 && !settings) {
      log.debug('Bulutta veri bulunamadı');
      return null;
    }

    log.debug('Veriler buluttan indirildi');

    return {
      medicines,
      reminderTimes,
      medicineLogs,
      settings: settings || {
        wakeUpTime: '08:00',
        sleepTime: '23:00',
        notificationSound: 'default',
        vibrationEnabled: true,
        fullScreenAlarmEnabled: true,
        language: 'tr',
        alarmSound: 'alarm',
        alarmVolume: 80,
        snoozeDuration: 5,
        quietHoursEnabled: false,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        alarmModeEnabled: true,
        conflictIntervalMinutes: 10,
      },
    };
  } catch (error: unknown) {
    log.error('Buluttan veri indirme hatası', error);
    // Offline hatası için özel mesaj
    const errorObj = error as { code?: string; message?: string };
    if (errorObj.code === 'unavailable' || errorObj.message?.includes('offline')) {
      throw new Error('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
    }
    throw error;
  }
}

// Kullanıcı verilerini tamamen sil
export async function deleteAllUserData(userId: string): Promise<void> {
  const batch = writeBatch(db);

  // İlaçları sil
  const medicines = await getDocs(getMedicinesRef(userId));
  medicines.forEach(doc => batch.delete(doc.ref));

  // Zamanları sil
  const times = await getDocs(getReminderTimesRef(userId));
  times.forEach(doc => batch.delete(doc.ref));

  // Logları sil
  const logs = await getDocs(getMedicineLogsRef(userId));
  logs.forEach(doc => batch.delete(doc.ref));

  // Ayarları sil
  batch.delete(getSettingsDocRef(userId));

  await batch.commit();
}
