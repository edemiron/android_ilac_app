import React from 'react';
import { View, StyleSheet, TouchableOpacity, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, spacing } from '../../theme/tokens';

export type ClinicalCardVariant = 'default' | 'elevated' | 'outlined' | 'tinted';

export interface ClinicalCardProps {
  children: React.ReactNode;
  variant?: ClinicalCardVariant;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
  testID?: string;
}

export function ClinicalCard({
  children,
  variant = 'default',
  style,
  onPress,
  activeOpacity = 0.75,
  testID,
}: ClinicalCardProps) {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: isDark ? colors.border : '#E2E8F0',
          shadowColor: isDark ? '#000000' : '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 10,
          elevation: 3,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case 'tinted':
        return {
          backgroundColor: isDark ? colors.surfaceContainer : '#F1F5F9',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: isDark ? '#000000' : '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.04,
          shadowRadius: 6,
          elevation: 2,
        };
    }
  };

  const cardStyle: ViewStyle[] = [styles.baseCard, getVariantStyles(), style as ViewStyle];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={activeOpacity}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: radius.lg, // 14px
    padding: spacing.lg, // 16px
    overflow: 'hidden',
  },
});
