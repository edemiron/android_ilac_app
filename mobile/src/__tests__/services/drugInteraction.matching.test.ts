/**
 * drugInteraction — isim eslesme regresyonlari.
 *
 * Bir ilac hatirlaticida yanlis pozitif etkilesim uyarisi iki yonlu zarar
 * verir: kullaniciyi gereksiz telaslandirir ve GERCEK uyarilara olan guveni
 * asindirir (alarm yorgunlugu). Bu yuzden eslesme mantigi hem tutarli hem
 * de patolojik girdilere karsi dayanikli olmali.
 */

import { checkInteractionLocal } from '../../services/drugInteraction';

describe('checkInteractionLocal — gercek etkilesimler', () => {
  it.each([
    ['Aspirin', 'Warfarin'],
    ['Aspirin', 'Ibuprofen'],
    ['Coraspin 100mg', 'Apranax Forte'],
    ['Parol', 'Alkol'],
    ['Minoset Plus', 'Alkol'],
  ])('%s + %s etkilesimi bulunur', (a, b) => {
    expect(checkInteractionLocal(a, b)).not.toBeNull();
  });

  it('doz ekli isimler etken maddeye cozulur', () => {
    // Alt dize eslesmesinin var olma sebebi bu senaryo.
    const result = checkInteractionLocal('Aspirin 100mg tablet', 'Warfarin 5mg');
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('high');
  });

  it('cift yon simetriktir', () => {
    const forward = checkInteractionLocal('Aspirin', 'Warfarin');
    const backward = checkInteractionLocal('Warfarin', 'Aspirin');
    expect(forward).not.toBeNull();
    expect(backward).not.toBeNull();
    expect(backward?.severity).toBe(forward?.severity);
  });
});

describe('checkInteractionLocal — yanlis pozitif korumasi', () => {
  // REGRESYON: normalizeDrugName alfanumerik olmayan her seyi siliyor, yani
  // bu isimler '' donuyordu. Eski kod kosulsuz `includes` kullandigi icin
  // `'aspirin'.includes('')` DAIMA true doner ve ilgisiz bir 'high' uyari
  // uretilirdi. Firestore kurallari bu isimlere izin veriyor.
  it.each([['...'], ['+'], ['---'], ['((()))'], ['   .']])(
    'normalize sonucu bos olan "%s" gercek bir ilacla eslesmez',
    name => {
      expect(checkInteractionLocal(name, 'Aspirin')).toBeNull();
      expect(checkInteractionLocal(name, 'Warfarin')).toBeNull();
      expect(checkInteractionLocal(name, 'Coraspin')).toBeNull();
    }
  );

  it('normalize sonucu bos olan iki isim birbiriyle de eslesmez', () => {
    expect(checkInteractionLocal('...', '---')).toBeNull();
  });

  // REGRESYON: 'alkol' icinde 'al' bulundugu icin "Al" adli bir takviye
  // parasetamol+alkol karaciger uyarisini tetikliyordu.
  it.each([['Al'], ['As'], ['Ib']])('kisa isim "%s" alt dize ile eslesmez', name => {
    expect(checkInteractionLocal(name, 'Parol')).toBeNull();
    expect(checkInteractionLocal(name, 'Aspirin')).toBeNull();
  });

  it('alakasiz ilaclar temiz kalir', () => {
    expect(checkInteractionLocal('Vitamin D', 'Omega 3')).toBeNull();
    expect(checkInteractionLocal('Beloc', 'Zyrtec')).toBeNull();
    expect(checkInteractionLocal('Parol', 'Vitamin C')).toBeNull();
  });

  it('bos ve bosluk girdiler guvenli sekilde null doner', () => {
    expect(checkInteractionLocal('', 'Aspirin')).toBeNull();
    expect(checkInteractionLocal('   ', 'Aspirin')).toBeNull();
    expect(checkInteractionLocal('', '')).toBeNull();
  });
});
