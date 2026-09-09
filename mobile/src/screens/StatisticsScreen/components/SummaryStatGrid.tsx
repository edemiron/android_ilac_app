/**
 * SummaryStatGrid — Alındı, Atlandı, Kaçırıldı, Toplam 2x2 karo ızgarası
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { withAlpha, ALPHA } from '../../../utils/colors';
import type { OverallStats } from '../hooks/useStatisticsController';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { TranslationKey } from '../../../contexts/LanguageContext';

interface SummaryStatGridProps {
  overallStats: OverallStats;
  colors: ThemeColors;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: string;
}

export function SummaryStatGrid({ overallStats, colors, t, language }: SummaryStatGridProps) {
  return (
    <View style={styles.statGrid}>
      <View style={[styles.statTile, { backgroundColor: colors.surfaceContainerLow }]}>
        <View
          style={[styles.statTileIcon, { backgroundColor: withAlpha(colors.success, ALPHA.fill) }]}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>
        <Text style={[styles.statTileValue, { color: colors.success }]}>{overallStats.taken}</Text>
        <Text style={[styles.statTileLabel, { color: colors.textSecondary }]}>
          {t('home_taken')}
        </Text>
      </View>

      <View style={[styles.statTile, { backgroundColor: colors.surfaceContainerLow }]}>
        <View
          style={[styles.statTileIcon, { backgroundColor: withAlpha(colors.warning, ALPHA.fill) }]}
        >
          <Ionicons name="play-skip-forward" size={20} color={colors.warning} />
        </View>
        <Text style={[styles.statTileValue, { color: colors.warning }]}>
          {overallStats.skipped}
        </Text>
        <Text style={[styles.statTileLabel, { color: colors.textSecondary }]}>
          {t('home_skipped')}
        </Text>
      </View>

      <View style={[styles.statTile, { backgroundColor: colors.surfaceContainerLow }]}>
        <View
          style={[styles.statTileIcon, { backgroundColor: withAlpha(colors.error, ALPHA.fill) }]}
        >
          <Ionicons name="close-circle" size={20} color={colors.error} />
        </View>
        <Text style={[styles.statTileValue, { color: colors.error }]}>{overallStats.missed}</Text>
        <Text style={[styles.statTileLabel, { color: colors.textSecondary }]}>
          {t('home_missed')}
        </Text>
      </View>

      <View style={[styles.statTile, { backgroundColor: colors.surfaceContainerLow }]}>
        <View
          style={[styles.statTileIcon, { backgroundColor: withAlpha(colors.primary, ALPHA.fill) }]}
        >
          <Ionicons name="medkit" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.statTileValue, { color: colors.text }]}>{overallStats.total}</Text>
        <Text style={[styles.statTileLabel, { color: colors.textSecondary }]}>
          {language === 'tr' ? 'Toplam' : 'Total'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 6,
  },
  statTile: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  statTileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statTileValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statTileLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
