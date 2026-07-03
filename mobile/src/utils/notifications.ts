import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  TriggerType,
  TimestampTrigger,
  AlarmType,
} from '@notifee/react-native';

// Sprint 3 (notifications.ts modular): id helper'lari ./notifications/ids'e tasindi.
// Internal kullanim icin ayrica import ediyoruz (re-export ile ayni path degil).

// Sprint 3: permission fonksiyonlari ./notifications/permissions'a tasindi.
// Internal kullanim icin import.
import { requestNotificationPermissions } from './notifications/permissions';

// Sprint 3: time helpers ./notifications/time'a tasindi.

// Sprint 3: cancel modülüne tasindi.

// Sprint 3: vibration helpers ./notifications/vibration'a tasindi.

// PowerManagerInfo type (notifee'den dogrudan export edilmiyor)
interface PowerManagerInfo {
  manufacturer?: string;
  activity?: string | null;
}
import { Medicine, ReminderTime, UserSettings } from '../types';
import { createScopedLogger } from './logger';
import { isMIUIDevice, getMIUIInstructions, openMIUIAutoStartSettings } from './miuiHelper';
import { recordDiagnosticEvent } from './diagnosticTelemetry';

// Re-export channel sabitleri (geriye uyumluluk için) — Sprint 3'te
// notifications/channels.ts modülüne tasindi. Import edip yeniden export
// ediyoruz ki dosya icinde de kullanilabilir olsun.
import {
  CHANNEL_VERSION,
  ALARM_CHANNEL_ID,
  ALARM_NO_VIBRATION_CHANNEL_ID,
  REMINDER_CHANNEL_ID,
  REMINDER_NO_VIBRATION_CHANNEL_ID,
  createNotificationChannels,
} from './notifications/channels';
export {
  CHANNEL_VERSION,
  ALARM_CHANNEL_ID,
  ALARM_NO_VIBRATION_CHANNEL_ID,
  REMINDER_CHANNEL_ID,
  REMINDER_NO_VIBRATION_CHANNEL_ID,
  createNotificationChannels,
};

const log = createScopedLogger('Notifications');

// Shared notification config
const ALARM_ACTIONS = [
  { title: '😴 Ertele', pressAction: { id: 'snooze' } },
  { title: '✅ Aldım', pressAction: { id: 'take' } },
];

const FULL_SCREEN_ACTION = {
  id: 'default',
  launchActivity: 'com.ilachatirlatici.MainActivity',
};

const PRESS_ACTION = {
  id: 'default',
  launchActivity: 'com.ilachatirlatici.MainActivity',
};

// Official Notifee docs note a 50 active timestamp-trigger ceiling on Android.
// MIUI exact/full-screen alarm flows can also under-report scheduled triggers
// when we introspect them back through Notifee, so diagnostics should avoid
// turning that platform limitation into a hard "missing trigger" failure.
const ANDROID_TRIGGER_INTROSPECTION_LIMIT = 50;

// Sprint 3 (notifications.ts modular): id helper'lari ./notifications/ids'e tasindi.
// Davranis korunuyor — mevcut import'lar (buildSnoozeNotificationId, vb.)
// notifications.ts uzerinden hala erisebilir (asagidaki re-export).
export {
  buildSnoozeNotificationId,
  buildAlarmNotificationId,
  getAlarmNotificationId,
  isAlarmNotificationId,
  isSnoozeNotificationId,
  belongsToMedicine,
  extractDisplayedMedicineId,
} from './notifications/ids';

type NotificationSettingsInput = UserSettings | boolean | undefined;

interface ResolvedNotificationBehavior {
  settings: UserSettings;
  channelId: string;
  fullScreenAlarm: boolean;
  vibrationEnabled: boolean;
  useAlarmChannel: boolean;
  quietHoursActive: boolean;
  sound: 'alarm' | 'default';
  vibrationPattern?: number[];
}

/* Sprint 3: diagnostics modulu ./notifications/diagnostics'a tasindi */
export {
  NotificationStateSnapshot,
  ExpectedNotificationSnapshot,
  ScheduledNotificationSnapshot,
  NotificationDriftReport,
  NotificationDiagnosticsSnapshot,
  ANDROID_TRIGGER_INTROSPECTION_LIMIT,
  analyzeNotificationDrift,
  getNotificationDiagnostics,
  getNotificationBehaviorSnapshot,
} from './notifications/diagnostics';
/**
 * Bildirim kanallar?n? olu?tur
 *
 * NOT: Bu fonksiyon Sprint 3'te notifications/channels.ts modülüne tasindi.
 * Geriye uyumluluk icin re-export yapiyoruz — yeni import:
 *
 *   import { createNotificationChannels } from './notifications/channels';
 */

