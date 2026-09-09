/**
 * Evrensel Android OEM Alarm Koruma Kalkanı Motoru (Universal OEM Alarm Shield Engine)
 *
 * Android ekosistemindeki tüm üreticilerin (Samsung One UI, Xiaomi HyperOS/MIUI,
 * Huawei EMUI, Oppo ColorOS, Vivo FuntouchOS, OnePlus OxygenOS, Google Pixel)
 * arka plan katillerini ve Doze modu kısıtlamalarını aşarak %100 alarm güvenilirliği sağlar.
 */

import { Platform, Linking, NativeModules } from 'react-native';
import notifee, { AndroidNotificationSetting, AuthorizationStatus } from '@notifee/react-native';
import { createScopedLogger } from './logger';

const log = createScopedLogger('OEMShieldEngine');

export type OEMType =
  | 'samsung'
  | 'xiaomi'
  | 'huawei'
  | 'oppo'
  | 'vivo'
  | 'oneplus'
  | 'pixel'
  | 'generic';

export interface OEMShieldStatus {
  oem: OEMType;
  manufacturer: string;
  brand: string;
  model: string;
  sdkVersion: number;
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimizationIgnored: boolean;
  fullScreenIntent: boolean;
  hasCustomOEMShield: boolean;
}

export interface OEMGuideStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  actionText: string;
  actionType: 'autostart' | 'battery' | 'popup' | 'exact_alarm' | 'notification' | 'fullscreen';
  isCritical: boolean;
}

export interface OEMShieldGuide {
  oemName: string;
  osName: string;
  summary: string;
  steps: OEMGuideStep[];
}

/**
 * Cihazın üretici markasını ve Android özelliklerini tespit eder.
 */
export async function detectOEMShieldStatus(): Promise<OEMShieldStatus> {
  if (Platform.OS !== 'android') {
    return {
      oem: 'generic',
      manufacturer: 'Apple',
      brand: 'Apple',
      model: 'iOS Device',
      sdkVersion: 0,
      notifications: true,
      exactAlarm: true,
      batteryOptimizationIgnored: true,
      fullScreenIntent: true,
      hasCustomOEMShield: false,
    };
  }

  let nativeInfo: {
    manufacturer?: string;
    brand?: string;
    model?: string;
    sdkVersion?: number;
    isIgnoringBattery?: boolean;
    canScheduleExactAlarms?: boolean;
  } = {};

  try {
    if (NativeModules?.AlarmModule?.getOEMShieldInfo) {
      nativeInfo = await NativeModules.AlarmModule.getOEMShieldInfo();
    }
  } catch (e) {
    log.debug('getOEMShieldInfo fallback', { error: e });
  }

  const platformConstants = NativeModules?.PlatformConstants || {};
  const rawManufacturer = String(
    nativeInfo.manufacturer || platformConstants.Manufacturer || ''
  ).toLowerCase();
  const rawBrand = String(nativeInfo.brand || platformConstants.Brand || '').toLowerCase();
  const model = String(nativeInfo.model || platformConstants.Model || 'Android');
  const sdkVersion = Number(nativeInfo.sdkVersion || Platform.Version || 30);

  let oem: OEMType = 'generic';
  if (rawManufacturer.includes('samsung') || rawBrand.includes('samsung')) {
    oem = 'samsung';
  } else if (
    rawManufacturer.includes('xiaomi') ||
    rawManufacturer.includes('redmi') ||
    rawManufacturer.includes('poco') ||
    rawBrand.includes('xiaomi') ||
    rawBrand.includes('redmi') ||
    rawBrand.includes('poco')
  ) {
    oem = 'xiaomi';
  } else if (rawManufacturer.includes('huawei') || rawManufacturer.includes('honor')) {
    oem = 'huawei';
  } else if (rawManufacturer.includes('oppo') || rawManufacturer.includes('realme')) {
    oem = 'oppo';
  } else if (rawManufacturer.includes('vivo') || rawManufacturer.includes('iqoo')) {
    oem = 'vivo';
  } else if (rawManufacturer.includes('oneplus')) {
    oem = 'oneplus';
  } else if (rawManufacturer.includes('google')) {
    oem = 'pixel';
  }

  // Notifee ayarlarını kontrol et
  let notificationsGranted = false;
  let exactAlarmGranted = true;
  let fullScreenIntentGranted = true;

  try {
    const settings = await notifee.getNotificationSettings();
    notificationsGranted = settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    exactAlarmGranted = settings.android.alarm === AndroidNotificationSetting.ENABLED;

    if (typeof (nativeInfo as any).canUseFullScreenIntent === 'boolean') {
      fullScreenIntentGranted = (nativeInfo as any).canUseFullScreenIntent;
    } else if (sdkVersion >= 34) {
      const androidSettings = settings.android as { fullScreenIntent?: number };
      fullScreenIntentGranted = androidSettings?.fullScreenIntent !== 0;
    }
  } catch (_e) {
    /* ignore */
  }

  let batteryOptimizationIgnored = false;
  try {
    if (NativeModules?.AlarmModule?.isIgnoringBatteryOptimizations) {
      batteryOptimizationIgnored = await NativeModules.AlarmModule.isIgnoringBatteryOptimizations();
    } else {
      const powerInfo = await notifee.getPowerManagerInfo();
      batteryOptimizationIgnored = !powerInfo.activity;
    }
  } catch (_e) {
    batteryOptimizationIgnored = false;
  }

  return {
    oem,
    manufacturer: rawManufacturer || 'android',
    brand: rawBrand || 'android',
    model,
    sdkVersion,
    notifications: notificationsGranted,
    exactAlarm: exactAlarmGranted,
    batteryOptimizationIgnored,
    fullScreenIntent: fullScreenIntentGranted,
    hasCustomOEMShield: oem !== 'generic' && oem !== 'pixel',
  };
}

