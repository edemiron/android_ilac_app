/**
 * TtsOptionsCard — Ne Söylensin? (İlaç Adı, Dozaj, Talimatlar)
 */

import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface TtsOptionsCardProps {
  ttsSpeakMedicineName: boolean;
  onToggleSpeakName: (enabled: boolean) => void;
  ttsSpeakDosage: boolean;
  onToggleSpeakDosage: (enabled: boolean) => void;
  ttsSpeakInstructions: boolean;
  onToggleSpeakInstructions: (enabled: boolean) => void;
  colors: ThemeColors;
  language: string;
}

export function TtsOptionsCard({
  ttsSpeakMedicineName,
  onToggleSpeakName,
  ttsSpeakDosage,
  onToggleSpeakDosage,
  ttsSpeakInstructions,
  onToggleSpeakInstructions,
  colors,
  language,
}: TtsOptionsCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBgInfo}>
          <Text style={styles.iconText}>📝</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {language === 'tr' ? 'Ne Söylensin?' : 'What to Speak?'}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.optionRow}>
        <Text style={[styles.optionText, { color: colors.text }]}>
          {language === 'tr' ? '💊 İlaç Adı' : '💊 Medicine Name'}
        </Text>
        <Switch
          value={ttsSpeakMedicineName}
          onValueChange={onToggleSpeakName}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={[styles.optionText, { color: colors.text }]}>
          {language === 'tr' ? '💉 Dozaj' : '💉 Dosage'}
        </Text>
        <Switch
          value={ttsSpeakDosage}
          onValueChange={onToggleSpeakDosage}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={[styles.optionText, { color: colors.text }]}>
          {language === 'tr' ? '📋 Talimatlar' : '📋 Instructions'}
        </Text>
        <Switch
          value={ttsSpeakInstructions}
          onValueChange={onToggleSpeakInstructions}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
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
  iconBgInfo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
