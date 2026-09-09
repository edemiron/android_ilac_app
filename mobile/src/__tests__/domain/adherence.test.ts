/**
 * `src/domain/adherence.ts` sozlesme testleri.
 *
 * Kilitlenen uretim hatasi (v1.7.7): uyum paydasi MEVCUT LOG sayisiydi.
 * Islenmeyen doz hic log uretmedigi ve `markMissedReminders` hicbir yerden
 * cagrilmadigi icin dozu gormezden gelmek uyum skorunu YUKSELTIYORDU.
 */

import {
  countDoseOutcomes,
  adherenceRate,
  summarizeAdherence,
  summarizeAdherenceForLocalDate,
  isFullAdherenceDay,
  type AdherenceLog,
} from '../../domain/adherence';

const log = (status: AdherenceLog['status'], scheduledTime = '2026-09-02T08:00:00'): AdherenceLog =>
  ({ status, scheduledTime }) as AdherenceLog;

describe('countDoseOutcomes', () => {
  it('taken / skipped / missed sayar ve paydayi toplar', () => {
    expect(countDoseOutcomes([log('taken'), log('taken'), log('skipped'), log('missed')])).toEqual({
      taken: 2,
      skipped: 1,
      missed: 1,
      planned: 4,
    });
  });

  it('pending PAYDAYA GIRMEZ (saati gelmemis doz kacirilmis sayilmaz)', () => {
    const outcomes = countDoseOutcomes([log('taken'), log('pending'), log('pending')]);
    expect(outcomes.planned).toBe(1);
    expect(outcomes.taken).toBe(1);
  });

  it('bos ve null listede patlamaz', () => {
    expect(countDoseOutcomes([]).planned).toBe(0);
    expect(countDoseOutcomes(null as unknown as AdherenceLog[]).planned).toBe(0);
  });
});

describe('adherenceRate', () => {
  it('normal oran', () => {
    expect(adherenceRate(3, 4)).toBe(75);
    expect(adherenceRate(4, 4)).toBe(100);
    expect(adherenceRate(0, 4)).toBe(0);
  });

  it('PLANLANAN DOZ YOKSA null doner — %100 UYDURULMAZ', () => {
    expect(adherenceRate(0, 0)).toBeNull();
    expect(adherenceRate(3, 0)).toBeNull();
    expect(adherenceRate(0, NaN)).toBeNull();
    expect(adherenceRate(0, -2)).toBeNull();
  });

  it('taken paydayi asamaz ve negatif olamaz', () => {
    expect(adherenceRate(9, 4)).toBe(100);
    expect(adherenceRate(-3, 4)).toBe(0);
  });
});

describe('summarizeAdherence — ASIL REGRESYON', () => {
  it('GORMEZDEN GELINEN DOZ skoru yukseltmez', () => {
    // Gunde 3 doz planli. 1 alindi, 2 kacirildi (markMissedReminders yazdi).
    const summary = summarizeAdherence([log('taken'), log('missed'), log('missed')]);
    expect(summary.planned).toBe(3);
    expect(summary.rate).toBe(33);
    // ⚠️ Eskiden `missed` loglari HIC olusmuyordu ve payda 1'di -> %100.
  });

  it('atlanan doz da paydada kalir (uyum degil, karar)', () => {
    const summary = summarizeAdherence([log('taken'), log('skipped')]);
    expect(summary.planned).toBe(2);
    expect(summary.rate).toBe(50);
  });

  it('veri yoksa hasData false ve rate null', () => {
    const summary = summarizeAdherence([]);
    expect(summary.hasData).toBe(false);
    expect(summary.rate).toBeNull();
  });

  it('yalnizca pending varsa veri sayilmaz', () => {
    const summary = summarizeAdherence([log('pending'), log('pending')]);
    expect(summary.hasData).toBe(false);
    expect(summary.rate).toBeNull();
  });
});

describe('summarizeAdherenceForLocalDate', () => {
  it('gun karsilastirmasi YEREL yapilir, dize oneki ile degil', () => {
    // Yerel 3 Eylul 01:00 -> UTC 2 Eylul 22:00. Dize oneki bunu 09-02
    // sayardi; yerel gun anahtari 09-03 der.
    const geceYarisiSonrasi = new Date(2026, 8, 3, 1, 0, 0);
    const logs = [
      { status: 'taken', scheduledTime: geceYarisiSonrasi.toISOString() } as AdherenceLog,
    ];
    expect(summarizeAdherenceForLocalDate(logs, new Date(2026, 8, 3)).planned).toBe(1);
    expect(summarizeAdherenceForLocalDate(logs, new Date(2026, 8, 2)).planned).toBe(0);
  });

  it('baska gunun loglari sayilmaz', () => {
    const logs = [log('taken', '2026-09-01T08:00:00'), log('taken', '2026-09-02T08:00:00')];
    expect(summarizeAdherenceForLocalDate(logs, new Date(2026, 8, 2)).planned).toBe(1);
  });
});

describe('isFullAdherenceDay (seri hesabi)', () => {
  it('tum dozlar alinmissa true', () => {
    expect(isFullAdherenceDay(summarizeAdherence([log('taken'), log('taken')]))).toBe(true);
  });

  it('VERI YOKSA seri UYDURULMAZ', () => {
    // Eskiden kayit girilmemis gun %100 sayilip seriyi buyutuyordu.
    expect(isFullAdherenceDay(summarizeAdherence([]))).toBe(false);
  });

  it('bir doz kacirilmissa false', () => {
    expect(isFullAdherenceDay(summarizeAdherence([log('taken'), log('missed')]))).toBe(false);
  });
});
