/**
 * `src/domain/doseLog.ts` sozlesme testleri.
 *
 * Bu testler v1.7.4'te bulunan IKI URETIM HATASINI kalici olarak kilitler:
 *   1) Cok dozlu ilaclarda `medicineId` OR dali yuzunden sonraki dozlarin
 *      alarminin susturulmasi,
 *   2) Gun karsilastirmasinin UTC yapilmasi (TR'de 00:00-03:00 arasi dozlarin
 *      bir onceki gune dusmesi).
 */

import {
  getLocalDateKey,
  parseScheduledTime,
  isLogOnLocalDate,
  isDoseLogged,
} from '../../domain/doseLog';
import type { MedicineLog } from '../../types';

type Log = Pick<MedicineLog, 'medicineId' | 'reminderTimeId' | 'scheduledTime' | 'status'>;

function log(partial: Partial<Log>): Log {
  return {
    medicineId: 'med-1',
    reminderTimeId: 'rt-1',
    scheduledTime: '2026-09-02T08:00:00',
    status: 'taken',
    ...partial,
  };
}

describe('getLocalDateKey', () => {
  it('YEREL gunu verir, toISOString UTC gununu degil', () => {
    // TR (UTC+3) 01:30 -> UTC'de bir onceki gunun 22:30'u.
    const localEarlyMorning = new Date(2026, 8, 3, 1, 30, 0); // 3 Eylul 2026, 01:30 yerel
    expect(getLocalDateKey(localEarlyMorning)).toBe('2026-09-03');
  });

  it('ay ve gunu iki haneye tamamlar', () => {
    expect(getLocalDateKey(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
  });
});

describe('parseScheduledTime', () => {
  it('UTC-Z ISO dizesini ayristirir', () => {
    const d = parseScheduledTime('2026-09-02T05:00:00.000Z');
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(Date.parse('2026-09-02T05:00:00.000Z'));
  });

  it('saat dilimsiz dizeyi YEREL sayar', () => {
    const d = parseScheduledTime('2026-09-02T08:00:00');
    expect(d).not.toBeNull();
    expect(getLocalDateKey(d!)).toBe('2026-09-02');
    expect(d!.getHours()).toBe(8);
  });

  it('epoch-ms STRING degerini ayristirir (native koprunun urettigi format)', () => {
    const ms = Date.UTC(2026, 8, 2, 5, 0, 0);
    const d = parseScheduledTime(String(ms));
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(ms);
  });

  it('bos/gecersiz deger icin null doner (uydurma tarih uretmez)', () => {
    expect(parseScheduledTime(undefined)).toBeNull();
    expect(parseScheduledTime(null)).toBeNull();
    expect(parseScheduledTime('')).toBeNull();
    expect(parseScheduledTime('   ')).toBeNull();
    expect(parseScheduledTime('bu bir tarih degil')).toBeNull();
  });
});

describe('isLogOnLocalDate', () => {
  it('saat dilimsiz kayit dogru yerel gune duser', () => {
    expect(isLogOnLocalDate({ scheduledTime: '2026-09-02T23:30:00' }, '2026-09-02')).toBe(true);
  });

  it('ayristirilamayan scheduledTime hicbir gune ait sayilmaz', () => {
    expect(isLogOnLocalDate({ scheduledTime: 'xx' }, '2026-09-02')).toBe(false);
  });
});

describe('isDoseLogged — cok dozlu ilac regresyonu (Hata 1)', () => {
  const now = new Date(2026, 8, 2, 20, 0, 0); // 2 Eylul 2026, 20:00 yerel

  it('AYNI ilacin BASKA dozu alinmis olsa bile bu doz "alinmis" sayilmaz', () => {
    const logs = [log({ reminderTimeId: 'rt-sabah', scheduledTime: '2026-09-02T08:00:00' })];
    expect(isDoseLogged(logs, { reminderTimeId: 'rt-aksam', medicineId: 'med-1' }, now)).toBe(
      false
    );
  });

  it('bu dozun kendisi alinmissa true doner', () => {
    const logs = [log({ reminderTimeId: 'rt-aksam', scheduledTime: '2026-09-02T20:00:00' })];
    expect(isDoseLogged(logs, { reminderTimeId: 'rt-aksam', medicineId: 'med-1' }, now)).toBe(true);
  });

  it('reminderTimeId varsa medicineId uyusmazligi sonucu degistirmez', () => {
    const logs = [
      log({
        medicineId: 'BASKA-ILAC',
        reminderTimeId: 'rt-aksam',
        scheduledTime: '2026-09-02T20:00:00',
      }),
    ];
    // reminderTimeId'ler deterministik ve ilaca ozgu; eslesme buna gore.
    expect(isDoseLogged(logs, { reminderTimeId: 'rt-aksam', medicineId: 'med-1' }, now)).toBe(true);
  });

  it('reminderTimeId HIC yoksa medicineId geri dususu devreye girer', () => {
    const logs = [log({ reminderTimeId: 'rt-sabah', scheduledTime: '2026-09-02T08:00:00' })];
    expect(isDoseLogged(logs, { medicineId: 'med-1' }, now)).toBe(true);
    expect(isDoseLogged(logs, { medicineId: 'baska-ilac' }, now)).toBe(false);
  });

  it('kimlik hic verilmezse false doner (her alarmi susturmak yerine)', () => {
    const logs = [log({})];
    expect(isDoseLogged(logs, {}, now)).toBe(false);
    expect(isDoseLogged(logs, { reminderTimeId: null, medicineId: undefined }, now)).toBe(false);
  });
});

describe('isDoseLogged — durum filtresi', () => {
  const now = new Date(2026, 8, 2, 20, 0, 0);

  it.each([
    ['taken', true],
    ['skipped', true],
    ['pending', false],
    ['missed', false],
  ] as Array<[MedicineLog['status'], boolean]>)('status=%s -> %s', (status, expected) => {
    const logs = [log({ status, scheduledTime: '2026-09-02T20:00:00' })];
    expect(isDoseLogged(logs, { reminderTimeId: 'rt-1' }, now)).toBe(expected);
  });
});

describe('isDoseLogged — gun sinirlari (Hata 2)', () => {
  it('DUNKU ayni doz bugunun alarmini susturmaz', () => {
    const now = new Date(2026, 8, 2, 8, 0, 0);
    const logs = [log({ scheduledTime: '2026-09-01T08:00:00' })];
    expect(isDoseLogged(logs, { reminderTimeId: 'rt-1' }, now)).toBe(false);
  });

  it('TR gece yarisindan sonraki doz (01:00) dogru gune duser', () => {
    // Yerel 3 Eylul 01:00 = UTC 2 Eylul 22:00. Eski UTC oneki bu kaydi
    // "2026-09-02" sayiyordu ve 3 Eylul 01:00 alarmi "alinmis" gorunmuyordu.
    const now = new Date(2026, 8, 3, 1, 5, 0);
    const scheduled = new Date(2026, 8, 3, 1, 0, 0);
    const logs = [log({ scheduledTime: scheduled.toISOString() })];
    expect(isDoseLogged(logs, { reminderTimeId: 'rt-1' }, now)).toBe(true);
  });

  it('epoch-ms string formatindaki kayit da bugune sayilir', () => {
    const now = new Date(2026, 8, 2, 20, 30, 0);
    const logs = [log({ scheduledTime: String(new Date(2026, 8, 2, 20, 0, 0).getTime()) })];
    expect(isDoseLogged(logs, { reminderTimeId: 'rt-1' }, now)).toBe(true);
  });

  it('bos log listesi ve null guvenligi', () => {
    const now = new Date(2026, 8, 2, 20, 0, 0);
    expect(isDoseLogged([], { reminderTimeId: 'rt-1' }, now)).toBe(false);
    expect(isDoseLogged(null as unknown as Log[], { reminderTimeId: 'rt-1' }, now)).toBe(false);
  });
});
