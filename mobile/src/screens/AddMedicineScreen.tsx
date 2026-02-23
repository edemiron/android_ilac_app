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
  StockSection,
  ExpirySection,
  ImagePickerSection,
  AdvancedSettingsSection,
} from '../components/addMedicine';

import { useNavigation } from '@react-navigation/native';

export default function AddMedicineScreen() {
  const navigation = useNavigation<any>();
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
    handleDosageAmountChange,
    handleMedicineFormChange,
    handleAutoTimes,
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* KART 1: Temel Bilgiler */}
          <View style={styles.card}>
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
              showBarcodeIcon={!isEditing}
              onScanPress={handleScanBarcode}
              barcodeScanned={!!routeParams.barcode}
            />

            <DosageInput
              dosageAmount={formState.dosageAmount}
              medicineForm={formState.medicineForm}
              onAmountChange={handleDosageAmountChange}
              onFormChange={handleMedicineFormChange}
              label={t('medicine_dosage')}
              colors={colors}
              language={language}
            />
          </View>

          {/* KART 2: Kullanım Planı */}
          <View style={styles.card}>
            <FrequencySelector
              value={formState.frequency}
              onSelect={freq => updateFormField('frequency', freq)}
              onAutoTimes={handleAutoTimes}
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
          </View>

          {/* KART 3: Görünüm ve Ekstralar */}
          <View style={styles.card}>
            <ImagePickerSection
              imageUri={formState.imageUri}
              onImageChange={(uri) => updateFormField('imageUri', uri)}
              label={language === 'tr' ? 'İlaç Fotoğrafı' : 'Medicine Photo'}
              colors={colors}
              language={language}
            />

            <ColorPicker
              value={formState.selectedColor}
              onSelect={color => updateFormField('selectedColor', color)}
              category={formState.category}
              onCategorySelect={cat => updateFormField('category', cat)}
              label={language === 'tr' ? 'Tema Rengi' : 'Theme Color'}
              colors={colors}
            />
          </View>

          {/* KART 4: Gelişmiş Alarmlar */}
          <View style={styles.card}>
            <AdvancedSettingsSection
              formState={formState}
              onRequireBarcodeChange={(val: boolean) => updateFormField('requireBarcodeOnTake', val)}
              onVibrationPatternChange={(pattern: 'default' | 'heartbeat' | 'urgent' | 'soft') => updateFormField('vibrationPattern', pattern)}
              onScanBarcode={() => navigation.navigate('BarcodeScanner', { mode: 'assign' })}
              label={language === 'tr' ? 'Gelişmiş Alarm Ayarları' : 'Advanced Alarm Settings'}
              colors={colors}
              language={language}
            />
          </View>

          {/* KART 5: Stok ve SKT */}
          <View style={styles.card}>
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
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        <FormButtons
          onSave={handleSave}
          onCancel={handleCancel}
          isEditing={isEditing}
          cancelText={t('cancel')}
          saveText={t('save')}
          updateText={t('update')}
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
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.card,
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
      borderColor: colors.border,
    },
  });
