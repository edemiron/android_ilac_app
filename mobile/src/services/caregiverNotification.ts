/**
 * Caregiver local notification — Sprint 70.
 *
 * Zengin (action button'lu) caregiver notification gönderimi.
 * FCM token yoksa cihazda local notification gösterir. Bu, caregiver
 * uygulamayı telefona yüklediğinde (örn. aile bireyi) çalışır.
 *
 * Action button'lar:
 *   - "Hasta aldı" → sadece dismiss (log)
 *   - "Ara" → telefon arama intent'i (ileride)
 *
 * Production'da: Cloud Functions üzerinden FCM push notification
 * tercih edilmeli (caregiverService.notifyCaregivers). Bu helper sadece
 * caregiver phone'da uygulama varsa çalışan local fallback.
 */

import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';
import { createScopedLogger } from '../utils/logger';
import { formatCaregiverNotification } from './caregiverHelpers';

const log = createScopedLogger('CaregiverNotification');

export type CaregiverNotificationType = 'missed' | 'skipped' | 'taken' | 'snoozed';

export const CAREGIVER_LOCAL_CHANNEL_ID = 'caregiver-alerts-local-v1';
export const CAREGIVER_ACTION_TAKEN = 'CAREGIVER_ACTION_TAKEN';
export const CAREGIVER_ACTION_CALL = 'CAREGIVER_ACTION_CALL';

let channelCreated = false;

/**
 * Caregiver local channel'ı idempotent olarak oluştur.
 * Android 8+ Oreo channel zorunluluğu için.
 */
export async function createCaregiverLocalChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelCreated) return;
  try {
    await notifee.createChannel({
      id: CAREGIVER_LOCAL_CHANNEL_ID,
      name: 'Bakıcı Bildirimleri (Yerel)',
      description: 'Hastanın ilaç durumu hakkında bakıcıya yerel bildirimler',
      importance: AndroidImportance.DEFAULT,
      visibility: AndroidVisibility.PUBLIC,
    });
    channelCreated = true;
  } catch (error) {
    log.error('Caregiver local channel oluşturulamadı', error);
  }
}

/**
 * Caregiver'a zengin notification gönder.
 * Action button'lu, tıklanabilir, deep-link destekli.
 */
export async function notifyCaregiverLocally(params: {
  type: CaregiverNotificationType;
  medicineName: string;
  language?: 'tr' | 'en';
}): Promise<string | null> {
  try {
    await createCaregiverLocalChannel();

    const content = formatCaregiverNotification(
      params.type,
      params.medicineName,
      params.language ?? 'tr'
    );

    const notificationId = await notifee.displayNotification({
      title: content.title,
      body: content.body,
      android: {
        channelId: CAREGIVER_LOCAL_CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
        visibility: AndroidVisibility.PUBLIC,
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#0D9488',
        colorized: true,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        actions: [
          {
            title: 'Hasta Aldı',
            pressAction: { id: CAREGIVER_ACTION_TAKEN },
          },
          {
            title: 'Ara',
            pressAction: { id: CAREGIVER_ACTION_CALL },
          },
        ],
      },
      ios: {
        categoryId: 'caregiver_alert',
        sound: 'default',
      },
      data: {
        type: content.type,
        medicineName: params.medicineName,
      },
    });

    log.info('Caregiver local notification gönderildi', {
      notificationId,
      type: content.type,
      medicineName: params.medicineName,
    });
    return notificationId;
  } catch (error) {
    log.error('Caregiver local notification gönderilemedi', error);
    return null;
  }
}

/**
 * Caregiver local notification'ı iptal et.
 */
export async function cancelCaregiverLocalNotification(notificationId: string): Promise<void> {
  try {
    await notifee.cancelNotification(notificationId);
  } catch (error) {
    log.warn('Caregiver local notification iptal edilemedi', {
      notificationId,
      error,
    });
  }
}
