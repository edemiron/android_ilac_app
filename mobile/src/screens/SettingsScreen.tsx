/**
 * SettingsScreen — Uygulama Ayarları ve Tercihler Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm durum yönetimi, dev mode döngüleri, yedekleme ve bildirim picker akışları
 * `useSettingsController` Presenter Hook'una devredilmiştir.
 * Bu dosya yalnızca alt bileşenleri koordine eden salt bir görünüm katmanıdır.
 */

import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Ortak & Ayar Bileşenleri
import { ScreenHeader } from '../components/common/ScreenHeader';
import {
  ProfileHeaderCard,
  AppearanceSection,
  DevTestSection,
  createSettingsStyles,
} from '../components/settings';
import { AccentColorSection } from '../components/settings/AccentColorSection';

// Modüler Alt Bileşenler
import { ProfileSection } from './SettingsScreen/components/ProfileSection';
import { AccountDetailsModal } from './SettingsScreen/components/AccountDetailsModal';
import { BatteryOptimizationModal } from './SettingsScreen/components/BatteryOptimizationModal';
import { AlarmDiagnosticCard } from './SettingsScreen/components/AlarmDiagnosticCard';
import { NotificationsSection } from './SettingsScreen/components/NotificationsSection';
import { AccessibilitySection } from './SettingsScreen/components/AccessibilitySection';
import { DataSecuritySection } from './SettingsScreen/components/DataSecuritySection';
import { HelpSupportSection } from './SettingsScreen/components/HelpSupportSection';
import { LogoutButton } from './SettingsScreen/components/LogoutButton';

// Presenter Hook
import { useSettingsController } from './SettingsScreen/hooks/useSettingsController';

// v1.8.4 — Hesap ve veri silme (Google Play zorunlulugu + KVKK md. 11-e).
// NOT: `useAuth` BILEREK import EDILMIYOR. Bu dosya "salt gorunum katmani"
// olarak tanimli ve her seyi presenter hook'undan aliyor; ayrica AuthContext
// zinciri native Google Sign-In modulunu cekiyor ve bu ekranin testini
// kiriyordu. `logout` presenter uzerinden geliyor.
import { useAccountDeletion } from '../hooks/useAccountDeletion';
import { AccountDeletionModal } from '../components/settings/AccountDeletionModal';
import { MedicalIdModal } from '../components/medicalId/MedicalIdModal';

