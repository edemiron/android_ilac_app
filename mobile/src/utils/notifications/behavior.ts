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
import { getAlarmChannelId, getReminderChannelId, getSoundResourceName } from './channels';
import type { Medicine, UserSettings } from '../../types';

const _log = createScopedLogger('NotificationBehavior');

export type NotificationSettingsInput = UserSettings | Partial<UserSettings> | boolean | undefined;

export interface ResolvedNotificationBehavior {
  settings: UserSettings;
  channelId: string;
  /**
   * Bu bildirim tam ekran alarm olarak davranmalı mı?
   * = toggle açık VE sessiz saatler aktif değil.
   *
   * Bu bayrak `fullScreenAction`, `loopSound`, `ongoing` ve **native
   * AlarmManager alarmının kurulup kurulmayacağını** belirler.
   */
  fullScreenAlarm: boolean;
  /**
   * Kullanıcının "Kilit ekranında tam ekran alarm" ayarının kendisi
   * (sessiz saatlerden bağımsız). Kanal seçimi buna bağlı: kapalıyken
   * bypassDnd'li alarm kanalı KULLANILMAZ.
   */
  fullScreenAlarmSettingEnabled: boolean;
  vibrationEnabled: boolean;
  useAlarmChannel: boolean;
  quietHoursActive: boolean;
  sound: string;
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
  const fullScreenAlarmSettingEnabled = settings.fullScreenAlarmEnabled;
  const fullScreenAlarm = fullScreenAlarmSettingEnabled && !quietHoursActive;
  const vibrationEnabled = settings.vibrationEnabled;

  // KRİTİK: "Kilit ekranında tam ekran alarm" KAPALIYKEN alarm kanalı
  // kullanılmaz. Alarm kanalları `bypassDnd: true` ile oluşturuldu ve Android
  // kanal özellikleri (importance / bypassDnd / sound) oluşturulduktan sonra
  // DEĞİŞTİRİLEMEZ. Kapalı durumun tanımı "sesi ve önceliği sistem bildirim
  // ayarlarına ve Rahatsız Etmeyin durumuna tabidir" olduğu için hatırlatma
  // kanalına (bypassDnd yok) yönlendiriyoruz.
  //
  // NOT: Sessiz saatler bu seçimi ETKİLEMEZ — sessiz saatlerde yalnızca tam
  // ekran davranışı düşer, kanal davranışı korunur (mevcut davranış).
  const useAlarmChannel = settings.alarmModeEnabled && fullScreenAlarmSettingEnabled;
  const soundRes = getSoundResourceName(settings.alarmSound);

  // Kapali modda da kullanicinin sectigi melodi calsin: kanal sesi
  // degistirilemedigi icin melodiye ozel HATIRLATMA kanali kullaniyoruz.
  // Bu kanallar DND'yi delmez ve onceligi sistem ayarlarina tabidir.
  const channelId = useAlarmChannel
    ? getAlarmChannelId(settings.alarmSound, vibrationEnabled)
    : getReminderChannelId(settings.alarmSound, vibrationEnabled);

  return {
    settings,
    channelId,
    fullScreenAlarm,
    fullScreenAlarmSettingEnabled,
    vibrationEnabled,
    useAlarmChannel,
    quietHoursActive,
    sound: useAlarmChannel ? soundRes : 'sound_crystal_bell',
    vibrationPattern: vibrationEnabled ? getVibrationPattern(medicine.vibrationPattern) : undefined,
  };
}
