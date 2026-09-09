/**
 * IconBadge.tsx — Sprint 98 Karol-inspired redesign.
 *
 * 36×36 circular icon container — accent renkte yarı-saydam arka plan
 * + ortada Ionicons. StatsGrid hücreleri ve diğer metrik kartlarda kullanılır.
 */

import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface IconBadgeProps {
  /** Ionicons name (örn. 'calendar-outline', 'checkmark-circle-outline'). */
  name: string;
  /** Foreground (ikon) rengi. */
  color: string;
  /** Arka plan rengi (hex veya rgba). default color + '15' (%8 alpha tint). */
  backgroundColor?: string;
  /** Container boyutu (px). default 36. */
  size?: number;
  /** İkon boyutu (px). default 18. */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconBadge({
  name,
  color,
  backgroundColor,
  size = 36,
  iconSize = 18,
  style,
}: IconBadgeProps) {
  const bg = backgroundColor ?? color + '15';
  const radius = size / 2;
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      <Ionicons name={name as never} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
