/**
 * medicineStore helpers — medicineLogs modulu.
 *
 * Sprint 4: Log normalizasyonu + slot-based deduplication.
 */

import type { Medicine, MedicineLog, ReminderTime } from '../../types';

/**
 * MedicineLog args resolver.
 * Eski API uyumlulugu: 3. parametre ya medicineIdFallback ya da note olabilir.
 * 4. parametre explicitNote — varsa 3. medicineIdFallback + 4. note olarak ayrilir.
 */
export function resolveMedicineLogArgs(
  reminderTimeId: string,
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  medicineIdFallbackOrNote?: string,
  explicitNote?: string
): { medicineIdFallback?: string; note?: string } {
  if (explicitNote !== undefined) {
    return {
      medicineIdFallback: medicineIdFallbackOrNote,
      note: explicitNote,
    };
  }

  if (!medicineIdFallbackOrNote) {
    return {};
  }

  const reminderExists = reminderTimes.some(reminderTime => reminderTime.id === reminderTimeId);

  if (!reminderExists) {
    return { medicineIdFallback: medicineIdFallbackOrNote };
  }

  const isKnownMedicineId = medicines.some(medicine => medicine.id === medicineIdFallbackOrNote);

  return isKnownMedicineId
    ? { medicineIdFallback: medicineIdFallbackOrNote }
    : { note: medicineIdFallbackOrNote };
}

/**
 * Slot bazli unique key: reminderTimeId + scheduledTime.
 * Ayni slot icin birden fazla log varsa bu key ile dedupe edilir.
 */
export function buildMedicineLogSlotKey(reminderTimeId: string, scheduledTime: string): string {
  return `${reminderTimeId}__${scheduledTime}`;
}

/**
 * ScheduledTime gelecekte mi kontrol et.
 * Gecersiz tarihler (NaN) icin false doner.
 */
export function isScheduledTimeInFuture(
  scheduledTime: string,
  referenceDate: Date = new Date()
): boolean {
  const parsedScheduledTime = new Date(scheduledTime);

  if (Number.isNaN(parsedScheduledTime.getTime())) {
    return false;
  }

  return parsedScheduledTime.getTime() > referenceDate.getTime();
}

/**
 * Log status onceligi — normalizeMedicineLogsBySlot'ta kullanilir.
 * Higher number = higher priority (overwrite).
 */
export function getMedicineLogStatusPriority(status: MedicineLog['status']): number {
  switch (status) {
    case 'taken':
      return 3;
    case 'skipped':
      return 2;
    case 'missed':
      return 1;
    default:
      return 0;
  }
}

/**
 * Ayni slot (reminderTimeId + scheduledTime) icin birden fazla log varsa
 * en yuksek priority olan log'u tut. Sonuc scheduledTime'e gore siralanmis.
 */
export function normalizeMedicineLogsBySlot(medicineLogs: MedicineLog[]): MedicineLog[] {
  const logsBySlot = new Map<string, MedicineLog>();

  medicineLogs.forEach(logEntry => {
    const slotKey = buildMedicineLogSlotKey(logEntry.reminderTimeId, logEntry.scheduledTime);
    const existingLog = logsBySlot.get(slotKey);

    if (!existingLog) {
      logsBySlot.set(slotKey, logEntry);
      return;
    }

    const existingPriority = getMedicineLogStatusPriority(existingLog.status);
    const nextPriority = getMedicineLogStatusPriority(logEntry.status);

    if (nextPriority > existingPriority || nextPriority === existingPriority) {
      logsBySlot.set(slotKey, logEntry);
    }
  });

  return Array.from(logsBySlot.values()).sort((left, right) =>
    left.scheduledTime.localeCompare(right.scheduledTime)
  );
}
