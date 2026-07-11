/**
 * EmptyState — Sprint 59.
 *
 * Tutarlı boş durum component'i. 3 varyant:
 *   - illustration: PillboxIllustration SVG (default)
 *   - icon: Ionicons name ile (compact)
 *   - simple: sadece text (compact)
 *
 * MD3 layout, 48pt primary touch target.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PillboxIllustration } from './PillboxIllustration';

export type EmptyStateVariant = 'illustration' | 'icon' | 'simple';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  iconName?: string;
  iconSize?: number;
  iconColor?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  variant = 'illustration',
  iconName = 'medical-outline',
  iconSize = 64,
  iconColor,
  title,
  message,
  actionLabel,
  onAction,
  testID = 'empty-state',
}: EmptyStateProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  const renderVisual = () => {
    if (variant === 'illustration') {
      return (
        <View style={styles.illustrationWrap}>
          <PillboxIllustration size={160} />
        </View>
      );
    }
    if (variant === 'icon') {
      return (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isDark ? colors.primaryContainer : '#CCFBF1' },
          ]}
        >
          <Ionicons name={iconName} size={iconSize} color={iconColor ?? colors.primary} />
        </View>
      );
    }
    return null;
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={message ? `${title}. ${message}` : title}
      testID={testID}
    >
      {renderVisual()}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.action, { backgroundColor: colors.primary, minHeight: 48 }]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}

      {/* i18n not used directly here; reserved for future */}
      {language ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  illustrationWrap: {
    marginBottom: 24,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  action: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
