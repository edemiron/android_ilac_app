/**
 * HomeScreenLayoutC — Sprint 57: Layout C (List-Grouped / iOS Inset).
 *
 * iOS 17+ Settings.app tarzı gruplanmış liste. Inset group (10pt radius, 16pt margin)
 * her bölüm için ayrı kart.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrentDoseCard } from '../../screens/HomeScreen/components/CurrentDoseCard';
import { TimelineItem } from '../../screens/HomeScreen/components/TimelineItem';
import type { TodayReminder } from '../../screens/HomeScreen/types';

interface LayoutCProps {
  reminder?: TodayReminder;
  reminders?: TodayReminder[];
  adherence?: number;
  streak?: number;
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
}

export function HomeScreenLayoutC({
  reminder,
  reminders = [],
  adherence = 0,
  streak = 0,
  onTake,
  onSnooze,
  onSkip,
}: LayoutCProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Inset Group 1: Bugün (Adherence) */}
      {adherence > 0 && (
        <View
          style={[styles.insetGroup, { backgroundColor: colors.surfaceContainerLow }]}
          accessibilityRole="summary"
        >
          <View style={styles.insetRow}>
            <Text style={[styles.insetRowText, { color: colors.text }]}>
              {language === 'tr' ? 'Bugünkü uyum' : "Today's adherence"}
            </Text>
            <Text style={[styles.insetValue, { color: colors.primary }]}>{adherence}%</Text>
          </View>
          {streak > 0 && (
            <View
              style={[
                styles.insetRow,
                styles.insetSeparator,
                { borderTopColor: colors.outlineVariant },
              ]}
            >
              <Text style={[styles.insetRowText, { color: colors.text }]}>
                {language === 'tr' ? 'Gün seri' : 'Day streak'} 🔥
              </Text>
              <Text style={[styles.insetValue, { color: colors.textSecondary }]}>{streak}</Text>
            </View>
          )}
        </View>
      )}

      {/* Inset Group 2: Şu An (Primary CTA) */}
      {reminder && (
        <View style={styles.insetGroup}>
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
        </View>
      )}

      {/* Inset Group 3: Bugün Planı */}
      {reminders.length > 0 && (
        <View style={styles.insetGroup}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Bugün' : 'Today'} ({reminders.length})
          </Text>
          <View style={[styles.insetGroup, { backgroundColor: colors.surfaceContainerLow }]}>
            {reminders.map((r, i) => (
              <View
                key={i}
                style={[
                  styles.insetRow,
                  i > 0 && styles.insetSeparator,
                  { borderTopColor: colors.outlineVariant },
                ]}
              >
                <TimelineItem
                  reminder={r}
                  colors={colors}
                  language={language}
                  onTakeNow={() => {}}
                  isFirst={i === 0}
                  hasActiveSnooze={false}
                  snoozeTriggerTime={null}
                />
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingVertical: 16, paddingBottom: 32 },
  insetGroup: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 10,
    overflow: 'hidden',
  },
  insetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  insetSeparator: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  insetRowText: {
    fontSize: 16,
  },
  insetValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
