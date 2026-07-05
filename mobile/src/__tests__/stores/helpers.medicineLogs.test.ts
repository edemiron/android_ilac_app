/**
 * stores/helpers/medicineLogs tests
 */

import {
  buildMedicineLogSlotKey,
  isScheduledTimeInFuture,
  getMedicineLogStatusPriority,
  normalizeMedicineLogsBySlot,
  resolveMedicineLogArgs,
} from '../../stores/helpers/medicineLogs';
import type { Medicine, MedicineLog, ReminderTime } from '../../types';

const baseMedicine: Medicine = {
  id: 'med-1',
  name: 'Aspirin',
  dosage: '500mg',
  frequency: 2,
  color: 'red',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  startDate: '2024-01-01',
};

const baseReminder: ReminderTime = {
  id: 'rt-1',
  medicineId: 'med-1',
  time: '08:00',
  isEnabled: true,
};

describe('buildMedicineLogSlotKey', () => {
  it('combines reminderTimeId + scheduledTime with double underscore', () => {
    expect(buildMedicineLogSlotKey('rt-1', '2024-06-25T08:00:00Z')).toBe(
      'rt-1__2024-06-25T08:00:00Z'
    );
  });
});

describe('isScheduledTimeInFuture', () => {
  it('returns true for future time', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isScheduledTimeInFuture(future)).toBe(true);
  });

  it('returns false for past time', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isScheduledTimeInFuture(past)).toBe(false);
  });

  it('returns false for invalid date string', () => {
    expect(isScheduledTimeInFuture('not-a-date')).toBe(false);
  });

  it('returns false for exactly now', () => {
    const now = new Date();
    expect(isScheduledTimeInFuture(now.toISOString(), now)).toBe(false);
  });
});

describe('getMedicineLogStatusPriority', () => {
  it('taken > skipped > missed > pending/default', () => {
    expect(getMedicineLogStatusPriority('taken')).toBe(3);
    expect(getMedicineLogStatusPriority('skipped')).toBe(2);
    expect(getMedicineLogStatusPriority('missed')).toBe(1);
    // @ts-expect-error test fixture
    expect(getMedicineLogStatusPriority('pending')).toBe(0);
  });
});

describe('normalizeMedicineLogsBySlot', () => {
  const baseLog: MedicineLog = {
    id: 'log-1',
    medicineId: 'med-1',
    reminderTimeId: 'rt-1',
    scheduledTime: '2024-06-25T08:00:00Z',
    status: 'taken',
  };

  it('returns single log unchanged', () => {
    const result = normalizeMedicineLogsBySlot([baseLog]);
    expect(result).toEqual([baseLog]);
  });

  it('keeps highest-priority log per slot', () => {
    const logs: MedicineLog[] = [
      { ...baseLog, status: 'missed' },
      { ...baseLog, id: 'log-2', status: 'taken' },
      { ...baseLog, id: 'log-3', status: 'skipped' },
    ];
    const result = normalizeMedicineLogsBySlot(logs);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('taken');
    expect(result[0].id).toBe('log-2');
  });

  it('keeps different slots separate', () => {
    const logs: MedicineLog[] = [
      { ...baseLog, id: 'log-1', scheduledTime: '2024-06-25T08:00:00Z' },
      { ...baseLog, id: 'log-2', scheduledTime: '2024-06-25T20:00:00Z' },
    ];
    const result = normalizeMedicineLogsBySlot(logs);
    expect(result).toHaveLength(2);
  });

  it('sorts by scheduledTime ascending', () => {
    const logs: MedicineLog[] = [
      { ...baseLog, id: 'log-1', scheduledTime: '2024-06-25T20:00:00Z' },
      { ...baseLog, id: 'log-2', scheduledTime: '2024-06-25T08:00:00Z' },
    ];
    const result = normalizeMedicineLogsBySlot(logs);
    expect(result[0].id).toBe('log-2');
    expect(result[1].id).toBe('log-1');
  });

  it('returns empty array for empty input', () => {
    expect(normalizeMedicineLogsBySlot([])).toEqual([]);
  });
});

describe('resolveMedicineLogArgs', () => {
  it('uses fallback as note when reminderTimeId not in reminderTimes', () => {
    const result = resolveMedicineLogArgs('rt-unknown', [baseMedicine], [baseReminder], 'a note');
    expect(result.medicineIdFallback).toBe('a note');
  });

  it('uses fallback as medicineIdFallback when medicineId is known', () => {
    const result = resolveMedicineLogArgs('rt-1', [baseMedicine], [baseReminder], 'med-1');
    expect(result.medicineIdFallback).toBe('med-1');
    expect(result.note).toBeUndefined();
  });

  it('uses fallback as note when medicineId is unknown', () => {
    const result = resolveMedicineLogArgs('rt-1', [baseMedicine], [baseReminder], 'unknown-id');
    expect(result.note).toBe('unknown-id');
  });

  it('returns empty object when fallback is undefined', () => {
    const result = resolveMedicineLogArgs('rt-1', [baseMedicine], [baseReminder]);
    expect(result).toEqual({});
  });

  it('explicit note wins over fallback interpretation', () => {
    const result = resolveMedicineLogArgs(
      'rt-1',
      [baseMedicine],
      [baseReminder],
      'med-1',
      'a note'
    );
    expect(result.medicineIdFallback).toBe('med-1');
    expect(result.note).toBe('a note');
  });
});
