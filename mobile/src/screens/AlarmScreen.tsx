import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Dimensions,
  Animated,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';
import { playAlarmSound, stopAlarmSound } from '../utils/alarmSoundManager';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, ReminderTime } from '../types';
import { stopAdvancedSpeaking, speakAlarmNotification } from '../utils/advancedSpeech';
import {
  scheduleSnoozeNotification,
  scheduleMedicineNotification,
  dismissNotification,
  cancelNotification,
  cancelMedicineNotifications,
} from '../utils/notifications';
import { generateId } from '../utils/idGenerator';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';
import { createScopedLogger } from '../utils/logger';

// Sprint 6.2: AlarmScreen.tsx (910 satir) pure helper extraction.
import { getInstructionDisplay } from './AlarmScreen/helpers';

const log = createScopedLogger('AlarmScreen');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Alarm'>;

// eslint-disable-next-line unused-imports/no-unused-vars
const { width, height } = Dimensions.get('window');

export default function AlarmScreen() {
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

  // Test modu kontrolü
  const isTestMode = medicineId === 'test-medicine';

  // Test için örnek ilaç - useMemo ile SADECE BİR KEZ oluştur
  const testMedicine = useMemo(
    () => ({
      id: 'test-medicine',
      name: 'Aspirin',
      dosage: '500mg',
      frequency: 2,
      instructions: 'after_meal' as const,
      color: '#FF6B6B',
      startDate: '2024-01-01T00:00:00.000Z', // Sabit değer
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z', // Sabit değer
      updatedAt: '2024-01-01T00:00:00.000Z', // Sabit değer
      requireBarcodeOnTake: false,
      barcode: '',
    }),
    []
  ); // Boş dependency - sadece bir kez oluşur

  const medicine = isTestMode ? testMedicine : getMedicineById(medicineId);
  const reminderTimes = medicine && !isTestMode ? getReminderTimesForMedicine(medicine.id) : [];
  const currentReminderTime = reminderTimes.find(rt => rt.id === reminderTimeId);

  // Erteleme süresi ve limiti ayarlardan al
  const snoozeDuration = settings.snoozeDuration || 5;
  const maxSnoozeCount = settings.maxSnoozeCount || 3;

  // Mevcut snooze sayısını hesapla
  // Background'dan geliyorsa routeSnoozeCount kullan, yoksa snoozes array'den hesapla
  const currentSnoozeCount = useMemo(() => {
    // Route params'tan gelen snoozeCount varsa (background snooze'dan geldiyse)
    if (routeSnoozeCount !== undefined && routeSnoozeCount > 0) {
      return routeSnoozeCount;
    }
    // Yoksa snoozes array'den hesapla
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

  // Erteleme hakkı kaldı mı?
  const canSnooze = currentSnoozeCount < maxSnoozeCount;
  const remainingSnoozes = maxSnoozeCount - currentSnoozeCount;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppedRef = useRef<boolean>(false); // Alarm durduruldu mu?
  const isSnoozingRef = useRef<boolean>(false); // Snooze işlemi devam ediyor mu?

  // Barkod Doğrulama State
  const [showScanner, setShowScanner] = useState(false);
  const [scannedMessage, setScannedMessage] = useState('');
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const onCodeScanned = useCallback(
    (codes: Code[]) => {
      if (codes.length > 0 && showScanner) {
        const scannedCode = codes[0].value;
        if (scannedCode === medicine?.barcode) {
          setScannedMessage(language === 'tr' ? 'Barkod doğrulandı!' : 'Barcode verified!');
          // Biraz bekletip işlemi tamamla
          setTimeout(() => {
            setShowScanner(false);
            processTake();
          }, 1500);
        } else {
          setScannedMessage(
            language === 'tr'
              ? 'Yanlış barkod! Beklenen ilacı okutun.'
              : 'Wrong barcode! Scan correct medicine.'
          );
        }
      }
    },
    [showScanner, medicine, language]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39'],
    onCodeScanned,
  });

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
  }, []);

  // Alarm durdurma fonksiyonu - useEffect'lerden önce tanımlanmalı
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
    // Bildirimi hemen kapat - kullanıcı alarm ekranını gördü
    dismissNotification(`alarm-${medicineId}-${reminderTimeId}`);
    log.debug('Alarm ekrani acildi, bildirim kapatildi');
  }, [medicineId, reminderTimeId]);

  // CRITICAL: Background'dan gelen notification action'larını dinle
  // Kullanıcı bildirimden butona bastığında AlarmScreen açık olabilir - sesi durdurmak için gerekli
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

  // İLAÇ BULUNAMADIĞINDA: Alarmı durdur ve ana ekrana yönlendir
  useEffect(() => {
    if (!medicine && !isTestMode) {
      log.debug('PHANTOM ALARM ALGILANDI - Ilac bulunamadi, hemen kapatiliyor', { medicineId });

      // HEMEN alarm flag'ini set et - ses/titreşim başlamasını engelle
      isStoppedRef.current = true;

      // Titreşimi HEMEN durdur
      Vibration.cancel();

      // Bildirimi iptal et
      dismissNotification(`alarm-${medicineId}-${reminderTimeId}`);

      // Tüm phantom bildirimleri temizle
      cancelMedicineNotifications(medicineId);

      // Alarm state'ini temizle
      dismissAlarm();

      // Navigation RESET ile ana ekrana dön - bu her zaman çalışır
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [medicine, isTestMode, medicineId, reminderTimeId, navigation, dismissAlarm]);

  // Titreşim, ses ve TTS
  useEffect(() => {
    // İlaç yoksa (silinmiş/phantom) ses ve titreşim başlatma
    if (!medicine && !isTestMode) {
      log.debug('Ilac bulunamadi, ses/titresim baslatilmiyor');
      return;
    }

    // Eğer alarm zaten durdurulduysa (phantom guard tarafından), başlatma
    if (isStoppedRef.current) {
      log.debug('Alarm zaten durduruldu, ses/titresim baslatilmiyor');
      return;
    }

    // Reset stopped flag - sadece normal alarm için
    isStoppedRef.current = false;

    // Titreşim pattern (sürekli)
    const vibrationPattern = [0, 500, 500, 500];

    // İlk titreşim
    if (settings.vibrationEnabled && !isStoppedRef.current) {
      Vibration.vibrate(vibrationPattern);
    }

    // Tekrarlayan titreşim - ref'te sakla
    vibrationIntervalRef.current = setInterval(() => {
      // Eğer alarm durdurulduysa, interval'i temizle ve çık
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicine, isTestMode, medicineId, settings.vibrationEnabled, language]);

  const processTake = async () => {
    // KRİTİK: scheduledTime'ı HomeScreen ile aynı formatta oluştur
    // getTodayReminders `l.scheduledTime.startsWith(today)` ile eşleştirir
    // toISOString() UTC verir, gece saatlerinde tarih uyuşmaz
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const timeStr = currentReminderTime?.time || format(new Date(), 'HH:mm');
    const logTime = `${todayStr}T${timeStr}:00`;
    log.debug('handleTake called', { isTestMode, reminderTimeId, logTime, medicineId });
    if (!isTestMode) {
      logMedicineTaken(reminderTimeId, logTime, medicineId);
      log.debug('logMedicineTaken called from handleTake with medicineId fallback');
    } else {
      log.debug('Test mode - take not logged');
    }
    const notificationId = `alarm-${medicineId}-${reminderTimeId}`;
    // Hem displayed hem trigger notification'ı iptal et
    await dismissNotification(notificationId);
    await cancelNotification(notificationId);

    // Yarın için alarmı yeniden planla (günlük tekrar için)
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

  const handleTake = async () => {
    await stopAlarm();

    if (medicine?.requireBarcodeOnTake && medicine?.barcode && !isTestMode) {
      log.debug('Barkod dogrulamasi gerekli');
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          // İzin verilmezse işlemi doğrudan tamamla
          await processTake();
          return;
        }
      }
      setShowScanner(true);
      return;
    }

    await processTake();
  };

  const handleSkip = async () => {
    await stopAlarm();
    // KRİTİK: scheduledTime'ı HomeScreen ile aynı formatta oluştur
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const timeStr = currentReminderTime?.time || format(new Date(), 'HH:mm');
    const logTime = `${todayStr}T${timeStr}:00`;
    log.debug('handleSkip called', { isTestMode, reminderTimeId, logTime, medicineId });
    if (!isTestMode) {
      logMedicineSkipped(reminderTimeId, logTime, medicineId);
      log.debug('logMedicineSkipped called from handleSkip with medicineId fallback');
    } else {
      log.debug('Test mode - skip not logged');
    }
    const notificationId = `alarm-${medicineId}-${reminderTimeId}`;
    // Hem displayed hem trigger notification'ı iptal et
    await dismissNotification(notificationId);
    await cancelNotification(notificationId);

    // Yarın için alarmı yeniden planla (günlük tekrar için)
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

  const handleSnooze = async () => {
    // Double-tap koruması
    if (isSnoozingRef.current) {
      log.debug('handleSnooze zaten çalışıyor, atlanıyor');
      return;
    }

    // Erteleme limiti tamamen dolmuşsa (olmaması lazım ama güvenlik)
    if (!canSnooze) {
      log.debug('Erteleme limiti doldu', { currentSnoozeCount, maxSnoozeCount });
      await handleSkip();
      return;
    }

    // Son hak — ertele basıldığında ilaç atlanır, yeni alarm planlanmaz
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

    // KRİTİK: Hem displayed hem trigger notification'ı iptal et
    // dismissNotification sadece displayed'ı kapatır, trigger aktif kalır
    // cancelNotification ikisini de iptal eder
    try {
      await dismissNotification(notificationId);
      await cancelNotification(notificationId);
      log.debug('Bildirimler iptal edildi (displayed + trigger)', { notificationId });
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

      // KRİTİK: currentSnoozeCount kullan (route params veya snoozes array'den zaten doğru hesaplandı)
      // existingSnoozeCount kullanma - background snoozeler snoozes array'e eklenmediği için uyumsuz
      const newSnoozeCount = currentSnoozeCount + 1;

      log.debug('Snooze planlanıyor', {
        currentSnoozeCount,
        newSnoozeCount,
        maxSnoozeCount,
      });

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
          log.debug("Ilac ertelendi ve DB'ye kaydedildi", {
            snoozeDuration,
            notificationId: result.notificationId,
            triggerTime: result.triggerTime.toISOString(),
          });
        } else {
          log.error('Snooze planlanamadi - result null');
        }
      } catch (e) {
        log.error('scheduleSnoozeNotification hatasi', { error: e });
      }

      // Yarın için günlük alarmı yeniden planla (snooze ayrı bildirim, bu günlük tekrar için)
      if (currentReminderTime && !isTestMode) {
        try {
          await scheduleMedicineNotification(medicine, currentReminderTime, true);
          log.debug('Yarin icin alarm yeniden planlandi', { time: currentReminderTime.time });
        } catch (e) {
          log.debug('Alarm yeniden planlama hatasi', { error: e });
        }
      }
    }

    // goBack çağır
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }

    log.debug('handleSnooze bitti');
  };

  // İlaç bulunamadı - bu ekran görünmemeli, useEffect geri dönmeli
  // Ama navigation başarısız olursa bu görünür
  if (!medicine) {
    // Test modu değilse ana ekrana dön
    if (!isTestMode) {
      // Fallback: 500ms sonra tekrar navigation dene
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }, 500);
    }

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={styles.errorText}>
          {language === 'tr'
            ? 'İlaç bulunamadı, ana ekrana dönülüyor...'
            : 'Medicine not found, returning to home...'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 15, backgroundColor: '#4ECDC4', borderRadius: 10 }}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            {language === 'tr' ? 'Ana Ekrana Dön' : 'Go to Home'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentTime = format(new Date(), 'HH:mm');
  const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: dateLocale });

  if (showScanner && device) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={showScanner}
          codeScanner={codeScanner}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerTitle}>
            {language === 'tr' ? 'İlacın Barkodunu Okutun' : 'Scan Medicine Barcode'}
          </Text>
          {scannedMessage ? <Text style={styles.scannerMessage}>{scannedMessage}</Text> : null}
          <TouchableOpacity style={styles.cancelScanButton} onPress={() => setShowScanner(false)}>
            <Text style={styles.cancelScanText}>{language === 'tr' ? 'İptal' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Talimat metni
  const getInstructionDisplayText = () => getInstructionDisplay(medicine.instructions, language);

  return (
    <View style={[styles.container, { backgroundColor: medicine.color }]}>
      {/* Üst kısım - Saat */}
      <View style={styles.timeSection}>
        <Text style={styles.currentTime}>{currentTime}</Text>
        <Text style={styles.currentDate}>{currentDate}</Text>
      </View>

      {/* Orta kısım - İlaç bilgisi */}
      <View style={styles.medicineSection}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.medicineIcon}>💊</Text>
        </Animated.View>

        <Text style={styles.alarmTitle}>{t('alarm_time_to_take')}</Text>
        <Text style={styles.medicineName}>{medicine.name}</Text>
        <Text style={styles.dosageText}>{medicine.dosage}</Text>

        {getInstructionDisplayText() && (
          <View style={styles.instructionBadge}>
            <Text style={styles.instructionText}>{getInstructionDisplayText()}</Text>
          </View>
        )}
      </View>

      {/* Alt kısım - Butonlar */}
      <View style={styles.actionSection}>
        {/* Ana buton - Aldım */}
        <TouchableOpacity style={styles.takeButton} onPress={handleTake} activeOpacity={0.8}>
          <Text style={styles.takeButtonIcon}>✓</Text>
          <Text style={styles.takeButtonText}>{t('alarm_take_now')}</Text>
        </TouchableOpacity>

        {/* Erteleme butonu */}
        <TouchableOpacity
          style={[styles.snoozeButton, !canSnooze && styles.snoozeButtonDisabled]}
          onPress={handleSnooze}
          activeOpacity={0.8}
        >
          <Text style={[styles.snoozeButtonText, !canSnooze && styles.snoozeButtonTextDisabled]}>
            {(() => {
              const durationLabel =
                snoozeDuration < 1
                  ? `${Math.round(snoozeDuration * 60)} ${language === 'tr' ? 'sn' : 'sec'}`
                  : `${snoozeDuration} ${language === 'tr' ? 'dk' : 'min'}`;
              if (!canSnooze) {
                return `❌ ${language === 'tr' ? 'Erteleme hakkın bitti' : 'No snoozes left'}`;
              }
              if (remainingSnoozes === 1) {
                return `⚠️ ${language === 'tr' ? 'Ertele — Son hak! (İlaç atlanır)' : 'Snooze — Last chance! (Medicine skipped)'}`;
              }
              return `⏰ ${durationLabel} ${language === 'tr' ? 'ertele' : 'snooze'} — ${language === 'tr' ? `${remainingSnoozes} hak` : `${remainingSnoozes} left`}`;
            })()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 50,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
  },
  timeSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  currentTime: {
    fontSize: 64,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  currentDate: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  medicineSection: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  medicineIcon: {
    fontSize: 60,
  },
  alarmTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  medicineName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  dosageText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
  },
  instructionBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: 30,
  },
  takeButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  takeButtonIcon: {
    fontSize: 24,
    color: '#4ECDC4',
    marginRight: 10,
  },
  takeButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  snoozeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  snoozeButtonDisabled: {
    backgroundColor: 'rgba(100,100,100,0.3)',
  },
  snoozeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  snoozeButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  scannerMessage: {
    fontSize: 18,
    color: '#4ECDC4',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelScanButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 40,
  },
  cancelScanText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
