import {
  isLeapYear,
  daysInMonth,
  compareParts,
  partsToIso,
  isoToParts,
  clampInt,
  type DateParts,
} from '../../domain/dateParts';

describe('dateParts domain logic', () => {
  describe('isLeapYear', () => {
    it('returns true for standard leap years divisible by 4 but not 100', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(1996)).toBe(true);
    });

    it('returns true for century years divisible by 400', () => {
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(1600)).toBe(true);
      expect(isLeapYear(2400)).toBe(true);
    });

    it('returns false for century years not divisible by 400', () => {
      expect(isLeapYear(1900)).toBe(false);
      expect(isLeapYear(2100)).toBe(false);
      expect(isLeapYear(1800)).toBe(false);
    });

    it('returns false for non-leap years', () => {
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
    });
  });

  describe('daysInMonth', () => {
    it('returns 29 for February in leap years', () => {
      expect(daysInMonth(2024, 2)).toBe(29);
      expect(daysInMonth(2000, 2)).toBe(29);
    });

    it('returns 28 for February in non-leap years including 1900', () => {
      expect(daysInMonth(2023, 2)).toBe(28);
      expect(daysInMonth(1900, 2)).toBe(28);
      expect(daysInMonth(2100, 2)).toBe(28);
    });

    it('returns correct days for all months in non-leap year', () => {
      const expected = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      for (let m = 1; m <= 12; m++) {
        expect(daysInMonth(2023, m)).toBe(expected[m - 1]);
      }
    });

    it('returns 0 for invalid months without throwing', () => {
      expect(daysInMonth(2026, 0)).toBe(0);
      expect(daysInMonth(2026, 13)).toBe(0);
      expect(daysInMonth(2026, -1)).toBe(0);
    });
  });

  describe('partsToIso & isoToParts', () => {
    it('converts valid DateParts to YYYY-MM-DD ISO string', () => {
      expect(partsToIso({ year: 1970, month: 3, day: 5 })).toBe('1970-03-05');
      expect(partsToIso({ year: 2024, month: 12, day: 31 })).toBe('2024-12-31');
    });

    it('parses valid ISO string to DateParts', () => {
      expect(isoToParts('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
      expect(isoToParts('1970-01-15')).toEqual({ year: 1970, month: 1, day: 15 });
    });

    it('rejects invalid leap year dates', () => {
      expect(isoToParts('2023-02-29')).toBeNull();
      expect(isoToParts('1900-02-29')).toBeNull();
    });

    it('rejects non-existent calendar days', () => {
      expect(isoToParts('2026-04-31')).toBeNull(); // April has 30 days
      expect(isoToParts('2026-02-30')).toBeNull();
      expect(isoToParts('2026-13-01')).toBeNull();
    });

    it('rejects malformed strings', () => {
      expect(isoToParts('')).toBeNull();
      expect(isoToParts('invalid')).toBeNull();
      expect(isoToParts('2026-1-5')).toBeNull(); // Requires leading zeros
    });
  });

  describe('compareParts', () => {
    it('compares years correctly', () => {
      const a: DateParts = { year: 2023, month: 5, day: 10 };
      const b: DateParts = { year: 2024, month: 1, day: 1 };
      expect(compareParts(a, b)).toBe(-1);
      expect(compareParts(b, a)).toBe(1);
    });

    it('compares months correctly when years are equal', () => {
      const a: DateParts = { year: 2024, month: 2, day: 29 };
      const b: DateParts = { year: 2024, month: 3, day: 1 };
      expect(compareParts(a, b)).toBe(-1);
      expect(compareParts(b, a)).toBe(1);
    });

    it('compares days correctly when year and month are equal', () => {
      const a: DateParts = { year: 2024, month: 2, day: 15 };
      const b: DateParts = { year: 2024, month: 2, day: 16 };
      expect(compareParts(a, b)).toBe(-1);
      expect(compareParts(b, a)).toBe(1);
    });

    it('returns 0 when dates are identical', () => {
      const a: DateParts = { year: 2024, month: 2, day: 29 };
      const b: DateParts = { year: 2024, month: 2, day: 29 };
      expect(compareParts(a, b)).toBe(0);
    });
  });

  describe('clampInt', () => {
    it('clamps values correctly', () => {
      expect(clampInt(5, 1, 10)).toBe(5);
      expect(clampInt(0, 1, 10)).toBe(1);
      expect(clampInt(15, 1, 10)).toBe(10);
    });

    it('handles degenerate min > max deterministically', () => {
      expect(clampInt(5, 10, 1)).toBe(10);
    });
  });
});
