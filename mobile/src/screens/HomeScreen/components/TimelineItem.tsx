import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { useHaptics } from '../../../hooks/useHaptics';
import { formatTimeDisplay } from '../../../utils/timeCalculator';
import { type TodayReminder } from '../types';
import { getRelativeTimeText } from '../helpers';

interface TimelineItemProps {
  reminder: TodayReminder;
  colors: ThemeColors;
  language: string;
  onTakeNow: () => void;
  isFirst?: boolean;
  hasActiveSnooze?: boolean;
  snoozeTriggerTime?: string | null;
}

function decodeDosage(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  reminder,
  colors,
  language,
  onTakeNow,
  hasActiveSnooze = false,
  snoozeTriggerTime = null,
}) => {
  const { log } = reminder;
  const { isDark } = useTheme();
  const haptics = useHaptics();
  const isTaken = log?.status === 'taken';
  const isSkipped = log?.status === 'skipped';
  const { isPast } = getRelativeTimeText(reminder.reminderTime.time, language, log);
  const isMissed = isPast && !isTaken && !isSkipped;
  const isCompleted = isTaken || isSkipped;

  const handleTake = () => {
    haptics.success();
    onTakeNow();
  };

  // Instruction display label
  const instructionLabel = React.useMemo(() => {
    const inst = reminder.medicine.instructions;
    if (!inst) return language === 'tr' ? 'Yemekten Sonra' : 'After Meal';
    const map: Record<string, string> = {
      before_meal: language === 'tr' ? 'Yemekten Önce' : 'Before Meal',
      after_meal: language === 'tr' ? 'Yemekten Sonra' : 'After Meal',
      with_meal: language === 'tr' ? 'Yemekle Birlikte' : 'With Meal',
      empty_stomach: language === 'tr' ? 'Aç Karnına' : 'Empty Stomach',
      before_sleep: language === 'tr' ? 'Yatmadan Önce' : 'Before Sleep',
      morning: language === 'tr' ? 'Sabah' : 'Morning',
      evening: language === 'tr' ? 'Akşam' : 'Evening',
    };
    return map[inst] || (language === 'tr' ? 'Yemekten Sonra' : 'After Meal');
  }, [reminder.medicine.instructions, language]);

  const dosageText = decodeDosage(reminder.medicine.dosage);
  const fullName = dosageText ? `${reminder.medicine.name} ${dosageText}` : reminder.medicine.name;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          borderLeftColor: isTaken ? '#10B981' : isMissed ? '#EF4444' : colors.primary,
        },
        isTaken && { opacity: 0.68 },
      ]}
    >
      {/* 1. Left Icon Container */}
      <View
        style={[
          styles.pillIconContainer,
          {
            backgroundColor: isDark ? 'rgba(13, 148, 136, 0.18)' : '#CCFBF1',
          },
        ]}
      >
        <Ionicons name="medical" size={18} color={colors.primary} />
      </View>

      {/* 2. Middle Details (Name + Instruction Tag) */}
      <View style={styles.detailsContainer}>
        <Text
          style={[
            styles.medicineName,
            { color: isDark ? '#F8FAFC' : '#0F172A' },
            isTaken && { textDecorationLine: 'line-through', color: colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {fullName}
        </Text>

        <View
          style={[
            styles.instructionTag,
            {
              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
              borderColor: isDark ? 'rgba(56, 189, 248, 0.35)' : '#BFDBFE',
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.instructionText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
            {instructionLabel}
          </Text>
        </View>
      </View>

      {/* 3. Right Details (Time + Action Button) */}
      <View style={styles.rightContainer}>
        <Text style={[styles.timeText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {formatTimeDisplay(reminder.reminderTime.time)}
        </Text>

        {isTaken ? (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.takenText}>{language === 'tr' ? 'Alındı' : 'Taken'}</Text>
          </View>
        ) : isSkipped ? (
          <View style={styles.statusRow}>
            <Ionicons name="play-skip-forward" size={13} color="#F59E0B" />
            <Text style={[styles.takenText, { color: '#F59E0B' }]}>
              {language === 'tr' ? 'Atlandı' : 'Skipped'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.takeButton, { backgroundColor: colors.primary }]}
            onPress={handleTake}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            <Text style={styles.takeButtonText}>{language === 'tr' ? 'Al' : 'Take'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderLeftWidth: 3.5,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  pillIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  medicineName: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  instructionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  instructionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  takenText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#10B981',
  },
  takeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  takeButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
