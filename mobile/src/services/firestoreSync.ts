import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  deleteField,
  writeBatch,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Medicine, ReminderTime, MedicineLog, UserSettings } from '../types';
import { createScopedLogger } from '../utils/logger';
// Silme kayitlarinin (tombstone) tek kaynagi — bkz. domain/deletions.ts.
import { normalizeDeletions, type DeletionRegistries } from '../domain/deletions';
// Hangi ayarin buluta gidip gitmedigi TEK KAYNAK: domain/settingsScope.ts
import { DEVICE_LOCAL_SETTING_KEYS, isDeviceLocalSettingKey } from '../domain/settingsScope';
// Sprint 7.2: DRY — stores/helpers/sanitize.ts'ten sanitizeString + sanitizeForFirestore
// import ediliyor. firestoreSync.ts icindeki duplicate inline tanimlar silindi.
import { sanitizeString, sanitizeForFirestore } from '../stores/helpers/sanitize';
// Sprint 8.2: Batch + collection helpers ./firestoreSyncHelpers.ts'te.
// Pure helper'lar (chunkArray, countBatchOperations, calculateBatchCount)
// I/O olmadan test edilebilir.
// Sprint 8.2 + 9.1: Batch + collection + path helpers ./firestoreSyncHelpers.ts'te.
// Sprint 9.1: Inline referans fonksiyonlari (getMedicinesRef vb.) silindi,
// path-only helpers eklendi.
// Sprint 10.1: Firestore referans builder'lari (getMedicinesRef vb.)
// firestoreSyncHelpers'a tasindi.
// Sprint 13.2: Generic ref migration — getMedicinesRef gibi
// singleton-db wrapper'lar, build*CollectionRef(db, userId) generic
// abstraction ile degistirildi (test edilebilirlik + reusable).
import {
  FIRESTORE_BATCH_LIMIT,
  buildMedicinesCollectionRef,
  buildReminderTimesCollectionRef,
  buildMedicineLogsCollectionRef,
  buildSettingsDocRef,
  buildDeletionsDocRef,
} from './firestoreSyncHelpers';
import { db as firestoreDb } from '../config/firebase';

const log = createScopedLogger('FirestoreSync');

function sanitizeMedicine(medicine: Medicine): Medicine {
  return {
    ...medicine,
    name: sanitizeString(medicine.name) || medicine.name,
    dosage: medicine.dosage ? sanitizeString(medicine.dosage) : medicine.dosage,
  };
}

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
  const medicinesRef = buildMedicinesCollectionRef(firestoreDb, userId);

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
  const docRef = doc(buildMedicinesCollectionRef(firestoreDb, userId), medicine.id);
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
  const docRef = doc(buildMedicinesCollectionRef(firestoreDb, userId), medicineId);
  await deleteDoc(docRef);
}

// Tüm ilaçları getir
export async function getMedicinesFromCloud(userId: string): Promise<Medicine[]> {
  const medicinesRef = buildMedicinesCollectionRef(firestoreDb, userId);
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
  const timesRef = buildReminderTimesCollectionRef(firestoreDb, userId);

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
  const timesRef = buildReminderTimesCollectionRef(firestoreDb, userId);
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
  const logsRef = buildMedicineLogsCollectionRef(firestoreDb, userId);

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
  const docRef = doc(buildMedicineLogsCollectionRef(firestoreDb, userId), log.id);
  await setDoc(docRef, sanitizeForFirestore(log as unknown as Record<string, unknown>));
}

// Tüm logları getir
export async function getMedicineLogsFromCloud(userId: string): Promise<MedicineLog[]> {
  const logsRef = buildMedicineLogsCollectionRef(firestoreDb, userId);
  const snapshot = await getDocs(logsRef);

  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  })) as MedicineLog[];
}

// ============ AYARLAR ============

/**
 * Buluttan gelen ayarlar. KISMI'dir: bulut dokumaninda olmayan alanlar
 * yoktur ve birlestirme sirasinda YEREL deger korunur (bkz.
 * `mergeSettingsWithUndefined`). Eskiden burada tam bir `UserSettings`
 * uretiliyordu ve eksik alanlar VARSAYILANLA doldurulup yerel degerleri
 * eziyordu.
 */
export type CloudUserSettings = Partial<UserSettings>;

