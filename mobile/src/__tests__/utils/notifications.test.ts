/**
 * Notification Service Tests
 * Tests for notification scheduling, cancellation, and management
 */

import notifee, { AndroidImportance } from '@notifee/react-native';
import {
  scheduleMedicineNotification,
  scheduleTestAlarmNotification,
  cancelNotification,
  cancelMedicineNotifications,
  cleanupOrphanNotifications,
  isInQuietHours,
  requestExactAlarmPermission,
  stopAlarmVibration,
  scheduleSnoozeNotification,
} from '../../utils/notifications';
import { Medicine, ReminderTime, UserSettings } from '../../types';

// Mock notifee
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue(undefined),
    createTriggerNotification: jest.fn().mockResolvedValue('test-notification-id'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelTriggerNotifications: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
    getTriggerNotifications: jest.fn().mockResolvedValue([]),
    getNotificationSettings: jest.fn().mockResolvedValue({
      android: { alarm: 1 }, // ENABLED
    }),
    openAlarmPermissionSettings: jest.fn().mockResolvedValue(undefined),
  },
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidVisibility: { PUBLIC: 1 },
  AndroidCategory: { ALARM: 'alarm' },
  AndroidStyle: { BIGTEXT: 1, BIGPICTURE: 2, INBOX: 3, MESSAGING: 4 },
  TriggerType: { TIMESTAMP: 0 },
  AlarmType: { SET_ALARM_CLOCK: 0 },
  RepeatFrequency: { DAILY: 2 },
  AndroidNotificationSetting: { ENABLED: 1, DISABLED: 0 },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Vibration: { cancel: jest.fn() },
}));

jest.mock('../../utils/diagnosticTelemetry', () => ({
  recordDiagnosticEvent: jest.fn(),
}));

