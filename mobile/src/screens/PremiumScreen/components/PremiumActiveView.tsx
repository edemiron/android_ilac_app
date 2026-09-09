/**
 * PremiumActiveView — Aktif Premium Kullanıcı Görünümü (Kalan gün, özellikler)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PremiumActiveViewProps {
  remainingDays: number | null;
  features: readonly string[];
  colors: ThemeColors;
  language: string;
}

export function PremiumActiveView({
  remainingDays,
  features,
  colors,
  language,
}: PremiumActiveViewProps) {
  return (
    <View style={styles.premiumActiveContainer}>
      <Text style={styles.premiumBadge}>PREMIUM</Text>
      <Text style={[styles.premiumActiveTitle, { color: colors.text }]}>
        {language === 'tr' ? 'Premium Üyesiniz!' : "You're Premium!"}
      </Text>
      <Text style={[styles.premiumActiveSubtitle, { color: colors.textSecondary }]}>
        {language === 'tr' ? 'Tüm özelliklerin keyfini çıkarın' : 'Enjoy all premium features'}
      </Text>

      {remainingDays !== null && (
        <View style={[styles.remainingDaysCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.remainingDaysLabel, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Kalan Süre' : 'Remaining'}
          </Text>
          <Text style={[styles.remainingDaysValue, { color: colors.primary }]}>
            {remainingDays} {language === 'tr' ? 'gün' : 'days'}
          </Text>
        </View>
      )}

      <View style={styles.featuresContainer}>
        <Text style={[styles.featuresTitle, { color: colors.text }]}>
          {language === 'tr' ? 'Premium Özellikleriniz' : 'Your Premium Features'}
        </Text>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  premiumActiveContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  premiumActiveTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  premiumActiveSubtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  remainingDaysCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  remainingDaysLabel: {
    fontSize: 16,
  },
  remainingDaysValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  featuresContainer: {
    marginTop: 12,
    width: '100%',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCheck: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
});
