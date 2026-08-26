/**
 * SegmentTabs — Sprint 107.3 (Radikal UI Mimarisi).
 *
 * iOS segmented control / Material underline tab abstraction. HomeScreen filterTabs
 * + LayoutSwitcher (LayoutB) bu primitive'i kullanır.
 *
 * Variants:
 *   - segmented: pill container, aktif item primary container bg (iOS)
 *   - underline:  MD3 underline tab, aktif item primary border-bottom
 *
 * Davranış: sıfır (kod hareketi).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, spacing } from '../../theme/tokens';
import { withAlpha, ALPHA } from '../../utils/colors';

export interface SegmentTabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: string;
  count?: number;
}

export interface SegmentTabsProps<T extends string = string> {
  items: SegmentTabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  variant?: 'segmented' | 'underline';
  scrollable?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function SegmentTabs<T extends string = string>({
  items,
  value,
  onChange,
  variant = 'segmented',
  scrollable = false,
  testID,
  style,
}: SegmentTabsProps<T>) {
  const { colors, isDark } = useTheme();

  const inner = (
    <View
      style={[
        variant === 'segmented' ? styles.segmentedContainer : styles.underlineContainer,
        variant === 'segmented' && {
          backgroundColor: isDark ? colors.surfaceContainerHigh : withAlpha('#9CA3AF', ALPHA.veil),
        },
        !scrollable && variant === 'segmented' && styles.segmentedRow,
        style,
      ]}
      testID={testID}
    >
      {items.map(item => {
        const isActive = item.key === value;
        const labelColor =
          variant === 'segmented'
            ? isActive
              ? colors.textOnPrimary
              : colors.textSecondary
            : isActive
              ? colors.primary
              : colors.textSecondary;

        const iconColor =
          variant === 'segmented'
            ? isActive
              ? colors.textOnPrimary
              : colors.textSecondary
            : isActive
              ? colors.primary
              : colors.textMuted;

        const tab = (
          <TouchableOpacity
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
            style={[
              variant === 'segmented' ? styles.segmentedTab : styles.underlineTab,
              variant === 'segmented' && isActive && {
                backgroundColor: colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              },
              variant === 'underline' && isActive && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
          >
            {item.icon && (
              <Ionicons
                name={item.icon as never}
                size={16}
                color={iconColor}
              />
            )}
            <Text
              style={[
                variant === 'segmented' ? styles.segmentedLabel : styles.underlineLabel,
                { color: labelColor },
              ]}
              numberOfLines={1}
            >
              {item.label}
              {item.count !== undefined && ` (${item.count})`}
            </Text>
          </TouchableOpacity>
        );

        return tab;
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollableContent}
      >
        {inner}
      </ScrollView>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  segmentedContainer: {
    borderRadius: radius.md,
    padding: 3,
    flexDirection: 'row',
  },
  segmentedRow: {
    // full width segmented
  },
  underlineContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  underlineTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentedLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  underlineLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollableContent: {
    paddingHorizontal: spacing.lg,
  },
});