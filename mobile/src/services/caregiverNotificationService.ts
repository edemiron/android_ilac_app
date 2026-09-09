/**
 * Caregiver Notification Service
 *
 * Bakıcılar için Push / FCM bildirimleri gönderme servisi.
 * İlaç alındığında, atlandığında veya beklendiğinde bakıcıya push bildirimi gönderir.
 * Uygulama kapalıyken veya arka plandayken bile Android/iOS sistem bildirimini tetikler.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { createScopedLogger } from '../utils/logger';
import { updateCaregiverFcmToken } from './caregiverService';
// K5 — bakıcı uyarısı yazılamazsa KALICI kuyruğa al.
import { enqueueOutbox } from '../utils/outboxStore';

const log = createScopedLogger('CaregiverNotifications');

const FCM_TOKEN_KEY = 'caregiver.fcm.token';
const CAREGIVER_NOTIFICATIONS_ENABLED = '@caregiver_notifications_enabled';

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

    // Android bildirim kanallarını Notifee ve Notifications ile garantiye al
    if (Platform.OS === 'android') {
      try {
        await notifee.createChannel({
          id: 'emergency-sos-v6',
          // v1.8.2: Kanal adindan emoji kaldirildi (bkz. notifications/channels.ts).
          name: 'Acil Durum (SOS) Alarmları',
          importance: AndroidImportance.HIGH,
          sound: 'sound_urgent_alert',
          vibration: true,
          vibrationPattern: [0, 800, 400, 800, 400, 1200],
          bypassDnd: true,
        });

        await notifee.createChannel({
          id: 'caregiver-live-alerts-v6',
          name: 'Bakıcı Canlı Bildirimleri',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });

        await notifee.createChannel({
          id: 'patient-remote-reminders-v1',
          name: 'Hasta Canlı Hatırlatıcıları',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });
      } catch (_chErr) {
        log.debug('Channel setup skip');
      }
    }

    // 1. İzin Kontrolü (FCM + Notifee)
    try {
      await messaging().requestPermission();
    } catch (_pErr) {
      log.debug('FCM permission request skip');
    }

    // 2. Native FCM Token Al (Google Play Services)
    let pushToken = '';
    try {
      pushToken = await messaging().getToken();
      if (pushToken) {
        log.info('Native Firebase Cloud Messaging token alındı', {
          tokenPrefix: pushToken.slice(0, 15),
        });
      }
    } catch (fcmErr) {
      log.warn('Native FCM token alınamadı, Expo fallback deneniyor', fcmErr);
    }

    // 3. Expo Push Token Fallback
    if (!pushToken) {
      try {
        const tokenObj = await Notifications.getExpoPushTokenAsync();
        pushToken = tokenObj.data;
      } catch (_e) {
        try {
          const devTokenObj = await Notifications.getDevicePushTokenAsync();
          pushToken = devTokenObj.data;
        } catch (devErr) {
          log.warn('Device push token alınamadı', devErr);
        }
      }
    }

    if (!pushToken) {
      log.warn('Push token boş döndü');
      return null;
    }

    // 4. v1.8.5 — TOPIC ABONELIGI KALDIRILDI (`user_{userId}`).
    // Sunucu artik topic'e degil TOKEN'a gonderiyor (bkz. server/functions/
    // notify.js). Onceden abone olmus kurulumlari temizliyoruz; aksi halde
    // o cihazlar eski topic'te asili kalir ve bir gun topic'e bir sey
    // gonderilirse sizinti yeniden acilir.
    await unsubscribeFromLegacyTopics(userId);

    // 5. Token'ı kaydet (SecureStore & Firestore)
    await SecureStore.setItemAsync(FCM_TOKEN_KEY, pushToken);
    await updateCaregiverFcmToken(userId, pushToken);

    log.info('Push token başarıyla alındı ve kaydedildi', { userId });

    return pushToken;
  } catch (error) {
    log.error('Push kurulum hatası', error);
    return null;
  }
}

/**
 * Takip edilen hastaların bildirimlerine abone ol.
 *
 * ⚠️ v1.8.5 — ARTIK HİÇBİR ŞEY YAPMIYOR, ve bu bilinçli.
 *
 * Eski hâli:
 *
 *     await messaging().subscribeToTopic(`patient_${pId}`);
 *
 * FCM topic aboneliği **istemci tarafındadır ve kimlik doğrulaması
 * gerektirmez.** Bu döngü, istemcinin verdiği hasta kimliğine körlemesine
 * abone oluyordu; sunucuda da "bu kişi gerçekten bu hastanın bakıcısı mı"
 * diye soran hiçbir yer yoktu. Sonuç: bir uid'i bilen herkes
 * `subscribeToTopic('patient_<uid>')` çağırıp o hastanın ilaç
 * bildirimlerini — SOS'ta telefon numarası ve konumu da — alabiliyordu.
 *
 * Gönderim artık sunucuda `caregiverRelationships` üzerinden yetki
 * denetlenerek TOKEN'a yapılıyor (bkz. `server/functions/notify.js`).
 * İstemcinin yapması gereken tek şey token'ını ilişki dokümanına yazmak;
 * onu `setupCaregiverPushNotifications` zaten yapıyor.
 *
 * Fonksiyon SİLİNMEDİ çünkü çağıranları var ve boş bir gövde, çağrı
 * noktalarını tek tek gezmekten daha güvenli bir geçiş. Bir sonraki
 * temizlikte çağıranlarla birlikte kaldırılacak.
 */
