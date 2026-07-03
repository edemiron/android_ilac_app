/**
 * Notifications — schedule module.
 *
 * Notification zamanlama operasyonlari: expiry reminder, snooze.
 * Sprint 3 (notifications.ts modular).
 */

import notifee, {
  TriggerType,
  TimestampTrigger,
  AlarmType,
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
} from '@notifee/react-native';
import { addMinutes } from 'date-fns';
import { createScopedLogger } from '../logger';
import { REMINDER_CHANNEL_ID } from './channels';
import { ALARM_ACTIONS, FULL_SCREEN_ACTION, PRESS_ACTION } from './config';
import { cancelNotification } from './cancel';
import { buildSnoozeNotificationId } from './ids';
import { resolveNotificationBehavior } from './behavior';
import type { Medicine, ReminderTime, UserSettings } from '../../types';

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

/**
 * Erteleme (snooze) parametreleri
 */
export interface ScheduleSnoozeParams {
  medicine: Medicine;
  reminderTime: ReminderTime;
  snoozeDuration?: number;
  snoozeId: string;
  originalScheduledTime: string;
  snoozeCount: number;
  settings?: UserSettings;
  triggerTime?: Date;
}

/**
 * Erteleme bildirimi planla (kullanici "Ertele" basinca)
 */
export async function scheduleSnoozeNotification(
  params: ScheduleSnoozeParams
): Promise<{ notificationId: string; triggerTime: Date } | null> {
  const {
    medicine,
    reminderTime,
    snoozeDuration = 5,
    snoozeId,
    originalScheduledTime,
    snoozeCount,
    settings,
    triggerTime: explicitTriggerTime,
  } = params;

  try {
    const triggerTime = explicitTriggerTime ?? addMinutes(new Date(), snoozeDuration);
    const notificationId = buildSnoozeNotificationId(medicine.id, reminderTime.id, snoozeId);
    const behavior = resolveNotificationBehavior(medicine, settings, triggerTime);

    await cancelNotification(notificationId);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTime.getTime(),
      alarmManager: {
        allowWhileIdle: true,
        type: AlarmType.SET_ALARM_CLOCK,
      },
    };

    const timeStr = triggerTime.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await notifee.createTriggerNotification(
      {
        id: notificationId,
        title: `?? ${medicine.name} (Ertelendi${snoozeCount > 1 ? ` x${snoozeCount}` : ''})`,
        subtitle: timeStr,
        body: `${medicine.dosage} almanin zamani!
? ${timeStr}`,
        android: {
          channelId: behavior.channelId,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PRIVATE,
          ongoing: behavior.fullScreenAlarm,
          autoCancel: !behavior.fullScreenAlarm,
          loopSound: behavior.fullScreenAlarm,
          fullScreenAction: behavior.fullScreenAlarm ? FULL_SCREEN_ACTION : undefined,
          pressAction: PRESS_ACTION,
          smallIcon: 'ic_launcher',
          color: '#FF6B6B',
          colorized: true,
          sound: behavior.sound,
          vibrationPattern: behavior.vibrationPattern,
          lights: ['#FF0000', 500, 500] as [string, number, number],
          actions: ALARM_ACTIONS,
        },
        data: {
          medicineId: medicine.id,
          reminderTimeId: reminderTime.id,
          scheduledTime: triggerTime.toISOString(),
          originalScheduledTime,
          fullScreenAlarm: behavior.fullScreenAlarm ? 'true' : 'false',
          quietHoursActive: behavior.quietHoursActive ? 'true' : 'false',
          isSnooze: 'true',
          snoozeId,
          snoozeCount: String(snoozeCount),
        },
      },
      trigger
    );

    log.debug('Erteleme bildirimi planlandi', {
      snoozeDuration,
      notificationId,
      snoozeCount,
      quietHoursActive: behavior.quietHoursActive,
    });
    return { notificationId, triggerTime };
  } catch (error) {
    log.error('Erteleme bildirimi planlanirken hata', error);
    return null;
  }
}
