/**
 * CaregiverInviteScreen - Bakıcı Daveti Kabul Ekranı
 *
 * Bakıcı adaylarının davet kodunu girerek hasta ile ilişki kurdukları ekran.
 * QR kod tarama veya manuel kod girişi destekler.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/core';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { acceptCaregiverInvite, isValidInviteCode } from '../services/caregiverService';
import { extractInviteCodeFromUrl } from '../services/qrCodeService';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 40,
    },
    iconContainer: {
      alignSelf: 'center',
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    input: {
      flex: 1,
      height: 56,
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: 4,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    scanButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    acceptButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    acceptButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    acceptButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#fff',
    },
    infoBox: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 32,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    codeDisplay: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 24,
    },
    codeBox: {
      width: 48,
      height: 56,
      backgroundColor: colors.card,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    codeBoxFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    codeBoxText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    clearButton: {
      alignSelf: 'center',
      padding: 12,
    },
    clearButtonText: {
      fontSize: 14,
      color: colors.primary,
    },
  });

interface CaregiverInviteScreenProps {
  route?: {
    params?: {
      inviteCode?: string;
    };
  };
}

export default function CaregiverInviteScreen({ route }: CaregiverInviteScreenProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { showInfo, showError } = useAlert();
  const styles = createStyles(colors);

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
      Alert.alert(t.success.title, t.success.message, [
        {
          text: language === 'tr' ? 'Tamam' : 'OK',
          onPress: () => {
            // Navigate back or to caregiver dashboard
            setCode('');
          },
        },
      ]);
    } else {
      showError(language === 'tr' ? 'Hata' : 'Error', result.error || t.error.invalid);
    }
  };

  const handleScan = () => {
    // Barcode scanner ekranını aç
    // Navigation'a göre implementasyon
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

  const renderCodeBoxes = () => {
    const digits = code.toUpperCase().split('');
    const boxes = [];

    for (let i = 0; i < 6; i++) {
      const isFilled = i < digits.length;
      boxes.push(
        <View key={i} style={[styles.codeBox, isFilled && styles.codeBoxFilled]}>
          <Text style={styles.codeBoxText}>{isFilled ? digits[i] : ''}</Text>
        </View>
      );
    }

    return boxes;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="people" size={40} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        {/* Code Display (Boxes) */}
        <View style={styles.codeDisplay}>{renderCodeBoxes()}</View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder=""
            maxLength={6}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="center"
          />
          <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
            <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Clear Button */}
        {code.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>{t.clear}</Text>
          </TouchableOpacity>
        )}

        {/* Accept Button */}
        <TouchableOpacity
          style={[
            styles.acceptButton,
            (code.length !== 6 || isLoading) && styles.acceptButtonDisabled,
          ]}
          onPress={handleAccept}
          disabled={code.length !== 6 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>{t.accept}</Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{t.infoTitle}</Text>
          <Text style={styles.infoText}>{t.infoText}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
