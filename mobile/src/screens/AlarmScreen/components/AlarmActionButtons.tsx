/**
 * AlarmActionButtons — Alarm ekranı eylem butonları (Aldım, Ertele, Sesli Yanıtla, Atla)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { TranslationKey } from '../../../contexts/LanguageContext';

interface AlarmActionButtonsProps {
  canSnooze: boolean;
  remainingSnoozes: number;
  snoozeDuration: number;
  language: string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  onTake: () => void;
  onSnooze: () => void;
  onVoiceReply: () => void;
  onSkip: () => void;
}

export function AlarmActionButtons({
  canSnooze,
  remainingSnoozes,
  snoozeDuration,
  language,
  t,
  onTake,
  onSnooze,
  onVoiceReply,
  onSkip,
}: AlarmActionButtonsProps) {
  const durationLabel =
    snoozeDuration < 1
      ? `${Math.round(snoozeDuration * 60)} ${language === 'tr' ? 'sn' : 'sec'}`
      : `${snoozeDuration} ${language === 'tr' ? 'dk' : 'min'}`;

  const snoozeButtonLabel = (() => {
    if (!canSnooze) {
      return `❌ ${language === 'tr' ? 'Erteleme hakkın bitti' : 'No snoozes left'}`;
    }
    if (remainingSnoozes === 1) {
      return `⚠️ ${language === 'tr' ? 'Ertele — Son hak! (İlaç atlanır)' : 'Snooze — Last chance! (Medicine skipped)'}`;
    }
    return `⏰ ${durationLabel} ${language === 'tr' ? 'ertele' : 'snooze'} — ${language === 'tr' ? `${remainingSnoozes} hak` : `${remainingSnoozes} left`}`;
  })();

  return (
    <View style={styles.actionSection}>
      {/* Ana buton - Aldım */}
      <TouchableOpacity style={styles.takeButton} onPress={onTake} activeOpacity={0.8}>
        <Text style={styles.takeButtonIcon}>✓</Text>
        <Text style={styles.takeButtonText}>{t('alarm_take_now')}</Text>
      </TouchableOpacity>

      {/* Erteleme butonu */}
      <TouchableOpacity
        style={[styles.snoozeButton, !canSnooze && styles.snoozeButtonDisabled]}
        onPress={onSnooze}
        activeOpacity={0.8}
      >
        <Text style={[styles.snoozeButtonText, !canSnooze && styles.snoozeButtonTextDisabled]}>
          {snoozeButtonLabel}
        </Text>
      </TouchableOpacity>

      {/* Sesli Komut butonu */}
      <TouchableOpacity style={styles.voiceButton} onPress={onVoiceReply} activeOpacity={0.8}>
        <Ionicons name="mic-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.voiceButtonText}>
          {language === 'tr'
            ? 'Sesle Yanıtla ("Aldım" / "Ertele")'
            : 'Voice Reply ("Taken" / "Snooze")'}
        </Text>
      </TouchableOpacity>

      {/* Atla butonu */}
      <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.8}>
        <Text style={styles.skipButtonText}>{language === 'tr' ? 'İlacı Atla' : 'Skip Dose'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionSection: {
    paddingHorizontal: 30,
  },
  takeButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  takeButtonIcon: {
    fontSize: 24,
    color: '#4ECDC4',
    marginRight: 10,
  },
  takeButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  snoozeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  snoozeButtonDisabled: {
    backgroundColor: 'rgba(100,100,100,0.3)',
  },
  snoozeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  snoozeButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  skipButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(78, 205, 196, 0.25)',
    borderWidth: 1,
    borderColor: '#4ECDC4',
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 4,
  },
  voiceButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
