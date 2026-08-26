/**
 * AddMedicineScreen — İlaç Ekleme ve Düzenleme Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm form state'leri, validasyonlar, zamanlayıcılar ve autocomplete işleyicileri
 * `useAddMedicineController` Presenter Hook'una aktarılmıştır.
 * Form ekranı 5 ana kart bileşeniyle deklaratif ve son derece temiz biçimde oluşturulmuştur.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular Form Cards)
import { BasicInfoCard } from './AddMedicineScreen/components/BasicInfoCard';
import { UsageScheduleCard } from './AddMedicineScreen/components/UsageScheduleCard';
import { AppearanceCard } from './AddMedicineScreen/components/AppearanceCard';
import { AdvancedAlarmCard } from './AddMedicineScreen/components/AdvancedAlarmCard';
import { InventoryCard } from './AddMedicineScreen/components/InventoryCard';
import { FormButtons } from '../components/addMedicine';

// Presenter Hook
import { useAddMedicineController } from './AddMedicineScreen/hooks/useAddMedicineController';

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
    handleScanPhotoBox,
    isAnalyzingPhoto,
    handleSave,
    handleCancel,
    handleDosageAmountChange,
    handleMedicineFormChange,
    handleAutoTimes,
    medicines,
    instructionOptions,
  } = useAddMedicineController();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* KART 1: Temel Bilgiler (Ad, Dozaj, Çapraz Etkileşim) */}
          <BasicInfoCard
            name={formState.name}
            onChangeName={text => updateFormField('name', text)}
            onNameFocus={() => setNameInputFocused(true)}
            onNameBlur={() => setNameInputFocused(false)}
            autocompleteState={autocompleteState}
            onSelectAutocomplete={handleSelectAutocomplete}
            isEditing={isEditing}
            onScanBarcode={handleScanBarcode}
            barcodeScanned={!!routeParams.barcode}
            onScanPhotoBox={handleScanPhotoBox}
            isAnalyzingPhoto={isAnalyzingPhoto}
            dosageAmount={formState.dosageAmount}
            medicineForm={formState.medicineForm}
            onDosageAmountChange={handleDosageAmountChange}
            onMedicineFormChange={handleMedicineFormChange}
            medicines={medicines}
            colors={colors}
            language={language}
            labelMedicineName={t('medicine_name')}
            placeholderMedicineName={t('medicine_name_placeholder')}
            labelDosage={t('medicine_dosage')}
          />

          {/* KART 2: Kullanım Planı & Hatırlatıcı Saatleri */}
          <UsageScheduleCard
            frequency={formState.frequency}
            onFrequencyChange={freq => updateFormField('frequency', freq)}
            onAutoTimes={handleAutoTimes}
            scheduleType={formState.scheduleType}
            specificDays={formState.specificDays}
            intervalDays={formState.intervalDays}
            cycleDaysOn={formState.cycleDaysOn}
            cycleDaysOff={formState.cycleDaysOff}
            endDate={formState.endDate}
            onScheduleTypeChange={type => updateFormField('scheduleType', type)}
            onSpecificDaysChange={days => updateFormField('specificDays', days)}
            onIntervalDaysChange={int => updateFormField('intervalDays', int)}
            onCycleChange={(on, off) => {
              updateFormField('cycleDaysOn', on);
              updateFormField('cycleDaysOff', off);
            }}
            onEndDateChange={end => updateFormField('endDate', end)}
            instruction={formState.instruction}
            onInstructionChange={inst => updateFormField('instruction', inst)}
            instructionOptions={instructionOptions}
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
            colors={colors}
            language={language}
            labelFrequency={t('medicine_frequency')}
            labelInstruction={t('medicine_instruction')}
            labelReminderTimes={t('medicine_reminder_times')}
          />

          {/* KART 3: Görünüm ve Ekstralar */}
          <AppearanceCard
            imageUri={formState.imageUri}
            onImageChange={uri => updateFormField('imageUri', uri)}
            selectedColor={formState.selectedColor}
            onColorChange={color => updateFormField('selectedColor', color)}
            category={formState.category}
            onCategoryChange={cat => updateFormField('category', cat)}
            colors={colors}
            language={language}
          />

          {/* KART 4: Gelişmiş Alarm Ayarları */}
          <AdvancedAlarmCard
            formState={formState}
            onVibrationPatternChange={(pattern: 'default' | 'heartbeat' | 'urgent' | 'soft') =>
              updateFormField('vibrationPattern', pattern)
            }
            colors={colors}
            language={language}
          />

          {/* KART 5: Stok ve SKT */}
          <InventoryCard
            stockEnabled={formState.stockEnabled}
            stockCount={formState.stockCount}
            stockThreshold={formState.stockThreshold}
            stockUnit={formState.stockUnit}
            onStockEnabledChange={enabled => updateFormField('stockEnabled', enabled)}
            onStockCountChange={count => updateFormField('stockCount', count)}
            onStockThresholdChange={threshold => updateFormField('stockThreshold', threshold)}
            onStockUnitChange={unit => updateFormField('stockUnit', unit)}
            expiryDate={formState.expiryDate}
            expiryReminderDays={formState.expiryReminderDays}
            onExpiryDateChange={date => updateFormField('expiryDate', date)}
            onExpiryReminderDaysChange={days => updateFormField('expiryReminderDays', days)}
            colors={colors}
            language={language}
            labelExpiry={t('expiry_title')}
          />

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Kaydet / İptal Aksiyon Butonları */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
