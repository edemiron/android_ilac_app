/**
 * ListSection — Sprint 107.2 (Radikal UI Mimarisi).
 *
 * iOS grouped list section abstraction. Consolidates 4+ inline section
 * implementations across SettingsScreen, MedicinesScreen, StatisticsScreen,
 * HomeScreen — single API for card + header + children.
 *
 * Variants:
 *   - settings: white card, uppercase title (Settings ekranı), rows with hairlines
 *   - list:     white card, normal-case title + optional trailing (İlaçlar listesi)
 *   - stats:    card with smaller padding (İstatistik ekranı)
 *   - home:     sadece header + children (HomeScreen bölüm başlığı, kart yok)
 *   - plain:    wrapper only, no card, no title (custom layouts)
 *
 * Davranış: 4 implementation birebir korunur (radius 16, padding 16, shadow 0.05,
 * uppercase title 13/700 letterSpacing 0.5).
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, spacing, elevation } from '../../theme/tokens';
import { motiTransitions } from '../../theme/moti-config';

export type ListSectionVariant = 'settings' | 'list' | 'stats' | 'home' | 'plain';
export type ListSectionInset = 'none' | 'sm' | 'md' | 'lg';

export interface ListSectionProps {
  variant?: ListSectionVariant;
  /** Bölüm başlığı (örn. "BAKICILAR", "BUGÜNÜN DOZLARI"). */
  title?: string;
  /** Bölüm alt başlığı / açıklaması. */
  subtitle?: string;
  /** Başlık solunda ikon (emoji, Ionicon). */
  icon?: React.ReactNode;
  /** Başlık sağında custom widget (Tümü › link, badge vb.). */
  trailing?: React.ReactNode;
  /** Dış container margin scale (none = 0, sm = 8, md = 16, lg = 24). */
  inset?: ListSectionInset;
  /** Gölge seviyesi (0=hiç, 1=hairline, 2=card). */
  elevation?: 0 | 1 | 2;
  /** Bölüm içeriği (rows, items). */
  children: React.ReactNode;
  /** Test ID. */
  testID?: string;
  /** Dış container stili (margin override). */
  style?: StyleProp<ViewStyle>;
}

export function ListSection({
  variant = 'settings',
  title,
  subtitle,
  icon,
  trailing,
  inset = 'md',
  elevation: elevLevel = 1,
  children,
  testID,
  style,
}: ListSectionProps) {
  const { colors } = useTheme();

  // Container stilleri — variant-specific
  const containerStyles: StyleProp<ViewStyle>[] = useMemo(() => {
    const list: StyleProp<ViewStyle>[] = [styles.base];

    if (variant !== 'plain' && variant !== 'home') {
      list.push(styles.card);
      list.push(styles.cardMargin);
      list.push(styles.cardRadius);
      list.push(styles.cardOverflow);
      if (elevLevel === 1) list.push(styles.elev1);
      if (elevLevel === 2) list.push(styles.elev2);
    }

    if (inset === 'none') list.push(styles.insetNone);
    else if (inset === 'sm') list.push(styles.insetSm);
    else if (inset === 'lg') list.push(styles.insetLg);

    return list;
  }, [variant, elevLevel, inset]);

  // Title stilleri — variant-specific
  const titleStyle = variant === 'settings' ? styles.titleSettings : styles.titleList;
  const subtitleStyle = variant === 'settings' ? styles.subtitleSettings : styles.subtitleList;

  // Children wrapper — kart içindeyse padding uygula
  const childrenWrapperStyle =
    variant === 'plain' || variant === 'home'
      ? undefined
      : variant === 'stats'
        ? styles.childrenStats
        : styles.childrenDefault;

  const showHeader = !!(title || subtitle || icon || trailing);

  // Inner content
  const inner = (
    <>
      {showHeader && (
        <View style={variant === 'plain' ? styles.headerPlain : styles.headerCard}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <View style={styles.titleContainer}>
            {title ? (
              <Text style={[titleStyle, { color: colors.primary }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={[subtitleStyle, { color: colors.textSecondary }]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {trailing ? <View style={styles.trailingContainer}>{trailing}</View> : null}
        </View>
      )}
      <View style={childrenWrapperStyle}>{children}</View>
    </>
  );

  if (variant === 'home') {
    return (
      <MotiView
        from={{ opacity: 0, translateY: -4 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={motiTransitions.standard}
        style={[containerStyles, style]}
        testID={testID}
      >
        {inner}
      </MotiView>
    );
  }

  return (
    <View
      style={[
        containerStyles,
        variant !== 'plain' ? { backgroundColor: colors.card } : null,
        style,
      ]}
      testID={testID}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
  // Card variant stilleri
  card: {},
  cardMargin: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  cardRadius: {
    borderRadius: radius.lg,
  },
  cardOverflow: {
    overflow: 'hidden',
  },
  elev1: {
    ...elevation.level1,
  },
  elev2: {
    ...elevation.level2,
  },
  // Inset variants
  insetNone: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  insetSm: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  insetLg: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  // Header
  headerPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  iconContainer: {},
  titleContainer: {
    flex: 1,
  },
  trailingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Settings variant: uppercase + primary color + tracking
  titleSettings: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitleSettings: {
    fontSize: 12,
    paddingTop: spacing.xxs,
    lineHeight: 16,
  },
  // List variant: larger title
  titleList: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitleList: {
    fontSize: 13,
    paddingTop: spacing.xxs,
    lineHeight: 18,
  },
  // Children padding
  childrenDefault: {
    paddingHorizontal: 0,
  },
  childrenStats: {
    paddingHorizontal: spacing.md,
  },
});