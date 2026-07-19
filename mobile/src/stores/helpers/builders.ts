/**
 * Builder + Utility helpers (12).
 *
 * Sprint 34.1: medicineStoreHelpers.ts 5 alt moduleye bolundu. Bu dosya
 * Builder (8) ve Utility (4) kategorilerini icerir.
 */

import type { AlarmState, MedicineLog, UserSettings } from '../../types';
import type { RescheduledSnoozeNotification } from './reschedule';
import { nowISO } from './dateTime';

// =====================================================================
// BUILDER HELPERS
// =====================================================================

/**
 * Yeni medicine eklemek icin standard createdAt + updatedAt zaman damgalari olusturur.
 */
export function createMedicineTimestamps(): { createdAt: string; updatedAt: string } {
  const now = nowISO();
  return { createdAt: now, updatedAt: now };
}

/**
 * syncToCloud / syncFromCloud / cloud batch islemlerinin ortak "success +
 * lastSyncAt guncelleme" set islemi.
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
 * clearAllData icindeki step 5 state reset blogu (7 alan).
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
 * importData icindeki 4-alanset state'i (medicines, reminderTimes,
 * medicineLogs, settings + lastSyncAt).
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
 * MedicineLog base object olusturur.
 */
export function buildMedicineLogBase(
  medicineId: string,
  reminderTimeId: string,
  scheduledTime: string,
  status: 'taken' | 'skipped',
  note?: string
): Omit<MedicineLog, 'takenAt'> {
  return {
    id: '',
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
export function withTakenAt<T extends object>(
  base: T,
  status: 'taken' | 'skipped',
  now: string = nowISO()
): T & { takenAt?: string } {
  return status === 'taken' ? { ...base, takenAt: now } : (base as T & { takenAt?: string });
}

/**
 * Alarm/notification ID template helper. _cleanupNotifications icindeki inline
 * `alarm-${medicineId}-${reminderTimeId}` template literal helper'a cikarildi.
 */
export function buildAlarmNotificationId(medicineId: string, reminderTimeId: string): string {
  return `alarm-${medicineId}-${reminderTimeId}`;
}

/**
 * "No drift" self-heal early return shape.
 */
export function buildSelfHealNoDriftResult<T extends object>(
  driftReport: T,
  cleanedStaleSnoozeCount: number
): T & {
  repaired: boolean;
  cancelledNotificationIds: string[];
  snoozeNotificationUpdates: RescheduledSnoozeNotification[];
} {
  return {
    ...driftReport,
    repaired: cleanedStaleSnoozeCount > 0,
    cancelledNotificationIds: [],
    snoozeNotificationUpdates: [],
  };
}

/**
 * 7 sayisal alan iceren self-heal diagnostic event context olusturur.
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

// =====================================================================
// UTILITY HELPERS
// =====================================================================

/**
 * Notification ID'leri uniq hale getirir (kume ile deduplication).
 */
export function uniqueNotificationIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * Belirli bir sart icin count verir. Kisa generic helper.
 */
export function countWhere<T>(items: T[], predicate: (item: T) => boolean): number {
  let count = 0;
  for (const item of items) {
    if (predicate(item)) count++;
  }
  return count;
}

/**
 * AsyncStorage key listesi — clearAllData icin gerekli 3 storage key.
 */
export const MEDICINE_STORE_STORAGE_KEYS = [
  'medicine-store',
  'medicine-store-sync-queue',
  '@medicine_storage',
] as const;

/**
 * AsyncStorage.multiRemove icin verilen key listesinin Promise.all wrapper'i.
 */
export function getMedicineStoreStorageKeysForRemoval(): readonly string[] {
  return MEDICINE_STORE_STORAGE_KEYS;
}

/**
 * Caregiver notification batch args olusturur. markMissedReminders icindeki
 * inline notifyCaregiversAboutMedicineStatus cagrilari (3 yerde) helper'a
 * cikarildi. Status 'missed' tek deger — type-safe.
 */
export function buildCaregiverNotificationArgs<
  TMedicine extends { name: string },
  TLog extends { scheduledTime: string },
>(medicine: TMedicine, missedLog: TLog): [string, string, string, 'missed'] {
  return [medicine.name, missedLog.scheduledTime, medicine.name, 'missed'];
}
