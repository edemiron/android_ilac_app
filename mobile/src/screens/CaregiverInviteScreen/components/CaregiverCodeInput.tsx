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
  const digits = code.toUpperCase().split('');
  const boxes = [];

  for (let i = 0; i < 6; i++) {
    const isFilled = i < digits.length;
    const isCurrent = i === digits.length;
    boxes.push(
      <View
        key={i}
        style={[
          styles.codeBox,
          {
            backgroundColor: isFilled ? colors.primary + '15' : colors.card,
            borderColor: isCurrent ? colors.primary : isFilled ? colors.primary : colors.border,
            borderWidth: isCurrent || isFilled ? 2 : 1.5,
          },
        ]}
      >
        <Text style={[styles.codeBoxText, { color: colors.text }]}>
          {isFilled ? digits[i] : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* 6 Visual Boxes */}
      <View style={styles.codeDisplay}>{boxes}</View>

      {/* Hidden Invisible Overlay Input */}
      <TextInput
        style={styles.hiddenInput}
        value={code}
        onChangeText={text => onChangeCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        maxLength={6}
        autoFocus
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="default"
        caretHidden
      />

      {/* QR & Clear Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.qrButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={onScan}
          activeOpacity={0.75}
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
          <Text style={[styles.qrButtonText, { color: colors.text }]}>QR Kod Tara</Text>
        </TouchableOpacity>

        {code.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={onClear} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            <Text style={[styles.clearButtonText, { color: colors.textMuted }]}>{clearText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  codeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  codeBox: {
    width: 48,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxText: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    height: 60,
    opacity: 0.01,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 18,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
