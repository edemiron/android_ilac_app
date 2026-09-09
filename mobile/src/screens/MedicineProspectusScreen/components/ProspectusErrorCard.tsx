/**
 * ProspectusErrorCard — Hata durumu ve tekrar dene butonu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface ProspectusErrorCardProps {
  error: string;
  onRetry: () => void;
  colors: ThemeColors;
  language: string;
}

export function ProspectusErrorCard({
  error,
  onRetry,
  colors,
  language,
}: ProspectusErrorCardProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        {language === 'tr' ? 'Bilgi Alınamadı' : 'Info Not Available'}
      </Text>
      <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Text style={styles.retryButtonText}>
          {language === 'tr' ? 'Tekrar Dene' : 'Try Again'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
