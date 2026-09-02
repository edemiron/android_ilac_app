/**
 * AddPrescriptionModal — Yeni Reçete Ekleme ve Düzenleme Modalı
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { Prescription, PrescriptionInput } from '../../../types/prescription';
import type { Medicine } from '../../../types';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface AddPrescriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (prescriptionData: PrescriptionInput, editingId?: string) => Promise<void>;
  editingPrescription?: Prescription | null;
  allMedicines: Medicine[];
  colors: ThemeColors;
  isDark: boolean;
  isTr: boolean;
}

export function AddPrescriptionModal({
  visible,
  onClose,
  onSave,
  editingPrescription,
  allMedicines,
  colors,
  isDark,
  isTr,
}: AddPrescriptionModalProps) {
  const [title, setTitle] = useState('');
  const [prescriptionCode, setPrescriptionCode] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [prescribedDate, setPrescribedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal açıldığında veya düzenleme durumunda form alanlarını doldur
  useEffect(() => {
    if (editingPrescription) {
      setTitle(editingPrescription.title);
      setPrescriptionCode(editingPrescription.prescriptionCode || '');
      setDoctorName(editingPrescription.doctorName || '');
      setHospitalName(editingPrescription.hospitalName || '');
      setPrescribedDate(editingPrescription.prescribedDate);
      setExpiryDate(editingPrescription.expiryDate);
      setSelectedMedicineIds(editingPrescription.medicineIds || []);
      setNotes(editingPrescription.notes || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      setTitle('');
      setPrescriptionCode('');
      setDoctorName('');
      setHospitalName('');
      setPrescribedDate(today);
      setExpiryDate(nextMonthStr);
      setSelectedMedicineIds([]);
      setNotes('');
    }
  }, [editingPrescription, visible]);

  const toggleMedicineSelection = (id: string) => {
    setSelectedMedicineIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const setQuickExpiry = (months: number) => {
    const base = prescribedDate ? new Date(prescribedDate) : new Date();
    base.setMonth(base.getMonth() + months);
    setExpiryDate(base.toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        isTr ? 'Lütfen reçete başlığı girin.' : 'Please enter a prescription title.'
      );
      return;
    }
    if (!expiryDate.trim()) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        isTr ? 'Lütfen reçete bitiş tarihi girin.' : 'Please enter an expiry date.'
      );
      return;
    }

    try {
      setSaving(true);
      const payload: PrescriptionInput = {
        title: title.trim(),
        prescriptionCode: prescriptionCode.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        hospitalName: hospitalName.trim() || undefined,
        prescribedDate: prescribedDate.trim() || new Date().toISOString().split('T')[0],
        expiryDate: expiryDate.trim(),
        medicineIds: selectedMedicineIds,
        notes: notes.trim() || undefined,
        reminderDaysBefore: [3, 1],
        isActive: true,
      };

      await onSave(payload, editingPrescription?.id);
      onClose();
    } catch (err) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        isTr ? 'Reçete kaydedilemedi.' : 'Could not save prescription.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingPrescription
                ? isTr
                  ? 'Reçeteyi Düzenle'
                  : 'Edit Prescription'
                : isTr
                  ? '🩺 Yeni Reçete Ekle'
                  : '🩺 Add Prescription'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Reçete Başlığı */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {isTr ? 'Reçete Tanımı *' : 'Prescription Title *'}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    color: colors.text,
                  },
                ]}
                placeholder={isTr ? 'Örn: Kardiyoloji Tedavi Reçetesi' : 'e.g. Cardiology Routine'}
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* E-Reçete No */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {isTr ? 'E-Reçete Kodu (Opsiyonel)' : 'Prescription Code (Optional)'}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    color: colors.text,
                  },
                ]}
                placeholder={isTr ? 'Örn: E-REC-739201' : 'e.g. E-REC-739201'}
                placeholderTextColor={colors.textMuted}
                value={prescriptionCode}
                onChangeText={setPrescriptionCode}
                autoCapitalize="characters"
              />
            </View>

            {/* Doktor & Hastane */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {isTr ? 'Doktor Adı' : 'Doctor Name'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      color: colors.text,
                    },
                  ]}
                  placeholder={isTr ? 'Dr. Adı Soyadı' : 'Dr. Name'}
                  placeholderTextColor={colors.textMuted}
                  value={doctorName}
                  onChangeText={setDoctorName}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {isTr ? 'Hastane / Klinik' : 'Hospital'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      color: colors.text,
                    },
                  ]}
                  placeholder={isTr ? 'Sağlık Merkezi' : 'Clinic'}
                  placeholderTextColor={colors.textMuted}
                  value={hospitalName}
                  onChangeText={setHospitalName}
                />
              </View>
            </View>

            {/* Tarihler */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {isTr ? 'Veriliş Tarihi' : 'Prescribed Date'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      color: colors.text,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={prescribedDate}
                  onChangeText={setPrescribedDate}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {isTr ? 'Bitiş Tarihi *' : 'Expiry Date *'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      color: colors.text,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                />
              </View>
            </View>

            {/* Hızlı Bitiş Tarihi Butonları */}
            <View style={styles.quickDateRow}>
              <Text style={[styles.quickDateLabel, { color: colors.textMuted }]}>
                {isTr ? 'Hızlı Süre:' : 'Quick Expiry:'}
              </Text>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                onPress={() => setQuickExpiry(1)}
              >
                <Text style={[styles.quickDateText, { color: colors.primary }]}>+1 Ay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                onPress={() => setQuickExpiry(3)}
              >
                <Text style={[styles.quickDateText, { color: colors.primary }]}>+3 Ay (Rapor)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                onPress={() => setQuickExpiry(6)}
              >
                <Text style={[styles.quickDateText, { color: colors.primary }]}>+6 Ay</Text>
              </TouchableOpacity>
            </View>

            {/* İlaç Seçimi */}
            {allMedicines.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {isTr ? 'Reçeteye Dahil İlaçlar:' : 'Select Medicines for Prescription:'}
                </Text>
                <View style={styles.medicineList}>
                  {allMedicines.map(med => {
                    const isSelected = selectedMedicineIds.includes(med.id);
                    return (
                      <TouchableOpacity
                        key={med.id}
                        style={[
                          styles.medicineSelectRow,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(15, 118, 110, 0.25)'
                                : '#CCFBF1'
                              : isDark
                                ? '#1E293B'
                                : '#F8FAFC',
                            borderColor: isSelected ? '#0F766E' : isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                        onPress={() => toggleMedicineSelection(med.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={isSelected ? '#0F766E' : colors.textMuted}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.medNameText, { color: colors.text }]}>
                          {med.name} {med.dosage ? `(${med.dosage})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Notlar */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {isTr ? 'Notlar / Doktor Tavsiyesi' : 'Notes / Instructions'}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    color: colors.text,
                  },
                ]}
                placeholder={
                  isTr ? 'Örn: Yemeklerden sonra tok karnına alınacak.' : 'Special notes...'
                }
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveBtnText}>
                {saving
                  ? isTr
                    ? 'Kaydediliyor...'
                    : 'Saving...'
                  : isTr
                    ? 'Reçeteyi Kaydet'
                    : 'Save Prescription'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  quickDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  quickDateLabel: {
    fontSize: 12,
  },
  quickDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medicineList: {
    gap: 6,
  },
  medicineSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  medNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
