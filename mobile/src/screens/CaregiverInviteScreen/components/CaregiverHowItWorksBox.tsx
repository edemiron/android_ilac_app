/**
 * CaregiverHowItWorksBox — "Nasıl Çalışır?" Bilgilendirme Kutusu
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverHowItWorksBoxProps {
  title: string;
  text: string;
  colors: ThemeColors;
}

export function CaregiverHowItWorksBox({ title, text, colors }: CaregiverHowItWorksBoxProps) {
  return (
    <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
      <Text style={[styles.infoTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.infoText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    borderRadius: 16,
    padding: 16,
    marginTop: 32,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
