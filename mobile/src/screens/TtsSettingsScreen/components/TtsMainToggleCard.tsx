/**
 * TtsMainToggleCard — Ana Sesli Bildirim Aç/Kapa Kartı
 */

import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface TtsMainToggleCardProps {
  ttsEnabled: boolean;
  onToggleTts: (enabled: boolean) => void;
  colors: ThemeColors;
  language: string;
}

export function TtsMainToggleCard({
  ttsEnabled,
  onToggleTts,
  colors,
  language,
}: TtsMainToggleCardProps) {
  const isTr = language === 'tr';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconBg,
            {
              backgroundColor: ttsEnabled
                ? 'rgba(13, 148, 136, 0.12)'
                : 'rgba(148, 163, 184, 0.12)',
            },
          ]}
        >
          <Text style={styles.iconText}>{ttsEnabled ? '🔊' : '🔇'}</Text>
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isTr ? 'Sesli Hatırlatıcı (TTS)' : 'Voice Reminder (TTS)'}
          </Text>
          <Text
            style={[styles.cardSubtitle, { color: ttsEnabled ? '#10B981' : colors.textSecondary }]}
          >
            {ttsEnabled
              ? isTr
                ? '● Aktif — Alarmlarda sesli duyuru yapılacak'
                : '● Active — Voice announcements enabled'
              : isTr
                ? '○ Kapalı — Sadece standart alarm çalacak'
                : '○ Disabled — Standard alarms only'}
          </Text>
        </View>

        <Switch
          value={ttsEnabled}
          onValueChange={onToggleTts}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
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
  cardHeaderText: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
});
