/**
 * HomeScreenLayoutB — Sprint 57: Layout B (Kart Bazlı / MD3 Filled).
 *
 * Her bilgi kendi yükseltilmiş kartında. MD3 "Filled Cards" + iOS "Inset Grouped".
 *
 * Kullanim:
 *   <HomeScreenLayoutB reminders={todayReminders} adherence={67} onTake={...} />
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrentDoseCard } from '../../screens/HomeScreen/components/CurrentDoseCard';
import { TimelineItem } from '../../screens/HomeScreen/components/TimelineItem';
import type { TodayReminder } from '../../screens/HomeScreen/types';

interface LayoutBProps {
  reminder?: TodayReminder;
  reminders?: TodayReminder[];
  adherence?: number; // 0-100
  streak?: number; // gün
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
}

export function HomeScreenLayoutB({
  reminder,
  reminders = [],
  adherence = 0,
  streak = 0,
  onTake,
  onSnooze,
  onSkip,
}: LayoutBProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const [showPlan, setShowPlan] = useState(true);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Card 1: Adherence Hero */}
      {adherence > 0 && (
        <View
          style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
          accessibilityRole="summary"
          accessibilityLabel={`${language === 'tr' ? 'Bugünkü uyum' : 'Today adherence'} ${adherence} ${language === 'tr' ? 'yüzde' : 'percent'}`}
        >
          <Text style={[styles.adherenceNumber, { color: colors.primary }]}>{adherence}%</Text>
          <Text style={[styles.adherenceLabel, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Bugünkü uyum' : "Today's adherence"}
          </Text>
          {streak > 0 && (
            <Text style={[styles.streak, { color: colors.text }]}>
              {streak} {language === 'tr' ? 'gün seri 🔥' : 'day streak 🔥'}
            </Text>
          )}
        </View>
      )}

      {/* Card 2: Şu An (Primary CTA) */}
      {reminder && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Şu An' : 'Now'}
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

      {/* Card 3: Bugün (Default expanded) */}
      <TouchableOpacity
        style={styles.planHeader}
        onPress={() => setShowPlan(!showPlan)}
        accessibilityRole="button"
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {language === 'tr' ? 'Bugün' : 'Today'} ({reminders.length})
        </Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>{showPlan ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {showPlan && (
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
  cardStacked: {
    padding: 0,
    overflow: 'hidden',
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
  streak: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
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
});
