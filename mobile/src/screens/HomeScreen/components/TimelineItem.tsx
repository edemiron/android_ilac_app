/**
 * HomeScreen — TimelineItem bileşeni.
 *
 * Sprint 4.2: HomeScreen.tsx (1962 satir) içinden ayrıldı.
 * Gün içindeki tek bir reminder için timeline satırı: status badge, snooze
 * geri sayım, hızlı "Bugün Al" butonu.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../contexts/ThemeContext';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { formatTimeDisplay } from '../../../utils/timeCalculator';
import { SOFT_RED, SOFT_RED_BG, type TodayReminder } from '../types';
import { getRelativeTimeText } from '../helpers';

interface TimelineItemProps {
  reminder: TodayReminder;
  colors: ThemeColors;
  language: string;
  onTakeNow: () => void;
  isFirst: boolean;
  hasActiveSnooze: boolean;
  snoozeTriggerTime: string | null;
}

interface FormIconDescriptor {
  lib: 'mci' | 'ion';
  name: string;
}

const FORM_ICON_MAP: Record<string, FormIconDescriptor> = {
  tablet: { lib: 'mci', name: 'pill' },
  capsule: { lib: 'mci', name: 'pill-multiple' },
  syrup: { lib: 'mci', name: 'bottle-tonic-outline' },
  drops: { lib: 'mci', name: 'water-outline' },
  injection: { lib: 'mci', name: 'needle' },
  cream: { lib: 'mci', name: 'hand-back-right-outline' },
  spray: { lib: 'mci', name: 'spray' },
  other: { lib: 'mci', name: 'medical-bag' },
};

/**
 * Ilacin form/dosage text'indan ikon sec (MedicinesScreen ile ayni mantik).
 */
function pickFormIcon(medicine: TodayReminder['medicine']): FormIconDescriptor {
  if (medicine.form && FORM_ICON_MAP[medicine.form]) {
    return FORM_ICON_MAP[medicine.form];
  }
  const text = `${medicine.dosage || ''} ${medicine.stockUnit || ''}`.toLowerCase();
  if (text.includes('tablet')) return { lib: 'mci', name: 'pill' };
  if (text.includes('kaps')) return { lib: 'mci', name: 'pill-multiple' };
  if (text.includes('ml') || text.includes('şurup'))
    return { lib: 'mci', name: 'bottle-tonic-outline' };
  if (text.includes('damla')) return { lib: 'mci', name: 'water-outline' };
  if (text.includes('iğne') || text.includes('enjeksiyon')) return { lib: 'mci', name: 'needle' };
  return { lib: 'ion', name: 'medical' };
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
  const isTaken = log?.status === 'taken';
  const isSkipped = log?.status === 'skipped';
  const { isPast, minutesDiff } = getRelativeTimeText(reminder.reminderTime.time, language, log);
  const isMissed = isPast && !isTaken && !isSkipped;

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
  const iconBgOpacity = isDark ? '70' : '45';
  const formIcon = pickFormIcon(reminder.medicine);

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
      <View
        style={[
          styles.medicineIconBox,
          { backgroundColor: medicineColor + iconBgOpacity, overflow: 'hidden' },
        ]}
      >
        {reminder.medicine.imageUri ? (
          <Image source={{ uri: reminder.medicine.imageUri }} style={{ width: 40, height: 40 }} />
        ) : formIcon.lib === 'mci' ? (
          <MaterialCommunityIcons
            name={formIcon.name}
            size={isCompleted ? 16 : 20}
            color={medicineColor}
          />
        ) : (
          <Ionicons
            name={formIcon.name as never}
            size={isCompleted ? 16 : 20}
            color={medicineColor}
          />
        )}
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
          {formatTimeDisplay(reminder.reminderTime.time)} • {decodeDosage(reminder.medicine.dosage)}
        </Text>
      </View>

      <View style={styles.medicineStatus}>
        {isMissed ? (
          <TouchableOpacity
            style={[styles.takeNowBtn, { backgroundColor: colors.primary }]}
            onPress={onTakeNow}
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
            onPress={onTakeNow}
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
  medicineIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
