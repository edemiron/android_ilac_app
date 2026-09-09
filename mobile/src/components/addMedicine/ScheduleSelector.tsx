import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ScheduleType } from '../../types';
import { ThemeColors } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface ScheduleSelectorProps {
  scheduleType: ScheduleType;
  specificDays: number[];
  intervalDays: number;
  cycleDaysOn: number;
  cycleDaysOff: number;
  endDate: string | null;
  onScheduleTypeChange: (type: ScheduleType) => void;
  onSpecificDaysChange: (days: number[]) => void;
  onIntervalDaysChange: (interval: number) => void;
  onCycleChange: (daysOn: number, daysOff: number) => void;
  onEndDateChange: (endDate: string | null) => void;
  colors: ThemeColors;
}

const DAYS_OF_WEEK = [
  { day: 1, labelTr: 'Pzt', labelEn: 'Mon' },
  { day: 2, labelTr: 'Sal', labelEn: 'Tue' },
  { day: 3, labelTr: 'Çar', labelEn: 'Wed' },
  { day: 4, labelTr: 'Per', labelEn: 'Thu' },
  { day: 5, labelTr: 'Cum', labelEn: 'Fri' },
  { day: 6, labelTr: 'Cmt', labelEn: 'Sat' },
  { day: 0, labelTr: 'Paz', labelEn: 'Sun' },
];

const INTERVAL_PRESETS = [2, 3, 4, 5, 7];

export function ScheduleSelector({
  scheduleType = 'daily',
  specificDays = [1, 2, 3, 4, 5],
  intervalDays = 2,
  cycleDaysOn = 21,
  cycleDaysOff = 7,
  endDate = null,
  onScheduleTypeChange,
  onSpecificDaysChange,
  onIntervalDaysChange,
  onCycleChange,
  onEndDateChange,
  colors,
}: ScheduleSelectorProps) {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const toggleDay = (day: number) => {
    if (specificDays.includes(day)) {
      if (specificDays.length === 1) return; // En az 1 gün seçili kalmalı
      onSpecificDaysChange(specificDays.filter(d => d !== day));
    } else {
      onSpecificDaysChange([...specificDays, day]);
    }
  };

  const scheduleTypes: { type: ScheduleType; icon: string; label: string }[] = [
    { type: 'daily', icon: 'calendar', label: isTr ? 'Her Gün' : 'Daily' },
    { type: 'specific_days', icon: 'today', label: isTr ? 'Belirli Günler' : 'Specific Days' },
    { type: 'interval_days', icon: 'hourglass', label: isTr ? 'Aralıklı' : 'Interval' },
    { type: 'cycle', icon: 'repeat', label: isTr ? 'Döngü (Kür)' : 'Cycle' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {isTr ? 'Kullanım Takvimi ve Sıklığı' : 'Schedule & Frequency'}
      </Text>

      {/* Schedule Type Segment Selector */}
      <View style={[styles.typeGrid, { backgroundColor: colors.inputBackground }]}>
        {scheduleTypes.map(item => {
          const isSelected = scheduleType === item.type;
          return (
            <TouchableOpacity
              key={item.type}
              activeOpacity={0.7}
              onPress={() => onScheduleTypeChange(item.type)}
              style={[
                styles.typeButton,
                isSelected && [styles.typeButtonActive, { backgroundColor: colors.card }],
              ]}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeLabel,
                  {
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '400',
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dynamic Sub-Options */}
      {scheduleType === 'specific_days' && (
        <View style={styles.subOptionContainer}>
          <Text style={[styles.subOptionTitle, { color: colors.textSecondary }]}>
            {isTr ? 'İlacın Alınacağı Günleri Seçin:' : 'Select Days to Take:'}
          </Text>
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map(d => {
              const isSelected = specificDays.includes(d.day);
              return (
                <TouchableOpacity
                  key={d.day}
                  activeOpacity={0.7}
                  onPress={() => toggleDay(d.day)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dayText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                    {isTr ? d.labelTr : d.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {scheduleType === 'interval_days' && (
        <View style={styles.subOptionContainer}>
          <Text style={[styles.subOptionTitle, { color: colors.textSecondary }]}>
            {isTr ? 'Kaç günde bir alınacak?' : 'Interval in Days:'}
          </Text>
          <View style={styles.presetRow}>
            {INTERVAL_PRESETS.map(preset => {
              const isSelected = intervalDays === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  activeOpacity={0.7}
                  onPress={() => onIntervalDaysChange(preset)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.presetText, { color: isSelected ? '#FFFFFF' : colors.text }]}
                  >
                    {isTr ? `${preset} Günde 1` : `Every ${preset}d`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {scheduleType === 'cycle' && (
        <View style={styles.subOptionContainer}>
          <Text style={[styles.subOptionTitle, { color: colors.textSecondary }]}>
            {isTr ? 'Döngü Modeli (Örn: Doğum Kontrol):' : 'Cycle Model (e.g. Birth Control):'}
          </Text>
          <View style={styles.presetRow}>
            {[
              { on: 21, off: 7, label: '21 gün al + 7 gün ara' },
              { on: 28, off: 0, label: '28 gün kesintisiz' },
              { on: 5, off: 2, label: '5 gün al + 2 gün ara' },
            ].map(c => {
              const isSelected = cycleDaysOn === c.on && cycleDaysOff === c.off;
              return (
                <TouchableOpacity
                  key={`${c.on}_${c.off}`}
                  activeOpacity={0.7}
                  onPress={() => onCycleChange(c.on, c.off)}
                  style={[
                    styles.cycleChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.presetText, { color: isSelected ? '#FFFFFF' : colors.text }]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Tedavi Bitiş Tarihi (Kür / Antibiyotik Süresi) */}
      <View style={[styles.endDateContainer, { borderTopColor: colors.border }]}>
        <View style={styles.endDateHeader}>
          <Ionicons name="flag-outline" size={18} color={colors.primary} />
          <Text style={[styles.endDateTitle, { color: colors.text }]}>
            {isTr ? 'Tedavi Bitiş Tarihi (Kür)' : 'Treatment End Date (Course)'}
          </Text>
        </View>
        <View style={styles.endDatePresets}>
          {[
            { days: null, label: isTr ? 'Süresiz' : 'Ongoing' },
            { days: 5, label: isTr ? '5 Gün' : '5 Days' },
            { days: 7, label: isTr ? '7 Gün (Antibiyotik)' : '7 Days' },
            { days: 14, label: isTr ? '14 Gün' : '14 Days' },
            { days: 30, label: isTr ? '1 Ay' : '1 Month' },
          ].map(opt => {
            const isSelected =
              opt.days === null
                ? endDate === null
                : (() => {
                    if (!endDate) return false;
                    const end = new Date(endDate);
                    const now = new Date();
                    const diffDays = Math.round(
                      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return Math.abs(diffDays - opt.days) <= 1;
                  })();

            return (
              <TouchableOpacity
                key={opt.label}
                activeOpacity={0.7}
                onPress={() => {
                  if (opt.days === null) {
                    onEndDateChange(null);
                  } else {
                    const target = new Date();
                    target.setDate(target.getDate() + opt.days);
                    onEndDateChange(target.toISOString());
                  }
                }}
                style={[
                  styles.endDateChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.endDateChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  typeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeLabel: {
    fontSize: 12,
  },
  subOptionContainer: {
    marginTop: 6,
    marginBottom: 10,
  },
  subOptionTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cycleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  endDateContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  endDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  endDateTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  endDatePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  endDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  endDateChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
