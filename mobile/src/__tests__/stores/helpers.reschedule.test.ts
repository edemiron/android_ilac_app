/**
 * stores/helpers/reschedule tests
 */

import {
  didReminderSchedulingSettingsChange,
  mergeSnoozeNotificationRescheduleUpdates,
  parseSnoozeTriggerTime,
} from '../../stores/helpers/reschedule';
import type { Snooze, UserSettings } from '../../types';

const baseSettings: UserSettings = {
  wakeUpTime: '08:00',
  sleepTime: '23:00',
  notificationSound: 'default',
  vibrationEnabled: true,
  fullScreenAlarmEnabled: false,
  language: 'tr',
  alarmSound: 'alarm',
  alarmVolume: 80,
  snoozeDuration: 5,
  maxSnoozeCount: 3,
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  alarmModeEnabled: true,
  conflictIntervalMinutes: 10,
  securityEnabled: false,
  securityType: 'none',
  biometricsEnabled: false,
  lockTimeout: 0,
  ttsEnabled: false,
  ttsVolume: 50,
  ttsRepeatCount: 1,
  ttsSpeakMedicineName: true,
  ttsSpeakDosage: true,
  ttsSpeakInstructions: true,
  persistentNotificationEnabled: false,
  persistentNotificationDuration: 60,
};

describe('didReminderSchedulingSettingsChange', () => {
  it('returns false when settings identical', () => {
    expect(didReminderSchedulingSettingsChange(baseSettings, { ...baseSettings })).toBe(false);
  });

  it('detects fullScreenAlarmEnabled change', () => {
    expect(
      didReminderSchedulingSettingsChange(baseSettings, {
        ...baseSettings,
        fullScreenAlarmEnabled: true,
      })
    ).toBe(true);
  });

  it('detects vibrationEnabled change', () => {
    expect(
      didReminderSchedulingSettingsChange(baseSettings, {
        ...baseSettings,
        vibrationEnabled: !baseSettings.vibrationEnabled,
      })
    ).toBe(true);
  });

  it('detects alarmModeEnabled change', () => {
    expect(
      didReminderSchedulingSettingsChange(baseSettings, {
        ...baseSettings,
        alarmModeEnabled: !baseSettings.alarmModeEnabled,
      })
    ).toBe(true);
  });

  it('detects quietHours* changes', () => {
    expect(
      didReminderSchedulingSettingsChange(baseSettings, {
        ...baseSettings,
        quietHoursEnabled: true,
      })
    ).toBe(true);
    expect(
      didReminderSchedulingSettingsChange(baseSettings, {
        ...baseSettings,
        quietHoursStart: '22:00',
      })
    ).toBe(true);
    expect(
      didReminderSchedulingSettingsChange(baseSettings, {
        ...baseSettings,
        quietHoursEnd: '08:00',
      })
    ).toBe(true);
  });

  it('ignores unrelated fields like language', () => {
    expect(
      didReminderSchedulingSettingsChange(baseSettings, { ...baseSettings, language: 'en' })
    ).toBe(false);
  });
});

describe('mergeSnoozeNotificationRescheduleUpdates', () => {
  const snooze: Snooze = {
    id: 'snooze-1',
    medicineId: 'med-1',
    reminderTimeId: 'rt-1',
    originalScheduledTime: '2024-06-25T08:00:00Z',
    triggerTime: '2024-06-25T08:05:00Z',
    notificationId: 'old-notif',
    snoozeCount: 1,
    isActive: true,
    createdAt: '2024-06-25T08:00:00Z',
  };

  it('returns original array when updates empty', () => {
    const result = mergeSnoozeNotificationRescheduleUpdates([snooze], []);
    expect(result).toEqual([snooze]);
  });

  it('applies update to matching snooze', () => {
    const result = mergeSnoozeNotificationRescheduleUpdates(
      [snooze],
      [{ snoozeId: 'snooze-1', notificationId: 'new-notif', triggerTime: '2024-06-25T08:10:00Z' }]
    );
    expect(result[0].notificationId).toBe('new-notif');
    expect(result[0].triggerTime).toBe('2024-06-25T08:10:00Z');
  });

  it('keeps snoozes without matching update unchanged', () => {
    const result = mergeSnoozeNotificationRescheduleUpdates(
      [snooze],
      [{ snoozeId: 'snooze-other', notificationId: 'x', triggerTime: 'y' }]
    );
    expect(result[0]).toEqual(snooze);
  });
});

describe('parseSnoozeTriggerTime', () => {
  it('parses valid ISO string', () => {
    const result = parseSnoozeTriggerTime('2024-06-25T08:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-06-25T08:00:00.000Z');
  });

  it('returns null for invalid string', () => {
    expect(parseSnoozeTriggerTime('not-a-date')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSnoozeTriggerTime('')).toBeNull();
  });
});