export async function subscribeToPatientTopics(patientIds: string[]): Promise<void> {
  if (patientIds.length) {
    log.debug('subscribeToPatientTopics artik no-op (v1.8.5 — topic sizintisi)', {
      count: patientIds.length,
    });
  }
}

/**
 * Eski (v1.8.4 ve öncesi) topic aboneliklerini temizler.
 *
 * Güncelleyen kullanıcılar `user_{uid}` ve `patient_{...}` konularına zaten
 * abone durumda. Sunucu artık o konulara göndermiyor, ama abonelikler
 * cihazda asılı kalıyor: ileride biri o konulara bir şey gönderirse sızıntı
 * yeniden açılır. Bu yüzden kurulum sırasında bir kez temizliyoruz.
 *
 * Hata YUTULUYOR: temizlik başarısız olsa bile push kurulumu devam etmeli;
 * bildirim almamak, temizlenmemiş bir abonelikten daha kötü.
 */
export async function unsubscribeFromLegacyTopics(userId: string): Promise<void> {
  try {
    await messaging().unsubscribeFromTopic(`user_${userId}`);
    log.debug('Eski FCM konusundan cikildi', { topic: `user_${userId}` });
  } catch (error) {
    log.debug('Eski konu aboneligi kaldirilamadi (onemsiz)', { error: String(error) });
  }
}

/**
 * Bir hastanın eski `patient_{id}` konusundan çık.
 *
 * Bakıcı tarafında çağrılır: hangi hastalara abone olduğunu yalnızca bakıcı
 * cihazı biliyor.
 */
