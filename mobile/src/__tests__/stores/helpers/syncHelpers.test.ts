/**
 * Sprint 47: sync merge helpers test (helpers/sync.ts).
 *
 * medicineStore.ts syncFromCloud inline merge logic'i 4 pure helper'a
 * delege edildi. Bu test'ler o helper'larin davranisini dogrular.
 */

import {
  mergeMedicineLogsById,
  mergeMedicinesByUpdatedAt,
  mergeReminderTimesById,
  mergeSettingsWithUndefined,
} from '../../../../src/stores/helpers/sync';
import type { Medicine, MedicineLog, ReminderTime, UserSettings } from '../../../../src/types';

const baseMedicine = (id: string, updatedAt: string): Medicine => ({
  id,
  name: `Medicine ${id}`,
  dosage: '100mg',
  frequency: 2,
  color: '#FF6B6B',
  startDate: '2024-01-01',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt,
});

const baseLog = (id: string, status: 'taken' | 'skipped' | 'missed' = 'taken'): MedicineLog => ({
  id,
  medicineId: 'm1',
  reminderTimeId: 'rt1',
  scheduledTime: '2024-01-01T08:00:00Z',
  status,
});

const baseReminder = (id: string): ReminderTime => ({
  id,
  medicineId: 'm1',
  time: '08:00',
  isEnabled: true,
});

describe('mergeMedicinesByUpdatedAt', () => {
  it('returns local copy when cloud is undefined', () => {
    const local = [baseMedicine('m1', '2024-01-01T00:00:00Z')];
    const result = mergeMedicinesByUpdatedAt(local, undefined);
    expect(result).toEqual(local);
    expect(result).not.toBe(local); // new reference
  });

  it('returns local copy when cloud is empty', () => {
    const local = [baseMedicine('m1', '2024-01-01T00:00:00Z')];
    expect(mergeMedicinesByUpdatedAt(local, [])).toEqual(local);
  });

  it('adds cloud-only medicine', () => {
    const local = [baseMedicine('m1', '2024-01-01T00:00:00Z')];
    const cloud = [baseMedicine('m2', '2024-01-02T00:00:00Z')];
    const result = mergeMedicinesByUpdatedAt(local, cloud);
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(['m1', 'm2']);
  });

  it('updates local when cloud is newer', () => {
    const local = [baseMedicine('m1', '2024-01-01T00:00:00Z')];
    const cloud = [baseMedicine('m1', '2024-01-02T00:00:00Z')];
    const result = mergeMedicinesByUpdatedAt(local, cloud);
    expect(result).toHaveLength(1);
    expect(result[0].updatedAt).toBe('2024-01-02T00:00:00Z');
  });

  it('keeps local when local is newer', () => {
    const local = [baseMedicine('m1', '2024-01-03T00:00:00Z')];
    const cloud = [baseMedicine('m1', '2024-01-01T00:00:00Z')];
    const result = mergeMedicinesByUpdatedAt(local, cloud);
    expect(result[0].updatedAt).toBe('2024-01-03T00:00:00Z');
  });

  it('mixes add + update + keep', () => {
    const local = [
      baseMedicine('m1', '2024-01-01T00:00:00Z'),
      baseMedicine('m2', '2024-01-05T00:00:00Z'),
    ];
    const cloud = [
      baseMedicine('m1', '2024-01-02T00:00:00Z'), // newer
      baseMedicine('m2', '2024-01-01T00:00:00Z'), // older
      baseMedicine('m3', '2024-01-04T00:00:00Z'), // new
    ];
    const result = mergeMedicinesByUpdatedAt(local, cloud);
    expect(result).toHaveLength(3);
    expect(result.find(m => m.id === 'm1')?.updatedAt).toBe('2024-01-02T00:00:00Z');
    expect(result.find(m => m.id === 'm2')?.updatedAt).toBe('2024-01-05T00:00:00Z');
    expect(result.find(m => m.id === 'm3')?.updatedAt).toBe('2024-01-04T00:00:00Z');
  });
});

