/**
 * Notifications — schedule module.
 *
 * Notification zamanlama operasyonlari: expiry reminder.
 * Sprint 3 (notifications.ts modular).
 */

import notifee, { TriggerType, TimestampTrigger, AndroidImportance } from '@notifee/react-native';
import { createScopedLogger } from '../logger';
import { REMINDER_CHANNEL_ID } from './channels';
import { PRESS_ACTION } from './config';
import { cancelNotification } from './cancel';
import type { Medicine } from '../../types';

const log = createScopedLogger('NotificationSchedule');

/**
 * Son kullanma tarihi hatirlatma bildirimi planla
 */
export async function scheduleExpiryReminder(
  medicine: Medicine,
  expiryDate: string,
  reminderDays: number,
  language: 'tr' | 'en' = 'tr'
): Promise<string | null> {
  try {
    const expiry = new Date(expiryDate);
    const reminderDate = new Date(expiry);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);

    // Bildirim zamani sabah 10:00
    reminderDate.setHours(10, 0, 0, 0);

    // Gecmis tarih kontrolu
    if (reminderDate <= new Date()) {
      log.debug('Son kullanma hatirlatma tarihi gecmis, planlanmadi', {
        medicineName: medicine.name,
        reminderDate: reminderDate.toISOString(),
      });
      return null;
    }

    const notificationId = `expiry-${medicine.id}`;

    // Mevcut bildirimi iptal et
    await cancelNotification(notificationId);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: reminderDate.getTime(),
      alarmManager: {
        allowWhileIdle: true,
      },
    };

    const title =
      language === 'tr'
        ? `⚠️ ${medicine.name} - Son Kullanma Tarihi Yaklaşıyor`
        : `⚠️ ${medicine.name} - Expiry Date Approaching`;

    const body =
      language === 'tr'
        ? `${medicine.name} ilacınızın son kullanma tarihine ${reminderDays} gün kaldı.`
        : `${medicine.name} will expire in ${reminderDays} days.`;

    await notifee.createTriggerNotification(
      {
        id: notificationId,
        title,
        body,
        android: {
          channelId: REMINDER_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: PRESS_ACTION,
          smallIcon: 'ic_launcher',
          color: '#FF6B6B',
        },
        data: {
          medicineId: medicine.id,
          type: 'expiry_reminder',
        },
      },
      trigger
    );

    log.debug('Son kullanma hatirlatmasi planlandi', {
      medicineName: medicine.name,
      reminderDate: reminderDate.toISOString(),
      notificationId,
    });

    return notificationId;
  } catch (error) {
    log.error('Son kullanma hatirlatmasi planlanirken hata', error);
    return null;
  }
}

/**
 * Son kullanma tarihi bildirimini iptal et
 */
export async function cancelExpiryReminder(medicineId: string): Promise<void> {
  try {
    await cancelNotification(`expiry-${medicineId}`);
    log.debug('Son kullanma hatirlatmasi iptal edildi', { medicineId });
  } catch (error) {
    log.error('Son kullanma hatirlatmasi iptal edilirken hata', error);
  }
}
