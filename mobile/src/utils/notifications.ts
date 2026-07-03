import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  TriggerType,
  TimestampTrigger,
  AlarmType,
} from '@notifee/react-native';
import { Platform } from 'react-native';

// Sprint 3 (notifications.ts modular): id helper'lari ./notifications/ids'e tasindi.
// Internal kullanim icin ayrica import ediyoruz (re-export ile ayni path degil).
import {
  buildSnoozeNotificationId,
  getAlarmNotificationId,
  isAlarmNotificationId,
  isSnoozeNotificationId,
} from './notifications/ids';

// Sprint 3: permission fonksiyonlari ./notifications/permissions'a tasindi.
// Internal kullanim icin import.
import { requestNotificationPermissions } from './notifications/permissions';

// Sprint 3: time helpers ./notifications/time'a tasindi.
import { isInQuietHours } from './notifications/time';

// Sprint 3: cancel modülüne tasindi.
import { cancelNotification } from './notifications/cancel';

// Sprint 3: vibration helpers ./notifications/vibration'a tasindi.
import { getVibrationPattern } from './notifications/vibration';

// PowerManagerInfo type (notifee'den dogrudan export edilmiyor)
interface PowerManagerInfo {
  manufacturer?: string;
  activity?: string | null;
}
import { Medicine, ReminderTime, Snooze, UserSettings } from '../types';
import { createScopedLogger } from './logger';
import { isMIUIDevice, getMIUIInstructions, openMIUIAutoStartSettings } from './miuiHelper';
import { createDefaultUserSettings } from './defaultSettings';
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

export interface NotificationStateSnapshot {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  snoozes: Snooze[];
  settings: UserSettings;
}

export interface ExpectedNotificationSnapshot {
  id: string;
  type: 'alarm' | 'snooze';
  medicineId: string;
  medicineName: string;
  reminderTimeId: string;
  reminderTime: string;
  triggerTimestamp: number;
  scheduledTime: string;
  channelId: string;
  fullScreenAlarm: boolean;
  quietHoursActive: boolean;
  storedNotificationId?: string;
}

export interface ScheduledNotificationSnapshot {
  id: string;
  type: 'alarm' | 'snooze';
  medicineId?: string;
  medicineName?: string;
  reminderTimeId?: string;
  scheduledTime?: string;
  triggerTimestamp?: number;
  channelId?: string;
  fullScreenAlarm?: boolean;
  quietHoursActive?: boolean;
  isDisplayed?: boolean;
}

export interface NotificationDriftReport {
  expectedNotifications: ExpectedNotificationSnapshot[];
  scheduledNotifications: ScheduledNotificationSnapshot[];
  missingNotificationIds: string[];
  configDriftIds: string[];
  orphanTriggerIds: string[];
  legacySnoozeNotificationIds: string[];
  hasDrift: boolean;
}

export interface NotificationDiagnosticsSnapshot {
  evaluatedAt: string;
  counts: {
    activeMedicines: number;
    enabledReminderTimes: number;
    activeSnoozes: number;
    expectedNotifications: number;
    scheduledNotifications: number;
    displayedNotifications: number;
  };
  settingsSummary: {
    alarmModeEnabled: boolean;
    vibrationEnabled: boolean;
    fullScreenAlarmEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    snoozeDuration: number;
    maxSnoozeCount: number;
  };
  report: NotificationDriftReport;
}

function resolveNotificationSettings(settingsOrFlag?: NotificationSettingsInput): UserSettings {
  if (typeof settingsOrFlag === 'boolean') {
    return createDefaultUserSettings({ fullScreenAlarmEnabled: settingsOrFlag });
  }

  return createDefaultUserSettings(settingsOrFlag ?? {});
}

function resolveNotificationBehavior(
  medicine: Medicine,
  settingsOrFlag?: NotificationSettingsInput,
  referenceDate: Date = new Date()
): ResolvedNotificationBehavior {
  const settings = resolveNotificationSettings(settingsOrFlag);
  const quietHoursActive = isInQuietHours(settings, referenceDate);
  const fullScreenAlarm = settings.fullScreenAlarmEnabled && !quietHoursActive;
  const vibrationEnabled = settings.vibrationEnabled;
  const useAlarmChannel = settings.alarmModeEnabled;

  const channelId = useAlarmChannel
    ? vibrationEnabled
      ? ALARM_CHANNEL_ID
      : ALARM_NO_VIBRATION_CHANNEL_ID
    : vibrationEnabled
      ? REMINDER_CHANNEL_ID
      : REMINDER_NO_VIBRATION_CHANNEL_ID;

  return {
    settings,
    channelId,
    fullScreenAlarm,
    vibrationEnabled,
    useAlarmChannel,
    quietHoursActive,
    sound: useAlarmChannel ? 'alarm' : 'default',
    vibrationPattern: vibrationEnabled ? getVibrationPattern(medicine.vibrationPattern) : undefined,
  };
}

