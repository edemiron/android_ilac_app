/**
 * InteractionsScreen — Çapraz İlaç, Gıda ve AI Klinik Etkileşim Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm ilaç etkileşim algoritmaları, gıda kısıtlamaları ve Gemini 3.6 Flash
 * analizi `useInteractionsController` Presenter Hook'una aktarılmıştır.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular UI)
import { ActiveMedicinesCard } from './InteractionsScreen/components/ActiveMedicinesCard';
import { InteractionSummaryCard } from './InteractionsScreen/components/InteractionSummaryCard';
import { InteractionDetailCard } from './InteractionsScreen/components/InteractionDetailCard';
import { FoodInteractionsCard } from './InteractionsScreen/components/FoodInteractionsCard';
import { AIClinicalShieldCard } from './InteractionsScreen/components/AIClinicalShieldCard';

// Presenter Hook
import { useInteractionsController } from './InteractionsScreen/hooks/useInteractionsController';

export default function InteractionsScreen() {
  const {
    colors,
    language,
    t,
    activeMedicines,
    isLoading,
    result,
    activeTab,
    setActiveTab,
    foodInteractions,
    aiReport,
    isAILoading,
    runAIAnalysis,
    getSeverityText,
  } = useInteractionsController();

  const isTr = language === 'tr';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Başlık */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isTr ? 'Klinik Etkileşim Kalkanı' : 'Clinical Interaction Shield'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {isTr
              ? `${activeMedicines.length} aktif ilaç farmakolojik olarak denetleniyor`
              : `${activeMedicines.length} active medicines being analyzed`}
          </Text>
        </View>

        {/* 2. Aktif İlaçlar Listesi */}
        <ActiveMedicinesCard activeMedicines={activeMedicines} colors={colors} />

        {/* 3. Segment Tab Bar */}
        <View style={[styles.tabBarContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'drugs' && [styles.activeTabItem, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('drugs')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'drugs' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              💊 {isTr ? 'İlaç - İlaç' : 'Drug-Drug'}
              {result?.interactions?.length ? ` (${result.interactions.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'food' && [styles.activeTabItem, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('food')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'food' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              🍎 {isTr ? 'Gıda & Alkol' : 'Food & Drink'}
              {foodInteractions.length ? ` (${foodInteractions.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'ai' && [styles.activeTabItem, { backgroundColor: '#8A2BE2' }],
            ]}
            onPress={() => setActiveTab('ai')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'ai' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              🤖 {isTr ? 'AI Kalkan' : 'AI Shield'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Tab İçerikleri */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('interaction_checking')}
            </Text>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {/* TAB 1: İlaç - İlaç Etkileşimleri */}
            {activeTab === 'drugs' && result ? (
              <>
                <InteractionSummaryCard result={result} colors={colors} t={t} />

                {result.interactions?.map((interaction, index) => (
                  <InteractionDetailCard
                    key={index}
                    interaction={interaction}
                    getSeverityText={getSeverityText}
                    colors={colors}
                    language={language}
                  />
                ))}
              </>
            ) : null}

            {/* TAB 2: İlaç - Gıda & Alkol Etkileşimleri */}
            {activeTab === 'food' ? (
              <FoodInteractionsCard
                interactions={foodInteractions}
                colors={colors}
                language={language}
              />
            ) : null}

            {/* TAB 3: Gemini 3.6 Flash AI Klinik Kalkanı */}
            {activeTab === 'ai' ? (
              <AIClinicalShieldCard
                report={aiReport}
                isLoading={isAILoading}
                onRefresh={runAIAnalysis}
                colors={colors}
                language={language}
              />
            ) : null}

            {/* Sorumluluk Reddi */}
            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
              {isTr
                ? 'Bu bilgiler klinik karar destek ve bilgilendirme amaçlıdır. Tedavinizde veya dozajınızda herhangi bir değişiklik yapmadan önce daima doktorunuza veya eczacınıza danışınız.'
                : 'This information is for informational and clinical decision support purposes only. Always consult your physician or pharmacist before altering any treatments.'}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  tabBarContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  activeTabItem: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  resultsContainer: {
    paddingHorizontal: 20,
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
