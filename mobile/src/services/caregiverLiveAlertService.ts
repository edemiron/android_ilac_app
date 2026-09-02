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
import { playAlarmSound, stopAlarmSound } from '../utils/alarmSoundManager';

const log = createScopedLogger('CaregiverLiveAlertService');

export const CAREGIVER_ALERTS_CHANNEL_ID = 'caregiver-live-alerts-v1';

export interface LiveCaregiverAlertData {
  alertId?: string;
  patientId: string;
  patientName: string;
  medicineName: string;
  status: 'taken' | 'skipped' | 'missed' | 'snoozed' | 'sos';
  scheduledTime?: string;
  takenAt?: string;
  timestamp: number;
}

type AlertListener = (alert: LiveCaregiverAlertData | null) => void;
const listeners = new Set<AlertListener>();
const dismissedAlertIds = new Set<string>();

let currentActiveAlert: LiveCaregiverAlertData | null = null;

export function markAlertDismissed(alertId?: string): void {
  if (alertId && typeof alertId === 'string' && alertId.trim() && alertId !== '_') {
    dismissedAlertIds.add(alertId.trim());
  }
}

export function isAlertDismissed(alertId?: string): boolean {
  if (!alertId || typeof alertId !== 'string' || !alertId.trim() || alertId === '_') return false;
  return dismissedAlertIds.has(alertId.trim());
}

export function isCaregiverAlertDismissed(data: Partial<LiveCaregiverAlertData>): boolean {
  if (!data) return false;
  if (data.alertId && isAlertDismissed(data.alertId)) return true;
  if (data.patientId) {
    if (data.alertId && isAlertDismissed(`${data.patientId}_${data.alertId}`)) return true;
    if (data.scheduledTime && isAlertDismissed(`${data.patientId}_${data.scheduledTime}`))
      return true;
    if (data.takenAt && isAlertDismissed(`${data.patientId}_${data.takenAt}`)) return true;
  }
  return false;
}

/**
 * Bakıcı bildirim kanalını hazırla
 */
export async function ensureCaregiverAlertChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.createChannel({
      id: CAREGIVER_ALERTS_CHANNEL_ID,
      name: 'Hasta & Yakın İlaç Bildirimleri',
      description: 'Takip ettiğiniz hastaların ilaç alma/atlama ve acil durum canlı bildirimleri',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#DC2626',
    });
  } catch (err) {
    log.error('Caregiver channel creation error', err);
  }
}

/**
 * Yeni bir canlı doz veya acil durum uyarısı fırlat (Sistem bildirimi + Sesli Alarm + Uygulama içi modal)
 */
export async function triggerCaregiverLiveAlert(data: LiveCaregiverAlertData): Promise<void> {
  if (isCaregiverAlertDismissed(data)) {
    console.warn(
      '🚨 [CaregiverLiveAlertService] Alert already dismissed, ignoring:',
      data.alertId,
      data.patientId
    );
    return;
  }

  // Eğer zaten birebir aynı alert ekranda açıksa tekrar tetikleme
  if (
    currentActiveAlert &&
    ((data.alertId && currentActiveAlert.alertId === data.alertId) ||
      (data.patientId === currentActiveAlert.patientId &&
        data.scheduledTime === currentActiveAlert.scheduledTime &&
        data.status === currentActiveAlert.status) ||
      (data.status === 'sos' &&
        currentActiveAlert.status === 'sos' &&
        data.patientId === currentActiveAlert.patientId))
  ) {
    console.warn(
      '🚨 [CaregiverLiveAlertService] Same alert already active, ignoring duplicate trigger'
    );
    return;
  }

  console.warn('🚨 [CaregiverLiveAlertService] triggerCaregiverLiveAlert:', JSON.stringify(data));
  currentActiveAlert = data;

  const isTaken = data.status === 'taken';
  const isSkipped = data.status === 'skipped';
  const isSos = data.status === 'sos';

  // 1. Uygulama içi dinleyicileri ANINDA tetikle (Tam Ekran Modal hiç beklemeden açılsın)
  listeners.forEach(listener => {
    try {
      listener(data);
    } catch (lErr) {
      console.error('Listener callback hatası', lErr);
    }
  });

  // 2. Eğer SOS acil çağrısı ise yüksek sesli panik alarmını arka planda başlat
  if (isSos) {
    playAlarmSound(100, 'urgent_alert', true).catch(soundErr => {
      log.warn('SOS alarm sesi başlatılamadı', soundErr);
    });
  }

  // 3. Sistem Heads-Up Bildirimi (Arka planda çalışsın)
  ensureCaregiverAlertChannel()
    .then(async () => {
      try {
        const title = isSos
          ? `🚨 ACİL DURUM: ${data.patientName} Yardım İstiyor!`
          : isTaken
            ? `🎉 ${data.patientName} İlacını Aldı!`
            : isSkipped
              ? `⚠️ ${data.patientName} İlacını Atladı`
              : `⏰ ${data.patientName} - İlaç Bildirimi`;

        const timeFormatted = (() => {
          if (!data.scheduledTime) return '';
          const trimmed = data.scheduledTime.trim();
          if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
            return trimmed;
          }
          if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
            return trimmed.slice(0, 5);
          }
          const parsedDate = new Date(trimmed);
          if (!isNaN(parsedDate.getTime())) {
            return `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;
          }
          return trimmed;
        })();
        const timeStr = timeFormatted ? ` (${timeFormatted})` : '';

        const body = isSos
          ? `${data.patientName} acil durum çağrısında bulundu. Lütfen hemen arayın!`
          : isTaken
            ? `${data.medicineName}${timeStr} dozunu başarıyla tamamladı.`
            : isSkipped
              ? `${data.medicineName}${timeStr} dozunu atladı.`
              : `${data.medicineName} için işlem yapıldı.`;

        const notificationId = isSos
          ? `sos_${data.alertId || data.timestamp || Date.now()}`
          : `med_log_${data.patientId || 'p'}_${data.scheduledTime || ''}_${data.status}`;

        const notificationTag = isSos
          ? `sos_${data.alertId || 'sos'}`
          : `caregiver_log_${data.patientId || 'p'}`;

        await notifee.displayNotification({
          id: notificationId,
          title,
          body,
          android: {
            channelId: CAREGIVER_ALERTS_CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            tag: notificationTag,
            pressAction: {
              id: 'default',
            },
            color: isSos ? '#DC2626' : isTaken ? '#10B981' : '#EF4444',
            smallIcon: 'ic_launcher',
            vibrationPattern: isSos ? [0, 500, 200, 500, 200, 500] : [0, 250, 250, 250],
          },
        });
      } catch (err) {
        log.warn('Sistem bildirimi gösterilemedi', err);
      }
    })
    .catch(() => {});
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
  listeners.forEach(listener => {
    try {
      listener(null);
    } catch (_e) {
      // ignore
    }
  });
  try {
    stopAlarmSound();
  } catch (_e) {
    // ignore
  }
}