export function getNotificationBehaviorSnapshot(
  medicine: Medicine,
  settingsOrFlag?: NotificationSettingsInput,
  referenceDate: Date = new Date()
): Pick<
  ResolvedNotificationBehavior,
  'channelId' | 'fullScreenAlarm' | 'quietHoursActive' | 'sound' | 'vibrationEnabled'
> {
  const behavior = resolveNotificationBehavior(medicine, settingsOrFlag, referenceDate);

  return {
    channelId: behavior.channelId,
    fullScreenAlarm: behavior.fullScreenAlarm,
    quietHoursActive: behavior.quietHoursActive,
    sound: behavior.sound,
    vibrationEnabled: behavior.vibrationEnabled,
  };
}

function calculateReminderTriggerDate(
  reminderTime: ReminderTime,
  bypassBuffer: boolean = false,
  referenceNow: Date = new Date()
): Date {
  const [hours, minutes] = reminderTime.time.split(':').map(Number);
  const triggerDate = new Date(referenceNow);
  triggerDate.setHours(hours, minutes, 0, 0);

  if (bypassBuffer) {
    const pastThreshold = new Date(referenceNow.getTime() - 60 * 1000);
    if (triggerDate <= pastThreshold) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
  } else {
    const bufferMs = 2 * 60 * 1000;
    if (triggerDate.getTime() <= referenceNow.getTime() + bufferMs) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
  }

  return triggerDate;
}

function resolveSmokeTriggerDate(
  reminderTime: ReminderTime,
  referenceNow: Date = new Date()
): Date | null {
  if (!reminderTime.smokeTriggerTime) {
    return null;
  }

  const triggerDate = new Date(reminderTime.smokeTriggerTime);
  if (Number.isNaN(triggerDate.getTime())) {
    return null;
  }

  return triggerDate.getTime() > referenceNow.getTime() ? triggerDate : null;
}

function resolveReminderTriggerDate(
  reminderTime: ReminderTime,
  bypassBuffer: boolean = false,
  referenceNow: Date = new Date()
): Date {
  return (
    resolveSmokeTriggerDate(reminderTime, referenceNow) ??
    calculateReminderTriggerDate(reminderTime, bypassBuffer, referenceNow)
  );
}

function normalizeBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  return undefined;
}

function extractNotificationId(record: unknown): string | undefined {
  if (!record || typeof record !== 'object') return undefined;

  const topLevel = record as { id?: unknown; notification?: { id?: unknown } };
  if (typeof topLevel.id === 'string') {
    return topLevel.id;
  }

  return typeof topLevel.notification?.id === 'string' ? topLevel.notification.id : undefined;
}

function normalizeScheduledNotification(raw: unknown): ScheduledNotificationSnapshot | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as {
    notification?: {
      id?: string;
      data?: Record<string, unknown>;
      android?: { channelId?: string; fullScreenAction?: unknown };
    };
    trigger?: { timestamp?: number };
  };

  const id = candidate.notification?.id;
  if (!id) {
    return null;
  }

  const data = candidate.notification?.data ?? {};
  const fullScreenFromData = normalizeBooleanFlag(data.fullScreenAlarm);
  const fullScreenAlarm = fullScreenFromData ?? !!candidate.notification?.android?.fullScreenAction;

  return {
    id,
    type: id.startsWith('snooze-') ? 'snooze' : 'alarm',
    medicineId: typeof data.medicineId === 'string' ? data.medicineId : undefined,
    reminderTimeId: typeof data.reminderTimeId === 'string' ? data.reminderTimeId : undefined,
    scheduledTime: typeof data.scheduledTime === 'string' ? data.scheduledTime : undefined,
    triggerTimestamp:
      typeof candidate.trigger?.timestamp === 'number' ? candidate.trigger.timestamp : undefined,
    channelId: candidate.notification?.android?.channelId,
    fullScreenAlarm,
    quietHoursActive: normalizeBooleanFlag(data.quietHoursActive),
  };
}

function isNotificationConfigDrifted(
  expected: ExpectedNotificationSnapshot,
  scheduled: ScheduledNotificationSnapshot
): boolean {
  if (scheduled.channelId && scheduled.channelId !== expected.channelId) {
    return true;
  }

  if (
    scheduled.fullScreenAlarm !== undefined &&
    scheduled.fullScreenAlarm !== expected.fullScreenAlarm
  ) {
    return true;
  }

  if (
    scheduled.quietHoursActive !== undefined &&
    scheduled.quietHoursActive !== expected.quietHoursActive
  ) {
    return true;
  }

  if (
    scheduled.triggerTimestamp !== undefined &&
    Math.abs(scheduled.triggerTimestamp - expected.triggerTimestamp) > 1000
  ) {
    return true;
  }

  return false;
}

