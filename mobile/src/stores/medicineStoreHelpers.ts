/**
 * medicineStore pure helper'lari.
 *
 * Sprint 21.2: medicineStore.ts (1737 satir) icindeki hesaplama logic'i pure
 * fonksiyonlara ayristirildi. State/hook bagimliligi yok, test edilebilir.
 *
 * Not: Bu fonksiyonlar store'dan bagimsiz calisir; state parametre olarak alir.
 */

import { format } from 'date-fns';
import type { Medicine, MedicineLog, ReminderTime } from '../types';
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
