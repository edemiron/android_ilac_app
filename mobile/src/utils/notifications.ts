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
  RepeatFrequency,
  AlarmType,
} from '@notifee/react-native';
import { Platform, Vibration, Linking } from 'react-native';
import { Medicine, ReminderTime, UserSettings } from '../types';
import { addMinutes } from 'date-fns';

// Kanal ID'leri
const ALARM_CHANNEL_ID = 'medicine-alarms';
const REMINDER_CHANNEL_ID = 'medicine-reminders';

/**
 * Bildirim kanallarını oluştur
 */
export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // Ana alarm kanalı - Tam ekran, sessiz modda bile çalar
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Ilac Alarmlari',
      description: 'Kritik ilac hatirlatmalari - Sessiz modda bile calar',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      // vibrationPattern kaldırıldı - varsayılan titreşim kullanılacak
      lights: true,
      lightColor: '#FF0000',
      bypassDnd: true,
      lightColor: '#FF0000',
    });
    console.log('Alarm kanalı oluşturuldu');

    // Normal hatırlatma kanalı
    await notifee.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'Ilac Hatirlatmalari',
      description: 'Normal ilac hatirlatmalari',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      // vibrationPattern kaldırıldı - varsayılan titreşim kullanılacak
    });
    console.log('Hatırlatma kanalı oluşturuldu');

    console.log('Notifee bildirim kanalları oluşturuldu');
  } catch (error) {
    console.error('Kanal oluşturma hatası:', error);
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
}> {
  const settings = await notifee.getNotificationSettings();
  
  // Android 14+ için full screen intent izni kontrolü
  let fullScreenIntentEnabled = true;
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    // Android 14+ için özel kontrol gerekiyor
    // @ts-ignore - notifee types may not include this yet
    fullScreenIntentEnabled = settings.android?.fullScreenIntent !== 0;
  }
  
  return {
    notifications: settings.authorizationStatus === AuthorizationStatus.AUTHORIZED,
    exactAlarm: Platform.OS === 'android' 
      ? settings.android.alarm === AndroidNotificationSetting.ENABLED 
      : true,
    batteryOptimization: Platform.OS === 'android'
      ? !settings.android.batteryOptimizationStatus || settings.android.batteryOptimizationStatus === 1
      : true,
    dnd: true, // Notifee kanal ayarlarıyla bypass ediliyor
    fullScreenIntent: fullScreenIntentEnabled,
  };
}

/**
 * Full screen intent izin ayarlarını aç (Android 14+)
 */
