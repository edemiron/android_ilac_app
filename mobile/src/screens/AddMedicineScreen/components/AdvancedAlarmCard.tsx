/**
 * AdvancedAlarmCard — Gelişmiş Alarm ve Titreşim Ayarları Kartı
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { AddMedicineFormState } from '../../../types/addMedicine.types';
import { AdvancedSettingsSection } from '../../../components/addMedicine';

interface AdvancedAlarmCardProps {
  formState: AddMedicineFormState;
  onVibrationPatternChange: (pattern: 'default' | 'heartbeat' | 'urgent' | 'soft') => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function AdvancedAlarmCard({
  formState,
  onVibrationPatternChange,
  colors,
  language,
}: AdvancedAlarmCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AdvancedSettingsSection
        formState={formState}
        onVibrationPatternChange={onVibrationPatternChange}
        label={language === 'tr' ? 'Gelişmiş Alarm Ayarları' : 'Advanced Alarm Settings'}
        colors={colors}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    paddingTop: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
});
