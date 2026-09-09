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
import { buildAlarmTitle, buildAlarmBody } from './content';

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
  try {
    // 1. İzin kontrolü / isteği
    await notifee.requestPermission();

    // 2. Kanal oluşturulduğundan emin ol
    await createNotificationChannels();

    // v1.8.2: Test bildirimi artik GERCEK alarm metniyle ayni ureticiden
    // geliyor (content.ts). Onceden elle yazilmis bir kopyaydi ve gercek
    // bildirimden sapmisti — "test bildirimi gonder" dugmesi bu yuzden
    // gercekte gorulecek metni gostermiyordu.
    const title = `TEST-${buildAlarmTitle('Ibuprofen', '100mg')}`;
    const subtitle = 'İlaç Vakti';
    const body = buildAlarmBody({
      medicineName: 'Ibuprofen',
      dosage: '100mg',
      instructionLabel: 'Yemekle Birlikte • ',
      stockCount: 18,
      timeLabel: '09:00',
    });

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
          type: AndroidStyle.BIGTEXT,
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
    log.info('Test bildirimi basariyla gonderildi');
  } catch (error) {
    log.error('Test bildirimi gonderilirken hata olustu', error);
    throw error;
  }
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

  try {
    // v2.0.1: Native donanım RTC alarmları ve DirectBoot aynası da temizlenmeli
    const { cancelAllNativeAlarms } = await import('./nativeAlarm');
    await cancelAllNativeAlarms();
    log.debug('Tum native alarmlar ve DirectBoot aynasi iptal edildi');
  } catch (error) {
    log.error('Tum native alarmlar iptal edilirken hata', error);
  }
}
