/**
 * SectionHeader.tsx — Sprint 107.2 ListSection migration.
 *
 * Karol tasarımındaki section başlığı + sağda "Tümü >" link pattern'i.
 * Sprint 107.2: ListSection primitive'i (variant=home) kullanır.
 *
 * 3 section'da kullanılır:
 *   - "Özet Bilgiler" (no see-all)
 *   - "Bugünün Dozları" → MedicinesScreen
 *   - "İlerleme" (no see-all, Layout B için)
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { ListSection } from '../../../components/common/ListSection';
import { MotiPressable } from '../../../components/common/MotiPressable';

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
  const linkText = seeAllLabel ?? (language === 'tr' ? 'Tümü' : 'See all');

  const trailing = onSeeAll ? (
    <MotiPressable
      onPress={onSeeAll}
      accessibilityRole="link"
      accessibilityLabel={`${title} ${linkText}`}
      hitSlop={8}
      onPressHaptic="selection"
    >
      <Text style={[styles.seeAll, { color: colors.primary }]}>{linkText} ›</Text>
    </MotiPressable>
  ) : undefined;

  return (
    <ListSection
      variant="home"
      icon={icon ? <Text style={styles.icon}>{icon}</Text> : undefined}
      title={title}
      trailing={trailing}
    >
      <></>
    </ListSection>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 14,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
});