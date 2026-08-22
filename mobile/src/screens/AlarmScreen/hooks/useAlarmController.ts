/**
 * useAlarmController — AlarmScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Tam ekran alarm tetikleme, ses, titreşim, TTS sesli okuma, phantom alarm temizliği,
 * Notifee foreground olayları ve ilaç aksiyonlarını UI bileşeninden izole eder.
 */

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Vibration, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

import { useMedicineStore } from '../../../stores/medicineStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { playAlarmSound, stopAlarmSound } from '../../../utils/alarmSoundManager';
import { stopAdvancedSpeaking, speakAlarmNotification } from '../../../utils/advancedSpeech';
import {
  scheduleSnoozeNotification,
  scheduleMedicineNotification,
  dismissNotification,
  cancelNotification,
  cancelMedicineNotifications,
} from '../../../utils/notifications';
import { generateId } from '../../../utils/idGenerator';
import { createScopedLogger } from '../../../utils/logger';
import { getInstructionDisplay } from '../helpers';
import type { RootStackParamList, ReminderTime, Medicine } from '../../../types';
import type { VoiceCommandIntent } from '../../../utils/voiceRecognition';

const log = createScopedLogger('AlarmController');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Alarm'>;

export function useAlarmController() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {
    medicineId,
    reminderTimeId,
    scheduledTime,
    snoozeCount: routeSnoozeCount,
    originalScheduledTime: routeOriginalScheduledTime,
  } = route.params;

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

  const testMedicine: Medicine = useMemo(
    () => ({
      id: 'test-medicine',
      name: 'Aspirin',
      dosage: '500mg',
      frequency: 2,
      instructions: 'after_meal' as const,
      color: '#FF6B6B',
      startDate: '2024-01-01T00:00:00.000Z',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      requireBarcodeOnTake: false,
      barcode: '',
    }),
    []
  );

  const medicine = isTestMode ? testMedicine : getMedicineById(medicineId);
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

  const canSnooze = currentSnoozeCount < maxSnoozeCount;
  const remainingSnoozes = maxSnoozeCount - currentSnoozeCount;

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

  // Alarm ses ve titreşimini durdurma
  const stopAlarm = useCallback(async () => {
    log.debug('stopAlarm basladi');
    isStoppedRef.current = true;

    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }

    Vibration.cancel();

    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }

    try {
      await stopAdvancedSpeaking();
    } catch (e) {
      log.debug('stopSpeaking hatasi', { error: e });
    }

    await stopAlarmSound();
    Vibration.cancel();
    log.debug('stopAlarm bitti');
  }, []);

  // Alarm ekranı açıldığında bildirimi kapat
  useEffect(() => {
    dismissNotification(`alarm-${medicineId}-${reminderTimeId}`);
    log.debug('Alarm ekrani acildi, bildirim kapatildi');
  }, [medicineId, reminderTimeId]);

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
          dismissAlarm();
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }
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

  // Phantom alarm koruması
  useEffect(() => {
    if (!medicine && !isTestMode) {
      log.debug('PHANTOM ALARM ALGILANDI - Ilac bulunamadi, hemen kapatiliyor', { medicineId });
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
      playAlarmSound(settings.alarmVolume ?? 80);
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

  const processTake = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const timeStr = currentReminderTime?.time || format(new Date(), 'HH:mm');
    const logTime = `${todayStr}T${timeStr}:00`;
    log.debug('handleTake called', { isTestMode, reminderTimeId, logTime, medicineId });

    if (!isTestMode) {
      logMedicineTaken(reminderTimeId, logTime, medicineId);
    }

    const notificationId = `alarm-${medicineId}-${reminderTimeId}`;
    await dismissNotification(notificationId);
    await cancelNotification(notificationId);

    if (medicine && currentReminderTime && !isTestMode) {
      try {
        await scheduleMedicineNotification(medicine, currentReminderTime, true);
        log.debug('Yarin icin alarm yeniden planlandi', { time: currentReminderTime.time });
      } catch (e) {
        log.debug('Alarm yeniden planlama hatasi', { error: e });
      }
    }

    dismissAlarm();
    navigation.goBack();
  }, [
    currentReminderTime,
    isTestMode,
    reminderTimeId,
    medicineId,
    medicine,
    logMedicineTaken,
    dismissAlarm,
    navigation,
  ]);

  useEffect(() => {
    processTakeRef.current = async () => processTake();
  });

  const handleTake = async () => {
    await stopAlarm();
    await processTake();
  };

  const handleSkip = async () => {
    await stopAlarm();
    setSkipModalVisible(true);
  };

  const handleConfirmSkip = async (reason: string, customNote?: string) => {
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

    const notificationId = `alarm-${medicineId}-${reminderTimeId}`;
    await dismissNotification(notificationId);
    await cancelNotification(notificationId);

    if (medicine && currentReminderTime && !isTestMode) {
      try {
        await scheduleMedicineNotification(medicine, currentReminderTime, true);
        log.debug('Yarin icin alarm yeniden planlandi', { time: currentReminderTime.time });
      } catch (e) {
        log.debug('Alarm yeniden planlama hatasi', { error: e });
      }
    }

    dismissAlarm();
    navigation.goBack();
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

    if (!canSnooze) {
      log.debug('Erteleme limiti doldu', { currentSnoozeCount, maxSnoozeCount });
      await handleSkip();
      return;
    }

    if (remainingSnoozes === 1) {
      log.debug('Son erteleme hakkı kullanıldı, ilaç atlanıyor', {
        currentSnoozeCount,
        maxSnoozeCount,
      });
      await handleSkip();
      return;
    }

    isSnoozingRef.current = true;
    log.debug('handleSnooze basladi', { currentSnoozeCount, remainingSnoozes });

    try {
      await stopAlarm();
    } catch (error) {
      log.debug('stopAlarm hatasi', { error });
    }

    const notificationId = `alarm-${medicineId}-${reminderTimeId}`;

    try {
      await dismissNotification(notificationId);
      await cancelNotification(notificationId);
    } catch (error) {
      log.debug('Bildirim iptal hatasi', { error });
    }

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
          await scheduleMedicineNotification(medicine, currentReminderTime, true);
        } catch (e) {
          log.debug('Alarm yeniden planlama hatasi', { error: e });
        }
      }
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  const currentTime = format(new Date(), 'HH:mm');
  const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: dateLocale });
  const instructionDisplayText = medicine
    ? getInstructionDisplay(medicine.instructions, language as 'tr' | 'en')
    : null;

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
    handleTake,
    handleSkip,
    handleConfirmSkip,
    handleSnooze,
    handleVoiceCommand,
    stopAlarm,
  };
}