function buildExpectedNotifications(
  state: NotificationStateSnapshot,
  referenceNow: Date = new Date()
): ExpectedNotificationSnapshot[] {
  const activeMedicines = new Map(
    state.medicines.filter(medicine => medicine.isActive).map(medicine => [medicine.id, medicine])
  );

  const expectedReminderNotifications = state.reminderTimes
    .filter(reminderTime => reminderTime.isEnabled && activeMedicines.has(reminderTime.medicineId))
    .map(reminderTime => {
      const medicine = activeMedicines.get(reminderTime.medicineId)!;
      const triggerDate = resolveReminderTriggerDate(reminderTime, false, referenceNow);
      const behavior = resolveNotificationBehavior(medicine, state.settings, triggerDate);

      return {
        id: getAlarmNotificationId(medicine.id, reminderTime.id),
        type: 'alarm' as const,
        medicineId: medicine.id,
        medicineName: medicine.name,
        reminderTimeId: reminderTime.id,
        reminderTime: reminderTime.time,
        triggerTimestamp: triggerDate.getTime(),
        scheduledTime: triggerDate.toISOString(),
        channelId: behavior.channelId,
        fullScreenAlarm: behavior.fullScreenAlarm,
        quietHoursActive: behavior.quietHoursActive,
      };
    });

  const expectedSnoozeNotifications = state.snoozes
    .filter(snooze => snooze.isActive)
    .flatMap(snooze => {
      const medicine = activeMedicines.get(snooze.medicineId);
      const reminderTime = state.reminderTimes.find(
        item => item.id === snooze.reminderTimeId && item.isEnabled
      );

      if (!medicine || !reminderTime) {
        return [];
      }

      const triggerDate = new Date(snooze.triggerTime);
      if (triggerDate <= referenceNow) {
        return [];
      }

      const behavior = resolveNotificationBehavior(medicine, state.settings, triggerDate);

      return [
        {
          id: buildSnoozeNotificationId(medicine.id, reminderTime.id, snooze.id),
          type: 'snooze' as const,
          medicineId: medicine.id,
          medicineName: medicine.name,
          reminderTimeId: reminderTime.id,
          reminderTime: reminderTime.time,
          triggerTimestamp: triggerDate.getTime(),
          scheduledTime: triggerDate.toISOString(),
          channelId: behavior.channelId,
          fullScreenAlarm: behavior.fullScreenAlarm,
          quietHoursActive: behavior.quietHoursActive,
          storedNotificationId: snooze.notificationId,
        },
      ];
    });

  return [...expectedReminderNotifications, ...expectedSnoozeNotifications];
}

