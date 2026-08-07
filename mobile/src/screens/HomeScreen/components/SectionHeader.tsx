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
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';

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
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        {icon !== undefined && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      </View>
      {showSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          accessibilityRole="link"
          accessibilityLabel={`${title} ${linkText}`}
          hitSlop={8}
        >
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            {linkText} ›
          </Text>
        </TouchableOpacity>
      )}
    </View>
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
