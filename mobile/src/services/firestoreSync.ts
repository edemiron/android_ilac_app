import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Medicine, ReminderTime, MedicineLog, UserSettings } from '../types';
import { createScopedLogger } from '../utils/logger';
// Sprint 7.2: DRY — stores/helpers/sanitize.ts'ten sanitizeString + sanitizeForFirestore
// import ediliyor. firestoreSync.ts icindeki duplicate inline tanimlar silindi.
import { sanitizeString, sanitizeForFirestore } from '../stores/helpers/sanitize';
// Sprint 8.2: Batch + collection helpers ./firestoreSyncHelpers.ts'te.
// Pure helper'lar (chunkArray, countBatchOperations, calculateBatchCount)
// I/O olmadan test edilebilir.
// Sprint 8.2 + 9.1: Batch + collection + path helpers ./firestoreSyncHelpers.ts'te.
// Sprint 9.1: Inline referans fonksiyonlari (getMedicinesRef vb.) silindi,
// path-only helpers eklendi.
import { FIRESTORE_BATCH_LIMIT, COLLECTIONS, SETTINGS_DOCUMENT_ID } from './firestoreSyncHelpers';

const log = createScopedLogger('FirestoreSync');

function sanitizeMedicine(medicine: Medicine): Medicine {
  return {
    ...medicine,
    name: sanitizeString(medicine.name) || medicine.name,
    dosage: medicine.dosage ? sanitizeString(medicine.dosage) : medicine.dosage,
  };
}

// Collection isimleri

// Kullanıcı doküman referansı
// eslint-disable-next-line unused-imports/no-unused-vars
const getUserDocRef = (userId: string) => doc(db, COLLECTIONS.USERS, userId);

// Alt koleksiyon referansları (Sprint 9.1 — inline kaldirildi ama
// collection/ doc API'lar db instance'i bekledigi icin helpers.ts'de
// implement edilemedi. Sprint 10'da Firestore DocumentReference generic
// abstraction ile pure helper'a tasinabilir.)
const getMedicinesRef = (userId: string) =>
  collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEDICINES);

const getReminderTimesRef = (userId: string) =>
  collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.REMINDER_TIMES);

const getMedicineLogsRef = (userId: string) =>
  collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEDICINE_LOGS);

const getSettingsDocRef = (userId: string) =>
  doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.SETTINGS, SETTINGS_DOCUMENT_ID);

/**
 * Batch işlemleri için yardımcı fonksiyon
 * Firestore'un 500'lük limitini aşmamak için bölerek işler
 */
async function executeBatches(
  operations: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: unknown }>
): Promise<void> {
  // 500'lük gruplar halinde işle
  for (let i = 0; i < operations.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = operations.slice(i, i + FIRESTORE_BATCH_LIMIT);

    chunk.forEach(op => {
      if (op.type === 'set' && op.data) {
        batch.set(op.ref, op.data);
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    });

    await batch.commit();
    log.debug(`Batch işlemi tamamlandı: ${chunk.length} operasyon`);
  }
}

// ============ İLAÇLAR ============

/**
 * İlaçları buluta senkronize et
 * STRATEJI: Sil-tümünü-ekle yerine, sadece değişenleri güncelle
 * Bu veri kaybı riskini ortadan kaldırır
 */
export async function syncMedicinesToCloud(userId: string, medicines: Medicine[]): Promise<void> {
  const medicinesRef = getMedicinesRef(userId);

  // Mevcut verileri çek
  const existingSnapshot = await getDocs(medicinesRef);
  const existingDocs = new Map(existingSnapshot.docs.map(d => [d.id, d]));
  const newIds = new Set(medicines.map(m => m.id));

  const operations: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: unknown }> =
    [];

  // Silinmiş ilaçları bul ve silme operasyonu ekle
  existingDocs.forEach((docSnapshot, id) => {
    if (!newIds.has(id)) {
      operations.push({ type: 'delete', ref: docSnapshot.ref });
    }
  });

  // Ekle/Güncelle operasyonları
  medicines.forEach(medicine => {
    const docRef = doc(medicinesRef, medicine.id);
    const existing = existingDocs.get(medicine.id);

    // Sadece değişmişse veya yeni ise güncelle
    if (!existing || JSON.stringify(existing.data()) !== JSON.stringify(medicine)) {
      operations.push({
        type: 'set',
        ref: docRef,
        data: {
          ...sanitizeForFirestore(medicine as unknown as Record<string, unknown>),
          updatedAt: Timestamp.now(),
        },
      });
    }
  });

  if (operations.length > 0) {
    await executeBatches(operations);
    log.debug(`${operations.length} ilaç senkronize edildi`);
  } else {
    log.debug('Değişiklik yok, senkronizasyon atlandı');
  }
}

