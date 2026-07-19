/**
 * medicineStoreHelpers Sprint 25 ek helper testleri.
 *
 * Sprint 25.1: State reset helpers (buildEmptyMedicineStoreState, buildValidatedSyncState).
 * Sprint 25.3: package.json "type":"module" Node ESM warning fix denendi,
 * jest/babel uyumsuzlugu nedeniyle roll-back edildi.
 */

import {
  buildEmptyMedicineStoreState,
  buildValidatedSyncState,
} from '../../stores/medicineStoreHelpers';
import type { AlarmState, UserSettings } from '../../types';

const mockAlarm: AlarmState = { isActive: false };
const mockSettings = {
  snoozeEnabled: false,
  snoozeDuration: 5,
  maxSnoozeCount: 3,
  persistentNotificationEnabled: false,
  notificationsEnabled: true,
  alarmSound: 'default',
  vibrationEnabled: true,
  language: 'tr',
  theme: 'light',
} as unknown as UserSettings;

describe('buildEmptyMedicineStoreState', () => {
  it('returns empty arrays', () => {
    const state = buildEmptyMedicineStoreState(mockAlarm, mockSettings);
    expect(state.medicines).toEqual([]);
    expect(state.reminderTimes).toEqual([]);
    expect(state.medicineLogs).toEqual([]);
    expect(state.snoozes).toEqual([]);
  });

  it('returns lastSyncAt as null', () => {
    const state = buildEmptyMedicineStoreState(mockAlarm, mockSettings);
    expect(state.lastSyncAt).toBeNull();
  });

  it('passes alarmState and settings through', () => {
    const state = buildEmptyMedicineStoreState(mockAlarm, mockSettings);
    expect(state.alarmState).toBe(mockAlarm);
    expect(state.settings).toBe(mockSettings);
  });
});

describe('buildValidatedSyncState', () => {
  it('builds sync state from validated data', () => {
    const data = {
      medicines: [{ id: 'm1', name: 'X' }],
      reminderTimes: [{ id: 'rt1', time: '08:00' }],
      medicineLogs: [{ id: 'l1' }],
      settings: { theme: 'dark' },
    };
    const state = buildValidatedSyncState(data);
    expect(state.medicines).toEqual(data.medicines);
    expect(state.reminderTimes).toEqual(data.reminderTimes);
    expect(state.medicineLogs).toEqual(data.medicineLogs);
    expect(state.settings).toEqual(data.settings);
    expect(typeof state.lastSyncAt).toBe('string');
    expect(state.lastSyncAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles empty arrays', () => {
    const data = {
      medicines: [],
      reminderTimes: [],
      medicineLogs: [],
      settings: {},
    };
    const state = buildValidatedSyncState(data);
    expect(state.medicines).toEqual([]);
    expect(state.reminderTimes).toEqual([]);
  });
});
