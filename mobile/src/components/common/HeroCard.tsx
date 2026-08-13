/**
 * HeroCard — Sprint 107.1 (Radikal UI Mimarisi).
 *
 * Unified hero card primitive — gradient wrapper used by PremiumCard, Header,
 * and other prominent surfaces. Consolidates LinearGradient + icon container
 * + title/subtitle + badge slot + dismiss + custom right-side content into a
 * single reusable component.
 *
 * Variants:
 *   - premium: gold→orange (Sprint 106.5 premium gradient)
 *   - free:    accent gradientStart→gradientEnd (user's selected accent)
 *   - header:  accent gradient with dark-mode alternative
 *   - warning: amber gradient (low stock, expiry)
 *   - success: green gradient (streak, milestone)
 *
 * Slots:
 *   - icon:      leading icon container (44×44, radius 12)
 *   - title:     main heading
 *   - subtitle:  secondary line
 *   - badge:     Pill slot top-right (Sprint 106.3 uyumlu)
 *   - children:  arbitrary body content below title/subtitle
 *                (e.g. progress bar, streak chip, action row)
 *
 * Davranış: PremiumCard ve Header birebir görsel korunur.
 * PremiumCard gradient (gold→orange) + Header gradient (accent) tek API'de.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, spacing, elevation } from '../../theme/tokens';
import { withAlpha, ALPHA } from '../../utils/colors';

export type HeroCardVariant = 'premium' | 'free' | 'header' | 'warning' | 'success';
export type HeroCardSize = 'sm' | 'md' | 'lg';

export interface HeroCardProps {
  variant?: HeroCardVariant;
  size?: HeroCardSize;
  /** Ana başlık (örn. "Premium'a Geçin", "Merhaba, Ahmet"). */
  title: string;
  /** İkincil satır (opsiyonel). */
  subtitle?: string;
  /** Sağ üst badge — Pill veya custom widget. */
  badge?: React.ReactNode;
  /** Sağ taraf widget — chevron, custom indicator (icon ile aynı satırda). */
  trailing?: React.ReactNode;
  /** Sol üst icon — MaterialCommunityIcons, Ionicons, custom SVG. */
  icon?: React.ReactNode;
  /** Icon container arka planı (default: variant-specific). */
  iconBackground?: string;
  /** Tıklanabilir mi? TouchableOpacity sarmalayıcıya dönüşür. */
  onPress?: () => void;
  /** Kapat butonu göster (× ikonu sağ üstte). */
  dismissible?: boolean;
  /** Kapat callback. */
  onDismiss?: () => void;
  /** Title/subtitle altına ekstra içerik (progress bar, action row vb.). */
  children?: React.ReactNode;
  /** A11y label — yoksa title kullanılır. */
  accessibilityLabel?: string;
  /** A11y hint — ek talimat (örn. "dokun ve detayları gör"). */
  accessibilityHint?: string;
  /** Test ID. */
  testID?: string;
  /** Dış container stili (margin, width vb.). */
  style?: StyleProp<ViewStyle>;
}

const PREMIUM_COLORS = ['#FFD700', '#FFA500'] as const;
const WARNING_COLORS = ['#F59E0B', '#B45309'] as const;
const SUCCESS_COLORS = ['#10B981', '#059669'] as const;

export function HeroCard({
  variant = 'free',
  size = 'md',
  title,
  subtitle,
  badge,
  trailing,
  icon,
  iconBackground,
  onPress,
  dismissible = false,
  onDismiss,
  children,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: HeroCardProps) {
  const { colors, isDark } = useTheme();

  // Gradient colors — variant-specific. useMemo ile tema değişiminde sabitle.
  const gradientColors = useMemo(() => {
    switch (variant) {
      case 'premium':
        return PREMIUM_COLORS;
      case 'header':
        return isDark
          ? ([colors.primaryDark ?? '#6B7CDF', colors.gradientEnd] as const)
          : ([colors.gradientStart, colors.gradientEnd] as const);
      case 'warning':
        return WARNING_COLORS;
      case 'success':
        return SUCCESS_COLORS;
      case 'free':
      default:
        return [colors.gradientStart, colors.gradientEnd] as const;
    }
  }, [variant, isDark, colors.gradientStart, colors.gradientEnd, colors.primaryDark]);

  // Foreground: premium = dark text on gold, others = gradient textOnGradient.
  const fg = variant === 'premium' ? '#1A1A2E' : colors.textOnGradient;
  const fgMuted =
    variant === 'premium'
      ? withAlpha('#1A1A2E', ALPHA.scrimStrong)
      : colors.textOnGradientMuted;

  // Icon container default background — variant-specific contrast.
  const computedIconBg =
    iconBackground ??
    (variant === 'premium'
      ? withAlpha('#000000', ALPHA.veil)
      : variant === 'warning' || variant === 'success'
        ? withAlpha('#000000', ALPHA.veil)
        : withAlpha('#FFFFFF', ALPHA.over));

  const containerStyle = [
    styles.card,
    size === 'sm' ? styles.paddingSm : size === 'lg' ? styles.paddingLg : styles.paddingMd,
    style,
  ];

  const inner = (
    <LinearGradient
      colors={gradientColors as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* Top row: icon (left) + badge + dismiss (right) */}
      <View style={styles.topRow}>
        {icon && (
          <View
            style={[styles.iconContainer, { backgroundColor: computedIconBg }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {icon}
          </View>
        )}
        <View style={styles.topRight}>
          {trailing}
          {badge}
          {dismissible && onDismiss && (
            <TouchableOpacity
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              style={styles.dismissBtn}
            >
              <Ionicons name="close" size={18} color={fg} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Title + subtitle */}
      <Text style={[styles.title, { color: fg }]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: fgMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}

      {/* Optional children (progress bar, streak, action row) */}
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={containerStyle}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? title}
      testID={testID}
      style={containerStyle}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...elevation.level2,
  },
  // Padding scale — HeroCard size variant
  paddingSm: {
    // default 12
  },
  paddingMd: {
    // default 14
  },
  paddingLg: {
    // default 18
  },
  gradient: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});