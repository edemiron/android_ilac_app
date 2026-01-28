import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatTimeDisplay } from '../../utils/timeCalculator';
import { TimePickerState } from '../../types/addMedicine.types';
import { ThemeColors } from '../../contexts/ThemeContext';

interface PreviewTime {
  time: string;
}

interface Props {
  previewTimes: PreviewTime[];
  customTimes: string[];
  useCustomTimes: boolean;
  selectedColor: string;
  wakeUpTime: string;
  sleepTime: string;
  timePickerState: TimePickerState;
  onEditTime: (index: number, time: string) => void;
  onDeleteTime: (index: number) => void;
  onAddTime: () => void;
  onTimeChange: (event: DateTimePickerEvent, date?: Date) => void;
  onConfirmTime: () => void;
  onCloseTimePicker: () => void;
  onSwitchToManual: () => void;
  label: string;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function ReminderTimes({
  previewTimes,
  customTimes,
  useCustomTimes,
  selectedColor,
  wakeUpTime,
  sleepTime,
  timePickerState,
  onEditTime,
  onDeleteTime,
  onAddTime,
  onTimeChange,
  onConfirmTime,
  onCloseTimePicker,
  onSwitchToManual,
  label,
  colors,
  language,
}: Props) {
  const styles = createStyles(colors);
  const displayTimes = useCustomTimes ? customTimes : previewTimes.map((t) => t.time);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.timesHeader}>
        <Text style={styles.label}>{label}</Text>
        {!useCustomTimes && (
          <TouchableOpacity onPress={onSwitchToManual}>
            <Text style={styles.editTimesButton}>
              {language === 'tr' ? 'Duzenle' : 'Edit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.previewContainer}>
        {!useCustomTimes && (
          <Text style={styles.previewInfo}>
            {language === 'tr' ? 'Uyanma' : 'Wake'}: {wakeUpTime} | {language === 'tr' ? 'Uyku' : 'Sleep'}: {sleepTime}
          </Text>
        )}

        <View style={styles.timesPreview}>
          {displayTimes.map((time, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.timeChip, { backgroundColor: selectedColor }]}
              onPress={() => useCustomTimes && onEditTime(index, time)}
              onLongPress={() => useCustomTimes && onDeleteTime(index)}
            >
              <Text style={styles.timeChipText}>{formatTimeDisplay(time)}</Text>
              {useCustomTimes && (
                <TouchableOpacity
                  style={styles.timeChipDelete}
                  onPress={() => onDeleteTime(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.timeChipDeleteText}>x</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          {useCustomTimes && (
            <TouchableOpacity style={styles.addTimeChip} onPress={onAddTime}>
              <Text style={styles.addTimeChipText}>+ {language === 'tr' ? 'Ekle' : 'Add'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.previewNote}>
          {useCustomTimes
            ? language === 'tr'
              ? '* Saate dokun: duzenle | Uzun bas: sil'
              : '* Tap time: edit | Long press: delete'
            : language === 'tr'
            ? '* Saatleri duzenlemek icin "Duzenle" butonuna basin'
            : '* Press "Edit" to customize times'}
        </Text>
      </View>

      {timePickerState.showTimePicker &&
        (Platform.OS === 'ios' ? (
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <TouchableOpacity onPress={onCloseTimePicker}>
                <Text style={styles.timePickerCancel}>
                  {language === 'tr' ? 'Iptal' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timePickerTitle}>
                {timePickerState.editingTimeIndex !== null
                  ? language === 'tr'
                    ? 'Saati Duzenle'
                    : 'Edit Time'
                  : language === 'tr'
                  ? 'Saat Ekle'
                  : 'Add Time'}
              </Text>
              <TouchableOpacity onPress={onConfirmTime}>
                <Text style={styles.timePickerConfirm}>
                  {language === 'tr' ? 'Tamam' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={timePickerState.tempTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={onTimeChange}
              locale="tr-TR"
            />
          </View>
        ) : (
          <DateTimePicker
            value={timePickerState.tempTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onTimeChange}
          />
        ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    inputGroup: {
      marginTop: 20,
      zIndex: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    timesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    editTimesButton: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    previewContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    previewInfo: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 12,
    },
    timesPreview: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    timeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 14,
      paddingRight: 8,
      paddingVertical: 8,
      borderRadius: 20,
    },
    timeChipText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    timeChipDelete: {
      marginLeft: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeChipDeleteText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
      lineHeight: 16,
    },
    addTimeChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.primary,
    },
    addTimeChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    previewNote: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 12,
      fontStyle: 'italic',
    },
    timePickerContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginTop: 12,
      overflow: 'hidden',
    },
    timePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    timePickerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    timePickerCancel: {
      fontSize: 16,
      color: colors.error,
    },
    timePickerConfirm: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
  });
