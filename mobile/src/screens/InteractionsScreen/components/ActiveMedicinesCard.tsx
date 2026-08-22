/**
 * ActiveMedicinesCard — Kontrol Edilen Aktif İlaçların Listesi
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Medicine } from '../../../types';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface ActiveMedicinesCardProps {
  activeMedicines: Medicine[];
  colors: ThemeColors;
}

export function ActiveMedicinesCard({ activeMedicines, colors }: ActiveMedicinesCardProps) {
  return (
    <View style={styles.medicineList}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Aktif İlaçlar</Text>
      <View style={styles.medicineChips}>
        {activeMedicines.map(medicine => (
          <View
            key={medicine.id}
            style={[styles.medicineChip, { backgroundColor: medicine.color + '30' }]}
          >
            <View style={[styles.chipDot, { backgroundColor: medicine.color }]} />
            <Text style={[styles.chipText, { color: colors.text }]}>{medicine.name}</Text>
          </View>
        ))}
        {activeMedicines.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aktif ilaç yok</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  medicineList: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  medicineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medicineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
