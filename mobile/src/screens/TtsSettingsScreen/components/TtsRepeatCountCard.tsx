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
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBgWarning}>
          <Text style={styles.iconText}>🔁</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {language === 'tr' ? 'Tekrar Sayısı' : 'Repeat Count'}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.repeatContainer}>
        {[1, 2, 3].map(count => {
          const isActive = ttsRepeatCount === count;

          return (
            <TouchableOpacity
              key={count}
              style={[
                styles.repeatButton,
                {
                  backgroundColor: isActive ? colors.primary : colors.surfaceContainerLow,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectRepeatCount(count)}
            >
              <Text
                style={[
                  styles.repeatButtonText,
                  { color: isActive ? colors.textOnPrimary : colors.text },
                ]}
              >
                {count}x
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
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBgWarning: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  repeatContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  repeatButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
