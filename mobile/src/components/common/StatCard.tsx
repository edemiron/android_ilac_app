/**
 * StatCard — Sprint 107.5 (Radikal UI Mimarisi).
 *
 * Unified metric card family. StatTile (small numeric tile), StatsGrid (large
 * stat row), LowStockCard (alert card) gibi varyasyonlar tek API'de toplanır.
 *
 * Davranış: sıfır — kod hareketi, görsel korunur.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, spacing } from '../../theme/tokens';

export type StatCardVariant = 'tile' | 'grid' | 'alert' | 'inline' | 'hero';
export type StatCardAccent = 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface StatCardProps {
  variant?: StatCardVariant;
  accent?: StatCardAccent;
  title: string;
  value: number | string;
  unit?: string;
  icon?: string;
  subtitle?: string;
  delta?: { value: number; direction: 'up' | 'down' | 'flat' };
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

interface AccentPalette {
  bg: string;
  fg: string;
  iconBg: string;
  iconFg: string;
}

const ACCENT_MAP: Record<StatCardAccent, (isDark: boolean, colors: ReturnType<typeof useTheme>['colors']) => AccentPalette> = {
  primary: (isDark, colors) => ({
    bg: isDark ? colors.primaryContainer : '#CCFBF1',
    fg: colors.primary,
    iconBg: isDark ? '#1F2A4D' : '#99F6E4',
    iconFg: colors.primary,
  }),
  success: (isDark) => ({
    bg: isDark ? '#0B3D2E' : '#D1FAE5',
    fg: isDark ? '#34D399' : '#059669',
    iconBg: isDark ? '#065F46' : '#A7F3D0',
    iconFg: isDark ? '#34D399' : '#059669',
  }),
  warning: (isDark) => ({
    bg: isDark ? '#3B2A0A' : '#FEF3C7',
    fg: isDark ? '#FCD34D' : '#92400E',
    iconBg: isDark ? '#78350F' : '#FDE68A',
    iconFg: isDark ? '#FCD34D' : '#D97706',
  }),
  error: (isDark) => ({
    bg: isDark ? '#3B0A0A' : '#FEE2E2',
    fg: isDark ? '#FB7185' : '#B91C1C',
    iconBg: isDark ? '#7F1D1D' : '#FECACA',
    iconFg: isDark ? '#FB7185' : '#B91C1C',
  }),
  info: (isDark) => ({
    bg: isDark ? '#0B2A4D' : '#DBEAFE',
    fg: isDark ? '#60A5FA' : '#1D4ED8',
    iconBg: isDark ? '#1E3A8A' : '#BFDBFE',
    iconFg: isDark ? '#60A5FA' : '#1D4ED8',
  }),
};

const VARIANT_MIN_HEIGHT: Record<StatCardVariant, number> = {
  tile: 72,
  grid: 96,
  alert: 80,
  inline: 48,
  hero: 120,
};

export function StatCard({
  variant = 'tile',
  accent = 'primary',
  title,
  value,
  unit,
  icon,
  subtitle,
  delta,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: StatCardProps) {
  const { colors, isDark } = useTheme();
  const palette = useMemo(
    () => ACCENT_MAP[accent](isDark, colors),
    [accent, isDark, colors]
  );

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { onPress, accessibilityRole: 'button' as const }
    : {};

  const showDelta = !!delta && delta.direction !== 'flat';
  const deltaIcon =
    delta?.direction === 'up' ? 'trending-up' : delta?.direction === 'down' ? 'trending-down' : 'remove';
  const deltaColor =
    delta?.direction === 'up'
      ? palette.fg
      : delta?.direction === 'down'
        ? '#EF4444'
        : palette.fg;

  return (
    <Wrapper
      {...wrapperProps}
      accessibilityLabel={accessibilityLabel ?? `${title}: ${value}${unit ?? ''}`}
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          minHeight: VARIANT_MIN_HEIGHT[variant],
          paddingVertical: variant === 'hero' ? spacing.lg : variant === 'inline' ? spacing.xs : spacing.md,
          paddingHorizontal: variant === 'inline' ? spacing.sm : variant === 'hero' ? spacing.lg : spacing.md,
          borderRadius: variant === 'hero' ? radius.lg : variant === 'inline' ? radius.md : radius.md,
        },
        variant === 'grid' && styles.gridLayout,
        variant === 'alert' && styles.alertLayout,
        variant === 'inline' && styles.inlineLayout,
        variant === 'hero' && styles.heroLayout,
        style,
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: palette.iconBg },
            variant === 'inline' && styles.iconSmall,
          ]}
        >
          <Ionicons
            name={icon as never}
            size={variant === 'hero' ? 28 : variant === 'inline' ? 16 : 20}
            color={palette.iconFg}
          />
        </View>
      )}

      <View style={[styles.body, variant === 'inline' && styles.bodyInline]}>
        <Text
          style={[
            styles.title,
            {
              color: palette.fg,
              fontSize: variant === 'hero' ? 14 : variant === 'inline' ? 12 : 11,
            },
            variant === 'inline' && styles.titleInline,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={styles.valueRow}>
          <Text
            style={[
              styles.value,
              {
                color: palette.fg,
                fontSize: variant === 'hero' ? 32 : variant === 'grid' ? 28 : variant === 'inline' ? 16 : 24,
              },
            ]}
            numberOfLines={1}
          >
            {value}
            {unit && (
              <Text style={[styles.unit, { color: palette.fg }]}> {unit}</Text>
            )}
          </Text>
          {showDelta && (
            <View style={styles.deltaRow}>
              <Ionicons name={deltaIcon as never} size={12} color={deltaColor} />
              <Text style={[styles.deltaText, { color: deltaColor }]}>
                {delta!.value}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: palette.fg }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLayout: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  alertLayout: {
    flexDirection: 'row',
  },
  inlineLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.xs,
  },
  body: {
    flex: 1,
  },
  bodyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    opacity: 0.85,
  },
  titleInline: {
    textTransform: 'none',
    letterSpacing: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
});