/**
 * AppearanceCard — İlaç Fotoğrafı, Tema Rengi ve Kategori Kartı
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { MedicineCategory } from '../../../types';
import { ImagePickerSection, ColorPicker } from '../../../components/addMedicine';

interface AppearanceCardProps {
  imageUri?: string;
  onImageChange: (uri?: string) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  category?: MedicineCategory;
  onCategoryChange: (category: MedicineCategory) => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function AppearanceCard({
  imageUri,
  onImageChange,
  selectedColor,
  onColorChange,
  category,
  onCategoryChange,
  colors,
  language,
}: AppearanceCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ImagePickerSection
        imageUri={imageUri}
        onImageChange={onImageChange}
        label={language === 'tr' ? 'İlaç Fotoğrafı' : 'Medicine Photo'}
        colors={colors}
        language={language}
      />

      <ColorPicker
        value={selectedColor}
        onSelect={onColorChange}
        category={category}
        onCategorySelect={onCategoryChange}
        label={language === 'tr' ? 'Tema Rengi' : 'Theme Color'}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    paddingTop: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
});
