/**
 * medicineStoreHelpers Sprint 30 ek helper testleri.
 *
 * Sprint 30.1: deactivateSnoozesIntersectingWith (ID-based bulk deactivate helper).
 */

import {
  deactivateSnoozesIntersectingWith,
  countWhere,
  findMedicineOrNull,
} from '../../stores/medicineStoreHelpers';

describe('deactivateSnoozesIntersectingWith', () => {
  const snoozes = [
    { id: 's1', isActive: true },
    { id: 's2', isActive: true },
    { id: 's3', isActive: true },
  ];

  const activeSnoozesSubset = [
    { id: 's1', isActive: true },
    { id: 's3', isActive: true },
  ];

  it('deactivates only snoozes matching activeSnoozes ids', () => {
    const result = deactivateSnoozesIntersectingWith(snoozes, activeSnoozesSubset);
    expect(result[0].isActive).toBe(false); // s1 matched
    expect(result[1].isActive).toBe(true); // s2 not matched
    expect(result[2].isActive).toBe(false); // s3 matched
  });

  it('returns unchanged when no activeSnoozes', () => {
    expect(deactivateSnoozesIntersectingWith(snoozes, [])).toEqual(snoozes);
  });

  it('handles empty snoozes list', () => {
    expect(deactivateSnoozesIntersectingWith([], activeSnoozesSubset)).toEqual([]);
  });
});

describe('countWhere', () => {
  it('counts matching items', () => {
    const items = [1, 2, 3, 4, 5];
    expect(countWhere(items, n => n > 2)).toBe(3);
  });

  it('returns 0 when no matches', () => {
    expect(countWhere([1, 2, 3], n => n > 10)).toBe(0);
  });

  it('handles empty list', () => {
    expect(countWhere([], () => true)).toBe(0);
  });

  it('works with object predicate', () => {
    const meds = [
      { id: 'm1', isActive: true },
      { id: 'm2', isActive: false },
      { id: 'm3', isActive: true },
    ];
    expect(countWhere(meds, m => m.isActive)).toBe(2);
  });
});

describe('findMedicineOrNull', () => {
  const medicines = [
    { id: 'm1', name: 'A' },
    { id: 'm2', name: 'B' },
  ];

  it('returns medicine when found', () => {
    expect(findMedicineOrNull(medicines, 'm1')).toEqual({ id: 'm1', name: 'A' });
  });

  it('returns null when not found', () => {
    expect(findMedicineOrNull(medicines, 'nope')).toBeNull();
  });

  it('returns null for null/undefined id', () => {
    expect(findMedicineOrNull(medicines, null)).toBeNull();
    expect(findMedicineOrNull(medicines, undefined)).toBeNull();
  });
});
