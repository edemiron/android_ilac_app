/**
 * UpcomingDoses — Sprint 104.4 (Karol-style HomeScreen modernization).
 *
 * Karol hedef: "YAKLASAN DOZLAR" section basliginin altinda vertical mini list.
 * Gelecek 60 dakika icindeki pending (alınmamış + atlanmamış) reminder'lar.
 * Max 3 mini kart (overflow engelle). 0 kart ise null return.
 *
 * Layout karari: Vertical mini list (Karol spec). Horizontal scroll YAPILMAZ
 * (mobil UX yanlis izlenim yaratir).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getRelativeTimeText } from '../helpers';
import { SectionHeader } from './SectionHeader';
import type { TodayReminder } from '../types';

interface UpcomingDosesProps {
  todayReminders: TodayReminder[];
}

function minutesDiffToHuman(min, tr) {
  if (min < 1) return tr ? 'şimdi' : 'now';
  if (min < 60) return tr ? `${min} dk` : `${min}m`;
  return tr ? `${Math.floor(min / 60)} sa` : `${Math.floor(min / 60)}h`;
}

export function UpcomingDoses({ todayReminders }: UpcomingDosesProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const tr = language === 'tr';

  const upcoming = useMemo(() => {
    return todayReminders
      .filter((r) => {
        if (r.log?.status === 'taken' || r.log?.status === 'skipped') return false;
        const { isPast, minutesDiff } = getRelativeTimeText(
          r.reminderTime.time,
          language,
          r.log
        );
        // Gecmis (isPast) HARIC, gelecek 60 dakika, minutesDiff > 0
        return !isPast && minutesDiff > 0 && minutesDiff <= 60;
      })
      .slice(0, 3); // max 3 kart
  }, [todayReminders, language]);

  if (upcoming.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={tr ? 'YAKLAŞAN DOZLAR' : 'UPCOMING DOSES'} icon="⏳" />
      {upcoming.map((r) => {
        const { minutesDiff } = getRelativeTimeText(
          r.reminderTime.time,
          language,
          r.log
        );
        const humanTime = minutesDiffToHuman(minutesDiff, tr);

        return (
          <View
            key={r.reminderTime.id}
            style={[
              styles.miniCard,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderColor: colors.outlineVariant ?? colors.border,
              },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`${r.medicine.name}, ${humanTime}`}
          >
            <View style={[styles.iconBox, { backgroundColor: r.medicine.color + '25' }]}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.middle}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {r.medicine.name}
              </Text>
              <Text style={[styles.dosage, { color: colors.textSecondary }]} numberOfLines={1}>
                {r.medicine.dosage}
              </Text>
            </View>
            <View style={[styles.minutesBadge, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[styles.minutesText, { color: colors.onPrimaryContainer }]}>
                {humanTime}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  dosage: {
    fontSize: 12,
    marginTop: 2,
  },
  minutesBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  minutesText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
