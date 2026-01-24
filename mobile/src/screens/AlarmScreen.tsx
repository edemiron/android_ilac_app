import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import Sound from 'react-native-sound';
import * as Haptics from 'expo-haptics';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, ReminderTime } from '../types';
import { formatTimeDisplay, getInstructionText } from '../utils/timeCalculator';
import { speakMedicineReminder, stopSpeaking } from '../utils/speech';
import { scheduleSnoozeNotification, dismissNotification } from '../utils/notifications';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';

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
  const soundRef = useRef<Audio.Sound | null>(null);
  const nativeSoundRef = useRef<Sound | null>(null); // react-native-sound için
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppedRef = useRef<boolean>(false); // Alarm durduruldu mu?

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

  // Titreşim, ses ve TTS
  useEffect(() => {
    // Reset stopped flag
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

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Ses çalma - Sessiz modda bile çalması için STREAM_ALARM kullan
    const playSound = async () => {
      console.log('=== SES ÇALMA BAŞLIYOR ===');
      
      if (Platform.OS === 'android') {
        // Android: react-native-sound ile STREAM_ALARM kullan
        try {
          // Önce kategoriyi Alarm olarak ayarla - BU ÖNEMLİ!
          Sound.setCategory('Alarm', true);
          console.log('Sound category: Alarm');
          
          // Ses dosyasını yükle (raw klasöründen, uzantısız)
          const sound = new Sound('alarm.mp3', Sound.MAIN_BUNDLE, (error) => {
            if (error) {
              console.log('Sound yükleme hatası, expo-av deneniyor:', error);
              playWithExpoAv();
              return;
            }
            
            if (isStoppedRef.current) {
              sound.release();
              return;
            }
            
            nativeSoundRef.current = sound;
            sound.setVolume(1.0);
            sound.setNumberOfLoops(-1); // Sonsuz döngü
            
            sound.play((success) => {
              console.log('Sound.play callback, success:', success);
            });
            
            console.log('=== ALARM SESİ BAŞLADI (STREAM_ALARM) ===');
          });
        } catch (error) {
          console.error('react-native-sound hatası:', error);
          playWithExpoAv();
        }
      } else {
        // iOS: expo-av kullan
        playWithExpoAv();
      }
    };
    
    // Fallback: expo-av
    const playWithExpoAv = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm.mp3'),
          { isLooping: true, volume: 1.0, shouldPlay: true }
        );
        soundRef.current = sound;
        await sound.playAsync();
        console.log('=== ALARM SESİ BAŞLADI (expo-av) ===');
      } catch (error) {
        console.error('expo-av hatası:', error);
      }
    };

    playSound();

    // Sesli hatırlatma (TTS) - 1 saniye sonra - ref'te sakla
    if (medicine) {
      const speakReminder = async () => {
        try {
          await speakMedicineReminder(
            medicine.name,
            medicine.dosage,
            medicine.instructions,
            language
          );
        } catch (error) {
          console.log('TTS hatası:', error);
        }
      };
      ttsTimeoutRef.current = setTimeout(speakReminder, 1000);
    }

    // Cleanup - TÜM kaynakları temizle
    return () => {
      // TTS timeout temizle
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }
      // Titreşim interval temizle
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      // Titreşimi durdur
      Vibration.cancel();
      // Konuşmayı durdur
      stopSpeaking();
      // Sesi durdur ve unload et
      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicineId, settings.vibrationEnabled, language]); // medicineId kullan, medicine değil!

  const stopAlarm = async () => {
    console.log('=== stopAlarm BAŞLADI ===');
    
    // 0. Flag'i hemen set et - diğer her şeyden önce!
    isStoppedRef.current = true;
    console.log('isStoppedRef = true');
    
    // 1. Titreşim interval'ini durdur (ÖNCELİKLİ!)
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
      console.log('Vibration interval temizlendi');
    }
    
    // 2. Aktif titreşimi durdur - birden fazla kez çağır
    Vibration.cancel();
    Vibration.cancel();
    console.log('Vibration.cancel() çağrıldı');
    
    // 3. TTS timeout'u temizle
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
      console.log('TTS timeout temizlendi');
    }
    
    // 4. Konuşmayı durdur
    try {
      await stopSpeaking();
      console.log('stopSpeaking() çağrıldı');
    } catch (e) {
      console.log('stopSpeaking hatası:', e);
    }
    
    // 5. Sesi durdur - react-native-sound
    if (nativeSoundRef.current) {
      try {
        const sound = nativeSoundRef.current;
        nativeSoundRef.current = null;
        sound.stop();
        sound.release();
        console.log('react-native-sound durduruldu');
      } catch (error) {
        console.log('react-native-sound durdurma hatası:', error);
      }
    }
    
    // 6. Sesi durdur - expo-av
    if (soundRef.current) {
      try {
        const sound = soundRef.current;
        soundRef.current = null; // Önce null yap
        await sound.stopAsync();
        await sound.unloadAsync();
        console.log('expo-av ses durduruldu ve unload edildi');
      } catch (error) {
        console.log('expo-av ses durdurma hatası:', error);
      }
    }
    
    // 6. Son bir kez daha titreşimi durdur
    Vibration.cancel();
    
    console.log('=== stopAlarm BİTTİ ===');
  };

  const handleTake = async () => {
    await stopAlarm();
    if (!isTestMode) {
      logMedicineTaken(reminderTimeId, scheduledTime);
    }
    // Notifee bildirimini kapat
    await dismissNotification(`alarm-${medicineId}-${reminderTimeId}`);
    dismissAlarm();
    navigation.goBack();
  };

  const handleSkip = async () => {
    await stopAlarm();
    if (!isTestMode) {
      logMedicineSkipped(reminderTimeId, scheduledTime);
    }
    // Notifee bildirimini kapat
    await dismissNotification(`alarm-${medicineId}-${reminderTimeId}`);
    dismissAlarm();
    navigation.goBack();
  };

  const handleSnooze = async () => {
    console.log('=== handleSnooze BAŞLADI ===');
    
    try {
      await stopAlarm();
      console.log('stopAlarm tamamlandı');
    } catch (error) {
      console.log('stopAlarm HATA:', error);
    }
    
    // Notifee bildirimini kapat
    await dismissNotification(`alarm-${medicineId}-${reminderTimeId}`);
    
    dismissAlarm();
    console.log('dismissAlarm çağrıldı');
    
    // Erteleme bildirimi planla (test modunda da çalışsın)
    if (medicine) {
      const testReminderTime = {
        id: 'test-reminder',
        medicineId: medicine.id,
        time: format(new Date(), 'HH:mm'),
        isEnabled: true,
      };
      try {
        await scheduleSnoozeNotification(medicine, currentReminderTime || testReminderTime, snoozeDuration);
        console.log(`İlaç ${snoozeDuration} dakika ertelendi`);
      } catch (e) {
        console.log('scheduleSnoozeNotification HATA:', e);
      }
    }
    
    console.log('navigation.goBack() çağrılıyor...');
    
    // goBack çağır
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      console.log('canGoBack false, navigate ile Home\'a git');
      navigation.navigate('Main' as any);
    }
    
    console.log('=== handleSnooze BİTTİ ===');
  };

  if (!medicine) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {language === 'tr' ? 'İlaç bulunamadı' : 'Medicine not found'}
        </Text>
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
