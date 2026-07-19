/**
 * StatTile — Sprint 58.5.
 *
 * MD3 "Filled Card" küçük istatistik tile'ı. Layout B stat tiles row için.
 * 3'lü grid: Bugün / Alınan / Kalan.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type StatTileAccent = 'primary' | 'success' | 'warning';

interface StatTileProps {
  value: number | string;
  label: string;
  accent?: StatTileAccent;
  accessibilityLabel?: string;
}

export function StatTile({ value, label, accent = 'primary', accessibilityLabel }: StatTileProps) {
  const { colors, isDark } = useTheme();

  // MD3 Filled tonal — accent variant
  const accentMap: Record<StatTileAccent, { bg: string; text: string; iconBg: string }> = {
    primary: {
      bg: isDark ? colors.primaryContainer : '#CCFBF1',
      text: colors.primary,
      iconBg: isDark ? '#1F2A4D' : '#99F6E4',
    },
    success: {
      bg: isDark ? '#0B3D2E' : '#D1FAE5',
      text: colors.success,
      iconBg: isDark ? '#065F46' : '#A7F3D0',
    },
    warning: {
      bg: isDark ? '#3B2A0A' : '#FEF3C7',
      text: colors.warning,
      iconBg: isDark ? '#78350F' : '#FDE68A',
    },
  };
  const a = accentMap[accent];

  return (
    <View
      style={[styles.tile, { backgroundColor: a.bg }]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
    >
      <Text style={[styles.value, { color: a.text }]}>{value}</Text>
      <Text style={[styles.label, { color: a.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
    opacity: 0.85,
  },
});
