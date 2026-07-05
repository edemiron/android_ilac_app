/**
 * hooks/useSettingsHelpers testleri.
 */

import {
  parseTimeToDate,
  formatDateToTimeString,
  togglePickerVisibility,
  closePickerVisibility,
  generateRandomMedicines,
  pickRandomItem,
  TEST_MEDICINE_NAMES,
  TEST_MEDICINE_DOSES,
  TEST_INSTRUCTIONS,
  SETTING_TO_PICKER_MAP,
  validateTheme,
  validateLanguage,
  validateSnoozeDuration,
  validateMaxSnoozeCount,
  validateVolume,
  isValidTimeFormat,
  sanitizeSettings,
} from '../../hooks/useSettingsHelpers';

describe('parseTimeToDate', () => {
  it('parses HH:mm into Date with today date', () => {
    const result = parseTimeToDate('14:30');
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });

  it('handles 00:00 edge case', () => {
    const result = parseTimeToDate('00:00');
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('handles 23:59 edge case', () => {
    const result = parseTimeToDate('23:59');
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
  });
});

describe('formatDateToTimeString', () => {
  it('formats Date to HH:mm', () => {
    const date = new Date('2024-06-25T14:30:00Z');
    const timeStr = formatDateToTimeString(date);
    expect(timeStr).toMatch(/^\d{2}:\d{2}$/);
  });

  it('is inverse of parseTimeToDate (time-of-day match)', () => {
    const reference = new Date('2024-06-25T12:00:00Z');
    const date = parseTimeToDate('09:15', reference);
    const formatted = formatDateToTimeString(date);
    expect(formatted).toBe('09:15');
  });
});

describe('togglePickerVisibility', () => {
  it('flips closed picker to open', () => {
    const result = togglePickerVisibility({ showWakeUpPicker: false }, 'showWakeUpPicker');
    expect(result.showWakeUpPicker).toBe(true);
  });

  it('flips open picker to closed', () => {
    const result = togglePickerVisibility({ showWakeUpPicker: true }, 'showWakeUpPicker');
    expect(result.showWakeUpPicker).toBe(false);
  });

  it('does not mutate original state', () => {
    const original = { showWakeUpPicker: false };
    togglePickerVisibility(original, 'showWakeUpPicker');
    expect(original.showWakeUpPicker).toBe(false);
  });
});

describe('closePickerVisibility', () => {
  it('sets picker visibility to false', () => {
    const result = closePickerVisibility(
      { showWakeUpPicker: true, showSleepPicker: true },
      'showWakeUpPicker'
    );
    expect(result.showWakeUpPicker).toBe(false);
    expect(result.showSleepPicker).toBe(true); // other untouched
  });
});

describe('pickRandomItem', () => {
  it('returns item from array', () => {
    const result = pickRandomItem([1, 2, 3, 4, 5]);
    expect([1, 2, 3, 4, 5]).toContain(result);
  });

  it('returns undefined for empty array', () => {
    expect(pickRandomItem([])).toBeUndefined();
  });
});

describe('generateRandomMedicines', () => {
  it('generates exactly N items', () => {
    const result = generateRandomMedicines(5);
    expect(result).toHaveLength(5);
  });

  it('each item has valid name/dosage/instruction', () => {
    const result = generateRandomMedicines(10);
    for (const med of result) {
      expect(TEST_MEDICINE_NAMES).toContain(med.name);
      expect(TEST_MEDICINE_DOSES).toContain(med.dosage);
      expect(TEST_INSTRUCTIONS).toContain(med.instruction);
    }
  });

  it('returns empty array for 0 count', () => {
    expect(generateRandomMedicines(0)).toEqual([]);
  });
});

describe('SETTING_TO_PICKER_MAP', () => {
  it('maps all time settings to picker keys', () => {
    expect(SETTING_TO_PICKER_MAP.wakeUpTime).toBe('showWakeUpPicker');
    expect(SETTING_TO_PICKER_MAP.sleepTime).toBe('showSleepPicker');
    expect(SETTING_TO_PICKER_MAP.quietHoursStart).toBe('showQuietStartPicker');
    expect(SETTING_TO_PICKER_MAP.quietHoursEnd).toBe('showQuietEndPicker');
  });
});

describe('Sprint 10.2: validateTheme', () => {
  it('accepts valid theme values', () => {
    expect(validateTheme('light')).toBe('light');
    expect(validateTheme('dark')).toBe('dark');
    expect(validateTheme('auto')).toBe('auto');
  });

  it('returns "auto" for invalid values', () => {
    expect(validateTheme('rainbow')).toBe('auto');
    expect(validateTheme(null)).toBe('auto');
    expect(validateTheme(undefined)).toBe('auto');
    expect(validateTheme(123)).toBe('auto');
  });
});

describe('Sprint 10.2: validateLanguage', () => {
  it('accepts tr and en', () => {
    expect(validateLanguage('tr')).toBe('tr');
    expect(validateLanguage('en')).toBe('en');
  });

  it('returns "tr" for invalid values', () => {
    expect(validateLanguage('de')).toBe('tr');
    expect(validateLanguage(null)).toBe('tr');
  });
});

describe('Sprint 10.2: validateSnoozeDuration', () => {
  it('returns value within 1-60 range', () => {
    expect(validateSnoozeDuration(5)).toBe(5);
    expect(validateSnoozeDuration(30)).toBe(30);
  });

  it('clamps to 1 if too small', () => {
    expect(validateSnoozeDuration(0)).toBe(1);
    expect(validateSnoozeDuration(-5)).toBe(1);
  });

  it('clamps to 60 if too large', () => {
    expect(validateSnoozeDuration(120)).toBe(60);
    expect(validateSnoozeDuration(1000)).toBe(60);
  });

  it('uses default for invalid input', () => {
    expect(validateSnoozeDuration('abc' as any)).toBe(5);
    expect(validateSnoozeDuration(NaN)).toBe(5);
    expect(validateSnoozeDuration(null as any)).toBe(5);
  });
});

describe('Sprint 10.2: validateMaxSnoozeCount', () => {
  it('returns value within 1-10 range', () => {
    expect(validateMaxSnoozeCount(3)).toBe(3);
    expect(validateMaxSnoozeCount(7)).toBe(7);
  });

  it('clamps out-of-range values', () => {
    expect(validateMaxSnoozeCount(0)).toBe(1);
    expect(validateMaxSnoozeCount(20)).toBe(10);
  });
});

describe('Sprint 10.2: validateVolume', () => {
  it('returns value within 0-100 range', () => {
    expect(validateVolume(80)).toBe(80);
    expect(validateVolume(0)).toBe(0);
  });

  it('clamps out-of-range values', () => {
    expect(validateVolume(-10)).toBe(0);
    expect(validateVolume(150)).toBe(100);
  });
});

describe('Sprint 10.2: isValidTimeFormat', () => {
  it('accepts HH:mm', () => {
    expect(isValidTimeFormat('08:00')).toBe(true);
    expect(isValidTimeFormat('23:59')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidTimeFormat('8:00')).toBe(false);
    expect(isValidTimeFormat('25:00')).toBe(false);
    expect(isValidTimeFormat('not-a-time')).toBe(false);
    expect(isValidTimeFormat(null)).toBe(false);
  });
});

describe('Sprint 10.2: sanitizeSettings', () => {
  it('keeps only known fields', () => {
    const result = sanitizeSettings(
      { theme: 'dark', volume: 50, unknown: 'foo' },
      ['theme', 'volume'],
      { theme: 'auto' as const, volume: 80 }
    );
    expect(result.theme).toBe('dark');
    expect(result.volume).toBe(50);
    expect(result).not.toHaveProperty('unknown');
  });

  it('returns defaults for non-object input', () => {
    expect(sanitizeSettings(null, ['a'], { a: 1 })).toEqual({ a: 1 });
    expect(sanitizeSettings('string', ['a'], { a: 1 })).toEqual({ a: 1 });
  });

  it('uses defaults for missing fields', () => {
    const result = sanitizeSettings({}, ['theme', 'volume'], {
      theme: 'auto' as const,
      volume: 80,
    });
    expect(result.theme).toBe('auto');
    expect(result.volume).toBe(80);
  });
});
