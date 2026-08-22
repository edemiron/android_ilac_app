/**
 * PermissionsInfoBox — Bilgilendirme ve Güvenlik Kutusu
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { withAlpha, ALPHA } from '../../../utils/colors';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PermissionsInfoBoxProps {
  colors: ThemeColors;
  language: string;
}

export function PermissionsInfoBox({ colors, language }: PermissionsInfoBoxProps) {
  return (
    <View style={[styles.infoBox, { backgroundColor: withAlpha(colors.primary, ALPHA.tint) }]}>
      <Ionicons name="information-circle" size={20} color={colors.primary} />
      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
        {language === 'tr'
          ? 'Bu izinler sadece ilaç hatırlatmaları için kullanılır. Verileriniz güvende.'
          : 'These permissions are only used for medication reminders. Your data is safe.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 12,
    lineHeight: 18,
  },
});
