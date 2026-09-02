import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { Medicine } from '../../../types';
import type { TranslationKey } from '../../../contexts/LanguageContext';
import {
  detectFoodInteractions,
  FOOD_INTERACTION_DETAILS,
} from '../../../utils/clinicalSafetyEngine';

interface AlarmMedicineCardProps {
  medicine: Medicine;
  pulseAnim: Animated.Value;
  instructionDisplayText: string | null;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  onOpenMissedDoseGuide?: () => void;
}

export function AlarmMedicineCard({
  medicine,
  pulseAnim,
  instructionDisplayText,
  t,
  onOpenMissedDoseGuide,
}: AlarmMedicineCardProps) {
  const foodInteractions =
    medicine.foodInteractions ||
    detectFoodInteractions(medicine.name, medicine.activeIngredients, medicine.category);

  return (
    <View style={styles.medicineSection}>
      <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.medicineIcon}>💊</Text>
      </Animated.View>

      <Text style={styles.alarmTitle}>{t('alarm_time_to_take')}</Text>
      <Text style={styles.medicineName}>{medicine.name}</Text>
      <Text style={styles.dosageText}>{medicine.dosage}</Text>

      {/* Hayati / Kritik İlaç Rozeti */}
      {medicine.isCritical && (
        <View style={styles.criticalBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.criticalBadgeText}>🚨 Hayati İlaç — Israrlı Alarm</Text>
        </View>
      )}

      <View style={styles.badgesWrapper}>
        {instructionDisplayText && (
          <View style={styles.instructionBadge}>
            <Text style={styles.instructionText}>{instructionDisplayText}</Text>
          </View>
        )}

        {/* Gıda & Kullanım Rozetleri */}
        {foodInteractions.map(type => {
          const info = FOOD_INTERACTION_DETAILS[type];
          if (!info) return null;
          return (
            <View key={type} style={styles.foodBadge}>
              <Text style={styles.foodBadgeText}>
                {info.icon} {info.titleTr}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Kaçırılan Doz Klinik Rehberlik Butonu */}
      {onOpenMissedDoseGuide && (
        <TouchableOpacity
          style={styles.missedDoseButton}
          onPress={onOpenMissedDoseGuide}
          activeOpacity={0.8}
        >
          <Ionicons
            name="help-circle-outline"
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.missedDoseButtonText}>Geç mi Kaldım? Ne Yapmalıyım?</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  foodBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  foodBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  missedDoseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  missedDoseButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  criticalBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
