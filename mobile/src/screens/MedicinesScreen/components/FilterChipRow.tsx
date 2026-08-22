/**
 * FilterChipRow — İlaç listesi filtre çipleri (Tümü, Aktif, Pasif, Stok Az)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { FilterMode } from '../hooks/useMedicinesController';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface FilterChipRowProps {
  filterMode: FilterMode;
  onSelectFilter: (mode: FilterMode) => void;
  colors: ThemeColors;
  language: string;
}

export function FilterChipRow({
  filterMode,
  onSelectFilter,
  colors,
  language,
}: FilterChipRowProps) {
  const modes: { key: FilterMode; labelTr: string; labelEn: string }[] = [
    { key: 'all', labelTr: 'Tümü', labelEn: 'All' },
    { key: 'active', labelTr: 'Aktif', labelEn: 'Active' },
    { key: 'inactive', labelTr: 'Pasif', labelEn: 'Inactive' },
    { key: 'lowStock', labelTr: 'Stok Az', labelEn: 'Low Stock' },
  ];

  return (
    <View style={styles.filterChipRow}>
      {modes.map(item => {
        const isSelected = filterMode === item.key;
        const label = language === 'tr' ? item.labelTr : item.labelEn;

        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surfaceContainerLow,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelectFilter(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={label}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: isSelected ? colors.textOnPrimary : colors.text },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
