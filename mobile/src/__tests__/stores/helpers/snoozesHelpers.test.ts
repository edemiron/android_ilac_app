/**
 * Alt modul testleri (Sprint 35.2).
 *
 * medicineStoreHelpers.ts 4 alt moduleye bolundu. Bu test dosyasi yeni
 * alt modullere (snoozes, builders) odaklanan test'ler ekler.
 *
 * NOT: Tum 40 helper'in test kapsami zaten medicineStoreHelpers.test.ts +
 * medicineStoreHelpersSprint<24-31>.test.ts dosyalarinda mevcut. Bu test
 * alt modul import path'lerini dogrular.
 */

import {
  countActiveSnoozes,
  deactivateSnoozeById,
  deactivateSnoozesForMedicine,
  deactivateSnoozesIntersectingWith,
  findActiveSnoozeForReminder,
  findActiveSnoozeByNotificationId,
  getActiveSnoozesForReminder,
} from '../../../stores/helpers/snoozes';
import {
  buildAlarmNotificationId,
  buildEmptyMedicineStoreState,
  buildMedicineLogBase,
  buildSelfHealNoDriftResult,
  buildSelfHealRepairContext,
  buildSyncSuccessPatch,
  buildValidatedSyncState,
  countWhere,
  createMedicineTimestamps,
  uniqueNotificationIds,
  withTakenAt,
  MEDICINE_STORE_STORAGE_KEYS,
  getMedicineStoreStorageKeysForRemoval,
} from '../../../stores/helpers/builders';
import type { AlarmState, UserSettings } from '../../types';

describe('Sprint 35.2: helpers/snoozes.ts alt modulu', () => {
  const snoozes = [
    {
      id: 's1',
      medicineId: 'm1',
      reminderTimeId: 'rt1',
      originalScheduledTime: 't1',
      isActive: true,
    },
    {
      id: 's2',
      medicineId: 'm1',
      reminderTimeId: 'rt1',
      originalScheduledTime: 't1',
      isActive: true,
    },
    {
      id: 's3',
      medicineId: 'm2',
      reminderTimeId: 'rt2',
      originalScheduledTime: 't2',
      isActive: false,
    },
  ];

  it('countActiveSnoozes + getActiveSnoozesForReminder + findActiveSnoozeForReminder tutarli', () => {
    expect(countActiveSnoozes(snoozes, 'm1', 'rt1', 't1')).toBe(2);
    expect(getActiveSnoozesForReminder(snoozes, 'm1', 'rt1')).toHaveLength(2);
    expect(findActiveSnoozeForReminder(snoozes, 'm1', 'rt1')?.id).toBe('s1');
  });

  it('deactivateSnoozeById sadece id-match deaktif eder', () => {
    const result = deactivateSnoozeById(snoozes, 's1');
    expect(result[0].isActive).toBe(false);
    expect(result[1].isActive).toBe(true);
  });

  it('deactivateSnoozesForMedicine tum medicineId eslesen snooze deaktif eder', () => {
    const result = deactivateSnoozesForMedicine(snoozes, 'm1');
    expect(result[0].isActive).toBe(false);
    expect(result[1].isActive).toBe(false);
    expect(result[2].isActive).toBe(false); // s3 zaten false, helper aynen tutar
  });

  it('deactivateSnoozesIntersectingWith Set-based O(N+M)', () => {
    const activeSubset = [snoozes[0]];
    const result = deactivateSnoozesIntersectingWith(snoozes, activeSubset);
    expect(result[0].isActive).toBe(false); // intersect
    expect(result[1].isActive).toBe(true); // not intersect
  });

  it('findActiveSnoozeByNotificationId inactive skip eder', () => {
    const snoozesWithNotif = [
      {
        id: 's1',
        medicineId: 'm1',
        reminderTimeId: 'rt1',
        originalScheduledTime: 't1',
        isActive: true,
        notificationId: 'n1',
      },
      {
        id: 's3',
        medicineId: 'm2',
        reminderTimeId: 'rt2',
        originalScheduledTime: 't2',
        isActive: false,
        notificationId: 'n2',
      },
    ];
    expect(findActiveSnoozeByNotificationId(snoozesWithNotif, 'n1')?.id).toBe('s1');
    expect(findActiveSnoozeByNotificationId(snoozesWithNotif, 'n2')).toBeUndefined();
  });
});

describe('Sprint 35.2: helpers/builders.ts alt modulu', () => {
  const mockAlarm: AlarmState = { isActive: false };
  const mockSettings = { foo: 'bar' } as unknown as UserSettings;

  it('buildAlarmNotificationId template format', () => {
    expect(buildAlarmNotificationId('m1', 'rt1')).toBe('alarm-m1-rt1');
  });

  it('buildEmptyMedicineStoreState 7 alan + null lastSyncAt', () => {
    const state = buildEmptyMedicineStoreState(mockAlarm, mockSettings);
    expect(state.medicines).toEqual([]);
    expect(state.alarmState).toBe(mockAlarm);
    expect(state.settings).toBe(mockSettings);
    expect(state.lastSyncAt).toBeNull();
  });

  it('buildValidatedSyncState lastSyncAt otomatik set eder', () => {
    const state = buildValidatedSyncState({
      medicines: [],
      reminderTimes: [],
      medicineLogs: [],
      settings: { x: 1 } as unknown as UserSettings,
    });
    expect(state.lastSyncAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('buildMedicineLogBase + withTakenAt composes correctly', () => {
    const base = buildMedicineLogBase('m1', 'rt1', '2026-07-06T08:00:00Z', 'taken', 'note');
    expect(base.medicineId).toBe('m1');
    const result = withTakenAt(base, 'taken', '2026-07-06T08:00:00Z');
    expect(result.takenAt).toBe('2026-07-06T08:00:00Z');
  });

  it('buildSyncSuccessPatch + countWhere + uniqueNotificationIds + getMedicineStoreStorageKeysForRemoval', () => {
    const patch = buildSyncSuccessPatch('2026-07-06T12:00:00Z');
    expect(patch.isSyncing).toBe(false);
    expect(countWhere([1, 2, 3, 4], n => n > 2)).toBe(2);
    expect(uniqueNotificationIds(['a', 'b', 'a'])).toEqual(['a', 'b']);
    expect(getMedicineStoreStorageKeysForRemoval()).toHaveLength(3);
    expect(MEDICINE_STORE_STORAGE_KEYS).toContain('medicine-store');
  });

  it('buildSelfHealNoDriftResult + buildSelfHealRepairContext context', () => {
    const drift = { hasDrift: false, missingNotificationIds: [] };
    const result = buildSelfHealNoDriftResult(drift, 3);
    expect(result.repaired).toBe(true);

    const ctx = buildSelfHealRepairContext([], [], [], [], 0, 0, 0);
    expect(ctx.cancelledCount).toBe(0);
  });

  it('createMedicineTimestamps equal createdAt + updatedAt', () => {
    const ts = createMedicineTimestamps();
    expect(ts.createdAt).toBe(ts.updatedAt);
  });
});
