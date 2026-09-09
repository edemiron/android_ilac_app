/**
 * Hesap silme onay kelimesi — saf kurallar.
 *
 * En önemli test: Türkçe büyük harf dönüşümü. `'sil'.toUpperCase()` JS'te
 * `'SIL'` verir (noktasız I), `'SİL'` DEĞİL. Locale'siz karşılaştırma
 * yapılırsa "sil" yazan kullanıcı REDDEDİLİR ve hesabını silemez —
 * KVKK md. 11-e kapsamındaki bir hakkı bir karakter kodlaması yüzünden
 * kullanamaz.
 */

import {
  DELETION_CONFIRMATION_WORD,
  DELETED_DATA_ITEMS,
  isDeletionConfirmed,
} from '../../domain/accountDeletion';

describe('isDeletionConfirmed — Turkce', () => {
  it('tam eslesmeyi kabul eder', () => {
    expect(isDeletionConfirmed('SİL', 'tr')).toBe(true);
  });

  it('kucuk harfli "sil"i kabul eder (Turkce noktali I tuzagi)', () => {
    // Bu, locale'siz `toUpperCase()` ile CALISMAZ: 'sil'.toUpperCase() === 'SIL'
    expect(isDeletionConfirmed('sil', 'tr')).toBe(true);
    expect('sil'.toUpperCase()).toBe('SIL'); // tuzagin kaniti
  });

  it('karisik yazimi kabul eder', () => {
    expect(isDeletionConfirmed('Sil', 'tr')).toBe(true);
    expect(isDeletionConfirmed('sİl', 'tr')).toBe(true);
  });

  it('bastaki/sondaki boslugu yok sayar', () => {
    expect(isDeletionConfirmed('  SİL  ', 'tr')).toBe(true);
    expect(isDeletionConfirmed('sil\n', 'tr')).toBe(true);
  });

  it('yanlis metni reddeder', () => {
    expect(isDeletionConfirmed('SI', 'tr')).toBe(false);
    expect(isDeletionConfirmed('SİLL', 'tr')).toBe(false);
    expect(isDeletionConfirmed('DELETE', 'tr')).toBe(false);
    expect(isDeletionConfirmed('sil hesabımı', 'tr')).toBe(false);
  });

  it('bos metni reddeder', () => {
    expect(isDeletionConfirmed('', 'tr')).toBe(false);
    expect(isDeletionConfirmed('   ', 'tr')).toBe(false);
    // Tip disi girisler de reddedilmeli: yikici bir islem bunu bagislamamali.
    expect(isDeletionConfirmed(undefined as unknown as string, 'tr')).toBe(false);
    expect(isDeletionConfirmed(null as unknown as string, 'tr')).toBe(false);
  });
});

describe('isDeletionConfirmed — Ingilizce', () => {
  it('DELETE ve delete kabul edilir', () => {
    expect(isDeletionConfirmed('DELETE', 'en')).toBe(true);
    expect(isDeletionConfirmed('delete', 'en')).toBe(true);
    expect(isDeletionConfirmed(' Delete ', 'en')).toBe(true);
  });

  it('Turkce kelimeyi Ingilizce dilde kabul ETMEZ', () => {
    expect(isDeletionConfirmed('SİL', 'en')).toBe(false);
  });

  it('dil verilmezse Turkce varsayilir', () => {
    expect(isDeletionConfirmed('SİL')).toBe(true);
    expect(isDeletionConfirmed('DELETE')).toBe(false);
  });
});

describe('silinecek veri listesi', () => {
  it('iki dilde de bos degil ve ayni sayida kalem iceriyor', () => {
    // KVKK aydinlatma yukumlulugu somutluk istiyor; "tum verileriniz"
    // yeterli degil. Iki dilin AYRISMASI da kabul edilemez: Ingilizce
    // kullanici eksik bilgilendirilmis olur.
    expect(DELETED_DATA_ITEMS.tr.length).toBeGreaterThan(3);
    expect(DELETED_DATA_ITEMS.en.length).toBe(DELETED_DATA_ITEMS.tr.length);
  });

  it('giris hesabinin da silindigi acikca yaziyor', () => {
    // Kullanicinin en cok yanlis anladigi nokta: "verilerim silinir ama
    // hesabim kalir mi?" Listede acikca gecmeli.
    expect(DELETED_DATA_ITEMS.tr.some(item => /hesab/i.test(item))).toBe(true);
    expect(DELETED_DATA_ITEMS.en.some(item => /account/i.test(item))).toBe(true);
  });

  it('onay kelimeleri iki dilde de tanimli', () => {
    expect(DELETION_CONFIRMATION_WORD.tr).toBeTruthy();
    expect(DELETION_CONFIRMATION_WORD.en).toBeTruthy();
  });
});
