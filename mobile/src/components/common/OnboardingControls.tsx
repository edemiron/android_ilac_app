/**
 * OnboardingControls — Sprint 107.6 (Radikal UI Mimarisi).
 *
 * Onboarding screen'in alt kısmı (dots indicator + skip + next button).
 * FlatList OnboardingScreen'de kalır; bu sadece alt controls'u encapsulate eder.
 *
 * Davranış: sıfır (render birebir korunur).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../theme/tokens';

export interface OnboardingControlsProps {
  total: number;
  currentIndex: number;
  isLast: boolean;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel: string;
  startLabel: string;
  skipLabel?: string;
  showSkip?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function OnboardingControls({
  total,
  currentIndex,
  isLast,
  onNext,
  onSkip,
  nextLabel,
  startLabel,
  skipLabel,
  showSkip = true,
  testID,
  style,
}: OnboardingControlsProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Skip Row */}
      <View style={styles.skipRow}>
        {showSkip && !isLast && onSkip && (
          <TouchableOpacity
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel={skipLabel ?? 'Skip'}
            style={styles.skipBtn}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              {skipLabel ?? 'Atla'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dots Indicator */}
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === currentIndex ? colors.primary : colors.outlineVariant,
                width: i === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Next / Start Button */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? startLabel : nextLabel}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? startLabel : nextLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    height: 44,
  },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 16, fontWeight: '600' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  nextBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});