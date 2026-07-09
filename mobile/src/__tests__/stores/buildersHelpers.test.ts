/**
 * builders.ts kapsamli test (Sprint 44.2).
 *
 * Babel-jest 'as any'/'as never' syntax uyumsuzluk devam ederken explicit
 * type declaration ile test yazdik. Sprint 43'te kullandigimiz pattern.
 */

import {
  buildAlarmNotificationId,
  buildCaregiverNotificationArgs,
  buildEmptyMedicineStoreState,
  buildMedicineLogBase,
  buildSelfHealNoDriftResult,
  buildSelfHealRepairContext,
  buildSyncSuccessPatch,
  buildValidatedSyncState,
  createMedicineTimestamps,
  withTakenAt,
  MEDICINE_STORE_STORAGE_KEYS,
  getMedicineStoreStorageKeysForRemoval,
} from '../../stores/helpers/builders';

// Type alias declarations (as any workaround)
type AlarmStateFixture = { isActive: boolean };
type UserSettingsFixture = Record<string, unknown>;
type MedicineFixture = { name: string };
type LogFixture = { scheduledTime: string };

describe('buildAlarmNotificationId', () => {
  it('formats alarm ID with template', () => {
    expect(buildAlarmNotificationId('m1', 'r1')).toBe('alarm-m1-r1');
  });

  it('handles long IDs', () => {
    expect(buildAlarmNotificationId('med-12345', 'reminder-67890')).toBe(
      'alarm-med-12345-reminder-67890'
    );
  });

  it('handles empty strings', () => {
    expect(buildAlarmNotificationId('', '')).toBe('alarm--');
  });
});

describe('buildEmptyMedicineStoreState', () => {
  it('returns 4 empty arrays + null lastSyncAt', () => {
    const alarm: AlarmStateFixture = { isActive: false };
    const settings: UserSettingsFixture = { theme: 'light' };
    const state = buildEmptyMedicineStoreState(alarm as never, settings as never);
    expect(state.medicines).toEqual([]);
    expect(state.reminderTimes).toEqual([]);
    expect(state.medicineLogs).toEqual([]);
    expect(state.snoozes).toEqual([]);
    expect(state.lastSyncAt).toBeNull();
  });

  it('preserves alarmState reference', () => {
    const alarm: AlarmStateFixture = { isActive: true };
    const settings: UserSettingsFixture = {};
    const state = buildEmptyMedicineStoreState(alarm as never, settings as never);
    expect(state.alarmState).toBe(alarm);
  });

  it('preserves settings reference', () => {
    const alarm: AlarmStateFixture = { isActive: false };
    const settings: UserSettingsFixture = { theme: 'dark' };
    const state = buildEmptyMedicineStoreState(alarm as never, settings as never);
    expect(state.settings).toBe(settings);
  });
});

describe('buildSyncSuccessPatch', () => {
  it('uses nowISO by default', () => {
    const patch = buildSyncSuccessPatch();
    expect(patch.isSyncing).toBe(false);
    expect(patch.syncError).toBeNull();
    expect(typeof patch.lastSyncAt).toBe('string');
  });

  it('uses provided now string', () => {
    const patch = buildSyncSuccessPatch('2026-01-01T00:00:00Z');
    expect(patch.lastSyncAt).toBe('2026-01-01T00:00:00Z');
  });
});

describe('buildValidatedSyncState', () => {
  it('preserves all 4 input arrays + adds lastSyncAt', () => {
    const data = {
      medicines: [{ id: 'm1' }],
      reminderTimes: [{ id: 'r1' }],
      medicineLogs: [{ id: 'l1' }],
      settings: { x: 1 },
    };
    const state = buildValidatedSyncState(data);
    expect(state.medicines).toEqual(data.medicines);
    expect(state.reminderTimes).toEqual(data.reminderTimes);
    expect(state.medicineLogs).toEqual(data.medicineLogs);
    expect(state.settings).toBe(data.settings);
    expect(typeof state.lastSyncAt).toBe('string');
  });
});

describe('buildMedicineLogBase', () => {
  it('builds object with all required fields', () => {
    const base = buildMedicineLogBase('m1', 'r1', '08:00', 'taken', 'note');
    expect(base.medicineId).toBe('m1');
    expect(base.reminderTimeId).toBe('r1');
    expect(base.scheduledTime).toBe('08:00');
    expect(base.status).toBe('taken');
    expect(base.note).toBe('note');
  });

  it('handles undefined note', () => {
    const base = buildMedicineLogBase('m1', 'r1', '08:00', 'skipped');
    expect(base.note).toBeUndefined();
  });
});

