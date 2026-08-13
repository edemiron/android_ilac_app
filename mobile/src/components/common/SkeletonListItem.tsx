/**
 * SkeletonListItem — Sprint 107.4 (Radikal UI Mimarisi).
 *
 * Yükleme durumu placeholder primitive. HomeScreen/MedicinesScreen/StatisticsScreen
 * loading branch'lerinde bu kullanılır.
 *
 * Davranış: sıfır — render tree sadece loading branch'inde aktif.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type SkeletonListItemVariant =
  | 'medicine-row'
  | 'stat-row'
  | 'timeline-item'
  | 'caregiver'
  | 'generic';

export interface SkeletonListItemProps {
  variant?: SkeletonListItemVariant;
  showAvatar?: boolean;
  lines?: number;
  showTrailing?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_HEIGHT: Record<SkeletonListItemVariant, number> = {
  'medicine-row': 72,
  'stat-row': 56,
  'timeline-item': 64,
  caregiver: 80,
  generic: 48,
};

/**
 * Pulse animasyonlu skeleton placeholder. useNativeDriver: true → UI thread.
 */
export function SkeletonListItem({
  variant = 'generic',
  showAvatar = false,
  lines = 1,
  showTrailing = false,
  testID,
  style,
}: SkeletonListItemProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const rowStyle: StyleProp<ViewStyle>[] = [
    styles.container,
    { height: VARIANT_HEIGHT[variant] },
    style,
  ];

  return (
    <Animated.View
      style={rowStyle}
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showAvatar && <View style={[styles.block, styles.avatar]} />}
      <View style={styles.lines}>
        {Array.from({ length: lines }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.block,
              i === 0 ? styles.lineLong : styles.lineShort,
            ]}
          />
        ))}
      </View>
      {showTrailing && <View style={[styles.block, styles.trailing]} />}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  block: {
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  lines: {
    flex: 1,
    gap: 6,
  },
  lineLong: {
    width: '70%',
    height: 12,
  },
  lineShort: {
    width: '45%',
    height: 10,
  },
  trailing: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});