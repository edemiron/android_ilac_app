/**
 * Alt modul crud.ts - yeni helper'lar (Sprint 37).
 *
 * filterMedicineLogsByMedicineId + filterSnoozesByMedicineId exclude mode
 * davranis kontrolu.
 */

import {
  filterMedicineLogsByMedicineId,
  filterSnoozesByMedicineId,
} from '../../../stores/helpers/crud';

describe('Sprint 37.1: filterMedicineLogsByMedicineId', () => {
  const medicineLogs = [
    { id: 'l1', medicineId: 'm1', status: 'taken' },
    { id: 'l2', medicineId: 'm2', status: 'skipped' },
    { id: 'l3', medicineId: 'm1', status: 'taken' },
  ];

  it('include mode returns matching only', () => {
    const result = filterMedicineLogsByMedicineId(medicineLogs, 'm1');
    expect(result).toHaveLength(2);
  });

  it('exclude mode returns non-matching only', () => {
    const result = filterMedicineLogsByMedicineId(medicineLogs, 'm1', true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l2');
  });

  it('default exclude=false (include mode)', () => {
    expect(filterMedicineLogsByMedicineId(medicineLogs, 'm2')).toHaveLength(1);
  });
});

describe('Sprint 37.2: filterSnoozesByMedicineId', () => {
  const snoozes = [
    { id: 's1', medicineId: 'm1', isActive: true },
    { id: 's2', medicineId: 'm2', isActive: true },
    { id: 's3', medicineId: 'm1', isActive: false },
  ];

  it('include mode returns matching only', () => {
    const result = filterSnoozesByMedicineId(snoozes, 'm1');
    expect(result).toHaveLength(2);
  });

  it('exclude mode returns non-matching only', () => {
    const result = filterSnoozesByMedicineId(snoozes, 'm1', true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s2');
  });

  it('default exclude=false', () => {
    expect(filterSnoozesByMedicineId(snoozes, 'm2')).toHaveLength(1);
  });
});
