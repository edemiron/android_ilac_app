/**
 * HomeScreenLayoutA — Sprint 69: Layout A (Sade / Compact).
 *
 * Sprint 57'de sade "Tek bilgi" idi. Sprint 69'da kompakt hero eklendi.
 * Mevcut sürüm: Sade görünüm — minimal hero + Şu An + Bugünün Planı (collapsed).
 *
 * Kullanim:
 *   <HomeScreenLayoutA
 *     reminder={todayReminders[0]}
 *     adherence={75}
 *     streak={4}
 *     remainingCount={3}
 *     onTake={...}
 *     onSnooze={...}
 *     onSkip={...}
 *   />
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrentDoseCard } from '../../screens/HomeScreen/components/CurrentDoseCard';
import { TimelineItem } from '../../screens/HomeScreen/components/TimelineItem';
import { CircularProgress } from '../common/CircularProgress';
import type { TodayReminder } from '../../screens/HomeScreen/types';

interface LayoutAProps {
  reminder?: TodayReminder;
  reminders?: TodayReminder[];
  adherence?: number;
  streak?: number;
  remainingCount?: number;
  completedCount?: number;
  totalCount?: number;
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
  onAddPress?: () => void;
}

export function HomeScreenLayoutA({
  reminder,
  reminders = [],
  adherence = 0,
  streak = 0,
  remainingCount = 0,
  completedCount = 0,
  totalCount = 0,
  onTake,
  onSnooze,
  onSkip,
  onAddPress,
}: LayoutAProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const [showPlan, setShowPlan] = useState(false);
  const tr = language === 'tr';

  if (!reminder && reminders.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {tr ? 'Bugün için ilaç yok' : 'No medicine for today'}
        </Text>
        {onAddPress && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={onAddPress}
            accessibilityRole="button"
            accessibilityLabel={language === 'tr' ? 'Yeni ilaç ekle' : 'Add new medicine'}
          >
            <Text style={styles.addBtnText}>+ {language === 'tr' ? 'İlaç Ekle' : 'Add'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Sprint 69: Compact hero (CircularProgress + streak + remaining) */}
      {(adherence > 0 || streak > 0 || remainingCount > 0) && (
        <View style={[styles.hero, { borderBottomColor: colors.border }]}>
          <CircularProgress
            percentage={adherence}
            size={64}
            strokeWidth={7}
            progressColor={colors.primary}
          />
          <View style={styles.heroText}>
            <View style={styles.heroRow}>
              <Text style={[styles.heroValue, { color: colors.text }]}>{adherence}%</Text>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                {tr ? 'Bugün' : 'Today'}
              </Text>
            </View>
            <View style={styles.heroStatsRow}>
              {streak > 0 && (
                <View style={styles.heroStat}>
                  <Ionicons name="flame" size={14} color={colors.primary} />
                  <Text style={[styles.heroStatText, { color: colors.text }]}>
                    {streak} {tr ? 'gün' : 'd'}
                  </Text>
                </View>
              )}
              {remainingCount > 0 && (
                <View style={styles.heroStat}>
                  <Ionicons name="time-outline" size={14} color={colors.warning} />
                  <Text style={[styles.heroStatText, { color: colors.text }]}>
                    {remainingCount} {tr ? 'bekleyen' : 'left'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Section 1: Şu Anki İlaç (Primary CTA) */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {tr ? 'Şu An' : 'Now'}
      </Text>
      {reminder ? (
        <CurrentDoseCard
          reminder={reminder}
          colors={colors}
          isDark={isDark}
          language={language}
          onTake={onTake || (() => {})}
          onSnooze={onSnooze || (() => {})}
          onSkip={onSkip || (() => {})}
        />
      ) : (
        <View style={[styles.noCurrentContainer, { backgroundColor: colors.surfaceContainerLow }]}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text style={[styles.noCurrentText, { color: colors.textSecondary }]}>
            {tr ? 'Şu an için planlanmış ilaç yok' : 'No medicine planned for now'}
          </Text>
          {totalCount > 0 && completedCount > 0 && (
            <Text style={[styles.noCurrentSubtext, { color: colors.textMuted }]}>
              {tr
                ? `${completedCount}/${totalCount} doz tamamlandı 🎉`
                : `${completedCount}/${totalCount} doses completed 🎉`}
            </Text>
          )}
        </View>
      )}

      {/* Section 2: Bugünün Planı (Collapsed by default) */}
      <TouchableOpacity
        style={styles.planHeader}
        onPress={() => setShowPlan(!showPlan)}
        accessibilityRole="button"
        accessibilityLabel={
          language === 'tr'
            ? `Bugünün planı ${showPlan ? 'gizle' : 'göster'}`
            : `${showPlan ? 'Hide' : 'Show'} today's plan`
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {language === 'tr' ? 'Bugünün Planı' : "Today's Plan"} ({reminders.length})
        </Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>{showPlan ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {showPlan && (
        <View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
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
  // Sprint 69: compact hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroText: {
    flex: 1,
    marginLeft: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroLabel: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
  },
  heroStatsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  heroStatText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '600',
  },
  noCurrentContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  noCurrentText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  noCurrentSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  chevron: {
    fontSize: 14,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
  },
  addBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
