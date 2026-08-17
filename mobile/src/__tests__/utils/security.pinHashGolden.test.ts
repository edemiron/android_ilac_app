/**
 * PIN hash — altin deger (golden value) regresyonu.
 *
 * NEDEN GEREKLI?
 * PIN hash'leri kullanicinin CIHAZINDA sakli. hashPinWithSalt'in urettigi
 * deger degisirse mevcut kullanicilarin hicbiri uygulamasini acamaz. Bu,
 * sessiz ve geri donusu olmayan bir felaket olur.
 *
 * Mevcut pinCrypto testleri expo-crypto'yu ciplak jest.fn() ile mock'luyor
 * ve digestStringAsync'e sabit deger dondurtuyor. Yani 10.000 turluk
 * zincirin, ayirici karakterin ('|') ve tur sayisinin dogrulugu HIC
 * dogrulanmiyordu — expo-crypto 14 -> 15 yukseltmesinin hash'leri bozup
 * bozmadigi o testlerle kanitlanamaz.
 *
 * Bu test expo-crypto yerine Node'un GERCEK SHA-256'sini koyar ve bilinen
 * bir (pin, salt) cifti icin beklenen hash'i sabitler. Boylece:
 *   - tur sayisi (PIN_HASH_ROUNDS) degisirse,
 *   - ayirici bicim (`${pin}|${salt}`) degisirse,
 *   - hex/encoding varsayimi degisirse,
 * test kirilir.
 *
 * SINIR: bu test algoritmayi kilitler, expo-crypto'nun GERCEK ciktisini
 * dogrulamaz (native modul jest'te calismaz). expo-crypto'nun hex ciktisinin
 * bicimi degisirse bu test yakalamaz — o yalnizca cihazda, mevcut PIN'i olan
 * bir kurulumda kilit ekrani denenerek dogrulanabilir.
 */

// expo-crypto'yu GERCEK SHA-256 ile degistir.
// NOT: jest.mock fabrikasi kapsam disi degiskene erisemez, bu yuzden
// node:crypto fabrikanin ICINDE require edilir.
jest.mock('expo-crypto', () => {
  const { createHash } = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    CryptoEncoding: { HEX: 'hex' },
    getRandomBytesAsync: jest.fn(async (n: number) => new Uint8Array(n).fill(0xab)),
    digestStringAsync: jest.fn(async (_algo: string, data: string) =>
      createHash('sha256').update(data, 'utf8').digest('hex')
    ),
  };
});

import { hashPinWithSalt, generateSalt, generatePinHash } from '../../utils/security/pinCrypto';

/**
 * pin='1234', salt='abcd', 10.000 tur SHA-256/HEX zinciri.
 * Bagimsiz olarak Node ile hesaplandi.
 *
 * BU DEGERI GUNCELLEMEK, MEVCUT TUM KULLANICILARI KILITLEMEK DEMEKTIR.
 * Degistirmek zorunda kalirsan once bir gecis (migration) yolu tasarla.
 */
const GOLDEN_HASH = '495e40a8ffec1df199a4169d3acf703d167e4c27264b4fa4a0cfa504a8d90812';

describe('hashPinWithSalt — altin deger', () => {
  it('bilinen pin+salt icin beklenen hash uretir', async () => {
    await expect(hashPinWithSalt('1234', 'abcd')).resolves.toBe(GOLDEN_HASH);
  });

  it('deterministik: ayni girdi ayni cikti', async () => {
    const a = await hashPinWithSalt('1234', 'abcd');
    const b = await hashPinWithSalt('1234', 'abcd');
    expect(a).toBe(b);
  });

  it('farkli PIN farkli hash uretir', async () => {
    const a = await hashPinWithSalt('1234', 'abcd');
    const b = await hashPinWithSalt('1235', 'abcd');
    expect(a).not.toBe(b);
  });

  it('farkli salt farkli hash uretir (rainbow table korumasi)', async () => {
    const a = await hashPinWithSalt('1234', 'abcd');
    const b = await hashPinWithSalt('1234', 'abce');
    expect(a).not.toBe(b);
  });

  it('cikti 64 karakter kucuk harf hex', async () => {
    const hash = await hashPinWithSalt('1234', 'abcd');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  // Ayirici olmasa "12|34" ile "1|234" ayni hash'i verirdi.
  it('pin ile salt arasindaki ayirici karisikligi onler', async () => {
    const a = await hashPinWithSalt('12', '34');
    const b = await hashPinWithSalt('1', '234');
    expect(a).not.toBe(b);
  });
});

describe('generateSalt', () => {
  it('32 byte -> 64 karakter hex', async () => {
    const salt = await generateSalt();
    expect(salt).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generatePinHash', () => {
  it('salt ve hash birlikte doner ve hash o salt ile yeniden uretilebilir', async () => {
    const { hash, salt } = await generatePinHash('9876');

    expect(salt).toMatch(/^[0-9a-f]{64}$/);
    await expect(hashPinWithSalt('9876', salt)).resolves.toBe(hash);
  });
});
