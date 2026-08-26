import { AppRegistry } from 'react-native';
import notifee, {
  EventType,
  Event,
  TriggerType,
  AlarmType,
  AndroidImportance,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

import App from './App';
import { registerBootTask } from './src/utils/bootHandler';
import { useMedicineStore } from './src/stores/medicineStore';
import { stopAlarmSound } from './src/utils/alarmSoundManager';
import { stopSpeaking } from './src/utils/speech';
import { STORAGE_KEYS, CHANNELS } from './src/constants';

const appName = 'main';

registerBootTask();

// ============================================================
// FIREBASE CLOUD MESSAGING (FCM) BACKGROUND HANDLER
// Uygulama kapalıyken veya arka plandayken gelen push bildirimleri
// doğrudan Notifee ile sistem bildirim çubuğunda sesli/titreşimli açar.
// ============================================================
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM Background] Mesaj alındı:', remoteMessage);
  try {
    const data = (remoteMessage.data as any) || {};
    const title =
      remoteMessage.notification?.title || (data?.title as string) || 'İlaç Hatırlatıcı';
    const body = remoteMessage.notification?.body || (data?.body as string) || '';
    const channelId = (data?.channelId as string) || 'caregiver-live-alerts-v1';

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        pressAction: {
          id: 'default',
        },
      },
      data: data,
    });
  } catch (e) {
    console.error('[FCM Background] Bildirim gösterme hatası:', e);
  }
});

// ============================================================
// HANDLED ALARMS SET
// Background'da aksiyon alınan alarm ID'leri burada tutulur.
// Uygulama açılınca foreground handler bu set'i kontrol eder.
// AsyncStorage'a da yazılır (uygulama cold start için).
// ============================================================
const handledAlarmsMemory = new Set<string>();

async function markAlarmHandled(alarmKey: string): Promise<void> {
  handledAlarmsMemory.add(alarmKey);
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HANDLED_ALARMS);
    const arr: { key: string; ts: number }[] = raw ? JSON.parse(raw) : [];
    arr.push({ key: alarmKey, ts: Date.now() });
    // Son 20 kaydı tut
    const trimmed = arr.slice(-20);
    await AsyncStorage.setItem(STORAGE_KEYS.HANDLED_ALARMS, JSON.stringify(trimmed));
  } catch (_e) {
    /* ignore */
  }
}

export async function isAlarmHandled(alarmKey: string): Promise<boolean> {
  // Önce memory'den kontrol (hızlı)
  if (handledAlarmsMemory.has(alarmKey)) return true;
  // Sonra AsyncStorage (cold start)
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HANDLED_ALARMS);
    if (!raw) return false;
    const arr: { key: string; ts: number }[] = JSON.parse(raw);
    // 5 dakika içinde handle edildiyse geçerli
    const found = arr.find(a => a.key === alarmKey && Date.now() - a.ts < 5 * 60 * 1000);
    if (found) {
      handledAlarmsMemory.add(alarmKey);
      return true;
    }
  } catch (_e) {
    /* ignore */
  }
  return false;
}

export async function clearHandledAlarms(): Promise<void> {
  handledAlarmsMemory.clear();
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.HANDLED_ALARMS);
  } catch (_e) {
    /* ignore */
  }
}

// ============================================================
// HELPER: Snooze ayarlarını AsyncStorage'dan oku
// ============================================================
async function getSnoozeSettings(): Promise<{ snoozeDuration: number; maxSnoozeCount: number }> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_STORAGE);
    if (stored) {
      const parsed = JSON.parse(stored);
      const sd = parsed?.state?.settings?.snoozeDuration;
      const mc = parsed?.state?.settings?.maxSnoozeCount;
      return {
        snoozeDuration: typeof sd === 'number' && sd > 0 ? sd : 5,
        maxSnoozeCount: typeof mc === 'number' && mc > 0 ? mc : 3,
      };
    }
  } catch (_e) {
    /* ignore */
  }
  return { snoozeDuration: 5, maxSnoozeCount: 3 };
}

// ============================================================
// HELPER: Alarm key oluştur (medicineId-reminderTimeId-tarih)
// ============================================================
function getAlarmKey(data: any): string {
  const medId = data?.medicineId || 'unknown';
  const remId = data?.reminderTimeId || 'unknown';
  const today = new Date().toISOString().split('T')[0];
  return `${medId}-${remId}-${today}`;
}

