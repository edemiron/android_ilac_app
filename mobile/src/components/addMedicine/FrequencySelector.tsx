import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FREQUENCY_OPTIONS, MAX_FREQUENCY, MIN_FREQUENCY } from '../../types/addMedicine.types';
import { ThemeColors } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  value: number;
  onSelect: (frequency: number) => void;
  /** Otomatik saat önerisi - sıklık seçilince tetiklenir */
  onAutoTimes?: (times: string[]) => void;
  label: string;
  colors: ThemeColors;
}

export function FrequencySelector({ value, onSelect, onAutoTimes, label, colors }: Props) {
  const { t } = useLanguage();
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState('');

  const styles = createStyles(colors);

  // 08:00 - 21:00 arasına frekansa göre eşit aralıklı saatler üret
  const getAutoTimes = (count: number): string[] => {
    if (count <= 0) return [];
    const startMinutes = 8 * 60;   // 08:00
    const endMinutes = 21 * 60;  // 21:00
    const step = count === 1 ? 0 : (endMinutes - startMinutes) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const totalMins = Math.round(startMinutes + step * i);
      const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
      const m = (totalMins % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    });
  };

  const isCustomValue = value > 6;

  const handleCustomPress = () => {
    setCustomValue(isCustomValue ? String(value) : '7');
    setCustomError('');
    setShowCustomModal(true);
  };

  const handleCustomConfirm = () => {
    const numValue = parseInt(customValue, 10);

    if (isNaN(numValue) || numValue < MIN_FREQUENCY || numValue > MAX_FREQUENCY) {
      setCustomError(t('frequency_range_error'));
      return;
    }

    onSelect(numValue);
    if (onAutoTimes) onAutoTimes(getAutoTimes(numValue));
    setShowCustomModal(false);
    setCustomValue('');
    setCustomError('');
  };

  const handleCustomCancel = () => {
    setShowCustomModal(false);
    setCustomValue('');
    setCustomError('');
  };

  const handleCustomValueChange = (text: string) => {
    // Sadece rakam kabul et
    const numericText = text.replace(/[^0-9]/g, '');
    setCustomValue(numericText);
    setCustomError('');
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.frequencyContainer}>
        {FREQUENCY_OPTIONS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.frequencyButton, value === f && styles.frequencyButtonActive]}
            onPress={() => {
              onSelect(f);
              if (onAutoTimes) onAutoTimes(getAutoTimes(f));
            }}
            testID={`frequency-button-${f}`}
          >
            <Text style={[styles.frequencyText, value === f && styles.frequencyTextActive]}>
              {f}x
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.frequencyButton,
            styles.customButton,
            isCustomValue && styles.frequencyButtonActive,
          ]}
          onPress={handleCustomPress}
          testID="frequency-button-custom"
        >
          <Text style={[styles.frequencyText, isCustomValue && styles.frequencyTextActive]}>
            {isCustomValue ? `${value}x` : t('custom')}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={handleCustomCancel}
        testID="custom-frequency-modal"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('custom_frequency_title')}</Text>

            <TextInput
              style={[styles.modalInput, customError ? styles.modalInputError : null]}
              value={customValue}
              onChangeText={handleCustomValueChange}
              keyboardType="number-pad"
              placeholder={t('custom_frequency_placeholder')}
              placeholderTextColor={colors.textSecondary}
              maxLength={2}
              autoFocus
              testID="custom-frequency-input"
            />

            {customError ? (
              <Text style={styles.errorText} testID="custom-frequency-error">
                {customError}
              </Text>
            ) : (
              <Text style={styles.hintText}>
                {MIN_FREQUENCY}-{MAX_FREQUENCY}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCustomCancel}
                testID="custom-frequency-cancel"
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCustomConfirm}
                testID="custom-frequency-confirm"
              >
                <Text style={styles.confirmButtonText}>{t('ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    inputGroup: {
      marginTop: 20,
      zIndex: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    frequencyContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    frequencyButton: {
      minWidth: 48,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    customButton: {
      flex: 1,
      minWidth: 60,
    },
    frequencyButtonActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    frequencyText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    frequencyTextActive: {
      color: colors.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '80%',
      maxWidth: 300,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    modalInput: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    modalInputError: {
      borderColor: colors.error,
    },
    hintText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 8,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      width: '100%',
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    confirmButton: {
      backgroundColor: colors.primary,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