export async function openFullScreenIntentSettings(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    try {
      await Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT');
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
    console.log('requestNotificationPermissions çağrıldı');
    const settings = await notifee.requestPermission();
    console.log('notifee.requestPermission sonucu:', JSON.stringify(settings));
    
    // Kanalları her durumda oluştur
    await createNotificationChannels();
    console.log('Kanallar oluşturuldu');
    
    const isAuthorized = settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
                         settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
    
    console.log('İzin durumu:', isAuthorized ? 'Verildi' : 'Verilmedi');
    return isAuthorized;
  } catch (error) {
    console.error('requestNotificationPermissions hatası:', error);
    // Hata durumunda bile kanalları oluşturmayı dene
    try {
      await createNotificationChannels();
    } catch (e) {
      console.error('Kanal oluşturma hatası:', e);
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
 * Tam ekran alarm bildirimi göster (Anlık)
 */
export async function displayFullScreenAlarm(
  medicine: Medicine,
  reminderTime: ReminderTime,
  scheduledTime: string
): Promise<string> {
  const notificationId = await notifee.displayNotification({
    id: `alarm-${medicine.id}-${reminderTime.id}`,
    title: `${medicine.name}`,
    body: `${medicine.dosage} almanin zamani geldi!`,
    android: {
      channelId: ALARM_CHANNEL_ID,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      fullScreenAction: {
        id: 'default',
        launchActivity: 'com.ilachatirlatici.MainActivity',
      },
      pressAction: {
        id: 'default',
        launchActivity: 'com.ilachatirlatici.MainActivity',
      },
      autoCancel: false,
      smallIcon: 'ic_launcher',
      color: '#FF6B6B',
      actions: [
        {
          title: 'Aldim',
          pressAction: { id: 'take' },
        },
        {
          title: 'Ertele',
          pressAction: { id: 'snooze' },
        },
        {
          title: 'Atla',
          pressAction: { id: 'skip' },
        },
      ],
    },
    data: {
      medicineId: medicine.id,
      reminderTimeId: reminderTime.id,
      scheduledTime: scheduledTime,
      fullScreenAlarm: 'true',
    },
  });

  console.log('Tam ekran alarm gösterildi:', notificationId);
  return notificationId;
}

/**
 * İlaç için bildirim planla
 */
export async function scheduleMedicineNotification(
  medicine: Medicine,
  reminderTime: ReminderTime,
  fullScreenAlarm: boolean = true
): Promise<string | null> {
  try {
    // Mevcut bildirimi iptal et
    await cancelNotification(`alarm-${medicine.id}-${reminderTime.id}`);

    const [hours, minutes] = reminderTime.time.split(':').map(Number);
    
    // Bugün için zamanı hesapla
    const now = new Date();
    let triggerDate = new Date();
    triggerDate.setHours(hours, minutes, 0, 0);
    
    // Eğer zaman geçtiyse yarın için planla
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    console.log(`Ilac bildirimi planlaniyor: ${medicine.name} - ${reminderTime.time}`);
    console.log('Hedef zaman:', triggerDate.toISOString());

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: {
        allowWhileIdle: true,
        type: AlarmType.SET_ALARM_CLOCK,
      },
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        id: `alarm-${medicine.id}-${reminderTime.id}`,
        title: `${medicine.name}`,
        body: `${medicine.dosage} almanin zamani geldi!`,
        android: {
          channelId: fullScreenAlarm ? ALARM_CHANNEL_ID : REMINDER_CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          fullScreenAction: fullScreenAlarm ? {
            id: 'default',
            launchActivity: 'com.ilachatirlatici.MainActivity',
          } : undefined,
          pressAction: {
            id: 'default',
            launchActivity: 'com.ilachatirlatici.MainActivity',
          },
          autoCancel: false,
          smallIcon: 'ic_launcher',
          color: '#FF6B6B',
          // Ses ve titreşim
          sound: 'default',
          vibrationPattern: [500, 200, 500, 200, 500, 200],
          lights: ['#FF0000', 500, 500], // [color, onMs, offMs]
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

    console.log(`Bildirim planlandi: ${reminderTime.time} - ${notificationId}`);
    
    // Doğrulama
    const triggers = await notifee.getTriggerNotificationIds();
    console.log('Aktif trigger sayisi:', triggers.length);
    
    return notificationId;
  } catch (error) {
    console.error('Bildirim planlanirken hata:', error);
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
  const seconds = Math.max(15, Math.round(minutesFromNow * 60));
  const scheduledTime = new Date(Date.now() + seconds * 1000);

  console.log('=== TEST ALARM PLANLANIYOR ===');
  console.log('Şu anki zaman:', new Date().toISOString());
  console.log('Hedef zaman:', scheduledTime.toISOString());
  console.log('Saniye sonra:', seconds);

  // Kanalın oluşturulduğundan emin ol
  await createNotificationChannels();

  // Exact alarm izni kontrolü
  const settings = await notifee.getNotificationSettings();
  console.log('Alarm izni durumu:', settings.android?.alarm);

  // Trigger oluştur - alarmManager ile exact alarm
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: scheduledTime.getTime(),
    alarmManager: {
      allowWhileIdle: true,
      type: AlarmType.SET_ALARM_CLOCK,
    },
  };

  console.log('Trigger:', JSON.stringify(trigger));

  try {
    const notificationId = await notifee.createTriggerNotification(
      {
        id: 'test-alarm-' + Date.now(),
        title: language === 'tr' ? 'Ilac Zamani' : 'Medicine Time',
        body: language === 'tr' 
          ? 'Aspirin 500mg almanin zamani geldi!'
          : 'Time to take Aspirin 500mg!',
        android: {
          channelId: ALARM_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          category: AndroidCategory.ALARM,
          fullScreenAction: {
            id: 'default',
            launchActivity: 'com.ilachatirlatici.MainActivity',
          },
          pressAction: {
            id: 'default',
            launchActivity: 'com.ilachatirlatici.MainActivity',
          },
          smallIcon: 'ic_launcher',
          autoCancel: false,
          sound: 'default',
          vibrationPattern: [500, 200, 500, 200, 500, 200],
          lights: ['#FF0000', 500, 500],
        },
        data: {
          medicineId: 'test-medicine',
          reminderTimeId: 'test-reminder',
          scheduledTime: scheduledTime.toISOString(),
          fullScreenAlarm: 'true',
        },
      },
      trigger
    );

    console.log('Test alarm basariyla planlandi. ID:', notificationId);
    
    // Planlanan bildirimleri kontrol et
    const triggers = await notifee.getTriggerNotificationIds();
    console.log('Planlanan bildirim IDleri:', triggers);

    return notificationId;
  } catch (error) {
    console.error('Test alarm planlama hatasi:', error);
    throw error;
  }
}

/**
 * Erteleme bildirimi planla
 */
export async function scheduleSnoozeNotification(
  medicine: Medicine,
  reminderTime: ReminderTime,
  snoozeDuration: number = 5
): Promise<string | null> {
  try {
    const snoozeTime = addMinutes(new Date(), snoozeDuration);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: snoozeTime.getTime(),
      alarmManager: {
        allowWhileIdle: true,
        type: AlarmType.SET_ALARM_CLOCK,
      },
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        id: `snooze-${medicine.id}-${Date.now()}`,
        title: `${medicine.name} (Ertelendi)`,
        body: `${medicine.dosage} almanin zamani geldi!`,
        android: {
          channelId: ALARM_CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          fullScreenAction: {
            id: 'default',
            launchActivity: 'com.ilachatirlatici.MainActivity',
          },
          pressAction: {
            id: 'default',
            launchActivity: 'com.ilachatirlatici.MainActivity',
          },
          autoCancel: false,
          smallIcon: 'ic_launcher',
          color: '#FF6B6B',
          sound: 'default',
          vibrationPattern: [500, 200, 500, 200, 500, 200],
          lights: ['#FF0000', 500, 500],
        },
        data: {
          medicineId: medicine.id,
          reminderTimeId: reminderTime.id,
          scheduledTime: snoozeTime.toISOString(),
          fullScreenAlarm: 'true',
          isSnooze: 'true',
        },
      },
      trigger
    );

    console.log(`Erteleme bildirimi planlandı: ${snoozeDuration} dakika sonra`);
    return notificationId;
  } catch (error) {
    console.error('Erteleme bildirimi planlanırken hata:', error);
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
    console.error('Bildirim iptal edilirken hata:', error);
  }
}

/**
 * Tüm bildirimleri iptal et
 */
export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}

/**
 * Görüntülenen bildirimi kapat
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  try {
    await notifee.cancelDisplayedNotification(notificationId);
  } catch (error) {
    console.error('Bildirim kapatılırken hata:', error);
  }
}

/**
 * Test bildirimi gönder
 */
export async function sendTestNotification(): Promise<void> {
  await notifee.displayNotification({
    title: '🔔 Test Bildirimi',
    body: 'İlaç hatırlatma sistemi çalışıyor!',
    android: {
      channelId: REMINDER_CHANNEL_ID,
      smallIcon: 'ic_notification',
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
 * Titreşim başlat
 */
export function startAlarmVibration(): void {
  const VIBRATION_PATTERN = [0, 500, 500, 500, 500, 500];
  if (Platform.OS === 'android') {
    Vibration.vibrate(VIBRATION_PATTERN, true);
  } else {
    Vibration.vibrate(VIBRATION_PATTERN);
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
export function setupNotificationListeners(
  onAlarmPress: (data: { medicineId: string; reminderTimeId: string; scheduledTime: string }) => void,
  onAction: (actionId: string, data: any) => void
): () => void {
  return notifee.onForegroundEvent(({ type, detail }: Event) => {
    const { notification, pressAction } = detail;
    
    console.log('[Foreground] Event type:', type, 'Notification:', notification?.id);
    
    // DELIVERED - Bildirim teslim edildi, alarm ekranını aç
    if (type === EventType.DELIVERED) {
      console.log('[Foreground] Notification delivered:', notification?.id);
      if (notification?.data?.fullScreenAlarm === 'true') {
        console.log('[Foreground] Full screen alarm - opening alarm screen');
        onAlarmPress({
          medicineId: notification.data.medicineId as string,
          reminderTimeId: notification.data.reminderTimeId as string,
          scheduledTime: notification.data.scheduledTime as string,
        });
      }
    }
    
    if (type === EventType.PRESS) {
      // Bildirime tıklandı
      if (notification?.data) {
        onAlarmPress({
          medicineId: notification.data.medicineId as string,
          reminderTimeId: notification.data.reminderTimeId as string,
          scheduledTime: notification.data.scheduledTime as string,
        });
      }
    } else if (type === EventType.ACTION_PRESS && pressAction) {
      // Aksiyon butonuna tıklandı
      onAction(pressAction.id, notification?.data);
    }
  });
}

/**
 * Background event handler (App.tsx'te çağrılacak)
 */
export function registerBackgroundHandler(
  onAlarmPress: (data: { medicineId: string; reminderTimeId: string; scheduledTime: string }) => void,
  onAction: (actionId: string, data: any) => void
): void {
  notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
    const { notification, pressAction } = detail;
    
    if (type === EventType.PRESS) {
      if (notification?.data) {
        onAlarmPress({
          medicineId: notification.data.medicineId as string,
          reminderTimeId: notification.data.reminderTimeId as string,
          scheduledTime: notification.data.scheduledTime as string,
        });
      }
    } else if (type === EventType.ACTION_PRESS && pressAction) {
      onAction(pressAction.id, notification?.data);
    }
  });
}

// Expo-notifications ile uyumluluk için eski fonksiyon adları
export { requestNotificationPermissions as setupNotificationCategories };
