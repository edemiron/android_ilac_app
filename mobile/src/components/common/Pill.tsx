/**
 * Pill — Sprint 106.3 (Life360 arayüz kalıbı).
 *
 * Shared badge / inline status indicator component.
 * Replaces 6+ inline `<View><Text>{label}</Text></View>` instances across
 * NotificationSection, MedicineRow, TimelineItem, CaregiverSection.
 *
 * 6 semantic variants (success/warning/error/info/muted/primary) × 3 sizes.
 * Token-aware: backgrounds from theme palette, foregrounds from MD3 container.
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { withAlpha, ALPHA } from '../../utils/colors';

export type PillVariant = 'success' | 'warning' | 'error' | 'info' | 'muted' | 'primary';
export type PillSize = 'xs' | 'sm' | 'md';

export interface PillProps {
  label: string;
  variant?: PillVariant;
  size?: PillSize;
  icon?: string; // Ionicons name
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityElementsHidden?: boolean;
}

export function Pill({
  label,
  variant = 'muted',
  size = 'sm',
  icon,
  iconSize,
  style,
  accessibilityElementsHidden = false,
}: PillProps) {
  const { colors, isDark } = useTheme();

  // Variant → bg + fg color mapping
  // Light: container tone (washed) + saturated fg — MD3 tonal pattern
  // Dark: same hue tighter opaque — readability priority
  const palette = (() => {
    switch (variant) {
      case 'success':
        return {
          bg: withAlpha('#10B981', ALPHA.veil),
          fg: isDark ? '#34D399' : '#059669',
          iconColor: isDark ? '#34D399' : '#059669',
        };
      case 'warning':
        return {
          bg: isDark ? 'rgba(252, 211, 77, 0.18)' : '#FEF3C7',
          fg: isDark ? '#FCD34D' : '#92400E',
          iconColor: isDark ? '#FCD34D' : '#D97706',
        };
      case 'error':
        return {
          bg: withAlpha('#EF4444', ALPHA.veil),
          fg: isDark ? '#FB7185' : '#B91C1C',
          iconColor: isDark ? '#FB7185' : '#B91C1C',
        };
      case 'info':
        return {
          bg: colors.primaryContainer,
          fg: colors.onPrimaryContainer,
          iconColor: colors.primary,
        };
      case 'muted':
        return {
          bg: isDark ? colors.surfaceContainerHigh : withAlpha('#9CA3AF', ALPHA.veilStrong),
          fg: colors.textSecondary,
          iconColor: colors.textMuted,
        };
      case 'primary':
        return {
          bg: colors.primary,
          fg: colors.textOnPrimary,
          iconColor: colors.textOnPrimary,
        };
      default:
        return {
          bg: colors.surfaceContainerHigh,
          fg: colors.textSecondary,
          iconColor: colors.textMuted,
        };
    }
  })();

  const sizeStyle =
    size === 'xs' ? styles.xs : size === 'sm' ? styles.sm : styles.md;
  const labelSize = size === 'xs' ? 10 : size === 'sm' ? 11 : 12;
  const computedIconSize = iconSize ?? (size === 'xs' ? 10 : size === 'sm' ? 11 : 13);

  return (
    <View
      style={[styles.base, sizeStyle, { backgroundColor: palette.bg }, style]}
      accessibilityElementsHidden={accessibilityElementsHidden}
      importantForAccessibility={accessibilityElementsHidden ? 'no' : 'auto'}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={computedIconSize}
          color={palette.iconColor}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.label,
          { fontSize: labelSize, color: palette.fg, letterSpacing: 0.3 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  xs: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  sm: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  md: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: '700',
  },
});
