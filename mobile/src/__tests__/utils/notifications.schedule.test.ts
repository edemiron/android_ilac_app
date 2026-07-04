/**
 * notifications/schedule tests — Sprint 3 devami
 * scheduleExpiryReminder + scheduleSnoozeNotification + scheduleTestAlarmNotification
 * hepsi notifee mock'lanarak test edilir.
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
    createTriggerNotification: jest.fn().mockResolvedValue('notification-id'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
  },
  TriggerType: { TIMESTAMP: 0 },
  AlarmType: { SET_ALARM_CLOCK: 4 },
  AndroidImportance: { HIGH: 4 },
  AndroidVisibility: { PRIVATE: 0 },
  AndroidCategory: { ALARM: 4 },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import notifee from '@notifee/react-native';
import {
  scheduleExpiryReminder,
  cancelExpiryReminder,
  scheduleSnoozeNotification,
  scheduleTestAlarmNotification,
  scheduleMedicineNotification,
} from '../../utils/notifications/schedule';
import type { ScheduleSnoozeParams } from '../../utils/notifications/schedule';

const baseMedicine = {
  id: 'med-1',
  name: 'Aspirin',
  dosage: '500mg',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  color: '#FF6B6B',
};

describe('scheduleExpiryReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when expiry date is in the past', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 30);
    const result = await scheduleExpiryReminder(baseMedicine, past.toISOString(), 7);
    expect(result).toBeNull();
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('creates notification for future expiry date', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    const result = await scheduleExpiryReminder(baseMedicine, future.toISOString(), 7);
    expect(result).toBe('expiry-med-1');
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });

  it('cancels existing expiry notification before creating new one', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    await scheduleExpiryReminder(baseMedicine, future.toISOString(), 7);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('expiry-med-1');
  });

  it('includes type expiry_reminder in data', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    await scheduleExpiryReminder(baseMedicine, future.toISOString(), 7, 'en');
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].data.type).toBe('expiry_reminder');
    expect(call[0].data.medicineId).toBe('med-1');
  });
});

describe('cancelExpiryReminder', () => {
  it('cancels expiry notification', async () => {
    await cancelExpiryReminder('med-1');
    expect(notifee.cancelNotification).toHaveBeenCalledWith('expiry-med-1');
  });
});

describe('scheduleSnoozeNotification', () => {
  const baseReminder = {
    id: 'rt-1',
    medicineId: 'med-1',
    time: '08:00',
    isEnabled: true,
  };

  const baseParams: ScheduleSnoozeParams = {
    medicine: baseMedicine as any,
    reminderTime: baseReminder as any,
    snoozeId: 'snooze-1',
    originalScheduledTime: '2024-06-25T08:00:00Z',
    snoozeCount: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules snooze notification with default duration (5 min)', async () => {
    const result = await scheduleSnoozeNotification(baseParams);
    expect(result).not.toBeNull();
    expect(result?.notificationId).toBe('snooze-med-1-rt-1-snooze-1');
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });

  it('schedules snooze with custom duration', async () => {
    const result = await scheduleSnoozeNotification({
      ...baseParams,
      snoozeDuration: 10,
    });
    expect(result).not.toBeNull();
    expect(notifee.createTriggerNotification).toHaveBeenCalled();
  });

  it('uses explicit triggerTime when provided', async () => {
    const explicit = new Date('2024-12-25T10:00:00Z');
    const result = await scheduleSnoozeNotification({
      ...baseParams,
      triggerTime: explicit,
    });
    expect(result?.triggerTime.getTime()).toBe(explicit.getTime());
  });

  it('cancels existing snooze before creating new one', async () => {
    await scheduleSnoozeNotification(baseParams);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('snooze-med-1-rt-1-snooze-1');
  });

  it('returns null on error', async () => {
    (notifee.createTriggerNotification as jest.Mock).mockRejectedValueOnce(
      new Error('test failure')
    );
    const result = await scheduleSnoozeNotification(baseParams);
    expect(result).toBeNull();
  });

  it('includes snooze data fields', async () => {
    await scheduleSnoozeNotification({
      ...baseParams,
      snoozeCount: 3,
    });
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].data.isSnooze).toBe('true');
    expect(call[0].data.snoozeId).toBe('snooze-1');
    expect(call[0].data.snoozeCount).toBe('3');
  });
});

describe('scheduleTestAlarmNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules alarm with default language (tr)', async () => {
    const result = await scheduleTestAlarmNotification(5);
    expect(result).toBe('alarm-test-medicine-test-reminder');
  });

  it('uses English title when language=en', async () => {
    await scheduleTestAlarmNotification(5, 'en');
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].title).toContain('Test Medicine');
  });

  it('enforces minimum 5 seconds delay', async () => {
    await scheduleTestAlarmNotification(0.01); // 0.6 seconds < 5
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    const trigger = call[1] as any;
    const triggerTime = new Date(trigger.timestamp);
    const now = Date.now();
    const delaySec = (triggerTime.getTime() - now) / 1000;
    expect(delaySec).toBeGreaterThanOrEqual(4.9); // 5s allowance
  });

  it('cancels existing test alarm before creating new one', async () => {
    await scheduleTestAlarmNotification(5);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-test-medicine-test-reminder');
  });

  it('throws on createTriggerNotification failure', async () => {
    (notifee.createTriggerNotification as jest.Mock).mockRejectedValueOnce(
      new Error('notif failure')
    );
    await expect(scheduleTestAlarmNotification(5)).rejects.toThrow('notif failure');
  });

  it('includes isTestAlarm data field', async () => {
    await scheduleTestAlarmNotification(5);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].data.isTestAlarm).toBe('true');
  });
});

describe('scheduleMedicineNotification', () => {
  const mockMedicine: any = {
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

  const mockReminder: any = {
    id: 'rt-1',
    medicineId: 'med-1',
    time: '08:00',
    isEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for invalid medicine (no id)', async () => {
    const result = await scheduleMedicineNotification(
      { ...mockMedicine, id: '' } as any,
      mockReminder
    );
    expect(result).toBeNull();
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('returns null for invalid reminder (no id)', async () => {
    const result = await scheduleMedicineNotification(mockMedicine, {
      ...mockReminder,
      id: '',
    } as any);
    expect(result).toBeNull();
  });

  it('returns null for reminder without time', async () => {
    const result = await scheduleMedicineNotification(mockMedicine, {
      ...mockReminder,
      time: '',
    } as any);
    expect(result).toBeNull();
  });

  it('returns notification id for valid medicine + reminder', async () => {
    const result = await scheduleMedicineNotification(mockMedicine, mockReminder);
    expect(result).toBe('notification-id');
  });

  it('cancels existing alarm before creating new one', async () => {
    await scheduleMedicineNotification(mockMedicine, mockReminder);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-1-rt-1');
  });

  it('includes medicine + reminder data in payload', async () => {
    await scheduleMedicineNotification(mockMedicine, mockReminder);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].id).toBe('alarm-med-1-rt-1');
    expect(call[0].data.medicineId).toBe('med-1');
    expect(call[0].data.reminderTimeId).toBe('rt-1');
  });

  it('uses AlarmType.SET_ALARM_CLOCK for trigger', async () => {
    await scheduleMedicineNotification(mockMedicine, mockReminder);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[1].alarmManager.type).toBe(4); // SET_ALARM_CLOCK
  });

  it('returns null on createTriggerNotification error', async () => {
    (notifee.createTriggerNotification as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const result = await scheduleMedicineNotification(mockMedicine, mockReminder);
    expect(result).toBeNull();
  });
});
