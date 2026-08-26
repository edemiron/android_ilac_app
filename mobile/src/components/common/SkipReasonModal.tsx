import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export interface SkipReasonOption {
  key: string;
  icon: string;
  labelTr: string;
  labelEn: string;
}

export const SKIP_REASONS: SkipReasonOption[] = [
  {
    key: 'side_effect',
    icon: 'warning-outline',
    labelTr: 'Yan etki yaptı / Rahatsız etti',
    labelEn: 'Caused side effects / Discomfort',
  },
  {
    key: 'out_of_stock',
    icon: 'cube-outline',
    labelTr: 'İlacım bitti / Yanımda yok',
    labelEn: 'Out of stock / Not with me',
  },
  {
    key: 'felt_better',
    icon: 'happy-outline',
    labelTr: 'Kendimi iyi hissediyorum',
    labelEn: 'Feeling better / No need',
  },
  {
    key: 'doctor_advised',
    icon: 'medical-outline',
    labelTr: 'Doktor / Eczacı önerisi ile',
    labelEn: 'Doctor / Pharmacist advised',
  },
  {
    key: 'forgot',
    icon: 'time-outline',
    labelTr: 'Zamanı çok geçti / Unuttum',
    labelEn: 'Too late / Missed window',
  },
  {
    key: 'other',
    icon: 'ellipsis-horizontal-circle-outline',
    labelTr: 'Diğer / Açıklama ekle',
    labelEn: 'Other / Custom reason',
  },
];

interface SkipReasonModalProps {
  visible: boolean;
  medicineName?: string;
  onConfirm: (reason: string, customNote?: string) => void;
  onCancel: () => void;
}

export function SkipReasonModal({
  visible,
  medicineName,
  onConfirm,
  onCancel,
}: SkipReasonModalProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const [selectedReason, setSelectedReason] = useState<string>('side_effect');
  const [customNote, setCustomNote] = useState<string>('');

  const isTr = language === 'tr';

  const handleConfirm = () => {
    onConfirm(selectedReason, customNote.trim() || undefined);
    setCustomNote('');
  };

  const handleCancel = () => {
    setCustomNote('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View
          style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#332020' : '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
            </View>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isTr ? 'İlacı Atlama Nedeni' : 'Reason for Skipping'}
              </Text>
              {medicineName && (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {medicineName}
                </Text>
              )}
            </View>
          </View>

          <Text style={[styles.promptText, { color: colors.textSecondary }]}>
            {isTr
              ? 'Doktor raporunuz ve uyum takibiniz için lütfen atlama nedenini belirtin:'
              : 'Please select a reason for your doctor report and adherence record:'}
          </Text>

          {/* Reason Options List */}
          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {SKIP_REASONS.map(option => {
              const isSelected = selectedReason === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.7}
                  onPress={() => setSelectedReason(option.key)}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? '#1E293B'
                          : '#EFF6FF'
                        : isDark
                          ? '#181E2A'
                          : '#F8FAFC',
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                    style={styles.optionIcon}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {isTr ? option.labelTr : option.labelEn}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Custom Note input if other or specific reason */}
            {selectedReason === 'other' && (
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={isTr ? 'Açıklamanız (opsiyonel)...' : 'Explanation (optional)...'}
                placeholderTextColor={colors.textSecondary}
                value={customNote}
                onChangeText={setCustomNote}
                maxLength={120}
              />
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCancel}
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                {isTr ? 'Vazgeç' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleConfirm}
              style={[styles.button, styles.confirmButton, { backgroundColor: '#EF4444' }]}
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                {isTr ? 'Atla ve Kaydet' : 'Skip & Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  optionsList: {
    maxHeight: 260,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionIcon: {
    marginRight: 10,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
  },
  checkIcon: {
    marginLeft: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
});
