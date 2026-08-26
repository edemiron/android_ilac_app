import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useHaptics } from '../../../hooks/useHaptics';

interface DayStatus {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  dots: Array<'taken' | 'pending' | 'missed'>;
}

interface WeeklyCalendarStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  medicineLogsSummary?: Record<string, { total: number; taken: number; pending: number }>;
}

export const WeeklyCalendarStrip: React.FC<WeeklyCalendarStripProps> = ({
  selectedDate,
  onSelectDate,
  medicineLogsSummary = {},
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const haptics = useHaptics();
  const locale = language === 'tr' ? tr : enUS;

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  const days: DayStatus[] = Array.from({ length: 7 }).map((_, idx) => {
    const dayDate = addDays(weekStart, idx);
    const dateKey = format(dayDate, 'yyyy-MM-dd');
    const isToday = isSameDay(dayDate, today);
    const isSelected = isSameDay(dayDate, selectedDate);

    // Calculate dots based on summary or default
    const summary = medicineLogsSummary[dateKey];
    const dots: Array<'taken' | 'pending' | 'missed'> = [];

    if (summary && summary.total > 0) {
      for (let i = 0; i < Math.min(summary.taken, 3); i++) {
        dots.push('taken');
      }
      if (summary.pending > 0 && dots.length < 3) {
        dots.push(dayDate < today && !isToday ? 'missed' : 'pending');
      }
    } else if (isToday) {
      dots.push('pending');
    }

    return {
      date: dayDate,
      isToday,
      isSelected,
      dots,
    };
  });

  const handlePressDay = (date: Date) => {
    haptics.trigger('selection');
    onSelectDate(date);
  };

  return (
    <View style={styles.container}>
      {days.map((item, index) => {
        const dayName = format(item.date, 'EEE', { locale });
        // Capitalize first letter (e.g. "Pzt", "Sal", "Çar")
        const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1, 3);
        const dayNumber = format(item.date, 'd');

        return (
          <TouchableOpacity
            key={index}
            style={styles.dayItem}
            onPress={() => handlePressDay(item.date)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dayName,
                {
                  color: item.isSelected
                    ? isDark
                      ? '#2DD4BF'
                      : '#0F766E'
                    : item.isToday
                      ? colors.primary
                      : isDark
                        ? '#94A3B8'
                        : '#64748B',
                  fontWeight: item.isSelected ? '700' : item.isToday ? '600' : '500',
                },
              ]}
            >
              {formattedDayName}
            </Text>

            <View
              style={[
                styles.dayNumberCircle,
                item.isSelected
                  ? {
                      backgroundColor: isDark ? '#14B8A6' : '#0F766E',
                    }
                  : item.isToday
                    ? {
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                        backgroundColor: isDark ? 'rgba(13, 148, 136, 0.15)' : '#F0FDFA',
                      }
                    : {
                        backgroundColor: 'transparent',
                      },
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: item.isSelected
                      ? '#FFFFFF'
                      : item.isToday
                        ? isDark
                          ? '#2DD4BF'
                          : '#0F766E'
                        : isDark
                          ? '#F8FAFC'
                          : '#0F172A',
                    fontWeight: item.isSelected ? '700' : '600',
                  },
                ]}
              >
                {dayNumber}
              </Text>
            </View>

            {/* Dots */}
            <View style={styles.dotsContainer}>
              {item.dots.map((dot, dIdx) => (
                <View
                  key={dIdx}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        dot === 'taken'
                          ? isDark
                            ? '#34D399'
                            : '#10B981'
                          : dot === 'pending'
                            ? '#F59E0B'
                            : '#EF4444',
                    },
                  ]}
                />
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 11.5,
    marginBottom: 3,
  },
  dayNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  dayNumber: {
    fontSize: 14,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 6,
    gap: 2.5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
