/**
 * PremiumFeaturesCard — Premium Avantajları Listesi Kartı
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PremiumFeaturesCardProps {
  features: readonly string[];
  colors: ThemeColors;
  language: string;
}

export function PremiumFeaturesCard({ features, colors, language }: PremiumFeaturesCardProps) {
  return (
    <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.featuresTitle, { color: colors.text }]}>
        {language === 'tr' ? 'Premium Özellikleri' : 'Premium Features'}
      </Text>
      {features.map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <Text style={styles.featureCheck}>✓</Text>
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  featuresCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
