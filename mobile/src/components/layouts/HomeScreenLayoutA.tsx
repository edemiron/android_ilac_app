/**
 * HomeScreenLayoutA — Sprint 57: Layout A (Sade / Minimal).
 *
 * iOS HIG 2026 Focused Experience + MD3 Expressive Density.
 * Tek bilgi: Şu Anki İlaç + Bugün Planı (collapsed).
 *
 * Kullanim (A/B/C test setup):
 *   <HomeScreenLayoutA
 *     reminder={todayReminders[0]}
 *     onTake={...}
 *     onSnooze={...}
 *     onSkip={...}
 *   />
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrentDoseCard } from '../../screens/HomeScreen/components/CurrentDoseCard';
import { TimelineItem } from '../../screens/HomeScreen/components/TimelineItem';
import type { TodayReminder } from '../../screens/HomeScreen/types';

interface LayoutAProps {
  reminder?: TodayReminder;
  reminders?: TodayReminder[];
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
  onAddPress?: () => void;
}

export function HomeScreenLayoutA({
  reminder,
  reminders = [],
  onTake,
  onSnooze,
  onSkip,
  onAddPress,
}: LayoutAProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [showPlan, setShowPlan] = useState(false);

  if (!reminder) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {language === 'tr' ? 'Bugün için ilaç yok' : 'No medicine for today'}
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
      {/* Section 1: Şu Anki İlaç (Primary CTA) */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {language === 'tr' ? 'Şu An' : 'Now'}
      </Text>
      <CurrentDoseCard
        reminder={reminder}
        colors={colors}
        isDark={false}
        language={language}
        onTake={onTake || (() => {})}
        onSnooze={onSnooze || (() => {})}
        onSkip={onSkip || (() => {})}
      />

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
