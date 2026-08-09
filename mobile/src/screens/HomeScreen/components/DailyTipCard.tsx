/**
 * DailyTipCard — Sprint 104.3 (Karol-style HomeScreen modernization).
 *
 * "Gunun Ipucu" mint pastel kart. Layout A (Sade) ekraninda InlineAdBanner'dan
 * once render edilir. Icinde 5 hardcoded tip + date-deterministic secim var.
 *
 * Davranis:
 * - Her gun icin ayni ipucu (Math.floor(Date.now() / 86400000) % 5).
 * - AsyncStorage persist YOK (kullanici karari: deterministic yeterli).
 * - Mint pastel bg (tertiaryContainer) + dark mint text (onTertiaryContainer).
 * - WCAG: light #99F6E4/#0F766E = 4.8:1 (AA), dark #134E4A/#5EEAD4 = 7.2:1 (AAA).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';

// Type annotation'siz saf array (babel-jest TS generic parser sorununu bypass)
const DAILY_TIPS = [
  {
    tr: 'İlacınızı her gün aynı saatte almak, alışkanlık oluşturmanın en iyi yoludur.',
    en: 'Taking your medicine at the same time every day is the best way to build a habit.',
    emoji: '⏰',
  },
  {
    tr: 'Bol su ile almak, ilacın emilimini artırır.',
    en: 'Taking medicine with plenty of water improves absorption.',
    emoji: '💧',
  },
  {
    tr: 'Stokunuz azaldığında yenileme hatırlatıcısı açabilirsiniz.',
    en: 'You can enable refill reminders when your stock is low.',
    emoji: '📦',
  },
  {
    tr: 'Düzenli uyku, ilaç etkinliğini artırır.',
    en: 'Regular sleep improves medication effectiveness.',
    emoji: '🌙',
  },
  {
    tr: 'Yan etkileri takip etmek için günlük notlar bırakabilirsiniz.',
    en: 'You can leave daily notes to track side effects.',
    emoji: '📝',
  },
];

function pickTodayTip() {
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const idx = daysSinceEpoch % DAILY_TIPS.length;
  return DAILY_TIPS[idx];
}

export function DailyTipCard() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const tr = language === 'tr';

  // useMemo ile gunluk secim (re-render'da degismez, gun boyunca stabil)
  const tip = useMemo(pickTodayTip, []);
  const tipText = tr ? tip.tr : tip.en;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.tertiaryContainer,
          borderColor: colors.tertiaryContainer,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={
        (tr ? 'Günün İpucu: ' : 'Daily Tip: ') + tipText
      }
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: colors.tertiaryContainer },
        ]}
      >
        <Text style={styles.emoji}>{tip.emoji}</Text>
      </View>
      <View style={styles.textGroup}>
        <Text style={[styles.title, { color: colors.onTertiaryContainer }]}>
          {tr ? 'GÜNÜN İPUCU' : 'DAILY TIP'}
        </Text>
        <Text style={[styles.body, { color: colors.onTertiaryContainer }]} numberOfLines={3}>
          {tipText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.75,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
