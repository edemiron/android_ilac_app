/**
 * HomeScreen — TimelineItem bileşeni.
 *
 * Sprint 4.2: HomeScreen.tsx (1962 satir) içinden ayrıldı.
 * Sprint 98: MedicineAvatar kullanılıyor; pickFormIcon kaldırıldı.
 * Gün içindeki tek bir reminder için timeline satırı: status badge, snooze
 * geri sayım, hızlı "Bugün Al" butonu.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { useHaptics } from '../../../hooks/useHaptics';
import { formatTimeDisplay } from '../../../utils/timeCalculator';
import { SOFT_RED, SOFT_RED_BG, type TodayReminder } from '../types';
import { getRelativeTimeText } from '../helpers';
import { MedicineAvatar } from './MedicineAvatar';

interface TimelineItemProps {
  reminder: TodayReminder;
  colors: ThemeColors;
  language: string;
  onTakeNow: () => void;
  isFirst: boolean;
  hasActiveSnooze: boolean;
  snoozeTriggerTime: string | null;
}

/**
 * Decode escape sequences in dosage string (parity with sanitizeString).
 */
function decodeDosage(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  reminder,
  colors,
  language,
  onTakeNow,
  hasActiveSnooze,
  snoozeTriggerTime,
}) => {
  const { log } = reminder;
  const { isDark } = useTheme();
  // Sprint 66C: success haptic on take action
  const haptics = useHaptics();
  const isTaken = log?.status === 'taken';
  const isSkipped = log?.status === 'skipped';
  const { isPast, minutesDiff } = getRelativeTimeText(reminder.reminderTime.time, language, log);
  const isMissed = isPast && !isTaken && !isSkipped;

  const handleTake = () => {
    haptics.success();
    onTakeNow();
  };

  const [snoozeCountdown, setSnoozeCountdown] = useState('');

  useEffect(() => {
    if (!hasActiveSnooze || !snoozeTriggerTime) {
      setSnoozeCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(snoozeTriggerTime).getTime();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setSnoozeCountdown('');
        return;
      }

      const totalSeconds = Math.ceil(diffMs / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setSnoozeCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [hasActiveSnooze, snoozeTriggerTime]);

  const getStatusBadge = () => {
    if (isTaken) {
      return {
        text: language === 'tr' ? 'Alındı' : 'Taken',
        color: isDark ? '#34D399' : '#059669',
        bg: isDark ? 'rgba(52, 211, 153, 0.25)' : '#DCFCE7',
        icon: 'checkmark-circle' as const,
      };
    }
    if (isSkipped) {
      return {
        text: language === 'tr' ? 'Atlandı' : 'Skipped',
        color: isDark ? '#88C0E6' : colors.textMuted,
        bg: isDark ? 'rgba(136, 192, 230, 0.2)' : '#F3F4F6',
        icon: 'close-circle' as const,
      };
    }
    if (hasActiveSnooze) {
      const countdownText = snoozeCountdown
        ? language === 'tr'
          ? `Ertelendi ${snoozeCountdown}`
          : `Snoozed ${snoozeCountdown}`
        : language === 'tr'
          ? 'Ertelendi'
          : 'Snoozed';
      return {
        text: countdownText,
        color: '#F59E0B',
        bg: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7',
        icon: 'alarm' as const,
      };
    }
    if (isMissed) {
      const absMinutes = Math.abs(minutesDiff);
      const missedText =
        absMinutes < 60
          ? language === 'tr'
            ? `${absMinutes} dk geçti`
            : `${absMinutes}m late`
          : language === 'tr'
            ? `${Math.floor(absMinutes / 60)} saat geçti`
            : `${Math.floor(absMinutes / 60)}h late`;
      return {
        text: missedText,
        color: isDark ? '#FB7185' : SOFT_RED,
        bg: isDark ? 'rgba(251, 113, 133, 0.25)' : SOFT_RED_BG,
        icon: 'alert-circle' as const,
      };
    }
    return {
      text: language === 'tr' ? 'Bekliyor' : 'Pending',
      color: isDark ? '#8B9CFF' : colors.primary,
      bg: isDark ? 'rgba(139, 156, 255, 0.2)' : colors.primary + '15',
      icon: 'time' as const,
    };
  };

  const status = getStatusBadge();
  const isCompleted = isTaken || isSkipped;
  const medicineColor = reminder.medicine.color || colors.primary;

  return (
    <View
      style={[
        styles.timelineItem,
        {
          backgroundColor: colors.card,
          borderLeftColor: isCompleted ? colors.border : medicineColor,
          opacity: isCompleted ? 0.55 : 1,
          paddingVertical: isCompleted ? 8 : 12,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
        },
      ]}
    >
      {/* Sprint 98: MedicineAvatar (harf avatar / image parity) */}
      <View style={styles.avatarWrapper}>
        <MedicineAvatar
          name={reminder.medicine.name}
          color={medicineColor}
          size={isCompleted ? 36 : 40}
          isCompleted={isCompleted}
          imageUri={reminder.medicine.imageUri}
        />
      </View>

      <View style={styles.medicineInfo}>
        <Text
          style={[
            styles.medicineName,
            { color: isCompleted ? colors.textMuted : colors.text },
            isCompleted && { fontSize: 13 },
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {reminder.medicine.name}
        </Text>
        <Text style={[styles.medicineDetails, { color: colors.textMuted }]}>
          {decodeDosage(reminder.medicine.dosage)}
        </Text>
      </View>

      {/* Sprint 98: Saat badge (her zaman) + status pill / quick take (vertical stack) */}
      <View style={styles.medicineStatus}>
        <View
          style={[
            styles.timeBadge,
            {
              backgroundColor: isCompleted
                ? colors.surfaceContainerHigh
                : colors.primary + '18',
            },
          ]}
          accessibilityLabel={`Time ${formatTimeDisplay(reminder.reminderTime.time)}`}
        >
          <Ionicons
            name="time-outline"
            size={11}
            color={isCompleted ? colors.textMuted : colors.primary}
          />
          <Text
            style={[
              styles.timeBadgeText,
              { color: isCompleted ? colors.textMuted : colors.primary },
            ]}
          >
            {formatTimeDisplay(reminder.reminderTime.time)}
          </Text>
        </View>

        {isMissed ? (
          <TouchableOpacity
            style={[styles.takeNowBtn, { backgroundColor: colors.primary }]}
            onPress={handleTake}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.takeNowText}>{language === 'tr' ? 'Bugün Al' : 'Take Now'}</Text>
          </TouchableOpacity>
        ) : isCompleted ? (
          <View
            style={[styles.statusBadge, { backgroundColor: isTaken ? '#10B98115' : status.bg }]}
          >
            <Ionicons
              name={isTaken ? 'checkmark-circle' : status.icon}
              size={14}
              color={isTaken ? '#10B981' : status.color}
            />
            <Text style={[styles.statusText, { color: isTaken ? '#10B981' : status.color }]}>
              {status.text}
            </Text>
          </View>
        ) : hasActiveSnooze ? (
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.quickTakeBtn,
              { backgroundColor: colors.primary + '18', borderColor: colors.primary },
            ]}
            onPress={handleTake}
          >
            <Ionicons name="checkmark" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    borderLeftWidth: 3,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  medicineDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  medicineStatus: {
    marginLeft: 8,
    alignItems: 'flex-end',
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  takeNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  takeNowText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  quickTakeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
