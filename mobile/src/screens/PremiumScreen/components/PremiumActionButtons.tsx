/**
 * PremiumActionButtons — Satın Al, Geri Yükle ve Şartlar Bildirimi
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PremiumActionButtonsProps {
  isLoading: boolean;
  onPurchase: () => void;
  onRestore: () => void;
  colors: ThemeColors;
  language: string;
}

export function PremiumActionButtons({
  isLoading,
  onPurchase,
  onRestore,
  colors,
  language,
}: PremiumActionButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Purchase Button */}
      <TouchableOpacity
        style={[styles.purchaseButton, { backgroundColor: colors.primary }]}
        onPress={onPurchase}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.purchaseButtonText}>
            {language === 'tr' ? "Premium'a Geç" : 'Go Premium'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Restore Purchases */}
      <TouchableOpacity style={styles.restoreButton} onPress={onRestore} activeOpacity={0.7}>
        <Text style={[styles.restoreButtonText, { color: colors.textSecondary }]}>
          {language === 'tr' ? 'Satın Alımları Geri Yükle' : 'Restore Purchases'}
        </Text>
      </TouchableOpacity>

      {/* Terms */}
      <Text style={[styles.terms, { color: colors.textMuted }]}>
        {language === 'tr'
          ? 'Abonelik otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.'
          : 'Subscription auto-renews. You can cancel anytime.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  purchaseButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreButtonText: {
    fontSize: 14,
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
