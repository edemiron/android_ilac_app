/**
 * `utils/notifications/alarmDedup.ts` sozlesme testleri.
 *
 * Kilitlenen uretim hatasi (v1.7.4): tek bir calmanın birden fazla giris yolu
 * DAKIKA SINIRINA denk geldiginde farkli anahtar uretiyor, alarm ekrani ust
 * uste iki kez aciliyordu. Kullanici "Simdi Al"a iki kez basmak zorunda
 * kaliyor ve ilk ekranda notifee bildiriminin sesi uzerine uygulama ici
 * oynatici bindigi icin ayni melodi iki farkli seviyede duyuluyordu.
 */

import {
  buildAlarmDedupKey,
  isAlarmIngressDuplicate,
  markAlarmIngressNavigated,
  releaseAlarmDedupFor,
  INGRESS_WINDOW_MS,
  __resetAlarmDedupForTests,
  __getAlarmDedupKeysForTests,
} from '../../utils/notifications/alarmDedup';
import { getAlarmKey } from '../../utils/alarmNavigation';

beforeEach(() => {
  __resetAlarmDedupForTests();
});

describe('buildAlarmDedupKey', () => {
  const ids = { medicineId: 'med-1', reminderTimeId: 'rt-1' };

  it('ANAHTAR DUVAR SAATI ICERMEZ — ayni doz, farkli an, AYNI anahtar', () => {
    const key = buildAlarmDedupKey(ids);
    expect(key).toBe('med-1::rt-1::main');
    // Regresyon: eskiden anahtarda `yyyy-MM-dd-HH-mm` vardi. Anahtarda hicbir
    // rakam grubu tarih/saat gibi gorunmemeli.
    expect(key).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(key).not.toMatch(/-\d{2}-\d{2}$/);
  });

  it('erteleme, ana alarmdan AYRI anahtar uzayinda yasar', () => {
    const main = buildAlarmDedupKey(ids);
    const snooze = buildAlarmDedupKey({ ...ids, isSnooze: 'true', snoozeId: 'sn-1' });
    expect(snooze).not.toBe(main);
    expect(snooze).toBe('med-1::rt-1::snooze:sn-1');
  });

  it('farkli erteleme kimlikleri farkli calmalardir', () => {
    expect(buildAlarmDedupKey({ ...ids, isSnooze: 'true', snoozeId: 'sn-1' })).not.toBe(
      buildAlarmDedupKey({ ...ids, isSnooze: 'true', snoozeId: 'sn-2' })
    );
  });

  it('isSnooze boolean true de string "true" gibi ele alinir', () => {
    expect(buildAlarmDedupKey({ ...ids, isSnooze: true, snoozeId: 'sn-1' })).toBe(
      buildAlarmDedupKey({ ...ids, isSnooze: 'true', snoozeId: 'sn-1' })
    );
  });

  it('ayni ilacin farkli DOZLARI ayri anahtarlar', () => {
    expect(buildAlarmDedupKey({ medicineId: 'med-1', reminderTimeId: 'rt-sabah' })).not.toBe(
      buildAlarmDedupKey({ medicineId: 'med-1', reminderTimeId: 'rt-aksam' })
    );
  });
});

describe('getAlarmKey (alarmNavigation) — dedup moduluyle ayni anahtari uretir', () => {
  it('DAKIKA SINIRI REGRESYONU: iki giris yolu farkli anlarda islenir, anahtar AYNI kalir', () => {
    const data = {
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2026-09-03T00:33:00',
    };
    // Sahadan gelen senaryo: yol A 00:33:59.8'de, yol B 00:34:00.3'te islendi.
    const yolA = getAlarmKey(data, new Date(2026, 8, 3, 0, 33, 59, 800));
    const yolB = getAlarmKey(data, new Date(2026, 8, 3, 0, 34, 0, 300));
    expect(yolA).toBe(yolB);
  });

  it('anahtar dedup modulunun uretimiyle birebir ayni', () => {
    const data = {
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2026-09-03T00:33:00',
      isSnooze: 'true',
      snoozeId: 'sn-9',
    };
    expect(getAlarmKey(data, new Date())).toBe(
      buildAlarmDedupKey({
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        isSnooze: 'true',
        snoozeId: 'sn-9',
      })
    );
  });
});

