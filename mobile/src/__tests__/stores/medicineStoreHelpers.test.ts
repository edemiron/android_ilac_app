/**
 * medicineStoreHelpers testleri.
 *
 * Sprint 21.3 + 23.3: medicineStore.ts icindeki pure helper'lar test ediliyor.
 */

import {
  calculateAdherenceRate,
  calculateCurrentStreak,
  filterLowStockMedicines,
  countActiveSnoozes,
  uniqueNotificationIds,
  getActiveSnoozesForReminder,
  getActiveMedicineIds,
  getActiveReminderCount,
  getDateString,
  getTimeString,
  nowISO,
  updateMedicineInList,
  buildSyncSuccessPatch,
  createMedicineTimestamps,
} from '../../stores/medicineStoreHelpers';

import { Medicine, MedicineLog, ReminderTime, Snooze } from '../../types';

const NOW = new Date('2026-07-06T15:30:00Z');

const baseMedicine = (id: string, active: boolean = true): Medicine => ({
  id,
  name: `Medicine ${id}`,
  dosage: '500mg',
  dosageAmount: '500',
  frequency: 1,
  form: 'tablet',
  isActive: active,
  color: '#FF0000',
  stockEnabled: false,
  stockCount: 0,
  stockThreshold: 5,
  stockUnit: 'tablet',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  startDate: '2026-01-01',
  instructions: 'any_time',
  customTimes: ['08:00'],
});

const baseReminder = (id: string, medicineId: string, time: string = '08:00'): ReminderTime => ({
  id,
  medicineId,
  time,
  isEnabled: true,
  frequency: 1,
});

const baseLog = (
  id: string,
  medicineId: string,
  rtId: string,
  scheduledISO: string,
  status: 'taken' | 'skipped' = 'taken'
): MedicineLog => ({
  id,
  medicineId,
  reminderTimeId: rtId,
  scheduledTime: scheduledISO,
  takenAt: status === 'taken' ? scheduledISO : undefined,
  status,
});

