/**
 * AlarmScreen helpers testleri.
 */

import {
  getInstructionDisplay,
  formatCountdownText,
  formatSnoozeRemainingText,
  resolveSnoozeSettings,
  resolveSnoozeRights,
  INSTRUCTION_DISPLAY_TEXTS,
  INSTRUCTION_ICONS,
  getInstructionIcon,
  ALARM_TAKE_ACTION_LABELS,
  DEFAULT_SNOOZE_DURATION,
  DEFAULT_MAX_SNOOZE_COUNT,
} from '../../screens/AlarmScreen/helpers';
import type { MedicineInstruction } from '../../types';
import { hasEmoji } from '../helpers/emoji';

describe('getInstructionDisplay', () => {
  // v1.8.7: bu iddialar eskiden etiketi EMOJISIYLE birlikte sabitliyordu
  // ('🍽️ Yemekten önce'). Emojiyi metinden cikarip ikon fontuna tasimak
  // davranissal bir gerileme olmadigi halde testi kirdi — yani test yanlis
  // seyi kilitlemisti. Artik dogrulanan sey etiketin ANLAMI ve emoji
  // TASIMADIGI.
  it('returns Turkish label for known instruction', () => {
    expect(getInstructionDisplay('before_meal', 'tr')).toBe('Yemekten önce');
    expect(getInstructionDisplay('after_meal', 'tr')).toBe('Yemekten sonra');
  });

  it('returns English label for known instruction', () => {
    expect(getInstructionDisplay('after_meal', 'en')).toBe('After meal');
  });

  it('returns null for unknown instruction', () => {
    expect(getInstructionDisplay('xyz' as MedicineInstruction, 'en')).toBeNull();
  });

  it('returns null for undefined instruction', () => {
    expect(getInstructionDisplay(undefined, 'en')).toBeNull();
  });

  it('handles all_six standard instructions', () => {
    const instructions: MedicineInstruction[] = [
      'before_meal',
      'after_meal',
      'with_meal',
      'empty_stomach',
      'before_sleep',
      'any_time',
    ];
    for (const inst of instructions) {
      expect(getInstructionDisplay(inst, 'tr')).toBe(INSTRUCTION_DISPLAY_TEXTS[inst].tr);
      expect(getInstructionDisplay(inst, 'en')).toBe(INSTRUCTION_DISPLAY_TEXTS[inst].en);
    }
  });
});

describe('formatCountdownText', () => {
  it('returns "Şimdi" for 0/negative', () => {
    expect(formatCountdownText(0, 'tr')).toBe('Şimdi');
    expect(formatCountdownText(-5, 'en')).toBe('Now');
  });

  it('formats seconds-only TR/EN', () => {
    expect(formatCountdownText(30, 'tr')).toBe('30 sn');
    expect(formatCountdownText(30, 'en')).toBe('30s');
  });

  it('formats minutes+seconds TR/EN', () => {
    expect(formatCountdownText(125, 'tr')).toBe('2 dk 5 sn');
    expect(formatCountdownText(125, 'en')).toBe('2m 5s');
  });
});

describe('formatSnoozeRemainingText', () => {
  it('returns remaining count with TR/EN labels', () => {
    expect(formatSnoozeRemainingText(0, 3, 'tr')).toMatch(/3/);
    expect(formatSnoozeRemainingText(0, 3, 'en')).toMatch(/3/);
  });

  it('handles exhausted (current >= max)', () => {
    const result = formatSnoozeRemainingText(5, 3, 'tr');
    expect(result).toMatch(/0/);
  });

  it('clamps negative remaining to 0', () => {
    expect(formatSnoozeRemainingText(10, 3, 'en')).toMatch(/0/);
  });
});

describe('resolveSnoozeSettings', () => {
  it('returns provided values', () => {
    expect(resolveSnoozeSettings(10, 5)).toEqual({ snoozeDuration: 10, maxSnoozeCount: 5 });
  });

  it('uses defaults for undefined', () => {
    expect(resolveSnoozeSettings(undefined, undefined)).toEqual({
      snoozeDuration: DEFAULT_SNOOZE_DURATION,
      maxSnoozeCount: DEFAULT_MAX_SNOOZE_COUNT,
    });
  });

  it('handles partial undefined', () => {
    expect(resolveSnoozeSettings(undefined, 5)).toEqual({
      snoozeDuration: DEFAULT_SNOOZE_DURATION,
      maxSnoozeCount: 5,
    });
  });
});

