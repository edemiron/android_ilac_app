/**
 * CRUD + Filter helpers (12).
 *
 * Sprint 34.1: medicineStoreHelpers.ts 5 alt moduleye bolundu. Bu dosya CRUD
 * (5) ve Filter (7) kategorilerini icerir.
 */

import type { Medicine, ReminderTime } from '../../types';

// =====================================================================
// CRUD HELPERS
// =====================================================================

/**
 * ID ile eslesen ilaci bulur.
 */
export function findMedicineById<T extends { id: string }>(
  medicines: T[],
  id: string | null | undefined
): T | undefined {
  if (!id) return undefined;
  return medicines.find(m => m.id === id);
}

/**
 * ID ile eslesen ilaci bulur, bulamazsa null doner. findMedicineById'in
 * null-donen versiyonu. Optional ID context'leri icin.
 */
export function findMedicineOrNull<T extends { id: string }>(
  medicines: T[],
  id: string | null | undefined
): T | null {
  if (!id) return null;
  return medicines.find(m => m.id === id) ?? null;
}

/**
 * Bir medicine listesinde, belirli ID ile eslesen ilacin partial guncellenmis
 * halini uretir (updatedAt'i otomatik set eder).
 */
export function updateMedicineInList<T extends { id: string; updatedAt: string }>(
  medicines: T[],
  id: string,
  patch: Partial<Omit<T, 'id' | 'updatedAt'>>
): T[] {
  const now = new Date().toISOString();
  return medicines.map(m => (m.id === id ? { ...m, ...patch, updatedAt: now } : m));
}

/**
 * Bir ReminderTime listesinde, belirli ID ile eslesen ogeye partial patch uygular.
 * Generic constraint ile id field zorunlu. inline updateReminderTime pattern'i
 * helper'a cikarildi.
 */
export function updateReminderTimeInList<T extends { id: string }>(
  reminderTimes: T[],
  id: string,
  patch: Partial<Omit<T, 'id'>>
): T[] {
  return reminderTimes.map(rt => (rt.id === id ? { ...rt, ...patch } : rt));
}

/**
 * ID ile eslesen ilaci listeden cikarir.
 */
export function removeMedicineById<T extends { id: string }>(medicines: T[], id: string): T[] {
  return medicines.filter(m => m.id !== id);
}

/**
 * ID listesine gore ilaclari filtreler (bulk delete).
 */
export function filterMedicinesByIds<T extends { id: string }>(
  medicines: T[],
  ids: readonly string[]
): T[] {
  const idSet = new Set(ids);
  return medicines.filter(m => !idSet.has(m.id));
}

// =====================================================================
// FILTER HELPERS
// =====================================================================

/**
 * Belirli medicineId'ye ait reminder time'lari filtreler. exclude=true ile ters
 * filtreleme (exclude mode).
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
 * Aktif ilaclari filtreler.
 */
export function filterActiveMedicines<T extends { isActive: boolean }>(medicines: T[]): T[] {
  return medicines.filter(m => m.isActive);
}

/**
 * Pasif ilaclari filtreler.
 */
export function filterInactiveMedicines<T extends { isActive: boolean }>(medicines: T[]): T[] {
  return medicines.filter(m => !m.isActive);
}

/**
 * Belirli medicine'a ait aktif ilac var mi kontrol eder.
 */
export function hasActiveMedicineById<T extends { id: string; isActive: boolean }>(
  medicines: T[],
  medicineId: string
): boolean {
  return medicines.some(m => m.id === medicineId && m.isActive);
}

/**
 * Belirli (id, medicineId) eslesen ve aktif ReminderTime var mi kontrol eder.
 */
export function hasActiveReminderTime<
  T extends { id: string; medicineId: string; isEnabled: boolean },
>(reminderTimes: T[], reminderTimeId: string, medicineId: string): boolean {
  return reminderTimes.some(
    rt => rt.id === reminderTimeId && rt.medicineId === medicineId && rt.isEnabled
  );
}

/**
 * ID ile eslesen ReminderTime bulur.
 */
export function findReminderTimeById<T extends { id: string }>(
  reminderTimes: T[],
  reminderTimeId: string | null | undefined
): T | undefined {
  if (!reminderTimeId) return undefined;
  return reminderTimes.find(rt => rt.id === reminderTimeId);
}

/**
 * Belirli bir ilaca ait ReminderTime listesini saat siralamasina gore getirir.
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
 * Belirli medicine'a ait MedicineLog'lari filtreler. exclude=true ile ters
 * filtreleme. deleteMedicine icindeki inline pattern'i helper'a cikarildi.
 */
export function filterMedicineLogsByMedicineId<T extends { medicineId: string }>(
  medicineLogs: T[],
  medicineId: string,
  exclude: boolean = false
): T[] {
  return medicineLogs.filter(log => {
    const match = log.medicineId === medicineId;
    return exclude ? !match : match;
  });
}

/**
 * Belirli medicine'a ait Snooze'lari filtreler. exclude=true ile ters.
 * cleanupStaleSnoozes, _cleanupNotifications icindeki inline pattern icin.
 */
export function filterSnoozesByMedicineId<T extends { medicineId: string }>(
  snoozes: T[],
  medicineId: string,
  exclude: boolean = false
): T[] {
  return snoozes.filter(s => {
    const match = s.medicineId === medicineId;
    return exclude ? !match : match;
  });
}

// Re-export for compatibility
export type { Medicine, ReminderTime };