const { Vibration } = require('react-native');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleMedicineNotification', () => {
    const mockMedicine: Medicine = {
      id: 'med-123',
      name: 'Test Medicine',
      dosage: '100mg',
      frequency: 2,
      color: '#FF6B6B',
      isActive: true,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      startDate: '2024-01-15',
    };

    const mockReminderTime: ReminderTime = {
      id: 'rt-456',
      medicineId: 'med-123',
      time: '08:00',
      isEnabled: true,
    };

    it('should schedule notification for valid medicine and time', async () => {
      const result = await scheduleMedicineNotification(mockMedicine, mockReminderTime);

      expect(notifee.createTriggerNotification).toHaveBeenCalled();
      expect(result).toBe('test-notification-id');
    });

    it('should return null for invalid medicine', async () => {
      const result = await scheduleMedicineNotification(
        { ...mockMedicine, id: '' },
        mockReminderTime
      );

      expect(result).toBeNull();
      expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
    });

    it('should return null for invalid reminder time', async () => {
      const result = await scheduleMedicineNotification(mockMedicine, {
        ...mockReminderTime,
        time: '',
      });

      expect(result).toBeNull();
    });

    it('should cancel existing notification before scheduling new one', async () => {
      await scheduleMedicineNotification(mockMedicine, mockReminderTime);

      // Should cancel first
      expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-123-rt-456');
      // Then create new
      expect(notifee.createTriggerNotification).toHaveBeenCalled();
    });

    it('should include correct notification configuration', async () => {
      await scheduleMedicineNotification(mockMedicine, mockReminderTime);

      const callArgs = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
      const notification = callArgs[0];

      expect(notification.title).toContain('Test Medicine');
      expect(notification.body).toContain('100mg');
      expect(notification.android.channelId).toBeDefined();
      expect(notification.android.importance).toBe(AndroidImportance.HIGH);
      expect(notification.data?.medicineId).toBe('med-123');
    });
  });

  describe('scheduleTestAlarmNotification', () => {
    it('should schedule test alarm with unique ID', async () => {
      const result = await scheduleTestAlarmNotification(5, 'tr');

      expect(notifee.createTriggerNotification).toHaveBeenCalled();
      expect(result).toContain('test-medicine');
      expect(result).toContain('test-reminder');
    });

    it('should include isTestAlarm flag in data', async () => {
      await scheduleTestAlarmNotification(1, 'en');

      const callArgs = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
      const notification = callArgs[0];

      expect(notification.data?.isTestAlarm).toBe('true');
    });

    it('should support both Turkish and English languages', async () => {
      await scheduleTestAlarmNotification(5, 'tr');

      const trCall = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
      expect(trCall[0].title).toMatch(/Test [Iİ]lac[iı]/i);

      jest.clearAllMocks();
      await scheduleTestAlarmNotification(5, 'en');

      const enCall = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
      expect(enCall[0].title).toContain('Test Medicine');
    });
  });

  describe('cancelNotification', () => {
    it('should cancel notification by ID', async () => {
      await cancelNotification('test-id-123');

      expect(notifee.cancelNotification).toHaveBeenCalledWith('test-id-123');
    });

    it('should handle errors gracefully', async () => {
      (notifee.cancelNotification as jest.Mock).mockRejectedValueOnce(new Error('Cancel failed'));

      // Should not throw
      await expect(cancelNotification('test-id')).resolves.not.toThrow();
    });
  });

  describe('cancelMedicineNotifications', () => {
    beforeEach(() => {
      (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([
        'alarm-med-123-rt-1',
        'alarm-med-123-rt-2',
        'alarm-med-456-rt-1',
        'some-other-id',
      ]);
    });

    it('should cancel all notifications for a medicine', async () => {
      await cancelMedicineNotifications('med-123');

      expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-123-rt-1');
      expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-123-rt-2');
      expect(notifee.cancelNotification).not.toHaveBeenCalledWith('alarm-med-456-rt-1');
    });

    it('should handle empty notification list', async () => {
      (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([]);

      await cancelMedicineNotifications('med-123');

      expect(notifee.cancelNotification).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOrphanNotifications', () => {
    beforeEach(() => {
      (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([
        'alarm-med-123-rt-1',
        'alarm-med-deleted-rt-1',
      ]);
    });

    it('should remove notifications for non-existent medicines', async () => {
      await cleanupOrphanNotifications(['med-123']);

      // Should cancel the deleted medicine notification
      expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-deleted-rt-1');
    });
  });

  describe('isInQuietHours', () => {
    const baseSettings = {
      wakeUpTime: '08:00',
      sleepTime: '23:00',
      notificationSound: 'default',
      vibrationEnabled: true,
      fullScreenAlarmEnabled: true,
      language: 'tr' as const,
      alarmSound: 'alarm' as const,
      alarmVolume: 80,
      snoozeDuration: 5,
      maxSnoozeCount: 3,
      quietHoursEnabled: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '07:00',
      alarmModeEnabled: true,
      conflictIntervalMinutes: 10,
    } as UserSettings;

    it('should return false when quiet hours disabled', () => {
      expect(isInQuietHours({ ...baseSettings, quietHoursEnabled: false })).toBe(false);
    });

    it('should detect time in quiet hours (overnight)', () => {
      // Mock current time to 02:00
      const mockDate = new Date('2024-01-15T02:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      expect(isInQuietHours(baseSettings)).toBe(true);

      jest.restoreAllMocks();
    });

    it('should detect time outside quiet hours', () => {
      // Mock current time to 12:00
      const mockDate = new Date('2024-01-15T12:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      expect(isInQuietHours(baseSettings)).toBe(false);

      jest.restoreAllMocks();
    });

    it('should handle same start and end time as never quiet (empty interval)', () => {
      // Mock current time
      const mockDate = new Date('2024-01-15T12:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      // When start === end, the interval is empty (no time satisfies >= start && < end)
      expect(
        isInQuietHours({
          ...baseSettings,
          quietHoursStart: '12:00',
          quietHoursEnd: '12:00',
        })
      ).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('requestExactAlarmPermission', () => {
    it('should not throw for non-android platforms', async () => {
      const { Platform } = require('react-native');
      Platform.OS = 'ios';

      await expect(requestExactAlarmPermission()).resolves.not.toThrow();
    });

    it('should open settings on android', async () => {
      const { Platform } = require('react-native');
      Platform.OS = 'android';

      await requestExactAlarmPermission();

      expect(notifee.openAlarmPermissionSettings).toHaveBeenCalled();
    });
  });

  describe('stopAlarmVibration', () => {
    it('should call Vibration.cancel', () => {
      stopAlarmVibration();
      expect(Vibration.cancel).toHaveBeenCalled();
    });
  });

  describe('scheduleSnoozeNotification', () => {
    const mockMedicine: Medicine = {
      id: 'med-123',
      name: 'Snooze Test Med',
      dosage: '50mg',
      frequency: 1,
      color: '#4ECDC4',
      isActive: true,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      startDate: '2024-01-15',
    };

    const mockReminderTime: ReminderTime = {
      id: 'rt-789',
      medicineId: 'med-123',
      time: '09:00',
      isEnabled: true,
    };

    it('should schedule snooze notification', async () => {
      const result = await scheduleSnoozeNotification({
        medicine: mockMedicine,
        reminderTime: mockReminderTime,
        snoozeDuration: 10,
        snoozeId: 'snooze-123',
        originalScheduledTime: '2024-01-15T09:00:00',
        snoozeCount: 1,
      });

      expect(notifee.createTriggerNotification).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.notificationId).toContain('snooze-');
    });

    it('should include snooze count in data', async () => {
      await scheduleSnoozeNotification({
        medicine: mockMedicine,
        reminderTime: mockReminderTime,
        snoozeDuration: 5,
        snoozeId: 'snooze-456',
        originalScheduledTime: '2024-01-15T09:00:00',
        snoozeCount: 2,
      });

      const callArgs = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
      const notification = callArgs[0];

      expect(notification.data?.snoozeCount).toBe('2');
      expect(notification.title).toContain('Ertelendi');
    });
  });
});
