/**
 * rollingHorizonScheduler.ts — 14 Günlük Kayar Ufuk Doz Zamanlama Algoritması
 *
 * Amaç:
 * 1. iOS 64 bekleyen yerel bildirim (UNCalendarNotificationTrigger) sınırını aşmamak (MAX_PENDING = 60).
 * 2. Android tarafında yüzlerce gereksiz alarm kurarak bellek ve pil tüketimini engellemek.
 * 3. İlaç kurallarını (Medication, ReminderTime) temel alarak 14 günlük pencere içinde dinamik doz projeksiyonu üretmek.
 * 4. Uygulama her ön plana geldiğinde (AppState active) veya doz alındığında pencereyi ileri kaydırmak.
 */

import { addDays } from 'date-fns';
import type { Medicine, ReminderTime } from '../../types';
// Gun eslesmesinin TEK KAYNAGI. Bu dosyada ayni isimde IKINCI ve BOZUK bir
// kopya vardi: `medicine.frequency` (bir SAYI) 'daily' / 'specific_days' /
// 'interval' STRINGLERIYLE karsilastiriliyordu, dolayisiyla her zaman
// `default: return true` dalina dusuyordu; ustelik `medicine.durationDays`
// alani `Medicine` tipinde hic yok. Sonuc: teshis panelindeki "14 Gunluk
// Planlanan Doz" sayisi specific_days / interval_days / cycle ilaclarda
// SISIYORDU (her gun sayiliyordu). Alarm kurulumu etkilenmiyordu, cunku o
// zaten `timeCalculator` surumunu kullaniyor.
import { isMedicineScheduledForDate } from '../timeCalculator';

export interface PlannedDoseEvent {
  medicineId: string;
  medicineName: string;
  dosage: string;
  color?: string;
  reminderTimeId: string;
  time: string; // "HH:mm"
  fireAt: Date;
  isToday: boolean;
  dayOffset: number;
}

export interface RollingHorizonOptions {
  horizonDays?: number; // Varsayılan 14 gün
  maxPending?: number; // Varsayılan 60 adet (iOS limit güvenliği)
  referenceDate?: Date; // Projeksiyon başlangıç tarihi
}

export const DEFAULT_HORIZON_DAYS = 14;
export const MAX_PENDING_NOTIFICATIONS = 60;

/**
 * 14 günlük ufuk içinde tetiklenecek tüm dozları kronolojik olarak üretir.
 */
export function planRollingDoses(
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  options?: RollingHorizonOptions
): PlannedDoseEvent[] {
  const horizonDays = options?.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const maxPending = options?.maxPending ?? MAX_PENDING_NOTIFICATIONS;
  const now = options?.referenceDate ?? new Date();

  // NOT: burada eskiden `m.frequency !== 'as_needed'` filtresi vardi. `frequency`
  // gunde kac kez alinacagini tutan bir SAYI ve `Medicine` tipinde "ihtiyac
  // halinde" diye bir kavram HIC YOK; yani bu kosul her zaman true idi.
  // Gun kurallarini `isMedicineScheduledForDate` (timeCalculator) yonetiyor.
  const activeMedicines = medicines.filter(m => m.isActive);
  const enabledReminderTimes = reminderTimes.filter(rt => rt.isEnabled);

  const plannedDoses: PlannedDoseEvent[] = [];

  for (let offset = 0; offset <= horizonDays; offset++) {
    const targetDate = addDays(now, offset);

    for (const medicine of activeMedicines) {
      if (!isMedicineScheduledForDate(medicine, targetDate)) continue;

      const medReminderTimes = enabledReminderTimes.filter(rt => rt.medicineId === medicine.id);

      for (const rt of medReminderTimes) {
        const [hour, minute] = rt.time.split(':').map(Number);
        const fireAt = new Date(targetDate);
        fireAt.setHours(hour, minute, 0, 0);

        // Geçmiş saatleri atla
        if (fireAt.getTime() <= now.getTime()) continue;

        plannedDoses.push({
          medicineId: medicine.id,
          medicineName: medicine.name,
          dosage: medicine.dosage || '1 doz',
          color: medicine.color,
          reminderTimeId: rt.id,
          time: rt.time,
          fireAt,
          isToday: offset === 0,
          dayOffset: offset,
        });
      }
    }
  }

  // Zamana göre sırala ve maksimum slot sınırına göre kırp
  return plannedDoses.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, maxPending);
}

/**
 * Teşhis paneli için özet istatistik döndürür.
 */
export function getRollingHorizonSummary(
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  now: Date = new Date()
) {
  const planned = planRollingDoses(medicines, reminderTimes, { referenceDate: now });
  const nextDose = planned.length > 0 ? planned[0] : null;

  return {
    totalPlannedDoses: planned.length,
    nextDose,
    activeMedicinesCount: medicines.filter(m => m.isActive).length,
    enabledReminderTimesCount: reminderTimes.filter(rt => rt.isEnabled).length,
    horizonDaysCovered: DEFAULT_HORIZON_DAYS,
  };
}
