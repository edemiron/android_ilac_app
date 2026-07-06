/**
 * medicineStore pure helper'lari.
 *
 * Sprint 21.2: medicineStore.ts (1737 satir) icindeki hesaplama logic'i pure
 * fonksiyonlara ayristirildi. State/hook bagimliligi yok, test edilebilir.
 *
 * Not: Bu fonksiyonlar store'dan bagimsiz calisir; state parametre olarak alir.
 */

import { format } from 'date-fns';
import type { AlarmState, Medicine, MedicineLog, ReminderTime, UserSettings } from '../types';
import { normalizeMedicineLogsBySlot } from './helpers/medicineLogs';

/**
 * Belirli bir tarih icin yyyy-MM-dd formatinda string.
 */
export function getDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Belirli bir zaman icin HH:mm formatinda string.
 */
export function getTimeString(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Su anki aktif ilac ID'lerini getir (Set olarak — O(1) lookup).
 */
export function getActiveMedicineIds(medicines: Medicine[]): Set<string> {
  return new Set(medicines.filter(m => m.isActive).map(m => m.id));
}

/**
 * Aktif ilaclarin aktif hatirlatma sayisini hesapla.
 */
export function getActiveReminderCount(
  medicines: Medicine[],
  reminderTimes: ReminderTime[]
): number {
  const activeIds = getActiveMedicineIds(medicines);
  return reminderTimes.filter(rt => activeIds.has(rt.medicineId) && rt.isEnabled).length;
}

/**
 * N günlük uyum oranini hesapla (0-100).
 *
 * Mantik:
 * - Aktif ilac yoksa 100 (sorun yok)
 * - Son N gun icinde log yoksa: gecmis hatirlatma varsa 0 (log yok), yoksa 100
 * - Log varsa: alinan log yuzdesi
 */
export function calculateAdherenceRate(
  medicineLogs: MedicineLog[],
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  days: number = 7,
  now: Date = new Date()
): number {
  const activeReminderCount = getActiveReminderCount(medicines, reminderTimes);
  if (activeReminderCount === 0) return 100;

  const normalizedLogs = normalizeMedicineLogsBySlot(medicineLogs);
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const recentLogs = normalizedLogs.filter(log => new Date(log.scheduledTime) >= startDate);

  if (recentLogs.length === 0) {
    const activeIds = getActiveMedicineIds(medicines);
    const currentTime = getTimeString(now);
    const hasPastReminderToday = reminderTimes.some(rt => {
      if (!activeIds.has(rt.medicineId) || !rt.isEnabled) return false;
      return rt.time < currentTime;
    });
    return hasPastReminderToday ? 0 : 100;
  }

  const takenCount = recentLogs.filter(log => log.status === 'taken').length;
  return Math.round((takenCount / recentLogs.length) * 100);
}

/**
 * Mevcut streak (ardisik "hepsi alindi" gun sayisi) hesapla.
 *
 * O(n + 365) — normalizeMedicineLogsBySlot O(n), sonra indexleyerek O(365 * avg)
 * toplamda O(n). Bugun dahil, bugunun hepsi alinmissa dahil edilir.
 */
export function calculateCurrentStreak(
  medicineLogs: MedicineLog[],
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  now: Date = new Date()
): number {
  if (getActiveReminderCount(medicines, reminderTimes) === 0) return 0;

  const normalizedLogs = normalizeMedicineLogsBySlot(medicineLogs);
  const activeIds = getActiveMedicineIds(medicines);

  // Index by date (yyyy-MM-dd) for O(1) lookups
  const logsByDate = new Map<string, MedicineLog[]>();
  for (const log of normalizedLogs) {
    if (!activeIds.has(log.medicineId)) continue;
    const dateStr = log.scheduledTime.slice(0, 10);
    const list = logsByDate.get(dateStr);
    if (list) {
      list.push(log);
    } else {
      logsByDate.set(dateStr, [log]);
    }
  }

  let streak = 0;
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(todayMidnight);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = getDateString(checkDate);

    const dayLogs = logsByDate.get(dateStr) || [];
    if (dayLogs.length === 0) {
      if (i === 0) continue;
      break;
    }

    const allTaken = dayLogs.every(log => log.status === 'taken');
    if (!allTaken) break;

    streak++;
  }

  return streak;
}

/**
 * Dusuk stoklu aktif ilaclari filtrele.
 */
export function filterLowStockMedicines(medicines: Medicine[]): Medicine[] {
  return medicines.filter(m => {
    if (!m.isActive || !m.stockEnabled) return false;
    const threshold = m.stockThreshold ?? 5;
    return (m.stockCount ?? 0) <= threshold;
  });
}

