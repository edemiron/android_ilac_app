import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MEDICINE_COLORS, MEDICINE_CATEGORIES, MedicineCategoryInfo } from '../../stores/medicineStore';
import { ThemeColors } from '../../contexts/ThemeContext';
import { MedicineCategory } from '../../types';

interface Props {
  value: string;
  onSelect: (color: string) => void;
  category?: MedicineCategory;
  onCategorySelect?: (category: MedicineCategory) => void;
  label: string;
  colors: ThemeColors;
}

export function ColorPicker({ value, onSelect, category, onCategorySelect, label, colors }: Props) {
  const styles = createStyles(colors);

  const handleCategoryPress = (cat: MedicineCategoryInfo) => {
    onCategorySelect?.(cat.key);
    onSelect(cat.color);
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Kategori</Text>
      <View style={styles.categoryGrid}>
        {MEDICINE_CATEGORIES.map((cat) => {
          const isSelected = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                { borderColor: cat.color },
                isSelected && { backgroundColor: cat.color },
              ]}
              onPress={() => handleCategoryPress(cat)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>{label}</Text>
      <View style={styles.colorContainer}>
        {MEDICINE_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorButton,
              { backgroundColor: color },
              value === color && styles.colorButtonActive,
            ]}
            onPress={() => onSelect(color)}
          >
            {value === color && <Text style={styles.colorCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    inputGroup: {
      marginTop: 20,
      zIndex: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 2,
      backgroundColor: colors.card,
      width: '48%',
    },
    categoryEmoji: {
      fontSize: 16,
      marginRight: 4,
    },
    categoryLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
    categoryLabelActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    colorContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    colorButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorButtonActive: {
      borderWidth: 3,
      borderColor: colors.text,
    },
    colorCheck: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
