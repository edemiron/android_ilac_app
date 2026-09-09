/**
 * AddMedicineScreen — İlaç Ekleme ve Düzenleme Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View & Progressive Disclosure
 *
 * HİBRİT ŞAMPİYON MODEL & İNCE DOKUNUŞLAR (v1.4.9):
 * 1. Temel İlaç & Dozaj Kartı (TİTCK Canlı Arama, Sesli Reçete Asistanı & Kutu Fotoğraf Çipi)
 * 2. Zamanlama & Kullanım Kartı (Günde kaç kez, saatler, aç/tok durumu)
 * 3. Gelişmiş Seçenekler İçe Açılır Çekmecesi (Kür, Fotoğraf, Kategori, Stok & Titreşim - İsteğe Bağlı)
 * 4. Form Kaydet / İptal Eylemleri
 * 5. Kutlama & İlk Doz Hatırlatma Modalı (Başarı mikro-animasyonu ve haptik titreşim)
 */

import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular Form Cards)
import { BasicInfoCard } from './AddMedicineScreen/components/BasicInfoCard';
import { UsageScheduleCard } from './AddMedicineScreen/components/UsageScheduleCard';
import { AdvancedOptionsAccordion } from './AddMedicineScreen/components/AdvancedOptionsAccordion';
import {
  FormButtons,
  MedicineAddedCelebrationModal,
  VoiceAddMedicineModal,
  EReceteImportModal,
} from '../components/addMedicine';

// Presenter Hook & Responsive
import { useAddMedicineController } from './AddMedicineScreen/hooks/useAddMedicineController';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

export default function AddMedicineScreen() {
  const { isTablet } = useResponsiveLayout();
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
    handleRemovePhoto,
    isAnalyzingPhoto,
    handleSave,
    handleCancel,
    handleDosageAmountChange,
    handleMedicineFormChange,
    handleAutoTimes,
    medicines,
    instructionOptions,
    // Yeni İnce Dokunuşlar
    celebrationState,
    handleDismissCelebration,
    voiceModalVisible,
    setVoiceModalVisible,
    handleApplyVoiceMedicine,
    // Klinik Güvenlik & E-Reçete (Sprint 104)
    foodInteractions,
    duplicateWarning,
    titckKubKtUrl,
    showEReceteModal,
    setShowEReceteModal,
    handleSelectEReceteMedicine,
  } = useAddMedicineController();

  const renderBasicInfoCard = () => (
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
      onVoicePress={() => setVoiceModalVisible(true)}
      onOpenERecetePress={() => setShowEReceteModal(true)}
      foodInteractions={foodInteractions}
      duplicateWarning={duplicateWarning}
      titckKubKtUrl={titckKubKtUrl}
      imageUri={formState.imageUri}
      onRemovePhoto={handleRemovePhoto}
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
  );

  const renderScheduleCards = () => (
    <>
      <UsageScheduleCard
        frequency={formState.frequency}
        onFrequencyChange={freq => updateFormField('frequency', freq)}
        onAutoTimes={handleAutoTimes}
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

      <AdvancedOptionsAccordion
        formState={formState}
        isEditing={isEditing}
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
        imageUri={formState.imageUri}
        onImageChange={uri => updateFormField('imageUri', uri)}
        selectedColor={formState.selectedColor}
        onColorChange={color => updateFormField('selectedColor', color)}
        category={formState.category}
        onCategoryChange={cat => updateFormField('category', cat)}
        onVibrationPatternChange={(pattern: 'default' | 'heartbeat' | 'urgent' | 'soft') =>
          updateFormField('vibrationPattern', pattern)
        }
        onIsCriticalChange={isCritical => updateFormField('isCritical', isCritical)}
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
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, isTablet && styles.tabletScrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isTablet ? (
            <View style={styles.tabletDualPaneRow}>
              {/* Sol Sütun: Temel Bilgiler & Form Seçici */}
              <View style={[styles.tabletColumn, styles.tabletLeftColumn]}>
                {renderBasicInfoCard()}
              </View>

              {/* Sağ Sütun: Kullanım Planı & Gelişmiş Seçenekler */}
              <View style={styles.tabletColumn}>{renderScheduleCards()}</View>
            </View>
          ) : (
            <>
              {renderBasicInfoCard()}
              {renderScheduleCards()}
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Kaydet / İptal Aksiyon Butonları */}
        <View style={isTablet ? styles.tabletFormButtonsContainer : undefined}>
          <FormButtons
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={isEditing}
            cancelText={t('cancel')}
            saveText={t('save')}
            updateText={t('update')}
            colors={colors}
          />
        </View>
      </KeyboardAvoidingView>

      {/* 🎙️ Sesli Reçete Asistanı Modalı */}
      <VoiceAddMedicineModal
        visible={voiceModalVisible}
        onApplyParsedMedicine={handleApplyVoiceMedicine}
        onClose={() => setVoiceModalVisible(false)}
        colors={colors}
        language={language}
      />

      {/* 🇹🇷 E-Reçete Hızlı İçe Aktarma Modalı */}
      <EReceteImportModal
        visible={showEReceteModal}
        onClose={() => setShowEReceteModal(false)}
        onSelectMedicine={handleSelectEReceteMedicine}
        colors={colors}
        language={language}
      />

      {/* 🎉 İlaç Başarıyla Eklendi / Güncellendi Kutlama Modalı */}
      <MedicineAddedCelebrationModal
        data={celebrationState}
        onDismiss={handleDismissCelebration}
        colors={colors}
        language={language}
      />
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
  tabletScrollContent: {
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  tabletDualPaneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  tabletColumn: {
    width: '49%',
  },
  tabletLeftColumn: {
    zIndex: 20,
  },
  tabletFormButtonsContainer: {
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },
});
