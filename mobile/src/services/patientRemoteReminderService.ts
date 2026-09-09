/**
 * patientRemoteReminderService — Hasta İçin Uzaktan Hatırlatma Bildirimi ve Olay Dağıtıcısı
 *
 * Bakıcıdan gelen uzaktan ilaç hatırlatması (nudge) için:
 * 1. Android yüksek öncelikli sesli ve titreşimli heads-up bildirim kanalı açar.
 * 2. Notifee ile sistem bildirimi gösterir.
 * 3. Uygulama içi tam ekran modal abonelerine anlık sinyal gönderir.
 */

import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import type { RemoteReminderData } from './caregiverService';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('PatientRemoteReminderService');

export const PATIENT_REMOTE_REMINDERS_CHANNEL_ID = 'patient-remote-reminders-v1';

type PatientReminderListener = (reminder: RemoteReminderData | null) => void;
const reminderListeners = new Set<PatientReminderListener>();
let currentActiveReminder: RemoteReminderData | null = null;

/**
 * Android bildirim kanalını güvenceye al
 */
export async function ensurePatientRemoteReminderChannel(): Promise<void> {
  try {
    await notifee.createChannel({
      id: PATIENT_REMOTE_REMINDERS_CHANNEL_ID,
      name: 'Bakıcı İlaç Hatırlatmaları',
      description: 'Bakıcınızdan gelen acil ve canlı ilaç hatırlatma mesajları',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#0D9488',
    });
  } catch (err) {
    log.error('Patient reminder channel creation error', err);
  }
}

/**
 * Gelen uzaktan hatırlatmayı tetikle (Sistem bildirimi + Tam ekran modal)
 */
export async function triggerPatientRemoteReminder(data: RemoteReminderData): Promise<void> {
  log.info('triggerPatientRemoteReminder tetiklendi', data);
  currentActiveReminder = data;

  // 1. Sistem Heads-Up Bildirimi
  try {
    await ensurePatientRemoteReminderChannel();

    const title = `🔔 ${data.caregiverName} İlaç Hatırlatması Gönderdi!`;
    const message = data.customMessage
      ? `"${data.customMessage}"`
      : `${data.medicineName} (${data.scheduledTime}) ilacınızı almayı unutmayın.`;

    await notifee.displayNotification({
      title,
      body: message,
      android: {
        channelId: PATIENT_REMOTE_REMINDERS_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        color: '#0D9488',
        smallIcon: 'ic_launcher',
      },
    });
  } catch (err) {
    log.warn('Sistem bildirimi gösterilemedi', err);
  }

  // 2. Uygulama içi dinleyicileri uyar
  reminderListeners.forEach(listener => {
    try {
      listener(data);
    } catch (listenerErr) {
      log.error('Reminder listener callback error', listenerErr);
    }
  });
}

/**
 * UI Bileşenlerinin canlı hatırlatıcıya abone olması
 */
export function subscribeToActivePatientReminder(listener: PatientReminderListener): () => void {
  reminderListeners.add(listener);
  if (currentActiveReminder) {
    listener(currentActiveReminder);
  }
  return () => {
    reminderListeners.delete(listener);
  };
}

/**
 * Aktif hatırlatıcıyı temizle (Kapat / İşlem yapıldı)
 */
export function clearCurrentActivePatientReminder(): void {
  currentActiveReminder = null;
  reminderListeners.forEach(listener => {
    try {
      listener(null);
    } catch (err) {
      log.error('Error clearing active reminder', err);
    }
  });
}

export function getCurrentActivePatientReminder(): RemoteReminderData | null {
  return currentActiveReminder;
}
