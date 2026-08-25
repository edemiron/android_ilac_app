/**
 * TtsSpeechRateCard — Konuşma Hızı Seçimi (Sakin 0.9x, Normal 1.1x, Hızlı 1.3x)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface TtsSpeechRateCardProps {
  ttsSpeechRate: number;
  onSelectSpeechRate: (rate: number) => void;
  colors: ThemeColors;
  language: string;
}

interface SpeechRateOption {
  key: string;
  rate: number;
  labelTr: string;
  labelEn: string;
  subTr: string;
  subEn: string;
  icon: string;
}

const SPEED_OPTIONS: SpeechRateOption[] = [
  {
    key: 'slow',
    rate: 0.9,
    labelTr: 'Sakin',
    labelEn: 'Calm',
    subTr: 'Sakin & Net',
    subEn: 'Calm & Clear',
    icon: '🐢',
  },
  {
    key: 'normal',
    rate: 1.1,
    labelTr: 'Normal',
    labelEn: 'Normal',
    subTr: 'Standart Akış',
    subEn: 'Default Pace',
    icon: '⏱️',
  },
  {
    key: 'fast',
    rate: 1.3,
    labelTr: 'Hızlı',
    labelEn: 'Fast',
    subTr: 'Dinamik & Çevik',
    subEn: 'Dynamic & Swift',
    icon: '⚡',
  },
];

export function TtsSpeechRateCard({
  ttsSpeechRate,
  onSelectSpeechRate,
  colors,
  language,
}: TtsSpeechRateCardProps) {
  const isTr = language === 'tr';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
          <Text style={styles.iconText}>⚡</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isTr ? 'Konuşma Hızı' : 'Speech Speed'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {isTr
              ? 'Alarm duyurusunun okunma temposunu belirleyin'
              : 'Set the speaking pace for alarm announcements'}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider || 'rgba(0,0,0,0.06)' }]} />

      <View style={styles.optionsRow}>
        {SPEED_OPTIONS.map(option => {
          // Check closest match
          const isSelected = Math.abs(ttsSpeechRate - option.rate) < 0.12;

          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.rateButton,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surfaceContainerLow || colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectSpeechRate(option.rate)}
              activeOpacity={0.75}
            >
              <Text style={styles.rateIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.rateLabel,
                  {
                    color: isSelected ? colors.textOnPrimary : colors.text,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {isTr ? option.labelTr : option.labelEn}
              </Text>
              <Text
                style={[
                  styles.rateSub,
                  {
                    color: isSelected ? 'rgba(255, 255, 255, 0.85)' : colors.textSecondary,
                  },
                ]}
              >
                {isTr ? option.subTr : option.subEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
  },
  headerTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  rateLabel: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  rateSub: {
    fontSize: 10,
    marginTop: 2,
  },
});
