/**
 * PeriodSelector — Haftalık / Aylık dönem seçim bileşeni
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { withAlpha, ALPHA } from '../../../utils/colors';
import type { Period } from '../helpers';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { TranslationKey } from '../../../contexts/LanguageContext';

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onSelectPeriod: (period: Period) => void;
  colors: ThemeColors;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export function PeriodSelector({ selectedPeriod, onSelectPeriod, colors, t }: PeriodSelectorProps) {
  return (
    <View style={styles.periodSelector}>
      <TouchableOpacity
        style={[
          styles.periodButton,
          {
            backgroundColor:
              selectedPeriod === 'weekly' ? withAlpha(colors.primary, ALPHA.wash) : 'transparent',
          },
          selectedPeriod === 'weekly' && { borderColor: colors.primary, borderWidth: 1 },
        ]}
        onPress={() => onSelectPeriod('weekly')}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedPeriod === 'weekly' }}
        accessibilityLabel={t('stats_weekly')}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={selectedPeriod === 'weekly' ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.periodButtonText,
            { color: selectedPeriod === 'weekly' ? colors.primary : colors.textSecondary },
          ]}
        >
          {t('stats_weekly')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.periodButton,
          {
            backgroundColor:
              selectedPeriod === 'monthly' ? withAlpha(colors.primary, ALPHA.wash) : 'transparent',
          },
          selectedPeriod === 'monthly' && { borderColor: colors.primary, borderWidth: 1 },
        ]}
        onPress={() => onSelectPeriod('monthly')}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedPeriod === 'monthly' }}
        accessibilityLabel={t('stats_monthly')}
      >
        <Ionicons
          name="calendar"
          size={18}
          color={selectedPeriod === 'monthly' ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.periodButtonText,
            { color: selectedPeriod === 'monthly' ? colors.primary : colors.textSecondary },
          ]}
        >
          {t('stats_monthly')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
