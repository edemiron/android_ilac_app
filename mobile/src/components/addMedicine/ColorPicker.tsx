import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MEDICINE_COLORS } from '../../stores/medicineStore';
import { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  value: string;
  onSelect: (color: string) => void;
  label: string;
  colors: ThemeColors;
}

export function ColorPicker({ value, onSelect, label, colors }: Props) {
  const styles = createStyles(colors);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
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
            {value === color && <Text style={styles.colorCheck}>-</Text>}
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
    colorContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    colorButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
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
