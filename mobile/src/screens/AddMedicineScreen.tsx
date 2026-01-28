import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddMedicine } from '../hooks/useAddMedicine';
import { MedicineInstruction } from '../types';
import { ThemeColors } from '../contexts/ThemeContext';
import {
  MedicineNameInput,
  DosageInput,
  FrequencySelector,
  InstructionSelector,
  ColorPicker,
  ReminderTimes,
  FormButtons,
  BarcodeSection,
  StockSection,
  ExpirySection,
} from '../components/addMedicine';

export default function AddMedicineScreen() {
  const {
    routeParams,
    isEditing,
    colors,
    t,
    language,
    formState,
    updateFormField,
    autocompleteState,
    setNameInputFocused,
    handleSelectAutocomplete,
    timePickerState,
    handleAddTime,
    handleEditTime,
    handleDeleteTime,
    handleTimeChange,
    handleConfirmTime,
    switchToManualTimes,
    closeTimePicker,
    previewTimes,
    settings,
    handleScanBarcode,
    handleSave,
    handleCancel,
  } = useAddMedicine();

  const INSTRUCTION_OPTIONS: { value: MedicineInstruction; label: string }[] = [
    { value: 'any_time', label: t('instruction_any_time') },
    { value: 'before_meal', label: t('instruction_before_meal') },
    { value: 'after_meal', label: t('instruction_after_meal') },
    { value: 'with_meal', label: t('instruction_with_meal') },
    { value: 'empty_stomach', label: t('instruction_empty_stomach') },
    { value: 'before_sleep', label: t('instruction_before_sleep') },
  ];

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <BarcodeSection
            barcode={routeParams.barcode}
            onScanPress={handleScanBarcode}
            isEditing={isEditing}
            scanButtonText={t('medicine_scan_barcode')}
            colors={colors}
          />

          <MedicineNameInput
            value={formState.name}
            onChangeText={text => updateFormField('name', text)}
            onFocus={() => setNameInputFocused(true)}
            onBlur={() => setNameInputFocused(false)}
            autocompleteState={autocompleteState}
            onSelectAutocomplete={handleSelectAutocomplete}
            label={t('medicine_name')}
            placeholder={t('medicine_name_placeholder')}
            colors={colors}
          />

          <DosageInput
            value={formState.dosage}
            onChangeText={text => updateFormField('dosage', text)}
            label={t('medicine_dosage')}
            placeholder={t('medicine_dosage_placeholder')}
            colors={colors}
          />

          <FrequencySelector
            value={formState.frequency}
            onSelect={freq => updateFormField('frequency', freq)}
            label={t('medicine_frequency')}
            colors={colors}
          />

          <InstructionSelector
            value={formState.instruction}
            onSelect={inst => updateFormField('instruction', inst)}
            options={INSTRUCTION_OPTIONS}
            label={t('medicine_instruction')}
            colors={colors}
          />

          <ColorPicker
            value={formState.selectedColor}
            onSelect={color => updateFormField('selectedColor', color)}
            label={t('medicine_color')}
            colors={colors}
          />

          <ReminderTimes
            previewTimes={previewTimes}
            customTimes={formState.customTimes}
            useCustomTimes={formState.useCustomTimes}
            selectedColor={formState.selectedColor}
            wakeUpTime={settings.wakeUpTime}
            sleepTime={settings.sleepTime}
            timePickerState={timePickerState}
            onEditTime={handleEditTime}
            onDeleteTime={handleDeleteTime}
            onAddTime={handleAddTime}
            onTimeChange={handleTimeChange}
            onConfirmTime={handleConfirmTime}
            onCloseTimePicker={closeTimePicker}
            onSwitchToManual={switchToManualTimes}
            label={t('medicine_reminder_times')}
            colors={colors}
            language={language}
          />

          <StockSection
            enabled={formState.stockEnabled}
            count={formState.stockCount}
            threshold={formState.stockThreshold}
            unit={formState.stockUnit}
            onEnabledChange={enabled => updateFormField('stockEnabled', enabled)}
            onCountChange={count => updateFormField('stockCount', count)}
            onThresholdChange={threshold => updateFormField('stockThreshold', threshold)}
            onUnitChange={unit => updateFormField('stockUnit', unit)}
            label={language === 'tr' ? 'Stok Takibi' : 'Stock Tracking'}
            colors={colors}
            language={language}
          />

          <ExpirySection
            expiryDate={formState.expiryDate}
            expiryReminderDays={formState.expiryReminderDays}
            onExpiryDateChange={date => updateFormField('expiryDate', date)}
            onReminderDaysChange={days => updateFormField('expiryReminderDays', days)}
            label={t('expiry_title')}
            colors={colors}
            language={language}
          />

          <View style={{ height: 20 }} />
        </ScrollView>

        <FormButtons
          onSave={handleSave}
          onCancel={handleCancel}
          isEditing={isEditing}
          cancelText={t('cancel')}
          saveText={t('save')}
          updateText={language === 'tr' ? 'Guncelle' : 'Update'}
          colors={colors}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
  });
