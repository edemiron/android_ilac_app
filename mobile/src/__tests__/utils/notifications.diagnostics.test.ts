/**
 * notifications/diagnostics tests — Sprint 3 final
 * analyzeNotificationDrift + getNotificationDiagnostics
 * notifee + miuiHelper mock'lanarak test edilir.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    getTriggerNotifications: jest.fn().mockResolvedValue([]),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
    getDisplayedNotifications: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../utils/miuiHelper', () => ({
  isMIUIDevice: jest.fn().mockReturnValue(false),
}));

import notifee from '@notifee/react-native';
import { isMIUIDevice } from '../../utils/miuiHelper';
import {
  analyzeNotificationDrift,
  getNotificationDiagnostics,
  resolveReminderTriggerDate,
  ANDROID_TRIGGER_INTROSPECTION_LIMIT,
  type NotificationStateSnapshot,
  type NotificationDriftReport,
} from '../../utils/notifications/diagnostics';
import type { Medicine, ReminderTime, Snooze, UserSettings } from '../../types';

const baseMedicine: Medicine = {
  id: 'med-1',
  name: 'Aspirin',
  dosage: '500mg',
  frequency: 2,
  color: '#FF6B6B',
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

const baseState: NotificationStateSnapshot = {
  medicines: [baseMedicine],
  reminderTimes: [baseReminder],
  snoozes: [],
  settings: baseSettings,
};

const fixedNow = new Date('2026-07-04T10:00:00Z');

describe('ANDROID_TRIGGER_INTROSPECTION_LIMIT', () => {
  it('equals 50', () => {
    expect(ANDROID_TRIGGER_INTROSPECTION_LIMIT).toBe(50);
  });
});

describe('analyzeNotificationDrift', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isMIUIDevice as jest.Mock).mockReturnValue(false);
    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);
  });

  it('returns expected snapshot for one active reminder', async () => {
    const report: NotificationDriftReport = await analyzeNotificationDrift(baseState, fixedNow);

    expect(report.expectedNotifications).toHaveLength(1);
    expect(report.expectedNotifications[0]).toMatchObject({
      id: 'alarm-med-1-rt-1',
      type: 'alarm',
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      fullScreenAlarm: false,
      quietHoursActive: false,
    });
  });

  it('marks missing when notifee has no matching trigger', async () => {
    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([]);

    const report = await analyzeNotificationDrift(baseState, fixedNow);
    expect(report.missingNotificationIds).toContain('alarm-med-1-rt-1');
    expect(report.hasDrift).toBe(true);
  });

  it('reports no drift when scheduled trigger matches expected', async () => {
    const expected = (await analyzeNotificationDrift(baseState, fixedNow)).expectedNotifications[0];

    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([
      {
        notification: {
          id: expected.id,
          data: {
            medicineId: expected.medicineId,
            reminderTimeId: expected.reminderTimeId,
            scheduledTime: expected.scheduledTime,
            fullScreenAlarm: 'false',
            quietHoursActive: 'false',
          },
          android: { channelId: expected.channelId },
        },
        trigger: { timestamp: expected.triggerTimestamp },
      },
    ]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([expected.id]);

    const report = await analyzeNotificationDrift(baseState, fixedNow);
    expect(report.missingNotificationIds).toEqual([]);
    expect(report.configDriftIds).toEqual([]);
    expect(report.orphanTriggerIds).toEqual([]);
    expect(report.hasDrift).toBe(false);
  });

  it('flags config drift when channelId differs', async () => {
    const expected = (await analyzeNotificationDrift(baseState, fixedNow)).expectedNotifications[0];

    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([
      {
        notification: {
          id: expected.id,
          data: {
            medicineId: expected.medicineId,
            reminderTimeId: expected.reminderTimeId,
            scheduledTime: expected.scheduledTime,
            fullScreenAlarm: 'false',
            quietHoursActive: 'false',
          },
          android: { channelId: 'wrong-channel' },
        },
        trigger: { timestamp: expected.triggerTimestamp },
      },
    ]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([expected.id]);

    const report = await analyzeNotificationDrift(baseState, fixedNow);
    expect(report.configDriftIds).toContain(expected.id);
    expect(report.hasDrift).toBe(true);
  });

  it('flags config drift when trigger timestamp diverges > 1s', async () => {
    const expected = (await analyzeNotificationDrift(baseState, fixedNow)).expectedNotifications[0];

    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([
      {
        notification: {
          id: expected.id,
          data: {
            medicineId: expected.medicineId,
            reminderTimeId: expected.reminderTimeId,
            scheduledTime: expected.scheduledTime,
            fullScreenAlarm: 'false',
            quietHoursActive: 'false',
          },
          android: { channelId: expected.channelId },
        },
        trigger: { timestamp: expected.triggerTimestamp + 60_000 },
      },
    ]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([expected.id]);

    const report = await analyzeNotificationDrift(baseState, fixedNow);
    expect(report.configDriftIds).toContain(expected.id);
  });

  it('detects orphan trigger (scheduled but no medicine matches)', async () => {
    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue(['alarm-orphan-rt-1']);

    const report = await analyzeNotificationDrift(baseState, fixedNow);
    expect(report.orphanTriggerIds).toContain('alarm-orphan-rt-1');
    expect(report.hasDrift).toBe(true);
  });

  it('falls back to ID list when getTriggerNotifications throws', async () => {
    (notifee.getTriggerNotifications as jest.Mock).mockRejectedValue(
      new Error('introspection error')
    );
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue(['alarm-med-1-rt-1']);

    const report = await analyzeNotificationDrift(baseState, fixedNow);
    expect(report.scheduledNotifications).toHaveLength(1);
    expect(report.missingNotificationIds).toEqual([]);
    expect(report.hasDrift).toBe(false);
  });

  it('skips inactive medicines in expected list', async () => {
    const state: NotificationStateSnapshot = {
      ...baseState,
      medicines: [{ ...baseMedicine, isActive: false }],
    };
    const report = await analyzeNotificationDrift(state, fixedNow);
    expect(report.expectedNotifications).toHaveLength(0);
  });

  it('skips disabled reminder times in expected list', async () => {
    const state: NotificationStateSnapshot = {
      ...baseState,
      reminderTimes: [{ ...baseReminder, isEnabled: false }],
    };
    const report = await analyzeNotificationDrift(state, fixedNow);
    expect(report.expectedNotifications).toHaveLength(0);
  });

  it('includes active snoozes with future triggerTime as expected', async () => {
    const future = new Date(fixedNow.getTime() + 10 * 60 * 1000).toISOString();
    const snooze: Snooze = {
      id: 'snooze-1',
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      originalScheduledTime: fixedNow.toISOString(),
      triggerTime: future,
      notificationId: 'snooze-med-1-rt-1-snooze-1',
      snoozeCount: 1,
      isActive: true,
      createdAt: fixedNow.toISOString(),
    };
    const state: NotificationStateSnapshot = {
      ...baseState,
      snoozes: [snooze],
    };

    const report = await analyzeNotificationDrift(state, fixedNow);
    expect(report.expectedNotifications).toHaveLength(2);
    const snoozeExpected = report.expectedNotifications.find(n => n.type === 'snooze');
    expect(snoozeExpected).toBeDefined();
    expect(snoozeExpected?.storedNotificationId).toBe('snooze-med-1-rt-1-snooze-1');
  });

  it('skips snoozes whose triggerTime has already passed', async () => {
    const past = new Date(fixedNow.getTime() - 60 * 1000).toISOString();
    const snooze: Snooze = {
      id: 'snooze-1',
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      originalScheduledTime: past,
      triggerTime: past,
      notificationId: 'snooze-med-1-rt-1-snooze-1',
      snoozeCount: 1,
      isActive: true,
      createdAt: past,
    };
    const state: NotificationStateSnapshot = {
      ...baseState,
      snoozes: [snooze],
    };

    const report = await analyzeNotificationDrift(state, fixedNow);
    expect(report.expectedNotifications.filter(n => n.type === 'snooze')).toHaveLength(0);
  });

  it('suppresses missing trigger drift on MIUI with >50 expected + no other drift', async () => {
    (isMIUIDevice as jest.Mock).mockReturnValue(true);

    // Build 51 active medicines + reminders to exceed ANDROID_TRIGGER_INTROSPECTION_LIMIT
    const medicines: Medicine[] = [];
    const reminderTimes: ReminderTime[] = [];
    for (let i = 0; i < 51; i += 1) {
      medicines.push({ ...baseMedicine, id: `med-${i}`, name: `Med${i}` });
      reminderTimes.push({ ...baseReminder, id: `rt-${i}`, medicineId: `med-${i}` });
    }
    const settings = { ...baseSettings, fullScreenAlarmEnabled: true };
    const state: NotificationStateSnapshot = {
      medicines,
      reminderTimes,
      snoozes: [],
      settings,
    };

    const report = await analyzeNotificationDrift(state, fixedNow);
    expect(report.expectedNotifications.length).toBeGreaterThan(
      ANDROID_TRIGGER_INTROSPECTION_LIMIT
    );
    expect(report.missingNotificationIds).toEqual([]);
    expect(report.hasDrift).toBe(false);
  });

  it('does NOT suppress when other drift exists even on MIUI', async () => {
    (isMIUIDevice as jest.Mock).mockReturnValue(true);

    const medicines: Medicine[] = [];
    const reminderTimes: ReminderTime[] = [];
    for (let i = 0; i < 51; i += 1) {
      medicines.push({ ...baseMedicine, id: `med-${i}`, name: `Med${i}` });
      reminderTimes.push({ ...baseReminder, id: `rt-${i}`, medicineId: `med-${i}` });
    }
    const settings = { ...baseSettings, fullScreenAlarmEnabled: true };
    const state: NotificationStateSnapshot = {
      medicines,
      reminderTimes,
      snoozes: [],
      settings,
    };

    // Add an orphan trigger — creates non-missing drift
    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue(['alarm-orphan-rt-1']);

    const report = await analyzeNotificationDrift(state, fixedNow);
    expect(report.orphanTriggerIds).toContain('alarm-orphan-rt-1');
    expect(report.hasDrift).toBe(true);
  });

  it('uses smokeTriggerTime when provided and in the future', async () => {
    const smokeFuture = new Date(fixedNow.getTime() + 30 * 60 * 1000).toISOString();
    const state: NotificationStateSnapshot = {
      ...baseState,
      reminderTimes: [{ ...baseReminder, smokeTriggerTime: smokeFuture }],
    };

    const report = await analyzeNotificationDrift(state, fixedNow);
    expect(report.expectedNotifications[0].triggerTimestamp).toBe(new Date(smokeFuture).getTime());
  });

  it('ignores smokeTriggerTime when in the past — falls back to reminderTime.time (Sprint 95 fix)', async () => {
    const smokePast = new Date(fixedNow.getTime() - 30 * 60 * 1000).toISOString();
    const state: NotificationStateSnapshot = {
      ...baseState,
      reminderTimes: [{ ...baseReminder, smokeTriggerTime: smokePast }],
    };

    const report = await analyzeNotificationDrift(state, fixedNow);
    // fixedNow = 2026-07-04T10:00 (UTC test env), reminderTime.time = '08:00' gecmis
    // → yarin 2026-07-05T08:00 trigger (Sprint 95 #1 fix — onceki "now" fallback hatasi duzeltildi)
    const expectedTrigger = new Date('2026-07-05T08:00:00').getTime();
    expect(report.expectedNotifications[0].triggerTimestamp).toBe(expectedTrigger);
  });
});

describe('getNotificationDiagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isMIUIDevice as jest.Mock).mockReturnValue(false);
    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);
  });

  it('returns snapshot with counts derived from state', async () => {
    const snapshot = await getNotificationDiagnostics(baseState, fixedNow);

    expect(snapshot.evaluatedAt).toBe(fixedNow.toISOString());
    expect(snapshot.counts).toEqual({
      activeMedicines: 1,
      enabledReminderTimes: 1,
      activeSnoozes: 0,
      expectedNotifications: 1,
      scheduledNotifications: 0,
      displayedNotifications: 0,
    });
  });

  it('mirrors settings into settingsSummary', async () => {
    const settings: UserSettings = {
      ...baseSettings,
      alarmModeEnabled: false,
      vibrationEnabled: false,
      fullScreenAlarmEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00',
      snoozeDuration: 10,
      maxSnoozeCount: 5,
    };
    const snapshot = await getNotificationDiagnostics({ ...baseState, settings }, fixedNow);

    expect(snapshot.settingsSummary).toEqual({
      alarmModeEnabled: false,
      vibrationEnabled: false,
      fullScreenAlarmEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00',
      snoozeDuration: 10,
      maxSnoozeCount: 5,
    });
  });

  it('marks scheduled notifications with isDisplayed when in displayed list', async () => {
    const expected = (await analyzeNotificationDrift(baseState, fixedNow)).expectedNotifications[0];

    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([
      {
        notification: {
          id: expected.id,
          data: {
            medicineId: expected.medicineId,
            reminderTimeId: expected.reminderTimeId,
            scheduledTime: expected.scheduledTime,
            fullScreenAlarm: 'false',
            quietHoursActive: 'false',
          },
          android: { channelId: expected.channelId },
        },
        trigger: { timestamp: expected.triggerTimestamp },
      },
    ]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([expected.id]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([{ id: expected.id }]);

    const snapshot = await getNotificationDiagnostics(baseState, fixedNow);
    expect(snapshot.report.scheduledNotifications[0].isDisplayed).toBe(true);
    expect(snapshot.counts.displayedNotifications).toBe(1);
  });

  it('falls back to medicineName map when scheduled notification lacks name', async () => {
    // getTriggerNotifications returns partial record (no medicineName),
    // medicineName should be filled from state.medicines
    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([
      {
        notification: {
          id: 'alarm-med-1-rt-1',
          data: {
            medicineId: 'med-1',
            reminderTimeId: 'rt-1',
          },
          android: { channelId: 'medicine-alarms-v4' },
        },
        trigger: { timestamp: fixedNow.getTime() },
      },
    ]);
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue(['alarm-med-1-rt-1']);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);

    const snapshot = await getNotificationDiagnostics(baseState, fixedNow);
    expect(snapshot.report.scheduledNotifications[0].medicineName).toBe('Aspirin');
    expect(snapshot.report.scheduledNotifications[0].isDisplayed).toBe(false);
  });

  it('handles getDisplayedNotifications failure gracefully', async () => {
    (notifee.getDisplayedNotifications as jest.Mock).mockRejectedValue(new Error('display fail'));
    const snapshot = await getNotificationDiagnostics(baseState, fixedNow);
    expect(snapshot.counts.displayedNotifications).toBe(0);
    expect(snapshot.report.scheduledNotifications.every(n => n.isDisplayed === false)).toBe(true);
  });

  it('exposes the underlying drift report', async () => {
    const snapshot = await getNotificationDiagnostics(baseState, fixedNow);
    expect(snapshot.report).toBeDefined();
    expect(snapshot.report.expectedNotifications).toHaveLength(1);
    expect(snapshot.report.hasDrift).toBe(true); // nothing scheduled
  });
});

describe('resolveReminderTriggerDate (Sprint 95 — kök neden fix)', () => {
  // 2026-07-31 (Cuma) saat 06:00
  const refNow = new Date('2026-07-31T06:00:00');
  const stubReminder = (time: string, smokeTriggerTime?: string) =>
    ({
      id: 'rt-1',
      medicineId: 'med-1',
      time,
      isEnabled: true,
      ...(smokeTriggerTime ? { smokeTriggerTime } : {}),
    }) as ReminderTime & { smokeTriggerTime?: string };

  it('reminderTime.time "08:00" sabah 06:00’dan → bugün 08:00 (gelecek)', () => {
    const result = resolveReminderTriggerDate(stubReminder('08:00'), false, refNow);
    expect(result.getTime()).toBe(new Date('2026-07-31T08:00:00').getTime());
  });

  it('reminderTime.time "08:00" sabah 10:00’dan → yarın 08:00 (bugün geçmiş)', () => {
    const ref = new Date('2026-07-31T10:00:00');
    const result = resolveReminderTriggerDate(stubReminder('08:00'), false, ref);
    expect(result.getTime()).toBe(new Date('2026-08-01T08:00:00').getTime());
  });

  it('reminderTime.time "23:30" gece 00:30’dan → bugün 23:30 (gelecek)', () => {
    const ref = new Date('2026-07-31T00:30:00');
    const result = resolveReminderTriggerDate(stubReminder('23:30'), false, ref);
    expect(result.getTime()).toBe(new Date('2026-07-31T23:30:00').getTime());
  });

  it('smokeTriggerTime gelecekte + bypassBuffer=false → smoke kullanılır', () => {
    const future = new Date('2026-08-01T12:00:00').toISOString();
    const result = resolveReminderTriggerDate(
      stubReminder('08:00', future),
      false,
      refNow
    );
    expect(result.getTime()).toBe(new Date(future).getTime());
  });

  it('smokeTriggerTime gelecekte + bypassBuffer=true → smoke atlanır, reminderTime.time kullanılır', () => {
    const future = new Date('2026-08-01T12:00:00').toISOString();
    const result = resolveReminderTriggerDate(
      stubReminder('08:00', future),
      true,
      refNow
    );
    expect(result.getTime()).toBe(new Date('2026-07-31T08:00:00').getTime());
  });

  it('notifee 5 sn minimum buffer — trigger <5 sn ise ayarlanır (07:59:58 → 08:00:03)', () => {
    const ref = new Date('2026-07-31T07:59:58'); // 2 sn sonrası
    const result = resolveReminderTriggerDate(stubReminder('08:00'), false, ref);
    // 07:59:58 + 5 sn = 08:00:03 (target 08:00:00 < minTime 08:00:03 → ayarlanır)
    expect(result.getTime()).toBe(new Date('2026-07-31T08:00:03').getTime());
  });

  it('notifee 5 sn minimum buffer — trigger >5 sn ise dokunulmaz (07:55:00 → 08:00:00)', () => {
    const ref = new Date('2026-07-31T07:55:00');
    const result = resolveReminderTriggerDate(stubReminder('08:00'), false, ref);
    expect(result.getTime()).toBe(new Date('2026-07-31T08:00:00').getTime());
  });

  it('bugün geçmiş + yarına kayar — gün sınırı doğru geçilir (23:55 → 00:05+1gün)', () => {
    const ref = new Date('2026-07-31T23:55:00');
    const result = resolveReminderTriggerDate(stubReminder('00:05'), false, ref);
    expect(result.getTime()).toBe(new Date('2026-08-01T00:05:00').getTime());
  });
});
