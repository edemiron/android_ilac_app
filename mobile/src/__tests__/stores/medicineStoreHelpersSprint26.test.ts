/**
 * medicineStoreHelpers Sprint 26 ek helper testleri.
 *
 * Sprint 26.1-26.3: buildEmptyMedicineStoreState type fix, importData delegasyonu,
 * findMedicineById, removeMedicineById, filterMedicinesByIds.
 */

import {
  findMedicineById,
  removeMedicineById,
  filterMedicinesByIds,
} from '../../stores/medicineStoreHelpers';

describe('findMedicineById', () => {
  const meds = [
    { id: 'm1', name: 'A' },
    { id: 'm2', name: 'B' },
    { id: 'm3', name: 'C' },
  ];

  it('finds matching medicine', () => {
    expect(findMedicineById(meds, 'm2')).toEqual({ id: 'm2', name: 'B' });
  });

  it('returns undefined when not found', () => {
    expect(findMedicineById(meds, 'nope')).toBeUndefined();
  });

  it('returns undefined for null/undefined id', () => {
    expect(findMedicineById(meds, null)).toBeUndefined();
    expect(findMedicineById(meds, undefined)).toBeUndefined();
  });
});

describe('removeMedicineById', () => {
  const meds = [
    { id: 'm1', name: 'A' },
    { id: 'm2', name: 'B' },
    { id: 'm3', name: 'C' },
  ];

  it('removes matching medicine', () => {
    const result = removeMedicineById(meds, 'm2');
    expect(result).toHaveLength(2);
    expect(result.find(m => m.id === 'm2')).toBeUndefined();
  });

  it('returns unchanged list when id not found', () => {
    expect(removeMedicineById(meds, 'nope')).toEqual(meds);
  });

  it('returns empty for empty list', () => {
    expect(removeMedicineById([], 'm1')).toEqual([]);
  });
});

describe('filterMedicinesByIds', () => {
  const meds = [
    { id: 'm1', name: 'A' },
    { id: 'm2', name: 'B' },
    { id: 'm3', name: 'C' },
  ];

  it('removes medicines matching ids', () => {
    expect(filterMedicinesByIds(meds, ['m1', 'm3'])).toEqual([{ id: 'm2', name: 'B' }]);
  });

  it('returns full list when no ids match', () => {
    expect(filterMedicinesByIds(meds, ['nope'])).toEqual(meds);
  });

  it('returns empty for matching all ids', () => {
    expect(filterMedicinesByIds(meds, ['m1', 'm2', 'm3'])).toEqual([]);
  });

  it('returns empty for empty ids', () => {
    expect(filterMedicinesByIds(meds, [])).toEqual(meds);
  });
});
