/**
 * Alarm bildirim metni — tek kaynak testleri (v1.8.2).
 *
 * İki sınıf hatayı kilitliyor:
 *
 * 1. **Emoji.** Bildirim başlığı/gövdesi `💊`, `📦`, `⏰` taşıyordu. TalkBack
 *    bunları okuyor ve bazı OEM bildirim gölgelerinde emoji boş kutuya
 *    dönüyor. Bir ilaç hatırlatmasında bu kabul edilemez.
 *
 * 2. **Başlığı geri ayrıştırma.** `index.ts` arka plan erteleme işleyicisi
 *    ilaç adını `title.replace('💊 ', '').replace(/\(Ertelendi.*\)/, '')`
 *    ile kurtarıyordu. Başlık biçimi böylece yazılı olmayan bir sözleşmeydi
 *    ve regex dozu adın içinde bırakıyordu.
 */

import {
  buildAlarmTitle,
  buildAlarmSubtitle,
  buildAlarmBody,
  buildSnoozeTitle,
  buildSnoozeBody,
  parseMedicineNameFromLegacyTitle,
} from '../../utils/notifications/content';
import { hasEmoji } from '../helpers/emoji';

describe('alarm bildirim metni — emoji yok', () => {
  it('hicbir uretici emoji dondurmuyor', () => {
    const produced = [
      buildAlarmTitle('Parol', '500mg'),
      buildAlarmTitle('Parol'),
      buildAlarmSubtitle('08:30'),
      buildAlarmBody({
        medicineName: 'Parol',
        dosage: '500mg',
        instructionLabel: 'Yemekten Sonra • ',
        stockCount: 12,
        timeLabel: '08:30',
      }),
      buildSnoozeTitle('Parol', 1),
      buildSnoozeTitle('Parol', 3),
      buildSnoozeBody('500mg dozu', '09:00'),
    ];

    const offenders = produced.filter(text => hasEmoji(text));

    expect(offenders).toEqual([]);
  });
});

describe('buildAlarmTitle', () => {
  it('doz varsa parantez icinde ekler', () => {
    expect(buildAlarmTitle('Parol', '500mg')).toBe('Parol (500mg)');
  });

  it('doz yoksa parantez acmiyor', () => {
    expect(buildAlarmTitle('Parol')).toBe('Parol');
    expect(buildAlarmTitle('Parol', '')).toBe('Parol');
    expect(buildAlarmTitle('Parol', null)).toBe('Parol');
  });

  it('bos ad icin bosluk degil anlamli bir metin dondurur', () => {
    // Bildirim basligi bos kalirsa Android bildirimi paket adiyla gosterir.
    expect(buildAlarmTitle('')).toBe('İlaç');
    expect(buildAlarmTitle('   ')).toBe('İlaç');
  });
});

describe('buildSnoozeTitle', () => {
  it('ilk ertelemede sayac gostermez', () => {
    expect(buildSnoozeTitle('Parol', 1)).toBe('Parol (Ertelendi)');
  });

  it('ikinci ve sonrasinda sayaci gosterir', () => {
    expect(buildSnoozeTitle('Parol', 2)).toBe('Parol (Ertelendi x2)');
    expect(buildSnoozeTitle('Parol', 3)).toBe('Parol (Ertelendi x3)');
  });

  it('bozuk sayac degerlerinde cokmez', () => {
    expect(buildSnoozeTitle('Parol', 0)).toBe('Parol (Ertelendi)');
    expect(buildSnoozeTitle('Parol', -5)).toBe('Parol (Ertelendi)');
    expect(buildSnoozeTitle('Parol', NaN)).toBe('Parol (Ertelendi)');
    expect(buildSnoozeTitle('Parol', 2.7)).toBe('Parol (Ertelendi x2)');
  });
});

