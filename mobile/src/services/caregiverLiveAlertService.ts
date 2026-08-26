/**
 * CaregiverLiveAlertService — Bakıcılar için Gerçek Zamanlı Doz Bildirimi & Alarm Servisi
 *
 * Hasta ilacını aldığında, atladığında veya ertelediğinde:
 * 1. Android/iOS sistem seviyesinde yüksek öncelikli sesli/titreşimli bildirim fırlatır.
 * 2. Uygulama içi tam ekran canlı uyarı modalını tetikler.
 */

import { Platform } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('CaregiverLiveAlertService');

export const CAREGIVER_ALERTS_CHANNEL_ID = 'caregiver-live-alerts-v1';

export interface LiveCaregiverAlertData {
  patientId: string;
  patientName: string;
  medicineName: string;
  status: 'taken' | 'skipped' | 'missed' | 'snoozed';
  scheduledTime?: string;
  takenAt?: string;
  timestamp: number;
}

type AlertListener = (alert: LiveCaregiverAlertData) => void;
const listeners = new Set<AlertListener>();

let currentActiveAlert: LiveCaregiverAlertData | null = null;

/**
 * Bakıcı bildirim kanalını hazırla
 */
export async function ensureCaregiverAlertChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.createChannel({
      id: CAREGIVER_ALERTS_CHANNEL_ID,
      name: 'Hasta & Yakın İlaç Bildirimleri',
      description: 'Takip ettiğiniz hastaların ilaç alma/atlama canlı bildirimleri',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#0D9488',
    });
  } catch (err) {
    log.error('Caregiver channel creation error', err);
  }
}

/**
 * Yeni bir canlı doz uyarısı fırlat (Sistem bildirimi + Uygulama içi modal tetikleyici)
 */
export async function triggerCaregiverLiveAlert(data: LiveCaregiverAlertData): Promise<void> {
  log.info('triggerCaregiverLiveAlert tetiklendi', data);
  currentActiveAlert = data;

  // 1. Sistem Heads-Up Bildirimi
  try {
    await ensureCaregiverAlertChannel();

    const isTaken = data.status === 'taken';
    const isSkipped = data.status === 'skipped';

    const title = isTaken
      ? `🎉 ${data.patientName} İlacını Aldı!`
      : isSkipped
        ? `⚠️ ${data.patientName} İlacını Atladı`
        : `⏰ ${data.patientName} - İlaç Bildirimi`;

    const timeStr = data.scheduledTime
      ? ` (${data.scheduledTime.includes('T') ? data.scheduledTime.split('T')[1].slice(0, 5) : data.scheduledTime})`
      : '';

    const body = isTaken
      ? `${data.medicineName}${timeStr} dozunu başarıyla tamamladı.`
      : isSkipped
        ? `${data.medicineName}${timeStr} dozunu atladı.`
        : `${data.medicineName} için işlem yapıldı.`;

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: CAREGIVER_ALERTS_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        color: isTaken ? '#10B981' : '#EF4444',
        smallIcon: 'ic_launcher',
      },
    });
  } catch (err) {
    log.warn('Sistem bildirimi gösterilemedi', err);
  }

  // 2. Uygulama içi dinleyicileri tetikle (Tam Ekran Modal)
  listeners.forEach(listener => {
    try {
      listener(data);
    } catch (lErr) {
      log.error('Listener callback hatası', lErr);
    }
  });
}

/**
 * Canlı doz alert dinleyicisi ekle
 */
export function subscribeToLiveCaregiverAlerts(listener: AlertListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Aktif alert'i getir / temizle
 */
export function getCurrentActiveAlert(): LiveCaregiverAlertData | null {
  return currentActiveAlert;
}

export function clearCurrentActiveAlert(): void {
  currentActiveAlert = null;
}
