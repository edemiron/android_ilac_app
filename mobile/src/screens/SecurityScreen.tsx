/**
 * SecurityScreen — Güvenlik ve Kilit Ayarları Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * PIN yönetimi, zayıf PIN denetimi, biyometrik doğrulama ve zaman aşımı ayarları
 * `useSecurityController` Presenter Hook'una devredilmiştir. Bu dosya yalnızca UI organizasyonundan sorumludur.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// Alt Bileşenler (Modular UI)
import { PinFormView } from './SecurityScreen/components/PinFormView';
import { SecurityToggleCard } from './SecurityScreen/components/SecurityToggleCard';
import { PinManagementCard } from './SecurityScreen/components/PinManagementCard';
import { AutoLockCard } from './SecurityScreen/components/AutoLockCard';
import { SecurityStatusCard } from './SecurityScreen/components/SecurityStatusCard';

// Presenter Hook
import { useSecurityController } from './SecurityScreen/hooks/useSecurityController';

export default function SecurityScreen() {
  const {
    colors,
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
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: colors.text }}>
          {language === 'tr' ? 'Yükleniyor...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  // PIN formu modu aktifse PIN ekranını göster
  if (pinMode !== 'none') {
    return (
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
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Başlık */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🔒</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {language === 'tr' ? 'Güvenlik' : 'Security'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {language === 'tr'
            ? 'Uygulama güvenliğini ve kilitleme ayarlarını yönetin'
            : 'Manage app security and lock settings'}
        </Text>
      </View>

      {/* 2. Güvenlik ve Biyometrik Anahtarları */}
      <SecurityToggleCard
        securityEnabled={settings.securityEnabled}
        onToggleSecurity={handleToggleSecurity}
        biometricAvailable={biometricAvailable}
        biometricsEnabled={settings.biometricsEnabled}
        biometricType={biometricType}
        onToggleBiometric={handleToggleBiometric}
        colors={colors}
        language={language}
      />

      {/* 3. PIN Yönetimi Kartı */}
      <PinManagementCard
        hasPin={hasPin}
        onPressPinAction={() => setPinMode(hasPin ? 'change' : 'create')}
        colors={colors}
        language={language}
      />

      {/* 4. Otomatik Kilit Zaman Aşımı Kartı */}
      <AutoLockCard
        lockTimeout={settings.lockTimeout}
        onSelectTimeout={handleTimeoutChange}
        colors={colors}
        language={language}
      />

      {/* 5. Aktif Güvenlik Durumu Özeti */}
      <SecurityStatusCard
        hasPin={hasPin}
        biometricAvailable={biometricAvailable}
        securityType={settings.securityType}
        biometricType={biometricType}
        colors={colors}
        language={language}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
});
