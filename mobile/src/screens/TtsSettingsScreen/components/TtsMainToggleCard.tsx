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
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBgSuccess}>
          <Text style={styles.iconText}>🔔</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {language === 'tr' ? 'Sesli Bildirim' : 'Voice Notification'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {ttsEnabled
              ? language === 'tr'
                ? 'Aktif'
                : 'Enabled'
              : language === 'tr'
                ? 'Pasif'
                : 'Disabled'}
          </Text>
        </View>
        <Switch
          value={ttsEnabled}
          onValueChange={onToggleTts}
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
  iconBgSuccess: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
