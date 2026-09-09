import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { type ThemeColors } from '../../../contexts/ThemeContext';
import { type WheelItemTier, TIER_STYLE } from './constants';

export interface WheelItemProps {
  readonly label: string;
  readonly tier: WheelItemTier;
  readonly enabled: boolean;
  readonly colors: ThemeColors;
  readonly itemHeight: number;
  readonly onPress: (index: number) => void;
  readonly index: number;
}

export const WheelItem = React.memo(function WheelItem({
  label,
  tier,
  enabled,
  colors,
  itemHeight,
  onPress,
  index,
}: WheelItemProps) {
  const styleConfig = TIER_STYLE[tier];

  let textColor = colors.text;
  if (!enabled) {
    textColor = colors.textMuted;
  } else if (tier === 1) {
    textColor = colors.textSecondary;
  } else if (tier === 2) {
    textColor = colors.textMuted;
  }

  const opacity = !enabled ? 0.3 : tier === 0 ? 1 : tier === 1 ? 0.65 : 0.4;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={!enabled}
      onPress={() => onPress(index)}
      style={[styles.container, { height: itemHeight }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: styleConfig.fontSize,
            fontWeight: styleConfig.fontWeight,
            color: textColor,
            opacity,
          },
        ]}
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  text: {
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    includeFontPadding: false,
  },
});