describe('buildAlarmBody', () => {
  it('stok bilinmiyorsa stok satiri EKLEMEZ', () => {
    // "Kalan stok: 0 adet" ile "stok bilinmiyor" ayni sey degil.
    const body = buildAlarmBody({ medicineName: 'Parol', timeLabel: '08:30' });

    expect(body).not.toContain('stok');
  });

  it('stok 0 ise satiri GOSTERIR', () => {
    const body = buildAlarmBody({ medicineName: 'Parol', timeLabel: '08:30', stockCount: 0 });

    expect(body).toContain('Kalan stok: 0 adet');
  });

  it('emir kipi kullanmiyor', () => {
    // Denetim maddesi 22: uygulama "alin" / "unutmayin" demiyor.
    const body = buildAlarmBody({
      medicineName: 'Parol',
      dosage: '500mg',
      instructionLabel: 'Yemekten Sonra • ',
      timeLabel: '08:30',
    });

    expect(body).not.toMatch(/unutmay|almanız|geldi/i);
    expect(body).toContain('08:30');
  });
});

describe('buildSnoozeBody', () => {
  it('orijinal govdenin ILK satirini korur ve yeni saati ekler', () => {
    const body = buildSnoozeBody('500mg dozunun saati: 08:30\nKalan stok: 12 adet', '09:00');

    expect(body).toBe('500mg dozunun saati: 08:30\nYeni saat: 09:00');
  });

  it('govde yoksa notr bir bas satiri kullanir', () => {
    expect(buildSnoozeBody(undefined, '09:00')).toBe('İlaç hatırlatması\nYeni saat: 09:00');
    expect(buildSnoozeBody('', '09:00')).toBe('İlaç hatırlatması\nYeni saat: 09:00');
  });
});

describe('parseMedicineNameFromLegacyTitle', () => {
  it('v1.8.1 ve oncesi basliklardan adi kurtarir', () => {
    expect(parseMedicineNameFromLegacyTitle('💊 Parol (500mg)')).toBe('Parol');
    expect(parseMedicineNameFromLegacyTitle('🔔 Parol (Ertelendi x2)')).toBe('Parol');
    expect(parseMedicineNameFromLegacyTitle('💊 Parol')).toBe('Parol');
  });

  it('yeni (emojisiz) basliklarda da calisir', () => {
    expect(parseMedicineNameFromLegacyTitle('Parol (500mg)')).toBe('Parol');
    expect(parseMedicineNameFromLegacyTitle('Parol (Ertelendi)')).toBe('Parol');
  });

  it('baslik yoksa cokmez', () => {
    expect(parseMedicineNameFromLegacyTitle(undefined)).toBe('İlaç');
    expect(parseMedicineNameFromLegacyTitle(null)).toBe('İlaç');
    expect(parseMedicineNameFromLegacyTitle('')).toBe('İlaç');
  });

  it('ad ICINDE parantez varsa yalnizca SONDAKI eki atar', () => {
    expect(parseMedicineNameFromLegacyTitle('Parol (Plus) (500mg)')).toBe('Parol (Plus)');
  });
});

describe('bildirim eylemleri (config.ts)', () => {
  it('emoji yok ve "Atla" bildirimden kaldirildi', () => {
    // v1.8.2: Bildirim golgesinde tek dokunusla, onay olmadan, gerekce
    // sorulmadan bir dozu ATLANDI yazmak klinik bir karari kazayla vermektir.
    // Atlama hala mumkun: tam ekran alarmda, gerekce soran onayli akisin
    // arkasinda.
    const { ALARM_ACTIONS } = require('../../utils/notifications/config');

    const titles = ALARM_ACTIONS.map((a: { title: string }) => a.title);
    const ids = ALARM_ACTIONS.map((a: { pressAction: { id: string } }) => a.pressAction.id);

    expect(titles.filter((t: string) => hasEmoji(t))).toEqual([]);
    expect(ids).toEqual(['take', 'snooze']);
    expect(ids).not.toContain('skip');
  });
});
