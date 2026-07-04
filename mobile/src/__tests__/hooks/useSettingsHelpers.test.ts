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
