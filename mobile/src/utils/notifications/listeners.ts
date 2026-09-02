/**
 * Notifications — listeners module.
 *
 * Notifee event listener setup ve notification data interfaces.
 * Sprint 3 (notifications.ts modular).
 */

import notifee, { EventType, type Event } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../logger';
import { getAlarmKey } from '../../utils/alarmNavigation';
import { STORAGE_KEYS } from '../../constants';

const log = createScopedLogger('NotificationListeners');

/**
 * Notification data payload (notifee 'data' field)
 */
export interface NotificationData {
  medicineId?: string;
  reminderTimeId?: string;
  scheduledTime?: string;
  fullScreenAlarm?: string;
  isSnooze?: string;
  snoozeId?: string;
  snoozeCount?: string;
  isPersistent?: string;
}

/**
 * Alarm ekrani route parametreleri (AlarmPress callback signature)
 */
export interface AlarmPressData {
  medicineId: string;
  reminderTimeId: string;
  scheduledTime: string;
  originalScheduledTime?: string;
  isSnooze?: string;
  snoozeId?: string;
  snoozeCount?: string;
}

/**
 * Notifee foreground event listener'i kur.
 * DELIVERED: full-screen alarm — handled check + cancel + onAlarmPress callback
 * PRESS: user tap — cancel + onAlarmPress
 * ACTION_PRESS: snooze/take action — onAction callback
 *
 * @param onAlarmPress Alarm ekranina yonlendirilecek callback
 * @param onAction Notification action (snooze/take) callback
 * @returns Unsubscribe function (event listener cleanup)
 */
export function setupNotificationListeners(
  onAlarmPress: (data: AlarmPressData) => void,
  onAction: (actionId: string, data: NotificationData | undefined) => void
): () => void {
  return notifee.onForegroundEvent(async ({ type, detail }: Event) => {
    const { notification, pressAction } = detail;

    log.debug('Foreground event', { type, notificationId: notification?.id });

    // ─── DELIVERED ───
    if (type === EventType.DELIVERED) {
      if (notification?.data?.fullScreenAlarm === 'true' && notification?.id) {
        const medId = notification.data.medicineId as string;
        const remId = notification.data.reminderTimeId as string;
        const alarmKey = getAlarmKey(
          {
            medicineId: medId,
            reminderTimeId: remId,
            scheduledTime: notification.data.scheduledTime as string,
            isSnooze: notification.data.isSnooze as string | undefined,
            snoozeId: notification.data.snoozeId as string | undefined,
          },
          new Date()
        );

        // KRITIK: Bu alarm zaten handle edildi mi kontrol et (AsyncStorage + memory)
        const isTest = notification.data.isTestAlarm === 'true' || medId === 'test-medicine';
        let handled = false;
        if (!isTest) {
          try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.HANDLED_ALARMS);
            if (raw) {
              const arr: { key: string; ts: number }[] = JSON.parse(raw);
              handled = arr.some(a => a.key === alarmKey && Date.now() - a.ts < 5 * 60 * 1000);
            }
          } catch (_) {
            /* ignore */
          }
        }

        if (handled) {
          log.debug('Alarm already handled, skipping', { alarmKey });
          await notifee.cancelDisplayedNotification(notification.id);
          return;
        }

        log.debug('Full screen alarm - opening alarm screen');

        // pending-alarm'i temizle — checkInitialNotification ile cakismayi engelle
        try {
          await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ALARM);
        } catch (_) {
          /* ignore */
        }

        // ONCE alarm ekranina yonlendir. Bildirimi burada iptal ETMIYORUZ:
        // kilit ekranini asan tek mekanizma bu bildirimin FullScreenIntent'i ve
        // sistem onu tam bu anda kullaniyor. Iptali AlarmScreen mount edildiginde
        // (useAlarmController mount effect) yapiliyor.
        onAlarmPress({
          medicineId: medId,
          reminderTimeId: remId,
          scheduledTime: notification.data.scheduledTime as string,
          originalScheduledTime: notification.data.originalScheduledTime as string | undefined,
          isSnooze: notification.data.isSnooze as string | undefined,
          snoozeId: notification.data.snoozeId as string | undefined,
          snoozeCount: notification.data.snoozeCount as string | undefined,
        });
      }
    }

    // ─── PRESS ───
    if (type === EventType.PRESS) {
      if (notification?.data) {
        onAlarmPress({
          medicineId: notification.data.medicineId as string,
          reminderTimeId: notification.data.reminderTimeId as string,
          scheduledTime: notification.data.scheduledTime as string,
          originalScheduledTime: notification.data.originalScheduledTime as string | undefined,
          isSnooze: notification.data.isSnooze as string | undefined,
          snoozeId: notification.data.snoozeId as string | undefined,
          snoozeCount: notification.data.snoozeCount as string | undefined,
        });
      }
      // Yonlendirmeden SONRA iptal et.
      if (notification?.id) {
        await notifee.cancelDisplayedNotification(notification.id);
      }
    }

    // ─── ACTION_PRESS ───
    if (type === EventType.ACTION_PRESS && pressAction) {
      const medId = notification?.data?.medicineId as string;
      const remId = notification?.data?.reminderTimeId as string;

      if (notification?.id) {
        await notifee.cancelDisplayedNotification?.(notification.id)?.catch?.(() => undefined);
        await notifee.cancelNotification?.(notification.id)?.catch?.(() => undefined);
      }
      if (medId && remId) {
        const alarmId = `alarm-${medId}-${remId}`;
        await notifee.cancelDisplayedNotification?.(alarmId)?.catch?.(() => undefined);
        await notifee.cancelNotification?.(alarmId)?.catch?.(() => undefined);
      }

      try {
        const displayed = (await notifee.getDisplayedNotifications?.()) || [];
        for (const d of displayed) {
          if (d.id === notification?.id || (medId && d.notification?.data?.medicineId === medId)) {
            if (d.id) await notifee.cancelDisplayedNotification?.(d.id)?.catch?.(() => undefined);
          }
        }
      } catch (_e) {
        /* ignore */
      }

      // `notificationId` notifee'nin `NotificationData` tipinde tanimli degil
      // ama action handler'lar bildirimi iptal edebilmek icin buna ihtiyac
      // duyuyor; veri sozlugu calisma zamaninda serbest bicimli.
      onAction(pressAction.id, {
        ...(notification?.data || {}),
        notificationId: notification?.id,
      } as Record<string, unknown>);
    }
  });
}
