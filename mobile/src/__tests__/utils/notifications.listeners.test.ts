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
  let foregroundHandler: (event: unknown) => Promise<void>;

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

  // ─── ALARM ZINCIRI (on plan) ───
  // Regresyon: notifee her olayi TEK isleyiciye yonlendirir. Uygulama on
  // plandayken onBackgroundEvent tetiklenmez, dolayisiyla zinciri devam
  // ettiren cagri burada da yapilmali. Eksikken alarm uygulama acikken
  // calarsa o ilac bir daha hic alarm vermiyordu.
  describe('onDelivered (alarm zinciri)', () => {
    // AsyncStorage mock'u testler arasi TEMIZLENMIYOR ve getAlarmKey sabit
    // 'test-alarm-key' donuyor. Onceki 'skips already-handled' testinin
    // yazdigi kayit kalirsa buradaki alarmlar "zaten islendi" sayilip erken
    // donuyor. Bu yuzden her testte temizle.
    beforeEach(async () => {
      await AsyncStorage.clear();
    });

    const deliver = (data: Record<string, unknown>, id = 'alarm-med-1-rt-1') =>
      foregroundHandler({
        type: EventType.DELIVERED,
        detail: { notification: { id, data } },
      });

    it('DELIVERED: tam ekran alarmda zinciri devam ettirir', async () => {
      const onDelivered = jest.fn().mockResolvedValue(null);
      setupNotificationListeners(onAlarmPress, onAction, onDelivered);

      await deliver({
        fullScreenAlarm: 'true',
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T10:00:00Z',
      });

      expect(onDelivered).toHaveBeenCalledTimes(1);
      expect(onDelivered).toHaveBeenCalledWith(expect.objectContaining({ id: 'alarm-med-1-rt-1' }));
    });

    it('DELIVERED: tam ekran OLMAYAN alarmda da zinciri devam ettirir', async () => {
      // Sessiz saatlerde fullScreenAlarm 'false' olur; zincir yine kurulmali.
      const onDelivered = jest.fn().mockResolvedValue(null);
      setupNotificationListeners(onAlarmPress, onAction, onDelivered);

      await deliver({
        fullScreenAlarm: 'false',
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
      });

      expect(onDelivered).toHaveBeenCalledTimes(1);
      expect(onAlarmPress).not.toHaveBeenCalled();
    });

    it('DELIVERED: zincir hatasi alarm ekranini engellemez', async () => {
      const onDelivered = jest.fn().mockRejectedValue(new Error('reschedule failed'));
      setupNotificationListeners(onAlarmPress, onAction, onDelivered);

      await deliver({
        fullScreenAlarm: 'true',
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T10:00:00Z',
      });

      expect(onDelivered).toHaveBeenCalledTimes(1);
      expect(onAlarmPress).toHaveBeenCalled();
    });

    it('PRESS: zincir cagrilmaz (trigger tukenmedi)', async () => {
      const onDelivered = jest.fn().mockResolvedValue(null);
      setupNotificationListeners(onAlarmPress, onAction, onDelivered);

      await foregroundHandler({
        type: EventType.PRESS,
        detail: {
          notification: { id: 'alarm-med-1-rt-1', data: { medicineId: 'med-1' } },
        },
      });

      expect(onDelivered).not.toHaveBeenCalled();
    });

    it('onDelivered verilmezse eski davranis korunur', async () => {
      setupNotificationListeners(onAlarmPress, onAction);

      await expect(
        deliver({
          fullScreenAlarm: 'true',
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-06-25T10:00:00Z',
        })
      ).resolves.not.toThrow();

      expect(onAlarmPress).toHaveBeenCalled();
    });
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
