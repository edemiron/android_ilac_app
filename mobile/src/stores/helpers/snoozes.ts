/**
 * Snooze helpers (7).
 *
 * Sprint 34.1: medicineStoreHelpers.ts 5 alt moduleye bolundu. Bu dosya Snooze
 * kategorisini icerir.
 *
 * Re-export: medicineStoreHelpers.ts'ten backward compat icin disa acilir.
 */

/**
 * Belirli bir (medicineId, reminderTimeId, originalScheduledTime) icin
 * aktif snooze sayisini hesaplar. createSnooze icin kullanilir.
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
 * Bugun icin verilen (medicineId, reminderTime) ikilisinin aktif snooze listesini getirir.
 */
export function getActiveSnoozesForReminder<
  T extends { medicineId: string; reminderTimeId: string; isActive: boolean },
>(snoozes: T[], medicineId: string, reminderTimeId: string): T[] {
  return snoozes.filter(
    s => s.medicineId === medicineId && s.reminderTimeId === reminderTimeId && s.isActive
  );
}

/**
 * ID ile eslesen snooze'u deaktif eder.
 */
export function deactivateSnoozeById<T extends { id: string; isActive: boolean }>(
  snoozes: T[],
  snoozeId: string
): T[] {
  return snoozes.map(s => (s.id === snoozeId ? { ...s, isActive: false } : s));
}

/**
 * Belirli medicine'a ait tum snooze'lari deaktif eder.
 */
export function deactivateSnoozesForMedicine<T extends { medicineId: string; isActive: boolean }>(
  snoozes: T[],
  medicineId: string
): T[] {
  return snoozes.map(s => (s.medicineId === medicineId ? { ...s, isActive: false } : s));
}

/**
 * Belirli (medicineId, reminderTimeId) icin aktif snooze bulur.
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
 */
export function findActiveSnoozeByNotificationId<
  T extends { notificationId: string; isActive: boolean },
>(snoozes: T[], notificationId: string): T | undefined {
  return snoozes.find(s => s.notificationId === notificationId && s.isActive);
}

/**
 * Iki liste arasinda ID eslesen ogeleri deaktif eder. Set-based O(N+M).
 */
export function deactivateSnoozesIntersectingWith<T extends { id: string; isActive: boolean }>(
  snoozes: T[],
  activeSnoozes: T[]
): T[] {
  const activeIds = new Set(activeSnoozes.map(s => s.id));
  return snoozes.map(s => (activeIds.has(s.id) ? { ...s, isActive: false } : s));
}
