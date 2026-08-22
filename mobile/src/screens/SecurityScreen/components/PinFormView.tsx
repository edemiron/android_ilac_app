/**
 * PinFormView — PIN oluşturma / değiştirme / silme formu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { PinMode } from '../hooks/useSecurityController';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PinFormViewProps {
  pinMode: PinMode;
  onBack: () => void;
  pin: string;
  onChangePin: (text: string) => void;
  confirmPin: string;
  onChangeConfirmPin: (text: string) => void;
  oldPin: string;
  onChangeOldPin: (text: string) => void;
  showPin: boolean;
  onToggleShowPin: () => void;
  hasPin: boolean;
  onSave: () => void;
  onRemovePin: () => void;
  colors: ThemeColors;
  language: string;
}

export function PinFormView({
  pinMode,
  onBack,
  pin,
  onChangePin,
  confirmPin,
  onChangeConfirmPin,
  oldPin,
  onChangeOldPin,
  showPin,
  onToggleShowPin,
  hasPin,
  onSave,
  onRemovePin,
  colors,
  language,
}: PinFormViewProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.pinHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.pinTitle, { color: colors.text }]}>
          {pinMode === 'create' && (language === 'tr' ? '🔢 PIN Ayarla' : '🔢 Set PIN')}
          {pinMode === 'change' && (language === 'tr' ? '🔢 PIN Değiştir' : '🔢 Change PIN')}
        </Text>
      </View>

      <View style={[styles.pinCard, { backgroundColor: colors.card }]}>
        {pinMode === 'change' && (
          <View style={styles.pinInputContainer}>
            <Text style={[styles.pinLabel, { color: colors.text }]}>
              {language === 'tr' ? 'Mevcut PIN' : 'Current PIN'}
            </Text>
            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                },
              ]}
              value={oldPin}
              onChangeText={t => onChangeOldPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              secureTextEntry={!showPin}
              maxLength={6}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}

        <View style={styles.pinInputContainer}>
          <Text style={[styles.pinLabel, { color: colors.text }]}>
            {pinMode === 'change'
              ? language === 'tr'
                ? 'Yeni PIN'
                : 'New PIN'
              : language === 'tr'
                ? 'PIN'
                : 'PIN'}
          </Text>
          <TextInput
            style={[
              styles.pinInput,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
              },
            ]}
            value={pin}
            onChangeText={t => onChangePin(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry={!showPin}
            maxLength={6}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.pinInputContainer}>
          <Text style={[styles.pinLabel, { color: colors.text }]}>
            {language === 'tr' ? 'PIN Tekrar' : 'Confirm PIN'}
          </Text>
          <TextInput
            style={[
              styles.pinInput,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
              },
            ]}
            value={confirmPin}
            onChangeText={t => onChangeConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry={!showPin}
            maxLength={6}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <TouchableOpacity style={styles.showPinButton} onPress={onToggleShowPin}>
          <Text style={{ color: colors.primary }}>
            {showPin
              ? language === 'tr'
                ? '🙈 Gizle'
                : '🙈 Hide'
              : language === 'tr'
                ? '👁️ Göster'
                : '👁️ Show'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={onSave}
      >
        <Text style={[styles.saveButtonText, { color: colors.textOnPrimary }]}>
          {language === 'tr' ? 'Kaydet' : 'Save'}
        </Text>
      </TouchableOpacity>

      {hasPin && pinMode !== 'create' && (
        <TouchableOpacity
          style={[styles.removeButton, { borderColor: colors.error }]}
          onPress={onRemovePin}
        >
          <Text style={{ color: colors.error }}>
            {language === 'tr' ? '🗑️ PIN Kaldır' : '🗑️ Remove PIN'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  pinCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
  },
  pinInputContainer: {
    marginBottom: 16,
  },
  pinLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  pinInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
  },
  showPinButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});
