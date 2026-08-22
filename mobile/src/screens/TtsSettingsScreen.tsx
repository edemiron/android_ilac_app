/**
 * TtsSettingsScreen — Sesli Bildirimler ve TTS Ayarları Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm TTS motoru döngüleri, ses seviyesi ve ayar mutasyonları `useTtsSettingsController`
 * Presenter Hook'una aktarılmıştır. Bu dosya yalnızca layout organizasyonundan sorumludur.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// Alt Bileşenler (Modular UI)
import { TtsMainToggleCard } from './TtsSettingsScreen/components/TtsMainToggleCard';
import { TtsOptionsCard } from './TtsSettingsScreen/components/TtsOptionsCard';
import { TtsRepeatCountCard } from './TtsSettingsScreen/components/TtsRepeatCountCard';
import { TtsVolumeCard } from './TtsSettingsScreen/components/TtsVolumeCard';
import { TtsPreviewCard } from './TtsSettingsScreen/components/TtsPreviewCard';

// Presenter Hook
import { useTtsSettingsController } from './TtsSettingsScreen/hooks/useTtsSettingsController';

export default function TtsSettingsScreen() {
  const {
    language,
    colors,
    insets,
    ttsEnabled,
    ttsSpeakMedicineName,
    ttsSpeakDosage,
    ttsSpeakInstructions,
    ttsRepeatCount,
    ttsVolume,
    isTesting,
    handleToggleTts,
    handleToggleSpeakName,
    handleToggleSpeakDosage,
    handleToggleSpeakInstructions,
    handleVolumeChange,
    handleRepeatCountChange,
    handleTestVoice,
  } = useTtsSettingsController();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Başlık */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
          <Text style={styles.headerIcon}>🔊</Text>
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {language === 'tr' ? 'Sesli Bildirimler' : 'Voice Notifications'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {language === 'tr'
            ? 'Alarm sırasında ilaç bilgilerini sesli olarak duyurun'
            : 'Announce medicine information during alarms'}
        </Text>
      </View>

      {/* 2. Ana Sesli Bildirim Aç/Kapa Kartı */}
      <TtsMainToggleCard
        ttsEnabled={ttsEnabled}
        onToggleTts={handleToggleTts}
        colors={colors}
        language={language}
      />

      {ttsEnabled && (
        <>
          {/* 3. Ne Söylensin? (İlaç Adı / Dozaj / Talimatlar) */}
          <TtsOptionsCard
            ttsSpeakMedicineName={ttsSpeakMedicineName}
            onToggleSpeakName={handleToggleSpeakName}
            ttsSpeakDosage={ttsSpeakDosage}
            onToggleSpeakDosage={handleToggleSpeakDosage}
            ttsSpeakInstructions={ttsSpeakInstructions}
            onToggleSpeakInstructions={handleToggleSpeakInstructions}
            colors={colors}
            language={language}
          />

          {/* 4. Tekrar Sayısı (1x / 2x / 3x) */}
          <TtsRepeatCountCard
            ttsRepeatCount={ttsRepeatCount}
            onSelectRepeatCount={handleRepeatCountChange}
            colors={colors}
            language={language}
          />

          {/* 5. Ses Seviyesi (%0 - %100) */}
          <TtsVolumeCard
            ttsVolume={ttsVolume}
            onVolumeChange={handleVolumeChange}
            colors={colors}
            language={language}
          />

          {/* 6. Önizleme Metni & Ses Testi */}
          <TtsPreviewCard
            ttsSpeakMedicineName={ttsSpeakMedicineName}
            ttsSpeakDosage={ttsSpeakDosage}
            ttsSpeakInstructions={ttsSpeakInstructions}
            isTesting={isTesting}
            onTestVoice={handleTestVoice}
            colors={colors}
            language={language}
          />
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerIcon: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