export async function unsubscribeFromLegacyPatientTopics(patientIds: string[]): Promise<void> {
  for (const pId of patientIds) {
    if (!pId) continue;
    try {
      await messaging().unsubscribeFromTopic(`patient_${pId}`);
      log.debug('Eski hasta konusundan cikildi', { topic: `patient_${pId}` });
    } catch (error) {
      log.debug('Eski hasta konusu kaldirilamadi (onemsiz)', { error: String(error) });
    }
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
  // Hem FCM hem Expo notification dinleyicisi
  const unsubscribeFcm = messaging().onMessage(async remoteMessage => {
    log.debug('FCM Foreground mesaj alındı', { remoteMessage });
    callback(remoteMessage);
  });

  const subscription = Notifications.addNotificationReceivedListener(notification => {
    log.debug('Expo Foreground bildirim alındı', { notification });
    callback(notification);
  });

  return () => {
    unsubscribeFcm();
    subscription.remove();
  };
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

  // v1.7.1 ONARIM: asagidaki basliklarda `${patient}` yaziyordu — boyle bir
  // degisken YOK. Yani her bakici bildirimi formatlanirken
  // `ReferenceError: patient is not defined` firlatiliyordu (tsc'de 5 kez
  // "Cannot find name 'patient'", ESLint'te no-undef). `patientName`
  // opsiyonel oldugu icin bos kaldiginda nötr bir ifadeye duser.
  const patient = patientName?.trim() || 'Hastanız';

  const time = (() => {
    if (!scheduledTime) return '';
    const trimmed = scheduledTime.trim();
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

  // v1.8.2: Basliklardaki emoji ve "!" kaldirildi.
  // - Emoji: TalkBack basligi emojiyle birlikte okuyor ve bazi OEM bildirim
  //   golgelerinde emoji bos kutuya donuyor.
  // - `🎉 ... Aldı!` ozellikle yanlisti: bir dozun alinmasi kutlanacak bir
  //   basari degil, bildirilecek bir olgu. Bakiciya gunde 3-4 kez konfeti
  //   atmak hem bilgiyi hem de "atlandi" bildirimlerinin agirligini
  //   degersizlestiriyor (denetim maddesi 22 — klinik dil disiplini).
  switch (type) {
    case 'missed':
      return {
        title: `${patient} ilacını kaçırdı`,
        body: `${medicineName} (${time}) saatinde ilaç alınmadı.`,
      };
    case 'skipped':
      return {
        title: `${patient} ilacını atladı`,
        body: `${medicineName} (${time}) saatindeki doz atlandı.`,
      };
    case 'taken':
      return {
        title: `${patient} ilacını aldı`,
        body: `${medicineName} (${time}) dozu alındı olarak kaydedildi.`,
      };
    case 'snoozed':
      return {
        title: `${patient} ilacını erteledi`,
        body: `${medicineName} (${time}) saatindeki ilaç ertelendi.`,
      };
    case 'schedule_updated':
      return {
        title: `${patient} ilaç programı güncellendi`,
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

    if (pushToken.startsWith('ExponentPushToken[') || pushToken.startsWith('ExpoPushToken[')) {
      try {
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
      } catch (expErr) {
        log.warn('Expo push iletim hatası', expErr);
      }
    }

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
    const { doc, getDoc, setDoc } = await import('firebase/firestore');
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

      // Ayrıca bakıcının /users/{caregiverId}/caregiverAlerts koleksiyonuna anında yaz!
      if (caregiver.caregiverId) {
        const alertId = `${patientId}_${Date.now()}`;
        const alertData = {
          id: alertId,
          patientId,
          patientName: caregiver.patientName || resolvedPatientName || 'Hastanız',
          medicineName,
          scheduledTime,
          status,
          createdAt: new Date().toISOString(),
          seen: false,
        };
        try {
          await setDoc(
            doc(db, 'users', caregiver.caregiverId, 'caregiverAlerts', alertId),
            alertData
          );
          log.info('caregiverAlerts kaydı oluşturuldu', {
            caregiverId: caregiver.caregiverId,
            alertId,
          });
        } catch (alertErr) {
          // ⚠️ K5 — eski davranış burada yalnızca `log.warn` yapıyordu.
          // Sonuç: telefon çekmeyen bir ortamda atlanan/kaçırılan doz
          // BAKICIYA ASLA ULAŞMIYORDU. Doz logu yerelde kalıp bir sonraki
          // başarılı syncToCloud ile buluta gidiyordu ama bu ANLIK uyarı geri
          // gelmiyordu — uygulamanın birincil güvenlik vaadi (refakatçi
          // takibi) tam da en ihtiyaç duyulan senaryoda sessizce düşüyordu.
          //
          // Outbox anahtarı `alertId__caregiverId`: döngü birden çok bakıcı
          // için aynı milisaniyede aynı `alertId`'yi üretebilir ve outbox
          // dedup'ı id+kind üzerinden çalışıyor. Firestore doküman kimliği
          // DEĞİŞTİRİLMEDİ (yalnızca kuyruk anahtarı ayrıştırıldı), böylece
          // mevcut uyarılarla biçim uyumu korunuyor.
          await enqueueOutbox('caregiverAlert', `${alertId}__${caregiver.caregiverId}`, {
            caregiverId: caregiver.caregiverId,
            alertId,
            alertData,
          });
          log.warn(
            "caregiverAlerts yazılamadı, outbox'a alındı — bağlantı gelince iletilecek",
            alertErr
          );
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
