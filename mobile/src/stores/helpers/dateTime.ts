/**
 * Date/Time + Adherence helpers.
 *
 * Sprint 34.1: medicineStoreHelpers.ts 5 alt moduleye bolundu. Bu dosya
 * Date/Time (3) ve Adherence (5) kategorilerini icerir.
 *
 * Re-export: medicineStoreHelpers.ts'ten backward compat icin disa acilir.
 */

import { format } from 'date-fns';
import { normalizeMedicineLogsBySlot } from './medicineLogs';
import type { Medicine, MedicineLog, ReminderTime } from '../../types';

// =====================================================================
// DATE / TIME HELPERS
// =====================================================================

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
 * Su anki zamanin ISO string hali (lastSyncAt, updatedAt, createdAt icin).
 * medicineStore.ts icinde 10+ yerde tekrar eden `new Date().toISOString()` yerine.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

// =====================================================================
// ADHERENCE HELPERS
// =====================================================================

/**
 * Su anki aktif ilac ID'lerini getir (Set olarak — O(1) lookup).
 */
export function getActiveMedicineIds(medicines: Medicine[]): Set<string> {
  return new Set(medicines.filter(m => m.isActive).map(m => m.id));
}

/**
 * Aktif ilaclarin aktif hatirlatma sayisini hesaplar.
 */
export function getActiveReminderCount(
  medicines: Medicine[],
  reminderTimes: ReminderTime[]
): number {
  const activeIds = getActiveMedicineIds(medicines);
  return reminderTimes.filter(rt => activeIds.has(rt.medicineId) && rt.isEnabled).length;
}

/**
 * N gunluk uyum oranini hesaplar (0-100).
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
 * Mevcut streak (ardisik "hepsi alindi" gun sayisi) hesaplar.
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
 * Dusuk stoklu aktif ilaclari filtreler.
 */
export function filterLowStockMedicines(medicines: Medicine[]): Medicine[] {
  return medicines.filter(m => {
    if (!m.isActive || !m.stockEnabled) return false;
    const threshold = m.stockThreshold ?? 5;
    return (m.stockCount ?? 0) <= threshold;
  });
}
