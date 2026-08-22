import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  getDay,
} from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { Medicine, MedicineLog, ReminderTime } from '../../../types';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isMedicineScheduledForDate } from '../../../utils/timeCalculator';

interface MonthCalendarViewProps {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  medicineLogs: MedicineLog[];
  colors: ThemeColors;
  isDark: boolean;
}

interface DayDoseItem {
  medicine: Medicine;
  time: string;
  status: 'taken' | 'skipped' | 'missed' | 'pending';
  takenAt?: string;
  skipReason?: string;
  skipReasonNote?: string;
}

export function MonthCalendarView({
  medicines,
  reminderTimes,
  medicineLogs,
  colors,
  isDark,
}: MonthCalendarViewProps) {
  const { language } = useLanguage();
  const dateLocale = language === 'tr' ? tr : enUS;
  const isTr = language === 'tr';

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [doseModalVisible, setDoseModalVisible] = useState<boolean>(false);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // First day offset (0=Pazar, 1=Pazartesi vb. Biz Pzt=0 baslatiyoruz)
  const firstDayOffset = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const day = getDay(start); // 0=Sun, 1=Mon...
    return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
  }, [currentMonth]);

  // Günlük doz durumları haritası
  const dayAdherenceMap = useMemo(() => {
    const map = new Map<
      string,
      { total: number; taken: number; skipped: number; missed: number }
    >();

    daysInMonth.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      let totalScheduled = 0;

      // O gün hangi ilaçlar planlı?
      medicines
        .filter(m => isMedicineScheduledForDate(m, day))
        .forEach(m => {
          const times = reminderTimes.filter(rt => rt.medicineId === m.id && rt.isEnabled);
          totalScheduled += times.length;
        });

      const dayLogs = medicineLogs.filter(l => l.scheduledTime.startsWith(dayStr));
      const taken = dayLogs.filter(l => l.status === 'taken').length;
      const skipped = dayLogs.filter(l => l.status === 'skipped').length;
      const missed = dayLogs.filter(l => l.status === 'missed').length;

      map.set(dayStr, {
        total: totalScheduled,
        taken,
        skipped,
        missed,
      });
    });

    return map;
  }, [daysInMonth, medicines, reminderTimes, medicineLogs]);

  // Seçili güne ait detaylı doz listesi
  const selectedDayDoses = useMemo((): DayDoseItem[] => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const doses: DayDoseItem[] = [];

    const activeMedicinesForDay = medicines.filter(m =>
      isMedicineScheduledForDate(m, selectedDate)
    );

    activeMedicinesForDay.forEach(medicine => {
      const times = reminderTimes.filter(rt => rt.medicineId === medicine.id && rt.isEnabled);

      times.forEach(rt => {
        const log = medicineLogs.find(
          l =>
            l.medicineId === medicine.id &&
            l.reminderTimeId === rt.id &&
            l.scheduledTime.startsWith(dayStr)
        );

        doses.push({
          medicine,
          time: rt.time,
          status: log?.status || 'pending',
          takenAt: log?.takenAt,
          skipReason: log?.skipReason,
          skipReasonNote: log?.skipReasonNote,
        });
      });
    });

    return doses.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, medicines, reminderTimes, medicineLogs]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const takenCount = selectedDayDoses.filter(d => d.status === 'taken').length;
  const skippedCount = selectedDayDoses.filter(d => d.status === 'skipped').length;
  const missedCount = selectedDayDoses.filter(d => d.status === 'missed').length;
  const pendingCount = selectedDayDoses.filter(d => d.status === 'pending').length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={[styles.navButton, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.navButton, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdaysRow}>
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'].map((dayName, idx) => (
          <Text key={idx} style={[styles.weekdayLabel, { color: colors.textSecondary }]}>
            {dayName}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {Array.from({ length: firstDayOffset }).map((_, idx) => (
          <View key={`empty-${idx}`} style={styles.emptyDayCell} />
        ))}

        {daysInMonth.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDay = isToday(day);
          const stats = dayAdherenceMap.get(dayStr);

          const hasData = stats && (stats.taken > 0 || stats.skipped > 0 || stats.missed > 0);
          const isFullSuccess = stats && stats.total > 0 && stats.taken === stats.total;
          const hasMissed = stats && stats.missed > 0;

          return (
            <TouchableOpacity
              key={dayStr}
              onPress={() => setSelectedDate(day)}
              style={[
                styles.dayCell,
                isSelected && {
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                },
                isTodayDay &&
                  !isSelected && {
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                    borderRadius: 10,
                  },
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: isSelected ? '#FFFFFF' : isTodayDay ? colors.primary : colors.text,
                    fontWeight: isSelected || isTodayDay ? '700' : '500',
                  },
                ]}
              >
                {format(day, 'd')}
              </Text>

              <View
                style={[
                  styles.dotIndicator,
                  hasData
                    ? {
                        backgroundColor: isFullSuccess
                          ? '#10B981'
                          : hasMissed
                            ? '#EF4444'
                            : '#F59E0B',
                      }
                    : { backgroundColor: 'transparent' },
                  isSelected && hasData && { backgroundColor: '#FFFFFF' },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.summaryTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryDateText, { color: colors.text }]}>
              📅 {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: dateLocale })}
            </Text>
            <Text style={[styles.summarySubtitleText, { color: colors.textSecondary }]}>
              {selectedDayDoses.length > 0
                ? `${selectedDayDoses.length} ${isTr ? 'Doz Planlandı' : 'Doses Scheduled'}`
                : isTr
                  ? 'Planlanmış doz yok'
                  : 'No scheduled doses'}
            </Text>
          </View>

          {selectedDayDoses.length > 0 && (
            <TouchableOpacity
              onPress={() => setDoseModalVisible(true)}
              style={[styles.inspectButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={styles.inspectButtonText}>{isTr ? 'Dozları Gör' : 'View Doses'}</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {selectedDayDoses.length > 0 && (
          <View style={styles.pillsRow}>
            {selectedDayDoses.slice(0, 3).map((dose, idx) => (
              <View
                key={`${dose.medicine.id}_${idx}`}
                style={[
                  styles.miniPill,
                  {
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#EFF6FF',
                    borderColor: isDark ? '#38BDF8' : '#93C5FD',
                  },
                ]}
              >
                <Text
                  style={[styles.miniPillText, { color: isDark ? '#38BDF8' : '#1D4ED8' }]}
                  numberOfLines={1}
                >
                  {dose.medicine.name}
                </Text>
              </View>
            ))}
            {selectedDayDoses.length > 3 && (
              <View
                style={[
                  styles.miniPill,
                  {
                    backgroundColor: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9',
                    borderColor: '#94A3B8',
                  },
                ]}
              >
                <Text style={[styles.miniPillText, { color: colors.textSecondary }]}>
                  +{selectedDayDoses.length - 3} {isTr ? 'daha' : 'more'}
                </Text>
              </View>
            )}
            {takenCount > 0 && (
              <View
                style={[
                  styles.miniPill,
                  { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' },
                ]}
              >
                <Text style={[styles.miniPillText, { color: '#10B981' }]}>
                  ✓ {takenCount} {isTr ? 'Alındı' : 'Taken'}
                </Text>
              </View>
            )}
            {pendingCount > 0 && (
              <View
                style={[
                  styles.miniPill,
                  {
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
                    borderColor: '#38BDF8',
                  },
                ]}
              >
                <Text style={[styles.miniPillText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                  ⏳ {pendingCount} {isTr ? 'Bekliyor' : 'Pending'}
                </Text>
              </View>
            )}
            {skippedCount > 0 && (
              <View
                style={[
                  styles.miniPill,
                  { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' },
                ]}
              >
                <Text style={[styles.miniPillText, { color: '#F59E0B' }]}>
                  ⊘ {skippedCount} {isTr ? 'Atlandı' : 'Skipped'}
                </Text>
              </View>
            )}
            {missedCount > 0 && (
              <View
                style={[
                  styles.miniPill,
                  { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' },
                ]}
              >
                <Text style={[styles.miniPillText, { color: '#EF4444' }]}>
                  ✗ {missedCount} {isTr ? 'Kaçırıldı' : 'Missed'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {doseModalVisible && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              zIndex: 999,
              justifyContent: 'flex-end',
              margin: -16,
              borderRadius: 16,
            },
          ]}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#CBD5E1',
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  📅 {format(selectedDate, 'd MMMM yyyy', { locale: dateLocale })}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedDayDoses.length} {isTr ? 'İlaç Dozu' : 'Medication Doses'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDoseModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ maxHeight: 340 }}>
              {selectedDayDoses.map((dose, index) => {
                const isTaken = dose.status === 'taken';
                const isSkipped = dose.status === 'skipped';
                const isMissed = dose.status === 'missed';

                return (
                  <View
                    key={`${dose.medicine.id}_${dose.time}_${index}`}
                    style={[
                      styles.doseCard,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.medicineColorIndicator,
                        { backgroundColor: dose.medicine.color || colors.primary },
                      ]}
                    />

                    <View style={styles.doseInfo}>
                      <Text
                        style={[styles.doseMedicineName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {dose.medicine.name}
                      </Text>
                      <Text style={[styles.doseDetailsText, { color: colors.textSecondary }]}>
                        {dose.medicine.dosage || ''} · ⏰ {dose.time}
                      </Text>
                      {dose.skipReason && (
                        <Text style={styles.skipReasonText}>
                          ⚠️ {isTr ? 'Atlama Nedeni: ' : 'Skip: '}
                          {dose.skipReasonNote
                            ? `${dose.skipReason}: ${dose.skipReasonNote}`
                            : dose.skipReason}
                        </Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isTaken
                            ? 'rgba(16, 185, 129, 0.18)'
                            : isSkipped
                              ? 'rgba(245, 158, 11, 0.18)'
                              : isMissed
                                ? 'rgba(239, 68, 68, 0.18)'
                                : isDark
                                  ? 'rgba(56, 189, 248, 0.15)'
                                  : '#EFF6FF',
                          borderColor: isTaken
                            ? '#10B981'
                            : isSkipped
                              ? '#F59E0B'
                              : isMissed
                                ? '#EF4444'
                                : '#38BDF8',
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isTaken
                              ? '#10B981'
                              : isSkipped
                                ? '#F59E0B'
                                : isMissed
                                  ? '#EF4444'
                                  : isDark
                                    ? '#38BDF8'
                                    : '#0284C7',
                          },
                        ]}
                      >
                        {isTaken
                          ? isTr
                            ? '✓ Alındı'
                            : '✓ Taken'
                          : isSkipped
                            ? isTr
                              ? '⊘ Atlandı'
                              : '⊘ Skipped'
                            : isMissed
                              ? isTr
                                ? '✗ Kaçırıldı'
                                : '✗ Missed'
                              : isTr
                                ? '⏳ Bekliyor'
                                : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    marginVertical: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  selectedDayCell: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  todayCell: {
    borderWidth: 1.5,
  },
  dayNumber: {
    fontSize: 13,
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryDateText: {
    fontSize: 14,
    fontWeight: '700',
  },
  summarySubtitleText: {
    fontSize: 12,
    marginTop: 2,
  },
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inspectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  medicineColorIndicator: {
    width: 6,
    height: 34,
    borderRadius: 3,
    marginRight: 10,
  },
  doseInfo: {
    flex: 1,
  },
  doseMedicineName: {
    fontSize: 14,
    fontWeight: '600',
  },
  doseDetailsText: {
    fontSize: 12,
    marginTop: 2,
  },
  skipReasonText: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 3,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
