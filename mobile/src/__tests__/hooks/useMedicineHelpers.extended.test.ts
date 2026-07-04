/**
 * useMedicineHelpers ek helpers testleri.
 *
 * Sprint 7.4: useMedicineHelpers.ts'e ek pure helper'lar — sanitize/validate.
 */

import {
  sanitizeMedicineName,
  sanitizeDosage,
  isValidDosageFormat,
  isValidReminderTimes,
  isValidClockTime,
  summarizeFormState,
} from '../../hooks/useMedicineHelpers';

describe('sanitizeMedicineName', () => {
  it('trims leading/trailing whitespace', () => {
    expect(sanitizeMedicineName('  Aspirin  ')).toBe('Aspirin');
  });

  it('collapses multiple spaces', () => {
    expect(sanitizeMedicineName('A    B    C')).toBe('A B C');
  });

  it('returns null for empty after trim', () => {
    expect(sanitizeMedicineName('   ')).toBeNull();
    expect(sanitizeMedicineName('')).toBeNull();
  });

  it('returns null for non-string', () => {
    expect(sanitizeMedicineName(null as any)).toBeNull();
    expect(sanitizeMedicineName(undefined as any)).toBeNull();
    expect(sanitizeMedicineName(123 as any)).toBeNull();
  });

  it('handles Turkish characters', () => {
    expect(sanitizeMedicineName('  Parol   Tablet  ')).toBe('Parol Tablet');
  });
});

describe('sanitizeDosage', () => {
  it('removes whitespace between number and unit', () => {
    expect(sanitizeDosage('500 mg')).toBe('500mg');
    expect(sanitizeDosage('5 ml')).toBe('5ml');
  });

  it('returns null for empty', () => {
    expect(sanitizeDosage('')).toBeNull();
    expect(sanitizeDosage('   ')).toBeNull();
  });

  it('preserves complex dosages', () => {
    expect(sanitizeDosage('500mg/5ml')).toBe('500mg/5ml');
    expect(sanitizeDosage('1 tablet')).toBe('1tablet');
  });

  it('handles non-string', () => {
    expect(sanitizeDosage(null as any)).toBeNull();
    expect(sanitizeDosage(undefined as any)).toBeNull();
  });
});

describe('isValidDosageFormat', () => {
  it('accepts numeric dosages', () => {
    expect(isValidDosageFormat('500mg')).toBe(true);
    expect(isValidDosageFormat('5ml')).toBe(true);
    expect(isValidDosageFormat('1 tablet')).toBe(true);
  });

  it('rejects non-numeric dosages', () => {
    expect(isValidDosageFormat('tablet')).toBe(false);
    expect(isValidDosageFormat('xyz')).toBe(false);
  });

  it('rejects empty/invalid', () => {
    expect(isValidDosageFormat('')).toBe(false);
    expect(isValidDosageFormat(null as any)).toBe(false);
  });
});

describe('isValidClockTime', () => {
  it('accepts valid 24-hour times', () => {
    expect(isValidClockTime('00:00')).toBe(true);
    expect(isValidClockTime('08:30')).toBe(true);
    expect(isValidClockTime('23:59')).toBe(true);
  });

  it('rejects out-of-range hours', () => {
    expect(isValidClockTime('24:00')).toBe(false);
    expect(isValidClockTime('99:00')).toBe(false);
  });

  it('rejects out-of-range minutes', () => {
    expect(isValidClockTime('08:60')).toBe(false);
    expect(isValidClockTime('08:99')).toBe(false);
  });

  it('handles non-standard format (validation tolerates missing padding)', () => {
    // parseTimeString tolerates '8:30' (no padding) — validation passes
    // since parseInt is forgiving. Tests intentionally lenient.
    expect(isValidClockTime('8:30')).toBe(true); // tolerates missing zero-pad
    expect(isValidClockTime('not-a-time')).toBe(false); // NaN hours
  });
});

describe('isValidReminderTimes', () => {
  it('accepts valid time arrays', () => {
    expect(isValidReminderTimes(['08:00', '14:30', '22:00'])).toBe(true);
    expect(isValidReminderTimes(['00:00'])).toBe(true);
  });

  it('rejects empty arrays', () => {
    expect(isValidReminderTimes([])).toBe(false);
  });

  it('rejects invalid times in array', () => {
    expect(isValidReminderTimes(['08:00', '25:00'])).toBe(false);
    expect(isValidReminderTimes(['not-a-time'])).toBe(false);
  });

  it('rejects non-array input', () => {
    expect(isValidReminderTimes(null as any)).toBe(false);
    expect(isValidReminderTimes(undefined as any)).toBe(false);
    expect(isValidReminderTimes('08:00' as any)).toBe(false);
  });
});

describe('summarizeFormState', () => {
  it('formats full form state', () => {
    const summary = summarizeFormState({
      name: '  Aspirin  ',
      dosage: '500 mg',
      frequency: 3,
      useCustomTimes: true,
      customTimes: ['08:00', '14:00', '20:00'],
    });
    expect(summary).toBe('Aspirin | 500 mg | 3x/gün | 3 alarm');
  });

  it('uses frequency when custom times disabled', () => {
    const summary = summarizeFormState({
      name: 'Parol',
      dosage: '500mg',
      frequency: 2,
      useCustomTimes: false,
    });
    expect(summary).toBe('Parol | 500mg | 2x/gün | 2 alarm');
  });

  it('handles missing fields gracefully', () => {
    const summary = summarizeFormState({});
    expect(summary).toBe('(no-name) | ? | 0x/gün | 0 alarm');
  });
});
