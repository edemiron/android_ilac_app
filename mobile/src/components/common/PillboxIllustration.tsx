/**
 * PillboxIllustration — Sprint 59.
 *
 * Custom SVG pillbox/medicine box illustration. Empty state'lerde kullanılır.
 * react-native-svg tabanlı; renkler tema'dan alınır.
 */

import React from 'react';
import Svg, { Rect, Circle, Path, G } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

interface PillboxIllustrationProps {
  size?: number;
}

export function PillboxIllustration({ size = 160 }: PillboxIllustrationProps) {
  const { colors, isDark } = useTheme();
  const fillPrimary = isDark ? '#3B3F66' : '#CCFBF1';
  const strokePrimary = colors.primary;
  const pillLight = isDark ? '#ABB8FF' : '#99F6E4';
  const pillDark = isDark ? '#8B9CFF' : '#0D9488';

  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      {/* Pillbox shadow */}
      <Rect
        x={28}
        y={92}
        width={104}
        height={8}
        rx={4}
        fill={colors.shadow || 'rgba(15,23,42,0.08)'}
      />

      {/* Pillbox body */}
      <Rect
        x={20}
        y={50}
        width={120}
        height={56}
        rx={8}
        fill={fillPrimary}
        stroke={strokePrimary}
        strokeWidth={2}
      />

      {/* Lid line */}
      <Rect x={20} y={62} width={120} height={2} fill={strokePrimary} opacity={0.4} />

      {/* Days of week dividers */}
      {[40, 60, 80, 100, 120].map(x => (
        <Rect key={x} x={x} y={66} width={1} height={36} fill={strokePrimary} opacity={0.2} />
      ))}

      {/* AM/PM dot indicators */}
      {[
        { x: 30, y: 72, has: true },
        { x: 50, y: 72, has: false },
        { x: 70, y: 72, has: true },
        { x: 90, y: 72, has: true },
        { x: 110, y: 72, has: false },
        { x: 130, y: 72, has: true },
        { x: 30, y: 86, has: false },
        { x: 50, y: 86, has: true },
        { x: 70, y: 86, has: false },
        { x: 90, y: 86, has: true },
        { x: 110, y: 86, has: true },
        { x: 130, y: 86, has: false },
      ].map((dot, i) => (
        <Circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={2.5}
          fill={dot.has ? strokePrimary : 'transparent'}
          stroke={strokePrimary}
          strokeWidth={dot.has ? 0 : 1}
          opacity={dot.has ? 1 : 0.3}
        />
      ))}

      {/* Floating pill (left) */}
      <G transform="translate(8 28) rotate(-25 16 8)">
        <Rect x={0} y={0} width={32} height={16} rx={8} fill={pillLight} />
        <Rect x={16} y={0} width={16} height={16} rx={8} fill={pillDark} />
      </G>

      {/* Floating pill (right) */}
      <G transform="translate(116 16) rotate(20 14 6)">
        <Rect x={0} y={0} width={28} height={12} rx={6} fill={pillDark} />
      </G>

      {/* Sparkle */}
      <Path
        d="M 130 38 L 132 44 L 138 46 L 132 48 L 130 54 L 128 48 L 122 46 L 128 44 Z"
        fill={strokePrimary}
        opacity={0.6}
      />
    </Svg>
  );
}
