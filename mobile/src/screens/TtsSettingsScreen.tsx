/**
 * TtsSettingsScreen — Sesli Bildirimler ve TTS Ayarları Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm TTS motoru döngüleri, konuşma hızı, ses seviyesi ve ayar mutasyonları
 * `useTtsSettingsController` Presenter Hook'una aktarılmıştır.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular UI)
import {
  TtsHeader,
  TtsMainToggleCard,
  TtsPreviewCard,
  TtsSpeechRateCard,
  TtsVolumeCard,
  TtsOptionsCard,
  TtsRepeatCountCard,
  useTtsSettingsController,
} from './TtsSettingsScreen/index';

export default function TtsSettingsScreen() {
  const {
    language,
    colors,
    ttsEnabled,
    ttsSpeakMedicineName,
    ttsSpeakDosage,
    ttsSpeakInstructions,
    ttsRepeatCount,
    ttsVolume,
    ttsSpeechRate,
    isTesting,
    handleToggleTts,
    handleToggleSpeakName,
    handleToggleSpeakDosage,
    handleToggleSpeakInstructions,
    handleVolumeChange,
    handleSpeechRateChange,
    handleRepeatCountChange,
    handleTestVoice,
    handleGoBack,
  } = useTtsSettingsController();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* 1. Modern Klinik Üst Başlık & Geri Butonu */}
      <TtsHeader onBack={handleGoBack} colors={colors} language={language} />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. Ana Sesli Bildirim Aç/Kapa Kartı */}
        <TtsMainToggleCard
          ttsEnabled={ttsEnabled}
          onToggleTts={handleToggleTts}
          colors={colors}
          language={language}
        />

        {ttsEnabled && (
          <>
            {/* 3. Hero Ses Kontrol Merkezi & Canlı Test Oynatıcısı */}
            <TtsPreviewCard
              ttsSpeakMedicineName={ttsSpeakMedicineName}
              ttsSpeakDosage={ttsSpeakDosage}
              ttsSpeakInstructions={ttsSpeakInstructions}
              ttsSpeechRate={ttsSpeechRate}
              ttsVolume={ttsVolume}
              isTesting={isTesting}
              onTestVoice={handleTestVoice}
              colors={colors}
              language={language}
            />

            {/* 4. Konuşma Hızı (0.8x Yavaş, 1.0x Normal, 1.2x Hızlı) */}
            <TtsSpeechRateCard
              ttsSpeechRate={ttsSpeechRate}
              onSelectSpeechRate={handleSpeechRateChange}
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

            {/* 6. Ne Söylensin? (İlaç Adı / Dozaj / Talimatlar) */}
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

            {/* 7. Tekrar Sayısı (1x / 2x / 3x) */}
            <TtsRepeatCountCard
              ttsRepeatCount={ttsRepeatCount}
              onSelectRepeatCount={handleRepeatCountChange}
              colors={colors}
              language={language}
            />
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 24,
  },
});
