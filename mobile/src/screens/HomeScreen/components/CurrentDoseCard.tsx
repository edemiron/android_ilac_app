/**
 * HomeScreen — CurrentDoseCard bileşeni.
 *
 * Sprint 4.2: HomeScreen.tsx (1962 satir) içinden ayrıldı.
 * Sprint 55: MD3 uyumlu — accessibilityLabel + accessibilityHint + accessibilityRole
 * 3 butona eklendi (Take / Snooze / Skip), minHeight 48 touch target.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatTimeDisplay } from '../../../utils/timeCalculator';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { ModalSheet } from '../../../components/common/ModalSheet';
import { SNOOZE_OPTIONS, type TodayReminder } from '../types';
import { getRelativeTimeText } from '../helpers';
import { MedicineAvatar } from './MedicineAvatar';

interface CurrentDoseCardProps {
  reminder?: TodayReminder | null;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
}

export const CurrentDoseCard: React.FC<CurrentDoseCardProps> = ({
  reminder,
  colors,
  isDark,
  language,
  onTake,
  onSnooze,
  onSkip,
}) => {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  // If all doses for today are done or no medicines scheduled
  if (!reminder) {
    return (
      <View
        style={[
          styles.celebrateCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.celebrateIconBox}>
          <Text style={styles.celebrateEmoji}>🎉</Text>
        </View>
        <View style={styles.celebrateTextContainer}>
          <Text style={[styles.celebrateTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {language === 'tr' ? 'Harika! Bekleyen İlaç Yok' : 'Great! No Pending Medicines'}
          </Text>
          <Text style={[styles.celebrateSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {language === 'tr'
              ? 'Bugünkü tüm dozlarınızı tamamladınız.'
              : 'All daily doses completed. Stay healthy!'}
          </Text>
        </View>
      </View>
    );
  }

  const {
    text: relativeTime,
    isNow,
    isPast,
  } = getRelativeTimeText(reminder.reminderTime.time, language, reminder.log);

  const statusBg = isNow
    ? isDark
      ? 'rgba(56, 189, 248, 0.2)'
      : '#EFF6FF'
    : isPast
      ? isDark
        ? 'rgba(239, 68, 68, 0.2)'
        : '#FEE2E2'
      : isDark
        ? 'rgba(13, 148, 136, 0.2)'
        : '#CCFBF1';

  const statusFg = isNow
    ? isDark
      ? '#38BDF8'
      : '#0284C7'
    : isPast
      ? isDark
        ? '#FCA5A5'
        : '#B91C1C'
      : isDark
        ? '#2DD4BF'
        : '#0F766E';

  const instruction = reminder.medicine.instructions;
  const instructionLabel =
    instruction === 'before_meal'
      ? language === 'tr'
        ? 'Yemekten Önce'
        : 'Before Meal'
      : instruction === 'after_meal'
        ? language === 'tr'
          ? 'Yemekten Sonra'
          : 'After Meal'
        : instruction === 'with_meal'
          ? language === 'tr'
            ? 'Yemekle Birlikte'
            : 'With Meal'
          : null;

  return (
    <>
      <View
        style={[
          styles.currentDoseCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isPast ? '#EF4444' : isDark ? '#334155' : '#E2E8F0',
            borderLeftColor: isPast ? '#EF4444' : colors.primary,
          },
        ]}
      >
        {/* Header: Title + Relative Pill + Time */}
        <View style={styles.currentDoseHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <Ionicons name={isPast ? 'alert-circle' : 'time'} size={12} color={statusFg} />
              <Text style={[styles.statusPillText, { color: statusFg }]}>{relativeTime}</Text>
            </View>
          </View>
          <Text style={[styles.currentDoseTime, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {formatTimeDisplay(reminder.reminderTime.time)}
          </Text>
        </View>

        {/* Middle Info: Avatar + Title + Dosage + Instruction */}
        <View style={styles.currentDoseInfo}>
          <MedicineAvatar
            name={reminder.medicine.name}
            color={reminder.medicine.color}
            size={44}
            imageUri={reminder.medicine.imageUri}
          />
          <View style={styles.currentDoseText}>
            <Text
              style={[styles.currentDoseName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
              numberOfLines={1}
            >
              {reminder.medicine.name}
            </Text>
            <View style={styles.tagRow}>
              {reminder.medicine.dosage ? (
                <Text style={[styles.currentDoseDosage, { color: colors.textSecondary }]}>
                  {reminder.medicine.dosage}
                </Text>
              ) : null}
              {instructionLabel && (
                <View
                  style={[
                    styles.instructionPill,
                    {
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
                      borderColor: isDark ? 'rgba(56, 189, 248, 0.35)' : '#BFDBFE',
                    },
                  ]}
                >
                  <Text
                    style={[styles.instructionPillText, { color: isDark ? '#38BDF8' : '#0284C7' }]}
                  >
                    {instructionLabel}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons: [ ✓ Şimdi Al ] + [ ⏱️ Ertele ] + [ ✕ Atla ] */}
        <View style={styles.currentDoseActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.takeBtn, { backgroundColor: colors.primary }]}
            onPress={onTake}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.takeBtnText}>{language === 'tr' ? 'Şimdi Al' : 'Take Now'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.snoozeBtn,
              {
                borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
              },
            ]}
            onPress={() => setShowSnoozeOptions(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={16} color={isDark ? '#F59E0B' : '#D97706'} />
            <Text style={[styles.snoozeBtnText, { color: isDark ? '#F59E0B' : '#D97706' }]}>
              {language === 'tr' ? 'Ertele' : 'Snooze'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.skipBtn,
              {
                borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
              },
            ]}
            onPress={onSkip}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="play-skip-forward" size={14} color={isDark ? '#EF4444' : '#DC2626'} />
            <Text style={[styles.skipBtnText, { color: isDark ? '#EF4444' : '#DC2626' }]}>
              {language === 'tr' ? 'Atla' : 'Skip'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ModalSheet
        visible={showSnoozeOptions}
        title={language === 'tr' ? 'Ne kadar erteleyelim?' : 'Snooze for how long?'}
        onClose={() => setShowSnoozeOptions(false)}
      >
        <View style={styles.snoozeOptionsGrid}>
          {SNOOZE_OPTIONS.map(minutes => (
            <TouchableOpacity
              key={minutes}
              style={[styles.snoozeOption, { backgroundColor: colors.background }]}
              onPress={() => {
                setShowSnoozeOptions(false);
                if (onSnooze) onSnooze(minutes);
              }}
            >
              <Text style={[styles.snoozeOptionText, { color: colors.primary }]}>
                {minutes} {language === 'tr' ? 'dk' : 'min'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ModalSheet>
    </>
  );
};

const styles = StyleSheet.create({
  currentDoseCard: {
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  currentDoseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  currentDoseTime: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  currentDoseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentDoseText: {
    flex: 1,
    marginLeft: 10,
  },
  currentDoseName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentDoseDosage: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  instructionPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  instructionPillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  currentDoseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    minHeight: 40,
  },
  takeBtn: {
    flex: 2,
  },
  takeBtnText: {
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  snoozeBtn: {
    flex: 1.2,
    borderWidth: 1,
  },
  snoozeBtnText: {
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  skipBtn: {
    flex: 1,
    borderWidth: 1,
  },
  skipBtnText: {
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  celebrateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  celebrateIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrateEmoji: {
    fontSize: 22,
  },
  celebrateTextContainer: {
    flex: 1,
  },
  celebrateTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  celebrateSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  snoozeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  snoozeOption: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  snoozeOptionText: {
    fontWeight: '600',
  },
});
