/**
 * WeeklyDoseTracker — Günlük Doz Takip Çubukları & Haftalık Analiz
 *
 * 2026 Modern Visual Tracker:
 * - Kriptik borsa çizgisi yerine gün gün net ilaç uyum kapsülleri
 * - Planlanmamış günler ile tam/kısmi alınan günleri ayırt eden akıllı renk paleti
 * - Seçilen güne göre interaktif detay vurgusu
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { DailyStatItem } from '../hooks/useStatisticsController';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface WeeklyDoseTrackerProps {
  dailyStats: DailyStatItem[];
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function WeeklyDoseTracker({
  dailyStats,
  colors,
  isDark,
  language,
}: WeeklyDoseTrackerProps) {
  const isTr = language === 'tr';
  const locale = isTr ? tr : enUS;

  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(
    dailyStats.length > 0 ? dailyStats.length - 1 : null
  );

  const selectedDay =
    selectedDayIndex !== null && dailyStats[selectedDayIndex] ? dailyStats[selectedDayIndex] : null;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        {/* Başlık Satırı */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={[styles.headerIconBg, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'GÜNLÜK DOZ PERFORMANSI' : 'DAILY DOSE PERFORMANCE'}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isTr ? 'Son 7 Gün' : 'Last 7 Days'}
          </Text>
        </View>

        {/* 7 Günlük Doz Kapsülleri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScroll}
        >
          {dailyStats.map((item, index) => {
            const isSelected = selectedDayIndex === index;
            const hasMeds = item.total > 0;
            const isFull = hasMeds && item.taken === item.total;
            const isPartial = hasMeds && item.taken > 0 && item.taken < item.total;
            const isZero = hasMeds && item.taken === 0;

            let pillBg = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.10)';
            let pillBorder = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.20)';
            let iconName = 'ellipse-outline';
            let iconColor = isDark ? '#CBD5E1' : colors.textMuted;
            let statusText = '-';

            if (isFull) {
              pillBg = isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.15)';
              pillBorder = isDark ? '#34D399' : colors.success || '#10B981';
              iconName = 'checkmark-circle';
              iconColor = isDark ? '#34D399' : colors.success || '#10B981';
              statusText = `${item.taken}/${item.total}`;
            } else if (isPartial) {
              pillBg = isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.15)';
              pillBorder = isDark ? '#FBBF24' : colors.warning || '#F59E0B';
              iconName = 'alert-circle';
              iconColor = isDark ? '#FBBF24' : colors.warning || '#F59E0B';
              statusText = `${item.taken}/${item.total}`;
            } else if (isZero) {
              pillBg = isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.15)';
              pillBorder = isDark ? '#F87171' : colors.error || '#EF4444';
              iconName = 'close-circle';
              iconColor = isDark ? '#F87171' : colors.error || '#EF4444';
              statusText = `0/${item.total}`;
            } else {
              statusText = isTr ? 'Yok' : 'None';
            }

            const dayName = format(item.date, 'EEE', { locale });
            const dayNumber = format(item.date, 'd', { locale });

            return (
              <TouchableOpacity
                key={item.date.toISOString()}
                style={[
                  styles.dayColumn,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(255, 255, 255, 0.10)'
                        : 'rgba(0, 0, 0, 0.04)'
                      : 'transparent',
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderWidth: isSelected ? 1.5 : 0,
                  },
                ]}
                onPress={() => setSelectedDayIndex(index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayNameText,
                    { color: isSelected ? colors.primary : colors.textMuted },
                  ]}
                >
                  {dayName}
                </Text>
                <Text style={[styles.dayNumberText, { color: colors.text }]}>{dayNumber}</Text>

                {/* Doz Kapsülü */}
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: pillBg,
                      borderColor: pillBorder,
                    },
                  ]}
                >
                  <Ionicons name={iconName} size={15} color={iconColor} />
                  <Text style={[styles.statusPillText, { color: iconColor }]}>{statusText}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Seçilen Günün Detay Çubuğu */}
        {selectedDay && (
          <View
            style={[
              styles.selectedDayDetail,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              },
            ]}
          >
            <View style={styles.selectedDayInfo}>
              <Text style={[styles.selectedDayTitle, { color: colors.text }]}>
                {format(selectedDay.date, 'd MMMM EEEE', { locale })}
              </Text>
              <Text style={[styles.selectedDaySubtitle, { color: colors.textMuted }]}>
                {selectedDay.total === 0
                  ? isTr
                    ? 'Bu gün için planlanmış ilaç yoktu.'
                    : 'No medications were scheduled on this day.'
                  : isTr
                    ? `${selectedDay.total} dozdan ${selectedDay.taken} tanesi alındı (%${selectedDay.adherenceRate} başarı)`
                    : `${selectedDay.taken} of ${selectedDay.total} doses taken (${selectedDay.adherenceRate}% adherence)`}
              </Text>
            </View>

            {selectedDay.total > 0 && (
              <View
                style={[
                  styles.rateBadge,
                  {
                    backgroundColor:
                      selectedDay.adherenceRate === 100
                        ? `${colors.success}20`
                        : selectedDay.adherenceRate >= 75
                          ? `${colors.warning}20`
                          : `${colors.error}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rateBadgeText,
                    {
                      color:
                        selectedDay.adherenceRate === 100
                          ? colors.success || '#10B981'
                          : selectedDay.adherenceRate >= 75
                            ? colors.warning || '#F59E0B'
                            : colors.error || '#EF4444',
                    },
                  ]}
                >
                  %{selectedDay.adherenceRate}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  daysScroll: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  dayColumn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    minWidth: 42,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
    minWidth: 36,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedDayDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  selectedDayInfo: {
    flex: 1,
    marginRight: 10,
  },
  selectedDayTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedDaySubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  rateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
