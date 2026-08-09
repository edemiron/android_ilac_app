/**
 * PrimaryButton — Sprint 102.7 (Clinical Clarity)
 *
 * CC spec: Rounded-md (12px), background uses action_gradient (mint→teal diagonal),
 * text white, haptics on press. 'gradient' (default) + 'solid' varyant.
 * Sizes: sm/md/lg. Disabled durumda animasyon + haptic yok.
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiPressable } from './MotiPressable';
import { useTheme } from '../../contexts/ThemeContext';

export type PrimaryButtonVariant = 'gradient' | 'solid';
export type PrimaryButtonSize = 'sm' | 'md' | 'lg';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: PrimaryButtonVariant;
  size?: PrimaryButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'gradient',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}: PrimaryButtonProps) {
  const { colors } = useTheme();

  const gradientColors = variant === 'gradient'
    ? ([colors.gradientStart, colors.gradientEnd] as const)
    : null;

  return (
    <MotiPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressHaptic={disabled ? false : 'medium'}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      style={[styles.button, styles[`button_${size}`], disabled && styles.disabled, style]}
    >
      {variant === 'gradient' && gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientFill, styles[`button_${size}`]]}
        >
          {icon}
          <Text style={styles.label}>{loading ? '...' : label}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.solidFill, styles[`button_${size}`], { backgroundColor: colors.primary }]}>
          {icon}
          <Text style={styles.label}>{loading ? '...' : label}</Text>
        </View>
      )}
    </MotiPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12, // CC radius.md
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gradientFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  solidFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  button_sm: { paddingVertical: 8, minHeight: 36 },
  button_md: { paddingVertical: 12, minHeight: 44 },
  button_lg: { paddingVertical: 16, minHeight: 52 },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});