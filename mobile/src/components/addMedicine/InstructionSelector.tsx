import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MedicineInstruction } from '../../types';
import { ThemeColors } from '../../contexts/ThemeContext';

interface InstructionOption {
  value: MedicineInstruction;
  label: string;
}

interface Props {
  value: MedicineInstruction;
  onSelect: (instruction: MedicineInstruction) => void;
  options: InstructionOption[];
  label: string;
  colors: ThemeColors;
}

export function InstructionSelector({ value, onSelect, options, label, colors }: Props) {
  const styles = createStyles(colors);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.instructionsContainer}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.instructionButton, value === opt.value && styles.instructionButtonActive]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[styles.instructionText, value === opt.value && styles.instructionTextActive]}
            >
              {opt.label}
            </Text>
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
    instructionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    instructionButton: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionButtonActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    instructionText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    instructionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
