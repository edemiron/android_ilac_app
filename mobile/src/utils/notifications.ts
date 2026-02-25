import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  EventType,
  Event,
  AuthorizationStatus,
  AndroidNotificationSetting,
  TriggerType,
  TimestampTrigger,
  AlarmType,
} from '@notifee/react-native';
import { Platform, Vibration, Linking, NativeModules } from 'react-native';
import { STORAGE_KEYS } from '../constants';

// PowerManagerInfo type (notifee'den dogrudan export edilmiyor)
interface PowerManagerInfo {
  manufacturer?: string;
  activity?: string | null;
}
import { Medicine, ReminderTime, UserSettings } from '../types';
import { addMinutes } from 'date-fns';
import { createScopedLogger } from './logger';
import { isMIUIDevice, getMIUIInstructions, openMIUIAutoStartSettings } from './miuiHelper';

const log = createScopedLogger('Notifications');

// Kanal ID'leri - Versiyon değişince yeni kanal oluşur (ses ayarı için gerekli)
const CHANNEL_VERSION = 'v4';
const ALARM_CHANNEL_ID = `medicine-alarms-${CHANNEL_VERSION}`;
const REMINDER_CHANNEL_ID = `medicine-reminders-${CHANNEL_VERSION}`;

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
 * Bildirim kanallarını oluştur
 */
export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // Ana alarm kanalı - Custom alarm sesi ile
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Ilac Alarmlari',
      description: 'Kritik ilac hatirlatmalari - Sessiz modda bile calar',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'alarm', // res/raw/alarm.mp3
      vibration: true,
      lights: true,
      lightColor: '#FF0000',
      bypassDnd: true,
    });
    log.debug('Alarm kanali olusturuldu (custom sound)');

    // Normal hatırlatma kanalı
    await notifee.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'Ilac Hatirlatmalari',
      description: 'Normal ilac hatirlatmalari',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
    });
    log.debug('Hatirlatma kanali olusturuldu');

    log.debug('Notifee bildirim kanallari olusturuldu');
  } catch (error) {
    log.error('Kanal olusturma hatasi', error);
  }
}

/**
 * Power Manager bilgilerini al (MIUI, EMUI, ColorOS vb. için kritik)
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
 * Cihaza özel power manager ayarlarını aç (MIUI autostart vb.)
 */
export async function openPowerManagerSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await notifee.openPowerManagerSettings();
    log.debug('Power Manager ayarlari acildi');
  } catch (error) {
    log.error('Power Manager ayarlari acilamadi', error);
    // Fallback: Genel pil ayarlarını aç
    await notifee.openBatteryOptimizationSettings();
  }
}

/**
 * Tüm gerekli izinleri kontrol et
 */
