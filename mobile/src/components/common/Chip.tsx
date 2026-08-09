/**
 * Chip — Sprint 102.7 (Clinical Clarity)
 *
 * CC spec: Days of week pattern.
 * - Unselected: surface + outlineVariant border, text on-surface
 * - Selected: primary background + textOnPrimary
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { MotiPressable } from './MotiPressable';
import { useTheme } from '../../contexts/ThemeContext';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  size = 'md',
  disabled = false,
  style,
}: ChipProps) {
  const { colors } = useTheme();

  return (
    <MotiPressable
      onPress={onPress}
      disabled={disabled}
      onPressHaptic="selection"
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected, style]}
    >
      <View
        style={[
          styles.fill,
          size === 'sm' ? styles.fill_sm : styles.fill_md,
          selected
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
        ]}
      >
        {icon}
        <Text
          style={[
            styles.label,
            size === 'sm' ? styles.label_sm : styles.label_md,
            { color: selected ? colors.textOnPrimary : colors.text },
          ]}
        >
          {label}
        </Text>
      </View>
    </MotiPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999, // pill
  },
  fill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  fill_sm: { paddingVertical: 4 },
  fill_md: { paddingVertical: 8 },
  chipSelected: {},
  chipUnselected: {},
  label: {
    fontWeight: '500',
  },
  label_sm: { fontSize: 12 },
  label_md: { fontSize: 14 },
});