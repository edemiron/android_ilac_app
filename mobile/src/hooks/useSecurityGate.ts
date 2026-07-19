import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  authenticateWithBiometrics,
  getSecuritySettings,
  updateLastActiveTime,
  verifyPin,
} from '../utils/security';
import type { SecuritySettings } from '../utils/security';

export interface UseSecurityGateResult {
  securityCheckComplete: boolean;
  showPinEntry: boolean;
  pinInput: string;
  setPinInput: (value: string) => void;
  securitySettings: SecuritySettings | null;
  handlePinVerify: () => Promise<void>;
  handlePinCancel: () => void;
}

export interface UseSecurityGateOptions {
  /**
   * Alarm abort edildiğinde deferred security'yi resume etmek için çağrılır.
   * App.tsx'teki `resumeDeferredSecurityAfterAlarmAbort` ile birebir aynı mantık.
   */
  onPinSuccess?: () => void;
}

/**
 * App.tsx'ten birebir çıkartılmış güvenlik kapısı (PIN/biometric) hook'u.
 *
 * Davranış sözleşmesi (değişmedi):
 * - `isAuthenticated` true olduğunda ve security açıksa, önce biometric dene
 * - Biometric başarısızsa veya PIN modundaysa, PIN giriş modalını göster
 * - PIN doğruysa securityCheckComplete=true yap, modalı kapat, last active güncelle
 * - PIN yanlışsa input temizlenir ve hata alert gösterilir
 */
export function useSecurityGate(options: UseSecurityGateOptions = {}): UseSecurityGateResult {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();

  const [securityCheckComplete, setSecurityCheckComplete] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

  // Güvenlik kontrolü - app açılışında
  useEffect(() => {
    const checkSecurity = async () => {
      if (!isAuthenticated) return;

      const secSettings = await getSecuritySettings();
      if (!secSettings || !secSettings.securityEnabled || secSettings.securityType === 'none') {
        setSecurityCheckComplete(true);
        return;
      }

      setSecuritySettings(secSettings);

      // Biyometrik kontrol
      if (secSettings.securityType === 'biometric' || secSettings.securityType === 'both') {
        const bioResult = await authenticateWithBiometrics();
        if (bioResult.success) {
          await updateLastActiveTime();
          setSecurityCheckComplete(true);
          return;
        }
        // Biyometrik başarısız ve "biometric" modundaysa, PIN gerekli
        if (secSettings.securityType === 'biometric') {
          setShowPinEntry(true);
          return;
        }
      }

      // PIN gerekli
      if (secSettings.securityType === 'pin' || secSettings.securityType === 'both') {
        setShowPinEntry(true);
      }
    };

    checkSecurity();
  }, [isAuthenticated]);

  const handlePinVerify = useCallback(async () => {
    if (!pinInput || pinInput.length < 4) {
      Alert.alert(
        language === 'tr' ? 'Geçersiz PIN' : 'Invalid PIN',
        language === 'tr' ? 'PIN en az 4 haneli olmalı.' : 'PIN must be at least 4 digits.'
      );
      return;
    }

    const result = await verifyPin(pinInput);
    if (result.success) {
      setPinInput('');
      setShowPinEntry(false);
      await updateLastActiveTime();
      setSecurityCheckComplete(true);
      options.onPinSuccess?.();
    } else {
      Alert.alert(
        language === 'tr' ? 'Yanlış PIN' : 'Incorrect PIN',
        result.error ||
          (language === 'tr' ? 'Girdiğiniz PIN doğru değil.' : 'The PIN you entered is incorrect.')
      );
      if (!result.success) {
        setPinInput('');
      }
    }
  }, [pinInput, language, options]);

  const handlePinCancel = useCallback(() => {
    setPinInput('');
    setShowPinEntry(false);
  }, []);

  return {
    securityCheckComplete,
    showPinEntry,
    pinInput,
    setPinInput,
    securitySettings,
    handlePinVerify,
    handlePinCancel,
  };
}
