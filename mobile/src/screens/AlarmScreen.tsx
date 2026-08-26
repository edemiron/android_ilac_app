/**
 * AlarmScreen — Tam Ekran İlaç Alarmı Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm ses, titreşim, TTS sesli okuma, phantom kontrolü ve bildirim yönetimi
 * `useAlarmController` Presenter Hook'una devredilmiştir. Bu dosya yalnızca UI düzeninden sorumludur.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SkipReasonModal } from '../components/common/SkipReasonModal';
import { VoiceCommandModal } from '../components/common/VoiceCommandModal';

// Alt Bileşenler (Modular UI)
import { AlarmTimeHeader } from './AlarmScreen/components/AlarmTimeHeader';
import { AlarmMedicineCard } from './AlarmScreen/components/AlarmMedicineCard';
import { AlarmActionButtons } from './AlarmScreen/components/AlarmActionButtons';

// Presenter Hook
import { useAlarmController } from './AlarmScreen/hooks/useAlarmController';

export default function AlarmScreen() {
  const {
    navigation,
    medicine,
    isTestMode,
    t,
    language,
    currentTime,
    currentDate,
    instructionDisplayText,
    pulseAnim,
    canSnooze,
    remainingSnoozes,
    snoozeDuration,
    skipModalVisible,
    setSkipModalVisible,
    voiceModalVisible,
    setVoiceModalVisible,
    handleTake,
    handleSkip,
    handleConfirmSkip,
    handleSnooze,
    handleVoiceCommand,
  } = useAlarmController();

  // İlaç bulunamadığında fallback ekranı
  if (!medicine) {
    if (!isTestMode) {
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }, 500);
    }

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={styles.errorText}>
          {language === 'tr'
            ? 'İlaç bulunamadı, ana ekrana dönülüyor...'
            : 'Medicine not found, returning to home...'}
        </Text>
        <TouchableOpacity
          style={styles.fallbackHomeBtn}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }}
        >
          <Text style={styles.fallbackHomeBtnText}>
            {language === 'tr' ? 'Ana Ekrana Dön' : 'Go to Home'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: medicine.color }]}>
      {/* 1. Üst Kısım: Dijital Saat & Tarih */}
      <AlarmTimeHeader currentTime={currentTime} currentDate={currentDate} />

      {/* 2. Orta Kısım: Animasyonlu İlaç Bilgi Kartı */}
      <AlarmMedicineCard
        medicine={medicine}
        pulseAnim={pulseAnim}
        instructionDisplayText={instructionDisplayText}
        t={t}
      />

      {/* 3. Alt Kısım: Eylem Butonları */}
      <AlarmActionButtons
        canSnooze={canSnooze}
        remainingSnoozes={remainingSnoozes}
        snoozeDuration={snoozeDuration}
        language={language}
        t={t}
        onTake={handleTake}
        onSnooze={handleSnooze}
        onVoiceReply={() => setVoiceModalVisible(true)}
        onSkip={handleSkip}
      />

      {/* İlaç Atlama Nedeni Modalı */}
      <SkipReasonModal
        visible={skipModalVisible}
        medicineName={medicine.name}
        onConfirm={handleConfirmSkip}
        onCancel={() => setSkipModalVisible(false)}
      />

      {/* Sesli Komut Modalı */}
      <VoiceCommandModal
        visible={voiceModalVisible}
        onCommandRecognized={handleVoiceCommand}
        onClose={() => setVoiceModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 50,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
  },
  fallbackHomeBtn: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
  },
  fallbackHomeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