/**
 * Belirli bir (medicineId, reminderTimeId, originalScheduledTime) icin
 * aktif snooze sayisini hesapla. createSnooze icin kullanilir; max snooze
 * kontrolu oncesi mevcut sayiya ihtiyac duyar.
 */
export function countActiveSnoozes(
  snoozes: {
    medicineId: string;
    reminderTimeId: string;
    originalScheduledTime: string;
    isActive: boolean;
  }[],
  medicineId: string,
  reminderTimeId: string,
  originalScheduledTime: string
): number {
  return snoozes.filter(
    s =>
      s.medicineId === medicineId &&
      s.reminderTimeId === reminderTimeId &&
      s.originalScheduledTime === originalScheduledTime &&
      s.isActive
  ).length;
}

/**
 * Notification ID'leri uniq hale getir (kume ile deduplication).
 * runNotificationSelfHeal icindeki orphan + legacy snooze ID birlestirmesi
 * tekrar onlemek icin kullanilir.
 */
export function uniqueNotificationIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * Bugun icin verilen (medicineId, reminderTime) ikilisinin aktif snooze listesini getir.
 * _cleanupNotifications helper'i icin kullanilir.
 */
export function getActiveSnoozesForReminder<
  T extends { medicineId: string; reminderTimeId: string; isActive: boolean },
>(snoozes: T[], medicineId: string, reminderTimeId: string): T[] {
  return snoozes.filter(
    s => s.medicineId === medicineId && s.reminderTimeId === reminderTimeId && s.isActive
  );
}

/**
 * Su anki zamanin ISO string hali (lastSyncAt, updatedAt, createdAt icin).
 * medicineStore.ts icinde 10+ yerde tekrar eden `new Date().toISOString()` yerine.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Bir medicine listesinde, belirli ID ile eslesen ilacin partial guncellenmis
 * halini uretir (updatedAt'i otomatik set eder). Redux/zustand `set(state => ...)`
 * callback'leri icin kullanisli helper.
 */
export function updateMedicineInList<T extends { id: string; updatedAt: string }>(
  medicines: T[],
  id: string,
  patch: Partial<Omit<T, 'id' | 'updatedAt'>>
): T[] {
  const now = nowISO();
  return medicines.map(m => (m.id === id ? { ...m, ...patch, updatedAt: now } : m));
}

/**
 * Yeni medicine eklemek icin standard createdAt + updatedAt zaman damgalari olustur.
 */
export function createMedicineTimestamps(): { createdAt: string; updatedAt: string } {
  const now = nowISO();
  return { createdAt: now, updatedAt: now };
}

/**
 * syncToCloud / syncFromCloud / cloud batch islemlerinin ortak "success + lastSyncAt
 * guncelleme" set islemi. Tekrarlanan 4-luk blok halinde inline yazilirdi.
 */
export function buildSyncSuccessPatch(now: string = nowISO()): {
  isSyncing: false;
  lastSyncAt: string;
  syncError: null;
} {
  return {
    isSyncing: false,
    lastSyncAt: now,
    syncError: null,
  };
}

/**
 * AsyncStorage key listesi — clearAllData icin gerekli 3 storage key.
 * Inline array olarak inline yazilirdi; helper'a cikarildi.
 */
export const MEDICINE_STORE_STORAGE_KEYS = [
  'medicine-store',
  'medicine-store-sync-queue',
  '@medicine_storage',
] as const;

/**
 * Notification self-heal "no drift" durumunda donecek sonuc. Pure data shape.
 * recordDiagnosticEvent + return shape'i bu helper'a delege edildi.
 */
export function buildSelfHealNoDriftResult<T extends object>(
  driftReport: T,
  cleanedStaleSnoozeCount: number
): T & {
  repaired: boolean;
  cancelledNotificationIds: string[];
  snoozeNotificationUpdates: unknown[];
} {
  return {
    ...driftReport,
    repaired: cleanedStaleSnoozeCount > 0,
    cancelledNotificationIds: [],
    snoozeNotificationUpdates: [],
  };
}

/**
 * Drift repair sonrasi diagnostic event context'i olusturur. Tum ID listelerinin
 * length'i + cancel count + cleaned snooze count + update count.
 */
export function buildSelfHealRepairContext(
  missingIds: readonly string[],
  configDriftIds: readonly string[],
  orphanIds: readonly string[],
  legacyIds: readonly string[],
  cancelledCount: number,
  cleanedStaleSnoozeCount: number,
  snoozeUpdateCount: number
): {
  missingCount: number;
  configDriftCount: number;
  orphanCount: number;
  legacySnoozeCount: number;
  cancelledCount: number;
  cleanedStaleSnoozeCount: number;
  snoozeUpdateCount: number;
} {
  return {
    missingCount: missingIds.length,
    configDriftCount: configDriftIds.length,
    orphanCount: orphanIds.length,
    legacySnoozeCount: legacyIds.length,
    cancelledCount,
    cleanedStaleSnoozeCount,
    snoozeUpdateCount,
  };
}

