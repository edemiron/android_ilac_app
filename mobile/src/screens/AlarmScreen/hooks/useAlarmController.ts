/**
 * useAlarmController — AlarmScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Tam ekran alarm tetikleme, ses, titreşim, TTS sesli okuma, phantom alarm temizliği,
 * Notifee foreground olayları ve ilaç aksiyonlarını UI bileşeninden izole eder.
 */

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Vibration, Animated, NativeModules } from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

import { useMedicineStore } from '../../../stores/medicineStore';
import { STORAGE_KEYS } from '../../../constants';
import { useLanguage } from '../../../contexts/LanguageContext';
import { playAlarmSound, stopAlarmSound } from '../../../utils/alarmSoundManager';
import { stopAdvancedSpeaking, speakAlarmNotification } from '../../../utils/advancedSpeech';
import {
  scheduleSnoozeNotification,
  scheduleMedicineNotification,
  dismissNotification,
  cancelMedicineNotifications,
} from '../../../utils/notifications';
// Native AlarmModule'e TEK KOPRU: RN bridge argument sayisini KATI dogruluyor,
// `NativeModules.AlarmModule.*` cagrilarini kodun icine dagitmak yasak.
import {
  cancelNativeAlarmResources,
  cancelNativeAlarmNotification,
  ALARM_KIND_MAIN,
  ALARM_KIND_SNOOZE,
  type NativeAlarmKind,
} from '../../../utils/notifications/nativeAlarm';
import {
  getAlarmNotificationId,
  buildSnoozeNotificationId,
} from '../../../utils/notifications/ids';
// "Bu doz bugun zaten alindi mi?" kararinin TEK KAYNAGI. Bu hook'taki eski
// kopya, `medicineId` OR dali yuzunden cok dozlu ilaclarin ikinci alarm
// ekranini aninda kapatiyordu (bkz. src/domain/doseLog.ts).
import { isDoseLogged } from '../../../domain/doseLog';
// Alarm cozumlendiginde giris tekillestirme kaydini BIRAK: aksi halde ayni
// doz icin kurulan YENI bir calma (ozellikle 5 saniyelik test alarmi)
// "yinelenme" sanilip susturulur. Gerekce: notifications/alarmDedup.ts.
import { releaseAlarmDedupFor } from '../../../utils/notifications/alarmDedup';
import { generateId } from '../../../utils/idGenerator';
import { createScopedLogger } from '../../../utils/logger';
import { getInstructionDisplay, resolveSnoozeRights } from '../helpers';
import { evaluateMissedDoseAction } from '../../../utils/clinicalSafetyEngine';
import type { RootStackParamList, ReminderTime, Medicine } from '../../../types';
import type { VoiceCommandIntent } from '../../../utils/voiceRecognition';

const log = createScopedLogger('AlarmController');

/** Temizlik adimlari icin ust sinir (ms). */
const CLEANUP_TIMEOUT_MS = 1500;

/**
 * Native kopru cagrilari (notifee / TTS / OEM) bazen hic settle etmiyor.
 * Onceden `handleTake` ilk is olarak `await stopAlarm()` yapiyordu; askida kalan
 * tek bir cagri dozun loglanmasini VE ekranin kapanmasini bloke ediyordu
 * ("ses devam etti, ekran acik kaldi"). Artik her temizlik adimi timeout'la
 * sarilir ve hicbiri kullanici akisinin onunde durmaz.
 */
