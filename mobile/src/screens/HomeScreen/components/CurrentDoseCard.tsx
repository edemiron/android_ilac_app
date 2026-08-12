/**
 * HomeScreen — CurrentDoseCard bileşeni.
 *
 * Sprint 4.2: HomeScreen.tsx (1962 satir) içinden ayrıldı.
 * Sprint 55: MD3 uyumlu — accessibilityLabel + accessibilityHint + accessibilityRole
 * 3 butona eklendi (Take / Snooze / Skip), minHeight 48 touch target.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatTimeDisplay } from '../../../utils/timeCalculator';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { SOFT_RED, SNOOZE_OPTIONS, type TodayReminder } from '../types';
import { getRelativeTimeText } from '../helpers';
import { MedicineAvatar } from './MedicineAvatar';

interface CurrentDoseCardProps {
  reminder: TodayReminder;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
  onTake: () => void;
  onSnooze: (minutes: number) => void;
  onSkip: () => void;
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
  const {
    text: relativeTime,
    isNow,
    isPast,
  } = getRelativeTimeText(reminder.reminderTime.time, language, reminder.log);

  // Sprint 80B: statusPill renk paleti — soluk secondary yerine primaryContainer
  // Not: Sprint 102.2'de errorContainer token adoption'ı planlandı, ancak
  // mevcut hardcoded tonlarla (#FEE2E2/#B91C1C) farklılık gösterdiği için
  // (token: #FFDAD6/#410002) sıfır davranış değişimi için inline korundu.
  const statusBg = isNow
    ? colors.primaryContainer
    : isPast
      ? isDark
        ? 'rgba(239, 68, 68, 0.18)'
        : '#FEE2E2'
      : colors.primaryContainer;
  const statusFg = isNow
    ? colors.onPrimaryContainer
    : isPast
      ? isDark
        ? '#FCA5A5'
        : '#B91C1C'
      : colors.onPrimaryContainer;

  return (
    <>
      <View
        style={[
          styles.currentDoseCard,
          {
            backgroundColor: colors.card,
            shadowOpacity: isDark ? 0 : 0.08,
            borderLeftColor: isPast ? SOFT_RED : colors.primary,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          },
        ]}
      >
        <View style={styles.currentDoseHeader}>
          {/* Sprint 80B: Daha belirgin status pill — primaryContainer + onPrimaryContainer */}
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusPillText, { color: statusFg }]}>{relativeTime}</Text>
          </View>
          <Text style={[styles.currentDoseTime, { color: colors.textSecondary }]}>
            {formatTimeDisplay(reminder.reminderTime.time)}
          </Text>
        </View>

        <View style={styles.currentDoseInfo}>
          {/* Sprint 98: MedicineAvatar (harf avatar / image parity) */}
          <MedicineAvatar
            name={reminder.medicine.name}
            color={reminder.medicine.color}
            size={48}
            imageUri={reminder.medicine.imageUri}
          />
          <View style={[styles.currentDoseText, { marginLeft: 12 }]}>
            <Text
              style={[styles.currentDoseName, { color: colors.text }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {reminder.medicine.name}
            </Text>
            <Text style={[styles.currentDoseDosage, { color: colors.textMuted }]}>
              {reminder.medicine.dosage}
            </Text>
          </View>
        </View>

        <View style={styles.currentDoseActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.takeBtn, { backgroundColor: colors.primary }]}
            onPress={onTake}
            accessibilityRole="button"
            accessibilityLabel={
              language === 'tr'
                ? `${reminder.medicine.name} ilacini aldım olarak işaretle`
                : `Mark ${reminder.medicine.name} as taken`
            }
            accessibilityHint={
              language === 'tr'
                ? 'Bu dozu tamamlandı olarak kaydeder'
                : 'Marks this dose as completed'
            }
          >
            <Ionicons name="checkmark" size={20} color={colors.textOnPrimary} />
            <Text style={[styles.takeBtnText, { color: colors.textOnPrimary }]}>
              {language === 'tr' ? 'Aldım' : 'Taken'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.snoozeBtn,
              {
                borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB',
              },
            ]}
            onPress={() => setShowSnoozeOptions(true)}
            accessibilityRole="button"
            accessibilityLabel={
              language === 'tr'
                ? `${reminder.medicine.name} erteleme seçeneklerini aç`
                : `Open snooze options for ${reminder.medicine.name}`
            }
            accessibilityHint={
              language === 'tr'
                ? 'Bu dozu 5, 10, 15 veya 30 dakika erteler'
                : 'Snoozes this dose for 5, 10, 15 or 30 minutes'
            }
          >
            <Ionicons name="time-outline" size={18} color={isDark ? '#F59E0B' : '#D97706'} />
            <Text style={[styles.snoozeBtnText, { color: isDark ? '#F59E0B' : '#D97706' }]}>
              {language === 'tr' ? 'Ertele' : 'Snooze'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.skipBtn,
              {
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
              },
            ]}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel={
              language === 'tr'
                ? `${reminder.medicine.name} dozunu atla`
                : `Skip ${reminder.medicine.name} dose`
            }
            accessibilityHint={
              language === 'tr'
                ? `${reminder.medicine.name} ilacının bu dozunu atlandı olarak kaydeder`
                : `Marks this dose of ${reminder.medicine.name} as skipped`
            }
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={isDark ? '#EF4444' : '#DC2626'}
            />
            {/* Sprint 80A: Görsel "Atla" etiketi (buton içinde, hâlâ 48pt touch target) */}
            <Text style={[styles.skipBtnText, { color: isDark ? '#EF4444' : '#DC2626' }]}>
              {language === 'tr' ? 'Atla' : 'Skip'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showSnoozeOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSnoozeOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSnoozeOptions(false)}
        >
          <View style={[styles.snoozeModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.snoozeModalTitle, { color: colors.text }]}>
              {language === 'tr' ? 'Ne kadar erteleyelim?' : 'Snooze for how long?'}
            </Text>
            <View style={styles.snoozeOptionsGrid}>
              {SNOOZE_OPTIONS.map(minutes => (
                <TouchableOpacity
                  key={minutes}
                  style={[styles.snoozeOption, { backgroundColor: colors.background }]}
                  onPress={() => {
                    setShowSnoozeOptions(false);
                    onSnooze(minutes);
                  }}
                >
                  <Text style={[styles.snoozeOptionText, { color: colors.primary }]}>
                    {minutes} {language === 'tr' ? 'dk' : 'min'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  currentDoseCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
  },
  currentDoseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  // Sprint 80B: Daha okunur font
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  currentDoseTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentDoseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentDoseText: {
    flex: 1,
  },
  currentDoseName: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 2,
  },
  currentDoseDosage: {
    fontSize: 14,
  },
  currentDoseActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    minHeight: 48, // Sprint 55: WCAG 2.5.5 touch target minimum
  },
  takeBtn: {},
  takeBtnText: {
    fontWeight: '700',
    marginLeft: 6,
  },
  snoozeBtn: {
    borderWidth: 1,
  },
  snoozeBtnText: {
    fontWeight: '600',
    marginLeft: 6,
  },
  skipBtn: {
    borderWidth: 1,
  },
  // Sprint 80A: skip buton text label
  skipBtnText: {
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Static — modal scrim Android standard
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozeModal: {
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  snoozeModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
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
