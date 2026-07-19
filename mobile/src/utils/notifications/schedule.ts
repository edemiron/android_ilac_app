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
import { createNotificationChannels } from './channels';
import { buildSnoozeNotificationId } from './ids';
import { resolveNotificationBehavior, type NotificationSettingsInput } from './behavior';
import { recordDiagnosticEvent } from '../diagnosticTelemetry';
import { isMIUIDevice } from '../miuiHelper';
import { resolveReminderTriggerDate } from './diagnostics';
import { getAlarmNotificationId } from './ids';
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

/**
 * Test alarm bildirimi planla
 */
export async function scheduleTestAlarmNotification(
  minutesFromNow: number,
  language: 'tr' | 'en' = 'tr',
  settingsOrFlag?: NotificationSettingsInput
): Promise<string> {
  const seconds = Math.round(minutesFromNow * 60);
  const scheduledTime = new Date(Date.now() + seconds * 1000);
  const behavior = resolveNotificationBehavior(
    {
      id: 'test-medicine',
      name: language === 'tr' ? 'Test Ilaci' : 'Test Medicine',
      dosage: '500mg',
      frequency: 1,
      color: '#2196F3',
      isActive: true,
      createdAt: scheduledTime.toISOString(),
      updatedAt: scheduledTime.toISOString(),
      startDate: scheduledTime.toISOString(),
    },
    settingsOrFlag,
    scheduledTime
  );

  log.debug('Test alarm planlaniyor', {
    currentTime: new Date().toISOString(),
    targetTime: scheduledTime.toISOString(),
    delaySeconds: seconds,
  });

  // Kanalin olusturuldugundan emin ol
  await createNotificationChannels();

  // Sabit ID kullan - dismiss icin gerekli
  const testMedicineId = 'test-medicine';
  const testReminderId = 'test-reminder';
  const notifId = `alarm-${testMedicineId}-${testReminderId}`;

  // Onceki test alarmini iptal et
  await cancelNotification(notifId);

  // Saat formati
  const timeStr = scheduledTime.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const notificationConfig = {
    id: notifId,
    title: language === 'tr' ? '💊 Test Ilaci' : '💊 Test Medicine',
    subtitle: timeStr,
    body:
      language === 'tr'
        ? `Aspirin 500mg almanin zamani!\n⏰ ${timeStr}`
        : `Time to take Aspirin 500mg!\n⏰ ${timeStr}`,
    android: {
      channelId: behavior.channelId,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PRIVATE,
      ongoing: behavior.fullScreenAlarm,
      autoCancel: !behavior.fullScreenAlarm,
      onlyAlertOnce: false,
      loopSound: behavior.fullScreenAlarm,
      fullScreenAction: behavior.fullScreenAlarm ? FULL_SCREEN_ACTION : undefined,
      pressAction: PRESS_ACTION,
      smallIcon: 'ic_launcher',
      color: '#2196F3',
      colorized: true,
      sound: behavior.sound,
      vibrationPattern: behavior.vibrationPattern,
      lights: ['#2196F3', 500, 500] as [string, number, number],
      actions: ALARM_ACTIONS,
    },
    data: {
      medicineId: testMedicineId,
      reminderTimeId: testReminderId,
      scheduledTime: scheduledTime.toISOString(),
      fullScreenAlarm: behavior.fullScreenAlarm ? 'true' : 'false',
      quietHoursActive: behavior.quietHoursActive ? 'true' : 'false',
      isTestAlarm: 'true',
    },
  };

  try {
    // Minimum 5 saniye (Android kisitlamasi)
    const minSeconds = Math.max(5, seconds);
    const adjustedTime = new Date(Date.now() + minSeconds * 1000);

    // Her zaman createTriggerNotification kullan (setTimeout arka planda calismaz)
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: adjustedTime.getTime(),
      alarmManager: {
        allowWhileIdle: true,
        type: AlarmType.SET_ALARM_CLOCK,
      },
    };

    log.debug('Trigger olusturuldu', {
      triggerType: trigger.type,
      timestamp: trigger.timestamp,
      delaySeconds: minSeconds,
    });

    const notificationId = await notifee.createTriggerNotification(notificationConfig, trigger);

    log.debug('Test alarm basariyla planlandi', { notificationId });

    // Planlanan bildirimleri kontrol et
    const triggers = await notifee.getTriggerNotificationIds();
    log.debug('Planlanan bildirim IDleri', { triggers });

    return notifId;
  } catch (error) {
    log.error('Test alarm planlama hatasi', error);
    throw error;
  }
}
export async function scheduleMedicineNotification(
  medicine: Medicine,
  reminderTime: ReminderTime,
  settingsOrFullScreen: UserSettings | boolean = true,
  bypassBuffer: boolean = false
): Promise<string | null> {
  if (!medicine?.id || !reminderTime?.id || !reminderTime?.time) {
    log.warn('scheduleMedicineNotification: Gecersiz parametre, bildirim planlanmadi', {
      hasMedicine: !!medicine,
      hasMedicineId: !!medicine?.id,
      hasReminderTime: !!reminderTime,
      hasReminderTimeId: !!reminderTime?.id,
    });
    return null;
  }

  try {
    await cancelNotification(`alarm-${medicine.id}-${reminderTime.id}`);

    const now = new Date();
    const triggerDate = resolveReminderTriggerDate(reminderTime, bypassBuffer, now);

    const behavior = resolveNotificationBehavior(medicine, settingsOrFullScreen, triggerDate);

    log.debug('Ilac bildirimi planlaniyor', {
      name: medicine.name,
      time: reminderTime.time,
      targetDate: triggerDate.toISOString(),
      isMIUI: isMIUIDevice(),
      quietHoursActive: behavior.quietHoursActive,
      fullScreenAlarm: behavior.fullScreenAlarm,
      channelId: behavior.channelId,
    });

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
      alarmManager: {
        allowWhileIdle: true,
        type: AlarmType.SET_ALARM_CLOCK,
      },
    };

    const timeStr = triggerDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const notificationId = await notifee.createTriggerNotification(
      {
        id: getAlarmNotificationId(medicine.id, reminderTime.id),
        title: `?? ${medicine.name}`,
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
          onlyAlertOnce: false,
          loopSound: behavior.fullScreenAlarm,
          fullScreenAction: behavior.fullScreenAlarm ? FULL_SCREEN_ACTION : undefined,
          pressAction: PRESS_ACTION,
          smallIcon: 'ic_launcher',
          color: '#2196F3',
          colorized: true,
          sound: behavior.sound,
          vibrationPattern: behavior.vibrationPattern,
          lights: ['#2196F3', 500, 500] as [string, number, number],
          actions: ALARM_ACTIONS,
        },
        data: {
          medicineId: medicine.id,
          reminderTimeId: reminderTime.id,
          scheduledTime: triggerDate.toISOString(),
          fullScreenAlarm: behavior.fullScreenAlarm ? 'true' : 'false',
          quietHoursActive: behavior.quietHoursActive ? 'true' : 'false',
        },
      },
      trigger
    );

    log.debug('Bildirim planlandi', {
      time: reminderTime.time,
      notificationId,
      quietHoursActive: behavior.quietHoursActive,
    });

    const triggers = await notifee.getTriggerNotificationIds();
    log.debug('Aktif trigger sayisi', { count: triggers.length });

    return notificationId;
  } catch (error) {
    log.error('Bildirim planlanirken hata', error);
    void recordDiagnosticEvent({
      scope: 'schedule',
      level: 'error',
      message: 'Medicine notification scheduling failed',
      context: {
        medicineId: medicine.id,
        reminderTimeId: reminderTime.id,
      },
    });
    return null;
  }
}

/**
 * Test alarm bildirimi planla
 */