function withTimeout<T>(
  task: Promise<T> | T | undefined,
  label: string,
  ms: number = CLEANUP_TIMEOUT_MS
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<undefined>(resolve => {
    timer = setTimeout(() => {
      log.debug('cleanup adimi zaman asimina ugradi', { label, ms });
      resolve(undefined);
    }, ms);
  });

  const guarded = Promise.resolve(task).catch(error => {
    log.debug('cleanup adimi reddedildi', { label, error });
    return undefined;
  });

  return Promise.race([guarded, timeout]).finally(() => {
    // Timer'i mutlaka temizle: aksi halde her temizlik adimi arkasinda
    // 1.5 sn'lik bekleyen bir zamanlayici birakiyor.
    if (timer) {
      clearTimeout(timer);
    }
  });
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Alarm'>;

export function useAlarmController() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {
    medicineId = 'test-medicine',
    reminderTimeId = 'test-reminder',
    scheduledTime = new Date().toISOString(),
    snoozeCount: routeSnoozeCount,
    originalScheduledTime: routeOriginalScheduledTime,
    isSnooze: routeIsSnooze,
    snoozeId: routeSnoozeId,
  } = (route.params as any) || {};

  /**
   * Ekrani ACAN alarmin turu.
   *
   * KRITIK: erteleme alarmi native tarafta AYRI bir requestCode/bildirim
   * uzayinda yasiyor (bkz. utils/notifications/nativeAlarm.ts). Yanlis turu
   * iptal etmek iki sekilde zarar verir:
   *   - Erteleme ekraninda ANA turu iptal etmek → bir sonraki dozun native
   *     alarmini dusurur (kilit ekrani uyandirmasi kaybolur).
   *   - Erteleme turunu HIC iptal etmemek → arkada ARMED bir alarm ve integer
   *     id'li tam ekran tasiyici bildirim kalir (hayalet alarm).
   */
  const isSnoozeAlarm = routeIsSnooze === true || routeIsSnooze === 'true';
  const alarmKind: NativeAlarmKind = isSnoozeAlarm ? ALARM_KIND_SNOOZE : ALARM_KIND_MAIN;

  const { t, language } = useLanguage();
  const dateLocale = language === 'tr' ? tr : enUS;

  const {
    getMedicineById,
    getReminderTimesForMedicine,
    logMedicineTaken,
    logMedicineSkipped,
    dismissAlarm,
    settings,
    createSnooze,
    snoozes,
  } = useMedicineStore();

  const isTestMode = medicineId === 'test-medicine';

  /**
   * Bu alarmin notifee bildirim kimligi.
   *
   * Erteleme bildirimi 3 parametreli `snooze-<med>-<rt>-<snoozeId>` kimligini
   * tasir. `snoozeId` route'a ANCAK bildirim yolundan gelir; native
   * `AlarmReceiver` yolu yalnizca turu tasiyabiliyor (native alarm intent'i
   * snoozeId bilmiyor). O durumda kimlik store'daki aktif ertelemeden
   * cozumlenir — aksi halde erteleme bildirimi ekranda kalir.
   */
  const activeNotificationId = useMemo(() => {
    if (!isSnoozeAlarm) {
      return getAlarmNotificationId(medicineId, reminderTimeId);
    }
    if (routeSnoozeId) {
      return buildSnoozeNotificationId(medicineId, reminderTimeId, routeSnoozeId);
    }
    const activeSnooze = (snoozes || []).find(
      s => s.isActive && s.medicineId === medicineId && s.reminderTimeId === reminderTimeId
    );
    return activeSnooze?.notificationId ?? getAlarmNotificationId(medicineId, reminderTimeId);
  }, [isSnoozeAlarm, routeSnoozeId, medicineId, reminderTimeId, snoozes]);

  const [storageMedicine, setStorageMedicine] = useState<Medicine | null>(null);

  useEffect(() => {
    if (!isTestMode && !getMedicineById(medicineId)) {
      AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_STORAGE)
        .then(raw => {
          if (raw) {
            const parsed = JSON.parse(raw);
            const list: Medicine[] = parsed?.state?.medicines || [];
            const found = list.find(m => m.id === medicineId);
            if (found) setStorageMedicine(found);
          }
        })
        .catch(() => undefined);
    }
  }, [medicineId, isTestMode, getMedicineById]);

  // Tam ekran alarm da AÇIKÇA test olarak görünür: eskiden gerçek bir doz gibi
  // "Aspirin 500mg / Yemekten sonra" yazıyordu ve testten ayırt edilemiyordu.
  const testMedicine: Medicine = useMemo(
    () => ({
      id: 'test-medicine',
      name: language === 'tr' ? '🧪 TEST ALARMI' : '🧪 TEST ALARM',
      dosage: language === 'tr' ? 'Gerçek doz değil' : 'Not a real dose',
      frequency: 2,
      instructions: 'any_time' as const,
      color: '#FF6B6B',
      startDate: '2024-01-01T00:00:00.000Z',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      requireBarcodeOnTake: false,
      barcode: '',
    }),
    [language]
  );

  const medicine = isTestMode
    ? testMedicine
    : getMedicineById(medicineId) || storageMedicine || undefined;
  const reminderTimes = medicine && !isTestMode ? getReminderTimesForMedicine(medicine.id) : [];
  const currentReminderTime = reminderTimes.find(rt => rt.id === reminderTimeId);

  const snoozeDuration = settings.snoozeDuration || 5;
  const maxSnoozeCount = settings.maxSnoozeCount || 3;

  const currentSnoozeCount = useMemo(() => {
    if (routeSnoozeCount !== undefined && routeSnoozeCount > 0) {
      return routeSnoozeCount;
    }
    if (!medicine) return 0;
    const originalTime = routeOriginalScheduledTime || scheduledTime || new Date().toISOString();
    const reminderTimeToCheck = currentReminderTime?.id || 'test-reminder';
    return snoozes.filter(
      s =>
        s.medicineId === medicine.id &&
        s.reminderTimeId === reminderTimeToCheck &&
        s.originalScheduledTime === originalTime
    ).length;
  }, [
    medicine,
    currentReminderTime,
    scheduledTime,
    snoozes,
    routeSnoozeCount,
    routeOriginalScheduledTime,
  ]);

  // Karar `helpers.resolveSnoozeRights` icinde — TEK KAYNAK.
  // Eskiden bu iki satirin uzerine dozu sessizce atlayan iki dal kurulmustu.
  const { canSnooze, remainingSnoozes } = resolveSnoozeRights(currentSnoozeCount, maxSnoozeCount);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppedRef = useRef<boolean>(false);
  const isSnoozingRef = useRef<boolean>(false);
  const processTakeRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  // Pulse animasyonu
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  // Güvenli Alarm Kapatma ve Ana Ekrana Dönüş
  const closeAlarmScreen = useCallback(() => {
    log.info('closeAlarmScreen cagirildi');
    dismissAlarm();

    // Bu çalma bitti. Kaydı bırakmazsak `INGRESS_WINDOW_MS` boyunca aynı doz
    // için gelen YENİ bir çalma yinelenme sayılıp hiç açılmaz.
    releaseAlarmDedupFor({
      medicineId,
      reminderTimeId,
      isSnooze: isSnoozeAlarm ? 'true' : 'false',
      snoozeId: routeSnoozeId,
    });

    // 1. Navigasyonu ONCE yap: native temizlik askida kalsa bile ekran kapanir.
    //    reset kullaniyoruz — goBack, ustuste binmis ikinci bir Alarm ekranini
    //    ortaya cikarabiliyordu.
    try {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    } catch (_e) {
      try {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      } catch (_e2) {
        log.error('closeAlarmScreen error', _e2);
      }
    }

    // 2. Kilit ekrani bayraklarini arka planda sifirla — alarm bittikten sonra
    //    uygulama kilit ekraninda gorunur kalmasin. Await EDILMEZ.
    void withTimeout(NativeModules.AlarmModule?.clearLockScreenFlags?.(), 'clearLockScreenFlags');
  }, [dismissAlarm, navigation, medicineId, reminderTimeId, isSnoozeAlarm, routeSnoozeId]);

  // Ses/titresim/TTS'i ANINDA kes. Await yok: kopru askida kalsa bile UI akisi durmaz.
  const stopAlarmAudio = useCallback(() => {
    isStoppedRef.current = true;

    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }

    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }

    Vibration.cancel();

    void withTimeout(stopAdvancedSpeaking(), 'stopAdvancedSpeaking');
    void withTimeout(stopAlarmSound(), 'stopAlarmSound');
  }, []);

  // Bu doza ait bildirimleri HEDEFE YONELIK iptal et.
  // Blanket cancelAllNotifications / dismissAll KULLANILMIYOR: bakici, SOS ve
  // son kullanma bildirimlerini de siliyordu.
  const clearAlarmNotifications = useCallback(async () => {
    await withTimeout(
      notifee.cancelDisplayedNotification(activeNotificationId),
      'cancelDisplayedNotification'
    );
    await withTimeout(notifee.cancelNotification(activeNotificationId), 'cancelNotification');

    // AlarmReceiver'in NotificationManagerCompat ile attigi tam ekran tasiyici
    // bildirim integer id'li; notifee onu goremez, kullanici da kapatamiyordu.
    // Native AlarmManager'da bekleyen donanim alarmi da ayni requestCode'dan
    // turer. Ikisini de TEK KOPRUDEN, dogru `alarmKind` ile iptal ediyoruz.
    await withTimeout(
      cancelNativeAlarmResources({ medicineId, reminderTimeId }, alarmKind),
      'cancelNativeAlarmResources'
    );
  }, [medicineId, reminderTimeId, activeNotificationId, alarmKind]);

  // Birlesik durdurucu (handleSkip / handleSnooze / foreground event'ler icin).
  const stopAlarm = useCallback(async () => {
    log.debug('stopAlarm basladi');
    stopAlarmAudio();
    await clearAlarmNotifications();
    Vibration.cancel();
    log.debug('stopAlarm bitti');
  }, [stopAlarmAudio, clearAlarmNotifications]);

  // Alarm ekranı açıldığında bu doza ait bildirimleri kapat.
  // Bildirimin FullScreenIntent'i is gormus oldugu icin artik guvenle iptal edilebilir
  // (bkz. listeners.ts — iptal ONCE degil, yonlendirmeden SONRA yapiliyor).
  useEffect(() => {
    void withTimeout(dismissNotification(activeNotificationId), 'mount.dismissNotification');
    void withTimeout(
      cancelNativeAlarmNotification({ medicineId, reminderTimeId }, alarmKind),
      'mount.cancelNativeAlarmNotification'
    );
    log.debug('Alarm ekrani acildi, bu doza ait bildirimler kapatildi', {
      activeNotificationId,
      alarmKind,
    });
  }, [medicineId, reminderTimeId, activeNotificationId, alarmKind]);

  // KADEME 3 Mount Auto-Dismiss Guard:
  // Eğer bu ilaç/doz bugün zaten alınmış veya atlanmışsa ses çalmadan anında ekranı kapat
  useEffect(() => {
    if (isTestMode) return;

    const storeLogs = useMedicineStore.getState().medicineLogs || [];
    // ⚠️ v1.7.4 — karar `domain/doseLog.ts`te. Eski kopya `reminderTimeId`
    // TUTMASA BILE `medicineId` esitse true donuyordu; ilacin sabah dozu
    // alinmis olan kullanici aksam alarm ekranini goremiyordu (ekran acilip
    // ses calmadan aninda kapaniyordu).
    const isAlreadyLogged = isDoseLogged(storeLogs, { reminderTimeId, medicineId });

    if (isAlreadyLogged) {
      log.warn('AlarmScreen Mount Guard: İlaç bugün zaten alınmış/atlanmış, ekran kapatılıyor', {
        medicineId,
        reminderTimeId,
      });
      stopAlarm();
      closeAlarmScreen();
    }
  }, [isTestMode, medicineId, reminderTimeId, stopAlarm, closeAlarmScreen]);

  // Foreground bildirim olayları dinleyicisi
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      log.debug('Foreground event alindi', {
        type,
        notificationId: detail.notification?.id,
        pressAction: detail.pressAction?.id,
      });

      if (type === EventType.ACTION_PRESS) {
        const actionId = detail.pressAction?.id;
        const notificationMedicineId = detail.notification?.data?.medicineId as string;

        if (
          notificationMedicineId === medicineId ||
          detail.notification?.id?.includes(medicineId)
        ) {
          log.debug('Bu alarm icin action algilandi, ses durduruluyor', { actionId });
          await stopAlarm();
          closeAlarmScreen();
        }
      }

      if (type === EventType.DISMISSED) {
        const notificationMedicineId = detail.notification?.data?.medicineId as string;
        if (
          notificationMedicineId === medicineId ||
          detail.notification?.id?.includes(medicineId)
        ) {
          log.debug('Notification dismissed, ses durduruluyor');
          await stopAlarm();
        }
      }
    });

    return () => unsubscribe();
  }, [medicineId, stopAlarm, dismissAlarm, navigation]);

  // Phantom alarm koruması (store hydration süresine izin vermek için 2.5s tolerans tanır)
  useEffect(() => {
    if (!medicine && !isTestMode) {
      const timer = setTimeout(() => {
        // 2.5s sonra hala bulunamadıysa phantom alarm olarak kapat
        const currentStoreMed = useMedicineStore.getState().getMedicineById(medicineId);
        if (!currentStoreMed) {
          log.debug('PHANTOM ALARM ALGILANDI - Ilac bulunamadi, kapatiliyor', { medicineId });
          isStoppedRef.current = true;
          Vibration.cancel();
          dismissNotification(`alarm-${medicineId}-${reminderTimeId}`);
          cancelMedicineNotifications(medicineId);
          dismissAlarm();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }
      }, 2500);

      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [medicine, isTestMode, medicineId, reminderTimeId, navigation, dismissAlarm]);

  // Titreşim, ses ve TTS döngüsü
  useEffect(() => {
    if (!medicine && !isTestMode) {
      log.debug('Ilac bulunamadi, ses/titresim baslatilmiyor');
      return;
    }

    if (isStoppedRef.current) {
      log.debug('Alarm zaten durduruldu, ses/titresim baslatilmiyor');
      return;
    }

    isStoppedRef.current = false;
    const vibrationPattern = [0, 500, 500, 500];

    if (settings.vibrationEnabled && !isStoppedRef.current) {
      Vibration.vibrate(vibrationPattern);
    }

    vibrationIntervalRef.current = setInterval(() => {
      if (isStoppedRef.current) {
        if (vibrationIntervalRef.current) {
          clearInterval(vibrationIntervalRef.current);
          vibrationIntervalRef.current = null;
        }
        return;
      }
      if (settings.vibrationEnabled) {
        Vibration.vibrate(vibrationPattern);
      }
    }, 2000);

    ReactNativeHapticFeedback.trigger('notificationWarning', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

    if (!isStoppedRef.current) {
      playAlarmSound(settings.alarmVolume ?? 80, settings.alarmSound ?? 'soft_chime');
    }

    if (medicine) {
      const speakReminder = async () => {
        if (isStoppedRef.current) {
          log.debug('Alarm durduruldu, TTS baslatilmiyor');
          return;
        }
        try {
          await speakAlarmNotification(
            medicine.name,
            medicine.dosage,
            medicine.instructions,
            language,
            {
              ttsEnabled: settings.ttsEnabled,
              ttsVolume: settings.ttsVolume,
              ttsRepeatCount: settings.ttsRepeatCount,
              ttsSpeechRate: settings.ttsSpeechRate ?? 0.5,
              ttsSpeakMedicineName: settings.ttsSpeakMedicineName,
              ttsSpeakDosage: settings.ttsSpeakDosage,
              ttsSpeakInstructions: settings.ttsSpeakInstructions,
            }
          );
        } catch (error) {
          log.debug('TTS hatasi', { error });
        }
      };
      ttsTimeoutRef.current = setTimeout(speakReminder, 1000);
    }

    return () => {
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      Vibration.cancel();
      stopAdvancedSpeaking();
      stopAlarmSound();
    };
  }, [
    medicine,
    isTestMode,
    medicineId,
    settings.vibrationEnabled,
    settings.alarmVolume,
    settings.ttsEnabled,
    settings.ttsVolume,
    settings.ttsRepeatCount,
    settings.ttsSpeakMedicineName,
    settings.ttsSpeakDosage,
    settings.ttsSpeakInstructions,
    language,
  ]);

  const processTake = useCallback(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const timeStr = currentReminderTime?.time || format(new Date(), 'HH:mm');
    const logTime = `${todayStr}T${timeStr}:00`;
    log.debug('handleTake called', { isTestMode, reminderTimeId, logTime, medicineId });

    if (!isTestMode) {
      logMedicineTaken(reminderTimeId, logTime, medicineId);
    }

    // Ekrani HEMEN kapat — bildirim temizligi ve yeniden planlama arkada surer.
    closeAlarmScreen();

    void (async () => {
      await clearAlarmNotifications();

      if (medicine && currentReminderTime && !isTestMode) {
        try {
          // ⚠️ v1.7.6 — son parametre `forceNextDay = true`. Bu doz AZ ONCE
          // cozumlendi; ANA hatirlatmanin sonraki calmasi tanim geregi YARIN.
          // Eskiden bayrak yoktu: dozu saatinden once alan kullanici ("Erken
          // Al" ile 18:00'de alinan 20:00 dozu) bugunun saati henuz gecmedigi
          // icin AYNI DOZUN alarmini AYNI AKSAM tekrar aliyordu.
          await scheduleMedicineNotification(medicine, currentReminderTime, true, false, true);
          log.debug('Yarin icin alarm yeniden planlandi', { time: currentReminderTime.time });
        } catch (e) {
          log.debug('Alarm yeniden planlama hatasi', { error: e });
        }
      }
    })();
  }, [
    currentReminderTime,
    isTestMode,
    reminderTimeId,
    medicineId,
    medicine,
    logMedicineTaken,
    closeAlarmScreen,
    clearAlarmNotifications,
  ]);

  useEffect(() => {
    processTakeRef.current = async () => processTake();
  });

  /**
   * "Simdi Al".
   *
   * KRITIK SIRA: sesi kes -> dozu logla -> ekrani kapat -> temizligi arkada yap.
   * Onceden ilk satir `await stopAlarm()` idi; icindeki native cagrilardan biri
   * settle etmezse doz hic loglanmiyor ve ekran hic kapanmiyordu.
   */
  const handleTake = () => {
    log.info('handleTake basildi');
    stopAlarmAudio();
    try {
      processTake();
    } catch (e) {
      log.error('processTake error in handleTake', e);
      closeAlarmScreen();
    }
  };

  const handleSkip = () => {
    // Sesi hemen kes, modali bekletmeden ac; bildirim temizligi arkada.
    stopAlarmAudio();
    void clearAlarmNotifications();
    setSkipModalVisible(true);
  };

  const handleConfirmSkip = (reason: string, customNote?: string) => {
    setSkipModalVisible(false);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const timeStr = currentReminderTime?.time || format(new Date(), 'HH:mm');
    const logTime = `${todayStr}T${timeStr}:00`;
    log.debug('handleConfirmSkip called', {
      isTestMode,
      reminderTimeId,
      logTime,
      medicineId,
      reason,
    });

    if (!isTestMode) {
      logMedicineSkipped(reminderTimeId, logTime, medicineId, customNote, reason, customNote);
    }

    // Ekrani HEMEN kapat — temizlik ve yeniden planlama arkada surer.
    closeAlarmScreen();

    void (async () => {
      await clearAlarmNotifications();

      if (medicine && currentReminderTime && !isTestMode) {
        try {
          // ⚠️ v1.7.6 — son parametre `forceNextDay = true`. Bu doz AZ ONCE
          // cozumlendi; ANA hatirlatmanin sonraki calmasi tanim geregi YARIN.
          // Eskiden bayrak yoktu: dozu saatinden once alan kullanici ("Erken
          // Al" ile 18:00'de alinan 20:00 dozu) bugunun saati henuz gecmedigi
          // icin AYNI DOZUN alarmini AYNI AKSAM tekrar aliyordu.
          await scheduleMedicineNotification(medicine, currentReminderTime, true, false, true);
          log.debug('Yarin icin alarm yeniden planlandi', { time: currentReminderTime.time });
        } catch (e) {
          log.debug('Alarm yeniden planlama hatasi', { error: e });
        }
      }
    })();
  };

  const handleVoiceCommand = (intent: VoiceCommandIntent) => {
    log.info('Sesli komut algılandı', { intent });
    if (intent === 'TAKE') {
      handleTake();
    } else if (intent === 'SNOOZE') {
      handleSnooze();
    } else if (intent === 'SKIP') {
      handleSkip();
    }
  };

  const handleSnooze = async () => {
    if (isSnoozingRef.current) {
      log.debug('handleSnooze zaten çalışıyor, atlanıyor');
      return;
    }

    // ⚠️ v1.7.7 — SESSIZ ATLAMA KALDIRILDI. N HAK = N ERTELEME.
    // ══════════════════════════════════════════════════════════════════════
    // Burada iki dal vardi ve ikisi de `handleSkip()` cagiriyordu:
    //
    //   1. `!canSnooze` → atla.  Buton `!canSnooze` iken "disabled" GORUNUYOR
    //      ama `onPress` hala bagliydi. Yani "Erteleme hakkin bitti" yazan bir
    //      butona dokunmak dozu ATLANDI olarak kaydediyordu.
    //   2. `remainingSnoozes === 1` → atla.  `maxSnoozeCount = 3` iken
    //      kullanici UCUNCU erteleme hakkini hic kullanamiyordu: buton
    //      "3 hak" diye baslayip son hakta dozu atliyordu. Yani ilan edilen
    //      hak sayisi ile gercek hak sayisi UYUSMUYORDU (3 yazip 2 veriyordu).
    //
    // "Atlandi", doktora giden uyum raporuna yazilan KLINIK bir karardir ve
    // yalnizca kullanici acikca secerse yazilmalidir (atlama nedeni diyalogu
    // bunun icin var). Erteleme hakki bitince yapilacak dogru is: hicbir sey
    // yazmamak, alarmi acik tutmak ve kullaniciyi "Aldim" / "Atla" arasinda
    // secim yapmaya birakmak.
    if (!canSnooze) {
      log.warn('Erteleme hakki bitti — doz ATLANMADI, kullanici secmeli', {
        currentSnoozeCount,
        maxSnoozeCount,
      });
      return;
    }

    isSnoozingRef.current = true;
    log.debug('handleSnooze basladi', { currentSnoozeCount, remainingSnoozes });

    // Sesi aninda kes; bildirim iptali timeout'lu (askida kalirsa erteleme
    // planlamasi ve ekran kapanisi engellenmesin).
    stopAlarmAudio();
    await withTimeout(clearAlarmNotifications(), 'snooze.clearAlarmNotifications', 2500);

    dismissAlarm();

    if (medicine) {
      const testReminderTime: ReminderTime = {
        id: 'test-reminder',
        medicineId: medicine.id,
        time: format(new Date(), 'HH:mm'),
        isEnabled: true,
      };

      const reminderTimeToUse = currentReminderTime || testReminderTime;
      const snoozeId = generateId();
      const originalScheduledTime = scheduledTime || new Date().toISOString();
      const newSnoozeCount = currentSnoozeCount + 1;

      try {
        const result = await scheduleSnoozeNotification({
          medicine,
          reminderTime: reminderTimeToUse,
          snoozeDuration,
          snoozeId,
          originalScheduledTime,
          snoozeCount: newSnoozeCount,
        });

        if (result) {
          createSnooze(
            medicine.id,
            reminderTimeToUse.id,
            originalScheduledTime,
            result.triggerTime,
            result.notificationId
          );
        }
      } catch (e) {
        log.error('scheduleSnoozeNotification hatasi', { error: e });
      }

      if (currentReminderTime && !isTestMode) {
        try {
          // ⚠️ v1.7.6 — son parametre `forceNextDay = true`. Bu doz AZ ONCE
          // cozumlendi; ANA hatirlatmanin sonraki calmasi tanim geregi YARIN.
          // Eskiden bayrak yoktu: dozu saatinden once alan kullanici ("Erken
          // Al" ile 18:00'de alinan 20:00 dozu) bugunun saati henuz gecmedigi
          // icin AYNI DOZUN alarmini AYNI AKSAM tekrar aliyordu.
          await scheduleMedicineNotification(medicine, currentReminderTime, true, false, true);
        } catch (e) {
          log.debug('Alarm yeniden planlama hatasi', { error: e });
        }
      }
    }

    closeAlarmScreen();
  };

  const [missedDoseModalVisible, setMissedDoseModalVisible] = useState(false);

  const currentTime = format(new Date(), 'HH:mm');
  const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: dateLocale });
  const instructionDisplayText = medicine
    ? getInstructionDisplay(medicine.instructions, language as 'tr' | 'en')
    : null;

  // Kaçırılan Doz Klinik Değerlendirmesi
  const missedDoseEvaluation = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let scheduledMinutes = currentMinutes;
    if (scheduledTime) {
      const schedDate = new Date(scheduledTime);
      if (!isNaN(schedDate.getTime())) {
        scheduledMinutes = schedDate.getHours() * 60 + schedDate.getMinutes();
      }
    }

    return evaluateMissedDoseAction({
      scheduledMinutesOfDay: scheduledMinutes,
      currentMinutesOfDay: currentMinutes,
      frequencyPerDay: medicine?.frequency || 1,
      medicineName: medicine?.name || 'İlacınız',
    });
  }, [scheduledTime, medicine]);

  return {
    navigation,
    medicine,
    isTestMode,
    t,
    language,
    currentTime,
    currentDate,
    instructionDisplayText,
    pulseAnim,
    canSnooze,
    remainingSnoozes,
    snoozeDuration,
    skipModalVisible,
    setSkipModalVisible,
    voiceModalVisible,
    setVoiceModalVisible,
    missedDoseModalVisible,
    setMissedDoseModalVisible,
    missedDoseEvaluation,
    handleTake,
    handleSkip,
    handleConfirmSkip,
    handleSnooze,
    handleVoiceCommand,
    stopAlarm,
  };
}
