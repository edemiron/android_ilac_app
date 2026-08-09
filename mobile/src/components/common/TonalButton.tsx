/**
 * TonalButton — Sprint 102.7 (Clinical Clarity)
 *
 * CC spec: Rounded-md (12px), background primary_container, text on_primary_container.
 * Press darken %8 (Moti transition). 'edit' | 'cancel' | 'pause' varyant.
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { MotiPressable } from './MotiPressable';
import { useTheme } from '../../contexts/ThemeContext';

export type TonalButtonVariant = 'edit' | 'cancel' | 'pause';

interface TonalButtonProps {
  label: string;
  onPress: () => void;
  variant?: TonalButtonVariant;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function TonalButton({
  label,
  onPress,
  variant = 'edit',
  disabled = false,
  icon,
  style,
}: TonalButtonProps) {
  const { colors } = useTheme();

  // varyant renkleri: container + onContainer
  const palette = {
    edit: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
    cancel: { bg: colors.warningContainer, fg: colors.onWarningContainer },
    pause: { bg: colors.errorContainer, fg: colors.onErrorContainer },
  }[variant];

  return (
    <MotiPressable
      onPress={onPress}
      disabled={disabled}
      onPressHaptic="light"
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.button, disabled && styles.disabled, style]}
    >
      <View style={[styles.fill, { backgroundColor: palette.bg }]}>
        {icon}
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
      </View>
    </MotiPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12, // CC radius.md
    overflow: 'hidden',
  },
  fill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});