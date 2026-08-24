/**
 * Persistent Notification Service
 * İlaç alınana kadar silinmeyen, öncelikli bildirimler
 */

import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  AndroidBadgeIconType,
  AndroidGroupAlertBehavior,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { Medicine, ReminderTime, MedicineLog } from '../types';
import { createScopedLogger } from './logger';
import { CHANNELS } from '../constants';

const log = createScopedLogger('PersistentNotification');

const PERSISTENT_CHANNEL_ID = CHANNELS.PERSISTENT;
// eslint-disable-next-line unused-imports/no-unused-vars
const PERSISTENT_NOTIFICATION_TAG = 'medicine-pending';

/**
 * Kalıcı bildirim kanalını oluştur
 * Bu kanal en yüksek öncelikli ve sessiz modda bile görünür
 */
export async function createPersistentNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await notifee.createChannel({
      id: PERSISTENT_CHANNEL_ID,
      name: 'Bekleyen İlaç Bildirimleri',
      description: 'İlaç alınana kadar ekranda kalıcı bildirimler',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#FF6B6B',
      badge: true,
      bypassDnd: true,
    });
    log.debug('Kalıcı bildirim kanalı oluşturuldu');
  } catch (error) {
    log.error('Kalıcı bildirim kanalı oluşturma hatası', error);
  }
}

interface PersistentNotificationData {
  medicineId: string;
  reminderTimeId: string;
  scheduledTime: string;
  isPersistent: 'true';
}

/**
 * Kalıcı bildirim göster - İlaç alınana kadar silinmez
 */
export async function showPersistentMedicineNotification(
  medicine: Medicine,
  reminderTime: ReminderTime,
  scheduledTime: string
): Promise<string | null> {
  try {
    // Kanalın oluşturulduğundan emin ol
    await createPersistentNotificationChannel();

    const notificationId = `persistent-${medicine.id}-${reminderTime.id}`;
    const timeStr = new Date().toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await notifee.displayNotification({
      id: notificationId,
      title: `💊 ${medicine.name}`,
      subtitle: 'İlacınızı almayı unutmayın!',
      body: `${medicine.dosage} - ${timeStr}\nİlacı alana kadar bu bildirim görünecek`,
      android: {
        channelId: PERSISTENT_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        // Kalıcı bildirim ayarları
        ongoing: true,
        autoCancel: false,
        // Silinemez yapılandırması
        pressAction: {
          id: 'open-app',
          launchActivity: 'com.ilachatirlatici.MainActivity',
        },
        // Hızlı aksiyon butonları
        actions: [
          {
            title: '✓ Aldım',
            pressAction: { id: 'taken' },
          },
          {
            title: '⏰ Ertele',
            pressAction: { id: 'snooze' },
          },
          {
            title: '⬛ Kapat',
            pressAction: { id: 'stop' },
          },
        ],
        // Görsel ayarlar
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#0D9488',
        colorized: true,
        badgeIconType: AndroidBadgeIconType.LARGE,
        // Sessiz modda bile göster (channel zaten bypassDnd: true ile oluşturuldu)
        // Grup bildirimi (birden fazla ilaç varsa)
        groupId: 'medicine-reminders',
        groupAlertBehavior: AndroidGroupAlertBehavior.CHILDREN,
        // Progress bar (isteğe bağlı - zaman aşımı göstermek için)
        progress: {
          max: 100,
          current: 0,
          indeterminate: true,
        },
      },
      data: {
        medicineId: medicine.id,
        reminderTimeId: reminderTime.id,
        scheduledTime,
        isPersistent: 'true',
        fullScreenAlarm: 'true',
      } as unknown as { [key: string]: string | number | object },
      // iOS için (uygulanabilirse)
      ios: {
        categoryId: 'medicine',
        critical: true,
        criticalVolume: 1.0,
      },
    });

    log.debug('Kalıcı bildirim gösterildi', {
      notificationId,
      medicine: medicine.name,
    });

    return notificationId;
  } catch (error) {
    log.error('Kalıcı bildirim gösterme hatası', error);
    return null;
  }
}

/**
 * Toplu kalıcı bildirim göster (birden fazla ilaç için)
 */
export async function showPersistentGroupNotification(
  medicines: Array<{ medicine: Medicine; reminderTime: ReminderTime; scheduledTime: string }>
): Promise<string | null> {
  if (medicines.length === 0) return null;
  if (medicines.length === 1) {
    const [{ medicine, reminderTime, scheduledTime }] = medicines;
    return showPersistentMedicineNotification(medicine, reminderTime, scheduledTime);
  }

  try {
    await createPersistentNotificationChannel();

    const notificationId = 'persistent-group';
    const medicineNames = medicines.map(m => m.medicine.name).join(', ');

    await notifee.displayNotification({
      id: notificationId,
      title: `💊 ${medicines.length} İlaç Bekliyor`,
      subtitle: 'Birkaç ilacınızı almayı unutmuş olabilirsiniz',
      body: medicineNames.substring(0, 100) + (medicineNames.length > 100 ? '...' : ''),
      android: {
        channelId: PERSISTENT_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        ongoing: true,
        autoCancel: false,
        pressAction: {
          id: 'open-app',
          launchActivity: 'com.ilachatirlatici.MainActivity',
        },
        actions: [{ title: '📱 Uygulamayı Aç', pressAction: { id: 'open-app' } }],
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#0D9488',
        colorized: true,
        groupId: 'medicine-reminders',
        groupAlertBehavior: AndroidGroupAlertBehavior.CHILDREN,
        style: {
          type: AndroidStyle.INBOX,
          lines: medicines.map(m => `• ${m.medicine.name} ${m.medicine.dosage}`),
        },
      },
      data: {
        isPersistent: 'true',
        isGroup: 'true',
        medicineCount: String(medicines.length),
      },
    });

    return notificationId;
  } catch (error) {
    log.error('Toplu kalıcı bildirim hatası', error);
    return null;
  }
}

