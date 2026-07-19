/**
 * Reminder statistics helpers — Sprint 65B.
 *
 * Pure functions for computing daily reminder stats. Used by HomeScreen
 * stat tiles (Bugün / Alındı / Bekleyen).
 */

import type { TodayReminder } from '../../screens/HomeScreen/types';

/**
 * Bugün planlanan benzersiz ilaç sayısı.
 * Örn. 3 ilaç × farklı saatler = 7 doz, ama benzersiz ilaç = 3.
 *
 * Pure function — set-based, duplicate medicine.id tek sayılır.
 */
export function getUniqueMedicineCount(reminders: TodayReminder[]): number {
  if (reminders.length === 0) return 0;
  const ids = new Set<string>();
  for (const r of reminders) {
    if (r.medicine?.id) ids.add(r.medicine.id);
  }
  return ids.size;
}

/**
 * Bugün alınan benzersiz ilaç sayısı (en az 1 doz alınmış).
 * Set-based: aynı ilacın 3 dozunun 3'ü de alınsa = 1 ilaç.
 */
export function getUniqueMedicineTakenCount(reminders: TodayReminder[]): number {
  if (reminders.length === 0) return 0;
  const ids = new Set<string>();
  for (const r of reminders) {
    if (r.medicine?.id && r.log?.status === 'taken') ids.add(r.medicine.id);
  }
  return ids.size;
}
