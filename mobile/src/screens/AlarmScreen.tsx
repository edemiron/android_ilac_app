import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';
import { playAlarmSound, stopAlarmSound } from '../utils/alarmSoundManager';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, ReminderTime } from '../types';
import { formatTimeDisplay, getInstructionText } from '../utils/timeCalculator';
import { speakMedicineReminder, stopSpeaking } from '../utils/speech';
import { scheduleSnoozeNotification, scheduleMedicineNotification, dismissNotification, cancelNotification, cancelMedicineNotifications } from '../utils/notifications';
import { generateId } from '../utils/idGenerator';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('AlarmScreen');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Alarm'>;

const { width, height } = Dimensions.get('window');

export default function AlarmScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { medicineId, reminderTimeId, scheduledTime } = route.params;
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
  const testMedicine = useMemo(() => ({
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
  }), []); // Boş dependency - sadece bir kez oluşur
  
  const medicine = isTestMode ? testMedicine : getMedicineById(medicineId);
  const reminderTimes = medicine && !isTestMode ? getReminderTimesForMedicine(medicine.id) : [];
  const currentReminderTime = reminderTimes.find(rt => rt.id === reminderTimeId);
  
  // Erteleme süresi ayarlardan al (varsayılan 5 dakika)
  const snoozeDuration = settings.snoozeDuration || 5;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppedRef = useRef<boolean>(false); // Alarm durduruldu mu?
  const isSnoozingRef = useRef<boolean>(false); // Snooze işlemi devam ediyor mu?

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
      log.debug('Foreground event alindi', { type, notificationId: detail.notification?.id, pressAction: detail.pressAction?.id });
      
      if (type === EventType.ACTION_PRESS) {
        const actionId = detail.pressAction?.id;
        const notificationMedicineId = detail.notification?.data?.medicineId as string;
        
        if (notificationMedicineId === medicineId || detail.notification?.id?.includes(medicineId)) {
          log.debug('Bu alarm icin action algilandi, ses durduruluyor', { actionId });
          
          await stopAlarm();
          
          dismissAlarm();
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' as any }],
            });
          }
        }
      }
      
      if (type === EventType.DISMISSED) {
        const notificationMedicineId = detail.notification?.data?.medicineId as string;
        if (notificationMedicineId === medicineId || detail.notification?.id?.includes(medicineId)) {
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
        routes: [{ name: 'Main' as any }],
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

    ReactNativeHapticFeedback.trigger('notificationWarning', { enableVibrateFallback: true, ignoreAndroidSystemSettings: false });

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
          await speakMedicineReminder(
            medicine.name,
            medicine.dosage,
            medicine.instructions,
            language
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
      stopSpeaking();
      stopAlarmSound();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicine, isTestMode, medicineId, settings.vibrationEnabled, language]);

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
      await stopSpeaking();
    } catch (e) {
      log.debug('stopSpeaking hatasi', { error: e });
    }

    await stopAlarmSound();

    Vibration.cancel();

    log.debug('stopAlarm bitti');
  }, []);

  const handleTake = async () => {
    await stopAlarm();
    log.debug('handleTake called', { isTestMode, reminderTimeId, scheduledTime, medicineId });
    if (!isTestMode) {
      logMedicineTaken(reminderTimeId, scheduledTime, medicineId);
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

  const handleSkip = async () => {
    await stopAlarm();
    log.debug('handleSkip called', { isTestMode, reminderTimeId, scheduledTime, medicineId });
    if (!isTestMode) {
      logMedicineSkipped(reminderTimeId, scheduledTime, medicineId);
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
    isSnoozingRef.current = true;

    log.debug('handleSnooze basladi');

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
      
      const existingSnoozeCount = snoozes.filter(
        s => s.medicineId === medicine.id && 
             s.reminderTimeId === reminderTimeToUse.id && 
             s.originalScheduledTime === originalScheduledTime
      ).length;
      
      try {
        const result = await scheduleSnoozeNotification({
          medicine,
          reminderTime: reminderTimeToUse,
          snoozeDuration,
          snoozeId,
          originalScheduledTime,
          snoozeCount: existingSnoozeCount + 1,
        });
        
        if (result) {
          createSnooze(
            medicine.id,
            reminderTimeToUse.id,
            originalScheduledTime,
            result.triggerTime,
            result.notificationId
          );
          log.debug('Ilac ertelendi ve DB\'ye kaydedildi', { 
            snoozeDuration, 
            notificationId: result.notificationId,
            triggerTime: result.triggerTime.toISOString()
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
      navigation.navigate('Main' as any);
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
          routes: [{ name: 'Main' as any }],
        });
      }, 500);
    }
    
    return (
      <View style={[styles.container, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>
          {language === 'tr' ? 'İlaç bulunamadı, ana ekrana dönülüyor...' : 'Medicine not found, returning to home...'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 15, backgroundColor: '#4ECDC4', borderRadius: 10 }}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' as any }],
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

  // Talimat metni
  const getInstructionDisplay = () => {
    if (!medicine.instructions) return null;
    
    const instructionTexts: Record<string, { tr: string; en: string }> = {
      before_meal: { tr: '🍽️ Yemekten önce', en: '🍽️ Before meal' },
      after_meal: { tr: '🍽️ Yemekten sonra', en: '🍽️ After meal' },
      with_meal: { tr: '🍽️ Yemekle birlikte', en: '🍽️ With meal' },
      empty_stomach: { tr: '⚠️ Aç karnına', en: '⚠️ Empty stomach' },
      before_sleep: { tr: '🌙 Yatmadan önce', en: '🌙 Before sleep' },
    };
    
    return instructionTexts[medicine.instructions]?.[language] || null;
  };

  return (
    <View style={[styles.container, { backgroundColor: medicine.color }]}>
      {/* Üst kısım - Saat */}
      <View style={styles.timeSection}>
        <Text style={styles.currentTime}>{currentTime}</Text>
        <Text style={styles.currentDate}>{currentDate}</Text>
      </View>

      {/* Orta kısım - İlaç bilgisi */}
      <View style={styles.medicineSection}>
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.medicineIcon}>💊</Text>
        </Animated.View>
        
        <Text style={styles.alarmTitle}>{t('alarm_time_to_take')}</Text>
        <Text style={styles.medicineName}>{medicine.name}</Text>
        <Text style={styles.dosageText}>{medicine.dosage}</Text>
        
        {getInstructionDisplay() && (
          <View style={styles.instructionBadge}>
            <Text style={styles.instructionText}>
              {getInstructionDisplay()}
            </Text>
          </View>
        )}
      </View>

      {/* Alt kısım - Butonlar */}
      <View style={styles.actionSection}>
        {/* Ana buton - Aldım */}
        <TouchableOpacity
          style={styles.takeButton}
          onPress={handleTake}
          activeOpacity={0.8}
        >
          <Text style={styles.takeButtonIcon}>✓</Text>
          <Text style={styles.takeButtonText}>{t('alarm_take_now')}</Text>
        </TouchableOpacity>

        {/* İkincil butonlar */}
        <View style={styles.secondaryButtons}>
          <TouchableOpacity
            style={styles.snoozeButton}
            onPress={handleSnooze}
            activeOpacity={0.8}
          >
            <Text style={styles.snoozeButtonText}>
              ⏰ {t('alarm_snooze_minutes', { minutes: snoozeDuration })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>{t('alarm_skip')}</Text>
          </TouchableOpacity>
        </View>
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
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  snoozeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
