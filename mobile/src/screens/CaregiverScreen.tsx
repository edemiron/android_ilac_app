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
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
      {/* 1. Üst Navigasyon Çubuğu */}
      <View style={styles.header}>
        {canGoBack && (
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: isDark ? colors.inputBackground : '#F1F5F9' },
            ]}
            onPress={() => navigation?.goBack?.()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t.subtitle}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