/**
 * Sprint 3 (notifications.ts modular): permission fonksiyonlari
 * ./notifications/permissions modülüne tasindi. Davranis korunuyor.
 */
export {
  getPowerManagerInfo,
  openPowerManagerSettings,
  checkAllPermissions,
  openFullScreenIntentSettings,
  requestNotificationPermissions,
  requestExactAlarmPermission,
  requestBatteryOptimizationPermission,
  openDndSettings,
  openNotificationSettings,
  type PermissionStatus,
} from './notifications/permissions';

/**
 * UCES: MIUI için AGRESİF hassas alarm zamanlama
 * 30 saniye gecikme sorununu çözmek için triple-backup + pre-wake
 */
async function scheduleExactAlarmWithBackup(
  medicine: Medicine,
  reminderTime: ReminderTime,
  triggerDate: Date,
  behavior: ResolvedNotificationBehavior
): Promise<string | null> {
  const mainId = `alarm-${medicine.id}-${reminderTime.id}`;

  const baseTime = triggerDate.getTime();
  const mainTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: baseTime,
    alarmManager: {
      allowWhileIdle: true,
      type: AlarmType.SET_ALARM_CLOCK,
    },
  };

  try {
    await notifee.cancelNotification(mainId);

    const timeStr = triggerDate.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const notificationId = await notifee.createTriggerNotification(
      {
        id: mainId,
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
          isMainAlarm: 'true',
        },
      },
      mainTrigger
    );

    log.debug('MIUI alarm scheduled', {
      mainId,
      baseTime: new Date(baseTime).toISOString(),
      quietHoursActive: behavior.quietHoursActive,
    });

    return notificationId;
  } catch (error) {
    log.error('Exact alarm scheduling failed', error);
    void recordDiagnosticEvent({
      scope: 'schedule',
      level: 'error',
      message: 'Exact alarm scheduling failed',
      context: {
        medicineId: medicine.id,
        reminderTimeId: reminderTime.id,
      },
    });
    return null;
  }
}

/**
 * ?la? i?in bildirim planla
 */
/**
 * Bildirim iptal et — Sprint 3: cancel modülüne tasindi.
 */

/* Sprint 3: snooze + test alarm modulleri schedule.ts'e tasindi */
export {
  scheduleMedicineNotification,
  scheduleSnoozeNotification,
  scheduleTestAlarmNotification,
  type ScheduleSnoozeParams,
} from './notifications/schedule';

export {
  cancelNotification,
  cancelMedicineNotifications,
  cleanupOrphanNotifications,
} from './notifications/cancel';

/**
 * Tüm bildirimleri iptal et — Sprint 3: actions modülüne tasindi.
 */
export {
  cancelAllNotifications,
  dismissNotification,
  sendTestNotification,
} from './notifications/actions';

/**
 * Yetim (orphan) bildirimleri temizle
 * Gecerli ilac ID'leri ile eslesmeyenleri iptal eder
 * Uygulama acilisinda cagrilmali — Sprint 3: cancel modülüne tasindi.
 */

/**
 * Görüntülenen bildirimi kapat + Test bildirimi gönder —
 * Sprint 3: actions modülüne tasindi.
 */

/**
 * Sprint 3: time helpers ./notifications/time'a tasindi.
 */
export { isInQuietHours } from './notifications/time';

/**
 * Titreşimi durdur — Sprint 3: vibration modülüne tasindi.
 */
export { stopAlarmVibration } from './notifications/vibration';

/* Sprint 3: listeners modulu */
export {
  setupNotificationListeners,
  type NotificationData,
  type AlarmPressData,
} from './notifications/listeners';
/* Sprint 3: schedule modulu */
export { scheduleExpiryReminder, cancelExpiryReminder } from './notifications/schedule';
// Expo-notifications ile uyumluluk için eski fonksiyon adları
export { requestNotificationPermissions as setupNotificationCategories };

// MIUI Helper re-exports
export { isMIUIDevice, getMIUIInstructions, openMIUIAutoStartSettings };

// Sprint 3: wake helpers ./notifications/wake'a tasindi.
export { wakeAndOpenApp, wakeScreenOnly } from './notifications/wake';

// MIUI Alarm Service helpers — Sprint 3: ./notifications/wake'a tasindi.
// export { wakeAndOpenApp, wakeScreenOnly } from './notifications/wake'; yukarida.
