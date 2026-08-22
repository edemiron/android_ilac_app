/**
 * PremiumScreen — Premium Abonelik ve Satın Alma Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm IAP satın alma, geri yükleme, diyalog akışları ve fiyat
 * hesaplamaları `usePremiumController` Presenter Hook'una aktarılmıştır.
 * Bu dosya yalnızca UI elemanlarının deklaratif kompozisyonundan sorumludur.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular UI)
import { PremiumActiveView } from './PremiumScreen/components/PremiumActiveView';
import { PremiumHeader } from './PremiumScreen/components/PremiumHeader';
import { PremiumFeaturesCard } from './PremiumScreen/components/PremiumFeaturesCard';
import { PricingOptionCard } from './PremiumScreen/components/PricingOptionCard';
import { PremiumActionButtons } from './PremiumScreen/components/PremiumActionButtons';

// Presenter Hook
import { usePremiumController } from './PremiumScreen/hooks/usePremiumController';

export default function PremiumScreen() {
  const {
    colors,
    language,
    isPremium,
    remainingDays,
    monthlyPrice,
    yearlyPrice,
    yearlySavings,
    features,
    selectedPeriod,
    setSelectedPeriod,
    isLoading,
    handlePurchase,
    handleRestore,
    subscriptionPlans,
  } = usePremiumController();

  // 1. Zaten premium üye ise sadeleşmiş aktif üyelik görünümü göster
  if (isPremium) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <PremiumActiveView
            remainingDays={remainingDays}
            features={features}
            colors={colors}
            language={language}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. Satın alma ve yükseltme görünümü
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Başlık & İkon */}
        <PremiumHeader colors={colors} language={language} />

        {/* Premium Avantajları Kartı */}
        <PremiumFeaturesCard features={features} colors={colors} language={language} />

        {/* Fiyatlandırma Paketleri */}
        <View style={styles.pricingContainer}>
          {/* Yıllık Paket */}
          <PricingOptionCard
            period="yearly"
            isSelected={selectedPeriod === 'yearly'}
            onSelect={() => setSelectedPeriod('yearly')}
            price={yearlyPrice}
            savingsPercentage={yearlySavings.percentage}
            pricePerMonth={`≈ ₺${(subscriptionPlans.premium.price.yearly / 12)
              .toFixed(2)
              .replace('.', ',')} / ${language === 'tr' ? 'ay' : 'mo'}`}
            colors={colors}
            language={language}
          />

          {/* Aylık Paket */}
          <PricingOptionCard
            period="monthly"
            isSelected={selectedPeriod === 'monthly'}
            onSelect={() => setSelectedPeriod('monthly')}
            price={monthlyPrice}
            colors={colors}
            language={language}
          />
        </View>

        {/* Satın Al & Geri Yükle Aksiyonları */}
        <PremiumActionButtons
          isLoading={isLoading}
          onPurchase={handlePurchase}
          onRestore={handleRestore}
          colors={colors}
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
  scrollView: {
    flex: 1,
  },
  pricingContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
});
