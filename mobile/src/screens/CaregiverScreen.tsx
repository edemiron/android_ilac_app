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
import { CaregiverHeroCard } from './CaregiverScreen/components/CaregiverHeroCard';
import { CaregiverQuickShareBar } from './CaregiverScreen/components/CaregiverQuickShareBar';
import { CaregiverInviteInputCard } from './CaregiverScreen/components/CaregiverInviteInputCard';
import { PendingInvitesList } from './CaregiverScreen/components/PendingInvitesList';
import { CaregiversList } from './CaregiverScreen/components/CaregiversList';
import { CaregiverPermissionsModal } from './CaregiverScreen/components/CaregiverPermissionsModal';
import { CaregiverQRModal } from './CaregiverScreen/components/CaregiverQRModal';

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
    caregivers,
    pendingInvites,
    isLoading,
    qrCodeData,
    showQRModal,
    hideQRCode,
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
  } = useCaregiverController();

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {/* 2. Aile Koruma Kalkanı (Hero Card) */}
        <CaregiverHeroCard
          caregiverCount={caregivers.length}
          colors={colors}
          isDark={isDark}
          language={language}
        />

        {/* 3. Çok Kanallı Hızlı Davet Çubuğu */}
        <CaregiverQuickShareBar
          onWhatsAppShare={handleWhatsAppShare}
          onNativeShare={handleNativeShare}
          onShowQR={handleShowQR}
          colors={colors}
          isDark={isDark}
          language={language}
        />

        {/* 4. E-posta ile Davet Gönderme Kartı */}
        <CaregiverInviteInputCard
          email={email}
          onChangeEmail={setEmail}
          onInvite={handleInvite}
          isCreating={isCreating}
          colors={colors}
          title={t.addCaregiver}
          placeholder={t.emailPlaceholder}
        />

        {/* 5. Bekleyen Davetler */}
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

        {/* 6. Aktif Aile ve Bakıcılar Listesi */}
        <CaregiversList
          caregivers={caregivers}
          isLoading={isLoading}
          onRemoveCaregiver={handleRemoveCaregiver}
          onEditPermissions={handleEditPermissions}
          colors={colors}
          isDark={isDark}
          t={t}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 7. Granüler İzin Düzenleme Modalı */}
      <CaregiverPermissionsModal
        visible={!!selectedCaregiverForEdit}
        caregiver={selectedCaregiverForEdit}
        onClose={handleClosePermissions}
        onSave={handleSavePermissions}
        colors={colors}
        isDark={isDark}
        language={language}
      />

      {/* 8. QR Kod ve Davet Paylaşım Modalı */}
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