export async function analyzeNotificationDrift(
  state: NotificationStateSnapshot,
  referenceNow: Date = new Date()
): Promise<NotificationDriftReport> {
  const expectedNotifications = buildExpectedNotifications(state, referenceNow);

  const scheduledNotificationsById = new Map<string, ScheduledNotificationSnapshot>();

  try {
    const triggerNotifications = await notifee.getTriggerNotifications();
    const detailedNotifications = triggerNotifications
      .map(normalizeScheduledNotification)
      .filter((item): item is ScheduledNotificationSnapshot => item !== null);

    detailedNotifications.forEach(notification => {
      scheduledNotificationsById.set(notification.id, notification);
    });
  } catch (error) {
    log.debug('Trigger notifications detayli okunamadi, ID listesine dusuluyor', error);
  }

  try {
    const triggerIds = await notifee.getTriggerNotificationIds();
    triggerIds.forEach(id => {
      if (!scheduledNotificationsById.has(id)) {
        scheduledNotificationsById.set(id, {
          id,
          type: id.startsWith('snooze-') ? ('snooze' as const) : ('alarm' as const),
        });
      }
    });
  } catch (error) {
    log.debug('Trigger notification ID listesi okunamadi', error);
  }

  const scheduledNotifications = Array.from(scheduledNotificationsById.values());
  const scheduledMap = new Map(
    scheduledNotifications.map(notification => [notification.id, notification])
  );
  const trackedIds = new Set(expectedNotifications.map(notification => notification.id));
  const missingNotificationIds: string[] = [];
  const configDriftIds: string[] = [];
  const legacySnoozeNotificationIds: string[] = [];

  for (const expected of expectedNotifications) {
    const legacySnoozeId =
      expected.type === 'snooze' &&
      expected.storedNotificationId &&
      expected.storedNotificationId !== expected.id
        ? expected.storedNotificationId
        : undefined;

    if (legacySnoozeId) {
      trackedIds.add(legacySnoozeId);
    }

    const matchedId = scheduledMap.has(expected.id)
      ? expected.id
      : legacySnoozeId && scheduledMap.has(legacySnoozeId)
        ? legacySnoozeId
        : undefined;

    if (!matchedId) {
      missingNotificationIds.push(expected.id);
      continue;
    }

    if (legacySnoozeId && matchedId === legacySnoozeId) {
      legacySnoozeNotificationIds.push(legacySnoozeId);
    }

    const scheduled = scheduledMap.get(matchedId);
    if (scheduled && isNotificationConfigDrifted(expected, scheduled)) {
      configDriftIds.push(expected.id);
    }
  }

  const orphanTriggerIds = scheduledNotifications
    .map(notification => notification.id)
    .filter(id => (isAlarmNotificationId(id) || isSnoozeNotificationId(id)) && !trackedIds.has(id));

  const shouldSuppressMissingTriggerDrift =
    Platform.OS === 'android' &&
    isMIUIDevice() &&
    state.settings.fullScreenAlarmEnabled &&
    expectedNotifications.length > ANDROID_TRIGGER_INTROSPECTION_LIMIT &&
    configDriftIds.length === 0 &&
    orphanTriggerIds.length === 0 &&
    legacySnoozeNotificationIds.length === 0;

  return {
    expectedNotifications,
    scheduledNotifications,
    missingNotificationIds: shouldSuppressMissingTriggerDrift ? [] : missingNotificationIds,
    configDriftIds,
    orphanTriggerIds,
    legacySnoozeNotificationIds,
    hasDrift:
      (!shouldSuppressMissingTriggerDrift && missingNotificationIds.length > 0) ||
      configDriftIds.length > 0 ||
      orphanTriggerIds.length > 0 ||
      legacySnoozeNotificationIds.length > 0,
  };
}

export async function getNotificationDiagnostics(
  state: NotificationStateSnapshot,
  referenceNow: Date = new Date()
): Promise<NotificationDiagnosticsSnapshot> {
  const report = await analyzeNotificationDrift(state, referenceNow);

  let displayedIds = new Set<string>();
  try {
    const displayedNotifications = await notifee.getDisplayedNotifications();
    displayedIds = new Set(
      displayedNotifications
        .map(notification => extractNotificationId(notification))
        .filter((id): id is string => !!id)
    );
  } catch (error) {
    log.debug('Displayed notifications okunamadi', error);
  }

  const medicineNameById = new Map(state.medicines.map(medicine => [medicine.id, medicine.name]));
  const scheduledNotifications = report.scheduledNotifications.map(notification => ({
    ...notification,
    medicineName:
      notification.medicineName ??
      (notification.medicineId ? medicineNameById.get(notification.medicineId) : undefined),
    isDisplayed: displayedIds.has(notification.id),
  }));

  const activeMedicines = state.medicines.filter(medicine => medicine.isActive).length;
  const enabledReminderTimes = state.reminderTimes.filter(
    reminderTime => reminderTime.isEnabled
  ).length;
  const activeSnoozes = state.snoozes.filter(snooze => snooze.isActive).length;

  return {
    evaluatedAt: referenceNow.toISOString(),
    counts: {
      activeMedicines,
      enabledReminderTimes,
      activeSnoozes,
      expectedNotifications: report.expectedNotifications.length,
      scheduledNotifications: scheduledNotifications.length,
      displayedNotifications: displayedIds.size,
    },
    settingsSummary: {
      alarmModeEnabled: state.settings.alarmModeEnabled,
      vibrationEnabled: state.settings.vibrationEnabled,
      fullScreenAlarmEnabled: state.settings.fullScreenAlarmEnabled,
      quietHoursEnabled: state.settings.quietHoursEnabled,
      quietHoursStart: state.settings.quietHoursStart,
      quietHoursEnd: state.settings.quietHoursEnd,
      snoozeDuration: state.settings.snoozeDuration,
      maxSnoozeCount: state.settings.maxSnoozeCount,
    },
    report: {
      ...report,
      scheduledNotifications,
    },
  };
}

/**
 * Sprint 3: getVibrationPattern ./notifications/vibration'a tasindi.
 */
export { getVibrationPattern } from './notifications/vibration';

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

    if (isMIUIDevice() && behavior.fullScreenAlarm) {
      return await scheduleExactAlarmWithBackup(medicine, reminderTime, triggerDate, behavior);
    }

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

/**
 * Bildirim iptal et — Sprint 3: cancel modülüne tasindi.
 */

/* Sprint 3: snooze + test alarm modulleri schedule.ts'e tasindi */
export {
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