/**
 * İlaç kaydedildikten sonra cloud'dan dönen metadata.
 * Sprint 4 (medicineStore slice): `saveMedicineToCloud` artik bu tipi
 * donduruyor; `applySavedMedicineCloudData` ile local state'e uygulanir.
 */
export interface SavedMedicineCloudData {
  updatedAt?: string;
  clearLocalImage?: boolean;
  localImageUri?: string | null;
  imageStoragePath?: string | null;
  imageMimeType?: string | null;
  imageSize?: number;
  imageUpdatedAt?: string | null;
}

// Tek bir ilaç kaydet. Cloud response metadata'sini doner (Sprint 4).
export async function saveMedicineToCloud(
  userId: string,
  medicine: Medicine
): Promise<SavedMedicineCloudData> {
  const docRef = doc(getMedicinesRef(userId), medicine.id);
  const updatedAt = new Date().toISOString();
  await setDoc(docRef, {
    ...sanitizeForFirestore(medicine as unknown as Record<string, unknown>),
    updatedAt: Timestamp.now(),
  });

  // Cloud response: image metadata'sini doner. Local image
  // upload islemi (medicineStore tarafindan tetiklenir) burada
  // yapiyor olurdu — Sprint 4 sonrasi integration.
  return {
    updatedAt,
    clearLocalImage: false,
    localImageUri: medicine.imageUri,
    imageStoragePath: medicine.imageStoragePath,
    imageMimeType: medicine.imageMimeType,
    imageSize: medicine.imageSize,
    imageUpdatedAt: medicine.imageUpdatedAt,
  };
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

/**
 * Hatırlatma zamanlarını buluta senkronize et
 * STRATEJI: Artımlı güncelleme (incremental sync)
 */
export async function syncReminderTimesToCloud(
  userId: string,
  reminderTimes: ReminderTime[]
): Promise<void> {
  const timesRef = getReminderTimesRef(userId);

  // Mevcut verileri çek
  const existingSnapshot = await getDocs(timesRef);
  const existingDocs = new Map(existingSnapshot.docs.map(d => [d.id, d]));
  const newIds = new Set(reminderTimes.map(t => t.id));

  const operations: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: unknown }> =
    [];

  // Silinmiş zamanları bul
  existingDocs.forEach((docSnapshot, id) => {
    if (!newIds.has(id)) {
      operations.push({ type: 'delete', ref: docSnapshot.ref });
    }
  });

  // Ekle/Güncelle
  reminderTimes.forEach(time => {
    const docRef = doc(timesRef, time.id);
    const existing = existingDocs.get(time.id);

    if (!existing || JSON.stringify(existing.data()) !== JSON.stringify(time)) {
      operations.push({
        type: 'set',
        ref: docRef,
        data: sanitizeForFirestore(time as unknown as Record<string, unknown>),
      });
    }
  });

  if (operations.length > 0) {
    await executeBatches(operations);
  }
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

/**
 * İlaç loglarını buluta senkronize et
 * STRATEJI: Son 30 gün + sadece değişenler
 */
export async function syncMedicineLogsToCloud(userId: string, logs: MedicineLog[]): Promise<void> {
  const logsRef = getMedicineLogsRef(userId);

  // Son 30 günlük logları filtrele
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentLogs = logs.filter(log => new Date(log.scheduledTime) >= thirtyDaysAgo);

  // Mevcut verileri çek
  const existingSnapshot = await getDocs(logsRef);
  const existingDocs = new Map(existingSnapshot.docs.map(d => [d.id, d]));
  const newIds = new Set(recentLogs.map(l => l.id));

  const operations: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: unknown }> =
    [];

  // Silinmiş logları bul
  existingDocs.forEach((docSnapshot, id) => {
    if (!newIds.has(id)) {
      operations.push({ type: 'delete', ref: docSnapshot.ref });
    }
  });

  // Ekle/Güncelle
  recentLogs.forEach(log => {
    const docRef = doc(logsRef, log.id);
    const existing = existingDocs.get(log.id);

    if (!existing || JSON.stringify(existing.data()) !== JSON.stringify(log)) {
      operations.push({
        type: 'set',
        ref: docRef,
        data: sanitizeForFirestore(log as unknown as Record<string, unknown>),
      });
    }
  });

  if (operations.length > 0) {
    await executeBatches(operations);
  }
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
      // Sprint 1: 'as UserSettings' cast — Firestore'dan gelen data tüm
      // UserSettings alanlarını içermeyebilir. Default değerlerle birlikte
      // döndürüyoruz; eksik alanlar varsa uygulamanın default'ları geçerli.
      wakeUpTime: data.wakeUpTime ?? '08:00',
      sleepTime: data.sleepTime ?? '23:00',
      notificationSound: data.notificationSound ?? 'default',
      vibrationEnabled: data.vibrationEnabled ?? true,
      fullScreenAlarmEnabled: data.fullScreenAlarmEnabled ?? true,
      language: data.language ?? 'tr',
      alarmSound: data.alarmSound ?? 'alarm',
      alarmVolume: data.alarmVolume ?? 80,
      snoozeDuration: data.snoozeDuration ?? 5,
      maxSnoozeCount: data.maxSnoozeCount ?? 3,
      quietHoursEnabled: data.quietHoursEnabled ?? false,
      quietHoursStart: data.quietHoursStart ?? '23:00',
      quietHoursEnd: data.quietHoursEnd ?? '07:00',
      alarmModeEnabled: data.alarmModeEnabled ?? true,
      conflictIntervalMinutes: data.conflictIntervalMinutes ?? 10,
    } as UserSettings;
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