describe('withTakenAt', () => {
  it('adds takenAt for taken status', () => {
    const r = withTakenAt({ id: 'l1' }, 'taken', '2026-07-06');
    expect(r.takenAt).toBe('2026-07-06');
  });

  it('does not add for skipped', () => {
    const r = withTakenAt({ id: 'l1' }, 'skipped', '2026-07-06');
    expect(r.takenAt).toBeUndefined();
  });

  it('uses nowISO by default when no now provided', () => {
    const r = withTakenAt({ id: 'l1' }, 'taken');
    expect(typeof r.takenAt).toBe('string');
    expect(r.takenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('buildCaregiverNotificationArgs', () => {
  it('returns tuple [name, scheduledTime, name, missed]', () => {
    const med: MedicineFixture = { name: 'Aspirin' };
    const log: LogFixture = { scheduledTime: '08:00' };
    expect(buildCaregiverNotificationArgs(med, log)).toEqual([
      'Aspirin',
      '08:00',
      'Aspirin',
      'missed',
    ]);
  });

  it('preserves medicine name + log scheduledTime', () => {
    expect(buildCaregiverNotificationArgs({ name: 'X' }, { scheduledTime: '20:00' })).toEqual([
      'X',
      '20:00',
      'X',
      'missed',
    ]);
  });
});

describe('buildSelfHealNoDriftResult', () => {
  it('preserves drift fields', () => {
    const drift = { hasDrift: false, missingNotificationIds: ['a'] };
    const r = buildSelfHealNoDriftResult(drift, 0);
    expect(r.missingNotificationIds).toEqual(['a']);
    expect(r.repaired).toBe(false);
  });

  it('marks repaired=true when cleanedSnoozeCount > 0', () => {
    const drift = { hasDrift: false };
    const r = buildSelfHealNoDriftResult(drift, 5);
    expect(r.repaired).toBe(true);
  });

  it('returns empty arrays for cancelledNotificationIds + snoozeNotificationUpdates', () => {
    const r = buildSelfHealNoDriftResult({ hasDrift: false }, 0);
    expect(r.cancelledNotificationIds).toEqual([]);
    expect(r.snoozeNotificationUpdates).toEqual([]);
  });
});

describe('buildSelfHealRepairContext', () => {
  it('counts all 7 fields correctly', () => {
    const ctx = buildSelfHealRepairContext(['a', 'b'], ['c'], ['d', 'e', 'f'], ['g'], 5, 2, 4);
    expect(ctx.missingCount).toBe(2);
    expect(ctx.configDriftCount).toBe(1);
    expect(ctx.orphanCount).toBe(3);
    expect(ctx.legacySnoozeCount).toBe(1);
    expect(ctx.cancelledCount).toBe(5);
    expect(ctx.cleanedStaleSnoozeCount).toBe(2);
    expect(ctx.snoozeUpdateCount).toBe(4);
  });

  it('handles all empty arrays', () => {
    const ctx = buildSelfHealRepairContext([], [], [], [], 0, 0, 0);
    expect(ctx.missingCount).toBe(0);
  });
});

describe('createMedicineTimestamps', () => {
  it('returns equal createdAt + updatedAt', () => {
    const ts = createMedicineTimestamps();
    expect(ts.createdAt).toBe(ts.updatedAt);
    expect(typeof ts.createdAt).toBe('string');
  });
});

describe('MEDICINE_STORE_STORAGE_KEYS', () => {
  it('contains 3 expected keys', () => {
    expect(MEDICINE_STORE_STORAGE_KEYS).toContain('medicine-store');
    expect(MEDICINE_STORE_STORAGE_KEYS).toContain('medicine-store-sync-queue');
    expect(MEDICINE_STORE_STORAGE_KEYS).toContain('@medicine_storage');
  });
});

describe('getMedicineStoreStorageKeysForRemoval', () => {
  it('returns same array', () => {
    expect(getMedicineStoreStorageKeysForRemoval()).toEqual(MEDICINE_STORE_STORAGE_KEYS);
  });
});
