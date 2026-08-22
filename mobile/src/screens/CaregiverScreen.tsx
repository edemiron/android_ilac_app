/**
 * CaregiverScreen — Bakıcı (Caregiver) Yönetimi Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm davet oluşturma, QR modal açma, davet iptal etme ve bakıcı ilişkisi yönetimi
 * `useCaregiverController` Presenter Hook'una devredilmiştir. Bu dosya yalnızca UI düzenini koordine eder.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular UI)
import { CaregiverInviteInputCard } from './CaregiverScreen/components/CaregiverInviteInputCard';
import { PendingInvitesList } from './CaregiverScreen/components/PendingInvitesList';
import { CaregiversList } from './CaregiverScreen/components/CaregiversList';
import { CaregiverQRModal } from './CaregiverScreen/components/CaregiverQRModal';

// Presenter Hook
import { useCaregiverController } from './CaregiverScreen/hooks/useCaregiverController';

export default function CaregiverScreen() {
  const {
    colors,
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
    handleInvite,
    handleRemoveCaregiver,
    handleCancelInvite,
    handleShareInvite,
    handleOpenQR,
  } = useCaregiverController();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Başlık */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t.subtitle}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 2. E-posta ile Davet Gönderme Kartı */}
        <CaregiverInviteInputCard
          email={email}
          onChangeEmail={setEmail}
          onInvite={handleInvite}
          isCreating={isCreating}
          colors={colors}
          title={t.addCaregiver}
          placeholder={t.emailPlaceholder}
        />

        {/* 3. Bekleyen Davetler */}
        <PendingInvitesList
          pendingInvites={pendingInvites}
          onOpenQR={handleOpenQR}
          onCancelInvite={handleCancelInvite}
          colors={colors}
          language={language}
          title={t.pendingInvitesTitle}
          expiresText={t.expires}
        />

        {/* 4. Aktif Bakıcılar Listesi */}
        <CaregiversList
          caregivers={caregivers}
          isLoading={isLoading}
          onRemoveCaregiver={handleRemoveCaregiver}
          colors={colors}
          t={t}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 5. QR Kod ve Davet Paylaşım Modalı */}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});
