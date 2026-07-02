/**
 * Notifications — permissions module.
 *
 * Bildirim ve sistem izinleri yonetimi. Android 14+ fullScreenIntent,
 * battery optimization, DND, exact alarm gibi permission akislari.
 *
 * Sprint 3 (notifications.ts modular): notifications.ts 1709 satirdan
 * bu modulu cikardi. Ana notifications.ts barrel re-export olarak kaldi.
 */

import { Platform, Linking } from 'react-native';
import notifee, { AuthorizationStatus, AndroidNotificationSetting } from '@notifee/react-native';
import { createScopedLogger } from '../logger';
import { isMIUIDevice } from '../miuiHelper';
import { createNotificationChannels } from './channels';

const log = createScopedLogger('NotificationPermissions');

export interface PowerManagerInfo {
  manufacturer?: string;
  activity?: string | null;
}

export interface PermissionStatus {
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimization: boolean;
  dnd: boolean;
  fullScreenIntent: boolean;
  powerManagerRestricted: boolean;
  manufacturer: string | null;
  isMIUI: boolean;
}

/**
 * Power Manager bilgisi (MIUI, EMUI, ColorOS vb.)
 */
export async function getPowerManagerInfo(): Promise<PowerManagerInfo | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const info = await notifee.getPowerManagerInfo();
    log.debug('Power Manager bilgisi', {
      manufacturer: info.manufacturer,
      activity: info.activity,
    });
    return info;
  } catch (error) {
    log.error('Power Manager bilgisi alinamadi', error);
    return null;
  }
}

/**
 * Cihaza ozel power manager ayarlarini ac (MIUI autostart vb.)
 */
export async function openPowerManagerSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await notifee.openPowerManagerSettings();
    log.debug('Power Manager ayarlari acildi');
  } catch (error) {
    log.error('Power Manager ayarlari acilamadi', error);
    // Fallback: Genel pil ayarlarini ac
    await notifee.openBatteryOptimizationSettings();
  }
}

/**
 * Tum gerekli izinleri kontrol et
 */
export async function checkAllPermissions(): Promise<PermissionStatus> {
  const settings = await notifee.getNotificationSettings();

  // Android 14+ icin full screen intent izni kontrolu
  let fullScreenIntentEnabled = true;
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    const androidSettings = settings.android as { fullScreenIntent?: number };
    fullScreenIntentEnabled = androidSettings?.fullScreenIntent !== 0;
  }

  const androidSettingsWithBattery = settings.android as { batteryOptimizationStatus?: number };

  // Power Manager bilgisi (MIUI, EMUI, ColorOS vb.)
  let powerManagerRestricted = false;
  let manufacturer: string | null = null;

  if (Platform.OS === 'android') {
    try {
      const powerInfo = await notifee.getPowerManagerInfo();
      manufacturer = powerInfo.manufacturer || null;
      powerManagerRestricted = !!powerInfo.activity;
      log.debug('Power Manager durumu', {
        manufacturer,
        hasActivity: !!powerInfo.activity,
        activity: powerInfo.activity,
      });
    } catch (e) {
      log.debug('Power Manager bilgisi alinamadi');
    }
  }

  return {
    notifications: settings.authorizationStatus === AuthorizationStatus.AUTHORIZED,
    exactAlarm:
      Platform.OS === 'android'
        ? settings.android.alarm === AndroidNotificationSetting.ENABLED
        : true,
    batteryOptimization:
      Platform.OS === 'android'
        ? !androidSettingsWithBattery.batteryOptimizationStatus ||
          androidSettingsWithBattery.batteryOptimizationStatus === 1
        : true,
    dnd: true,
    fullScreenIntent: fullScreenIntentEnabled,
    powerManagerRestricted,
    manufacturer,
    isMIUI: isMIUIDevice(),
  };
}

/**
 * Full screen intent izin ayarlarini ac (Android 14+)
 */
export async function openFullScreenIntentSettings(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    try {
      await Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT');
    } catch (error) {
      // Fallback: Uygulama ayarlarini ac
      await notifee.openNotificationSettings();
    }
  }
}

/**
 * Bildirim izni iste
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    log.debug('requestNotificationPermissions cagirildi');
    const settings = await notifee.requestPermission();
    log.debug('notifee.requestPermission sonucu', {
      authorizationStatus: settings.authorizationStatus,
    });

    // Kanallari her durumda olustur
    await createNotificationChannels();
    log.debug('Kanallar olusturuldu');

    const isAuthorized =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    log.debug('Izin durumu', { isAuthorized });
    return isAuthorized;
  } catch (error) {
    log.error('requestNotificationPermissions hatasi', error);
    try {
      await createNotificationChannels();
    } catch (e) {
      log.error('Kanal olusturma hatasi', e);
    }
    return false;
  }
}

/**
 * Exact Alarm izni iste (Android 12+)
 */
export async function requestExactAlarmPermission(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.openAlarmPermissionSettings();
  }
}

/**
 * Pil optimizasyonu devre disi birakma izni iste
 */
export async function requestBatteryOptimizationPermission(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.openBatteryOptimizationSettings();
  }
}

/**
 * DND (Rahatsiz Etmeyin) izin ayarlarini ac
 */
export async function openDndSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
    } catch (error) {
      // Fallback: Genel ayarlari ac
      await Linking.openSettings();
    }
  }
}

/**
 * Uygulama bildirim ayarlarini ac
 */
export async function openNotificationSettings(): Promise<void> {
  await notifee.openNotificationSettings();
}
