/**
 * AlarmScreen helpers testleri.
 */

import {
  getInstructionDisplay,
  formatCountdownText,
  formatSnoozeRemainingText,
  resolveSnoozeSettings,
  INSTRUCTION_DISPLAY_TEXTS,
  ALARM_TAKE_ACTION_LABELS,
  DEFAULT_SNOOZE_DURATION,
  DEFAULT_MAX_SNOOZE_COUNT,
} from '../../screens/AlarmScreen/helpers';
import type { MedicineInstruction } from '../../types';

describe('getInstructionDisplay', () => {
  it('returns Turkish label for known instruction', () => {
    expect(getInstructionDisplay('before_meal', 'tr')).toBe('🍽️ Yemekten önce');
    expect(getInstructionDisplay('after_meal', 'tr')).toBe('🍽️ Yemekten sonra');
  });

  it('returns English label for known instruction', () => {
    expect(getInstructionDisplay('after_meal', 'en')).toBe('🍽️ After meal');
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
});

describe('ALARM_TAKE_ACTION_LABELS', () => {
  it('has TR/EN for taken/skipped titles', () => {
    expect(ALARM_TAKE_ACTION_LABELS.takenTitle.tr).toBe('İlaç alındı');
    expect(ALARM_TAKE_ACTION_LABELS.takenTitle.en).toBe('Medicine taken');
    expect(ALARM_TAKE_ACTION_LABELS.skippedTitle.tr).toBe('İlaç atlandı');
  });
});
