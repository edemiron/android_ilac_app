/**
 * CaregiverScreen — Aile ve Bakıcı Takip Çemberi Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * 2026 Modern Aile & Bakıcı Sağlık Takip Standartları:
 * - Aile Koruma Kalkanı (Hero Card)
 * - Çok Kanallı Hızlı Paylaşım (WhatsApp, SMS, QR)
 * - Granüler İzin & Yetki Düzenleme Modalı
 * - Aktif Aile Üyeleri ve Bekleyen Davetler
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/common/ScreenHeader';

// Alt Bileşenler (Modular UI)
import { CaregiverRoleSegmentedControl } from './CaregiverScreen/components/CaregiverRoleSegmentedControl';
import { CaregiverHeroCard } from './CaregiverScreen/components/CaregiverHeroCard';
import { CaregiverQuickShareBar } from './CaregiverScreen/components/CaregiverQuickShareBar';
import { CaregiverInviteInputCard } from './CaregiverScreen/components/CaregiverInviteInputCard';
import { CaregiverEnterCodeCard } from './CaregiverScreen/components/CaregiverEnterCodeCard';
import { PendingInvitesList } from './CaregiverScreen/components/PendingInvitesList';
import { CaregiversList } from './CaregiverScreen/components/CaregiversList';
import { CaregiverPatientsList } from './CaregiverScreen/components/CaregiverPatientsList';
import { CaregiverPermissionsModal } from './CaregiverScreen/components/CaregiverPermissionsModal';
import { CaregiverQRModal } from './CaregiverScreen/components/CaregiverQRModal';
import { CaregiverGuestNotice } from './CaregiverScreen/components/CaregiverGuestNotice';

// Presenter Hook
import { useCaregiverController } from './CaregiverScreen/hooks/useCaregiverController';

interface CaregiverScreenProps {
  navigation?: any;
}

export default function CaregiverScreen({ navigation }: CaregiverScreenProps) {
  const {
    colors,
    isDark,
    language,
    t,
    // Sekmeler
    activeTab,
    handleChangeTab,
    // Hasta Modu (Beni İzleyenler)
    caregivers,
    pendingInvites,
    email,
    setEmail,
    isCreating,
    currentInviteCode,
    selectedCaregiverForEdit,
    handleInvite,
    handleWhatsAppShare,
    handleNativeShare,
    handleShowQR,
    handleRemoveCaregiver,
    handleEditPermissions,
    handleClosePermissions,
    handleSavePermissions,
    handleCancelInvite,
    handleShareInvite,
    handleOpenQR,
    // Bakıcı Modu (Takip Ettiğim Kişiler)
    patients,
    inviteCodeInput,
    setInviteCodeInput,
    isAcceptingCode,
    handleAcceptCode,
    handleRemovePatient,
    handleScanQR,
    // Ortak
    isGuest,
    isLoading,
    qrCodeData,
    showQRModal,
    hideQRCode,
    loginWithGoogleProvider,
    isGoogleAvailable,
  } = useCaregiverController({ navigation });

  const canGoBack =
    navigation && typeof navigation.canGoBack === 'function'
      ? navigation.canGoBack()
      : !!navigation?.goBack;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* 1. Standart Üst Navigasyon Çubuğu */}
      <ScreenHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack={canGoBack}
        onBack={() => {
          if (navigation && typeof navigation.goBack === 'function') {
            navigation.goBack();
          }
        }}
      />

      {/* 2. Rol Değiştirici Sekme Kontrolü (Hasta vs Bakıcı) */}
      <CaregiverRoleSegmentedControl
        activeTab={activeTab}
        onChangeTab={handleChangeTab}
        caregiverCount={(caregivers || []).length}
        patientCount={(patients || []).length}
        colors={colors}
        isDark={isDark}
        language={language}
      />

      {/* 2.1 Misafir Kullanıcı Giriş Uyarısı */}
      {isGuest && (
        <CaregiverGuestNotice
          colors={colors}
          isDark={isDark}
          language={language}
          onGoogleSignIn={loginWithGoogleProvider}
          isGoogleAvailable={isGoogleAvailable}
          onSignIn={() => {
            if (navigation && typeof navigation.navigate === 'function') {
              navigation.navigate('Login');
            }
          }}
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {activeTab === 'my_caregivers' ? (
          /* ======================================================== */
          /* A) HASTA MODU: BENİ TAKİP EDENLER                       */
          /* ======================================================== */
          <>
            {/* 3. Aile Koruma Kalkanı (Hero Card) */}
            <CaregiverHeroCard
              caregiverCount={caregivers.length}
              colors={colors}
              isDark={isDark}
              language={language}
            />

            {/* 4. Çok Kanallı Hızlı Davet Çubuğu */}
            <CaregiverQuickShareBar
              onWhatsAppShare={handleWhatsAppShare}
              onNativeShare={handleNativeShare}
              onShowQR={handleShowQR}
              colors={colors}
              isDark={isDark}
              language={language}
            />

            {/* 5. E-posta ile Davet Gönderme Kartı */}
            <CaregiverInviteInputCard
              email={email}
              onChangeEmail={setEmail}
              onInvite={handleInvite}
              isCreating={isCreating}
              colors={colors}
              title={t.addCaregiver}
              placeholder={t.emailPlaceholder}
            />

            {/* 6. Bekleyen Davetler */}
            <PendingInvitesList
              pendingInvites={pendingInvites}
              onOpenQR={handleOpenQR}
              onCancelInvite={handleCancelInvite}
              onShareInvite={handleShareInvite}
              colors={colors}
              isDark={isDark}
              language={language}
              title={t.pendingInvitesTitle}
              expiresText={t.expires}
            />

            {/* 7. Aktif Aile ve Bakıcılar Listesi */}
            <CaregiversList
              caregivers={caregivers}
              isLoading={isLoading}
              onRemoveCaregiver={handleRemoveCaregiver}
              onEditPermissions={handleEditPermissions}
              colors={colors}
              isDark={isDark}
              t={t}
            />
          </>
        ) : (
          /* ======================================================== */
          /* B) BAKICI MODU: TAKİP ETTİĞİM YAKINLARIM                 */
          /* ======================================================== */
          <>
            {/* 8. 6 Haneli Davet Kodu Girme ve QR Tarama Kartı */}
            <CaregiverEnterCodeCard
              code={inviteCodeInput}
              onChangeCode={setInviteCodeInput}
              onSubmitCode={handleAcceptCode}
              onScanQR={handleScanQR}
              isLoading={isAcceptingCode}
              colors={colors}
              isDark={isDark}
              language={language}
            />

            {/* 9. Takip Ettiğim Hastalar / Yakınlar Listesi */}
            <CaregiverPatientsList
              patients={patients}
              isLoading={isLoading}
              onRemovePatient={handleRemovePatient}
              colors={colors}
              isDark={isDark}
              language={language}
            />
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 10. Granüler İzin Düzenleme Modalı */}
      <CaregiverPermissionsModal
        visible={!!selectedCaregiverForEdit}
        caregiver={selectedCaregiverForEdit}
        onClose={handleClosePermissions}
        onSave={handleSavePermissions}
        colors={colors}
        isDark={isDark}
        language={language}
      />

      {/* 11. QR Kod ve Davet Paylaşım Modalı */}
      <CaregiverQRModal
        visible={showQRModal}
        onClose={hideQRCode}
        currentInviteCode={currentInviteCode}
        qrCodeData={qrCodeData}
        onShareInvite={handleShareInvite}
        colors={colors}
        t={t}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
