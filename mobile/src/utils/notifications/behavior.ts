/**
 * Notifications — behavior module.
 *
 * Notification davranis resolver: settings, channel secimi, vibration.
 * Sprint 3 (notifications.ts modular).
 */

import { createScopedLogger } from '../logger';
import { createDefaultUserSettings } from '../defaultSettings';
import { isInQuietHours } from './time';
import { getVibrationPattern } from './vibration';
import {
  ALARM_CHANNEL_ID,
  ALARM_NO_VIBRATION_CHANNEL_ID,
  REMINDER_CHANNEL_ID,
  REMINDER_NO_VIBRATION_CHANNEL_ID,
} from './channels';
import type { Medicine, UserSettings } from '../../types';

const log = createScopedLogger('NotificationBehavior');

export type NotificationSettingsInput = UserSettings | boolean | undefined;

export interface ResolvedNotificationBehavior {
  settings: UserSettings;
  channelId: string;
  fullScreenAlarm: boolean;
  vibrationEnabled: boolean;
  useAlarmChannel: boolean;
  quietHoursActive: boolean;
  sound: 'alarm' | 'default';
  vibrationPattern?: number[];
}

/**
 * Settings'i normalize et: boolean -> fullScreenAlarmEnabled toggle,
 * undefined -> default, object -> partial override.
 */
export function resolveNotificationSettings(
  settingsOrFlag?: NotificationSettingsInput
): UserSettings {
  if (typeof settingsOrFlag === 'boolean') {
    return createDefaultUserSettings({ fullScreenAlarmEnabled: settingsOrFlag });
  }
  return createDefaultUserSettings(settingsOrFlag ?? {});
}

/**
 * Medicine icin bildirim davranisini hesapla: channel, full-screen,
 * vibration, sound. Quiet hours + vibration pattern dahil.
 */
export function resolveNotificationBehavior(
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
