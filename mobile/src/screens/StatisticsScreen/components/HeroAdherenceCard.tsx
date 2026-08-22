/**
 * HeroAdherenceCard — CircularProgress ve uyum özeti kartı
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CircularProgress } from '../../../components/common/CircularProgress';
import { getAdherenceColor, type Period } from '../helpers';
import type { OverallStats } from '../hooks/useStatisticsController';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface HeroAdherenceCardProps {
  overallStats: OverallStats;
  selectedPeriod: Period;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function HeroAdherenceCard({
  overallStats,
  selectedPeriod,
  colors,
  isDark,
  language,
}: HeroAdherenceCardProps) {
  return (
    <View style={styles.heroCardWrapper}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.border : '#E2E8F0',
          },
        ]}
      >
        <CircularProgress
          percentage={overallStats.adherenceRate}
          size={72}
          strokeWidth={8}
          progressColor={getAdherenceColor(overallStats.adherenceRate, colors)}
        />
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {language === 'tr'
              ? `${overallStats.taken}/${overallStats.total || 0} doz tamamlandı`
              : `${overallStats.taken}/${overallStats.total || 0} doses completed`}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {selectedPeriod === 'weekly'
              ? language === 'tr'
                ? 'Son 7 günde'
                : 'Last 7 days'
              : language === 'tr'
                ? 'Son 30 günde'
                : 'Last 30 days'}
          </Text>
          <View style={styles.heroStatsRow}>
            {overallStats.currentStreak > 0 && (
              <View style={styles.heroStat}>
                <Ionicons name="flame" size={14} color={colors.primary} />
                <Text style={[styles.heroStatText, { color: colors.text }]}>
                  {overallStats.currentStreak} {language === 'tr' ? 'gün seri' : 'day streak'}
                </Text>
              </View>
            )}
            {overallStats.bestStreak > 0 && (
              <View style={styles.heroStat}>
                <Ionicons name="flame-outline" size={14} color={colors.warning} />
                <Text style={[styles.heroStatText, { color: colors.text }]}>
                  {overallStats.bestStreak} {language === 'tr' ? 'en iyi' : 'best'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCardWrapper: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroText: {
    flex: 1,
    marginLeft: 16,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  heroStatsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
});