/**
 * Tespit edilen üreticiye özel adım adım görsel rehber talimatlarını döndürür.
 */
export function getOEMGuide(oem: OEMType, language: string = 'tr'): OEMShieldGuide {
  const isTr = language === 'tr';

  switch (oem) {
    case 'samsung':
      return {
        oemName: 'Samsung',
        osName: 'One UI',
        summary: isTr
          ? 'Samsung One UI agresif uyku modlarını kapatarak alarmların kilit ekranında tam vaktinde çalmasını sağlayın.'
          : 'Disable aggressive Samsung One UI sleep modes to ensure on-time lockscreen alarms.',
        steps: [
          {
            id: 'samsung_battery',
            stepNumber: 1,
            title: isTr ? 'Pil Kullanımı -> Kısıtlanmamış' : 'Battery Usage -> Unrestricted',
            description: isTr
              ? 'Uygulama Bilgisi > Pil bölümünde "Kısıtlanmamış (Unrestricted)" seçeneğini işaretleyin.'
              : 'Go to App Info > Battery and select "Unrestricted".',
            actionText: isTr ? 'Pil Ayarını Aç' : 'Open Battery Settings',
            actionType: 'battery',
            isCritical: true,
          },
          {
            id: 'samsung_never_sleep',
            stepNumber: 2,
            title: isTr
              ? 'Asla Uyku Moduna Alınmayan Uygulamalar'
              : 'Never Sleeping Apps Whitelist',
            description: isTr
              ? 'Cihaz Bakımı > Pil > Arka Plan Kullanım Sınırları altındaki "Asla Uyutulmayanlar" listesine İlaç Hatırlatıcı\'yı ekleyin.'
              : 'Add Medicine Reminder to "Never sleeping apps" in Device Care > Battery.',
            actionText: isTr ? 'Cihaz Bakımını Aç' : 'Open Device Care',
            actionType: 'autostart',
            isCritical: true,
          },
        ],
      };

    case 'xiaomi':
      return {
        oemName: 'Xiaomi / Redmi / POCO',
        osName: 'HyperOS & MIUI',
        summary: isTr
          ? 'Xiaomi HyperOS & MIUI arka plan kısıtlamalarını kaldırarak alarmların ekran kapalıyken çalmasını güvenceye alın.'
          : 'Remove Xiaomi HyperOS & MIUI background restrictions for 100% reliable alarms.',
        steps: [
          {
            id: 'xiaomi_autostart',
            stepNumber: 1,
            title: isTr ? 'Otomatik Başlatma (Auto-start)' : 'Auto-start Permission',
            description: isTr
              ? 'Güvenlik > İzinler > "Otomatik Başlatma" iznini AÇIK konuma getirin.'
              : 'Enable "Auto-start" in Security > Permissions.',
            actionText: isTr ? 'Otomatik Başlatmayı Aç' : 'Open Auto-start',
            actionType: 'autostart',
            isCritical: true,
          },
          {
            id: 'xiaomi_battery',
            stepNumber: 2,
            title: isTr ? 'Pil Tasarrufu -> Kısıtlama Yok' : 'Battery Saver -> No Restrictions',
            description: isTr
              ? 'Pil Tasarrufu menüsünde "Kısıtlama Yok (No Restrictions)" modunu seçin.'
              : 'Select "No Restrictions" under Battery Saver settings.',
            actionText: isTr ? 'Pil Tasarrufunu Ayarla' : 'Set Battery Saver',
            actionType: 'battery',
            isCritical: true,
          },
          {
            id: 'xiaomi_popup',
            stepNumber: 3,
            title: isTr ? 'Arka Planda Açılır Pencere Göster' : 'Display Pop-up Windows',
            description: isTr
              ? 'Kilit ekranında alarmın tam ekran açılması için "Arka planda açılır pencere göster" iznini verin.'
              : 'Allow "Display pop-up windows while running in the background".',
            actionText: isTr ? 'Açılır Pencere İznini Aç' : 'Open Pop-up Permission',
            actionType: 'popup',
            isCritical: true,
          },
        ],
      };

    case 'huawei':
      return {
        oemName: 'Huawei / Honor',
        osName: 'EMUI / MagicOS',
        summary: isTr
          ? 'Huawei PowerGenie pil yöneticisinde uygulamanın elle yönetilmesini sağlayın.'
          : 'Set manual app launch management in Huawei PowerGenie.',
        steps: [
          {
            id: 'huawei_launch',
            stepNumber: 1,
            title: isTr ? 'Uygulama Başlatma -> Elle Yönet' : 'App Launch -> Manage Manually',
            description: isTr
              ? 'Ayarlar > Pil > Uygulama Başlatma bölümünde "Otomatik Yönet"i kapatıp "Elle Yönet" altındaki 3 izni (Otomatik başlatma, İkincil başlatma, Arka planda çalışma) AÇIN.'
              : 'In Battery > App Launch, disable "Manage automatically" and enable all 3 manual switches.',
            actionText: isTr ? 'Uygulama Başlatmayı Aç' : 'Open App Launch',
            actionType: 'autostart',
            isCritical: true,
          },
        ],
      };

    case 'oppo':
      return {
        oemName: 'Oppo / Realme',
        osName: 'ColorOS / Realme UI',
        summary: isTr
          ? 'ColorOS arka plan dondurma ve otomatik başlatma kısıtlamalarını devre dışı bırakın.'
          : 'Disable ColorOS background freeze and enable auto-launch.',
        steps: [
          {
            id: 'oppo_autostart',
            stepNumber: 1,
            title: isTr ? 'Otomatik Başlatma & Arka Plan' : 'Auto-launch & Background Activity',
            description: isTr
              ? 'Güvenlik Merkezi > İzinler > "Otomatik Başlatma" ve "Arka Plan Etkinliği"ne izin verin.'
              : 'Allow Auto-launch and Background Activity in Security Center.',
            actionText: isTr ? 'Otomatik Başlatmayı Aç' : 'Open Auto-launch',
            actionType: 'autostart',
            isCritical: true,
          },
          {
            id: 'oppo_battery',
            stepNumber: 2,
            title: isTr ? 'Pil Optimizasyonunu Kapat' : 'Disable Battery Optimization',
            description: isTr
              ? 'Pil ayarlarında "Optimize Etme" seçeneğini belirleyin.'
              : 'Select "Don\'t optimize" in Battery optimization.',
            actionText: isTr ? 'Pil Ayarlarını Aç' : 'Open Battery Settings',
            actionType: 'battery',
            isCritical: true,
          },
        ],
      };

    case 'vivo':
      return {
        oemName: 'Vivo / iQOO',
        osName: 'Funtouch OS / OriginOS',
        summary: isTr
          ? 'Vivo iManager arka plan yüksek güç tüketimine izin verin.'
          : 'Allow high background power consumption in Vivo iManager.',
        steps: [
          {
            id: 'vivo_power',
            stepNumber: 1,
            title: isTr ? 'Yüksek Arka Plan Güç Tüketimi' : 'High Background Power Consumption',
            description: isTr
              ? 'Pil > "Yüksek arka plan güç tüketimi" listesinde İlaç Hatırlatıcı\'yı aktif edin.'
              : 'Allow high background power consumption in Battery settings.',
            actionText: isTr ? 'Güç Tüketimini Aç' : 'Open Power Settings',
            actionType: 'autostart',
            isCritical: true,
          },
        ],
      };

    case 'oneplus':
      return {
        oemName: 'OnePlus',
        osName: 'OxygenOS',
        summary: isTr
          ? 'OnePlus Derin Optimizasyon ve Uyku bekleme modunu devre dışı bırakın.'
          : 'Disable OnePlus Deep Optimization and Sleep Standby.',
        steps: [
          {
            id: 'oneplus_battery',
            stepNumber: 1,
            title: isTr ? 'Gelişmiş Optimizasyonu Kapat' : 'Disable Advanced Optimization',
            description: isTr
              ? 'Pil Optimizasyonu > Gelişmiş Optimizasyon seçeneklerini kapatın.'
              : 'Disable Deep Optimization and Sleep Standby optimization.',
            actionText: isTr ? 'Pil Ayarlarını Aç' : 'Open Battery Settings',
            actionType: 'battery',
            isCritical: true,
          },
        ],
      };

    default:
      return {
        oemName: 'Android',
        osName: 'Stock Android',
        summary: isTr
          ? 'Standart Android pil tasarrufu muafiyeti ve kesin alarm izinlerini ayarlayın.'
          : 'Configure standard Android battery exemption and exact alarms.',
        steps: [
          {
            id: 'generic_battery',
            stepNumber: 1,
            title: isTr ? 'Sınırsız Pil Kullanımı' : 'Unrestricted Battery Usage',
            description: isTr
              ? 'Uygulama Bilgisi > Pil bölümünde "Sınırsız" modunu seçin.'
              : 'Select "Unrestricted" in App Info > Battery.',
            actionText: isTr ? 'Pil Ayarını Aç' : 'Open Battery Settings',
            actionType: 'battery',
            isCritical: true,
          },
        ],
      };
  }
}

