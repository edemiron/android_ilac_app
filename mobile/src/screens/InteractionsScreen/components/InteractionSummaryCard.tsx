/**
 * InteractionSummaryCard — İlaç Etkileşimi Özet Durum Kartı
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { InteractionCheckResult } from '../../../services/drugInteraction';
import type { TranslationKey } from '../../../contexts/LanguageContext';

interface InteractionSummaryCardProps {
  result: InteractionCheckResult;
  colors: ThemeColors;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export function InteractionSummaryCard({ result, colors, t }: InteractionSummaryCardProps) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: result.hasInteractions ? colors.error + '15' : colors.success + '15',
          borderColor: result.hasInteractions ? colors.error + '30' : colors.success + '30',
        },
      ]}
    >
      <Text style={styles.summaryIcon}>{result.hasInteractions ? '⚠️' : '✅'}</Text>
      <Text
        style={[
          styles.summaryText,
          { color: result.hasInteractions ? colors.error : colors.success },
        ]}
      >
        {result.hasInteractions
          ? t('interaction_found', { count: result.interactions?.length || 0 })
          : t('interaction_none')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});
