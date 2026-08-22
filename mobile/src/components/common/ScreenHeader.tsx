import React from 'react';
import { View, TouchableOpacity, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, lightColors } from '../../contexts/ThemeContext';
import { ThemedText } from './ThemedText';
import { spacing, radius } from '../../theme/tokens';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  style,
}: ScreenHeaderProps) {
  let colors = lightColors;
  let isDark = false;
  try {
    const theme = useTheme();
    colors = theme.colors;
    isDark = theme.isDark;
  } catch {
    // fallback for isolated unit tests without ThemeProvider
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftRow}>
        {showBack && onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={[
              styles.backButton,
              {
                backgroundColor: isDark ? colors.surfaceContainer : '#F1F5F9',
                borderColor: colors.border,
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <ThemedText variant="headlineLg" numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText
              variant="bodyMd"
              color={colors.textSecondary}
              style={styles.subtitle}
              numberOfLines={1}
            >
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {rightAction && <View style={styles.rightActionContainer}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 56,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 2,
  },
  rightActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
});