export async function checkAllPermissions(): Promise<{
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimization: boolean;
  dnd: boolean;
  fullScreenIntent: boolean;
  powerManagerRestricted: boolean;
  manufacturer: string | null;
  isMIUI: boolean;
}> {
  const settings = await notifee.getNotificationSettings();

  // Android 14+ için full screen intent izni kontrolü
  let fullScreenIntentEnabled = true;
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    // Android 14+ için özel kontrol gerekiyor
    // Notifee tipler henuz fullScreenIntent'i icermeyebilir
    const androidSettings = settings.android as { fullScreenIntent?: number };
    fullScreenIntentEnabled = androidSettings?.fullScreenIntent !== 0;
  }

  // batteryOptimizationStatus notifee tiplerinde olmayabilir
  const androidSettingsWithBattery = settings.android as { batteryOptimizationStatus?: number };

  // Power Manager bilgisi (MIUI, EMUI, ColorOS vb.)
  let powerManagerRestricted = false;
  let manufacturer: string | null = null;

  if (Platform.OS === 'android') {
    try {
      const powerInfo = await notifee.getPowerManagerInfo();
      manufacturer = powerInfo.manufacturer || null;
      // Eger cihaz ureticisi ozel power manager'a sahipse ve activity varsa
      // bu, kullanicinin ayarlari yapmasi gerektigini gosterir
      powerManagerRestricted = !!powerInfo.activity;
      log.debug('Power Manager durumu', {
        manufacturer,
        hasActivity: !!powerInfo.activity,
        activity: powerInfo.activity,
      });
      // eslint-disable-next-line unused-imports/no-unused-vars
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
 * Full screen intent izin ayarlarını aç (Android 14+)
 */
export async function openFullScreenIntentSettings(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    try {
      await Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT');
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (error) {
      // Fallback: Uygulama ayarlarını aç
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

    // Kanalları her durumda oluştur
    await createNotificationChannels();
    log.debug('Kanallar olusturuldu');

    const isAuthorized =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    log.debug('Izin durumu', { isAuthorized });
    return isAuthorized;
  } catch (error) {
    log.error('requestNotificationPermissions hatasi', error);
    // Hata durumunda bile kanalları oluşturmayı dene
    try {
      await createNotificationChannels();
    } catch (e) {
      log.error('Kanal olusturma hatasi', e);
    }
    return true; // Hata durumunda devam et
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
 * Pil optimizasyonu devre dışı bırakma izni iste
 */
export async function requestBatteryOptimizationPermission(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.openBatteryOptimizationSettings();
  }
}

/**
 * DND (Rahatsız Etmeyin) izin ayarlarını aç
 */
export async function openDndSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (error) {
      // Fallback: Genel ayarları aç
      await Linking.openSettings();
    }
  }
}

/**
 * Uygulama bildirim ayarlarını aç
 */
export async function openNotificationSettings(): Promise<void> {
  await notifee.openNotificationSettings();
}

/**
 * UCES: MIUI için AGRESİF hassas alarm zamanlama
 * 30 saniye gecikme sorununu çözmek için triple-backup + pre-wake
 */
async function scheduleExactAlarmWithBackup(
  medicine: Medicine,
  reminderTime: ReminderTime,
  triggerDate: Date,
  fullScreenAlarm: boolean
): Promise<string | null> {
  const mainId = `alarm-${medicine.id}-${reminderTime.id}`;

  const baseTime = triggerDate.getTime();

  // 1. Ana alarm (exact time) - SET_ALARM_CLOCK en güçlü alarm tipi
  const mainTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: baseTime,
    alarmManager: {
      allowWhileIdle: true,
      type: AlarmType.SET_ALARM_CLOCK,
    },
  };

  try {
    // Eski alarmı iptal et
    await notifee.cancelNotification(mainId);

    const timeStr = triggerDate.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Ana alarmı kur - onlyAlertOnce: false olmalı ki fullScreenAction tetiklensin
    const notificationId = await notifee.createTriggerNotification(
      {
        id: mainId,
        title: `💊 ${medicine.name}`,
        subtitle: timeStr,
        body: `${medicine.dosage} almanin zamani!\n⏰ ${timeStr}`,
        android: {
          channelId: ALARM_CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          ongoing: true,
          autoCancel: false,
          onlyAlertOnce: false,
          loopSound: true,
          fullScreenAction: fullScreenAlarm ? FULL_SCREEN_ACTION : undefined,
          pressAction: PRESS_ACTION,
          smallIcon: 'ic_launcher',
          color: '#2196F3',
          colorized: true,
          sound: 'alarm',
          vibrationPattern: getVibrationPattern(medicine.vibrationPattern),
          lights: ['#2196F3', 500, 500] as [string, number, number],
          actions: ALARM_ACTIONS,
        },
        data: {
          medicineId: medicine.id,
          reminderTimeId: reminderTime.id,
          scheduledTime: triggerDate.toISOString(),
          fullScreenAlarm: fullScreenAlarm ? 'true' : 'false',
          isMainAlarm: 'true',
        },
      },
      mainTrigger
    );

    log.debug('MIUI alarm scheduled (single, no backups)', {
      mainId,
      baseTime: new Date(baseTime).toISOString(),
    });

    return notificationId;
  } catch (error) {
    log.error('Exact alarm scheduling failed', error);
    return null;
  }
}

/**
 * İlaç için bildirim planla
 */
export async function scheduleMedicineNotification(
  medicine: Medicine,
  reminderTime: ReminderTime,
  fullScreenAlarm: boolean = true,
  bypassBuffer: boolean = false
): Promise<string | null> {
  // Guard clause: Gecersiz medicine veya reminderTime kontrolu
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
    // Mevcut bildirimi iptal et
    await cancelNotification(`alarm-${medicine.id}-${reminderTime.id}`);

    const [hours, minutes] = reminderTime.time.split(':').map(Number);

    // Bugün için zamanı hesapla
    const now = new Date();
    let triggerDate = new Date();
    triggerDate.setHours(hours, minutes, 0, 0);

    // KRİTİK: Eğer zaman geçtiyse yarın için planla
    // bypassBuffer=true ise sadece geçmiş zamanları kontrol et (kullanıcı bilinçli ayarladı)
    if (bypassBuffer) {
      // Sadece zaman kesin geçmişse yarına al (1 dakika tolerans)
      const pastThreshold = new Date(now.getTime() - 60 * 1000);
      if (triggerDate <= pastThreshold) {
        triggerDate.setDate(triggerDate.getDate() + 1);
        log.debug('Alarm yarina planlandi (zaman gecti, bypassBuffer)', {
          triggerDate: triggerDate.toISOString(),
        });
      }
    } else {
      // Normal akış (app_startup, boot recovery vb.):
      // Alarm zamanı geçmişse VEYA son 2 dakika içindeyse yarına planla
      // Bu, "Kapat" sonrası uygulamayı açınca alarmın tekrar çalmasını engeller
      // Çünkü reRegisterAllAlarms alarm'ı tekrar planlar ve geçmiş zaman hemen tetiklenir
      const bufferMs = 2 * 60 * 1000; // 2 dakika buffer
      if (triggerDate.getTime() <= now.getTime() + bufferMs) {
        triggerDate.setDate(triggerDate.getDate() + 1);
        log.debug('Alarm yarina planlandi (zaman gecti veya buffer icinde)', {
          triggerDate: triggerDate.toISOString(),
        });
      }
    }

    log.debug('Ilac bildirimi planlaniyor', {
      name: medicine.name,
      time: reminderTime.time,
      targetDate: triggerDate.toISOString(),
      isMIUI: isMIUIDevice(),
    });

    // UCES: MIUI için hassas zamanlama + backup alarm
    if (isMIUIDevice() && fullScreenAlarm) {
      log.debug('MIUI cihaz - exact alarm with backup kullaniliyor');
      return await scheduleExactAlarmWithBackup(
        medicine,
        reminderTime,
        triggerDate,
        fullScreenAlarm
      );
    }

    // Normal cihazlar için standart alarm
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
        id: `alarm-${medicine.id}-${reminderTime.id}`,
        title: `💊 ${medicine.name}`,
        subtitle: timeStr,
        body: `${medicine.dosage} almanin zamani!\n⏰ ${timeStr}`,
        android: {
          channelId: fullScreenAlarm ? ALARM_CHANNEL_ID : REMINDER_CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          ongoing: fullScreenAlarm,
          autoCancel: !fullScreenAlarm,
          onlyAlertOnce: false,
          loopSound: fullScreenAlarm,
          fullScreenAction: fullScreenAlarm ? FULL_SCREEN_ACTION : undefined,
          pressAction: PRESS_ACTION,
          smallIcon: 'ic_launcher',
          color: '#2196F3',
          colorized: true,
          sound: 'alarm',
          vibrationPattern: getVibrationPattern(medicine.vibrationPattern),
          lights: ['#2196F3', 500, 500] as [string, number, number],
          actions: ALARM_ACTIONS,
        },
        data: {
          medicineId: medicine.id,
          reminderTimeId: reminderTime.id,
          scheduledTime: triggerDate.toISOString(),
          fullScreenAlarm: fullScreenAlarm ? 'true' : 'false',
        },
      },
      trigger
    );

    log.debug('Bildirim planlandi', { time: reminderTime.time, notificationId });

    const triggers = await notifee.getTriggerNotificationIds();
    log.debug('Aktif trigger sayisi', { count: triggers.length });

    return notificationId;
  } catch (error) {
    log.error('Bildirim planlanirken hata', error);
    return null;
  }
}