describe('ingress penceresi', () => {
  const ids = { medicineId: 'med-1', reminderTimeId: 'rt-1' };

  it('kayit yoksa yinelenme degildir', () => {
    expect(isAlarmIngressDuplicate(buildAlarmDedupKey(ids))).toBe(false);
  });

  it('ekran acildiktan sonraki girisler yinelenmedir', () => {
    const key = buildAlarmDedupKey(ids);
    const t0 = 1_000_000;
    markAlarmIngressNavigated(key, t0);
    expect(isAlarmIngressDuplicate(key, t0 + 1)).toBe(true);
    expect(isAlarmIngressDuplicate(key, t0 + 3_000)).toBe(true);
  });

  it('pencere dolunca kayit eskir (uygulama cozumlemeden oldurulduyse)', () => {
    const key = buildAlarmDedupKey(ids);
    const t0 = 1_000_000;
    markAlarmIngressNavigated(key, t0);
    expect(isAlarmIngressDuplicate(key, t0 + INGRESS_WINDOW_MS)).toBe(false);
    // Eskiyen kayit budanmis olmali.
    expect(__getAlarmDedupKeysForTests()).not.toContain(key);
  });

  it('bir dozun kaydi BASKA dozu susturmaz', () => {
    markAlarmIngressNavigated(
      buildAlarmDedupKey({ medicineId: 'med-1', reminderTimeId: 'rt-sabah' }),
      1000
    );
    expect(
      isAlarmIngressDuplicate(
        buildAlarmDedupKey({ medicineId: 'med-1', reminderTimeId: 'rt-aksam' }),
        1001
      )
    ).toBe(false);
  });
});

describe('releaseAlarmDedupFor — alarm cozumlendiginde kayit birakilir', () => {
  const ids = { medicineId: 'test-medicine', reminderTimeId: 'test-reminder' };

  it('TEST ALARMI REGRESYONU: kapatip hemen yeniden kurmak susturulmaz', () => {
    const key = buildAlarmDedupKey(ids);
    const t0 = 1_000_000;
    markAlarmIngressNavigated(key, t0);
    // Kullanici "Simdi Al"a basti (t0+2sn) -> kayit birakildi.
    releaseAlarmDedupFor(ids);
    // 5 saniyelik test alarmi yeniden kuruldu ve caldi (t0+7sn).
    expect(isAlarmIngressDuplicate(key, t0 + 7_000)).toBe(false);
  });

  it('ana alarm ekranindan cikis, ayni dozun erteleme kaydini da birakir', () => {
    const snoozeKey = buildAlarmDedupKey({ ...ids, isSnooze: 'true', snoozeId: 'sn-1' });
    markAlarmIngressNavigated(snoozeKey, 1000);
    releaseAlarmDedupFor({ ...ids, isSnooze: 'true', snoozeId: 'sn-1' });
    expect(isAlarmIngressDuplicate(snoozeKey, 1001)).toBe(false);
  });

  it('erteleme ekranindan cikis ANA alarm kaydini da birakir', () => {
    const mainKey = buildAlarmDedupKey(ids);
    markAlarmIngressNavigated(mainKey, 1000);
    releaseAlarmDedupFor({ ...ids, isSnooze: 'true', snoozeId: 'sn-1' });
    expect(isAlarmIngressDuplicate(mainKey, 1001)).toBe(false);
  });

  it('kaydi olmayan doz icin birakma sessizce gecer', () => {
    expect(() => releaseAlarmDedupFor({ medicineId: 'yok', reminderTimeId: 'yok' })).not.toThrow();
  });
});
