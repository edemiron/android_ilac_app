/**
 * TtsPreviewCard — Canlı Ses Kontrol Merkezi & Canlı Test Oynatıcısı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface TtsPreviewCardProps {
  ttsSpeakMedicineName: boolean;
  ttsSpeakDosage: boolean;
  ttsSpeakInstructions: boolean;
  ttsSpeechRate: number;
  ttsVolume: number;
  isTesting: boolean;
  onTestVoice: () => void;
  colors: ThemeColors;
  language: string;
}

export function TtsPreviewCard({
  ttsSpeakMedicineName,
  ttsSpeakDosage,
  ttsSpeakInstructions,
  ttsSpeechRate,
  ttsVolume,
  isTesting,
  onTestVoice,
  colors,
  language,
}: TtsPreviewCardProps) {
  const isTr = language === 'tr';

  const getSpeedLabel = (rate: number) => {
    if (rate <= 0.98) return isTr ? '🐢 Sakin' : '🐢 Calm';
    if (rate >= 1.22) return isTr ? '⚡ Hızlı' : '⚡ Fast';
    return isTr ? '⏱️ Normal' : '⏱️ Normal';
  };

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: colors.card,
          borderColor: isTesting ? colors.primary : colors.border,
        },
      ]}
    >
      {/* Üst Durum Rozetleri */}
      <View style={styles.topBadgeRow}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isTesting ? 'rgba(16, 185, 129, 0.12)' : 'rgba(13, 148, 136, 0.10)',
            },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: isTesting ? '#10B981' : colors.primary }]}
          />
          <Text style={[styles.statusText, { color: isTesting ? '#10B981' : colors.primary }]}>
            {isTesting
              ? isTr
                ? 'Canlı Ses Çalıyor...'
                : 'Playing Sample...'
              : isTr
                ? 'Akıllı Ses Motoru Hazır'
                : 'Speech Engine Ready'}
          </Text>
        </View>

        <View style={styles.metaBadges}>
          <View
            style={[
              styles.badgePill,
              { backgroundColor: colors.surfaceContainerLow || colors.background },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              {getSpeedLabel(ttsSpeechRate)}
            </Text>
          </View>
          <View
            style={[
              styles.badgePill,
              { backgroundColor: colors.surfaceContainerLow || colors.background },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>🔊 %{ttsVolume}</Text>
          </View>
        </View>
      </View>

      {/* Ses Dalgaları Görseli (Waveform Simulator) */}
      <View style={styles.waveformContainer}>
        {[8, 16, 24, 14, 20, 28, 18, 12, 22, 16].map((height, index) => (
          <View
            key={index}
            style={[
              styles.waveBar,
              {
                height: isTesting ? height * 1.3 : 10,
                backgroundColor: isTesting ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Canlı Okunacak Örnek Cümle Kutusu */}
      <View
        style={[
          styles.quoteBox,
          { backgroundColor: colors.surfaceContainerLow || colors.background },
        ]}
      >
        <Text style={[styles.quoteLabel, { color: colors.primary }]}>
          {isTr ? 'Örnek Duyuru Metni:' : 'Sample Speech Announcement:'}
        </Text>
        <Text style={[styles.quoteText, { color: colors.text }]}>
          "{isTr ? 'İlaç zamanı!' : 'Medicine time!'}
          {ttsSpeakMedicineName && (isTr ? ' Aspirin,' : ' Aspirin,')}
          {ttsSpeakDosage && (isTr ? ' 500 miligram.' : ' 500 milligrams.')}
          {ttsSpeakInstructions && (isTr ? ' Tok karnına alınız.' : ' Take after meal.')}"
        </Text>
      </View>

      {/* Test / Oynat Butonu */}
      <TouchableOpacity
        style={[
          styles.playButton,
          {
            backgroundColor: isTesting ? '#EF4444' : colors.primary,
          },
        ]}
        onPress={onTestVoice}
        activeOpacity={0.85}
      >
        <Icon name={isTesting ? 'stop-circle' : 'play-circle'} size={22} color="#FFFFFF" />
        <Text style={styles.playButtonText}>
          {isTesting
            ? isTr
              ? 'Seslendirmeyi Durdur'
              : 'Stop Speaking'
            : isTr
              ? 'Sesi Canlı Test Et (Hoparlör)'
              : 'Test Voice (Speaker)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 38,
    marginBottom: 14,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  quoteBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
