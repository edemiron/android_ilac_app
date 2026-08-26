/**
 * PremiumHeader — Taç İkonu ve Başlıklar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PremiumHeaderProps {
  colors: ThemeColors;
  language: string;
}

export function PremiumHeader({ colors, language }: PremiumHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.crownIcon}>👑</Text>
      <Text style={[styles.title, { color: colors.text }]}>Premium</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {language === 'tr'
          ? 'Sınırsız ilaç takibi ve daha fazlası'
          : 'Unlimited medicine tracking and more'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  crownIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
