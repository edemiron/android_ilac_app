/**
 * rollingHorizonScheduler — 14 gunluk projeksiyon motoru.
 *
 * v1.7.1: bu dosyada UYDURMA bir `Medicine` sekli kullaniliyordu
 * (`frequency: 'daily'`, `durationDays`, `times[]`, `instructions: 'as_needed'`).
 * Gercek tipte `frequency` gunde kac kez alinacagini tutan bir SAYI, gun
 * kurallari `scheduleType` + `specificDays`/`intervalDays`/`cycleDays*` ile
 * ifade edilir ve `durationDays` / `times` alanlari HIC YOK. Testler tipe
 * uydurulunca 26 tsc hatasinin 7'si kapandi ve modulun kendi bozuk
 * `isMedicineScheduledForDate` kopyasi silinip `timeCalculator`'daki tek
 * kaynaga baglandi.
 */

import {
  planRollingDoses,
  getRollingHorizonSummary,
} from '../../utils/notifications/rollingHorizonScheduler';
import { isMedicineScheduledForDate } from '../../utils/timeCalculator';
import type { Medicine, ReminderTime } from '../../types';

const baseMedicine = {
  dosage: '1 tablet',
  color: '#3B82F6',
  isActive: true,
  frequency: 2,
  createdAt: '2026-08-31T10:00:00Z',
  updatedAt: '2026-08-31T10:00:00Z',
} satisfies Partial<Medicine>;

describe('rollingHorizonScheduler — 14-Day Projection Engine', () => {
  const mockMedicines: Medicine[] = [
    {
      ...baseMedicine,
      id: 'med-parol',
      name: 'PAROL PLUS',
      instructions: 'after_meal',
      startDate: '2026-08-31',
      endDate: '2026-09-13',
      scheduleType: 'daily',
    },
    {
      ...baseMedicine,
      id: 'med-nexium',
      name: 'NEXIUM',
      instructions: 'empty_stomach',
      color: '#8B5CF6',
      frequency: 1,
      startDate: '2026-08-31',
      scheduleType: 'interval_days',
      intervalDays: 2, // Gun asiri
    },
    {
      ...baseMedicine,
      id: 'med-passive',
      name: 'Ağrı Kesici Sprey',
      instructions: 'any_time',
      color: '#10B981',
      frequency: 1,
      startDate: '2026-08-31',
      isActive: false, // pasif ilac projeksiyona girmemeli
    },
  ];

  const mockReminderTimes: ReminderTime[] = [
    { id: 'rt-1', medicineId: 'med-parol', time: '09:00', isEnabled: true },
    { id: 'rt-2', medicineId: 'med-parol', time: '21:00', isEnabled: true },
    { id: 'rt-3', medicineId: 'med-nexium', time: '08:00', isEnabled: true },
    { id: 'rt-4', medicineId: 'med-passive', time: '12:00', isEnabled: true },
  ];

  it('pasif ilaclari projeksiyona almaz', () => {
    const doses = planRollingDoses(mockMedicines, mockReminderTimes, {
      referenceDate: new Date('2026-08-31T07:00:00'),
    });

    expect(doses.some(d => d.medicineId === 'med-passive')).toBe(false);
  });

  it('intervalDays (gun asiri) kuralina uyar', () => {
    const med = mockMedicines[1];

    expect(isMedicineScheduledForDate(med, new Date('2026-08-31T12:00:00'))).toBe(true);
    expect(isMedicineScheduledForDate(med, new Date('2026-09-01T12:00:00'))).toBe(false);
    expect(isMedicineScheduledForDate(med, new Date('2026-09-02T12:00:00'))).toBe(true);
  });

  it('gun asiri ilac projeksiyonda da her gun GORUNMEZ', () => {
    // Bozuk ikiz fonksiyonun asil semptomu buydu: her gun sayiliyordu.
    const doses = planRollingDoses(mockMedicines, mockReminderTimes, {
      referenceDate: new Date('2026-08-31T07:00:00'),
      horizonDays: 6,
      maxPending: 100,
    });

    const nexiumOffsets = doses
      .filter(d => d.medicineId === 'med-nexium')
      .map(d => d.dayOffset)
      .sort((a, b) => a - b);

    expect(nexiumOffsets).toEqual([0, 2, 4, 6]);
  });

  it('endDate sonrasi doz uretmez', () => {
    const doses = planRollingDoses(mockMedicines, mockReminderTimes, {
      referenceDate: new Date('2026-08-31T07:00:00'),
      horizonDays: 20,
      maxPending: 500,
    });

    const parolDates = doses
      .filter(d => d.medicineId === 'med-parol')
      .map(d => d.fireAt.toISOString().slice(0, 10));

    // endDate = 2026-09-13; sonrasinda doz olmamali
    expect(parolDates.every(d => d <= '2026-09-13')).toBe(true);
    expect(parolDates.some(d => d === '2026-09-13')).toBe(true);
  });

  it('maxPending sinirini asmaz', () => {
    const doses = planRollingDoses(mockMedicines, mockReminderTimes, {
      referenceDate: new Date('2026-08-31T06:00:00'),
      maxPending: 10,
    });

    expect(doses.length).toBeLessThanOrEqual(10);
  });

  it('teshis ozeti tutarli deger dondurur', () => {
    const summary = getRollingHorizonSummary(
      mockMedicines,
      mockReminderTimes,
      new Date('2026-08-31T06:00:00')
    );

    expect(summary.activeMedicinesCount).toBe(2); // biri pasif
    expect(summary.enabledReminderTimesCount).toBe(4);
    expect(summary.totalPlannedDoses).toBeGreaterThan(0);
    expect(summary.nextDose).not.toBeNull();
  });
});
