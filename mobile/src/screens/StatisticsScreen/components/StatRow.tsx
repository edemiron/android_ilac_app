/**
 * StatisticsScreen — StatRow bileşeni.
 *
 * Sprint 6.1: Tek istatistik satiri (icon + label + value).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../../../contexts/ThemeContext';

interface StatRowProps {
  icon: string;
  iconBg: string;
  label: string;
  value: string | number;
  valueColor?: string;
  colors: ThemeColors;
  isFirst?: boolean;
}

export const StatRow: React.FC<StatRowProps> = ({
  icon,
  iconBg,
  label,
  value,
  valueColor,
  colors,
  isFirst,
}) => (
  <View
    style={[
      styles.statRow,
      !isFirst && {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.divider,
      },
    ]}
  >
    <View style={styles.statInfo}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Text style={styles.iconEmoji}>{icon}</Text>
      </View>
      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
    </View>
    <Text style={[styles.statValue, { color: valueColor || colors.primary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
