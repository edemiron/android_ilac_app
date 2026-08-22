/**
 * OnboardingSlide — Tekil Onboarding Sayfası Bileşeni
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import { PillboxIllustration } from '../../../components/common/PillboxIllustration';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SlideContent {
  emoji: string;
  titleTr: string;
  titleEn: string;
  messageTr: string;
  messageEn: string;
}

interface OnboardingSlideProps {
  item: SlideContent;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function OnboardingSlide({ item, colors, isDark, language }: OnboardingSlideProps) {
  const tr = language === 'tr';

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.illustrationWrap}>
        {item.emoji === '💊' ? (
          <PillboxIllustration size={180} />
        ) : (
          <View
            style={[
              styles.emojiWrap,
              { backgroundColor: isDark ? colors.primaryContainer : '#CCFBF1' },
            ]}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{tr ? item.titleTr : item.titleEn}</Text>

      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {tr ? item.messageTr : item.messageEn}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustrationWrap: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emojiWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
});
