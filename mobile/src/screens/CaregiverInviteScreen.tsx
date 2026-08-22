/**
 * CaregiverInviteScreen — Bakıcı Daveti Kabul Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * 6 haneli davet kodu doğrulama, URL'den kod çıkarma, kabul etme ve QR tarayıcı
 * işlemleri `useCaregiverInviteController` Presenter Hook'una aktarılmıştır.
 */

import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular UI)
import { CaregiverInviteHeader } from './CaregiverInviteScreen/components/CaregiverInviteHeader';
import { CaregiverCodeBoxes } from './CaregiverInviteScreen/components/CaregiverCodeBoxes';
import { CaregiverCodeInput } from './CaregiverInviteScreen/components/CaregiverCodeInput';
import { CaregiverHowItWorksBox } from './CaregiverInviteScreen/components/CaregiverHowItWorksBox';

// Presenter Hook
import { useCaregiverInviteController } from './CaregiverInviteScreen/hooks/useCaregiverInviteController';

interface CaregiverInviteScreenProps {
  route?: {
    params?: {
      inviteCode?: string;
    };
  };
}

export default function CaregiverInviteScreen({ route }: CaregiverInviteScreenProps) {
  const { colors, t, code, setCode, isLoading, handleAccept, handleScan, handleClear } =
    useCaregiverInviteController({ route });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* 1. Başlık & İkon */}
        <CaregiverInviteHeader title={t.title} subtitle={t.subtitle} colors={colors} />

        {/* 2. Kod Gösterim Kutucukları */}
        <CaregiverCodeBoxes code={code} colors={colors} />

        {/* 3. Kod Giriş Alanı & QR Butonu & Temizle */}
        <CaregiverCodeInput
          code={code}
          onChangeCode={setCode}
          onScan={handleScan}
          onClear={handleClear}
          clearText={t.clear}
          colors={colors}
        />

        {/* 4. Daveti Kabul Et Butonu */}
        <TouchableOpacity
          style={[
            styles.acceptButton,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            (code.length !== 6 || isLoading) && { backgroundColor: colors.textMuted },
          ]}
          onPress={handleAccept}
          disabled={code.length !== 6 || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptButtonText}>{t.accept}</Text>
          )}
        </TouchableOpacity>

        {/* 5. Nasıl Çalışır Bilgi Kutusu */}
        <CaregiverHowItWorksBox title={t.infoTitle} text={t.infoText} colors={colors} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  acceptButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
