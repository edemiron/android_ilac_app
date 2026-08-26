/**
 * RecentAdherenceHistory — Son 7 günlük kompakt geçmiş listesi
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format, type Locale } from 'date-fns';
import { withAlpha, ALPHA } from '../../../utils/colors';
import { getAdherenceColor } from '../helpers';
import type { DailyStatItem } from '../hooks/useStatisticsController';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface RecentAdherenceHistoryProps {
  dailyStats: DailyStatItem[];
  dateLocale: Locale;
  colors: ThemeColors;
}

export function RecentAdherenceHistory({
  dailyStats,
  dateLocale,
  colors,
}: RecentAdherenceHistoryProps) {
  const recentDays = dailyStats.slice().reverse().slice(0, 7);

  return (
    <View>
      {recentDays.map((day, index) => {
        const dayHasData = day.total > 0;
        const accentColor = dayHasData
          ? getAdherenceColor(day.adherenceRate, colors)
          : colors.textMuted;

        return (
          <View
            key={index}
            style={[
              styles.historyRow,
              index > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.divider,
              },
            ]}
          >
            <View style={styles.historyInfo}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: withAlpha(accentColor, ALPHA.fill) },
                ]}
              >
                <Ionicons name="medical" size={18} color={accentColor} />
              </View>
              <View style={styles.historyTextContainer}>
                <Text style={[styles.historyDay, { color: colors.text }]} numberOfLines={1}>
                  {format(day.date, 'EEE', { locale: dateLocale })}
                </Text>
                <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                  {format(day.date, 'd MMM', { locale: dateLocale })}
                </Text>
              </View>
            </View>
            <View style={styles.historyStats}>
              {dayHasData ? (
                <>
                  {day.taken > 0 && (
                    <View
                      style={[
                        styles.historyBadge,
                        { backgroundColor: withAlpha(colors.success, ALPHA.fill) },
                      ]}
                    >
                      <Ionicons name="checkmark" size={11} color={colors.success} />
                      <Text style={[styles.historyBadgeText, { color: colors.success }]}>
                        {day.taken}
                      </Text>
                    </View>
                  )}
                  {(day.skipped > 0 || day.missed > 0) && (
                    <View
                      style={[
                        styles.historyBadge,
                        { backgroundColor: withAlpha(colors.error, ALPHA.fill) },
                      ]}
                    >
                      <Ionicons name="close" size={11} color={colors.error} />
                      <Text style={[styles.historyBadgeText, { color: colors.error }]}>
                        {day.skipped + day.missed}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={[styles.historyNoData, { color: colors.textMuted }]}>—</Text>
              )}
            </View>
            <Text style={[styles.historyRate, { color: accentColor }]}>
              {dayHasData ? `%${day.adherenceRate}` : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyDay: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 1,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 10,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyNoData: {
    fontSize: 13,
  },
  historyRate: {
    fontSize: 15,
    fontWeight: '700',
    width: 48,
    textAlign: 'right',
  },
});
