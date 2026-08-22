/**
 * PermissionsHeader — Ekran Üst Başlık & Açıklama
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { withAlpha, ALPHA } from '../../../utils/colors';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PermissionsHeaderProps {
  colors: ThemeColors;
  language: string;
}

export function PermissionsHeader({ colors, language }: PermissionsHeaderProps) {
  return (
    <View style={styles.header}>
      <View
        style={[styles.iconContainer, { backgroundColor: withAlpha(colors.primary, ALPHA.fill) }]}
      >
        <Ionicons name="notifications" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        {language === 'tr' ? 'İzinler Gerekli' : 'Permissions Required'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {language === 'tr'
          ? 'İlaç hatırlatmalarının düzgün çalışması için aşağıdaki izinlere ihtiyacımız var.'
          : 'We need the following permissions for medication reminders to work properly.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
