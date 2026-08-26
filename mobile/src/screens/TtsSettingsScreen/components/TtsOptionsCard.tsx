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
  const isTr = language === 'tr';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
          <Text style={styles.iconText}>📝</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isTr ? 'Ne Söylensin?' : 'What to Announce?'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {isTr
              ? 'Duyuruda yer alacak detayları seçin'
              : 'Choose details included in the voice alert'}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider || 'rgba(0,0,0,0.06)' }]} />

      {/* 1. İlaç Adı */}
      <View style={styles.optionRow}>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>
            {isTr ? '💊 İlaç Adı' : '💊 Medicine Name'}
          </Text>
          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
            {isTr ? 'Örn: "Aspirin"' : 'e.g. "Aspirin"'}
          </Text>
        </View>
        <Switch
          value={ttsSpeakMedicineName}
          onValueChange={onToggleSpeakName}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 2. Dozaj */}
      <View style={styles.optionRow}>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>
            {isTr ? '💉 Dozaj Bilgisi' : '💉 Dosage Amount'}
          </Text>
          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
            {isTr ? 'Örn: "500 miligram"' : 'e.g. "500 milligrams"'}
          </Text>
        </View>
        <Switch
          value={ttsSpeakDosage}
          onValueChange={onToggleSpeakDosage}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 3. Talimatlar */}
      <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>
            {isTr ? '🍽️ Kullanım Talimatı' : '🍽️ Usage Instructions'}
          </Text>
          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
            {isTr ? 'Örn: "Tok karnına alınız"' : 'e.g. "Take after meal"'}
          </Text>
        </View>
        <Switch
          value={ttsSpeakInstructions}
          onValueChange={onToggleSpeakInstructions}
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
  headerTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  optionInfo: {
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
});
