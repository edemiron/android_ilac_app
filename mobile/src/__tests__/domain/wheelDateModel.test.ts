import {
  makeDateRange,
  createWheelDateReducer,
  buildColumns,
  ageFromParts,
  validateParts,
  shiftYears,
  type DateRange,
  type WheelDateState,
} from '../../domain/wheelDateModel';
import { isValidParts, type DateParts } from '../../domain/dateParts';

describe('wheelDateModel domain state machine', () => {
  const defaultRange: DateRange = makeDateRange(
    { year: 1900, month: 1, day: 1 },
    { year: 2026, month: 9, day: 6 }
  )!;

  const reducer = createWheelDateReducer(defaultRange);

  it('Scenario 1: 2024-01-31, led=31 -> setMonth(2) -> clamps to 2024-02-29 (leap year), preserves led=31', () => {
    const s0: WheelDateState = {
      parts: { year: 2024, month: 1, day: 31 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setMonth', month: 2 });
    expect(s1.parts).toEqual({ year: 2024, month: 2, day: 29 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 2: 2023-01-31, led=31 -> setMonth(2) -> clamps to 2023-02-28, preserves led=31', () => {
    const s0: WheelDateState = {
      parts: { year: 2023, month: 1, day: 31 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setMonth', month: 2 });
    expect(s1.parts).toEqual({ year: 2023, month: 2, day: 28 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 3: Scenario 2 result -> setMonth(1) -> restores 2023-01-31 (restoration behavior)', () => {
    const s1: WheelDateState = {
      parts: { year: 2023, month: 2, day: 28 },
      lastExplicitDay: 31,
    };
    const s2 = reducer(s1, { type: 'setMonth', month: 1 });
    expect(s2.parts).toEqual({ year: 2023, month: 1, day: 31 });
    expect(s2.lastExplicitDay).toBe(31);
  });

  it('Scenario 4: Scenario 2 result -> setDay(28) -> explicitly chooses 28 -> led updates to 28', () => {
    const s1: WheelDateState = {
      parts: { year: 2023, month: 2, day: 28 },
      lastExplicitDay: 31,
    };
    const s2 = reducer(s1, { type: 'setDay', day: 28 });
    expect(s2.parts).toEqual({ year: 2023, month: 2, day: 28 });
    expect(s2.lastExplicitDay).toBe(28);
  });

  it('Scenario 5: Scenario 4 result -> setMonth(1) -> stays 2023-01-28 (NOT 31)', () => {
    const s2: WheelDateState = {
      parts: { year: 2023, month: 2, day: 28 },
      lastExplicitDay: 28,
    };
    const s3 = reducer(s2, { type: 'setMonth', month: 1 });
    expect(s3.parts).toEqual({ year: 2023, month: 1, day: 28 });
    expect(s3.lastExplicitDay).toBe(28);
  });

  it('Scenario 6: 2023-01-31, led=31 -> setYear(2024) -> 2024-01-31, led=31', () => {
    const s0: WheelDateState = {
      parts: { year: 2023, month: 1, day: 31 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setYear', year: 2024 });
    expect(s1.parts).toEqual({ year: 2024, month: 1, day: 31 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 7: 2024-02-29, led=29 -> setYear(2023) -> 2023-02-28, led=29', () => {
    const s0: WheelDateState = {
      parts: { year: 2024, month: 2, day: 29 },
      lastExplicitDay: 29,
    };
    const s1 = reducer(s0, { type: 'setYear', year: 2023 });
    expect(s1.parts).toEqual({ year: 2023, month: 2, day: 28 });
    expect(s1.lastExplicitDay).toBe(29);
  });

  it('Scenario 8: 2024-02-29, led=31 -> setYear(2023) -> 2023-02-28, led=31', () => {
    const s0: WheelDateState = {
      parts: { year: 2024, month: 2, day: 29 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setYear', year: 2023 });
    expect(s1.parts).toEqual({ year: 2023, month: 2, day: 28 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 9: 2023-02-28, led=31 -> setYear(2024) -> 2024-02-29 (promotes to leap day), led=31', () => {
    const s0: WheelDateState = {
      parts: { year: 2023, month: 2, day: 28 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setYear', year: 2024 });
    expect(s1.parts).toEqual({ year: 2024, month: 2, day: 29 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 10: 1900-01-31, led=31 -> setMonth(2) -> 1900-02-28 (1900 is NOT leap), led=31', () => {
    const s0: WheelDateState = {
      parts: { year: 1900, month: 1, day: 31 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setMonth', month: 2 });
    expect(s1.parts).toEqual({ year: 1900, month: 2, day: 28 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 11: 2000-01-31, led=31 -> setMonth(2) -> 2000-02-29 (2000 is leap), led=31', () => {
    const s0: WheelDateState = {
      parts: { year: 2000, month: 1, day: 31 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setMonth', month: 2 });
    expect(s1.parts).toEqual({ year: 2000, month: 2, day: 29 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 12: 2026-03-31, led=31 -> setMonth(4) -> 2026-04-30 (April has 30 days), led=31', () => {
    const s0: WheelDateState = {
      parts: { year: 2026, month: 3, day: 31 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setMonth', month: 4 });
    expect(s1.parts).toEqual({ year: 2026, month: 4, day: 30 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 13: 2026-01-31, led=31 -> setMonth(2) -> setMonth(3) -> 2026-03-31 (two-step restoration)', () => {
    const s0: WheelDateState = {
      parts: { year: 2026, month: 1, day: 31 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setMonth', month: 2 });
    expect(s1.parts).toEqual({ year: 2026, month: 2, day: 28 });
    const s2 = reducer(s1, { type: 'setMonth', month: 3 });
    expect(s2.parts).toEqual({ year: 2026, month: 3, day: 31 });
    expect(s2.lastExplicitDay).toBe(31);
  });

  it('Scenario 14: at range.max, step(day, +1) does NOT wrap, stays at max', () => {
    const s0: WheelDateState = {
      parts: { year: 2026, month: 9, day: 6 },
      lastExplicitDay: 6,
    };
    const s1 = reducer(s0, { type: 'step', column: 'day', delta: 1 });
    expect(s1.parts).toEqual({ year: 2026, month: 9, day: 6 });
  });

  it('Scenario 15: at range.max year, setMonth(12) clamps month to max month (9)', () => {
    const s0: WheelDateState = {
      parts: { year: 2026, month: 9, day: 6 },
      lastExplicitDay: 6,
    };
    const s1 = reducer(s0, { type: 'setMonth', month: 12 });
    expect(s1.parts).toEqual({ year: 2026, month: 9, day: 6 });
  });

  it('Scenario 16: range.max=2026-09-06, start 2026-08-31 -> setMonth(9) -> clamps to 2026-09-06 (range ceiling)', () => {
    const s0: WheelDateState = {
      parts: { year: 2026, month: 8, day: 31 },
      lastExplicitDay: 31,
    };
    const s1 = reducer(s0, { type: 'setMonth', month: 9 });
    expect(s1.parts).toEqual({ year: 2026, month: 9, day: 6 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  it('Scenario 17: at range.min, step(month, -1) does NOT wrap below range.min', () => {
    const minRange = makeDateRange(
      { year: 1901, month: 9, day: 6 },
      { year: 2026, month: 9, day: 6 }
    )!;
    const minReducer = createWheelDateReducer(minRange);
    const s0: WheelDateState = {
      parts: { year: 1901, month: 9, day: 6 },
      lastExplicitDay: 6,
    };
    const s1 = minReducer(s0, { type: 'step', column: 'month', delta: -1 });
    expect(s1.parts).toEqual({ year: 1901, month: 9, day: 6 });
  });

  it('Scenario 18: buildColumns produces valid enabled spans for day/month/year', () => {
    const s: WheelDateState = {
      parts: { year: 2026, month: 9, day: 6 },
      lastExplicitDay: 6,
    };
    const [dayCol, monthCol, yearCol] = buildColumns(s, defaultRange, true);
    expect(dayCol.labels.length).toBe(31);
    expect(dayCol.firstEnabled).toBe(0); // day 1 -> index 0
    expect(dayCol.lastEnabled).toBe(5); // day 6 -> index 5 (due to range.max)
    expect(monthCol.labels.length).toBe(12);
    expect(yearCol.labels.length).toBe(2026 - 1900 + 1);
    expect(yearCol.labels[yearCol.selectedIndex]).toBe('2026');
    expect(yearCol.labels[0]).toBe('1900');
  });

  it('Scenario 19 (Property Test): every (year, month) transition produces valid DateParts', () => {
    let state: WheelDateState = {
      parts: { year: 2000, month: 1, day: 31 },
      lastExplicitDay: 31,
    };

    // Test a range of years including leap & non-leap
    const testYears = [1900, 1920, 1970, 2000, 2020, 2023, 2024, 2025];
    for (const y of testYears) {
      state = reducer(state, { type: 'setYear', year: y });
      expect(isValidParts(state.parts)).toBe(true);
      for (let m = 1; m <= 12; m++) {
        state = reducer(state, { type: 'setMonth', month: m });
        expect(isValidParts(state.parts)).toBe(true);
      }
    }
  });

  it('Scenario 20: reset with invalid calendar parts clamps gracefully without throwing', () => {
    const invalidParts: DateParts = { year: 2023, month: 2, day: 31 };
    const s0: WheelDateState = {
      parts: { year: 2020, month: 1, day: 1 },
      lastExplicitDay: 1,
    };
    const s1 = reducer(s0, { type: 'reset', parts: invalidParts });
    expect(s1.parts).toEqual({ year: 2023, month: 2, day: 28 });
    expect(s1.lastExplicitDay).toBe(31);
  });

  describe('ageFromParts and validateParts', () => {
    const today: DateParts = { year: 2026, month: 9, day: 6 };

    it('calculates age correctly for adult birthday that has passed this year', () => {
      expect(ageFromParts({ year: 1970, month: 3, day: 15 }, today)).toBe(56);
    });

    it('calculates age correctly for birthday that has not yet occurred this year', () => {
      expect(ageFromParts({ year: 1970, month: 11, day: 20 }, today)).toBe(55);
    });

    it('calculates age correctly when birthday is today', () => {
      expect(ageFromParts({ year: 2000, month: 9, day: 6 }, today)).toBe(26);
    });

    it('calculates age = 0 for newborn born today', () => {
      expect(ageFromParts(today, today)).toBe(0);
    });

    it('returns null for future dates', () => {
      expect(ageFromParts({ year: 2027, month: 1, day: 1 }, today)).toBeNull();
    });

    it('validates parts within range', () => {
      const valid = validateParts({ year: 1980, month: 5, day: 20 }, defaultRange);
      expect(valid.ok).toBe(true);
      if (valid.ok) {
        expect(valid.iso).toBe('1980-05-20');
        expect(valid.age).toBe(46);
      }
    });

    it('rejects parts out of range', () => {
      const outOfRange = validateParts({ year: 2030, month: 1, day: 1 }, defaultRange);
      expect(outOfRange.ok).toBe(false);
      if (!outOfRange.ok) {
        expect(outOfRange.code).toBe('OUT_OF_RANGE');
      }
    });
  });

  describe('shiftYears', () => {
    it('shifts years correctly and handles leap day clamping', () => {
      expect(shiftYears({ year: 2024, month: 2, day: 29 }, 1)).toEqual({
        year: 2025,
        month: 2,
        day: 28,
      });
      expect(shiftYears({ year: 2020, month: 5, day: 15 }, 5)).toEqual({
        year: 2025,
        month: 5,
        day: 15,
      });
    });
  });
});