/**
 * AsyncStorage.multiRemove icin verilen key listesinin Promise.all wrapper'i.
 * clearAllData icindeki try/catch zincirini bu helper basitlestirir.
 *
 * NOT: Bu helper Promise doner; hata durumunda reject eder. Side-effect
 * (AsyncStorage.multiRemove) burada delegate edildi, pure logic (key list)
 * MEDICINE_STORE_STORAGE_KEYS icinde zaten pure.
 */
export function getMedicineStoreStorageKeysForRemoval(): readonly string[] {
  return MEDICINE_STORE_STORAGE_KEYS;
}

/**
 * clearAllData icindeki step 5 state reset blogu (7 alan). Pure data shape helper'i.
 * DEFAULT_USER_SETTINGS ve DEFAULT_ALARM_STATE'a baska dosyalardan referans olur,
 * bu nedenle sadece helper ile 7 alanlik obje literali temizlenir.
 */
export function buildEmptyMedicineStoreState(
  defaultAlarmState: AlarmState,
  defaultUserSettings: UserSettings
): {
  medicines: never[];
  reminderTimes: never[];
  medicineLogs: never[];
  snoozes: never[];
  alarmState: AlarmState;
  settings: UserSettings;
  lastSyncAt: null;
} {
  return {
    medicines: [] as never[],
    reminderTimes: [] as never[],
    medicineLogs: [] as never[],
    snoozes: [] as never[],
    alarmState: defaultAlarmState,
    settings: defaultUserSettings,
    lastSyncAt: null,
  };
}

/**
 * importData icindeki 4-alanset state'i (medicines, reminderTimes, medicineLogs,
 * settings + lastSyncAt). Pure data shape helper.
 */
export function buildValidatedSyncState<TMedicine, TReminder, TLog, TSettings>(data: {
  medicines: TMedicine[];
  reminderTimes: TReminder[];
  medicineLogs: TLog[];
  settings: TSettings;
}) {
  return {
    medicines: data.medicines,
    reminderTimes: data.reminderTimes,
    medicineLogs: data.medicineLogs,
    settings: data.settings,
    lastSyncAt: nowISO(),
  };
}

/**
 * ID ile eslesen ilaci listeden bulur. 7+ yerde tekrar eden inline
 * `medicines.find(m => m.id === id)` pattern'i helper'a cikarildi.
 */
export function findMedicineById<T extends { id: string }>(
  medicines: T[],
  id: string | null | undefined
): T | undefined {
  if (!id) return undefined;
  return medicines.find(m => m.id === id);
}

/**
 * ID ile eslesen ilaci listeden cikarir. deleteMedicine icin inline
 * `state.medicines.filter(m => m.id !== id)` pattern'i.
 */
export function removeMedicineById<T extends { id: string }>(medicines: T[], id: string): T[] {
  return medicines.filter(m => m.id !== id);
}

/**
 * ID listesine gore ilaclari filtreler (bulk delete / toplu silme).
 */
export function filterMedicinesByIds<T extends { id: string }>(
  medicines: T[],
  ids: readonly string[]
): T[] {
  const idSet = new Set(ids);
  return medicines.filter(m => !idSet.has(m.id));
}

/**
 * ID ile eslesen snooze'u deaktif eder. deactivateSnooze/deactivateSnoozesForMedicine
 * icin inline `snoozes.map(s => s.id === snoozeId ? {...s, isActive: false} : s)`
 * pattern'i helper'a cikarildi.
 */
export function deactivateSnoozeById<T extends { id: string; isActive: boolean }>(
  snoozes: T[],
  snoozeId: string
): T[] {
  return snoozes.map(s => (s.id === snoozeId ? { ...s, isActive: false } : s));
}

/**
 * Belirli bir medicine'a ait tum snooze'lari deaktif eder.
 * Inline `snoozes.map(s => s.medicineId === medicineId ? {...s, isActive: false} : s)`
 * pattern'i helper'a cikarildi.
 */
export function deactivateSnoozesForMedicine<T extends { medicineId: string; isActive: boolean }>(
  snoozes: T[],
  medicineId: string
): T[] {
  return snoozes.map(s => (s.medicineId === medicineId ? { ...s, isActive: false } : s));
}

