/**
 * InteractionsScreen — Çapraz İlaç Etkileşimleri Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm ilaç etkileşim algoritmaları, ciddiyet seviyesi analizleri ve durum
 * yönetimi `useInteractionsController` Presenter Hook'una aktarılmıştır.
 * Bu dosya yalnızca UI elemanlarının deklaratif kompozisyonundan sorumludur.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

// Alt Bileşenler (Modular UI)
import { ActiveMedicinesCard } from './InteractionsScreen/components/ActiveMedicinesCard';
import { InteractionSummaryCard } from './InteractionsScreen/components/InteractionSummaryCard';
import { InteractionDetailCard } from './InteractionsScreen/components/InteractionDetailCard';

// Presenter Hook
import { useInteractionsController } from './InteractionsScreen/hooks/useInteractionsController';

export default function InteractionsScreen() {
  const { colors, language, t, activeMedicines, isLoading, result, getSeverityText } =
    useInteractionsController();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Başlık */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('interaction_title')}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {language === 'tr'
            ? `${activeMedicines.length} aktif ilaç kontrol ediliyor`
            : `${activeMedicines.length} active medicines being checked`}
        </Text>
      </View>

      {/* 2. Aktif İlaçlar Listesi */}
      <ActiveMedicinesCard activeMedicines={activeMedicines} colors={colors} />

      {/* 3. Etkileşim Sonuçları */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('interaction_checking')}
          </Text>
        </View>
      ) : result ? (
        <View style={styles.resultsContainer}>
          {/* Özet Kartı */}
          <InteractionSummaryCard result={result} colors={colors} t={t} />

          {/* Detay Kartları */}
          {result.interactions?.map((interaction, index) => (
            <InteractionDetailCard
              key={index}
              interaction={interaction}
              getSeverityText={getSeverityText}
              colors={colors}
              language={language}
            />
          ))}

          {/* Sorumluluk Reddi */}
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            {language === 'tr'
              ? 'Bu bilgiler bilgilendirme amaçlıdır. Herhangi bir değişiklik yapmadan önce lütfen doktorunuza veya eczacınıza danışın.'
              : 'This information is for informational purposes only. Please consult your doctor or pharmacist before making any changes.'}
          </Text>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
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
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
