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
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBgVolume}>
          <Text style={styles.iconText}>🔊</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {language === 'tr' ? 'Ses Seviyesi' : 'Volume Level'}
        </Text>
        <Text style={[styles.volumePercent, { color: colors.primary }]}>{ttsVolume}%</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.sliderContainer}>
        <TouchableOpacity
          style={[
            styles.sliderButton,
            { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border },
          ]}
          onPress={() => onVolumeChange(-10)}
        >
          <Text style={[styles.sliderButtonText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>

        <View style={[styles.sliderTrack, { backgroundColor: colors.surfaceContainerLow }]}>
          <View
            style={[styles.sliderFill, { width: `${ttsVolume}%`, backgroundColor: colors.primary }]}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sliderButton,
            { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border },
          ]}
          onPress={() => onVolumeChange(10)}
        >
          <Text style={[styles.sliderButtonText, { color: colors.text }]}>+</Text>
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
  iconBgVolume: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FCE4EC',
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
    flex: 1,
  },
  volumePercent: {
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 6,
  },
});
