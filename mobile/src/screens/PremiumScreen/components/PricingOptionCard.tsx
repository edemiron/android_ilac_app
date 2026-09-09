/**
 * PricingOptionCard — Yıllık / Aylık Fiyat Paketi Seçim Kartı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { BillingPeriod } from '../hooks/usePremiumController';

interface PricingOptionCardProps {
  period: BillingPeriod;
  isSelected: boolean;
  onSelect: () => void;
  price: string;
  savingsPercentage?: number;
  pricePerMonth?: string;
  colors: ThemeColors;
  language: string;
}

export function PricingOptionCard({
  period,
  isSelected,
  onSelect,
  price,
  savingsPercentage,
  pricePerMonth,
  colors,
  language,
}: PricingOptionCardProps) {
  const isYearly = period === 'yearly';
  const isLifetime = period === 'lifetime';

  return (
    <TouchableOpacity
      style={[
        styles.pricingOption,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.inputBorder,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {isLifetime && (
        <View style={[styles.savingsBadge, { backgroundColor: '#10B981' }]}>
          <Text style={styles.savingsBadgeText}>
            {language === 'tr' ? '⭐ EN POPÜLER — TEK SEFERLİK' : '⭐ BEST VALUE — ONE-TIME'}
          </Text>
        </View>
      )}

      {isYearly && savingsPercentage && (
        <View style={[styles.savingsBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.savingsBadgeText}>
            %{savingsPercentage} {language === 'tr' ? 'TASARRUF' : 'SAVE'}
          </Text>
        </View>
      )}

      <View style={styles.pricingContent}>
        <Text style={[styles.pricingLabel, { color: colors.text }]}>
          {isLifetime
            ? language === 'tr'
              ? 'Ömür Boyu (Lifetime)'
              : 'Lifetime Access'
            : isYearly
              ? language === 'tr'
                ? 'Yıllık'
                : 'Yearly'
              : language === 'tr'
                ? 'Aylık'
                : 'Monthly'}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary }]}>{price}</Text>
          <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
            {isLifetime
              ? language === 'tr'
                ? ' / tek sefer'
                : ' / one-time'
              : `/${isYearly ? (language === 'tr' ? 'yıl' : 'year') : language === 'tr' ? 'ay' : 'month'}`}
          </Text>
        </View>
        {pricePerMonth && (
          <Text style={[styles.pricePerMonth, { color: colors.textMuted }]}>{pricePerMonth}</Text>
        )}
        {isLifetime && (
          <Text style={[styles.pricePerMonth, { color: colors.textMuted }]}>
            {language === 'tr'
              ? 'Abonelik yok, sonsuza dek kullanım'
              : 'No subscription, forever yours'}
          </Text>
        )}
      </View>

      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
          <Text style={styles.selectedIndicatorText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pricingOption: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  savingsBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  savingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pricingContent: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pricePeriod: {
    fontSize: 14,
    marginLeft: 4,
  },
  pricePerMonth: {
    fontSize: 12,
    marginTop: 4,
  },
  selectedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
