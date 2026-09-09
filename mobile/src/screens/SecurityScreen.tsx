/**
 * SecurityScreen — Güvenlik ve Kilit Ayarları Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * PIN yönetimi, zayıf PIN denetimi, biyometrik doğrulama ve zaman aşımı ayarları
 * `useSecurityController` Presenter Hook'una devredilmiştir.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';

// Alt Bileşenler (Modular UI)
import { HeroSecurityShieldCard } from './SecurityScreen/components/HeroSecurityShieldCard';
import { PinFormView } from './SecurityScreen/components/PinFormView';
import { SecurityToggleCard } from './SecurityScreen/components/SecurityToggleCard';
import { PinManagementCard } from './SecurityScreen/components/PinManagementCard';
import { AutoLockCard } from './SecurityScreen/components/AutoLockCard';
import { SecurityStatusCard } from './SecurityScreen/components/SecurityStatusCard';

// Presenter Hook
import { useSecurityController } from './SecurityScreen/hooks/useSecurityController';

export default function SecurityScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  const {
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
  } = useSecurityController();

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
        edges={['top', 'bottom']}
      >
        <Text style={{ color: colors.text }}>
          {language === 'tr' ? 'Yükleniyor...' : 'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  // PIN formu modu aktifse PIN ekranını göster
  if (pinMode !== 'none') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PinFormView
          pinMode={pinMode}
          onBack={() => setPinMode('none')}
          pin={pin}
          onChangePin={setPin}
          confirmPin={confirmPin}
          onChangeConfirmPin={setConfirmPin}
          oldPin={oldPin}
          onChangeOldPin={setOldPin}
          showPin={showPin}
          onToggleShowPin={() => setShowPin(!showPin)}
          hasPin={hasPin}
          onSave={pinMode === 'create' ? handleCreatePin : handleChangePin}
          onRemovePin={handleClearPin}
          colors={colors}
          language={language}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScreenHeader
        title={language === 'tr' ? 'Güvenlik & PIN' : 'Security & PIN'}
        subtitle={
          language === 'tr'
            ? 'Uygulama Kilit ve Biyometri Ayarları'
            : 'App Lock and Biometric Settings'
        }
        showBack={Boolean(typeof navigation?.canGoBack === 'function' && navigation.canGoBack())}
        onBack={() => {
          if (typeof navigation?.canGoBack === 'function' && navigation.canGoBack()) {
            navigation.goBack();
          } else if (typeof navigation?.navigate === 'function') {
            navigation.navigate('Settings' as never);
          }
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Canlı Güvenlik Kalkanı & Sağlık Gizliliği Paneli */}
        <HeroSecurityShieldCard
          securityEnabled={settings.securityEnabled}
          hasPin={hasPin}
          biometricsEnabled={settings.biometricsEnabled}
          colors={colors}
          isDark={isDark}
          language={language}
        />

        {/* 2. Güvenlik ve Biyometrik Anahtarları */}
        <SecurityToggleCard
          securityEnabled={settings.securityEnabled}
          onToggleSecurity={handleToggleSecurity}
          biometricAvailable={biometricAvailable}
          biometricsEnabled={settings.biometricsEnabled}
          biometricType={biometricType}
          onToggleBiometric={handleToggleBiometric}
          colors={colors}
          isDark={isDark}
          language={language}
        />

        {/* 3. PIN Yönetimi Kartı */}
        <PinManagementCard
          hasPin={hasPin}
          onPressPinAction={() => setPinMode(hasPin ? 'change' : 'create')}
          colors={colors}
          isDark={isDark}
          language={language}
        />

        {/* 4. Otomatik Kilit Zaman Aşımı Kartı */}
        <AutoLockCard
          lockTimeout={settings.lockTimeout}
          onSelectTimeout={handleTimeoutChange}
          colors={colors}
          isDark={isDark}
          language={language}
        />

        {/* 5. Aktif Güvenlik Durumu Özeti */}
        <SecurityStatusCard
          hasPin={hasPin}
          biometricAvailable={biometricAvailable}
          securityType={settings.securityType}
          biometricType={biometricType}
          colors={colors}
          isDark={isDark}
          language={language}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
