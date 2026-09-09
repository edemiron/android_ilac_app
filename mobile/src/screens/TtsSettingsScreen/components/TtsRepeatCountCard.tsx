/**
 * TtsRepeatCountCard — Tekrar Sayısı (1x, 2x, 3x) Kartı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface TtsRepeatCountCardProps {
  ttsRepeatCount: number;
  onSelectRepeatCount: (count: number) => void;
  colors: ThemeColors;
  language: string;
}

export function TtsRepeatCountCard({
  ttsRepeatCount,
  onSelectRepeatCount,
  colors,
  language,
}: TtsRepeatCountCardProps) {
  const isTr = language === 'tr';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
          <Text style={styles.iconText}>🔁</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isTr ? 'Tekrar Sayısı' : 'Repeat Count'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {isTr
              ? 'Alarm kapanana kadar duyurunun kaç kez tekrarlanacağı'
              : 'How many times the announcement repeats'}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider || 'rgba(0,0,0,0.06)' }]} />

      <View style={styles.repeatContainer}>
        {[
          { count: 1, labelTr: '1 Kez', labelEn: '1 Time', subTr: 'Tek Okuma', subEn: 'Once' },
          { count: 2, labelTr: '2 Kez', labelEn: '2 Times', subTr: 'Aralıklı', subEn: 'Twice' },
          { count: 3, labelTr: '3 Kez', labelEn: '3 Times', subTr: 'Garanti', subEn: 'Thrice' },
        ].map(item => {
          const isActive = ttsRepeatCount === item.count;

          return (
            <TouchableOpacity
              key={item.count}
              style={[
                styles.repeatButton,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.surfaceContainerLow || colors.background,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectRepeatCount(item.count)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.repeatButtonText,
                  {
                    color: isActive ? colors.textOnPrimary : colors.text,
                    fontWeight: isActive ? '700' : '600',
                  },
                ]}
              >
                {isTr ? item.labelTr : item.labelEn}
              </Text>
              <Text
                style={[
                  styles.repeatSubText,
                  {
                    color: isActive ? 'rgba(255, 255, 255, 0.85)' : colors.textSecondary,
                  },
                ]}
              >
                {isTr ? item.subTr : item.subEn}
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
  repeatContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  repeatButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatButtonText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  repeatSubText: {
    fontSize: 10,
    marginTop: 2,
  },
});
