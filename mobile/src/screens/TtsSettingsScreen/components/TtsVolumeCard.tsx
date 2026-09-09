/**
 * TtsVolumeCard — Ses Seviyesi Göstergesi ve Ayar Çubuğu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface TtsVolumeCardProps {
  ttsVolume: number;
  onVolumeChange: (delta: number) => void;
  colors: ThemeColors;
  language: string;
}

export function TtsVolumeCard({ ttsVolume, onVolumeChange, colors, language }: TtsVolumeCardProps) {
  const isTr = language === 'tr';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: 'rgba(236, 72, 153, 0.12)' }]}>
          <Text style={styles.iconText}>🔊</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isTr ? 'Ses Seviyesi' : 'Volume Level'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {isTr ? 'Duyuru sesinin hoparlör çıkış gücü' : 'Speaker loudness for voice alerts'}
          </Text>
        </View>
        <View style={[styles.volumeBadge, { backgroundColor: 'rgba(13, 148, 136, 0.10)' }]}>
          <Text style={[styles.volumePercent, { color: colors.primary }]}>%{ttsVolume}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider || 'rgba(0,0,0,0.06)' }]} />

      <View style={styles.sliderContainer}>
        <TouchableOpacity
          style={[
            styles.sliderButton,
            {
              backgroundColor: colors.surfaceContainerLow || colors.background,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onVolumeChange(-10)}
          activeOpacity={0.75}
          disabled={ttsVolume <= 0}
        >
          <Text
            style={[
              styles.sliderButtonText,
              { color: ttsVolume <= 0 ? colors.textSecondary : colors.text },
            ]}
          >
            −
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.sliderTrack,
            { backgroundColor: colors.surfaceContainerLow || colors.background },
          ]}
        >
          <View
            style={[
              styles.sliderFill,
              {
                width: `${Math.max(0, Math.min(100, ttsVolume))}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sliderButton,
            {
              backgroundColor: colors.surfaceContainerLow || colors.background,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onVolumeChange(10)}
          activeOpacity={0.75}
          disabled={ttsVolume >= 100}
        >
          <Text
            style={[
              styles.sliderButtonText,
              { color: ttsVolume >= 100 ? colors.textSecondary : colors.text },
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
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
  volumeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  volumePercent: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  sliderTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 7,
  },
});