/**
 * Ayarları buluta yaz.
 *
 * ⚠️ v1.7.2 ONARIM — KORLEMESINE TAM DOKUMAN YAZIMI KALDIRILDI.
 *
 * Eskiden bu fonksiyon her cagrida `setDoc` ile dokumanin TAMAMINI yaziyordu.
 * Indirme yalnizca uygulama acilisinda bir kez yapildigi icin (bkz.
 * `AuthContext`), bir cihaz gunlerce bayat bir yerel kopya tasiyabiliyor;
 * o cihazda TEK bir ayar degistirildiginde dokumanin tamami — yani DIGER
 * cihazin yeni degerleri de — bayat degerlerle EZILIYORDU:
 *
 *   1. Tablet: ses 100 → buluta yazildi.
 *   2. Telefon (o gun hic acilmadi, yerelinde ses hala 80): sessiz saatleri
 *      acti → TUM dokumani yazdi, buluta ses=80 gitti. Tabletin 100'u
 *      buluttan SILINDI.
 *   3. Tablet sonraki acilista indirdi: bulut daha yeni → ses 80'e dondu.
 *
 * Ayni sinif hata TEK cihazda da vardi: temiz kurulum + giristen sonra
 * senkron tamamlanmadan tek bir ayar degistirilirse, dokuman yerel
 * VARSAYILANLARLA komple eziliyordu.
 *
 * Dikkat: bu kayip alan bazli zaman damgasiyla COZULMEZ — bayat deger taze
 * damgayla yazilir. Kok neden damganin cozunurlugu degil, degismeyen
 * alanlarin da yazilmasi. Cozum: yalnizca DEGISEN alanlari `{ merge: true }`
 * ile yazmak.
 *
 * @param settings Yazilacak alanlar. `updateSettings` yalnizca degisen
 *   alanlari geçirir; `uploadAllDataToCloud` ilk tam yukleme icin tam
 *   nesneyi geçirir.
 */
export async function syncSettingsToCloud(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const docRef = buildSettingsDocRef(firestoreDb, userId);

  // ⚠️ v1.7.9 — CIHAZA OZEL ALANLAR SON KAPIDA DA SUZULUR.
  // Cagiranlar (updateSettings, uploadAllDataToCloud) artik suzuyor; burada
  // ikinci bir kapi var cunku bu fonksiyon TEK bulut yazma noktasi ve yeni
  // bir cagiran eklendiginde PIN hash'inin sessizce buluta gitmesi kabul
  // edilemez. Gerekce: src/domain/settingsScope.ts dosya basi.
  //
  // Ayrica ESKI dokumanlarda bu alanlar hala yazili olabilir: `deleteField()`
  // ile acikca TEMIZLENIRLER. Bu, saklanmis bir kimlik dogrulama sirrini
  // buluttan kaldirir.
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (isDeviceLocalSettingKey(key)) continue;
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  for (const key of DEVICE_LOCAL_SETTING_KEYS) {
    payload[key] = deleteField();
  }

  payload.settingsUpdatedAt = settings.settingsUpdatedAt ?? new Date().toISOString();
  payload.updatedAt = Timestamp.now();

  // merge: true → yalnizca `payload`daki alanlar degisir, dokumandaki diger
  // alanlar OLDUGU GIBI kalir.
  await setDoc(docRef, payload, { merge: true });
}

