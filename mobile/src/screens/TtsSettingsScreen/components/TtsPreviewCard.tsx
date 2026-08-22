/**
 * TtsPreviewCard — Canlı Önizleme Metni ve Ses Testi Butonu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface TtsPreviewCardProps {
  ttsSpeakMedicineName: boolean;
  ttsSpeakDosage: boolean;
  ttsSpeakInstructions: boolean;
  isTesting: boolean;
  onTestVoice: () => void;
  colors: ThemeColors;
  language: string;
}

export function TtsPreviewCard({
  ttsSpeakMedicineName,
  ttsSpeakDosage,
  ttsSpeakInstructions,
  isTesting,
  onTestVoice,
  colors,
  language,
}: TtsPreviewCardProps) {
  return (
    <>
      {/* Test Button */}
      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: isTesting ? '#EF4444' : colors.primary }]}
        onPress={onTestVoice}
        activeOpacity={0.8}
      >
        <Text style={[styles.testButtonText, { color: colors.textOnPrimary }]}>
          {isTesting ? '⏹️ ' : '▶️ '}
          {isTesting
            ? language === 'tr'
              ? 'Durdur'
              : 'Stop'
            : language === 'tr'
              ? 'Sesi Test Et'
              : 'Test Voice'}
        </Text>
      </TouchableOpacity>

      {/* Preview Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBgPreview}>
            <Text style={styles.iconText}>👁️</Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {language === 'tr' ? 'Önizleme' : 'Preview'}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.previewContent}>
          <Text style={[styles.previewQuote, { color: colors.primary }]}>"</Text>
          <Text style={[styles.previewText, { color: colors.text }]}>
            {language === 'tr' ? 'İlaç zamanı! ' : 'Medicine time! '}
            {ttsSpeakMedicineName && (language === 'tr' ? 'Aspirin, ' : 'Aspirin, ')}
            {ttsSpeakDosage && '500mg. '}
            {ttsSpeakInstructions &&
              (language === 'tr' ? 'Yemekten sonra alınız.' : 'Take after meal.')}
          </Text>
          <Text style={[styles.previewQuote, { color: colors.primary }]}>"</Text>
        </View>
      </View>
    </>
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
  iconBgPreview: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8EAF6',
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
  testButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  previewQuote: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
  previewText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    paddingHorizontal: 6,
  },
});
