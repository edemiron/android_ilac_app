/**
 * CitySelectorBar — Popüler şehirler ve En Yakınlar yatay filtreleme çipleri
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CitySelectorBarProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  cities: readonly string[];
  colors: ThemeColors;
  isDark: boolean;
}

export function CitySelectorBar({
  selectedCity,
  onSelectCity,
  cities,
  colors,
  isDark,
}: CitySelectorBarProps) {
  return (
    <View style={styles.cityChipsContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={cities}
        keyExtractor={item => item}
        contentContainerStyle={styles.cityChipsList}
        renderItem={({ item }) => {
          const isSelected = selectedCity === item;
          return (
            <TouchableOpacity
              onPress={() => onSelectCity(item)}
              style={[
                styles.cityChip,
                isSelected
                  ? { backgroundColor: '#0F766E', borderColor: '#0F766E' }
                  : {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cityChipText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.text,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cityChipsContainer: {
    marginBottom: 12,
  },
  cityChipsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 13,
  },
});
