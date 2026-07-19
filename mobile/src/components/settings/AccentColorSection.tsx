/**
 * AccentColorSection — Sprint 63.
 *
 * 6 accent palette seçici (Ocean/Sunset/Forest/Lavender/Cherry/Mint).
 * Ayarlar > Görünüm > Accent Color bölümünde görünür.
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
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { profile, setAccentColor } = useUserProfile();
  const tr = language === 'tr';

  return (
    <SettingsSection icon="color-fill-outline" title={tr ? 'Vurgu Rengi' : 'Accent Color'}>
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
                  borderColor: isSelected ? colors.text : 'transparent',
                },
              ]}
              onPress={() => setAccentColor(palette.id as AccentId)}
              accessibilityRole="button"
              accessibilityLabel={
                `${tr ? 'Vurgu rengi' : 'Accent color'}: ${tr ? palette.nameTr : palette.nameEn}` +
                (isSelected ? `, ${tr ? 'seçili' : 'selected'}` : '')
              }
              accessibilityState={{ selected: isSelected }}
            >
              {isSelected && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {tr
          ? 'Aktif: ' + (ACCENT_LIST.find(p => p.id === profile.accentColor)?.nameTr ?? '')
          : 'Active: ' + (ACCENT_LIST.find(p => p.id === profile.accentColor)?.nameEn ?? '')}
      </Text>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  hint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
