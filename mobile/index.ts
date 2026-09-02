import { AppRegistry } from 'react-native';
import notifee, {
  EventType,
  Event,
  TriggerType,
  AlarmType,
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

import App from './App';
import { registerBootTask } from './src/utils/bootHandler';
import { useMedicineStore } from './src/stores/medicineStore';
import { stopAlarmSound } from './src/utils/alarmSoundManager';
import { stopSpeaking } from './src/utils/speech';
import { STORAGE_KEYS } from './src/constants';
// Kanal kimliklerinin tek kaynagi. ONEMLI: bu dosya notifee ARKA PLAN
// handler'ini kaydeder; eskiden `CHANNELS.ALARM` uzerinden eski `-v4` kanalina
// bildirim gonderiyordu (uygulama kapaliyken calan alarm yolu).
import { ALARM_CHANNEL_ID, EMERGENCY_SOS_CHANNEL_ID } from './src/utils/notifications/channels';
import { wakeAndOpenApp } from './src/utils/notifications/wake';
// "Bu doz bugun zaten alindi mi?" kararinin TEK KAYNAGI. Eskiden bu dosyada
// kendi kopyasi vardi ve `reminderTimeId || medicineId` OR'u yuzunden ilacin
// herhangi bir dozu kaydedilince o gunun DIGER dozlarinin alarmi da
// susturuluyordu (bkz. src/domain/doseLog.ts dosya basi).
import { isDoseLogged, getLocalDateKey } from './src/domain/doseLog';

const appName = 'main';

registerBootTask();

// ============================================================
// FIREBASE CLOUD MESSAGING (FCM) BACKGROUND HANDLER
// Uygulama kapalıyken veya arka plandayken gelen push bildirimleri
// doğrudan Notifee ile sistem bildirim çubuğunda sesli/titreşimli açar.
// Acil Durum (SOS) çağrılarında yüksek öncelikli siren ve kilit ekranı uyarısı verir.
// ============================================================
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM Background] Mesaj alındı:', remoteMessage);
  try {
    const data = (remoteMessage.data as any) || {};
    const isEmergency =
      data?.type === 'emergency_sos' ||
      data?.type === 'EMERGENCY_SOS' ||
      data?.type === 'emergency';

    const title =
      remoteMessage.notification?.title ||
      (data?.title as string) ||
      (isEmergency ? '🚨 ACİL DURUM ÇAĞRISI!' : 'İlaç Hatırlatıcı');

    const patientName = (data?.patientName as string) || 'Hastanız';
    const body =
      remoteMessage.notification?.body ||
      (data?.body as string) ||
      (data?.message as string) ||
      (isEmergency ? `${patientName} acil durum butonuna basarak yardım talep etti!` : '');

    const channelId = isEmergency
      ? EMERGENCY_SOS_CHANNEL_ID
      : (data?.channelId as string) || 'caregiver-live-alerts-v6';

    const sound = isEmergency ? 'sound_urgent_alert' : 'default';

    try {
      await notifee.createChannel({
        id: channelId,
        name: isEmergency ? '🚨 Acil Durum (SOS) Alarmları' : 'Bakıcı Canlı Bildirimleri',
        importance: AndroidImportance.HIGH,
        sound,
        vibration: true,
        vibrationPattern: isEmergency ? [0, 800, 400, 800, 400, 1200] : [0, 250, 250, 250],
        bypassDnd: isEmergency,
        visibility: AndroidVisibility.PUBLIC,
        lights: true,
        lightColor: '#FF0000',
      });
    } catch (_chErr) {
      // ignore
    }

    const notificationId = isEmergency
      ? `sos_${data?.alertId || data?.id || 'alert'}`
      : `med_log_${data?.patientId || 'patient'}_${data?.scheduledTime || ''}_${data?.status || 'status'}`;

    const notificationTag = isEmergency
      ? `sos_${data?.alertId || data?.id || 'alert'}`
      : `caregiver_log_${data?.patientId || 'patient'}`;

    await notifee.displayNotification({
      id: notificationId,
      title,
      body,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        sound,
        tag: notificationTag,
        vibrationPattern: isEmergency ? [0, 800, 400, 800, 400, 1200] : [0, 250, 250, 250],
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        fullScreenAction: isEmergency
          ? {
              id: 'default',
              launchActivity: 'default',
            }
          : undefined,
        category: isEmergency ? AndroidCategory.ALARM : AndroidCategory.REMINDER,
        visibility: AndroidVisibility.PUBLIC,
        // NOT: `bypassDnd` BILDIRIM seviyesinde yok — yalnizca KANAL
        // ozelligidir (notifee tipinde de yok, tsc bunu hata olarak
        // isaretliyordu). Ustelik manifest'te ACCESS_NOTIFICATION_POLICY
        // olmadigi icin Android bu istegi kanal seviyesinde de yok sayiyor.
        // Bkz. utils/notifications/channels.ts icindeki not.
        lights: isEmergency ? ['#FF0000', 300, 600] : undefined,
        autoCancel: true,
        actions: isEmergency
          ? [
              {
                title: '📞 Hastayı Ara',
                pressAction: {
                  id: 'call_patient',
                  launchActivity: 'default',
                },
              },
              {
                title: '❌ Bildirimi Kapat',
                pressAction: {
                  id: 'dismiss_alert',
                },
              },
            ]
          : undefined,
      },
      data: {
        ...data,
        isEmergency: isEmergency ? 'true' : 'false',
      },
    });

    if (isEmergency) {
      try {
        await wakeAndOpenApp();
      } catch (_wakeErr) {
        // ignore
      }
    }
  } catch (e) {
    console.error('[FCM Background] Bildirim gösterme hatası:', e);
  }
});

