/**
 * `parseDosageInstruction` — e-recete talimat metninden doz sikligi cikarimi.
 *
 * v1.7.1 KRITIK ONARIM: kosul sirasi yanlisti. `sabah && akşam` kontrolu,
 * `sabah && öğle && akşam` kontrolunden once geldigi icin Turkiye'de en
 * yaygin recete talimati olan **"sabah ogle aksam"** gunde 2 olarak
 * ayristiriliyordu → hasta gunde 3 yerine 2 alarm aliyor, her gun bir doz
 * kaciriyordu. Bu test o senaryoyu dogrudan sabitler.
 */

import { parseDosageInstruction } from '../../utils/ereceteParser';

describe('parseDosageInstruction — siklik', () => {
  it('"sabah öğle akşam" GUNDE 3 demektir (regresyon)', () => {
    expect(parseDosageInstruction('sabah öğle akşam').frequency).toBe(3);
    expect(parseDosageInstruction('Sabah Öğle Akşam tok').frequency).toBe(3);
    expect(parseDosageInstruction('her gün sabah, öğle ve akşam alınacak').frequency).toBe(3);
  });

  it('iki vakit gecen talimatlar gunde 2', () => {
    expect(parseDosageInstruction('sabah akşam').frequency).toBe(2);
    expect(parseDosageInstruction('sabah ve öğle').frequency).toBe(2);
    expect(parseDosageInstruction('öğle akşam').frequency).toBe(2);
  });

  it('tek vakit gecen talimat gunde 1', () => {
    expect(parseDosageInstruction('sabah aç karnına').frequency).toBe(1);
    expect(parseDosageInstruction('akşam yatmadan').frequency).toBe(1);
  });

  it('NxM formati vakit kelimelerinden ONCE gelir', () => {
    // "3x1 sabah akşam" gibi celiskili metinlerde sayisal format esas alinir.
    expect(parseDosageInstruction('3x1 sabah akşam').frequency).toBe(3);
    expect(parseDosageInstruction('2x1 tok').frequency).toBe(2);
    expect(parseDosageInstruction('Günde 1x1.0').frequency).toBe(1);
  });

  it('"günde N kez/defa" kaliplari', () => {
    expect(parseDosageInstruction('günde 2 kez').frequency).toBe(2);
    expect(parseDosageInstruction('günde 3 defa').frequency).toBe(3);
    expect(parseDosageInstruction('günde 4 kez').frequency).toBe(4);
  });

  it('anlasilamayan metin gunde 1 varsayar', () => {
    expect(parseDosageInstruction('').frequency).toBe(1);
    expect(parseDosageInstruction('doktor tarifine göre').frequency).toBe(1);
  });

  it('makul olmayan NxM degerlerini yok sayar', () => {
    // 1-6 araligi disi degerler varsayilana duser (OCR gurultusu korumasi).
    expect(parseDosageInstruction('12x1').frequency).toBe(1);
    expect(parseDosageInstruction('0x1').frequency).toBe(1);
  });
});

describe('parseDosageInstruction — talimat', () => {
  it('yatmadan/gece → before_sleep', () => {
    expect(parseDosageInstruction('akşam yatmadan').instructions).toBe('before_sleep');
    expect(parseDosageInstruction('gece 1x1').instructions).toBe('before_sleep');
  });

  it('aç karnına → empty_stomach', () => {
    expect(parseDosageInstruction('sabah aç karnına').instructions).toBe('empty_stomach');
  });

  it('yemekten önce → before_meal', () => {
    expect(parseDosageInstruction('yemekten önce 1x1').instructions).toBe('before_meal');
  });

  it('yemekle birlikte → with_meal', () => {
    expect(parseDosageInstruction('yemekle birlikte').instructions).toBe('with_meal');
  });

  it('varsayilan tok (after_meal)', () => {
    expect(parseDosageInstruction('2x1').instructions).toBe('after_meal');
  });

  it('dosageText siklik ve talimati birlestirir', () => {
    expect(parseDosageInstruction('sabah öğle akşam tok').dosageText).toBe('3x1 Tok');
    expect(parseDosageInstruction('sabah aç karnına').dosageText).toBe('1x1 Aç');
  });
});
