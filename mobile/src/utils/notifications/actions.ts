/**
 * Notifications — actions module.
 *
 * Basit notification action'ları: dismiss, send test, cancel all.
 * Sprint 3 (notifications.ts modular).
 */

import notifee from '@notifee/react-native';
import { createScopedLogger } from '../logger';
import { createNotificationChannels } from './channels';
import { REMINDER_CHANNEL_ID } from './channels';

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

  await notifee.displayNotification({
    title: '🔔 Test Bildirimi',
    body: 'İlaç hatırlatma sistemi çalışıyor!',
    android: {
      channelId: REMINDER_CHANNEL_ID,
      smallIcon: 'ic_launcher',
      pressAction: {
        id: 'default',
      },
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
