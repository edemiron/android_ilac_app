/**
 * HomeScreenLayoutB — Sprint 58.5: Layout B (Kart Bazlı / MD3 Filled) — Detaylı.
 *
 * 7 MD3 kart:
 *   1. Adherence Hero (CircularProgress + 56pt number + streak chip)
 *   2. Streak Gradient Card (🔥 gün serisi)
 *   3. Stat Tiles Row (Bugün/Alınan/Kalan)
 *   4. Low Stock Card (stok uyarısı)
 *   5. 7-gün Mini Chart (SVG)
 *   6. Şu An (CurrentDoseCard)
 *   7. Bugün Planı (TimelineItem kartları)
 *   + InlineAdBanner (premium değilse)
 *   + Empty State fallback
 *
 * Sprint 57 review vaadini tam karşılar.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrentDoseCard } from '../../screens/HomeScreen/components/CurrentDoseCard';
import { TimelineItem } from '../../screens/HomeScreen/components/TimelineItem';
import {
  CircularProgress,
  InlineAdBanner,
  LowStockCard,
  StatTile,
  MiniChart,
  type MiniChartDatum,
} from '../common';
import type { TodayReminder } from '../../screens/HomeScreen/types';
import type { Medicine } from '../../types';

interface LayoutBProps {
  reminder?: TodayReminder;
  reminders?: TodayReminder[];
  adherence?: number;
  streak?: number;
  completedCount?: number;
  totalCount?: number;
  remainingCount?: number;
  lowStockMedicines?: Medicine[];
  miniChartData?: MiniChartDatum[];
  isPremium?: boolean;
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
  onAddPress?: () => void;
  onLowStockPress?: () => void;
}

export function HomeScreenLayoutB({
  reminder,
  reminders = [],
  adherence = 0,
  streak = 0,
  completedCount = 0,
  totalCount = 0,
  remainingCount = 0,
  lowStockMedicines = [],
  miniChartData = [],
  isPremium = false,
  onTake,
  onSnooze,
  onSkip,
  onAddPress,
  onLowStockPress,
}: LayoutBProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const [showPlan, setShowPlan] = useState(true);

  const tr = language === 'tr';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Card 1: Adherence Hero */}
      {adherence > 0 && (
        <View
          style={[
            styles.card,
            styles.adherenceCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
          accessibilityRole="summary"
          accessibilityLabel={`${tr ? 'Bugünkü uyum' : "Today's adherence"} ${adherence} ${tr ? 'yüzde' : 'percent'}`}
        >
          <View style={styles.adherenceRow}>
            <View style={styles.adherenceNumberWrap}>
              <Text style={[styles.adherenceNumber, { color: colors.primary }]}>{adherence}%</Text>
              <Text style={[styles.adherenceLabel, { color: colors.textSecondary }]}>
                {tr ? 'Bugünkü uyum' : "Today's adherence"}
              </Text>
              {streak > 0 && (
                <Text style={[styles.streakChip, { color: colors.text }]}>
                  🔥 {streak} {tr ? 'gün seri' : 'day streak'}
                </Text>
              )}
            </View>
            <CircularProgress
              percentage={adherence}
              size={88}
              strokeWidth={9}
              progressColor={colors.primary}
            />
          </View>
        </View>
      )}

      {/* Card 2: Streak Gradient */}
      {streak > 0 && (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.streakCard}
          accessibilityRole="summary"
          accessibilityLabel={`${streak} ${tr ? 'gün seri' : 'day streak'}`}
        >
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={styles.streakTextWrap}>
            <Text style={styles.streakTitle}>
              {streak} {tr ? 'Gün Seri!' : 'Day Streak!'}
            </Text>
            <Text style={styles.streakSubtitle}>{tr ? 'Devam et!' : 'Keep it up!'}</Text>
          </View>
        </LinearGradient>
      )}

      {/* Card 3: Stat Tiles Row */}
      <View style={styles.statRow}>
        <StatTile value={totalCount} label={tr ? 'Bugün' : 'Today'} accent="primary" />
        <View style={styles.statGap} />
        <StatTile value={completedCount} label={tr ? 'Alınan' : 'Taken'} accent="success" />
        <View style={styles.statGap} />
        <StatTile value={remainingCount} label={tr ? 'Kalan' : 'Remaining'} accent="warning" />
      </View>

      {/* Card 4: Low Stock */}
      {lowStockMedicines.length > 0 && (
        <LowStockCard medicines={lowStockMedicines} onPress={onLowStockPress} />
      )}

      {/* Card 5: 7-gün Mini Chart */}
      {miniChartData.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
          <MiniChart data={miniChartData} title={tr ? 'Son 7 Gün' : 'Last 7 Days'} />
        </View>
      )}

      {/* Card 6: Şu An */}
      {reminder && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {tr ? 'Şu An' : 'Now'}
          </Text>
          <CurrentDoseCard
            reminder={reminder}
            colors={colors}
            isDark={isDark}
            language={language}
            onTake={onTake || (() => {})}
            onSnooze={onSnooze || (() => {})}
            onSkip={onSkip || (() => {})}
          />
        </>
      )}

      {/* Card 7: Bugün */}
      <TouchableOpacity
        style={[styles.planHeader, { minHeight: 44 }]}
        onPress={() => setShowPlan(!showPlan)}
        accessibilityRole="button"
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {tr ? 'Bugün' : 'Today'} ({reminders.length})
        </Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>{showPlan ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {showPlan && reminders.length > 0 && (
        <View
          style={[styles.card, styles.cardStacked, { backgroundColor: colors.surfaceContainerLow }]}
        >
          {reminders.map((r, i) => (
            <TimelineItem
              key={i}
              reminder={r}
              colors={colors}
              language={language}
              onTakeNow={() => {}}
              isFirst={i === 0}
              hasActiveSnooze={false}
              snoozeTriggerTime={null}
            />
          ))}
        </View>
      )}

      {/* Empty state */}
      {reminders.length === 0 && onAddPress && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {tr ? 'Bugün için ilaç yok' : 'No medicine for today'}
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={onAddPress}
            accessibilityRole="button"
            accessibilityLabel={tr ? 'Yeni ilaç ekle' : 'Add new medicine'}
          >
            <Text style={styles.addBtnText}>+ {tr ? 'İlaç Ekle' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* InlineAdBanner (non-premium) */}
      {!isPremium && (
        <View style={styles.adContainer}>
          <InlineAdBanner />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adherenceCard: {
    paddingVertical: 16,
  },
  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adherenceNumberWrap: {
    flex: 1,
  },
  adherenceNumber: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  adherenceLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  streakChip: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  streakEmoji: {
    fontSize: 40,
    marginRight: 14,
  },
  streakTextWrap: {
    flex: 1,
  },
  streakTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  streakSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 2,
    opacity: 0.9,
  },
  statRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
  },
  statGap: {
    width: 8,
  },
  cardStacked: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chevron: { fontSize: 14 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  addBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    minHeight: 48,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  adContainer: {
    marginTop: 16,
  },
});