describe('INSTRUCTION_DISPLAY_TEXTS', () => {
  it('has both TR + EN for every entry', () => {
    for (const key of Object.keys(INSTRUCTION_DISPLAY_TEXTS)) {
      const entry = INSTRUCTION_DISPLAY_TEXTS[key];
      expect(entry.tr).toBeTruthy();
      expect(entry.en).toBeTruthy();
    }
  });

  /**
   * v1.8.7 — ALARM EKRANI EMOJI KAPISI.
   *
   * Alarm ekrani kritik yol: hasta uykudan uyanip bu ekrana bakiyor.
   * TalkBack kullaniyorsa emoji basligin parcasi olarak okunuyordu
   * ("saat emojisi Herhangi bir zaman") ve emoji fontu eksik cihazlarda
   * bos kutuya donuyordu. Gorsel isaret artik ikon fontunda.
   */
  it('hicbir talimat etiketi emoji TASIMIYOR', () => {
    const offenders = Object.entries(INSTRUCTION_DISPLAY_TEXTS).flatMap(([key, entry]) =>
      [entry.tr, entry.en].filter(text => hasEmoji(text)).map(text => `${key}: ${text}`)
    );

    expect(offenders).toEqual([]);
  });

  it('her talimatin bir IKON adi var (metni olan ama ikonu olmayan rozet olmaz)', () => {
    const textKeys = Object.keys(INSTRUCTION_DISPLAY_TEXTS).sort();
    const iconKeys = Object.keys(INSTRUCTION_ICONS).sort();

    expect(iconKeys).toEqual(textKeys);
    expect(textKeys.length).toBe(6);
    for (const key of textKeys) {
      expect(INSTRUCTION_ICONS[key]).toMatch(/^[a-z-]+$/);
    }
  });
});

describe('getInstructionIcon', () => {
  it('bilinen talimat icin ikon adi doner', () => {
    expect(getInstructionIcon('any_time')).toBe('time-outline');
    expect(getInstructionIcon('empty_stomach')).toBe('warning-outline');
    expect(getInstructionIcon('before_sleep')).toBe('moon-outline');
  });

  it('bilinmeyen/tanimsiz talimatta null doner (rozet ikonsuz cizilir)', () => {
    expect(getInstructionIcon('xyz' as MedicineInstruction)).toBeNull();
    expect(getInstructionIcon(undefined)).toBeNull();
  });
});

describe('ALARM_TAKE_ACTION_LABELS', () => {
  it('has TR/EN for taken/skipped titles', () => {
    expect(ALARM_TAKE_ACTION_LABELS.takenTitle.tr).toBe('İlaç alındı');
    expect(ALARM_TAKE_ACTION_LABELS.takenTitle.en).toBe('Medicine taken');
    expect(ALARM_TAKE_ACTION_LABELS.skippedTitle.tr).toBe('İlaç atlandı');
  });
});

/**
 * ⚠️ v1.7.7 — ERTELEME HAKKI REGRESYONU (KLINIK)
 *
 * `useAlarmController` icinde bu karar iki satirlik bir ifadeydi ve uzerine
 * dozu SESSIZCE `atlandi` yazan iki dal kurulmustu:
 *
 *   if (!canSnooze) handleSkip();              // "Erteleme hakkin bitti" yazan
 *                                              // butona dokunmak dozu atliyordu
 *   if (remainingSnoozes === 1) handleSkip();  // ilan edilen 3. hak hic
 *                                              // kullanilamiyordu
 *
 * "Atlandi" doktora giden uyum raporuna yazilan klinik bir karardir ve
 * yalnizca kullanici acikca secerse yazilmalidir.
 */
describe('resolveSnoozeRights (N hak = N erteleme)', () => {
  it('hic erteleme yapilmamissa TAM hak verir', () => {
    expect(resolveSnoozeRights(0, 3)).toEqual({
      canSnooze: true,
      remainingSnoozes: 3,
      limitReached: false,
    });
  });

  it('SON HAK hala kullanilabilir (eskiden burada doz atlaniyordu)', () => {
    const rights = resolveSnoozeRights(2, 3);
    expect(rights.canSnooze).toBe(true);
    expect(rights.remainingSnoozes).toBe(1);
    expect(rights.limitReached).toBe(false);
  });

  it('ilan edilen hak sayisi kadar erteleme yapilabilir — 3 hak, 3 erteleme', () => {
    const kullanilabilir = [0, 1, 2].filter(used => resolveSnoozeRights(used, 3).canSnooze);
    expect(kullanilabilir).toHaveLength(3);
  });

  it('hak bitince canSnooze false ve limitReached true olur', () => {
    expect(resolveSnoozeRights(3, 3)).toEqual({
      canSnooze: false,
      remainingSnoozes: 0,
      limitReached: true,
    });
  });

  it('sayac limiti asmissa kalan hak negatife dusmez', () => {
    expect(resolveSnoozeRights(9, 3)).toEqual({
      canSnooze: false,
      remainingSnoozes: 0,
      limitReached: true,
    });
  });

  it('maxSnoozeCount 0 ise hic erteleme hakki yoktur', () => {
    expect(resolveSnoozeRights(0, 0).canSnooze).toBe(false);
  });

  it('bozuk degerler hakki yanlislikla acmaz/kapatmaz', () => {
    expect(resolveSnoozeRights(NaN, 3).remainingSnoozes).toBe(3);
    expect(resolveSnoozeRights(-5, 3).remainingSnoozes).toBe(3);
    expect(resolveSnoozeRights(1, NaN).canSnooze).toBe(false);
  });
});
