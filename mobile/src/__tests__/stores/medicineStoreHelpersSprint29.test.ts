/**
 * medicineStoreHelpers Sprint 29 ek helper testleri.
 *
 * Sprint 29.1: Reminder filter helpers (filterReminderTimesByMedicine).
 * Sprint 29.2: Active/inactive medicines helpers (filterActiveMedicines,
 * filterInactiveMedicines, hasActiveMedicineById).
 */

import {
  filterReminderTimesByMedicine,
  filterActiveMedicines,
  filterInactiveMedicines,
  hasActiveMedicineById,
} from '../../stores/medicineStoreHelpers';

describe('filterReminderTimesByMedicine', () => {
  const reminderTimes = [
    { id: 'rt1', medicineId: 'm1', time: '08:00' },
    { id: 'rt2', medicineId: 'm2', time: '12:00' },
    { id: 'rt3', medicineId: 'm1', time: '20:00' },
  ];

  it('returns matching reminders (exclude=false)', () => {
    const result = filterReminderTimesByMedicine(reminderTimes, 'm1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('rt1');
    expect(result[1].id).toBe('rt3');
  });

  it('returns non-matching reminders (exclude=true)', () => {
    const result = filterReminderTimesByMedicine(reminderTimes, 'm1', true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rt2');
  });

  it('returns empty for non-existing medicineId', () => {
    expect(filterReminderTimesByMedicine(reminderTimes, 'nope')).toEqual([]);
  });
});

describe('filterActiveMedicines', () => {
  const medicines = [
    { id: 'm1', isActive: true },
    { id: 'm2', isActive: false },
    { id: 'm3', isActive: true },
  ];

  it('returns only active medicines', () => {
    const result = filterActiveMedicines(medicines);
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(['m1', 'm3']);
  });

  it('returns empty for empty list', () => {
    expect(filterActiveMedicines([])).toEqual([]);
  });
});

describe('filterInactiveMedicines', () => {
  const medicines = [
    { id: 'm1', isActive: true },
    { id: 'm2', isActive: false },
    { id: 'm3', isActive: false },
  ];

  it('returns only inactive medicines', () => {
    const result = filterInactiveMedicines(medicines);
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(['m2', 'm3']);
  });
});

describe('hasActiveMedicineById', () => {
  const medicines = [
    { id: 'm1', isActive: true },
    { id: 'm2', isActive: false },
    { id: 'm3', isActive: true },
  ];

  it('returns true when active medicine exists', () => {
    expect(hasActiveMedicineById(medicines, 'm1')).toBe(true);
  });

  it('returns false when medicine is inactive', () => {
    expect(hasActiveMedicineById(medicines, 'm2')).toBe(false);
  });

  it('returns false when medicineId not found', () => {
    expect(hasActiveMedicineById(medicines, 'nope')).toBe(false);
  });

  it('returns false for empty list', () => {
    expect(hasActiveMedicineById([], 'm1')).toBe(false);
  });
});
