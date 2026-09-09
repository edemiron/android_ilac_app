/**
 * UsageScheduleCard — İlaç Kullanım Planı & Hatırlatıcı Saatleri Kartı
 *
 * Frekans (Günde kaç kez), Hatırlatma Saatleri ve Kullanım Talimatını (Aç/Tok)
 * kompakt, sezgisel ve doğal hekim reçetesi sırasıyla sunar.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { MedicineInstruction, ReminderTime } from '../../../types';
import type { TimePickerState } from '../../../types/addMedicine.types';
import {
  FrequencySelector,
  InstructionSelector,
  ReminderTimes,
} from '../../../components/addMedicine';

interface UsageScheduleCardProps {
  frequency: number;
  onFrequencyChange: (freq: number) => void;
  onAutoTimes: (times: string[]) => void;
  instruction: MedicineInstruction;
  onInstructionChange: (inst: MedicineInstruction) => void;
  instructionOptions: { value: MedicineInstruction; label: string }[];
  previewTimes: Omit<ReminderTime, 'notificationId'>[];
  customTimes: string[];
  useCustomTimes: boolean;
  selectedColor: string;
  wakeUpTime?: string;
  sleepTime?: string;
  timePickerState: TimePickerState;
  onEditTime: (index: number, time: string) => void;
  onDeleteTime: (index: number) => void;
  onAddTime: () => void;
  onTimeChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  onConfirmTime: () => void;
  onCloseTimePicker: () => void;
  onSwitchToManual: () => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
  labelFrequency: string;
  labelInstruction: string;
  labelReminderTimes: string;
}

export function UsageScheduleCard({
  frequency,
  onFrequencyChange,
  onAutoTimes,
  instruction,
  onInstructionChange,
  instructionOptions,
  previewTimes,
  customTimes,
  useCustomTimes,
  selectedColor,
  wakeUpTime = '08:00',
  sleepTime = '23:00',
  timePickerState,
  onEditTime,
  onDeleteTime,
  onAddTime,
  onTimeChange,
  onConfirmTime,
  onCloseTimePicker,
  onSwitchToManual,
  colors,
  language,
  labelFrequency,
  labelInstruction,
  labelReminderTimes,
}: UsageScheduleCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* 1. Günde Kaç Kez? (Frekans) */}
      <FrequencySelector
        value={frequency}
        onSelect={onFrequencyChange}
        onAutoTimes={onAutoTimes}
        label={labelFrequency}
        colors={colors}
      />

      {/* 2. Hatırlatma Zamanları (Saatler) */}
      <ReminderTimes
        previewTimes={previewTimes}
        customTimes={customTimes}
        useCustomTimes={useCustomTimes}
        selectedColor={selectedColor}
        wakeUpTime={wakeUpTime}
        sleepTime={sleepTime}
        timePickerState={timePickerState}
        onEditTime={onEditTime}
        onDeleteTime={onDeleteTime}
        onAddTime={onAddTime}
        onTimeChange={onTimeChange}
        onConfirmTime={onConfirmTime}
        onCloseTimePicker={onCloseTimePicker}
        onSwitchToManual={onSwitchToManual}
        label={labelReminderTimes}
        colors={colors}
        language={language}
      />

      {/* 3. Kullanım Talimatı (Aç/Tok Durumu) */}
      <InstructionSelector
        value={instruction}
        onSelect={onInstructionChange}
        options={instructionOptions}
        label={labelInstruction}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    paddingTop: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
});
