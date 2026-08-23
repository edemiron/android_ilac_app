/**
 * Bildirim kanalları (channels) modülü.
 *
 * Android 8+ Oreo'dan itibaren tüm bildirimler channel üzerinden gönderilir.
 * Her melodi için özel Android Notification Channel oluşturularak kullanıcının
 * seçtiği alarm sesinin sistem kilit ekranı bildiriminde de doğru çalması sağlanır.
 */

import { Platform } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { createScopedLogger } from '../logger';
import { ALARM_SOUND_LIST, resolveSoundFile } from '../alarmSoundManager';

const log = createScopedLogger('Notifications.Channels');

// Kanal ID'leri - Versiyon değişince yeni kanal oluşur (ses ayarı için gerekli)
export const CHANNEL_VERSION = 'v5';
export const ALARM_CHANNEL_ID = `medicine-alarms-${CHANNEL_VERSION}`;
export const ALARM_NO_VIBRATION_CHANNEL_ID = `medicine-alarms-no-vibration-${CHANNEL_VERSION}`;
export const REMINDER_CHANNEL_ID = `medicine-reminders-${CHANNEL_VERSION}`;
export const REMINDER_NO_VIBRATION_CHANNEL_ID = `medicine-reminders-no-vibration-${CHANNEL_VERSION}`;

export function getSoundResourceName(soundId?: string): string {
  const file = resolveSoundFile(soundId);
  return file.replace(/\.(wav|mp3|ogg)$/, '');
}

export function getAlarmChannelId(soundId?: string, vibration: boolean = true): string {
  const soundRes = getSoundResourceName(soundId);
  return `medicine-alarms-${soundRes}-${vibration ? 'vib' : 'novib'}-${CHANNEL_VERSION}`;
}

/**
 * Bildirim kanallarını oluştur (idempotent — zaten varsa dokunmaz).
 * iOS'ta no-op (iOS notification channels kullanmaz).
 */
export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // 1. Standart Kanallar
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'İlaç Alarmları',
      description: 'Kritik ilaç hatırlatmaları - sessiz modda bile çalar',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PRIVATE,
      sound: 'alarm',
      vibration: true,
      lights: true,
      lightColor: '#FF0000',
      bypassDnd: true,
    });

    await notifee.createChannel({
      id: ALARM_NO_VIBRATION_CHANNEL_ID,
      name: 'İlaç Alarmları (Sessiz Titreşim)',
      description: 'Kritik ilaç hatırlatmaları - titreşim kapalı',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PRIVATE,
      sound: 'alarm',
      vibration: false,
      lights: true,
      lightColor: '#FF0000',
      bypassDnd: true,
    });

    await notifee.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'İlaç Hatırlatmaları',
      description: 'Normal ilaç hatırlatmaları',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PRIVATE,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: REMINDER_NO_VIBRATION_CHANNEL_ID,
      name: 'İlaç Hatırlatmaları (Sessiz Titreşim)',
      description: 'Normal ilaç hatırlatmaları - titreşim kapalı',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PRIVATE,
      sound: 'default',
      vibration: false,
    });

    // 2. Her Melodi İçin Özel Alarm Kanalları
    for (const sound of ALARM_SOUND_LIST) {
      const soundRes = getSoundResourceName(sound.id);

      await notifee.createChannel({
        id: `medicine-alarms-${soundRes}-vib-${CHANNEL_VERSION}`,
        name: `İlaç Alarmı (${sound.nameTr})`,
        description: `Kritik ilaç hatırlatmaları - ${sound.nameTr}`,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PRIVATE,
        sound: soundRes,
        vibration: true,
        lights: true,
        lightColor: '#FF0000',
        bypassDnd: true,
      });

      await notifee.createChannel({
        id: `medicine-alarms-${soundRes}-novib-${CHANNEL_VERSION}`,
        name: `İlaç Alarmı (${sound.nameTr} - Titreşimsiz)`,
        description: `Kritik ilaç hatırlatmaları - ${sound.nameTr}`,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PRIVATE,
        sound: soundRes,
        vibration: false,
        lights: true,
        lightColor: '#FF0000',
        bypassDnd: true,
      });
    }

    log.debug('Notifee bildirim kanallari basariyla olusturuldu');
  } catch (error) {
    log.error('Kanal olusturma hatasi', error);
  }
}
