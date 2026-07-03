/**
 * notifications/listeners tests — Sprint 3 devami
 * Pure logic test (interface'ler + setup fonksiyonu behavior).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    onForegroundEvent: jest.fn(() => jest.fn()),
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
  },
  EventType: {
    DELIVERED: 'type.DELIVERED',
    PRESS: 'type.PRESS',
    ACTION_PRESS: 'type.ACTION_PRESS',
  },
}));

jest.mock('../../utils/alarmNavigation', () => ({
  getAlarmKey: () => 'test-alarm-key',
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import notifee, { EventType } from '@notifee/react-native';
import {
  setupNotificationListeners,
  type AlarmPressData,
  type NotificationData,
} from '../../utils/notifications/listeners';

describe('notifications/listeners', () => {
  let onAlarmPress: jest.Mock;
  let onAction: jest.Mock;
  let unsubscribe: jest.Mock;
  let foregroundHandler: (event: any) => Promise<void>;

  beforeEach(() => {
    jest.clearAllMocks();
    onAlarmPress = jest.fn();
    onAction = jest.fn();
    unsubscribe = jest.fn();
    (notifee.onForegroundEvent as jest.Mock).mockImplementation(handler => {
      foregroundHandler = handler;
      return unsubscribe;
    });
  });

  it('returns unsubscribe function from notifee.onForegroundEvent', () => {
    const result = setupNotificationListeners(onAlarmPress, onAction);
    expect(result).toBe(unsubscribe);
  });

  it('DELIVERED: full-screen alarm triggers onAlarmPress', async () => {
    setupNotificationListeners(onAlarmPress, onAction);

    await foregroundHandler({
      type: EventType.DELIVERED,
      detail: {
        notification: {
          id: 'notif-1',
          data: {
            fullScreenAlarm: 'true',
            medicineId: 'med-1',
            reminderTimeId: 'rt-1',
            scheduledTime: '2024-06-25T10:00:00Z',
          },
        },
      },
    });

    expect(onAlarmPress).toHaveBeenCalledWith({
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T10:00:00Z',
      originalScheduledTime: undefined,
      isSnooze: undefined,
      snoozeId: undefined,
      snoozeCount: undefined,
    });
  });

  it('DELIVERED: skips already-handled alarm', async () => {
    await AsyncStorage.setItem(
      'handled-alarms',
      JSON.stringify([{ key: 'test-alarm-key', ts: Date.now() }])
    );

    setupNotificationListeners(onAlarmPress, onAction);

    await foregroundHandler({
      type: EventType.DELIVERED,
      detail: {
        notification: {
          id: 'notif-1',
          data: {
            fullScreenAlarm: 'true',
            medicineId: 'med-1',
            reminderTimeId: 'rt-1',
            scheduledTime: '2024-06-25T10:00:00Z',
          },
        },
      },
    });

    expect(onAlarmPress).not.toHaveBeenCalled();
    expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith('notif-1');
  });

  it('DELIVERED: skips non-full-screen alarm', async () => {
    setupNotificationListeners(onAlarmPress, onAction);

    await foregroundHandler({
      type: EventType.DELIVERED,
      detail: {
        notification: {
          id: 'notif-1',
          data: { fullScreenAlarm: 'false' },
        },
      },
    });

    expect(onAlarmPress).not.toHaveBeenCalled();
  });

  it('PRESS: user tap triggers onAlarmPress', async () => {
    setupNotificationListeners(onAlarmPress, onAction);

    await foregroundHandler({
      type: EventType.PRESS,
      detail: {
        notification: {
          id: 'notif-2',
          data: {
            medicineId: 'med-2',
            reminderTimeId: 'rt-2',
            scheduledTime: '2024-06-25T11:00:00Z',
          },
        },
      },
    });

    expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith('notif-2');
    expect(onAlarmPress).toHaveBeenCalledWith({
      medicineId: 'med-2',
      reminderTimeId: 'rt-2',
      scheduledTime: '2024-06-25T11:00:00Z',
      originalScheduledTime: undefined,
      isSnooze: undefined,
      snoozeId: undefined,
      snoozeCount: undefined,
    });
  });

  it('ACTION_PRESS: triggers onAction with actionId and data', async () => {
    setupNotificationListeners(onAlarmPress, onAction);

    await foregroundHandler({
      type: EventType.ACTION_PRESS,
      detail: {
        pressAction: { id: 'snooze' },
        notification: {
          id: 'notif-3',
          data: { medicineId: 'med-3' },
        },
      },
    });

    expect(onAction).toHaveBeenCalledWith('snooze', { medicineId: 'med-3' });
  });
});

describe('NotificationData type', () => {
  it('accepts all known fields', () => {
    const data: NotificationData = {
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T10:00:00Z',
      fullScreenAlarm: 'true',
      isSnooze: 'true',
      snoozeId: 'snooze-1',
      snoozeCount: '2',
      isPersistent: 'true',
    };
    expect(data.medicineId).toBe('med-1');
    expect(data.isPersistent).toBe('true');
  });
});

describe('AlarmPressData type', () => {
  it('accepts minimal fields', () => {
    const data: AlarmPressData = {
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T10:00:00Z',
    };
    expect(data.medicineId).toBe('med-1');
  });

  it('accepts all fields', () => {
    const data: AlarmPressData = {
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T10:00:00Z',
      originalScheduledTime: '2024-06-25T09:00:00Z',
      isSnooze: 'true',
      snoozeId: 'snooze-1',
      snoozeCount: '2',
    };
    expect(data.isSnooze).toBe('true');
  });
});
