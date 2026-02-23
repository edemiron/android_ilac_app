/**
 * Caregiver Notification Service
 *
 * Bakıcılar için FCM bildirimleri gönderme servisi.
 * İlaç alındığında, atlandığında veya beklendiğinde bakıcıya bildirim gönderir.
 */

import { createScopedLogger } from '../utils/logger';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateCaregiverFcmToken } from './caregiverService';

const log = createScopedLogger('CaregiverNotifications');

const FCM_TOKEN_KEY = '@caregiver_fcm_token';
const CAREGIVER_NOTIFICATIONS_ENABLED = '@caregiver_notifications_enabled';

/**
 * FCM token'ı al ve kaydet
 */
export async function setupCaregiverNotifications(userId: string): Promise<string | null> {
  try {
    if (!userId) {
      log.warn('Kullanıcı ID yok, FCM kurulumu atlanıyor');
      return null;
    }

    const { getMessaging, getToken } = await import('firebase/messaging');

    // iOS için permission kontrolü (Expo Notifications üzerinden)
    const messaging = getMessaging();

    // FCM token al
    const fcmToken = await getToken(messaging);

    if (!fcmToken) {
      log.warn('FCM token alınamadı');
      return null;
    }

    // Token'ı kaydet
    await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);

    // Bakıcı ilişkilerini güncelle
    await updateCaregiverFcmToken(userId, fcmToken);

    log.info('FCM token başarıyla alındı', { userId });

    return fcmToken;
  } catch (error) {
    log.error('FCM kurulum hatası', error);
    return null;
  }
}

/**
 * Kayıtlı FCM token'ı getir
 */
export async function getStoredFcmToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_KEY);
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
    return enabled === 'true';
  } catch (error) {
    log.error('Bildirim ayarı okuma hatası', error);
    return false;
  }
}

/**
 * Foreground mesaj dinleyicisi
 */
export function setupCaregiverMessageListener(callback: (message: {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
}) => void): () => void {
  const messaging = getMessaging();

  const unsubscribe = onMessage(messaging, (message) => {
    log.debug('Foreground mesaj alındı', { message });
    callback(message);
  });

  return unsubscribe;
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

  const patient = patientName || 'Hasta';
  const time = new Date(scheduledTime).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  switch (type) {
    case 'missed':
      return {
        title: `${patient} İlacını Aldı mı?`,
        body: `${medicineName} (${time}) saatinde ilaç alınmadı.`,
      };
    case 'skipped':
      return {
        title: `${patient} İlacını Atladı`,
        body: `${medicineName} (${time}) saatindeki ilaç atlandı.`,
      };
    case 'taken':
      return {
        title: `${patient} İlacını Aldı`,
        body: `${medicineName} (${time}) saatinde ilaç alındı.`,
      };
    case 'snoozed':
      return {
        title: `${patient} İlacını Erteliyor`,
        body: `${medicineName} (${time}) saatindeki ilaç ertelendi.`,
      };
    case 'schedule_updated':
      return {
        title: `${patient} İlaş Programı Güncellendi`,
        body: 'İlaç programında değişiklik yapıldı.',
      };
    default:
      return {
        title: 'İlaç Hatırlatıcı',
        body: data.message,
      };
  }
}

/**
 * Bakıcıya bildirim gönder (Cloud Functions ile)
 *
 * Not: Bu fonksiyon client-side'da çalışır ancak production'da
 * Cloud Functions kullanılmalıdır. Şimdilik mock implementasyon.
 */
export async function sendCaregiverNotification(
  caregiverId: string,
  data: CaregiverNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Bakıcı bildirimleri aktif mi kontrol et
    const enabled = await isCaregiverNotificationsEnabled();
    if (!enabled) {
      return { success: false, error: 'Bakıcı bildirimleri kapalı' };
    }

    const notification = formatCaregiverNotification(data);

    // TODO: Cloud Functions ile FCM gönder
    // Şimdilik sadece log
    log.info('Bakıcı bildirimi gönderiliyor', {
      caregiverId,
      notification,
    });

    // Production'da burada Cloud Functions call yapılacak:
    // const functions = getFunctions();
    // const sendNotification = httpsCallable(functions, 'sendCaregiverNotification');
    // await sendNotification({ caregiverId, ...data });

    return { success: true };
  } catch (error) {
    log.error('Bakıcı bildirimi gönderme hatası', error);
    return {
      success: false,
      error: 'Bildirim gönderilemedi',
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
    // Bakıcı bildirimleri aktif mi kontrol et
    const enabled = await isCaregiverNotificationsEnabled();
    if (!enabled) {
      return;
    }

    // Firestore'dan bakıcıları getir
    const { getCaregivers } = await import('./caregiverService');
    const caregivers = await getCaregivers(patientId);

    // Bildirim almaya izin veren bakıcılara gönder
    for (const caregiver of caregivers) {
      if (caregiver.canReceiveAlerts && caregiver.caregiverFcmToken) {
        await sendCaregiverNotification(caregiver.caregiverId, {
          type: status,
          patientId,
          patientName: caregiver.patientName,
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
