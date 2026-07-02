import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  EventType,
  Event,
  TriggerType,
  TimestampTrigger,
  AlarmType,
} from '@notifee/react-native';
import { Platform, Vibration, NativeModules } from 'react-native';
import { STORAGE_KEYS } from '../constants';

// Sprint 3 (notifications.ts modular): id helper'lari ./notifications/ids'e tasindi.
// Internal kullanim icin ayrica import ediyoruz (re-export ile ayni path degil).
import {
  buildSnoozeNotificationId,
  getAlarmNotificationId,
  isAlarmNotificationId,
  isSnoozeNotificationId,
  belongsToMedicine,
  extractDisplayedMedicineId,
} from './notifications/ids';

// Sprint 3: permission fonksiyonlari ./notifications/permissions'a tasindi.
// Internal kullanim icin import.
import { requestNotificationPermissions } from './notifications/permissions';

// PowerManagerInfo type (notifee'den dogrudan export edilmiyor)
interface PowerManagerInfo {
  manufacturer?: string;
  activity?: string | null;
}
import { Medicine, ReminderTime, Snooze, UserSettings } from '../types';
import { addMinutes } from 'date-fns';
import { createScopedLogger } from './logger';
import { isMIUIDevice, getMIUIInstructions, openMIUIAutoStartSettings } from './miuiHelper';
import { createDefaultUserSettings } from './defaultSettings';
import { recordDiagnosticEvent } from './diagnosticTelemetry';
import { getAlarmKey } from './alarmNavigation';

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
function getVibrationPattern(pattern?: 'default' | 'heartbeat' | 'urgent' | 'soft') {
  switch (pattern) {
    case 'heartbeat':
      return [300, 150, 300, 1000, 300, 150, 300, 1000];
    case 'urgent':
      return [150, 150, 150, 150, 150, 500, 150, 150, 150, 150];
    case 'soft':
      return [1000, 2000, 1000, 2000];
    case 'default':
    default:
      return [500, 1000, 500, 1000, 500, 1000];
  }
}

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

  // Kanalın oluşturulduğundan emin ol
  await createNotificationChannels();

  // Sabit ID kullan - dismiss için gerekli
  const testMedicineId = 'test-medicine';
  const testReminderId = 'test-reminder';
  const notifId = `alarm-${testMedicineId}-${testReminderId}`;

  // Önceki test alarmını iptal et
  await notifee.cancelNotification(notifId);

  // Saat formatı
  const timeStr = scheduledTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

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
    // Minimum 5 saniye (Android kısıtlaması)
    const minSeconds = Math.max(5, seconds);
    const adjustedTime = new Date(Date.now() + minSeconds * 1000);

    // Her zaman createTriggerNotification kullan (setTimeout arka planda çalışmaz)
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

    const timeStr = triggerTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

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
    void recordDiagnosticEvent({
      scope: 'reschedule',
      level: 'error',
      message: 'Snooze scheduling failed',
      context: {
        medicineId: medicine.id,
        reminderTimeId: reminderTime.id,
        snoozeId,
      },
    });
    return null;
  }
}

/**
 * Bildirimi iptal et
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await notifee.cancelNotification(notificationId);
  } catch (error) {
    log.error('Bildirim iptal edilirken hata', error);
  }
}

/**
 * Belirli bir ilaca ait TÜM bildirimleri iptal et
 * İlaç silindiğinde çağrılmalı - phantom notification'ları engeller
 */
export async function cancelMedicineNotifications(medicineId: string): Promise<void> {
  try {
    // Tüm planlanmış (trigger) bildirimleri al
    const triggerIds = await notifee.getTriggerNotificationIds();

    // Bu ilaca ait olanları filtrele (alarm-{medicineId}-* ve snooze-{medicineId}-*)
    const medicineNotificationIds = triggerIds.filter(id => belongsToMedicine(id, medicineId));

    // Her birini iptal et
    for (const notifId of medicineNotificationIds) {
      await notifee.cancelNotification(notifId);
      log.debug('Ilac bildirimi iptal edildi', { notifId, medicineId });
    }

    // Görüntülenen bildirimleri de kontrol et
    const displayedNotifications = await notifee.getDisplayedNotifications();
    for (const notif of displayedNotifications) {
      const displayedMedicineId = extractDisplayedMedicineId(notif);
      if (
        notif.id &&
        (displayedMedicineId === medicineId || belongsToMedicine(notif.id, medicineId))
      ) {
        await notifee.cancelDisplayedNotification(notif.id);
        log.debug('Goruntulen bildirim iptal edildi', { notifId: notif.id, medicineId });
      }
    }

    log.debug('Ilaca ait tum bildirimler iptal edildi', {
      medicineId,
      cancelledCount: medicineNotificationIds.length,
    });
  } catch (error) {
    log.error('Ilac bildirimleri iptal edilirken hata', error);
  }
}

/**
 * Tüm bildirimleri iptal et
 */
export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}

/**
 * Yetim (orphan) bildirimleri temizle
 * Gecerli ilac ID'leri ile eslesmeyenleri iptal eder
 * Uygulama acilisinda cagrilmali
 */