// Varsayılan ayarlar (merkezi tanım)
const DEFAULT_SETTINGS: UserSettings = {
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
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  alarmModeEnabled: true,
  conflictIntervalMinutes: 10,
  // Güvenlik ayarları
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
  persistentNotificationEnabled: true,
  persistentNotificationDuration: 60,
};

/**
 * Timeout wrapper fonksiyonu - memory leak'i önler
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    }),
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
      settings: settings || DEFAULT_SETTINGS,
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

/**
 * Kullanıcı verilerini tamamen sil
 * 500'lük batch limitine dikkat ederek
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  // İlaçları sil
  const medicines = await getDocs(getMedicinesRef(userId));
  await deleteDocumentsInBatches(medicines.docs);

  // Zamanları sil
  const times = await getDocs(getReminderTimesRef(userId));
  await deleteDocumentsInBatches(times.docs);

  // Logları sil
  const logs = await getDocs(getMedicineLogsRef(userId));
  await deleteDocumentsInBatches(logs.docs);

  // Ayarları sil
  await deleteDoc(getSettingsDocRef(userId));
}

/**
 * Dokümanları batch limitine göre gruplar halinde sil
 */
async function deleteDocumentsInBatches(docs: QueryDocumentSnapshot[]): Promise<void> {
  for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT);

    chunk.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });

    await batch.commit();
    log.debug(`${chunk.length} doküman silindi`);
  }
}