export default function SettingsScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const diagnosticsOffsetRef = useRef<number>(0);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const scrollToDiagnostics = useCallback(() => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, diagnosticsOffsetRef.current - 12),
      animated: true,
    });
  }, []);

  const {
    navigation,
    colors,
    isDark,
    theme,
    setTheme,
    language,
    setLanguage,
    settings,
    updateSettings,
    isSyncing,
    lastSyncAt,
    user,
    isPremium,
    remainingDays,
    pickerState,
    togglePicker,
    closePicker,
    handleScheduleTestAlarm,
    handleAddTestMedicine,
    handleAddTestMedicine10s,
    handleDeleteTestMedicines,
    handleShowScheduledNotifications,
    handleClearAllData,
    handleSync,
    handleLogout,
    updateDisplayName,
    getThemeLabel,
    getLanguageLabel,
    isDevMode,
    showAccountModal,
    handleAccountPress,
    handleCloseAccountModal,
    showBatteryModal,
    handleBatteryPress,
    handleCloseBatteryModal,
    handleVersionPress,
    handleFAQPress,
    handleExportBackup,
    logout,
  } = useSettingsController();

  /**
   * v1.8.4 — Hesap ve veri silme akisi.
   *
   * `onDeleted` silme TAMAMLANDIKTAN sonra cagriliyor ve yalnizca oturumu
   * kapatiyor. Yonlendirmeyi ayrica yapmiyoruz: AuthContext oturum
   * kapaninca uygulamayi zaten giris akisina dusuruyor. Burada elle
   * `navigation.navigate` cagirmak, artik var olmayan bir hesabin
   * ekranlarina gitmeye calismak olurdu.
   */
  const accountDeletion = useAccountDeletion({
    language: language === 'tr' ? 'tr' : 'en',
    onDeleted: async () => {
      setShowDeleteAccount(false);
      await logout();
    },
  });

  const openDeleteAccount = useCallback(() => {
    accountDeletion.reset();
    setShowDeleteAccount(true);
  }, [accountDeletion]);

  const closeDeleteAccount = useCallback(() => {
    setShowDeleteAccount(false);
    accountDeletion.reset();
  }, [accountDeletion]);

  const [showMedicalIdModal, setShowMedicalIdModal] = useState(false);

  const styles = createSettingsStyles(colors, isDark);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScreenHeader
        title={language === 'tr' ? 'Ayarlar' : 'Settings'}
        subtitle={
          language === 'tr' ? 'Uygulama Tercihleri & Güvenlik' : 'App Preferences & Security'
        }
        showBack={Boolean(typeof navigation?.canGoBack === 'function' && navigation.canGoBack())}
        onBack={() => {
          if (typeof navigation?.canGoBack === 'function' && navigation.canGoBack()) {
            navigation.goBack();
          } else if (typeof navigation?.navigate === 'function') {
            navigation.navigate('Home' as never);
          }
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Üst Profil & Premium Kartı */}
        <ProfileHeaderCard
          displayName={user?.displayName}
          email={user?.email}
          photoURL={user?.photoURL}
          isPremium={isPremium}
          remainingDays={remainingDays}
          onPremiumPress={() => navigation.navigate('Premium' as never)}
        />

        {/* 2. Profil & Hesap Bölümü */}
        <ProfileSection
          user={user}
          isSyncing={isSyncing}
          onAccountPress={handleAccountPress}
          onMedicalIdPress={() => setShowMedicalIdModal(true)}
          navigation={navigation}
          language={language}
        />

        {/* 3. Canlı Sistem & Alarm Teşhis Paneli */}
        {/* Bildirimler bölümündeki "Teşhis panelinde test edin" satırı buraya
            kaydırır; y konumunu onLayout ile ölçüyoruz. */}
        <View
          onLayout={event => {
            diagnosticsOffsetRef.current = event.nativeEvent.layout.y;
          }}
        >
          <AlarmDiagnosticCard
            language={language}
            isDark={isDark}
            colors={colors}
            onBatteryPress={handleBatteryPress}
          />
        </View>

        {/* 4. Bildirim Ayarları Bölümü */}
        <NotificationsSection
          settings={settings}
          updateSettings={updateSettings}
          pickerState={pickerState}
          togglePicker={togglePicker}
          closePicker={closePicker}
          isDark={isDark}
          navigation={navigation}
          language={language}
          onBatteryPress={handleBatteryPress}
          onGoToDiagnostics={scrollToDiagnostics}
        />

        {/* 5. Görünüm & Dil Tercihleri */}
        <AppearanceSection
          showThemePicker={pickerState.showThemePicker}
          showLanguagePicker={pickerState.showLanguagePicker}
          onThemePress={() => togglePicker('showThemePicker')}
          onLanguagePress={() => togglePicker('showLanguagePicker')}
          onThemeSelect={themeValue => {
            setTheme(themeValue);
            closePicker('showThemePicker');
          }}
          onLanguageSelect={lang => {
            setLanguage(lang);
            closePicker('showLanguagePicker');
          }}
          getThemeLabel={getThemeLabel}
          getLanguageLabel={getLanguageLabel}
        />

        {/* 5. Vurgu Rengi Seçimi */}
        <AccentColorSection />

        {/* 6. Kolay Mod (Senior Mode) */}
        <AccessibilitySection
          settings={settings}
          updateSettings={updateSettings}
          isDark={isDark}
          language={language}
        />

        {/* 7. Güvenlik & Veri Yönetimi */}
        <DataSecuritySection
          onExportBackup={handleExportBackup}
          navigation={navigation}
          language={language}
          /*
            v1.8.4: Misafir oturumda satir GOSTERILMEZ — silinecek bir sunucu
            hesabi yok ve "hesabimi sil" demek yanlis olurdu. `isGuest`
            bayragi AuthUser'da tasiniyor.
          */
          onDeleteAccountPress={
            user && !(user as { isGuest?: boolean }).isGuest ? openDeleteAccount : undefined
          }
        />

        {/* 8. Yardım & Destek */}
        <HelpSupportSection
          onFAQPress={handleFAQPress}
          onVersionPress={handleVersionPress}
          language={language}
        />

        {/* 9. Geliştirici Modu Test Bölümü (Sadece aktifse) */}
        {isDevMode && (
          <DevTestSection
            onScheduleAlarm={handleScheduleTestAlarm}
            onAddTestMedicine={handleAddTestMedicine}
            onAddTestMedicine10s={handleAddTestMedicine10s}
            onDeleteTestMedicines={handleDeleteTestMedicines}
            onShowScheduledNotifications={handleShowScheduledNotifications}
            onClearAllData={handleClearAllData}
          />
        )}

        {/* 10. Oturum Kapatma / Giriş Yap Butonu */}
        <LogoutButton user={user} onLogout={handleLogout} language={language} isDark={isDark} />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Hesap Bilgileri Modalı */}
      <AccountDetailsModal
        visible={showAccountModal}
        onClose={handleCloseAccountModal}
        user={user}
        isSyncing={isSyncing}
        lastSyncAt={lastSyncAt}
        onSync={handleSync}
        onUpdateDisplayName={updateDisplayName}
        colors={colors}
        isDark={isDark}
        language={language}
        onLogout={() => {
          handleCloseAccountModal();
          handleLogout();
        }}
      />

      {/* Pil ve Güç Optimizasyonu Modalı */}
      <BatteryOptimizationModal
        visible={showBatteryModal}
        onClose={handleCloseBatteryModal}
        isDark={isDark}
        language={language}
      />

      {/* v1.8.4 — Hesap ve Veri Silme Onayı */}
      <AccountDeletionModal
        visible={showDeleteAccount}
        phase={accountDeletion.phase}
        errorMessage={accountDeletion.errorMessage}
        confirmationInput={accountDeletion.confirmationInput}
        canDelete={accountDeletion.canDelete}
        onChangeConfirmation={accountDeletion.setConfirmationInput}
        onConfirm={accountDeletion.deleteAccountAndData}
        onCancel={closeDeleteAccount}
      />

      {/* v2.0.0 — Acil Durum Tıbbi Kimlik Kartı Modalı (ICE) */}
      <MedicalIdModal
        visible={showMedicalIdModal}
        onClose={() => setShowMedicalIdModal(false)}
        colors={colors}
        isDark={isDark}
        language={language === 'tr' ? 'tr' : 'en'}
      />
    </SafeAreaView>
  );
}
