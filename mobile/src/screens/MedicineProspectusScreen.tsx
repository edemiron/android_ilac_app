/**
 * MedicineProspectusScreen — İlaç Prospektüs Bilgisi Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Veritabanı ve yapay zeka tabanlı prospektüs sorgulama, yenileme ve hata yönetimi
 * `useMedicineProspectusController` Presenter Hook'una devredilmiştir.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular UI)
import { ProspectusHeader } from './MedicineProspectusScreen/components/ProspectusHeader';
import { ProspectusSectionCard } from './MedicineProspectusScreen/components/ProspectusSectionCard';
import { ProspectusErrorCard } from './MedicineProspectusScreen/components/ProspectusErrorCard';

// Presenter Hook
import { useMedicineProspectusController } from './MedicineProspectusScreen/hooks/useMedicineProspectusController';

export default function MedicineProspectusScreen() {
  const {
    colors,
    language,
    medicineName,
    dosage,
    isLoading,
    isRefreshing,
    prospectus,
    error,
    handleRefresh,
  } = useMedicineProspectusController();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Prospektüs bilgileri yükleniyor...' : 'Loading prospectus...'}
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.textMuted }]}>
            {language === 'tr' ? 'AI ile bilgiler getiriliyor' : 'Fetching info with AI'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !prospectus) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ProspectusErrorCard
          error={error || (language === 'tr' ? 'Bilgi bulunamadı' : 'Info not found')}
          onRetry={handleRefresh}
          colors={colors}
          language={language}
        />
      </SafeAreaView>
    );
  }

  const activeIngredientsList = prospectus.activeIngredients?.map(
    item => `${item.name}${item.amount ? ` (${item.amount})` : ''}`
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* 1. Başlık & Dozaj */}
        <ProspectusHeader
          medicineName={medicineName}
          dosage={dosage}
          colors={colors}
          language={language}
        />

        {/* 2. Prospektüs Bölümleri */}
        <ProspectusSectionCard
          title={language === 'tr' ? 'Kullanım Amacı' : 'Indications'}
          content={prospectus.indication}
          icon="🎯"
          colors={colors}
        />

        <ProspectusSectionCard
          title={language === 'tr' ? 'Kullanım Şekli ve Dozaj' : 'Dosage & Administration'}
          content={prospectus.dosageInstructions}
          icon="💊"
          colors={colors}
        />

        <ProspectusSectionCard
          title={language === 'tr' ? 'Yan Etkiler' : 'Side Effects'}
          content={prospectus.sideEffects}
          icon="⚠️"
          colors={colors}
        />

        <ProspectusSectionCard
          title={language === 'tr' ? 'Kullanılmaması Gereken Durumlar' : 'Contraindications'}
          content={prospectus.contraindication}
          icon="⛔"
          colors={colors}
        />

        <ProspectusSectionCard
          title={language === 'tr' ? 'Uyarılar ve Önlemler' : 'Warnings & Precautions'}
          content={prospectus.warnings}
          icon="🔔"
          colors={colors}
        />

        <ProspectusSectionCard
          title={language === 'tr' ? 'Gebelikte Kullanım' : 'Pregnancy'}
          content={prospectus.pregnancy}
          icon="🤰"
          colors={colors}
        />

        <ProspectusSectionCard
          title={language === 'tr' ? 'Saklama Koşulları' : 'Storage Conditions'}
          content={prospectus.storage}
          icon="🌡️"
          colors={colors}
        />

        <ProspectusSectionCard
          title={language === 'tr' ? 'Etkin Madde' : 'Active Ingredients'}
          content={activeIngredientsList}
          icon="🧪"
          colors={colors}
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
});