describe('mergeMedicineLogsById', () => {
  it('returns local copy when cloud is undefined', () => {
    const local = [baseLog('l1')];
    const result = mergeMedicineLogsById(local, undefined);
    expect(result).toEqual(local);
    expect(result).not.toBe(local);
  });

  it('adds cloud-only logs (no duplicate IDs)', () => {
    const local = [baseLog('l1'), baseLog('l2')];
    const cloud = [baseLog('l2'), baseLog('l3')];
    const result = mergeMedicineLogsById(local, cloud);
    expect(result).toHaveLength(3);
    expect(result.map(l => l.id).sort()).toEqual(['l1', 'l2', 'l3']);
  });

  it('keeps all local logs (local priority)', () => {
    const local = [baseLog('l1', 'taken'), baseLog('l2', 'skipped')];
    const cloud = [baseLog('l1', 'missed')];
    const result = mergeMedicineLogsById(local, cloud);
    expect(result).toHaveLength(2);
    expect(result.find(l => l.id === 'l1')?.status).toBe('taken');
  });

  it('handles empty arrays', () => {
    expect(mergeMedicineLogsById([], [baseLog('l1')])).toEqual([baseLog('l1')]);
    expect(mergeMedicineLogsById([baseLog('l1')], [])).toEqual([baseLog('l1')]);
  });
});

describe('mergeReminderTimesById', () => {
  it('returns local copy when cloud is undefined', () => {
    const local = [baseReminder('rt1')];
    const result = mergeReminderTimesById(local, undefined);
    expect(result).toEqual(local);
    expect(result).not.toBe(local);
  });

  it('adds cloud-only reminders', () => {
    const local = [baseReminder('rt1')];
    const cloud = [baseReminder('rt2')];
    const result = mergeReminderTimesById(local, cloud);
    expect(result).toHaveLength(2);
    expect(result.map(rt => rt.id)).toEqual(['rt1', 'rt2']);
  });

  it('does not duplicate IDs', () => {
    const local = [baseReminder('rt1'), baseReminder('rt2')];
    const cloud = [baseReminder('rt2'), baseReminder('rt3')];
    const result = mergeReminderTimesById(local, cloud);
    expect(result).toHaveLength(3);
  });
});

describe('mergeSettingsWithUndefined', () => {
  const local: UserSettings = {
    language: 'tr',
    notificationSound: 'default',
    vibrationEnabled: true,
    alarmSound: 'default',
    alarmVolume: 80,
    snoozeDuration: 5,
    maxSnoozeCount: 3,
    quietHoursEnabled: false,
    alarmModeEnabled: true,
    fullScreenAlarmEnabled: true,
    wakeUpTime: '07:00',
    sleepTime: '23:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    conflictIntervalMinutes: 5,
    securityEnabled: false,
    securityType: 'pin',
    biometricsEnabled: false,
    lockTimeout: 30,
    ttsEnabled: false,
    ttsVolume: 50,
    ttsRepeatCount: 1,
    ttsSpeakMedicineName: true,
    ttsSpeakDosage: true,
    ttsSpeakInstructions: false,
    persistentNotificationEnabled: false,
    persistentNotificationDuration: 30,
  };

  it('returns local when cloud is undefined', () => {
    expect(mergeSettingsWithUndefined(local, undefined)).toEqual(local);
  });

  it('overrides local with cloud values', () => {
    const cloud: Partial<UserSettings> = { language: 'en', vibrationEnabled: false };
    const result = mergeSettingsWithUndefined(local, cloud);
    expect(result.language).toBe('en');
    expect(result.vibrationEnabled).toBe(false);
    expect(result.notificationSound).toBe('default'); // unchanged
  });

  it('skips undefined cloud values (Firestore compat)', () => {
    const cloud: Partial<UserSettings> = { language: 'en', vibrationEnabled: undefined };
    const result = mergeSettingsWithUndefined(local, cloud);
    expect(result.language).toBe('en');
    expect(result.vibrationEnabled).toBe(true); // local preserved
  });

  it('handles empty cloud object', () => {
    const result = mergeSettingsWithUndefined(local, {});
    expect(result).toEqual(local);
  });
});
