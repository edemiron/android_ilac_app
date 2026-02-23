import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MedicineForm } from '../../types';
import { ThemeColors } from '../../contexts/ThemeContext';

interface FormOption {
  value: MedicineForm;
  labelTr: string;
  labelEn: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
}

// MaterialCommunityIcons tıbbi ikonları — tüm Android sürümlerinde çalışır
const FORM_OPTIONS: FormOption[] = [
  { value: 'tablet', labelTr: 'Tablet', labelEn: 'Tablet', icon: 'pill', color: '#3B82F6' },
  { value: 'capsule', labelTr: 'Kapsül', labelEn: 'Capsule', icon: 'pill-multiple', color: '#8B5CF6' },
  { value: 'syrup', labelTr: 'Şurup', labelEn: 'Syrup', icon: 'bottle-tonic-outline', color: '#06B6D4' },
  { value: 'drops', labelTr: 'Damla', labelEn: 'Drops', icon: 'water-outline', color: '#10B981' },
  { value: 'injection', labelTr: 'İğne', labelEn: 'Inject', icon: 'needle', color: '#F43F5E' },
  { value: 'other', labelTr: 'Diğer', labelEn: 'Other', icon: 'medical-bag', color: '#F59E0B' },
];

interface Props {
  dosageAmount: string;
  medicineForm: MedicineForm;
  onAmountChange: (amount: string) => void;
  onFormChange: (form: MedicineForm) => void;
  label: string;
  colors: ThemeColors;
  language: 'tr' | 'en';
  legacyDosage?: string;
  onLegacyDosageChange?: (text: string) => void;
}

export function DosageInput({
  dosageAmount,
  medicineForm,
  onAmountChange,
  onFormChange,
  label,
  colors,
  language,
}: Props) {
  const styles = createStyles(colors);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label} *</Text>

      <View style={styles.card}>
        {/* Miktar */}
        <Text style={styles.subLabel}>
          {language === 'tr' ? 'Miktar' : 'Amount'}
        </Text>
        <TextInput
          style={styles.amountInput}
          value={dosageAmount}
          onChangeText={onAmountChange}
          placeholder="1"
          placeholderTextColor={colors.placeholder}
          keyboardType="numeric"
          maxLength={6}
        />

        {/* Form seçimi */}
        <Text style={[styles.subLabel, { marginTop: 12 }]}>
          {language === 'tr' ? 'Form' : 'Form'}
        </Text>
        <View style={styles.formGrid}>
          {FORM_OPTIONS.map(opt => {
            const isActive = medicineForm === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.formBtn,
                  {
                    borderColor: isActive ? opt.color : colors.border,
                    backgroundColor: isActive ? opt.color + '18' : 'transparent',
                  },
                ]}
                onPress={() => onFormChange(opt.value)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={19}
                  color={isActive ? opt.color : opt.color + '70'}
                />
                <Text style={[
                  styles.formBtnText,
                  { color: isActive ? opt.color : colors.textMuted },
                  isActive && { fontWeight: '700' },
                ]}>
                  {language === 'tr' ? opt.labelTr : opt.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    inputGroup: {
      marginTop: 16,
      zIndex: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    subLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amountInput: {
      backgroundColor: colors.inputBackground || colors.background,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'center',
    },
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    formBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    formBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });
