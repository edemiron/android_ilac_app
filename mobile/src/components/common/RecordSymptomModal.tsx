/**
 * RecordSymptomModal.tsx — Hızlı Semptom, Tansiyon & Yan Etki Kayıt Modalı (Sprint 104)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSymptomStore, SymptomType } from '../../stores/symptomStore';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface RecordSymptomModalProps {
  visible: boolean;
  onClose: () => void;
  medicineId?: string;
  medicineName?: string;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function RecordSymptomModal({
  visible,
  onClose,
  medicineId,
  medicineName,
  colors,
  language,
}: RecordSymptomModalProps) {
  const addSymptomLog = useSymptomStore(s => s.addSymptomLog);

  const [selectedType, setSelectedType] = useState<SymptomType>('blood_pressure');
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [pulse, setPulse] = useState('72');
  const [glucose, setGlucose] = useState('95');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [notes, setNotes] = useState('');

  const SYMPTOM_OPTIONS: Array<{
    type: SymptomType;
    icon: string;
    titleTr: string;
    titleEn: string;
  }> = [
    { type: 'blood_pressure', icon: '❤️', titleTr: 'Tansiyon', titleEn: 'Blood Pressure' },
    { type: 'blood_sugar', icon: '🩸', titleTr: 'Şeker', titleEn: 'Blood Sugar' },
    { type: 'heart_rate', icon: '💓', titleTr: 'Nabız', titleEn: 'Heart Rate' },
    { type: 'dizziness', icon: '💫', titleTr: 'Baş Dönmesi', titleEn: 'Dizziness' },
    { type: 'nausea', icon: '🤢', titleTr: 'Bulantı', titleEn: 'Nausea' },
    { type: 'headache', icon: '🤕', titleTr: 'Baş Ağrısı', titleEn: 'Headache' },
    { type: 'stomach_pain', icon: '😣', titleTr: 'Mide Ağrısı', titleEn: 'Stomach Pain' },
    { type: 'fatigue', icon: '🥱', titleTr: 'Halsizlik', titleEn: 'Fatigue' },
  ];

  const handleSave = () => {
    addSymptomLog({
      type: selectedType,
      medicineId,
      medicineName,
      systolic: selectedType === 'blood_pressure' ? parseInt(systolic, 10) || undefined : undefined,
      diastolic:
        selectedType === 'blood_pressure' ? parseInt(diastolic, 10) || undefined : undefined,
      pulse:
        selectedType === 'blood_pressure' || selectedType === 'heart_rate'
          ? parseInt(pulse, 10) || undefined
          : undefined,
      glucose: selectedType === 'blood_sugar' ? parseInt(glucose, 10) || undefined : undefined,
      severity:
        selectedType !== 'blood_pressure' &&
        selectedType !== 'blood_sugar' &&
        selectedType !== 'heart_rate'
          ? severity
          : undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
    setNotes('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.headerIcon}>📊</Text>
              <Text style={[styles.title, { color: colors.text }]}>
                {language === 'tr' ? 'Vital & Semptom Kaydı' : 'Log Vital & Symptom'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {medicineName && (
            <View style={styles.medBadge}>
              <Text style={styles.medBadgeText}>💊 {medicineName}</Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {SYMPTOM_OPTIONS.map(opt => {
              const isSelected = selectedType === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedType(opt.type)}
                >
                  <Text style={styles.typeIcon}>{opt.icon}</Text>
                  <Text style={[styles.typeLabel, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                    {language === 'tr' ? opt.titleTr : opt.titleEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Form Alanları */}
          {selectedType === 'blood_pressure' && (
            <View style={styles.rowInputs}>
              <View style={styles.inputCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Büyük (Sistolik)
                </Text>
                <TextInput
                  style={[
                    styles.numericInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="numeric"
                  value={systolic}
                  onChangeText={setSystolic}
                />
              </View>
              <Text style={[styles.slash, { color: colors.textSecondary }]}>/</Text>
              <View style={styles.inputCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Küçük (Diyastolik)
                </Text>
                <TextInput
                  style={[
                    styles.numericInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="numeric"
                  value={diastolic}
                  onChangeText={setDiastolic}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nabız</Text>
                <TextInput
                  style={[
                    styles.numericInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="numeric"
                  value={pulse}
                  onChangeText={setPulse}
                />
              </View>
            </View>
          )}

          {selectedType === 'blood_sugar' && (
            <View style={styles.singleCol}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Kan Şekeri (mg/dL)
              </Text>
              <TextInput
                style={[
                  styles.numericInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                keyboardType="numeric"
                value={glucose}
                onChangeText={setGlucose}
              />
            </View>
          )}

          {selectedType !== 'blood_pressure' &&
            selectedType !== 'blood_sugar' &&
            selectedType !== 'heart_rate' && (
              <View style={styles.severityRow}>
                {(['mild', 'moderate', 'severe'] as const).map(sev => (
                  <TouchableOpacity
                    key={sev}
                    style={[
                      styles.sevChip,
                      {
                        backgroundColor:
                          severity === sev
                            ? sev === 'severe'
                              ? '#DC2626'
                              : sev === 'moderate'
                                ? '#D97706'
                                : '#059669'
                            : colors.background,
                      },
                    ]}
                    onPress={() => setSeverity(sev)}
                  >
                    <Text
                      style={[
                        styles.sevText,
                        { color: severity === sev ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {sev === 'mild' ? 'Hafif' : sev === 'moderate' ? 'Orta' : 'Şiddetli'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={
              language === 'tr'
                ? 'Ek not veya doktorunuza iletilecek açıklama...'
                : 'Notes for your physician...'
            }
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {language === 'tr' ? 'Kaydet & Günlüğe Ekle' : 'Save & Log'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  medBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  medBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  typeScroll: {
    marginBottom: 14,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  typeIcon: {
    marginRight: 6,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  singleCol: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  numericInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
  slash: {
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 6,
    marginTop: 16,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sevChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  sevText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginBottom: 14,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
