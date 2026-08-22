/**
 * useCaregiverInviteController — CaregiverInviteScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * 6 haneli davet kodunun doğrulama, URL'den yakalama, kabul etme ve QR tarayıcı
 * yönlendirmelerini UI katmanından izole eder.
 */

import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/core';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAlert } from '../../../contexts/AlertContext';
import { acceptCaregiverInvite, isValidInviteCode } from '../../../services/caregiverService';
import { extractInviteCodeFromUrl } from '../../../services/qrCodeService';

interface UseCaregiverInviteControllerProps {
  route?: {
    params?: {
      inviteCode?: string;
    };
  };
}

export function useCaregiverInviteController({ route }: UseCaregiverInviteControllerProps = {}) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { showInfo, showError, showAlert } = useAlert();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = {
    title: language === 'tr' ? 'Daveti Kabul Et' : 'Accept Invite',
    subtitle:
      language === 'tr'
        ? 'Hasta tarafından paylaşılan 6 haneli davet kodunu girin'
        : 'Enter the 6-character invite code shared by the patient',
    scan: language === 'tr' ? 'Tara' : 'Scan',
    accept: language === 'tr' ? 'Daveti Kabul Et' : 'Accept Invite',
    clear: language === 'tr' ? 'Temizle' : 'Clear',
    error: {
      invalid: language === 'tr' ? 'Geçersiz davet kodu' : 'Invalid invite code',
      empty: language === 'tr' ? 'Lütfen davet kodunu girin' : 'Please enter invite code',
      notLoggedIn: language === 'tr' ? 'Oturum açmanız gerekiyor' : 'You need to be logged in',
    },
    success: {
      title: language === 'tr' ? 'Davet Kabul Edildi' : 'Invite Accepted',
      message:
        language === 'tr'
          ? 'Artık bakıcı panelinden ilaç takibini görüntüleyebilirsiniz'
          : 'You can now view the medication schedule from the caregiver panel',
    },
    infoTitle: language === 'tr' ? 'Nasıl çalışır?' : 'How it works?',
    infoText:
      language === 'tr'
        ? 'Hasta, bu uygulamadan 6 haneli bir davet kodu paylaşır. Kodu buraya girerek hastanın ilaç takvimini görüntüleyebilirsiniz.'
        : 'The patient shares a 6-character invite code from this app. Enter the code here to view their medication schedule.',
  };

  // URL parametresinden kodu al
  useFocusEffect(
    React.useCallback(() => {
      const urlCode = route?.params?.inviteCode;
      if (urlCode) {
        const extractedCode = extractInviteCodeFromUrl(urlCode);
        if (extractedCode) {
          setCode(extractedCode);
        }
      }
    }, [route?.params?.inviteCode])
  );

  const handleAccept = async () => {
    if (!user) {
      showError(language === 'tr' ? 'Hata' : 'Error', t.error.notLoggedIn);
      return;
    }

    const upperCode = code.toUpperCase().trim();

    if (!upperCode) {
      showError(language === 'tr' ? 'Hata' : 'Error', t.error.empty);
      return;
    }

    if (!isValidInviteCode(upperCode)) {
      showError(language === 'tr' ? 'Hata' : 'Error', t.error.invalid);
      return;
    }

    setIsLoading(true);

    const result = await acceptCaregiverInvite(
      upperCode,
      user.uid,
      user.displayName || 'Bakıcı',
      '' // FCM token (opsiyonel)
    );

    setIsLoading(false);

    if (result.success) {
      showAlert({
        type: 'success',
        title: t.success.title,
        message: t.success.message,
        buttons: [
          {
            text: language === 'tr' ? 'Tamam' : 'OK',
            onPress: () => {
              setCode('');
            },
          },
        ],
      });
    } else {
      showError(language === 'tr' ? 'Hata' : 'Error', result.error || t.error.invalid);
    }
  };

  const handleScan = () => {
    showInfo(
      language === 'tr' ? 'Bilgi' : 'Info',
      language === 'tr'
        ? 'QR kod tarama özelliği yakında eklenecek'
        : 'QR code scanning feature coming soon'
    );
  };

  const handleClear = () => {
    setCode('');
  };

  return {
    colors,
    isDark,
    language,
    t,
    code,
    setCode,
    isLoading,
    handleAccept,
    handleScan,
    handleClear,
  };
}
