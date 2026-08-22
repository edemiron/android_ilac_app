import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { checkInteractionLocal, DrugInteraction } from '../../services/drugInteraction';
import { Medicine } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

interface DrugInteractionWarningBannerProps {
  currentName: string;
  existingMedicines: Medicine[];
}

export function DrugInteractionWarningBanner({
  currentName,
  existingMedicines,
}: DrugInteractionWarningBannerProps) {
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const isTr = language === 'tr';

  const interactions = useMemo((): { interaction: DrugInteraction; otherMedicine: Medicine }[] => {
    if (!currentName || currentName.trim().length < 3) return [];

    const results: { interaction: DrugInteraction; otherMedicine: Medicine }[] = [];

    for (const med of existingMedicines) {
      if (!med.name || !med.isActive) continue;
      const found = checkInteractionLocal(currentName, med.name);
      if (found) {
        results.push({ interaction: found, otherMedicine: med });
      }
    }

    return results;
  }, [currentName, existingMedicines]);

  if (interactions.length === 0) return null;

  return (
    <View style={styles.container}>
      {interactions.map(({ interaction, otherMedicine }, idx) => {
        const isHigh = interaction.severity === 'high';
        const color = isHigh ? (isDark ? '#F87171' : '#EF4444') : isDark ? '#FBBF24' : '#F59E0B';
        const bg = isHigh ? (isDark ? '#7F1D1D' : '#FEE2E2') : isDark ? '#78350F' : '#FEF3C7';
        const textColor = isHigh
          ? isDark
            ? '#FECACA'
            : '#991B1B'
          : isDark
            ? '#FEF3C7'
            : '#92400E';

        return (
          <View
            key={interaction.id || `int-${idx}`}
            style={[styles.banner, { backgroundColor: bg, borderColor: color }]}
          >
            <View style={styles.header}>
              <Ionicons
                name={isHigh ? 'alert-circle' : 'warning'}
                size={20}
                color={color}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.title, { color: textColor }]}>
                {isHigh
                  ? isTr
                    ? 'YÜKSEK RİSKLİ İLAÇ ETKİLEŞİMİ'
                    : 'HIGH RISK DRUG INTERACTION'
                  : isTr
                    ? 'İLAÇ ETKİLEŞİMİ DİKKAT'
                    : 'DRUG INTERACTION WARNING'}
              </Text>
            </View>

            <Text style={[styles.conflictText, { color: textColor }]}>
              {isTr
                ? `Bu ilaç, listenizdeki "${otherMedicine.name}" ile etkileşime girebilir.`
                : `This medicine may interact with "${otherMedicine.name}" in your list.`}
            </Text>

            <Text style={[styles.description, { color: textColor }]}>
              {interaction.description}
            </Text>

            {interaction.recommendation && (
              <Text style={[styles.recommendation, { color: textColor }]}>
                👨‍⚕️ {interaction.recommendation}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  banner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  conflictText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  recommendation: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 2,
  },
});
