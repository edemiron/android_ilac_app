/**
 * Uyum orani — kacirilan doz regresyonu.
 *
 * Bu testler bir HESAPLAMA HATASINI degil, iki parcanin birbirine bagli
 * olusunu korur:
 *
 *   calculateAdherenceRate oranı `alinan / KAYIT_SAYISI` olarak hesaplar.
 *   Yani kaydi olmayan doz hic hesaba girmez. Bu, 'missed' kayitlarinin
 *   gercekten olusturuldugu varsayimina dayanir.
 *
 *   markMissedReminders() tam yaziliydi ama HICBIR YERDEN cagrilmiyordu:
 *   hicbir 'missed' kaydi olusmuyor, gormezden gelinen dozlar orani
 *   dusurmuyordu. 7 dozdan 1'ini alan kullanici %100 uyum goruyordu.
 *
 * Oran istatistik ekraninda ve PDF raporunda doktora gosterildigi icin
 * yanlis olmasi tedavi kararini etkileyebilir.
 */

import { calculateAdherenceRate } from '../../stores/helpers/dateTime';
import { markMissedReminders } from '../../utils/missedReminders';
import type { Medicine, ReminderTime, MedicineLog } from '../../types';

const NOW = new Date('2026-08-17T20:00:00');

const medicine = (id: string): Medicine =>
  ({
    id,
    name: `Ilac ${id}`,
    dosage: '1 tablet',
    frequency: 1,
    color: '#ffffff',
    isActive: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    startDate: '2026-08-01T00:00:00.000Z',
  }) as Medicine;

const reminder = (id: string, medicineId: string, time: string): ReminderTime =>
  ({ id, medicineId, time, isEnabled: true }) as ReminderTime;

const logEntry = (
  medicineId: string,
  reminderTimeId: string,
  day: string,
  status: MedicineLog['status']
): MedicineLog =>
  ({
    id: `${reminderTimeId}-${day}`,
    medicineId,
    reminderTimeId,
    scheduledTime: `${day}T08:00:00`,
    status,
  }) as MedicineLog;

describe('calculateAdherenceRate — kacirilan dozlarin etkisi', () => {
  const medicines = [medicine('m1')];
  const reminderTimes = [reminder('r1', 'm1', '08:00')];

  it('missed kayitlari orani DUSURUR', () => {
    const logs = [
      logEntry('m1', 'r1', '2026-08-17', 'taken'),
      ...['11', '12', '13', '14', '15', '16'].map(d =>
        logEntry('m1', 'r1', `2026-08-${d}`, 'missed')
      ),
    ];

    expect(calculateAdherenceRate(logs, medicines, reminderTimes, 7, NOW)).toBe(14);
  });

  it('atlanan (skipped) dozlar da orani dusurur', () => {
    const logs = [
      logEntry('m1', 'r1', '2026-08-17', 'taken'),
      logEntry('m1', 'r1', '2026-08-16', 'skipped'),
    ];

    expect(calculateAdherenceRate(logs, medicines, reminderTimes, 7, NOW)).toBe(50);
  });

  it('hepsi alinmissa %100', () => {
    const logs = ['11', '12', '13', '14', '15', '16', '17'].map(d =>
      logEntry('m1', 'r1', `2026-08-${d}`, 'taken')
    );

    expect(calculateAdherenceRate(logs, medicines, reminderTimes, 7, NOW)).toBe(100);
  });

  // ANA REGRESYON: kayit yoksa oran yaniltici derecede yuksek cikar.
  // Bu davranis matematiksel olarak dogru (0 kayit uzerinden ortalama alinamaz),
  // ama YALNIZCA markMissedReminders duzenli calisiyorsa kabul edilebilir.
  // Bu yuzden asagidaki test o baglantiyi korur.
  it('kayit olmayinca oran sisiyor — markMissedReminders bu yuzden sart', () => {
    const onlyTodayTaken = [logEntry('m1', 'r1', '2026-08-17', 'taken')];

    // Gormezden gelinen 6 gun kayitsiz oldugunda oran %100 gorunur.
    expect(calculateAdherenceRate(onlyTodayTaken, medicines, reminderTimes, 7, NOW)).toBe(100);
  });
});

describe('markMissedReminders — kacirilan dozu kayda gecirir', () => {
  const medicines = [medicine('m1')];
  const reminderTimes = [reminder('r1', 'm1', '08:00')];

  it('gecmis ve kaydi olmayan doz icin missed uretir', () => {
    const missed = markMissedReminders(medicines, reminderTimes, [], NOW);

    expect(missed).toHaveLength(1);
    expect(missed[0].status).toBe('missed');
    expect(missed[0].reminderTimeId).toBe('r1');
    expect(missed[0].scheduledTime).toBe('2026-08-17T08:00:00');
  });

  it('kaydi olan doz icin tekrar uretmez (cift kayit olmaz)', () => {
    const existing = [logEntry('m1', 'r1', '2026-08-17', 'taken')];

    expect(markMissedReminders(medicines, reminderTimes, existing, NOW)).toHaveLength(0);
  });

  it('grace period gecmediyse missed isaretlemez', () => {
    // 08:00 dozu, saat 08:30 — varsayilan 60 dk tolerans dolmadi.
    const justAfter = new Date('2026-08-17T08:30:00');

    expect(markMissedReminders(medicines, reminderTimes, [], justAfter)).toHaveLength(0);
  });

  it('pasif ilac ve kapali hatirlatma atlanir', () => {
    const inactive = [{ ...medicine('m1'), isActive: false }] as Medicine[];
    expect(markMissedReminders(inactive, reminderTimes, [], NOW)).toHaveLength(0);

    const disabled = [{ ...reminder('r1', 'm1', '08:00'), isEnabled: false }] as ReminderTime[];
    expect(markMissedReminders(medicines, disabled, [], NOW)).toHaveLength(0);
  });

  it('missed kayitlari uyum oranina yansir (uctan uca)', () => {
    // Supurme calistiktan sonra oran duser — asil kazanim bu.
    const missed = markMissedReminders(medicines, reminderTimes, [], NOW);
    const rate = calculateAdherenceRate(missed, medicines, reminderTimes, 7, NOW);

    expect(missed).toHaveLength(1);
    expect(rate).toBe(0);
  });
});
