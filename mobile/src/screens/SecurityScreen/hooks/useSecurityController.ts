/**
 * useSecurityController — SecurityScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * PIN oluşturma, değiştirme, silme, zayıf PIN denetimi, biyometrik kimlik doğrulama,
 * otomatik kilit zaman aşımı ve güvenlik ayarlarını UI bileşeninden izole eder.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedicineStore } from '../../../stores/medicineStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAlert } from '../../../contexts/AlertContext';
import {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  savePin,
  verifyPin,
  clearPin,
  isValidPin,
  isPinSet,
  saveSecuritySettings,
  getBiometricTypeName,
} from '../../../utils/security';
import { createScopedLogger } from '../../../utils/logger';
import { triggerHaptic } from '../helpers';
import type { RootStackParamList } from '../../../types';

const log = createScopedLogger('SecurityController');

// Yaygın/zayıf PIN listesi
export const WEAK_PINS = [
  '1234',
  '1111',
  '0000',
  '1212',
  '7777',
  '1004',
  '2000',
  '4444',
  '2222',
  '3333',
  '5555',
  '6666',
  '8888',
  '9999',
  '123456',
  '654321',
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type PinMode = 'none' | 'create' | 'verify' | 'change';

export function useSecurityController() {
  const navigation = useNavigation<NavigationProp>();
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { settings, updateSettings } = useMedicineStore();

  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [pinMode, setPinMode] = useState<PinMode>('none');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  const loadSecurityStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const bioAvail = await checkBiometricAvailability();
      setBiometricAvailable(bioAvail.available);
      if (bioAvail.available && bioAvail.biometricsType.length > 0) {
        setBiometricType(getBiometricTypeName(bioAvail.biometricsType));
      }
      const pinSet = await isPinSet();
      setHasPin(pinSet);
    } catch (error) {
      log.error('Güvenlik durumu yükleme hatası', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityStatus();
  }, [loadSecurityStatus]);

  const handleToggleSecurity = useCallback(
    async (enabled: boolean) => {
      if (enabled && !hasPin && !biometricAvailable) {
        showAlert({
          type: 'warning',
          title: language === 'tr' ? 'Güvenlik Yöntemi Gerekli' : 'Security Method Required',
          message:
            language === 'tr'
              ? 'Güvenliği aktif etmek için PIN veya biyometrik kimlik doğrulama ayarlamalısınız.'
              : 'You need to set up PIN or biometric authentication to enable security.',
        });
        return;
      }
      updateSettings({ securityEnabled: enabled });
      await saveSecuritySettings({
        securityEnabled: enabled,
        securityType: settings.securityType,
        biometricsEnabled: settings.biometricsEnabled,
        lockTimeout: settings.lockTimeout,
      });
      triggerHaptic(enabled ? 'success' : 'light');
    },
    [hasPin, biometricAvailable, settings, language, updateSettings, showAlert]
  );

  const handleToggleBiometric = useCallback(
    async (enabled: boolean) => {
      if (enabled && !biometricAvailable) {
        showAlert({
          type: 'warning',
          title: language === 'tr' ? 'Biyometrik Kullanılamıyor' : 'Biometric Unavailable',
          message:
            language === 'tr'
              ? 'Cihazınız biyometrik kimlik doğrulamayı desteklemiyor.'
              : 'Your device does not support biometric authentication.',
        });
        return;
      }

      if (enabled) {
        const result = await authenticateWithBiometrics();
        if (!result.success) return;
      }

      updateSettings({
        biometricsEnabled: enabled,
        securityType: enabled ? (hasPin ? 'both' : 'biometric') : hasPin ? 'pin' : 'none',
      });
      await saveSecuritySettings({
        securityEnabled: settings.securityEnabled,
        securityType: enabled ? (hasPin ? 'both' : 'biometric') : hasPin ? 'pin' : 'none',
        biometricsEnabled: enabled,
        lockTimeout: settings.lockTimeout,
      });
      triggerHaptic(enabled ? 'success' : 'light');
    },
    [biometricAvailable, hasPin, settings, language, updateSettings, showAlert]
  );

  const handleCreatePin = async () => {
    if (!isValidPin(pin)) {
      showAlert({
        type: 'error',
        title: language === 'tr' ? 'Geçersiz PIN' : 'Invalid PIN',
        message: language === 'tr' ? 'PIN 4-6 haneli olmalı.' : 'PIN must be 4-6 digits.',
      });
      return;
    }
    if (pin !== confirmPin) {
      showAlert({
        type: 'error',
        title: language === 'tr' ? 'PIN Eşleşmiyor' : 'PIN Mismatch',
        message: language === 'tr' ? "PIN'ler birbiriyle eşleşmiyor." : 'PINs do not match.',
      });
      return;
    }

    if (WEAK_PINS.includes(pin)) {
      showAlert({
        type: 'error',
        title: language === 'tr' ? 'Zayıf PIN' : 'Weak PIN',
        message:
          language === 'tr'
            ? 'Bu PIN çok yaygın kullanılıyor. Lütfen daha güvenli bir PIN seçin.'
            : 'This PIN is too common. Please choose a more secure PIN.',
      });
      return;
    }

    const saved = await savePin(pin);
    if (saved) {
      setHasPin(true);
      setPinMode('none');
      setPin('');
      setConfirmPin('');
      updateSettings({
        securityType: settings.biometricsEnabled ? 'both' : 'pin',
        securityEnabled: true,
      });
      triggerHaptic('success');
    } else {
      showAlert({
        type: 'error',
        title: language === 'tr' ? 'Hata' : 'Error',
        message: language === 'tr' ? 'PIN kaydedilemedi.' : 'Failed to save PIN.',
      });
    }
  };

  const handleChangePin = async () => {
    const verifyResult = await verifyPin(oldPin);
    if (!verifyResult.success) {
      showAlert({
        type: 'error',
        title: language === 'tr' ? 'Yanlış PIN' : 'Incorrect PIN',
        message:
          verifyResult.error ||
          (language === 'tr' ? 'Mevcut PIN hatalı' : 'Current PIN is incorrect'),
      });
      triggerHaptic('error');
      return;
    }
    if (!isValidPin(pin)) {
      showAlert({ type: 'error', title: language === 'tr' ? 'Geçersiz PIN' : 'Invalid PIN' });
      return;
    }
    if (pin !== confirmPin) {
      showAlert({ type: 'error', title: language === 'tr' ? 'PIN Eşleşmiyor' : 'PIN Mismatch' });
      return;
    }

    if (WEAK_PINS.includes(pin)) {
      showAlert({
        type: 'error',
        title: language === 'tr' ? 'Zayıf PIN' : 'Weak PIN',
        message:
          language === 'tr'
            ? 'Bu PIN çok yaygın kullanılıyor. Lütfen daha güvenli bir PIN seçin.'
            : 'This PIN is too common. Please choose a more secure PIN.',
      });
      return;
    }

    if (await savePin(pin)) {
      setPinMode('none');
      setPin('');
      setConfirmPin('');
      setOldPin('');
      triggerHaptic('success');
    }
  };

  const handleClearPin = () => {
    showAlert({
      type: 'warning',
      title: language === 'tr' ? 'PIN Sil' : 'Remove PIN',
      message: language === 'tr' ? "PIN'i silmek istediğinize emin misiniz?" : 'Are you sure?',
      buttons: [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Sil' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (await clearPin()) {
              setHasPin(false);
              updateSettings({
                securityType: settings.biometricsEnabled ? 'biometric' : 'none',
                securityEnabled: settings.biometricsEnabled,
              });
              triggerHaptic('success');
            }
          },
        },
      ],
    });
  };

  const handleTimeoutChange = async (timeout: number) => {
    updateSettings({ lockTimeout: timeout });
    await saveSecuritySettings({
      securityEnabled: settings.securityEnabled,
      securityType: settings.securityType,
      biometricsEnabled: settings.biometricsEnabled,
      lockTimeout: timeout,
    });
    triggerHaptic('light');
  };

  return {
    navigation,
    colors,
    t,
    language,
    settings,
    isLoading,
    biometricAvailable,
    biometricType,
    pinMode,
    setPinMode,
    pin,
    setPin,
    confirmPin,
    setConfirmPin,
    oldPin,
    setOldPin,
    showPin,
    setShowPin,
    hasPin,
    handleToggleSecurity,
    handleToggleBiometric,
    handleCreatePin,
    handleChangePin,
    handleClearPin,
    handleTimeoutChange,
  };
}