describe('getDateString / getTimeString', () => {
  it('formats date to yyyy-MM-dd', () => {
    expect(getDateString(NOW)).toBe('2026-07-06');
  });
  it('formats time to HH:mm', () => {
    expect(getTimeString(NOW)).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('getActiveMedicineIds', () => {
  it('returns set of active medicine ids only', () => {
    const meds = [baseMedicine('m1', true), baseMedicine('m2', false), baseMedicine('m3', true)];
    const ids = getActiveMedicineIds(meds);
    expect(ids.size).toBe(2);
    expect(ids.has('m1')).toBe(true);
    expect(ids.has('m3')).toBe(true);
    expect(ids.has('m2')).toBe(false);
  });
  it('returns empty set for empty list', () => {
    expect(getActiveMedicineIds([]).size).toBe(0);
  });
});

describe('getActiveReminderCount', () => {
  it('counts only enabled reminders for active medicines', () => {
    const meds = [baseMedicine('m1'), baseMedicine('m2', false)];
    const reminders = [
      baseReminder('rt1', 'm1', '08:00'),
      baseReminder('rt2', 'm1', '20:00'),
      baseReminder('rt3', 'm2', '08:00'),
      { ...baseReminder('rt4', 'm1', '12:00'), isEnabled: false },
    ];
    expect(getActiveReminderCount(meds, reminders)).toBe(2);
  });
});

describe('calculateAdherenceRate', () => {
  it('returns 100 when no active reminders', () => {
    expect(calculateAdherenceRate([], [], [], 7, NOW)).toBe(100);
  });
  it('returns percentage of taken logs in last N days', () => {
    const meds = [baseMedicine('m1')];
    const reminders = [baseReminder('rt1', 'm1')];
    const logs: MedicineLog[] = [
      baseLog('l1', 'm1', 'rt1', '2026-07-05T08:00:00Z', 'taken'),
      baseLog('l2', 'm1', 'rt1', '2026-07-06T08:00:00Z', 'skipped'),
    ];
    expect(calculateAdherenceRate(logs, meds, reminders, 7, NOW)).toBe(50);
  });
  it('rounds to nearest integer', () => {
    const meds = [baseMedicine('m1')];
    const reminders = [baseReminder('rt1', 'm1')];
    const logs: MedicineLog[] = [
      baseLog('l1', 'm1', 'rt1', '2026-07-05T08:00:00Z', 'taken'),
      baseLog('l2', 'm1', 'rt1', '2026-07-06T08:00:00Z', 'taken'),
      baseLog('l3', 'm1', 'rt1', '2026-07-04T08:00:00Z', 'skipped'),
    ];
    expect(calculateAdherenceRate(logs, meds, reminders, 7, NOW)).toBe(67);
  });
});

describe('calculateCurrentStreak', () => {
  it('returns 0 when no active reminders', () => {
    expect(calculateCurrentStreak([], [], [], NOW)).toBe(0);
  });
  it('returns 0 when no logs at all', () => {
    const meds = [baseMedicine('m1')];
    const reminders = [baseReminder('rt1', 'm1')];
    expect(calculateCurrentStreak([], meds, reminders, NOW)).toBe(0);
  });
  it('counts consecutive days with all logs taken', () => {
    const meds = [baseMedicine('m1')];
    const reminders = [baseReminder('rt1', 'm1')];
    const logs: MedicineLog[] = [
      baseLog('l1', 'm1', 'rt1', '2026-07-06T08:00:00Z', 'taken'),
      baseLog('l2', 'm1', 'rt1', '2026-07-05T08:00:00Z', 'taken'),
      baseLog('l3', 'm1', 'rt1', '2026-07-04T08:00:00Z', 'taken'),
    ];
    expect(calculateCurrentStreak(logs, meds, reminders, NOW)).toBe(3);
  });
  it('breaks streak on skipped log', () => {
    const meds = [baseMedicine('m1')];
    const reminders = [baseReminder('rt1', 'm1')];
    const logs: MedicineLog[] = [
      baseLog('l1', 'm1', 'rt1', '2026-07-06T08:00:00Z', 'taken'),
      baseLog('l2', 'm1', 'rt1', '2026-07-05T08:00:00Z', 'skipped'),
    ];
    expect(calculateCurrentStreak(logs, meds, reminders, NOW)).toBe(1);
  });
});

describe('filterLowStockMedicines', () => {
  it('filters only enabled and below-threshold medicines', () => {
    const meds: Medicine[] = [
      { ...baseMedicine('m1'), stockEnabled: true, stockCount: 3, stockThreshold: 5 },
      { ...baseMedicine('m2'), stockEnabled: true, stockCount: 10, stockThreshold: 5 },
      { ...baseMedicine('m3'), stockEnabled: false, stockCount: 0 },
      { ...baseMedicine('m4', false), stockEnabled: true, stockCount: 1, stockThreshold: 5 },
    ];
    const filtered = filterLowStockMedicines(meds);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('m1');
  });
  it('uses default threshold 5 when not provided', () => {
    const m = { ...baseMedicine('m1'), stockEnabled: true, stockCount: 5 };
    expect(filterLowStockMedicines([m])).toHaveLength(1);
  });
  it('returns empty for empty list', () => {
    expect(filterLowStockMedicines([])).toEqual([]);
  });
});

describe('countActiveSnoozes', () => {
  const snooze = (overrides: Partial<Snooze>): Snooze => ({
    id: 'sn-1',
    medicineId: 'm1',
    reminderTimeId: 'rt1',
    originalScheduledTime: '2026-07-06T08:00:00Z',
    triggerTime: '2026-07-06T08:00:00Z',
    notificationId: 'notif-1',
    isActive: true,
    createdAt: '2026-07-06T08:00:00Z',
    ...overrides,
  });

  it('counts only active snoozes matching all three keys', () => {
    const snoozes = [
      snooze({}),
      snooze({ id: 'sn-2', originalScheduledTime: '2026-07-06T08:30:00Z' }),
      snooze({ id: 'sn-3', isActive: false }),
      snooze({ id: 'sn-4', medicineId: 'm2' }),
      snooze({ id: 'sn-5', reminderTimeId: 'rt2' }),
    ];
    expect(countActiveSnoozes(snoozes, 'm1', 'rt1', '2026-07-06T08:00:00Z')).toBe(1);
  });

  it('returns 0 for empty list', () => {
    expect(countActiveSnoozes([], 'm1', 'rt1', '2026-07-06T08:00:00Z')).toBe(0);
  });
});

describe('uniqueNotificationIds', () => {
  it('removes duplicates', () => {
    expect(uniqueNotificationIds(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
  });
  it('returns empty for empty input', () => {
    expect(uniqueNotificationIds([])).toEqual([]);
  });
  it('preserves order', () => {
    expect(uniqueNotificationIds(['c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });
});

describe('getActiveSnoozesForReminder', () => {
  const s = (overrides: Partial<Snooze>): Snooze => ({
    id: 'sn',
    medicineId: 'm1',
    reminderTimeId: 'rt1',
    originalScheduledTime: '2026-07-06T08:00:00Z',
    triggerTime: '2026-07-06T08:00:00Z',
    notificationId: 'n',
    isActive: true,
    createdAt: '2026-07-06T08:00:00Z',
    ...overrides,
  });

  it('returns only active matching snoozes', () => {
    const snoozes = [
      s({}),
      s({ id: 's2', isActive: false }),
      s({ id: 's3', reminderTimeId: 'rt2' }),
    ];
    const result = getActiveSnoozesForReminder(snoozes, 'm1', 'rt1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sn');
  });
});

// Sprint 23.3: Yeni pure helper testleri
describe('nowISO', () => {
  it('returns valid ISO string', () => {
    expect(nowISO()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('updateMedicineInList', () => {
  it('updates matching medicine and refreshes updatedAt', () => {
    const list = [
      { id: 'm1', name: 'A', updatedAt: '2026-01-01T00:00:00Z', stockCount: 5 },
      { id: 'm2', name: 'B', updatedAt: '2026-01-01T00:00:00Z', stockCount: 3 },
    ];
    const result = updateMedicineInList(list, 'm1', { stockCount: 0 });
    expect(result[0].stockCount).toBe(0);
    expect(result[1]).toEqual(list[1]);
    expect(result[0].updatedAt > list[0].updatedAt).toBe(true);
  });

  it('returns unchanged list when id not found', () => {
    const list = [{ id: 'm1', updatedAt: 'x' }];
    const result = updateMedicineInList(list, 'nope', { stockCount: 0 });
    expect(result).toEqual(list);
  });
});

describe('createMedicineTimestamps', () => {
  it('returns equal createdAt and updatedAt', () => {
    const ts = createMedicineTimestamps();
    expect(ts.createdAt).toBe(ts.updatedAt);
  });
  it('returns valid ISO strings', () => {
    const ts = createMedicineTimestamps();
    expect(ts.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('buildSyncSuccessPatch', () => {
  it('returns success state shape', () => {
    const patch = buildSyncSuccessPatch('2026-07-06T12:00:00Z');
    expect(patch).toEqual({
      isSyncing: false,
      lastSyncAt: '2026-07-06T12:00:00Z',
      syncError: null,
    });
  });
  it('uses nowISO by default when no arg given', () => {
    const patch = buildSyncSuccessPatch();
    expect(typeof patch.lastSyncAt).toBe('string');
  });
});
