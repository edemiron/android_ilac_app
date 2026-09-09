/**
 * TtsHeader — Sesli Bildirimler Modern Klinik Başlık Bileşeni
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface TtsHeaderProps {
  onBack: () => void;
  colors: ThemeColors;
  language: string;
}

export function TtsHeader({ onBack, colors, language }: TtsHeaderProps) {
  const isTr = language === 'tr';

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={onBack}
        activeOpacity={0.75}
        accessibilityLabel={isTr ? 'Geri Dön' : 'Go Back'}
      >
        <Icon name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isTr ? 'Sesli Bildirimler (TTS)' : 'Voice Notifications (TTS)'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {isTr
            ? 'Alarm ve hatırlatmalarda akıllı sesli okuma motoru'
            : 'Smart voice engine for medicine alarms'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
