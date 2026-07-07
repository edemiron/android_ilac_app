/**
 * Alt modul crud.ts testi (Sprint 36.2).
 *
 * filterReminderTimesByMedicine'in exclude=true modu delegasyon sonrasi
 * davranis kontrolu.
 */

import {
  filterReminderTimesByMedicine,
  findReminderTimeById,
  hasActiveMedicineById,
  hasActiveReminderTime,
  filterMedicinesByIds,
  filterActiveMedicines,
  filterInactiveMedicines,
  updateMedicineInList,
  removeMedicineById,
  findMedicineById,
  findMedicineOrNull,
  getReminderTimesForMedicinePure,
} from '../../../stores/helpers/crud';

describe('Sprint 36.2: filterReminderTimesByMedicine exclude mode', () => {
  const reminderTimes = [
    { id: 'rt1', medicineId: 'm1', time: '08:00' },
    { id: 'rt2', medicineId: 'm2', time: '12:00' },
    { id: 'rt3', medicineId: 'm1', time: '20:00' },
  ];

  it('exclude=true returns non-matching only', () => {
    const result = filterReminderTimesByMedicine(reminderTimes, 'm1', true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rt2');
  });

  it('exclude=false returns matching only', () => {
    const result = filterReminderTimesByMedicine(reminderTimes, 'm1', false);
    expect(result).toHaveLength(2);
  });

  it('exclude default (false) include mode', () => {
    const result = filterReminderTimesByMedicine(reminderTimes, 'm2');
    expect(result).toHaveLength(1);
  });
});

describe('Sprint 36.2: findReminderTimeById null guard', () => {
  const reminderTimes = [{ id: 'rt1', medicineId: 'm1', time: '08:00' }];

  it('returns matching reminder time', () => {
    expect(findReminderTimeById(reminderTimes, 'rt1')?.medicineId).toBe('m1');
  });

  it('returns undefined for null id', () => {
    expect(findReminderTimeById(reminderTimes, null)).toBeUndefined();
  });

  it('returns undefined for empty list', () => {
    expect(findReminderTimeById([], 'rt1')).toBeUndefined();
  });
});

describe('Sprint 36.2: hasActiveMedicineById + hasActiveReminderTime', () => {
  const medicines = [
    { id: 'm1', isActive: true },
    { id: 'm2', isActive: false },
  ];

  const reminderTimes = [
    { id: 'rt1', medicineId: 'm1', isEnabled: true },
    { id: 'rt2', medicineId: 'm1', isEnabled: false },
  ];

  it('hasActiveMedicineById true for active', () => {
    expect(hasActiveMedicineById(medicines, 'm1')).toBe(true);
  });

  it('hasActiveMedicineById false for inactive', () => {
    expect(hasActiveMedicineById(medicines, 'm2')).toBe(false);
  });

  it('hasActiveReminderTime requires both isEnabled + id match', () => {
    expect(hasActiveReminderTime(reminderTimes, 'rt1', 'm1')).toBe(true);
    expect(hasActiveReminderTime(reminderTimes, 'rt2', 'm1')).toBe(false);
  });
});

describe('Sprint 36.2: filterActiveMedicines + filterInactiveMedicines', () => {
  const medicines = [
    { id: 'm1', isActive: true },
    { id: 'm2', isActive: false },
    { id: 'm3', isActive: true },
  ];

  it('filterActiveMedicines returns only active', () => {
    const result = filterActiveMedicines(medicines);
    expect(result.map(m => m.id)).toEqual(['m1', 'm3']);
  });

  it('filterInactiveMedicines returns only inactive', () => {
    const result = filterInactiveMedicines(medicines);
    expect(result.map(m => m.id)).toEqual(['m2']);
  });
});

describe('Sprint 36.2: filterMedicinesByIds bulk operation', () => {
  const medicines = [
    { id: 'm1', name: 'A' },
    { id: 'm2', name: 'B' },
    { id: 'm3', name: 'C' },
  ];

  it('removes medicines matching ids', () => {
    expect(filterMedicinesByIds(medicines, ['m1', 'm3'])).toHaveLength(1);
  });

  it('returns unchanged when no ids match', () => {
    expect(filterMedicinesByIds(medicines, ['nope'])).toHaveLength(3);
  });
});

describe('Sprint 36.2: updateMedicineInList updates updatedAt', () => {
  const medicines = [{ id: 'm1', name: 'A', updatedAt: '2026-01-01T00:00:00Z' }];

  it('refreshes updatedAt on patch', () => {
    const result = updateMedicineInList(medicines, 'm1', { name: 'B' });
    expect(result[0].name).toBe('B');
    expect(result[0].updatedAt > '2026-01-01T00:00:00Z').toBe(true);
  });
});

describe('Sprint 36.2: removeMedicineById + findMedicineById + findMedicineOrNull', () => {
  const medicines = [
    { id: 'm1', name: 'A' },
    { id: 'm2', name: 'B' },
  ];

  it('removeMedicineById removes by id', () => {
    expect(removeMedicineById(medicines, 'm1')).toHaveLength(1);
  });

  it('findMedicineById returns undefined for null', () => {
    expect(findMedicineById(medicines, null)).toBeUndefined();
  });

  it('findMedicineOrNull returns null for missing', () => {
    expect(findMedicineOrNull(medicines, 'nope')).toBeNull();
  });
});

describe('Sprint 36.2: getReminderTimesForMedicinePure sort', () => {
  const reminderTimes = [
    { id: 'rt1', medicineId: 'm1', time: '20:00' },
    { id: 'rt2', medicineId: 'm1', time: '08:00' },
    { id: 'rt3', medicineId: 'm2', time: '12:00' },
  ];

  it('sorts reminders by time for medicine', () => {
    const result = getReminderTimesForMedicinePure(reminderTimes, 'm1');
    expect(result[0].time).toBe('08:00');
    expect(result[1].time).toBe('20:00');
  });
});
