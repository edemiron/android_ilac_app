/**
 * useMedicineHelpers testleri.
 */

import {
  adjustTimesForConflicts,
  compareTimeStrings,
  formatTimeString,
  normalizeMedicineTimes,
  parseTimeString,
} from '../../hooks/useMedicineHelpers';

describe('parseTimeString', () => {
  it('parses HH:mm format', () => {
    expect(parseTimeString('08:30')).toEqual([8, 30]);
    expect(parseTimeString('23:59')).toEqual([23, 59]);
  });

  it('handles invalid format gracefully', () => {
    expect(parseTimeString('')).toEqual([0, 0]);
  });
});

describe('formatTimeString', () => {
  it('formats [hours, minutes] to HH:mm', () => {
    expect(formatTimeString(8, 30)).toBe('08:30');
    expect(formatTimeString(0, 0)).toBe('00:00');
    expect(formatTimeString(23, 59)).toBe('23:59');
  });

  it('pads single-digit values', () => {
    expect(formatTimeString(9, 5)).toBe('09:05');
  });
});

describe('compareTimeStrings', () => {
  it('returns negative when a < b', () => {
    expect(compareTimeStrings('08:00', '08:30')).toBeLessThan(0);
    expect(compareTimeStrings('08:00', '09:00')).toBeLessThan(0);
  });

  it('returns positive when a > b', () => {
    expect(compareTimeStrings('09:00', '08:00')).toBeGreaterThan(0);
  });

  it('returns 0 for equal times', () => {
    expect(compareTimeStrings('08:30', '08:30')).toBe(0);
  });
});

describe('normalizeMedicineTimes', () => {
  it('removes duplicates', () => {
    expect(normalizeMedicineTimes(['08:00', '08:00', '09:00'])).toEqual(['08:00', '09:00']);
  });

  it('sorts ascending', () => {
    expect(normalizeMedicineTimes(['09:00', '08:00', '10:00'])).toEqual([
      '08:00',
      '09:00',
      '10:00',
    ]);
  });

  it('returns empty for empty', () => {
    expect(normalizeMedicineTimes([])).toEqual([]);
  });
});

describe('adjustTimesForConflicts', () => {
  it('passes through times with no conflicts', () => {
    expect(adjustTimesForConflicts(['08:00'], new Set(), 30)).toEqual(['08:00']);
    expect(adjustTimesForConflicts(['08:00', '20:00'], new Set(), 30)).toEqual(['08:00', '20:00']);
  });

  it('shifts conflicting time forward by interval', () => {
    expect(adjustTimesForConflicts(['08:00'], new Set(['08:00']), 30)).toEqual(['08:30']);
  });

  it('handles multiple conflicts in a row', () => {
    expect(adjustTimesForConflicts(['08:00', '08:30'], new Set(['08:00', '08:30']), 30)).toEqual([
      '09:00',
      '09:30',
    ]);
  });

  it('preserves original time if no slot found', () => {
    // 30dk x 6 = 3 saat (08:00 -> 11:00) — bu yuzden 11:00'e kadar tum slot'lari conflict yapmaliyiz
    const conflicts = new Set(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00']);
    expect(adjustTimesForConflicts(['08:00'], conflicts, 30)).toContain('08:00');
  });

  it('cycles past midnight (24h wrap)', () => {
    // 23:30 + 30 min = 24:00 -> wraps to 00:00
    expect(adjustTimesForConflicts(['23:30'], new Set(['23:30']), 30)).toEqual(['00:00']);
  });

  it('respects custom interval', () => {
    expect(adjustTimesForConflicts(['08:00'], new Set(['08:00']), 60)).toEqual(['09:00']);
    expect(adjustTimesForConflicts(['08:00'], new Set(['08:00']), 15)).toEqual(['08:15']);
  });
});