import { AndroidStyle } from '@notifee/react-native';

/**
 * Kalıcı bildirimi kaldır (ilaç alındığında)
 */
export async function dismissPersistentNotification(
  medicineId: string,
  reminderTimeId: string
): Promise<void> {
  try {
    const notificationId = `persistent-${medicineId}-${reminderTimeId}`;
    await notifee.cancelDisplayedNotification(notificationId);
    log.debug('Kalıcı bildirim kaldırıldı', { notificationId });
  } catch (error) {
    log.error('Kalıcı bildirim kaldırma hatası', error);
  }
}

/**
 * Tüm kalıcı bildirimleri kaldır
 */
export async function dismissAllPersistentNotifications(): Promise<void> {
  try {
    // Tüm görüntülenen bildirimleri al
    const displayedNotifications = await notifee.getDisplayedNotifications();

    for (const notification of displayedNotifications) {
      // Kalıcı bildirimleri filtrele
      if (
        notification.id?.startsWith('persistent-') ||
        notification.notification?.data?.isPersistent === 'true'
      ) {
        const notificationId = notification.id;
        if (!notificationId) continue;
        await notifee.cancelDisplayedNotification(notificationId);
        log.debug('Kalıcı bildirim kaldırıldı', { notificationId });
      }
    }
  } catch (error) {
    log.error('Tüm kalıcı bildirimleri kaldırma hatası', error);
  }
}

/**
 * Bekleyen ilaç kontrolü ve kalıcı bildirim gösterimi
 * HomeScreen'de kullanılmalı
 */
export async function checkAndShowPersistentNotifications(
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  logs: MedicineLog[]
): Promise<void> {
  try {
    const now = new Date();
    const pendingMedicines: Array<{
      medicine: Medicine;
      reminderTime: ReminderTime;
      scheduledTime: string;
    }> = [];

    for (const reminderTime of reminderTimes) {
      const medicine = medicines.find(m => m.id === reminderTime.medicineId);
      if (!medicine || !medicine.isActive || !reminderTime.isEnabled) continue;

      // Bugün bu saatte alınmış mı kontrol et
      const today = new Date().toISOString().split('T')[0];
      const reminderHour = parseInt(reminderTime.time.split(':')[0]);
      const reminderMinute = parseInt(reminderTime.time.split(':')[1]);

      const scheduledTime = new Date();
      scheduledTime.setHours(reminderHour, reminderMinute, 0, 0);

      // Zaman geçmiş mi ama 2 saatten fazla olmamış mı?
      const hoursPassed = (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);

      if (hoursPassed >= 0 && hoursPassed <= 2) {
        // Bugün için log kontrolü
        const isTaken = logs.some(
          log =>
            log.medicineId === medicine.id &&
            log.scheduledTime.startsWith(today) &&
            log.status === 'taken'
        );

        if (!isTaken) {
          pendingMedicines.push({
            medicine,
            reminderTime,
            scheduledTime: scheduledTime.toISOString(),
          });
        }
      }
    }

    if (pendingMedicines.length > 0) {
      await showPersistentGroupNotification(pendingMedicines);
    } else {
      // Bekleyen ilaç yoksa tüm kalıcı bildirimleri kaldır
      await dismissAllPersistentNotifications();
    }
  } catch (error) {
    log.error('Bekleyen ilaç kontrolü hatası', error);
  }
}

/**
 * Kalıcı bildirim buton aksiyonlarını işle
 * App.tsx veya navigation handler'da kullanılmalı
 */
export async function handlePersistentNotificationAction(
  actionId: string,
  data: Record<string, string | object | number> | undefined,
  callbacks: {
    onTaken?: (medicineId: string, reminderTimeId: string) => void;
    onSnooze?: (medicineId: string, reminderTimeId: string) => void;
    onStop?: (medicineId: string, reminderTimeId: string) => void;
    onOpenApp?: () => void;
  }
): Promise<void> {
  const typedData = data as PersistentNotificationData | undefined;
  const medicineId = typedData?.medicineId;
  const reminderTimeId = typedData?.reminderTimeId;

  log.debug('Kalıcı bildirim aksiyonu', { actionId, medicineId, reminderTimeId });

  switch (actionId) {
    case 'taken':
      if (medicineId && reminderTimeId) {
        callbacks.onTaken?.(medicineId, reminderTimeId);
        await dismissPersistentNotification(medicineId, reminderTimeId);
      }
      break;
    case 'snooze':
      if (medicineId && reminderTimeId) {
        callbacks.onSnooze?.(medicineId, reminderTimeId);
      }
      break;
    case 'stop':
      if (medicineId && reminderTimeId) {
        callbacks.onStop?.(medicineId, reminderTimeId);
        await dismissPersistentNotification(medicineId, reminderTimeId);
      }
      break;
    case 'open-app':
    default:
      callbacks.onOpenApp?.();
      break;
  }
}
