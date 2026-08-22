/**
 * BasicInfoCard — Temel İlaç Bilgileri Form Kartı
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { Medicine, MedicineForm, MedicineAutocompleteResult } from '../../../types';
import type { AutocompleteState } from '../../../types/addMedicine.types';
import {
  MedicineNameInput,
  DosageInput,
  DrugInteractionWarningBanner,
} from '../../../components/addMedicine';

interface BasicInfoCardProps {
  name: string;
  onChangeName: (text: string) => void;
  onNameFocus: () => void;
  onNameBlur: () => void;
  autocompleteState: AutocompleteState;
  onSelectAutocomplete: (item: MedicineAutocompleteResult) => void;
  isEditing: boolean;
  onScanBarcode: () => void;
  barcodeScanned: boolean;
  onScanPhotoBox: () => void;
  isAnalyzingPhoto: boolean;
  dosageAmount: string;
  medicineForm: MedicineForm;
  onDosageAmountChange: (amount: string) => void;
  onMedicineFormChange: (form: MedicineForm) => void;
  medicines: Medicine[];
  colors: ThemeColors;
  language: 'tr' | 'en';
  labelMedicineName: string;
  placeholderMedicineName: string;
  labelDosage: string;
}

export function BasicInfoCard({
  name,
  onChangeName,
  onNameFocus,
  onNameBlur,
  autocompleteState,
  onSelectAutocomplete,
  isEditing,
  onScanBarcode,
  barcodeScanned,
  onScanPhotoBox,
  isAnalyzingPhoto,
  dosageAmount,
  medicineForm,
  onDosageAmountChange,
  onMedicineFormChange,
  medicines,
  colors,
  language,
  labelMedicineName,
  placeholderMedicineName,
  labelDosage,
}: BasicInfoCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MedicineNameInput
        value={name}
        onChangeText={onChangeName}
        onFocus={onNameFocus}
        onBlur={onNameBlur}
        autocompleteState={autocompleteState}
        onSelectAutocomplete={onSelectAutocomplete}
        label={labelMedicineName}
        placeholder={placeholderMedicineName}
        colors={colors}
        showBarcodeIcon={!isEditing}
        onScanPress={onScanBarcode}
        barcodeScanned={barcodeScanned}
        showPhotoIcon={!isEditing}
        onPhotoScanPress={onScanPhotoBox}
        isAnalyzingPhoto={isAnalyzingPhoto}
      />

      <DosageInput
        dosageAmount={dosageAmount}
        medicineForm={medicineForm}
        onAmountChange={onDosageAmountChange}
        onFormChange={onMedicineFormChange}
        label={labelDosage}
        colors={colors}
        language={language}
      />

      <DrugInteractionWarningBanner currentName={name} existingMedicines={medicines} />
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
