/**
 * Fab — Sprint 102.7 (Clinical Clarity)
 *
 * CC spec: Floating action button, primary-tint shadow %15 (rgba(20,184,166,0.15) mint palette).
 * Diagonal gradient. 56×56 standart FAB.
 */

import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiPressable } from './MotiPressable';
import { useTheme } from '../../contexts/ThemeContext';

interface FabProps {
  icon: React.ReactNode;
  onPress: () => void;
  bottom?: number;
  right?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Fab({
  icon,
  onPress,
  bottom = 88,
  right = 16,
  disabled = false,
  style,
}: FabProps) {
  const { colors } = useTheme();
  const gradientColors = [colors.gradientStart, colors.gradientEnd] as const;

  return (
    <MotiPressable
      onPress={onPress}
      disabled={disabled}
      onPressHaptic="medium"
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.wrapper,
        {
          bottom,
          right,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.fab,
          {
            shadowColor: colors.primary,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.iconContainer}>{icon}</View>
      </LinearGradient>
    </MotiPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // CC FAB shadow %15
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});