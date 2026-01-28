import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { ThemeColors } from '../../contexts/ThemeContext';

interface ExpirySectionProps {
  expiryDate: string | null;
  expiryReminderDays: number;
  onExpiryDateChange: (date: string | null) => void;
  onReminderDaysChange: (days: number) => void;
  label: string;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

const REMINDER_OPTIONS = [
  { value: 7, labelTr: '1 hafta', labelEn: '1 week' },
  { value: 14, labelTr: '2 hafta', labelEn: '2 weeks' },
  { value: 30, labelTr: '1 ay', labelEn: '1 month' },
  { value: 90, labelTr: '3 ay', labelEn: '3 months' },
];

export function ExpirySection({
  expiryDate,
  expiryReminderDays,
  onExpiryDateChange,
  onReminderDaysChange,
  label,
  colors,
  language,
}: ExpirySectionProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const styles = createStyles(colors);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onExpiryDateChange(dateStr);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleClearDate = () => {
    onExpiryDateChange(null);
  };

  const formatDisplayDate = (dateStr: string): string => {
    try {
      const date = parse(dateStr, 'yyyy-MM-dd', new Date());
      const locale = language === 'tr' ? tr : enUS;
      return format(date, 'd MMMM yyyy', { locale });
    } catch {
      return dateStr;
    }
  };

  const getInitialDate = (): Date => {
    if (expiryDate) {
      try {
        return parse(expiryDate, 'yyyy-MM-dd', new Date());
      } catch {
        return new Date();
      }
    }
    // Default: 1 year from now
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() + 1);
    return defaultDate;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={[styles.optionalText, { color: colors.textMuted }]}>
          {language === 'tr' ? 'Opsiyonel' : 'Optional'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Date Selection Row */}
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { borderColor: colors.border, backgroundColor: colors.background },
              expiryDate && { borderColor: colors.primary },
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            {expiryDate ? (
              <Text style={[styles.dateText, { color: colors.text }]}>
                {formatDisplayDate(expiryDate)}
              </Text>
            ) : (
              <Text style={[styles.datePlaceholder, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Tarih seçin' : 'Select date'}
              </Text>
            )}
            <Ionicons
              name="calendar"
              size={20}
              color={expiryDate ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          {expiryDate && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.error + '15' }]}
              onPress={handleClearDate}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>

        {/* Reminder Days Selection (only show if date is selected) */}
        {expiryDate && (
          <View style={styles.reminderSection}>
            <View style={styles.reminderHeader}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={colors.warning || '#F59E0B'}
              />
              <Text style={[styles.reminderLabel, { color: colors.textSecondary }]}>
                {language === 'tr' ? 'Ne zaman hatırlat?' : 'When to remind?'}
              </Text>
            </View>

            <View style={styles.reminderOptions}>
              {REMINDER_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.reminderOption,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    expiryReminderDays === option.value && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => onReminderDaysChange(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.reminderOptionText,
                      { color: colors.text },
                      expiryReminderDays === option.value && { color: '#FFFFFF' },
                    ]}
                  >
                    {language === 'tr' ? option.labelTr : option.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.reminderHint, { color: colors.textMuted }]}>
              {language === 'tr'
                ? `Son kullanma tarihinden ${expiryReminderDays} gün önce hatırlatılacak`
                : `You'll be reminded ${expiryReminderDays} days before expiry`}
            </Text>
          </View>
        )}
      </View>

      {/* DateTimePicker Modal */}
      {showDatePicker && (
        <DateTimePicker
          testID="expiryDatePicker"
          value={getInitialDate()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
          locale={language === 'tr' ? 'tr-TR' : 'en-US'}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    optionalText: {
      fontSize: 12,
      fontWeight: '500',
    },
    content: {
      marginTop: 16,
      gap: 16,
    },
    dateRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 2,
    },
    dateText: {
      fontSize: 16,
      fontWeight: '600',
    },
    datePlaceholder: {
      fontSize: 16,
    },
    clearButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reminderSection: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reminderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    reminderLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    reminderOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    reminderOption: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 2,
    },
    reminderOptionText: {
      fontSize: 14,
      fontWeight: '600',
    },
    reminderHint: {
      fontSize: 12,
      marginTop: 12,
      lineHeight: 16,
    },
  });
