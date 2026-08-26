/**
 * AccentColorSection — 6 Klinik Vurgu Rengi Seçici
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingsSection } from './SettingsSection';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { ACCENT_LIST, AccentId } from '../../theme/palettes';

export function AccentColorSection() {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { profile, setAccentColor } = useUserProfile();
  const isTr = language === 'tr';

  const activePalette = ACCENT_LIST.find(p => p.id === profile.accentColor);

  return (
    <SettingsSection icon="color-filter" title={isTr ? 'KLİNİK VURGU RENGİ' : 'ACCENT COLOR'}>
      <View style={styles.container}>
        <View style={styles.grid}>
          {ACCENT_LIST.map(palette => {
            const isSelected = profile.accentColor === palette.id;
            return (
              <TouchableOpacity
                key={palette.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: palette.preview,
                    borderColor: isSelected ? colors.text : 'rgba(0,0,0,0.1)',
                    transform: [{ scale: isSelected ? 1.08 : 1 }],
                  },
                ]}
                onPress={() => setAccentColor(palette.id as AccentId)}
                accessibilityRole="button"
                accessibilityLabel={
                  `${isTr ? 'Vurgu rengi' : 'Accent color'}: ${isTr ? palette.nameTr : palette.nameEn}` +
                  (isSelected ? `, ${isTr ? 'seçili' : 'selected'}` : '')
                }
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.8}
              >
                {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {activePalette && (
          <View
            style={[
              styles.activePill,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: activePalette.preview }]} />
            <Text style={[styles.hint, { color: colors.text }]}>
              {isTr ? activePalette.nameTr : activePalette.nameEn}
            </Text>
          </View>
        )}
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 10,
  },
  chip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hint: {
    fontSize: 12,
    fontWeight: '700',
  },
});
