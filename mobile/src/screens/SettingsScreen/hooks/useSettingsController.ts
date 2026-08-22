/**
 * useSettingsController — SettingsScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Genel ayarlar, profil, tema, dil, bildirimler, dev mode sayacı,
 * FAQ ve JSON yedekleme akışlarını UI bileşeninden izole eder.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsScreen } from '../../../hooks/useSettingsScreen';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAlert } from '../../../contexts/AlertContext';
import { useMedicineStore } from '../../../stores/medicineStore';
import { createBackupPayload, shareBackup } from '../../../services/backupRestoreService';
import { createScopedLogger } from '../../../utils/logger';
import { DEV_MODE_TAP_COUNT, isDevModeTapExpired } from '../helpers';

const log = createScopedLogger('SettingsController');

export function useSettingsController() {
  const base = useSettingsScreen();
  const { t, language } = useLanguage();
  const { showAlert, showError, showInfo } = useAlert();

  const [isDevMode, setIsDevMode] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  // Dev mode durumunu AsyncStorage'dan oku (kalıcı)
  useEffect(() => {
    AsyncStorage.getItem('dev-mode')
      .then(val => {
        if (val === 'true') setIsDevMode(true);
      })
      .catch(err => {
        log.debug('Failed to read dev-mode from storage', err);
      });
  }, []);

  const handleVersionPress = useCallback(() => {
    const now = Date.now();

    if (isDevModeTapExpired(lastTapTimeRef.current, now)) {
      tapCountRef.current = 0;
    }

    lastTapTimeRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= DEV_MODE_TAP_COUNT) {
      tapCountRef.current = 0;
      const newDevMode = !isDevMode;
      setIsDevMode(newDevMode);
      AsyncStorage.setItem('dev-mode', newDevMode ? 'true' : 'false').catch(() => {});

      showInfo(
        newDevMode
          ? language === 'tr'
            ? 'Geliştirici Modu Açık'
            : 'Developer Mode Enabled'
          : language === 'tr'
            ? 'Geliştirici Modu Kapalı'
            : 'Developer Mode Disabled',
        newDevMode
          ? language === 'tr'
            ? 'Geliştirici test seçenekleri artık görünür.'
            : 'Developer test options are now visible.'
          : language === 'tr'
            ? 'Geliştirici test seçenekleri gizlendi.'
            : 'Developer test options are now hidden.'
      );
    }
  }, [isDevMode, language, showInfo]);

  const handleFAQPress = () => {
    showAlert({
      type: 'info',
      title: language === 'tr' ? 'Sıkça Sorulan Sorular' : 'FAQ',
      message:
        language === 'tr'
          ? '1. Alarm çalmadığında ne yapmalıyım?\nAyarlardan pil optimizasyonunu kapatın ve bildirim izinlerini verin.\n\n2. Verilerim bulutta saklanıyor mu?\nEvet, Google hesabınızla giriş yaptığınızda tüm ilaçlarınız otomatik eşitlenir.'
          : '1. What if alarms do not ring?\nDisable battery optimization in settings and allow notifications.\n\n2. Are my data backed up?\nYes, when signed in with Google, your meds sync automatically.',
      buttons: [{ text: language === 'tr' ? 'Anladım' : 'Got it' }],
    });
  };

  const handleExportBackup = async () => {
    const state = useMedicineStore.getState();
    const payload = createBackupPayload(
      state.medicines,
      state.reminderTimes,
      state.medicineLogs,
      state.settings
    );
    const result = await shareBackup(payload);
    if (!result.success && result.error !== 'cancelled') {
      showError(
        language === 'tr' ? 'Yedekleme Hatası' : 'Backup Error',
        result.error ||
          (language === 'tr'
            ? 'Yedekleme dosyası oluşturulamadı.'
            : 'Failed to create backup file.')
      );
    }
  };

  return {
    ...base,
    t,
    isDevMode,
    handleVersionPress,
    handleFAQPress,
    handleExportBackup,
  };
}
