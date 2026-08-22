import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, spacing } from '../../theme/tokens';

export type ClinicalBadgeVariant =
  | 'taken'
  | 'skipped'
  | 'missed'
  | 'pending'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'neutral';

export type ClinicalBadgeSize = 'sm' | 'md';

export interface ClinicalBadgeProps {
  label: string;
  variant?: ClinicalBadgeVariant;
  size?: ClinicalBadgeSize;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function ClinicalBadge({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  textStyle,
}: ClinicalBadgeProps) {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'taken':
        return {
          container: {
            backgroundColor: isDark ? '#064E3B' : '#D1FAE5', // Emerald 100
          },
          text: {
            color: isDark ? '#34D399' : '#065F46', // Emerald 800
          },
          iconColor: isDark ? '#34D399' : '#065F46',
        };
      case 'skipped':
        return {
          container: {
            backgroundColor: isDark ? '#78350F' : '#FEF3C7', // Amber 100
          },
          text: {
            color: isDark ? '#FBBF24' : '#92400E', // Amber 800
          },
          iconColor: isDark ? '#FBBF24' : '#92400E',
        };
      case 'missed':
        return {
          container: {
            backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', // Rose 100
          },
          text: {
            color: isDark ? '#F87171' : '#991B1B', // Rose 800
          },
          iconColor: isDark ? '#F87171' : '#991B1B',
        };
      case 'pending':
        return {
          container: {
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9', // Slate 100
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
          text: {
            color: isDark ? '#94A3B8' : '#475569',
          },
          iconColor: isDark ? '#94A3B8' : '#475569',
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: isDark ? '#4C0519' : '#FFE4E6', // Rose 100
          },
          text: {
            color: isDark ? '#FB7185' : '#BE123C',
          },
          iconColor: isDark ? '#FB7185' : '#BE123C',
        };
      case 'tertiary':
        return {
          container: {
            backgroundColor: isDark ? '#451A03' : '#FFEDD5', // Copper/Orange 100
          },
          text: {
            color: isDark ? '#FB923C' : '#C36D4B',
          },
          iconColor: isDark ? '#FB923C' : '#C36D4B',
        };
      case 'neutral':
        return {
          container: {
            backgroundColor: isDark ? '#334155' : '#E2E8F0',
          },
          text: {
            color: isDark ? '#E2E8F0' : '#475569',
          },
          iconColor: isDark ? '#E2E8F0' : '#475569',
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: isDark ? '#134E4A' : '#CCFBF1', // Teal 100
          },
          text: {
            color: isDark ? '#5EEAD4' : '#0F766E', // Teal 700
          },
          iconColor: isDark ? '#5EEAD4' : '#0F766E',
        };
    }
  };

  const isSmall = size === 'sm';
  const variantStyle = getVariantStyles();

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        variantStyle.container,
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={isSmall ? 12 : 14}
          color={variantStyle.iconColor}
          style={styles.icon}
        />
      )}
      <Text
        style={[styles.text, isSmall ? styles.textSm : styles.textMd, variantStyle.text, textStyle]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill, // pill shape
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  badgeMd: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textMd: {
    fontSize: 12,
    lineHeight: 16,
  },
});
