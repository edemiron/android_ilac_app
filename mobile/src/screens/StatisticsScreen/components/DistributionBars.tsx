/**
 * DistributionBars — Alındı / Atlandı / Kaçırıldı yatay dağılım çubukları
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { withAlpha, ALPHA } from '../../../utils/colors';
import type { OverallStats } from '../hooks/useStatisticsController';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { TranslationKey } from '../../../contexts/LanguageContext';

interface DistributionBarsProps {
  overallStats: OverallStats;
  colors: ThemeColors;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: string;
}

export function DistributionBars({ overallStats, colors, t, language }: DistributionBarsProps) {
  if (overallStats.total <= 0) return null;

  const items = [
    {
      key: 'taken',
      label: t('home_taken'),
      count: overallStats.taken,
      color: colors.success,
      icon: 'checkmark-circle' as const,
    },
    {
      key: 'skipped',
      label: t('home_skipped'),
      count: overallStats.skipped,
      color: colors.warning,
      icon: 'play-skip-forward' as const,
    },
    {
      key: 'missed',
      label: t('home_missed'),
      count: overallStats.missed,
      color: colors.error,
      icon: 'close-circle' as const,
    },
  ];

  return (
    <View style={styles.distributionContainer}>
      {items.map(item => {
        const pct =
          overallStats.total > 0 ? Math.round((item.count / overallStats.total) * 100) : 0;
        const displayValue =
          item.count === 0
            ? '—'
            : pct === 100
              ? language === 'tr'
                ? 'Hepsi'
                : 'All'
              : `${item.count} (${pct}%)`;

        return (
          <View key={item.key} style={styles.distributionRow}>
            <View style={styles.distributionLabelRow}>
              <Ionicons name={item.icon} size={16} color={item.color} />
              <Text style={[styles.distributionLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.distributionValue, { color: colors.textMuted }]}>
                {displayValue}
              </Text>
            </View>
            <View
              style={[
                styles.distributionBarBg,
                { backgroundColor: withAlpha(item.color, ALPHA.wash) },
              ]}
            >
              <View
                style={[
                  styles.distributionBarFill,
                  {
                    backgroundColor: item.color,
                    width: `${pct}%`,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  distributionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  distributionRow: {
    marginBottom: 12,
  },
  distributionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  distributionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  distributionValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  distributionBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: 8,
    borderRadius: 4,
  },
});
