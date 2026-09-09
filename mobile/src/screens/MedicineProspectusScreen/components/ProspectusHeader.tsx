/**
 * ProspectusHeader — İlaç Adı, Dozajı ve Bilgilendirme Başlığı
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface ProspectusHeaderProps {
  medicineName: string;
  dosage?: string;
  colors: ThemeColors;
  language: string;
}

export function ProspectusHeader({
  medicineName,
  dosage,
  colors,
  language,
}: ProspectusHeaderProps) {
  return (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <Text style={[styles.medicineName, { color: colors.text }]}>{medicineName}</Text>
      {dosage ? <Text style={[styles.dosage, { color: colors.primary }]}>{dosage}</Text> : null}
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        {language === 'tr'
          ? 'Bu bilgiler bilgilendirme amaçlıdır. Doktorunuza danışınız.'
          : 'This information is for informational purposes only. Consult your doctor.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dosage: {
    fontSize: 16,
    marginTop: 4,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