export async function cleanupOrphanNotifications(validMedicineIds: string[]): Promise<number> {
  try {
    // Test alarmi her zaman gecerli kabul edilir
    const validIds = new Set([...validMedicineIds, 'test-medicine']);
    const validMedicineIdList = Array.from(validIds);

    // Tum planlanmis trigger'lari al
    const triggerIds = await notifee.getTriggerNotificationIds();
    let cancelledCount = 0;

    for (const triggerId of triggerIds) {
      const isKnownMedicine = validMedicineIdList.some(medicineId =>
        belongsToMedicine(triggerId, medicineId)
      );

      // Legacy snooze ID'leri medicineId içermeyebilir; yanlış pozitif silmeyi önlemek için atla.
      if (isAlarmNotificationId(triggerId) && !isKnownMedicine) {
        await notifee.cancelNotification(triggerId);
        cancelledCount++;
        log.debug('Yetim alarm bildirimi iptal edildi', { triggerId });
      } else if (isSnoozeNotificationId(triggerId) && !isKnownMedicine) {
        log.debug('MedicineId çözülemeyen snooze trigger atlandı', { triggerId });
      }
    }

    // Goruntulen bildirimleri de kontrol et
    const displayedNotifications = await notifee.getDisplayedNotifications();
    for (const notif of displayedNotifications) {
      if (!notif.id) continue;

      const medicineId = extractDisplayedMedicineId(notif);
      const isKnownMedicine =
        (medicineId && validIds.has(medicineId)) ||
        validMedicineIdList.some(validMedicineId => belongsToMedicine(notif.id, validMedicineId));

      if (
        (isAlarmNotificationId(notif.id) || isSnoozeNotificationId(notif.id)) &&
        !isKnownMedicine
      ) {
        await notifee.cancelDisplayedNotification(notif.id);
        cancelledCount++;
        log.debug('Goruntulen yetim bildirim iptal edildi', { notifId: notif.id, medicineId });
      }
    }

    if (cancelledCount > 0) {
      log.debug('Yetim bildirim temizligi tamamlandi', {
        cancelledCount,
        validMedicineCount: validMedicineIds.length,
      });
    }

    return cancelledCount;
  } catch (error) {
    log.error('Yetim bildirim temizligi sirasinda hata', error);
    return 0;
  }
}

/**
 * Görüntülenen bildirimi kapat
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
  // Kanal oluşturulduğundan emin ol
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
 * Gece modu kontrolü
 */
export function isInQuietHours(settings: UserSettings, referenceDate: Date = new Date()): boolean {
  if (!settings.quietHoursEnabled) {
    return false;
  }

  const currentHour = referenceDate.getHours();
  const currentMinute = referenceDate.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = settings.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (startTime == endTime) {
    return false;
  }

  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

/**
 * Titreşimi durdur
 */
export function stopAlarmVibration(): void {
  try {
    Vibration.cancel?.();
  } catch (error) {
    log.debug('Titreşim durdurma native bridge olmadan atlandi', error);
  }
}

/**
 * Notifee event listener'ı kur
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

export interface AlarmPressData {
  medicineId: string;
  reminderTimeId: string;
  scheduledTime: string;
  originalScheduledTime?: string;
  isSnooze?: string;
  snoozeId?: string;
  snoozeCount?: string;
}

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

        // KRİTİK: Bu alarm zaten handle edildi mi kontrol et (AsyncStorage + memory)
        let handled = false;
        try {
          const AsyncStorageModule = require('@react-native-async-storage/async-storage').default;
          const raw = await AsyncStorageModule.getItem(STORAGE_KEYS.HANDLED_ALARMS);
          if (raw) {
            const arr: { key: string; ts: number }[] = JSON.parse(raw);
            handled = arr.some(a => a.key === alarmKey && Date.now() - a.ts < 5 * 60 * 1000);
          }
          // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (_e) {
          /* ignore */
        }

        if (handled) {
          log.debug('Alarm already handled, skipping', { alarmKey });
          await notifee.cancelDisplayedNotification(notification.id);
          return;
        }

        log.debug('Full screen alarm - opening alarm screen');
        await notifee.cancelDisplayedNotification(notification.id);

        // pending-alarm'ı temizle — checkInitialNotification ile çakışmayı engelle
        try {
          const AsyncStorageModule = require('@react-native-async-storage/async-storage').default;
          await AsyncStorageModule.removeItem(STORAGE_KEYS.PENDING_ALARM);
          // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (_e) {
          /* ignore */
        }

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
      if (notification?.id) {
        await notifee.cancelDisplayedNotification(notification.id);
      }
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
    }

    // ─── ACTION_PRESS ───
    if (type === EventType.ACTION_PRESS && pressAction) {
      onAction(pressAction.id, notification?.data);
    }
  });
}

/**
 * Son kullanma tarihi hatırlatma bildirimi planla
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

    // Bildirim zamanı sabah 10:00
    reminderDate.setHours(10, 0, 0, 0);

    // Geçmiş tarih kontrolü
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

// Expo-notifications ile uyumluluk için eski fonksiyon adları
export { requestNotificationPermissions as setupNotificationCategories };

// MIUI Helper re-exports
export { isMIUIDevice, getMIUIInstructions, openMIUIAutoStartSettings };

// MIUI Alarm Service helpers
export async function wakeAndOpenApp(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const { AlarmModule } = NativeModules;
    if (AlarmModule) {
      await AlarmModule.wakeAndOpenApp();
      log.debug('AlarmModule: Screen woken + app opened');
      return true;
    }
  } catch (error) {
    log.error('AlarmModule: wakeAndOpenApp failed', error);
  }
  return false;
}

/**
 * Sadece ekranı aç (FullScreenIntent izni olmayan cihazlar için fallback)
 */
export async function wakeScreenOnly(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const { AlarmModule } = NativeModules;
    if (AlarmModule) {
      await AlarmModule.wakeScreenOnly();
      log.debug('AlarmModule: Screen woken only');
      return true;
    }
  } catch (error) {
    log.error('AlarmModule: wakeScreenOnly failed', error);
  }
  return false;
}
