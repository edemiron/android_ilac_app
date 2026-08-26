/**
 * Skeleton — Sprint 56: WCAG uyumlu loading placeholder.
 *
 * 3 varyant: rect, circle, text. Animasyonlu (shimmer).
 * Tema-uyumlu (useTheme hook'undan renk çekiyor).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type SkeletonVariant = 'rect' | 'circle' | 'text';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  variant?: SkeletonVariant;
  lines?: number;
  gap?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 4,
  variant = 'rect',
  lines = 1,
  gap = 8,
  style,
}: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const baseColor = isDark ? colors.surfaceContainerHigh : '#E2E8F0';

  if (variant === 'circle') {
    const size = typeof width === 'number' ? width : (height ?? 48);
    return (
      <Animated.View
        testID="skeleton-circle"
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: baseColor,
            opacity,
          },
          style,
        ]}
      />
    );
  }

  if (variant === 'text') {
    return (
      <View style={style}>
        {Array.from({ length: lines }).map((_, i) => (
          <Animated.View
            key={i}
            testID="skeleton-text-line"
            style={{
              width: (i === lines - 1 ? '70%' : width) as DimensionValue,
              height,
              borderRadius: radius,
              backgroundColor: baseColor,
              opacity,
              marginBottom: i === lines - 1 ? 0 : gap,
            }}
          />
        ))}
      </View>
    );
  }

  return (
    <Animated.View
      testID="skeleton"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: baseColor,
          opacity,
        },
        style,
      ]}
    />
  );
}
