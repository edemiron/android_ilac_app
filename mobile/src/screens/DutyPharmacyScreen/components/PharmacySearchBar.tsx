/**
 * PharmacySearchBar — Eczane, ilçe veya mahalle arama çubuğu
 */

import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PharmacySearchBarProps {
  searchQuery: string;
  onChangeSearchQuery: (text: string) => void;
  colors: ThemeColors;
  isDark: boolean;
  isTr: boolean;
}

export function PharmacySearchBar({
  searchQuery,
  onChangeSearchQuery,
  colors,
  isDark,
  isTr,
}: PharmacySearchBarProps) {
  return (
    <View
      style={[
        styles.searchBar,
        {
          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder={isTr ? 'Eczane, ilçe veya mahalle ara...' : 'Search pharmacy or district...'}
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => onChangeSearchQuery('')}>
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
});
