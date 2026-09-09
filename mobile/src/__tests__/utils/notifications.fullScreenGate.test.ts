/**
 * "Kilit ekranında tam ekran alarm" toggle'ının GERÇEKTEN bir şeyi kapatması.
 *
 * Regresyon koruması: `AlarmModule.scheduleNativeAlarm` eskiden KOŞULSUZ
 * çağrılıyordu. Bu yüzden kullanıcı ayarı kapatsa (veya sessiz saatler aktif
 * olsa) bile AlarmReceiver yolu tam ekran alarmı yine açıyordu — ayar
 * pratikte hiçbir şeyi kapatmıyordu.
 *
 * Ayrıca: kapalı durumda bypassDnd'li ALARM kanalı kullanılmamalı (Android
 * kanal özellikleri oluşturulduktan sonra değiştirilemez), hatırlatma kanalına
 * düşülmeli.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockScheduleNativeAlarm = jest.fn().mockResolvedValue(true);
const mockCancelNativeAlarm = jest.fn().mockResolvedValue(true);
const mockCancelAlarmNotification = jest.fn().mockResolvedValue(true);

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    AlarmModule: {
      scheduleNativeAlarm: (...args: unknown[]) => mockScheduleNativeAlarm(...args),
      cancelNativeAlarm: (...args: unknown[]) => mockCancelNativeAlarm(...args),
      cancelAlarmNotification: (...args: unknown[]) => mockCancelAlarmNotification(...args),
    },
  },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createTriggerNotification: jest.fn().mockResolvedValue('notification-id'),
    createChannel: jest.fn().mockResolvedValue('channel-id'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
  },
  TriggerType: { TIMESTAMP: 0 },
  AlarmType: { SET_ALARM_CLOCK: 4 },
  AndroidImportance: { HIGH: 4 },
  AndroidVisibility: { PUBLIC: 1, PRIVATE: 0 },
  AndroidCategory: { ALARM: 4, REMINDER: 5 },
  AndroidStyle: { BIGTEXT: 1 },
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
  scheduleMedicineNotification,
  scheduleSnoozeNotification,
  scheduleTestAlarmNotification,
} from '../../utils/notifications/schedule';
import { resolveNotificationBehavior } from '../../utils/notifications/behavior';
import { createDefaultUserSettings } from '../../utils/defaultSettings';
import type { Medicine, ReminderTime } from '../../types';

const medicine = {
  id: 'med-1',
  name: 'Aspirin',
  dosage: '500mg',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  color: '#FF6B6B',
  frequency: 2,
  startDate: '2024-01-01',
} as unknown as Medicine;

const reminderTime = {
  id: 'rt-1',
  medicineId: 'med-1',
  time: '23:59',
  isEnabled: true,
} as unknown as ReminderTime;

const lastNotificationConfig = () =>
  (notifee.createTriggerNotification as jest.Mock).mock.calls.slice(-1)[0][0];

describe('tam ekran alarm toggle kapısı', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveNotificationBehavior', () => {
    it('toggle açıkken alarm kanalı ve fullScreenAlarm=true', () => {
      const behavior = resolveNotificationBehavior(
        medicine,
        createDefaultUserSettings({ fullScreenAlarmEnabled: true, alarmModeEnabled: true })
      );

      expect(behavior.fullScreenAlarm).toBe(true);
      expect(behavior.fullScreenAlarmSettingEnabled).toBe(true);
      expect(behavior.useAlarmChannel).toBe(true);
      expect(behavior.channelId).toMatch(/^medicine-alarms-/);
    });

    it('toggle kapalıyken bypassDnd’li alarm kanalı KULLANILMAZ', () => {
      const behavior = resolveNotificationBehavior(
        medicine,
        createDefaultUserSettings({ fullScreenAlarmEnabled: false, alarmModeEnabled: true })
      );

      expect(behavior.fullScreenAlarm).toBe(false);
      expect(behavior.fullScreenAlarmSettingEnabled).toBe(false);
      expect(behavior.useAlarmChannel).toBe(false);
      expect(behavior.channelId).toMatch(/^medicine-reminders-/);
    });

    it('sessiz saatler kanal seçimini DEĞİŞTİRMEZ, yalnızca tam ekranı düşürür', () => {
      const behavior = resolveNotificationBehavior(
        medicine,
        createDefaultUserSettings({
          fullScreenAlarmEnabled: true,
          alarmModeEnabled: true,
          quietHoursEnabled: true,
          quietHoursStart: '00:00',
          quietHoursEnd: '23:59',
        })
      );

      expect(behavior.quietHoursActive).toBe(true);
      expect(behavior.fullScreenAlarm).toBe(false);
      expect(behavior.fullScreenAlarmSettingEnabled).toBe(true);
      expect(behavior.useAlarmChannel).toBe(true);
    });
  });

  describe('scheduleMedicineNotification', () => {
    it('toggle AÇIKKEN native alarm kurulur', async () => {
      await scheduleMedicineNotification(
        medicine,
        reminderTime,
        createDefaultUserSettings({ fullScreenAlarmEnabled: true }),
        true
      );

      expect(mockScheduleNativeAlarm).toHaveBeenCalledTimes(1);
      expect(lastNotificationConfig().android.fullScreenAction).toBeDefined();
      expect(lastNotificationConfig().data.fullScreenAlarm).toBe('true');
    });

    it('toggle KAPALIYKEN native alarm KURULMAZ ama bildirim yine gönderilir', async () => {
      await scheduleMedicineNotification(
        medicine,
        reminderTime,
        createDefaultUserSettings({ fullScreenAlarmEnabled: false }),
        true
      );

      expect(mockScheduleNativeAlarm).not.toHaveBeenCalled();
      // Hatırlatma normal bildirim olarak gönderilmeye DEVAM eder.
      expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);

      const config = lastNotificationConfig();
      expect(config.android.fullScreenAction).toBeUndefined();
      expect(config.android.loopSound).toBe(false);
      expect(config.android.ongoing).toBe(false);
      expect(config.android.autoCancel).toBe(true);
      expect(config.data.fullScreenAlarm).toBe('false');
      expect(config.android.channelId).toMatch(/^medicine-reminders-/);
    });

    it('sessiz saatler aktifken de native alarm KURULMAZ', async () => {
      await scheduleMedicineNotification(
        medicine,
        reminderTime,
        createDefaultUserSettings({
          fullScreenAlarmEnabled: true,
          quietHoursEnabled: true,
          // Hatirlatma saati 23:59 → bu pencerenin ICINDE.
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        }),
        true
      );

      expect(mockScheduleNativeAlarm).not.toHaveBeenCalled();
    });
  });

  describe('scheduleSnoozeNotification', () => {
    const snoozeParams = {
      medicine,
      reminderTime,
      snoozeId: 'snooze-1',
      originalScheduledTime: '2026-01-01T08:00:00Z',
      snoozeCount: 1,
    };

    it('toggle AÇIKKEN snooze için native alarm kurulur', async () => {
      await scheduleSnoozeNotification({
        ...snoozeParams,
        settings: createDefaultUserSettings({ fullScreenAlarmEnabled: true }),
      });

      expect(mockScheduleNativeAlarm).toHaveBeenCalledTimes(1);
    });

    it('toggle KAPALIYKEN snooze için native alarm KURULMAZ', async () => {
      await scheduleSnoozeNotification({
        ...snoozeParams,
        settings: createDefaultUserSettings({ fullScreenAlarmEnabled: false }),
      });

      expect(mockScheduleNativeAlarm).not.toHaveBeenCalled();
      expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('scheduleTestAlarmNotification', () => {
    it('toggle KAPALIYKEN test de tam ekran açmaz (gerçeği yansıtır)', async () => {
      await scheduleTestAlarmNotification(
        5 / 60,
        'tr',
        createDefaultUserSettings({ fullScreenAlarmEnabled: false })
      );

      expect(mockScheduleNativeAlarm).not.toHaveBeenCalled();
      expect(lastNotificationConfig().data.fullScreenAlarm).toBe('false');
    });

    it('toggle AÇIKKEN test tam ekran alarm kurar', async () => {
      await scheduleTestAlarmNotification(
        5 / 60,
        'tr',
        createDefaultUserSettings({ fullScreenAlarmEnabled: true })
      );

      expect(mockScheduleNativeAlarm).toHaveBeenCalledTimes(1);
      expect(lastNotificationConfig().data.fullScreenAlarm).toBe('true');
    });
  });

  describe('varsayılan değer', () => {
    it('fullScreenAlarmEnabled varsayılanı AÇIK', () => {
      expect(createDefaultUserSettings().fullScreenAlarmEnabled).toBe(true);
      const behavior = resolveNotificationBehavior(medicine, createDefaultUserSettings());
      expect(behavior.fullScreenAlarm).toBe(true);
    });
  });
});
