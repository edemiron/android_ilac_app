/**
 * CaregiverCodeInput — Kod Giriş Alanı, QR Tarama ve Temizle Butonu
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverCodeInputProps {
  code: string;
  onChangeCode: (text: string) => void;
  onScan: () => void;
  onClear: () => void;
  clearText: string;
  colors: ThemeColors;
}

export function CaregiverCodeInput({
  code,
  onChangeCode,
  onScan,
  onClear,
  clearText,
  colors,
}: CaregiverCodeInputProps) {
  return (
    <>
      <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={code}
          onChangeText={onChangeCode}
          placeholder=""
          maxLength={6}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          textAlign="center"
        />
        <TouchableOpacity style={styles.scanButton} onPress={onScan} activeOpacity={0.7}>
          <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {code.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={onClear} activeOpacity={0.7}>
          <Text style={[styles.clearButtonText, { color: colors.primary }]}>{clearText}</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scanButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    alignSelf: 'center',
    padding: 12,
  },
  clearButtonText: {
    fontSize: 14,
  },
});
