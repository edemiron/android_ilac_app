/**
 * useTtsSettingsController — TtsSettingsScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * TTS sesli okuma ayarları, ses seviyesi/tekrar sayısı güncellemeleri,
 * ses testi motoru ve haptic bildirimleri UI bileşeninden izole eder.
 */

import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useMedicineStore } from '../../../stores/medicineStore';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Tts from 'react-native-tts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createScopedLogger } from '../../../utils/logger';
import { speakTestMessage, stopAdvancedSpeaking } from '../../../utils/advancedSpeech';

const log = createScopedLogger('TtsSettingsController');

export function useTtsSettingsController() {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const { colors, isDark } = useTheme();
  const store = useMedicineStore();
  const insets = useSafeAreaInsets();

  const settings = store.settings || {};
  const updateSettings = store.updateSettings || (() => {});
  const [isTesting, setIsTesting] = useState(false);

  const ttsEnabled = settings.ttsEnabled ?? false;
  const ttsSpeakMedicineName = settings.ttsSpeakMedicineName ?? true;
  const ttsSpeakDosage = settings.ttsSpeakDosage ?? true;
  const ttsSpeakInstructions = settings.ttsSpeakInstructions ?? true;
  const ttsRepeatCount = settings.ttsRepeatCount ?? 1;
  const ttsVolume = settings.ttsVolume ?? 80;
  const ttsSpeechRate = settings.ttsSpeechRate ?? 1.1;

  useEffect(() => {
    return () => {
      stopAdvancedSpeaking();
    };
  }, []);

  const triggerHaptic = (type: 'light' | 'success') => {
    try {
      ReactNativeHapticFeedback.trigger(
        type === 'success' ? 'notificationSuccess' : 'impactLight',
        { enableVibrateFallback: true }
      );
    } catch (e) {
      log.debug('Haptic feedback error', e);
    }
  };

  const handleToggleTts = (enabled: boolean) => {
    updateSettings({ ttsEnabled: enabled });
    triggerHaptic('light');
  };

  const handleToggleSpeakName = (enabled: boolean) => {
    updateSettings({ ttsSpeakMedicineName: enabled });
    triggerHaptic('light');
  };

  const handleToggleSpeakDosage = (enabled: boolean) => {
    updateSettings({ ttsSpeakDosage: enabled });
    triggerHaptic('light');
  };

  const handleToggleSpeakInstructions = (enabled: boolean) => {
    updateSettings({ ttsSpeakInstructions: enabled });
    triggerHaptic('light');
  };

  const handleVolumeChange = (delta: number) => {
    const newValue = Math.max(0, Math.min(100, ttsVolume + delta));
    updateSettings({ ttsVolume: newValue });
    triggerHaptic('light');
  };

  const handleSpeechRateChange = (rate: number) => {
    updateSettings({ ttsSpeechRate: rate });
    triggerHaptic('light');
  };

  const handleRepeatCountChange = (count: number) => {
    updateSettings({ ttsRepeatCount: count });
    triggerHaptic('light');
  };

  const handleTestVoice = async () => {
    if (isTesting) {
      try {
        await stopAdvancedSpeaking();
        await Tts.stop();
      } catch (e) {
        log.debug('TTS stop error', e);
      }
      setIsTesting(false);
      return;
    }

    setIsTesting(true);
    triggerHaptic('success');

    try {
      const onFinish = () => {
        setIsTesting(false);
        Tts.removeAllListeners('tts-finish');
        Tts.removeAllListeners('tts-cancel');
      };

      Tts.addEventListener('tts-finish', onFinish);
      Tts.addEventListener('tts-cancel', onFinish);

      await speakTestMessage(language === 'tr' ? 'tr' : 'en', {
        speechRate: ttsSpeechRate,
        speakMedicineName: ttsSpeakMedicineName,
        speakDosage: ttsSpeakDosage,
        speakInstructions: ttsSpeakInstructions,
      });
    } catch {
      setIsTesting(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return {
    language,
    colors,
    isDark,
    insets,
    ttsEnabled,
    ttsSpeakMedicineName,
    ttsSpeakDosage,
    ttsSpeakInstructions,
    ttsRepeatCount,
    ttsVolume,
    ttsSpeechRate,
    isTesting,
    handleToggleTts,
    handleToggleSpeakName,
    handleToggleSpeakDosage,
    handleToggleSpeakInstructions,
    handleVolumeChange,
    handleSpeechRateChange,
    handleRepeatCountChange,
    handleTestVoice,
    handleGoBack,
  };
}
