/**
 * MedicineEmptyState — İlaç listesi boş durum ve başlangıç rehberi
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Section } from './Section';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface MedicineEmptyStateProps {
  onAddMedicine: () => void;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function MedicineEmptyState({
  onAddMedicine,
  colors,
  isDark,
  language,
}: MedicineEmptyStateProps) {
  return (
    <View style={styles.emptyStateContainer}>
      <Section
        icon="💊"
        title={language === 'tr' ? 'İLAÇLARIM' : 'MY MEDICINES'}
        colors={colors}
        isDark={isDark}
      >
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="medkit" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {language === 'tr' ? 'İlk ilacını ekle' : 'Add your first medicine'}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            {language === 'tr'
              ? 'İlacını ekle, hatırlatma planla, sağlığını takip et'
              : 'Add medicine, schedule reminders, track health'}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={onAddMedicine}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>
              {language === 'tr' ? 'İlaç Ekle' : 'Add Medicine'}
            </Text>
          </TouchableOpacity>
        </View>
      </Section>

      <Section
        icon="❓"
        title={language === 'tr' ? 'NASIL BAŞLARIM' : 'HOW TO START'}
        colors={colors}
        isDark={isDark}
      >
        <View style={styles.tipRow}>
          <View style={[styles.tipBullet, { backgroundColor: colors.primary }]}>
            <Text style={styles.tipBulletText}>1</Text>
          </View>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Yukarıdaki butona tıklayın' : 'Tap the button above'}
          </Text>
        </View>
        <View
          style={[
            styles.tipRow,
            { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
          ]}
        >
          <View style={[styles.tipBullet, { backgroundColor: colors.primary }]}>
            <Text style={styles.tipBulletText}>2</Text>
          </View>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            {language === 'tr'
              ? 'İlaç bilgilerini girin veya barkod tarayın'
              : 'Enter medicine info or scan barcode'}
          </Text>
        </View>
        <View
          style={[
            styles.tipRow,
            { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
          ]}
        >
          <View style={[styles.tipBullet, { backgroundColor: colors.primary }]}>
            <Text style={styles.tipBulletText}>3</Text>
          </View>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Hatırlatma saatlerini ayarlayın' : 'Set reminder times'}
          </Text>
        </View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipBulletText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
