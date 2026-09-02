/**
 * DuplicateTherapyBanner.tsx — Mükerrer Tedavi & Çift Doz Uyarı Kalkanı (Sprint 104)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DuplicateTherapyWarning } from '../../utils/clinicalSafetyEngine';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface DuplicateTherapyBannerProps {
  warning: DuplicateTherapyWarning | null;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function DuplicateTherapyBanner({ warning, colors, language }: DuplicateTherapyBannerProps) {
  if (!warning) return null;

  return (
    <View style={[styles.container, { backgroundColor: '#FEF2F2', borderColor: '#F87171' }]}>
      <View style={styles.header}>
        <Ionicons name="warning" size={18} color="#DC2626" style={{ marginRight: 6 }} />
        <Text style={styles.title}>
          {language === 'tr'
            ? `Mükerrer Etken Madde Uyarısı: ${warning.duplicateIngredient}`
            : `Duplicate Ingredient Alert: ${warning.duplicateIngredient}`}
        </Text>
      </View>
      <Text style={styles.message}>
        {language === 'tr' ? warning.warningMessageTr : warning.warningMessageEn}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    flex: 1,
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7F1D1D',
  },
});
