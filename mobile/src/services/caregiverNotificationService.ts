/**
 * Caregiver Notification Service
 *
 * Bakıcılar için Push / FCM bildirimleri gönderme servisi.
 * İlaç alındığında, atlandığında veya beklendiğinde bakıcıya push bildirimi gönderir.
 * Uygulama kapalıyken veya arka plandayken bile Android/iOS sistem bildirimini tetikler.
 */

import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';
import { updateCaregiverFcmToken } from './caregiverService';

const log = createScopedLogger('CaregiverNotifications');

const FCM_TOKEN_KEY = 'caregiver.fcm.token';
const CAREGIVER_NOTIFICATIONS_ENABLED = '@caregiver_notifications_enabled';

import { Platform } from 'react-native';

// Bildirimlerin arka planda/ön planda nasıl gösterileceğini yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * FCM / Push token'ı al ve kaydet
 */
export async function setupCaregiverNotifications(userId: string): Promise<string | null> {
  try {
    if (!userId) {
      log.warn('Kullanıcı ID yok, Push kurulumu atlanıyor');
      return null;
    }

    // Android bildirim kanallarını oluştur
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('caregiver-live-alerts-v1', {
          name: 'Bakıcı Canlı Bildirimleri',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4ECDC4',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('patient-remote-reminders-v1', {
          name: 'Hasta Canlı Hatırlatıcıları',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF6B6B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      } catch (_chErr) {
        log.debug('Channel setup skip');
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      log.warn('Push bildirim izni verilmedi');
      return null;
    }

    let pushToken = '';
    try {
      const tokenObj = await Notifications.getExpoPushTokenAsync();
      pushToken = tokenObj.data;
    } catch (_e) {
      log.debug('Expo push token direct get skip');
    }

    if (!pushToken) {
      try {
        const devTokenObj = await Notifications.getDevicePushTokenAsync();
        pushToken = devTokenObj.data;
      } catch (devErr) {
        log.warn('Device push token alınamadı', devErr);
      }
    }

    if (!pushToken) {
      log.warn('Push token boş döndü');
      return null;
    }

    // Token'ı kaydet (SecureStore — hassas veri)
    await SecureStore.setItemAsync(FCM_TOKEN_KEY, pushToken);

    // Bakıcı ilişkilerini güncelle
    await updateCaregiverFcmToken(userId, pushToken);

    log.info('Push token başarıyla alındı ve kaydedildi', { userId });

    return pushToken;
  } catch (error) {
    log.error('Push kurulum hatası', error);
    return null;
  }
}

/**
 * Kayıtlı FCM token'ı getir (SecureStore)
 */
export async function getStoredFcmToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(FCM_TOKEN_KEY);
  } catch (error) {
    log.error('FCM token okuma hatası', error);
    return null;
  }
}

/**
 * Bakıcı bildirimlerini aktif/pasif yap
 */
export async function setCaregiverNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CAREGIVER_NOTIFICATIONS_ENABLED, enabled ? 'true' : 'false');
  } catch (error) {
    log.error('Bildirim ayarı kaydetme hatası', error);
  }
}

/**
 * Bakıcı bildirimleri aktif mi?
 */
export async function isCaregiverNotificationsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(CAREGIVER_NOTIFICATIONS_ENABLED);
    return enabled === null ? true : enabled === 'true';
  } catch (error) {
    log.error('Bildirim ayarı okuma hatası', error);
    return true;
  }
}

/**
 * Foreground mesaj dinleyicisi
 */
export function setupCaregiverMessageListener(callback: (message: any) => void): () => void {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    log.debug('Foreground bildirim alındı', { notification });
    callback(notification);
  });

  return () => subscription.remove();
}

/**
 * Bakıcıya bildirim verisi oluştur
 */
export interface CaregiverNotificationData {
  type: 'missed' | 'skipped' | 'taken' | 'snoozed' | 'schedule_updated';
  patientId: string;
  patientName?: string;
  medicineName: string;
  scheduledTime: string;
  message: string;
  timestamp: string;
}

/**
 * Bakıcı bildirim mesajını formatla
 */