// ============================================================
// HELPER: Bildirimi iptal et
// ============================================================
async function cancelAlarmCompletely(notification: any): Promise<void> {
  if (notification?.id) {
    try {
      await notifee.cancelNotification(notification.id);
    } catch (_e) {
      /* */
    }
    try {
      await notifee.cancelDisplayedNotification(notification.id);
    } catch (_e) {
      /* */
    }
  }
  const medId = notification?.data?.medicineId as string;
  const remId = notification?.data?.reminderTimeId as string;
  if (medId && remId) {
    const alarmId = `alarm-${medId}-${remId}`;
    try {
      await notifee.cancelNotification(alarmId);
    } catch (_e) {
      /* */
    }
    try {
      await notifee.cancelDisplayedNotification(alarmId);
    } catch (_e) {
      /* */
    }
  }
}

// ============================================================
// BACKGROUND EVENT HANDLER
// Uygulama kapalıyken/arka plandayken çalışır.
// ============================================================
notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
  const { notification, pressAction } = detail;

  console.log('[BG] Event:', EventType[type], notification?.id, pressAction?.id);

  // DELIVERED — Bildirim teslim edildi
  if (type === EventType.DELIVERED) {
    console.log(
      '[BG] DELIVERED:',
      notification?.id,
      'fullScreen:',
      notification?.data?.fullScreenAlarm
    );
    if (notification?.data?.fullScreenAlarm === 'true') {
      const isTest =
        notification.data?.isTestAlarm === 'true' ||
        notification.data?.medicineId === 'test-medicine';
      const key = getAlarmKey(notification.data);
      const handled = !isTest && (await isAlarmHandled(key));
      if (handled) {
        console.log('[BG] SKIP: Alarm already handled:', key);
        if (notification.id) {
          try {
            await notifee.cancelDisplayedNotification(notification.id);
          } catch (_e) {
            /* */
          }
        }
        return;
      }
      // pending-alarm AsyncStorage'a yaz
      try {
        const pendingData = {
          medicineId: notification.data?.medicineId as string,
          reminderTimeId: notification.data?.reminderTimeId as string,
          scheduledTime: (notification.data?.scheduledTime as string) || new Date().toISOString(),
          originalScheduledTime: notification.data?.originalScheduledTime as string | undefined,
          isSnooze: notification.data?.isSnooze as string | undefined,
          snoozeId: notification.data?.snoozeId as string | undefined,
          snoozeCount: notification.data?.snoozeCount as string | undefined,
          ts: Date.now(),
        };
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ALARM, JSON.stringify(pendingData));
        console.log(
          '[BG] pending-alarm SAVED:',
          pendingData.medicineId,
          'snoozeCount:',
          pendingData.snoozeCount
        );
      } catch (_e) {
        console.log('[BG] pending-alarm SAVE FAILED');
      }
      // Native modül ile ekranı aç
      try {
        const { NativeModules } = require('react-native');
        const { AlarmModule } = NativeModules;
        if (AlarmModule) {
          await AlarmModule.wakeAndOpenApp({
            medicineId: notification.data?.medicineId as string,
            reminderTimeId: notification.data?.reminderTimeId as string,
            scheduledTime: (notification.data?.scheduledTime as string) || new Date().toISOString(),
          });
          console.log('[BG] wakeAndOpenApp OK');
        } else {
          const { Linking } = require('react-native');
          await Linking.openURL('ilachatirlatici://alarm');
          console.log('[BG] deeplink fallback OK');
        }
      } catch (_e) {
        console.log('[BG] wake FAILED, relying on fullScreenAction');
      }
    }
    return;
  }

  // PRESS — Kullanıcı bildirime tıkladı, uygulama açılacak
  if (type === EventType.PRESS) {
    return;
  }

  // DISMISSED — Kullanıcı bildirimi kaydırarak kapattı
  if (type === EventType.DISMISSED && notification) {
    const key = getAlarmKey(notification.data);
    await markAlarmHandled(key);
    await cancelAlarmCompletely(notification);
    return;
  }

  // ACTION_PRESS — Bildirim butonuna basıldı
  if (type === EventType.ACTION_PRESS && pressAction && notification) {
    const actionId = pressAction.id;
    const data = notification.data;
    const medicineId = data?.medicineId as string;
    const reminderTimeId = data?.reminderTimeId as string;
    const key = getAlarmKey(data);

    console.log('[BG] ACTION:', actionId, 'med:', medicineId, 'rem:', reminderTimeId, 'key:', key);

    // 1. Flag set et — foreground'da tekrar tetiklenmesin
    await markAlarmHandled(key);

    // 2. Bildirimi tamamen iptal et
    await cancelAlarmCompletely(notification);

    // 3. Ses/titreşim durdur
    try {
      stopAlarmSound();
    } catch (_e) {
      /* */
    }
    try {
      stopSpeaking();
    } catch (_e) {
      /* */
    }

    if (actionId === 'take' || actionId === 'taken') {
      console.log('[BG] İlaç alındı:', medicineId);
      try {
        useMedicineStore
          .getState()
          .logMedicineTaken(
            reminderTimeId,
            (data?.scheduledTime as string) || new Date().toISOString(),
            medicineId
          );
      } catch (_e) {
        /* ignore */
      }
    } else if (actionId === 'skip') {
      console.log('[BG] İlaç atlandı:', medicineId);
      try {
        useMedicineStore
          .getState()
          .logMedicineSkipped(
            reminderTimeId,
            (data?.scheduledTime as string) || new Date().toISOString(),
            medicineId
          );
      } catch (_e) {
        /* ignore */
      }
    } else if (actionId === 'snooze') {
      console.log('[BG] Erteleniyor:', medicineId);
      try {
        const { snoozeDuration, maxSnoozeCount } = await getSnoozeSettings();
        const snoozeCount = parseInt((data?.snoozeCount as string) || '0', 10) + 1;

        // Erteleme limiti kontrolü — son hakta ilaç atlanmış sayılır
        if (snoozeCount >= maxSnoozeCount) {
          console.log('[BG] Erteleme limiti doldu, ilaç atlanıyor:', medicineId);
          try {
            useMedicineStore
              .getState()
              .logMedicineSkipped(
                reminderTimeId,
                (data?.scheduledTime as string) || new Date().toISOString(),
                medicineId
              );
          } catch (_e) {
            /* ignore */
          }
          return;
        }

        const triggerTime = new Date(Date.now() + snoozeDuration * 60 * 1000);
        const snoozeId = `bg-${Date.now()}`;
        const notifId = `snooze-${snoozeId}`;
        const timeStr = triggerTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const medicineName =
          notification.title
            ?.replace('💊 ', '')
            .replace(/\(Ertelendi.*\)/, '')
            .trim() || 'İlaç';

        await notifee.createTriggerNotification(
          {
            id: notifId,
            title: `🔔 ${medicineName} (Ertelendi${snoozeCount > 1 ? ` x${snoozeCount}` : ''})`,
            subtitle: timeStr,
            body: `${notification.body?.split('\n')[0] || 'İlacınızı almayı unutmayın!'}\n⏰ ${timeStr}`,
            android: {
              ...(notification.android || {}),
              channelId: CHANNELS.ALARM,
            },
            data: {
              medicineId,
              reminderTimeId,
              scheduledTime: triggerTime.toISOString(),
              originalScheduledTime:
                (data?.originalScheduledTime as string) ||
                (data?.scheduledTime as string) ||
                new Date().toISOString(),
              isSnooze: 'true',
              snoozeId,
              snoozeCount: String(snoozeCount),
              fullScreenAlarm: 'true',
            },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: triggerTime.getTime(),
            alarmManager: { allowWhileIdle: true, type: AlarmType.SET_ALARM_CLOCK },
          }
        );

        // Store'a kaydet
        try {
          useMedicineStore
            .getState()
            .createSnooze(
              medicineId,
              reminderTimeId,
              (data?.originalScheduledTime as string) ||
                (data?.scheduledTime as string) ||
                new Date().toISOString(),
              triggerTime,
              notifId
            );
        } catch (_e) {
          /* ignore */
        }

        console.log('[BG] Snooze planlandı:', notifId, triggerTime.toISOString());
      } catch (e) {
        console.error('[BG] Snooze hatası:', e);
      }
    }
    // 'stop' veya diğer aksiyonlar — zaten cancelAlarmCompletely ile iptal edildi
  }
});

// ============================================================
AppRegistry.registerComponent(appName, () => App);