/** Firestore `Timestamp` | ISO string | Date → ISO string */
function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === 'function') {
    try {
      return maybeTimestamp.toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Ayarları getir.
 *
 * ⚠️ v1.7.1 ONARIM — iki gercek kusur vardi:
 *
 * 1. Alanlar TEK TEK sayiliyordu ve listede 13 ayar YOKTU (guvenlik, TTS,
 *    kalici bildirim). Bu ayarlar buluta yukleniyor ama GERI INDIRILMIYORDU:
 *    temiz kurulum + giristen sonra sessizce varsayilana donuyorlardi.
 * 2. Her alan `?? varsayilan` ile donduruluyordu, yani hicbir alan
 *    `undefined` gelmiyordu → `mergeSettingsWithUndefined` icin bulut
 *    KOSULSUZ kaziniyordu. Artik yalnizca dokumanda GERCEKTEN bulunan
 *    alanlar donuyor ve `settingsUpdatedAt` damgasi da tasiniyor.
 */
export async function getSettingsFromCloud(userId: string): Promise<CloudUserSettings | null> {
  const docRef = buildSettingsDocRef(firestoreDb, userId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // `updatedAt` bir Firestore Timestamp'i; UserSettings alani degil.
    if (key === 'updatedAt' || key === 'settingsUpdatedAt') continue;
    if (value === undefined || value === null) continue;
    result[key] = value;
  }

  const stamp = toIsoString(data.settingsUpdatedAt) ?? toIsoString(data.updatedAt);
  if (stamp) {
    result.settingsUpdatedAt = stamp;
  }

  return result as CloudUserSettings;
}

// ============ TAM SENKRONİZASYON ============

export interface SyncData {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  medicineLogs: MedicineLog[];
  settings: UserSettings;
  /**
   * Silme kayitlari (tombstone). v1.7.8'de eklendi — bkz.
   * `src/domain/deletions.ts`: bu olmadan bir cihazda silinen ilac digerinde
   * hayatta kaliyor ve alarmlariyla geri geliyordu.
   */
  deletions?: DeletionRegistries;
}

/**
 * INDIRME sonucu. `SyncData`dan tek farki: ayarlar KISMI'dir. Yukleme tam bir
 * `UserSettings` gonderir, indirme ise bulutta gercekten yazili olani dondurur
 * — bu ayrim olmadan eksik bulut alanlari yerel degerleri eziyordu.
 */
export interface CloudSyncData extends Omit<SyncData, 'settings'> {
  settings: CloudUserSettings;
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
        // v1.7.8: silme kayitlari da yuklenir; yoksa diger cihaz silinen
        // ilaci geri diriltir (bkz. domain/deletions.ts).
        syncDeletionsToCloud(userId, data.deletions ?? { medicines: {}, reminderTimes: {} }),
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

// ============ SILME KAYITLARI (TOMBSTONE) ============

/**
 * Silme kayitlarini buluta yaz.
 *
 * `{ merge: true }` ZORUNLU: iki cihaz farkli id'ler silmis olabilir ve tam
 * dokuman yazimi digerinin kaydini siler (ayni hata `syncSettingsToCloud`
 * icin v1.7.3'te duzeltildi).
 */
export async function syncDeletionsToCloud(
  userId: string,
  deletions: DeletionRegistries
): Promise<void> {
  const docRef = buildDeletionsDocRef(firestoreDb, userId);
  await setDoc(
    docRef,
    {
      medicines: deletions.medicines || {},
      reminderTimes: deletions.reminderTimes || {},
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

/** Silme kayitlarini buluttan oku. Dokuman yoksa BOS kayit doner. */
export async function getDeletionsFromCloud(userId: string): Promise<DeletionRegistries> {
  const docRef = buildDeletionsDocRef(firestoreDb, userId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return { medicines: {}, reminderTimes: {} };
  return normalizeDeletions(snapshot.data());
}

// Tüm verileri buluttan indir
export async function downloadAllDataFromCloud(userId: string): Promise<CloudSyncData | null> {
  log.debug('Veriler buluttan indiriliyor');

  try {
    const [medicines, reminderTimes, medicineLogs, settings, deletions] = await withTimeout(
      Promise.all([
        getMedicinesFromCloud(userId),
        getReminderTimesFromCloud(userId),
        getMedicineLogsFromCloud(userId),
        getSettingsFromCloud(userId),
        // v1.7.8: silme kayitlari. Okunamazsa BOS kabul edilir — silme
        // bilgisini kaybetmek dirilme demektir, ama patlamak senkronu
        // tamamen durdurur; bos kayit eski (hatali) davranisa dener.
        getDeletionsFromCloud(userId).catch(() => ({ medicines: {}, reminderTimes: {} })),
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
      // Bulutta ayar dokumani YOKSA bos nesne doner: birlestirmede YEREL
      // ayarlar aynen korunur. Eskiden `DEFAULT_SETTINGS` donuyordu ve
      // kullanicinin yerel ayarlarini varsayilanlarla eziyordu.
      settings: settings ?? {},
      deletions,
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
  const medicines = await getDocs(buildMedicinesCollectionRef(firestoreDb, userId));
  await deleteDocumentsInBatches(medicines.docs);

  // Zamanları sil
  const times = await getDocs(buildReminderTimesCollectionRef(firestoreDb, userId));
  await deleteDocumentsInBatches(times.docs);

  // Logları sil
  const logs = await getDocs(buildMedicineLogsCollectionRef(firestoreDb, userId));
  await deleteDocumentsInBatches(logs.docs);

  // Ayarları sil
  await deleteDoc(buildSettingsDocRef(firestoreDb, userId));
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