/**
 * İlgili OEM ayar ekranını doğrudan açar.
 */
export async function openOEMShieldSetting(
  actionType: 'autostart' | 'battery' | 'popup' | 'exact_alarm' | 'notification' | 'fullscreen'
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    switch (actionType) {
      case 'autostart':
        if (NativeModules?.AlarmModule?.openOEMAutostartSettings) {
          return await NativeModules.AlarmModule.openOEMAutostartSettings();
        }
        await notifee.openPowerManagerSettings();
        return true;

      case 'battery':
        if (NativeModules?.AlarmModule?.requestIgnoreBatteryOptimizations) {
          return await NativeModules.AlarmModule.requestIgnoreBatteryOptimizations();
        }
        await notifee.openBatteryOptimizationSettings();
        return true;

      case 'popup':
        if (NativeModules?.AlarmModule?.openOEMPopupSettings) {
          return await NativeModules.AlarmModule.openOEMPopupSettings();
        }
        await Linking.openSettings();
        return true;

      case 'exact_alarm':
        await notifee.openAlarmPermissionSettings();
        return true;

      case 'notification':
        await notifee.openNotificationSettings();
        return true;

      case 'fullscreen':
        if (Platform.Version >= 34) {
          try {
            await Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT');
            return true;
          } catch (_e) {
            await notifee.openNotificationSettings();
            return true;
          }
        }
        await notifee.openNotificationSettings();
        return true;

      default:
        await Linking.openSettings();
        return true;
    }
  } catch (error) {
    log.error('openOEMShieldSetting error', error);
    try {
      await Linking.openSettings();
      return true;
    } catch (_fallbackError) {
      return false;
    }
  }
}
