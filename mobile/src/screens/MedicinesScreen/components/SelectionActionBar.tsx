/**
 * SelectionActionBar — Çoklu seçim modunda seçili öğeleri silme eylem çubuğu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface SelectionActionBarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  colors: ThemeColors;
  language: string;
}

export function SelectionActionBar({
  selectedCount,
  onDeleteSelected,
  colors,
  language,
}: SelectionActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <View
      style={[
        styles.selectionActionBar,
        { backgroundColor: colors.card, borderTopColor: colors.divider },
      ]}
    >
      <TouchableOpacity
        style={[styles.deleteSelectedButton, { backgroundColor: colors.error }]}
        onPress={onDeleteSelected}
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        <Text style={styles.deleteSelectedText}>
          {language === 'tr' ? `${selectedCount} İlacı Sil` : `Delete ${selectedCount}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  selectionActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