/**
 * Test alarm bildirimi planla
 */
export async function scheduleTestAlarmNotification(
  minutesFromNow: number,
  language: 'tr' | 'en' = 'tr'
): Promise<string> {
  const seconds = Math.round(minutesFromNow * 60);
  const scheduledTime = new Date(Date.now() + seconds * 1000);

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
      channelId: ALARM_CHANNEL_ID,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: false,
      fullScreenAction: FULL_SCREEN_ACTION,
      pressAction: PRESS_ACTION,
      smallIcon: 'ic_launcher',
      color: '#2196F3',
      colorized: true,
      sound: 'alarm',
      vibrationPattern: [500, 1000, 500, 1000, 500, 1000],
      lights: ['#2196F3', 500, 500] as [string, number, number],
      actions: ALARM_ACTIONS,
    },
    data: {
      medicineId: testMedicineId,
      reminderTimeId: testReminderId,
      scheduledTime: scheduledTime.toISOString(),
      fullScreenAlarm: 'true',
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

    return notificationId;
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
  } = params;

  try {
    const triggerTime = addMinutes(new Date(), snoozeDuration);
    const notificationId = `snooze-${snoozeId}`;

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
        title: `🔔 ${medicine.name} (Ertelendi${snoozeCount > 1 ? ` x${snoozeCount}` : ''})`,
        subtitle: timeStr,
        body: `${medicine.dosage} almanin zamani!\n⏰ ${timeStr}`,
        android: {
          channelId: ALARM_CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          ongoing: true,
          autoCancel: false,
          loopSound: true,
          fullScreenAction: FULL_SCREEN_ACTION,
          pressAction: PRESS_ACTION,
          smallIcon: 'ic_launcher',
          color: '#FF6B6B',
          colorized: true,
          sound: 'alarm',
          vibrationPattern: [500, 200, 500, 200, 500, 200],
          lights: ['#FF0000', 500, 500] as [string, number, number],
          actions: ALARM_ACTIONS,
        },
        data: {
          medicineId: medicine.id,
          reminderTimeId: reminderTime.id,
          scheduledTime: triggerTime.toISOString(),
          originalScheduledTime,
          fullScreenAlarm: 'true',
          isSnooze: 'true',
          snoozeId,
          snoozeCount: String(snoozeCount),
        },
      },
      trigger
    );

    log.debug('Erteleme bildirimi planlandi', { snoozeDuration, notificationId, snoozeCount });
    return { notificationId, triggerTime };
  } catch (error) {
    log.error('Erteleme bildirimi planlanirken hata', error);
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
    const medicineNotificationIds = triggerIds.filter(
      id => id.startsWith(`alarm-${medicineId}-`) || id.startsWith(`snooze-${medicineId}-`)
    );

    // Her birini iptal et
    for (const notifId of medicineNotificationIds) {
      await notifee.cancelNotification(notifId);
      log.debug('Ilac bildirimi iptal edildi', { notifId, medicineId });
    }

    // Görüntülenen bildirimleri de kontrol et
    const displayedNotifications = await notifee.getDisplayedNotifications();
    for (const notif of displayedNotifications) {
      if (
        notif.id?.startsWith(`alarm-${medicineId}-`) ||
        notif.id?.startsWith(`snooze-${medicineId}-`)
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

    // Tum planlanmis trigger'lari al
    const triggerIds = await notifee.getTriggerNotificationIds();
    let cancelledCount = 0;

    for (const triggerId of triggerIds) {
      // alarm-{medicineId}-{reminderTimeId} veya snooze-{medicineId}-{timestamp} formatini parse et
      const alarmMatch = triggerId.match(/^alarm-([^-]+)-/);
      const snoozeMatch = triggerId.match(/^snooze-([^-]+)-/);
      const medicineId = alarmMatch?.[1] || snoozeMatch?.[1];

      // Medicine ID bulunamadiysa veya gecerli listede degilse iptal et
      if (medicineId && !validIds.has(medicineId)) {
        await notifee.cancelNotification(triggerId);
        cancelledCount++;
        log.debug('Yetim bildirim iptal edildi', { triggerId, medicineId });
      }
    }

    // Goruntulen bildirimleri de kontrol et
    const displayedNotifications = await notifee.getDisplayedNotifications();
    for (const notif of displayedNotifications) {
      if (!notif.id) continue;

      const alarmMatch = notif.id.match(/^alarm-([^-]+)-/);
      const snoozeMatch = notif.id.match(/^snooze-([^-]+)-/);
      const medicineId = alarmMatch?.[1] || snoozeMatch?.[1];

      if (medicineId && !validIds.has(medicineId)) {
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
export function isInQuietHours(settings: UserSettings): boolean {
  if (!settings.quietHoursEnabled) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = settings.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  } else {
    return currentTime >= startTime && currentTime < endTime;
  }
}

/**
 * Titreşimi durdur
 */
export function stopAlarmVibration(): void {
  Vibration.cancel();
}

/**
 * Notifee event listener'ı kur
 */
interface NotificationData {
  medicineId?: string;
  reminderTimeId?: string;
  scheduledTime?: string;
  fullScreenAlarm?: string;
  isSnooze?: string;
  snoozeId?: string;
  snoozeCount?: string;
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
        const today = new Date().toISOString().split('T')[0];
        const alarmKey = `${medId}-${remId}-${today}`;

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
