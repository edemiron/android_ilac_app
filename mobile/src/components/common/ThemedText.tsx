/**
 * ThemedText — Sprint 102.8 (Clinical Clarity)
 *
 * CC spec typography scale: Hanken Grotesk (headlines) + Inter (body/labels).
 * Yeni component'lerde kullanılacak; mevcut inline Text'lere dokunulmaz (CLAUDE.md
 * sıfır davranış değişimi).
 *
 * FontFamily isimleri app.config.json expo-font plugin'indeki key'lerle eşleşmeli.
 * Font yüklenmediğinde sistem fontuna düşer (graceful degradation).
 */

import React from 'react';
import { Text, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type ThemedTextVariant =
  | 'headlineLg' // 28/700/-0.4 letterSpacing — screen title
  | 'headlineMd' // 22/600/-0.2 — medication name on cards
  | 'bodyLg' // 16/400 — medication instructions
  | 'bodyMd' // 14/400 — secondary metadata
  | 'labelMd' // 14/500 — input labels
  | 'labelSm'; // 12/500 — timestamps, dosage units

interface ThemedTextProps {
  variant: ThemedTextVariant;
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

const VARIANT_STYLES: Record<ThemedTextVariant, TextStyle> = {
  headlineLg: {
    fontFamily: 'HankenGroteskBold',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 36,
  },
  headlineMd: {
    fontFamily: 'HankenGroteskSemiBold',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  bodyLg: {
    fontFamily: 'InterRegular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: 'InterRegular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  labelMd: {
    fontFamily: 'InterMedium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelSm: {
    fontFamily: 'InterMedium',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.1,
  },
};

export function ThemedText({ variant, children, color, style, numberOfLines }: ThemedTextProps) {
  let textColor = color;
  if (!textColor) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme();
      textColor = theme?.colors?.text ?? '#0F172A';
    } catch {
      textColor = '#0F172A';
    }
  }

  return (
    <Text
      style={[VARIANT_STYLES[variant], { color: textColor }, style]}
      numberOfLines={numberOfLines}
      allowFontScaling
    >
      {children}
    </Text>
  );
}

// Style referansı için dışa açık (testlerde veya override'larda kullanılabilir)
export const ThemedTextStyles = StyleSheet.create(VARIANT_STYLES);