// ============================================================
// HELPER: Bugün bu doz zaten alınmış/atlanmış mı?
//
// ⚠️ v1.7.4 — KARAR MANTIĞI ARTIK `src/domain/doseLog.ts` İÇİNDE.
// Burada iki hata vardı:
//   1) `(reminderTimeId && ...) || (medicineId && ...)` — `medicineId` her
//      logda dolu olduğu için ilacın sabah dozu alınınca akşam alarmı da
//      "zaten alınmış" sayılıp arka planda iptal ediliyordu.
//   2) `toISOString().split('T')[0]` UTC günü verir; TR (UTC+3) 00:00–03:00
//      arası dozlar bir önceki güne düşüyordu.
// ============================================================
async function isMedicineDoseAlreadyLogged(
  medicineId?: string,
  reminderTimeId?: string,
  _scheduledTime?: string
): Promise<boolean> {
  if (!medicineId && !reminderTimeId) return false;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_STORAGE);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const logs = parsed?.state?.medicineLogs || [];
    return isDoseLogged(logs, { reminderTimeId, medicineId });
  } catch (_e) {
    return false;
  }
}

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
  // ⚠️ v1.7.4 — YEREL gün. Eskiden UTC günü kullanılıyordu; App.tsx tarafı da
  // UTC kullandığı için "aynı" görünüyordu ama TR'de gün sınırı 03:00'a
  // kayıyordu. Artık iki taraf da src/domain/doseLog.ts'i kullanıyor.
  const today = getLocalDateKey(new Date());
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

  try {
    const displayed = await notifee.getDisplayedNotifications();
    for (const d of displayed) {
      if (
        d.id === notification?.id ||
        (medId && d.notification?.data?.medicineId === medId) ||
        (medId && remId && d.id === `alarm-${medId}-${remId}`)
      ) {
        if (d.id) await notifee.cancelDisplayedNotification(d.id);
      }
    }
  } catch (_e) {
    /* ignore */
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

      // KADEME 1: Bugün bu doz zaten alınmış/atlanmışsa ekranı uyandırma
      const medId = notification.data?.medicineId as string;
      const remId = notification.data?.reminderTimeId as string;
      const schedTime = notification.data?.scheduledTime as string;
      const alreadyLogged = !isTest && (await isMedicineDoseAlreadyLogged(medId, remId, schedTime));
      if (alreadyLogged) {
        console.log('[BG] SKIP: Medicine dose already logged for today:', medId, remId);
        if (notification.id) {
          try {
            await notifee.cancelDisplayedNotification(notification.id);
            await notifee.cancelNotification(notification.id);
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
              channelId: ALARM_CHANNEL_ID,
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