/**
 * Belirli (medicineId, reminderTimeId) icin aktif snooze bulur.
 * getActiveSnooze wrapper'i icin kullanilir.
 */
export function findActiveSnoozeForReminder<
  T extends { medicineId: string; reminderTimeId: string; isActive: boolean },
>(snoozes: T[], medicineId: string, reminderTimeId: string): T | undefined {
  return snoozes.find(
    s => s.medicineId === medicineId && s.reminderTimeId === reminderTimeId && s.isActive
  );
}

/**
 * Notification ID ile eslesen aktif snooze bulur.
 * getSnoozeByNotificationId wrapper'i icin.
 */
export function findActiveSnoozeByNotificationId<
  T extends { notificationId: string; isActive: boolean },
>(snoozes: T[], notificationId: string): T | undefined {
  return snoozes.find(s => s.notificationId === notificationId && s.isActive);
}

/**
 * Belirli bir ilaca ait ReminderTime listesini saat siralamasina gore getirir.
 * getReminderTimesForMedicine wrapper'i icin.
 */
export function getReminderTimesForMedicinePure<T extends { medicineId: string; time: string }>(
  reminderTimes: T[],
  medicineId: string
): T[] {
  return reminderTimes
    .filter(rt => rt.medicineId === medicineId)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * ID ile eslesen ReminderTime bulur. _createMedicineLog icindeki inline
 * `reminderTimes.find(rt => rt.id === reminderTimeId)` pattern'i helper'a cikarildi.
 */
export function findReminderTimeById<T extends { id: string }>(
  reminderTimes: T[],
  reminderTimeId: string | null | undefined
): T | undefined {
  if (!reminderTimeId) return undefined;
  return reminderTimes.find(rt => rt.id === reminderTimeId);
}

/**
 * Belirli medicineId'ye ait reminder time'lari filtreler. regenerateReminderTimes
 * icindeki inline `reminderTimes.filter(rt => rt.medicineId === medicineId)` /
 * `reminderTimes.filter(rt => rt.medicineId !== medicineId)` pattern'i helper'a cikarildi.
 */
export function filterReminderTimesByMedicine<T extends { medicineId: string }>(
  reminderTimes: T[],
  medicineId: string,
  exclude: boolean = false
): T[] {
  return reminderTimes.filter(rt => {
    const match = rt.medicineId === medicineId;
    return exclude ? !match : match;
  });
}

/**
 * Aktif ilaclari filtreler. medicineStore.ts'te `useActiveMedicines` ve
 * `state.medicines.filter(m => m.isActive)` pattern'i icin.
 */
export function filterActiveMedicines<T extends { isActive: boolean }>(medicines: T[]): T[] {
  return medicines.filter(m => m.isActive);
}

/**
 * Pasif ilaclari filtreler. medicineStore.ts'te `state.medicines.filter(m => !m.isActive)`
 * pattern'i icin.
 */
export function filterInactiveMedicines<T extends { isActive: boolean }>(medicines: T[]): T[] {
  return medicines.filter(m => !m.isActive);
}

/**
 * Belirli medicine'a ait aktif ilac var mi kontrol eder. medicineStore.ts'te
 * `medicines.some(m => m.id === ... && m.isActive)` pattern'i icin.
 */
export function hasActiveMedicineById<T extends { id: string; isActive: boolean }>(
  medicines: T[],
  medicineId: string
): boolean {
  return medicines.some(m => m.id === medicineId && m.isActive);
}

/**
 * MedicineLog base object olusturur. _createMedicineLog icindeki inline
 * baseLog + takenAt ekleme pattern'i helper'a cikarildi.
 */
export function buildMedicineLogBase(
  medicineId: string,
  reminderTimeId: string,
  scheduledTime: string,
  status: 'taken' | 'skipped',
  note?: string
): Omit<import('../types').MedicineLog, 'takenAt'> {
  return {
    id: '', // Caller override eder (generateId())
    medicineId,
    reminderTimeId,
    scheduledTime,
    status,
    note,
  };
}

/**
 * 'taken' durumunda takenAt ekler; diger statusler icin base'i doner.
 */
export function withTakenAt<T extends { takenAt?: string }>(
  base: T,
  status: 'taken' | 'skipped',
  now: string = nowISO()
): T {
  return status === 'taken' ? { ...base, takenAt: now } : base;
}

/**
 * Alarm/notification ID template helper. `_cleanupNotifications` icindeki inline
 * `alarm-${medicineId}-${reminderTimeId}` template literal helper'a cikarildi.
 */
export function buildAlarmNotificationId(medicineId: string, reminderTimeId: string): string {
  return `alarm-${medicineId}-${reminderTimeId}`;
}
