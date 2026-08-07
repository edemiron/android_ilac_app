/**
 * SectionHeader.tsx — Sprint 98 Karol-inspired redesign.
 *
 * Karol tasarımındaki section başlığı + sağda "Tümü >" link pattern'i.
 * 3 section'da kullanılır:
 *   - "Özet Bilgiler" (no see-all)
 *   - "Bugünün Dozları" → MedicinesScreen
 *   - "İlerleme" (no see-all, Layout B için)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { MotiPressable } from '../../../components/common/MotiPressable';
import { motiTransitions } from '../../../theme/moti-config';

export interface SectionHeaderProps {
  /** Section başlığı (büyük harf zaten style'da). */
  title: string;
  /** Opsiyonel ikon (emoji veya karakter). */
  icon?: string;
  /** "Tümü >" linki görünsün mü + callback. */
  onSeeAll?: () => void;
  /** Erişilebilirlik için override (varsayılan title + " tümü"). */
  seeAllLabel?: string;
}

export function SectionHeader({
  title,
  icon,
  onSeeAll,
  seeAllLabel,
}: SectionHeaderProps) {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const showSeeAll = !!onSeeAll;
  const linkText = seeAllLabel ?? (language === 'tr' ? 'Tümü' : 'See all');

  return (
    // Sprint 100: section header mount fade-in (quick, hizli gecis)
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={motiTransitions.quick}
      style={styles.container}
    >
      <View style={styles.leftGroup}>
        {icon !== undefined && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      </View>
      {showSeeAll && (
        <MotiPressable
          onPress={onSeeAll}
          accessibilityRole="link"
          accessibilityLabel={`${title} ${linkText}`}
          hitSlop={8}
          onPressHaptic="selection"
        >
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            {linkText} ›
          </Text>
        </MotiPressable>
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
});
