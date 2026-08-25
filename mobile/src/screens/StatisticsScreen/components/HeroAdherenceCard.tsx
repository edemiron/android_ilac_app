/**
 * HeroAdherenceCard — Sağlık Karnesi & Tedavi Disiplini Paneli
 *
 * 2026 Modern Health Scorecard:
 * - Dairesel İlerleme ve Başarı Derecesi (Mükemmel / İyi / Geliştirilmeli)
 * - Canlı Seri (Streak) ve Tamamlanan Doz Rozetleri
 * - İnsani Klinik Motivasyon ve İçgörü Kutusu
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CircularProgress } from '../../../components/common/CircularProgress';
import { getAdherenceColor, type Period } from '../helpers';
import type { OverallStats } from '../hooks/useStatisticsController';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface HeroAdherenceCardProps {
  overallStats: OverallStats;
  selectedPeriod: Period;
  healthInsight?: string;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function HeroAdherenceCard({
  overallStats,
  selectedPeriod,
  healthInsight,
  colors,
  isDark,
  language,
}: HeroAdherenceCardProps) {
  const isTr = language === 'tr';
  const rate = overallStats.adherenceRate;

  // Başarı derecesi
  let gradeText = isTr ? 'Mükemmel Tedavi Uyumu' : 'Excellent Adherence';
  let gradeIcon = 'shield-checkmark';
  let gradeColor = colors.success || '#10B981';

  if (rate < 75) {
    gradeText = isTr ? 'Geliştirilmesi Gereken Uyum' : 'Needs Attention';
    gradeIcon = 'alert-circle';
    gradeColor = colors.error || '#EF4444';
  } else if (rate < 90) {
    gradeText = isTr ? 'İyi Uyum Seviyesi' : 'Good Adherence';
    gradeIcon = 'checkmark-circle';
    gradeColor = colors.warning || '#F59E0B';
  }

  const gradientColors = isDark
    ? ([`${colors.primary}22`, `${colors.surfaceContainerHighest || '#1E293B'}80`] as const)
    : ([`${colors.primary}15`, `${colors.primary}05`] as const);

  return (
    <View style={styles.heroCardWrapper}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.9)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : `${colors.primary}25`,
          },
        ]}
      >
        {/* Üst Kısım: Daire & Derece & Metrikler */}
        <View style={styles.topSection}>
          <View style={styles.circularContainer}>
            <CircularProgress
              percentage={rate}
              size={76}
              strokeWidth={8}
              progressColor={getAdherenceColor(rate, colors)}
              textColor={isDark ? '#F8FAFC' : getAdherenceColor(rate, colors)}
              trackColor={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 118, 110, 0.12)'}
            />
          </View>

          <View style={styles.heroText}>
            {/* Başarı Derecesi Rozeti */}
            <View
              style={[
                styles.gradeBadge,
                {
                  backgroundColor: isDark ? `${gradeColor}25` : `${gradeColor}15`,
                  borderColor: `${gradeColor}40`,
                },
              ]}
            >
              <Ionicons name={gradeIcon} size={13} color={gradeColor} />
              <Text style={[styles.gradeText, { color: gradeColor }]}>{gradeText}</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {overallStats.taken}/{overallStats.total} {isTr ? 'doz alındı' : 'doses taken'}
            </Text>

            <View style={styles.heroStatsRow}>
              {overallStats.currentStreak > 0 && (
                <View
                  style={[
                    styles.heroStat,
                    {
                      backgroundColor: isDark
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(245, 158, 11, 0.10)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                    },
                  ]}
                >
                  <Ionicons name="flame" size={14} color="#F59E0B" />
                  <Text style={[styles.heroStatText, { color: colors.text }]}>
                    {overallStats.currentStreak} {isTr ? 'gün seri' : 'day streak'}
                  </Text>
                </View>
              )}

              {overallStats.skipped > 0 && (
                <View
                  style={[
                    styles.heroStat,
                    {
                      backgroundColor: isDark
                        ? 'rgba(148, 163, 184, 0.15)'
                        : 'rgba(148, 163, 184, 0.10)',
                      borderColor: 'rgba(148, 163, 184, 0.25)',
                    },
                  ]}
                >
                  <Ionicons name="play-forward-outline" size={12} color={colors.textMuted} />
                  <Text style={[styles.heroStatText, { color: colors.textMuted }]}>
                    {overallStats.skipped} {isTr ? 'atlandı' : 'skipped'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Alt Kısım: İnsani Klinik Motivasyon Kutusu */}
        {healthInsight && (
          <View
            style={[
              styles.insightBox,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.85)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : `${colors.primary}18`,
              },
            ]}
          >
            <Ionicons name="sparkles" size={15} color={colors.primary} style={styles.insightIcon} />
            <Text style={[styles.insightText, { color: colors.text }]}>{healthInsight}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCardWrapper: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circularContainer: {
    marginRight: 14,
  },
  heroText: {
    flex: 1,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginBottom: 4,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  heroStatText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  insightIcon: {
    marginTop: 1,
  },
  insightText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
});
