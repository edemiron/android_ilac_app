/**
 * Alt modul refactoring testi (Sprint 34.2).
 *
 * medicineStoreHelpers.ts 4 alt moduleye bolundu (dateTime, snoozes, crud,
 * builders). Bu test re-export path'inin dogru calistigini dogrular.
 */

import {
  getDateString,
  getTimeString,
  nowISO,
  calculateAdherenceRate,
  countActiveSnoozes,
  deactivateSnoozeById,
  findMedicineById,
  filterReminderTimesByMedicine,
  buildSyncSuccessPatch,
  uniqueNotificationIds,
  getMedicineStoreStorageKeysForRemoval,
} from '../../stores/medicineStoreHelpers';

describe('Sprint 34: Alt modul re-export compat', () => {
  it('dateTime helpers erisilebilir', () => {
    expect(getDateString(new Date('2026-07-06T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof getTimeString(new Date())).toBe('string');
    expect(nowISO()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('adherence helpers erisilebilir', () => {
    const rate = calculateAdherenceRate([], [], [], 7);
    expect(rate).toBe(100);
  });

  it('snooze helpers erisilebilir', () => {
    const snoozes = [
      {
        id: 's1',
        medicineId: 'm1',
        reminderTimeId: 'rt1',
        originalScheduledTime: 't',
        isActive: true,
      },
    ];
    expect(countActiveSnoozes(snoozes, 'm1', 'rt1', 't')).toBe(1);
    expect(deactivateSnoozeById(snoozes, 's1')[0].isActive).toBe(false);
  });

  it('crud + filter helpers erisilebilir', () => {
    const medicines = [{ id: 'm1' }, { id: 'm2' }];
    expect(findMedicineById(medicines, 'm2')?.id).toBe('m2');

    const reminderTimes = [
      { id: 'rt1', medicineId: 'm1', time: '08:00' },
      { id: 'rt2', medicineId: 'm2', time: '12:00' },
    ];
    expect(filterReminderTimesByMedicine(reminderTimes, 'm1')).toHaveLength(1);
  });

  it('builder + utility helpers erisilebilir', () => {
    const patch = buildSyncSuccessPatch('2026-07-06T12:00:00Z');
    expect(patch.isSyncing).toBe(false);

    expect(uniqueNotificationIds(['a', 'b', 'a'])).toEqual(['a', 'b']);
    expect(getMedicineStoreStorageKeysForRemoval()).toHaveLength(3);
  });
});
