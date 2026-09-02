import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type {
  Medicine,
  MedicineForm,
  MedicineAutocompleteResult,
  FoodInteractionType,
} from '../../../types';
import type { AutocompleteState } from '../../../types/addMedicine.types';
import type { DuplicateTherapyWarning } from '../../../utils/clinicalSafetyEngine';
import {
  fetchTitckOfficialPdfUrl,
  openInAppProspectusUrl,
} from '../../../services/titckProspectusService';
import {
  MedicineNameInput,
  DosageInput,
  DrugInteractionWarningBanner,
  MedicinePhotoChip,
  FoodInteractionBadgeList,
  DuplicateTherapyBanner,
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
  onVoicePress?: () => void;
  onOpenERecetePress?: () => void;
  foodInteractions?: FoodInteractionType[];
  duplicateWarning?: DuplicateTherapyWarning | null;
  titckKubKtUrl?: string;
  imageUri?: string;
  onRemovePhoto?: () => void;
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
  onVoicePress,
  onOpenERecetePress,
  foodInteractions = [],
  duplicateWarning = null,
  titckKubKtUrl,
  imageUri,
  onRemovePhoto,
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
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* E-Reçete Hızlı İçe Aktarma Butonu */}
      {!isEditing && onOpenERecetePress && (
        <TouchableOpacity
          style={[
            styles.ereceteBanner,
            { backgroundColor: colors.primary + '15', borderColor: colors.primary },
          ]}
          onPress={onOpenERecetePress}
          activeOpacity={0.7}
        >
          <View style={styles.ereceteLeft}>
            <Text style={styles.ereceteFlag}>🇹🇷</Text>
            <View>
              <Text style={[styles.ereceteTitle, { color: colors.primary }]}>
                {language === 'tr'
                  ? 'E-Reçete ile Otomatik Ekle'
                  : 'Auto-Import from E-Prescription'}
              </Text>
              <Text style={[styles.ereceteSub, { color: colors.textSecondary }]}>
                {language === 'tr'
                  ? 'SMS veya Reçete kodunu yapıştırın'
                  : 'Paste SMS or prescription code'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}

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
        showVoiceIcon={!isEditing}
        onVoicePress={onVoicePress}
      />

      {/* Eklenen kutu fotoğrafı varsa önizleme ve silme çipi */}
      {imageUri && onRemovePhoto ? (
        <MedicinePhotoChip
          imageUri={imageUri}
          onRemovePhoto={onRemovePhoto}
          colors={colors}
          language={language}
        />
      ) : null}

      {/* Mükerrer Tedavi (Çift Doz) Uyarısı */}
      <DuplicateTherapyBanner warning={duplicateWarning} colors={colors} language={language} />

      {/* Gıda - İlaç Etkileşim Rozetleri */}
      <FoodInteractionBadgeList
        interactions={foodInteractions}
        colors={colors}
        language={language}
      />

      {/* TİTCK Resmi KÜB/KT Prospektüs Butonu */}
      {name.trim().length >= 3 && (
        <TouchableOpacity
          style={[
            styles.titckButton,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          disabled={isLoadingPdf}
          onPress={async () => {
            setIsLoadingPdf(true);
            try {
              const result = await fetchTitckOfficialPdfUrl(name);
              const targetUrl =
                result.ktPdfUrl || result.kubPdfUrl || result.fallbackUrl || titckKubKtUrl;
              if (targetUrl) {
                await openInAppProspectusUrl(targetUrl, colors.primary);
              }
            } catch (_) {
              if (titckKubKtUrl) {
                await openInAppProspectusUrl(titckKubKtUrl, colors.primary);
              }
            } finally {
              setIsLoadingPdf(false);
            }
          }}
          activeOpacity={0.7}
        >
          {isLoadingPdf ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons
              name="document-text-outline"
              size={16}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
          )}
          <Text style={[styles.titckButtonText, { color: colors.primary }]}>
            {isLoadingPdf
              ? language === 'tr'
                ? 'Resmi PDF Açılıyor...'
                : 'Opening Official PDF...'
              : language === 'tr'
                ? 'Resmi TİTCK Kullanma Talimatı (KÜB/KT PDF)'
                : 'Official TİTCK Prospectus (PIL PDF)'}
          </Text>
          {!isLoadingPdf && (
            <Ionicons
              name="open-outline"
              size={14}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </TouchableOpacity>
      )}

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
    paddingTop: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    zIndex: 100,
  },
  ereceteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  ereceteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ereceteFlag: {
    fontSize: 22,
    marginRight: 10,
  },
  ereceteTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  ereceteSub: {
    fontSize: 11,
  },
  titckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  titckButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
