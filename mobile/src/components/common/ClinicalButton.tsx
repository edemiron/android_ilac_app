import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, spacing } from '../../theme/tokens';

export type ClinicalButtonVariant =
  | 'primary'
  | 'secondary'
  | 'inverted'
  | 'outlined'
  | 'danger'
  | 'tertiary';

export type ClinicalButtonSize = 'sm' | 'md' | 'lg';

export interface ClinicalButtonProps {
  title: string;
  onPress: () => void;
  variant?: ClinicalButtonVariant;
  size?: ClinicalButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function ClinicalButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
}: ClinicalButtonProps) {
  const { colors, isDark } = useTheme();

  // Boyutlara göre padding ve font boyutu
  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
          },
          text: {
            fontSize: 13,
            lineHeight: 18,
          },
          iconSize: 16,
        };
      case 'lg':
        return {
          container: {
            paddingVertical: spacing.lg,
            paddingHorizontal: spacing.xxl,
            borderRadius: radius.lg,
          },
          text: {
            fontSize: 16,
            lineHeight: 22,
          },
          iconSize: 22,
        };
      case 'md':
      default:
        return {
          container: {
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.lg,
          },
          text: {
            fontSize: 15,
            lineHeight: 20,
          },
          iconSize: 18,
        };
    }
  };

  // Varyanta göre renkler
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: isDark ? colors.surfaceContainerHigh : '#F1F5F9',
            borderWidth: 1,
            borderColor: isDark ? colors.border : '#E2E8F0',
          },
          text: {
            color: colors.text,
          },
          iconColor: colors.text,
        };
      case 'inverted':
        return {
          container: {
            backgroundColor: isDark ? '#F8FAFC' : '#0F172A',
          },
          text: {
            color: isDark ? '#0F172A' : '#FFFFFF',
          },
          iconColor: isDark ? '#0F172A' : '#FFFFFF',
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: colors.primary,
          },
          text: {
            color: colors.primary,
          },
          iconColor: colors.primary,
        };
      case 'danger':
        return {
          container: {
            backgroundColor: colors.accent, // #F43F5E
          },
          text: {
            color: '#FFFFFF',
          },
          iconColor: '#FFFFFF',
        };
      case 'tertiary':
        return {
          container: {
            backgroundColor: '#C36D4B', // Warm copper
          },
          text: {
            color: '#FFFFFF',
          },
          iconColor: '#FFFFFF',
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: colors.primary, // #0D9488
          },
          text: {
            color: '#FFFFFF',
          },
          iconColor: '#FFFFFF',
        };
    }
  };

  const sizeStyle = getSizeStyles();
  const variantStyle = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        sizeStyle.container,
        variantStyle.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.text.color as string} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon as any}
              size={sizeStyle.iconSize}
              color={variantStyle.iconColor}
              style={styles.leftIcon}
            />
          )}
          <Text style={[styles.baseText, sizeStyle.text, variantStyle.text, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon as any}
              size={sizeStyle.iconSize}
              color={variantStyle.iconColor}
              style={styles.rightIcon}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});
