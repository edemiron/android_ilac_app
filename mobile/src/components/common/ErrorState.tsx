/**
 * ErrorState — Sprint 59.
 *
 * Tutarlı hata durumu component'i. Retry callback opsiyonel.
 * MD3 error color, 48pt primary touch target.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';

interface ErrorStateProps {
  title: string;
  message?: string;
  errorCode?: string;
  retryLabel?: string;
  onRetry?: () => void;
  testID?: string;
}

const DEFAULT_RETRY_LABEL = 'Tekrar Dene';
const DEFAULT_RETRY_LABEL_EN = 'Try Again';
const DEFAULT_TITLE = 'Bir şeyler ters gitti';
const DEFAULT_TITLE_EN = 'Something went wrong';

export function ErrorState({
  title,
  message,
  errorCode,
  retryLabel,
  onRetry,
  testID = 'error-state',
}: ErrorStateProps) {
  const { colors, isDark } = useTheme();
  // Sprint 66B: light haptic on retry
  const haptics = useHaptics();
  const showRetry = !!retryLabel || !!onRetry;
  const retry = retryLabel ?? DEFAULT_RETRY_LABEL;

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLabel={message ? `${title}. ${message}` : title}
      testID={testID}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? '#3B0A0A' : '#FEE2E2',
          },
        ]}
      >
        <Ionicons name="alert-circle" size={64} color={colors.error} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}

      {errorCode && (
        <Text style={[styles.code, { color: colors.textMuted }]} testID="error-code">
          {errorCode}
        </Text>
      )}

      {showRetry && onRetry && (
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: colors.primary, minHeight: 48 }]}
          onPress={() => {
            // Sprint 66B: light haptic on retry
            haptics.light();
            onRetry();
          }}
          accessibilityRole="button"
          accessibilityLabel={retry}
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" style={styles.retryIcon} />
          <Text style={styles.retryText}>{retry}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const ErrorStateDefaults = {
  DEFAULT_RETRY_LABEL,
  DEFAULT_RETRY_LABEL_EN,
  DEFAULT_TITLE,
  DEFAULT_TITLE_EN,
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
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
    marginBottom: 8,
    maxWidth: 320,
  },
  code: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 8,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
