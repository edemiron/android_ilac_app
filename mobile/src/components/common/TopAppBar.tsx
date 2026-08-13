/**
 * TopAppBar — Sprint 107.3 (Radikal UI Mimarisi).
 *
 * Brand-tutarlı üst bar. 5 ekran header'ı (HomeScreen Header Hariç — HeroCard),
 * SettingsScreen, MedicinesScreen, AddMedicineScreen, OnboardingScreen
 * bu primitive'i kullanır.
 *
 * Variants:
 *   - home:     accent gradient arka plan (HeroCard üstünde)
 *   - settings: beyaz/siyah arka plan, primary renk geri butonu
 *   - list:     beyaz/siyah arka plan, + FAB trailing (FAB ayrı component)
 *   - form:     beyaz/siyah arka plan, "İptal" leading + "Kaydet" trailing
 *   - modal:    close button + title centered
 *   - plain:    sade başlık, sol-sağ boş
 *
 * Davranış: sıfır (kod hareketi, görsel korunur).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../theme/tokens';

export type TopAppBarVariant = 'home' | 'settings' | 'list' | 'form' | 'modal' | 'plain';

export interface TopAppBarAction {
  key: string;
  icon: string;
  onPress: () => void;
  badge?: number;
  accessibilityLabel: string;
}

export interface TopAppBarProps {
  variant?: TopAppBarVariant;
  /** Ana başlık. */
  title: string;
  /** Alt başlık (settings detail sayfası, vb.). */
  subtitle?: string;
  /** Sol taraf widget (back button, hamburger, custom). */
  leading?: React.ReactNode;
  /** Sağ taraf action list (icons + optional badges). */
  trailing?: TopAppBarAction[];
  /** Scroll collapse — opsiyonel. */
  scrollY?: Animated.Value;
  /** Büyük başlık (iOS-style). Default false. */
  large?: boolean;
  /** Test ID. */
  testID?: string;
  /** Dış container stili. */
  style?: StyleProp<ViewStyle>;
}

export function TopAppBar({
  variant = 'plain',
  title,
  subtitle,
  leading,
  trailing,
  large = false,
  testID,
  style,
}: TopAppBarProps) {
  const { colors } = useTheme();

  // Variant-specific background
  const backgroundColor =
    variant === 'home' ? colors.primary : variant === 'modal' ? colors.card : colors.background;
  const foregroundColor = variant === 'home' ? colors.textOnGradient : colors.text;
  const subtitleColor =
    variant === 'home' ? colors.textOnGradientMuted : colors.textSecondary;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safe,
        { backgroundColor },
        variant === 'home' && styles.homeBottom,
        style,
      ]}
    >
      <View
        style={[
          styles.bar,
          large ? styles.barLarge : styles.barCompact,
          variant === 'home' && styles.homeBar,
        ]}
        testID={testID}
      >
        {/* Leading — back button / hamburger / custom */}
        <View style={styles.leading}>
          {leading}
        </View>

        {/* Title + subtitle (center) */}
        <View style={[styles.titleContainer, variant === 'modal' && styles.titleCenter]}>
          {large ? (
            <Text
              style={[
                styles.titleLarge,
                { color: foregroundColor },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : (
            <Text
              style={[styles.title, { color: foregroundColor }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                { color: subtitleColor },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Trailing — actions */}
        <View style={styles.trailing}>
          {trailing?.map(action => (
            <TouchableOpacity
              key={action.key}
              onPress={action.onPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              style={styles.action}
            >
              <Ionicons
                name={action.icon as never}
                size={22}
                color={foregroundColor}
              />
              {action.badge !== undefined && action.badge > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.error },
                  ]}
                  accessibilityLabel={`${action.badge} yeni`}
                >
                  <Text style={styles.badgeText}>{action.badge > 99 ? '99+' : action.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    width: '100%',
  },
  homeBottom: {
    paddingBottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  barCompact: {
    minHeight: 56,
  },
  barLarge: {
    minHeight: 96,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  homeBar: {
    backgroundColor: 'transparent',
    minHeight: 0,
    paddingHorizontal: spacing.lg,
  },
  leading: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  titleCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  titleLarge: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  action: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});