/**
 * Bildirim kanalları (channels) modülü.
 *
 * Android 8+ Oreo'dan itibaren tüm bildirimler channel üzerinden gönderilir.
 * Channel versiyonu (CHANNEL_VERSION) değişirse Android yeni channel oluşturur
 * ve eski ses/öncelik ayarları yeni channel'a geçer (gerekli kalmazsa geri alınabilir).
 *
 * NOT: Bu modül Sprint 3'te (notifications.ts modüler bölünme) oluşturuldu.
 * Geri kalan scheduler/diagnostics/miui modülleri Sprint 4+ takip edecek.
 */

import { Platform } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { createScopedLogger } from '../logger';

const log = createScopedLogger('Notifications.Channels');

// Kanal ID'leri - Versiyon değişince yeni kanal oluşur (ses ayarı için gerekli)
export const CHANNEL_VERSION = 'v4';
export const ALARM_CHANNEL_ID = `medicine-alarms-${CHANNEL_VERSION}`;
export const ALARM_NO_VIBRATION_CHANNEL_ID = `medicine-alarms-no-vibration-${CHANNEL_VERSION}`;
export const REMINDER_CHANNEL_ID = `medicine-reminders-${CHANNEL_VERSION}`;
export const REMINDER_NO_VIBRATION_CHANNEL_ID = `medicine-reminders-no-vibration-${CHANNEL_VERSION}`;

/**
 * Bildirim kanallarını oluştur (idempotent — zaten varsa dokunmaz).
 * iOS'ta no-op (iOS notification channels kullanmaz).
 */
export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Ilac Alarmlari',
      description: 'Kritik ilac hatirlatmalari - sessiz modda bile calar',
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
      name: 'Ilac Alarmlari (Sessiz Titre?im)',
      description: 'Kritik ilac hatirlatmalari - titre?im kapali',
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
      name: 'Ilac Hatirlatmalari',
      description: 'Normal ilac hatirlatmalari',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PRIVATE,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: REMINDER_NO_VIBRATION_CHANNEL_ID,
      name: 'Ilac Hatirlatmalari (Sessiz Titre?im)',
      description: 'Normal ilac hatirlatmalari - titre?im kapali',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PRIVATE,
      sound: 'default',
      vibration: false,
    });

    log.debug('Notifee bildirim kanallari olusturuldu');
  } catch (error) {
    log.error('Kanal olusturma hatasi', error);
  }
}
