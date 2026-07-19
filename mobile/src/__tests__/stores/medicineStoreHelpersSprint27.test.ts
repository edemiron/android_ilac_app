/**
 * medicineStoreHelpers Sprint 27 ek helper testleri.
 *
 * Sprint 27.1: Snooze helpers (deactivateSnoozeById, deactivateSnoozesForMedicine,
 * findActiveSnoozeForReminder, findActiveSnoozeByNotificationId).
 * Sprint 27.2: Log helpers (buildMedicineLogBase, withTakenAt).
 * Sprint 27.3: Reminder helpers (getReminderTimesForMedicinePure).
 */

import {
  deactivateSnoozeById,
  deactivateSnoozesForMedicine,
  findActiveSnoozeForReminder,
  findActiveSnoozeByNotificationId,
  getReminderTimesForMedicinePure,
  buildMedicineLogBase,
  withTakenAt,
} from '../../stores/medicineStoreHelpers';

describe('deactivateSnoozeById', () => {
  const snoozes = [
    { id: 's1', isActive: true },
    { id: 's2', isActive: true },
    { id: 's3', isActive: true },
  ];

  it('deactivates matching snooze', () => {
    const result = deactivateSnoozeById(snoozes, 's2');
    expect(result[1].isActive).toBe(false);
    expect(result[0].isActive).toBe(true);
    expect(result[2].isActive).toBe(true);
  });

  it('returns unchanged list when id not found', () => {
    expect(deactivateSnoozeById(snoozes, 'nope')).toEqual(snoozes);
  });
});

describe('deactivateSnoozesForMedicine', () => {
  const snoozes = [
    { id: 's1', medicineId: 'm1', isActive: true },
    { id: 's2', medicineId: 'm2', isActive: true },
    { id: 's3', medicineId: 'm1', isActive: true },
  ];

  it('deactivates only matching medicine snoozes', () => {
    const result = deactivateSnoozesForMedicine(snoozes, 'm1');
    expect(result[0].isActive).toBe(false);
    expect(result[1].isActive).toBe(true); // m2 stays active
    expect(result[2].isActive).toBe(false);
  });

  it('returns unchanged list when medicineId not found', () => {
    expect(deactivateSnoozesForMedicine(snoozes, 'nope')).toEqual(snoozes);
  });
});

describe('findActiveSnoozeForReminder', () => {
  const snoozes = [
    { id: 's1', medicineId: 'm1', reminderTimeId: 'rt1', isActive: true },
    { id: 's2', medicineId: 'm1', reminderTimeId: 'rt1', isActive: false },
    { id: 's3', medicineId: 'm2', reminderTimeId: 'rt1', isActive: true },
  ];

  it('finds active matching snooze', () => {
    expect(findActiveSnoozeForReminder(snoozes, 'm1', 'rt1')?.id).toBe('s1');
  });

  it('skips inactive snoozes', () => {
    expect(findActiveSnoozeForReminder([snoozes[1]], 'm1', 'rt1')).toBeUndefined();
  });

  it('returns undefined when not found', () => {
    expect(findActiveSnoozeForReminder(snoozes, 'nope', 'rt1')).toBeUndefined();
  });
});

describe('findActiveSnoozeByNotificationId', () => {
  const snoozes = [
    { id: 's1', notificationId: 'n1', isActive: true },
    { id: 's2', notificationId: 'n2', isActive: false },
  ];

  it('finds active matching snooze', () => {
    expect(findActiveSnoozeByNotificationId(snoozes, 'n1')?.id).toBe('s1');
  });

  it('skips inactive snoozes', () => {
    expect(findActiveSnoozeByNotificationId(snoozes, 'n2')).toBeUndefined();
  });
});

describe('getReminderTimesForMedicinePure', () => {
  const reminderTimes = [
    { id: 'rt1', medicineId: 'm1', time: '12:00' },
    { id: 'rt2', medicineId: 'm2', time: '08:00' },
    { id: 'rt3', medicineId: 'm1', time: '08:00' },
  ];

  it('filters by medicineId and sorts by time', () => {
    const result = getReminderTimesForMedicinePure(reminderTimes, 'm1');
    expect(result).toHaveLength(2);
    expect(result[0].time).toBe('08:00');
    expect(result[1].time).toBe('12:00');
  });

  it('returns empty for non-matching medicineId', () => {
    expect(getReminderTimesForMedicinePure(reminderTimes, 'nope')).toEqual([]);
  });
});

describe('buildMedicineLogBase', () => {
  it('builds base log object', () => {
    const base = buildMedicineLogBase('m1', 'rt1', '2026-07-06T08:00:00Z', 'taken', 'note');
    expect(base.medicineId).toBe('m1');
    expect(base.reminderTimeId).toBe('rt1');
    expect(base.scheduledTime).toBe('2026-07-06T08:00:00Z');
    expect(base.status).toBe('taken');
    expect(base.note).toBe('note');
  });

  it('handles no note', () => {
    const base = buildMedicineLogBase('m1', 'rt1', '2026-07-06T08:00:00Z', 'skipped');
    expect(base.note).toBeUndefined();
  });
});

describe('withTakenAt', () => {
  it('adds takenAt when status is taken', () => {
    const result = withTakenAt({ id: 'l1' } as never, 'taken', '2026-07-06T08:00:00Z');
    expect((result as { takenAt?: string }).takenAt).toBe('2026-07-06T08:00:00Z');
  });

  it('does not add takenAt for skipped', () => {
    const result = withTakenAt({ id: 'l1' } as never, 'skipped', '2026-07-06T08:00:00Z');
    expect((result as { takenAt?: string }).takenAt).toBeUndefined();
  });

  it('uses nowISO by default', () => {
    const result = withTakenAt({ id: 'l1' }, 'taken');
    expect(typeof result.takenAt).toBe('string');
    expect(result.takenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