export function formatCaregiverNotification(data: CaregiverNotificationData): {
  title: string;
  body: string;
} {
  const { type, medicineName, patientName, scheduledTime } = data;

  const patient = patientName || 'Hastanız';
  const time = scheduledTime?.includes('T')
    ? scheduledTime.split('T')[1].slice(0, 5)
    : scheduledTime || '';

  switch (type) {
    case 'missed':
      return {
        title: `⚠️ ${patient} İlacını Kaçırdı`,
        body: `${medicineName} (${time}) saatinde ilaç alınmadı.`,
      };
    case 'skipped':
      return {
        title: `⚠️ ${patient} İlacını Atladı`,
        body: `${medicineName} (${time}) saatindeki doz atlandı.`,
      };
    case 'taken':
      return {
        title: `🎉 ${patient} İlacını Aldı!`,
        body: `${medicineName} (${time}) dozunu başarıyla tamamladı.`,
      };
    case 'snoozed':
      return {
        title: `⏰ ${patient} İlacını Erteliyor`,
        body: `${medicineName} (${time}) saatindeki ilaç ertelendi.`,
      };
    case 'schedule_updated':
      return {
        title: `📋 ${patient} İlaç Programı Güncellendi`,
        body: 'İlaç programında değişiklik yapıldı.',
      };
    default:
      return {
        title: 'İlaç Bildirimi',
        body: data.message,
      };
  }
}

/**
 * Bakıcıya push bildirimi gönder (Expo Push API ile cihaz kapalıyken bile çalışır)
 */
export async function sendCaregiverNotification(
  pushToken: string,
  data: CaregiverNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!pushToken) {
      return { success: false, error: 'Push token bulunamadı' };
    }

    const enabled = await isCaregiverNotificationsEnabled();
    if (!enabled) {
      return { success: false, error: 'Bakıcı bildirimleri kapalı' };
    }

    const notification = formatCaregiverNotification(data);

    log.info('Bakıcıya push bildirimi gönderiliyor', {
      pushToken: pushToken.slice(0, 15),
      title: notification.title,
    });

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: notification.title,
        body: notification.body,
        sound: 'default',
        priority: 'high',
        channelId: 'caregiver-live-alerts-v1',
        data: {
          type: 'caregiver_alert',
          patientId: data.patientId,
          patientName: data.patientName,
          medicineName: data.medicineName,
          status: data.type,
          scheduledTime: data.scheduledTime,
        },
      }),
    });

    const result = await response.json();
    log.info('Expo push sunucu yanıtı', { result });

    return { success: true };
  } catch (error: any) {
    log.error('Bakıcı bildirimi gönderme hatası', error);
    return {
      success: false,
      error: error?.message || 'Bildirim gönderilemedi',
    };
  }
}

/**
 * İlaç durumu değiştiğinde bakıcıya bildir
 */
export async function notifyCaregiversAboutMedicineStatus(
  patientId: string,
  medicineName: string,
  scheduledTime: string,
  status: 'taken' | 'skipped' | 'missed' | 'snoozed'
): Promise<void> {
  try {
    const enabled = await isCaregiverNotificationsEnabled();
    if (!enabled) {
      return;
    }

    // Firestore'dan bakıcıları ve hasta profilini getir
    const { getCaregivers } = await import('./caregiverService');
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');

    let resolvedPatientName = '';
    try {
      const pDoc = await getDoc(doc(db, 'users', patientId));
      if (pDoc.exists()) {
        const pData = pDoc.data();
        resolvedPatientName = pData?.displayName || pData?.name || '';
      }
    } catch (_pErr) {
      log.debug('Patient doc read skip');
    }

    const caregivers = await getCaregivers(patientId);

    log.info('notifyCaregiversAboutMedicineStatus tetiklendi', {
      patientId,
      caregiversCount: caregivers.length,
      status,
    });

    // Bildirim almaya izin veren bakıcılara gönder
    for (const caregiver of caregivers) {
      let pushToken = caregiver.caregiverFcmToken;
      if (!pushToken && caregiver.caregiverId) {
        try {
          const cDoc = await getDoc(doc(db, 'users', caregiver.caregiverId));
          if (cDoc.exists()) {
            const cData = cDoc.data();
            pushToken = cData?.pushToken || cData?.caregiverFcmToken;
          }
        } catch (_cErr) {
          log.debug('Caregiver user doc pushToken read skip');
        }
      }

      if (caregiver.canReceiveAlerts !== false && pushToken) {
        await sendCaregiverNotification(pushToken, {
          type: status,
          patientId,
          patientName: caregiver.patientName || resolvedPatientName || 'Hastanız',
          medicineName,
          scheduledTime,
          message: `${medicineName} ilacı ${status === 'taken' ? 'alındı' : status === 'skipped' ? 'atlandı' : status === 'missed' ? 'kaçırıldı' : 'ertelendi'}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    log.error('Bakıcıları bilgilendirme hatası', error);
  }
}
