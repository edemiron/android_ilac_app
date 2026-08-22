/**
 * CaregiverCodeBoxes — 6 Haneli Davet Kodu Kutu Görünümü
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverCodeBoxesProps {
  code: string;
  colors: ThemeColors;
}

export function CaregiverCodeBoxes({ code, colors }: CaregiverCodeBoxesProps) {
  const digits = code.toUpperCase().split('');
  const boxes = [];

  for (let i = 0; i < 6; i++) {
    const isFilled = i < digits.length;
    boxes.push(
      <View
        key={i}
        style={[
          styles.codeBox,
          {
            backgroundColor: isFilled ? colors.primary + '10' : colors.card,
            borderColor: isFilled ? colors.primary : colors.border,
          },
        ]}
      >
        <Text style={[styles.codeBoxText, { color: colors.text }]}>
          {isFilled ? digits[i] : ''}
        </Text>
      </View>
    );
  }

  return <View style={styles.codeDisplay}>{boxes}</View>;
}

const styles = StyleSheet.create({
  codeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  codeBoxText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
