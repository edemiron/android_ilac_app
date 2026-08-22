/**
 * AlarmMedicineCard — Pulse animasyonlu ilaç kartı, dozaj ve kullanım talimatı rozeti
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { Medicine } from '../../../types';
import type { TranslationKey } from '../../../contexts/LanguageContext';

interface AlarmMedicineCardProps {
  medicine: Medicine;
  pulseAnim: Animated.Value;
  instructionDisplayText: string | null;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export function AlarmMedicineCard({
  medicine,
  pulseAnim,
  instructionDisplayText,
  t,
}: AlarmMedicineCardProps) {
  return (
    <View style={styles.medicineSection}>
      <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.medicineIcon}>💊</Text>
      </Animated.View>

      <Text style={styles.alarmTitle}>{t('alarm_time_to_take')}</Text>
      <Text style={styles.medicineName}>{medicine.name}</Text>
      <Text style={styles.dosageText}>{medicine.dosage}</Text>

      {instructionDisplayText && (
        <View style={styles.instructionBadge}>
          <Text style={styles.instructionText}>{instructionDisplayText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  medicineSection: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  medicineIcon: {
    fontSize: 60,
  },
  alarmTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  medicineName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  dosageText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
  },
  instructionBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
