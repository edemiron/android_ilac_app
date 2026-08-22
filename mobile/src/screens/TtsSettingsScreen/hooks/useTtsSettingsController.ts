/**
 * useTtsSettingsController — TtsSettingsScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * TTS sesli okuma ayarları, ses seviyesi/tekrar sayısı güncellemeleri,
 * ses testi motoru ve haptic bildirimleri UI bileşeninden izole eder.
 */

import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useMedicineStore } from '../../../stores/medicineStore';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Tts from 'react-native-tts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('TtsSettingsController');

export function useTtsSettingsController() {
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
  };

  const handleRepeatCountChange = (count: number) => {
    updateSettings({ ttsRepeatCount: count });
    triggerHaptic('light');
  };

  const handleTestVoice = async () => {
    if (isTesting) {
      try {
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
      await Tts.setDefaultLanguage(language === 'tr' ? 'tr-TR' : 'en-US');
      await Tts.setDefaultRate(0.5);
      await Tts.setDefaultPitch(1.0);

      const message =
        language === 'tr'
          ? 'Sesli bildirim sistemi çalışıyor'
          : 'Voice notification system is working';

      Tts.addEventListener('tts-finish', () => setIsTesting(false));
      await Tts.speak(message);
    } catch {
      setIsTesting(false);
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
    isTesting,
    handleToggleTts,
    handleToggleSpeakName,
    handleToggleSpeakDosage,
    handleToggleSpeakInstructions,
    handleVolumeChange,
    handleRepeatCountChange,
    handleTestVoice,
  };
}
