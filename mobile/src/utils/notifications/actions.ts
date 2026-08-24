/**
 * Notifications — actions module.
 *
 * Basit notification action'ları: dismiss, send test, cancel all.
 * Sprint 3 (notifications.ts modular).
 */

import notifee, { AndroidStyle, AndroidImportance } from '@notifee/react-native';
import { createScopedLogger } from '../logger';
import { createNotificationChannels } from './channels';
import { REMINDER_CHANNEL_ID } from './channels';
import { ALARM_ACTIONS, PRESS_ACTION } from './config';

const log = createScopedLogger('NotificationActions');

/**
 * Bildirimi kapat (id'ye göre)
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  try {
    await notifee.cancelDisplayedNotification(notificationId);
  } catch (error) {
    log.error('Bildirim kapatilirken hata', error);
  }
}

/**
 * Test bildirimi gönder
 */
export async function sendTestNotification(): Promise<void> {
  // Kanal olusturuldugundan emin ol
  await createNotificationChannels();

  const title = '💊 TEST-Ibuprofen (100mg)';
  const subtitle = 'İlaç Vakti';
  const body = 'Yemekle Birlikte • 100mg almanın zamanı geldi.\n📦 Kalan Stok: 18 adet';

  await notifee.displayNotification({
    id: 'alarm-test-medicine-test-reminder',
    title,
    subtitle,
    body,
    android: {
      channelId: REMINDER_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_notification',
      largeIcon: 'ic_launcher',
      color: '#0D9488',
      colorized: true,
      pressAction: PRESS_ACTION,
      actions: ALARM_ACTIONS,
      style: {
        type: AndroidStyle?.BIGTEXT ?? 1,
        text: body,
        title,
        summary: subtitle,
      },
    },
    data: {
      medicineId: 'test-medicine',
      reminderTimeId: 'test-reminder',
      scheduledTime: new Date().toISOString(),
      fullScreenAlarm: 'false',
      isTestAlarm: 'true',
    },
  });
}

/**
 * Tüm notification'ları iptal et
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await notifee.cancelAllNotifications();
    log.debug('Tum bildirimler iptal edildi');
  } catch (error) {
    log.error('Tum bildirimler iptal edilirken hata', error);
  }
}
