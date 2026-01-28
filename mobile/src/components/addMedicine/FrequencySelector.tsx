import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FREQUENCY_OPTIONS } from '../../types/addMedicine.types';
import { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  value: number;
  onSelect: (frequency: number) => void;
  label: string;
  colors: ThemeColors;
}

export function FrequencySelector({ value, onSelect, label, colors }: Props) {
  const styles = createStyles(colors);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.frequencyContainer}>
        {FREQUENCY_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.frequencyButton, value === f && styles.frequencyButtonActive]}
            onPress={() => onSelect(f)}
          >
            <Text style={[styles.frequencyText, value === f && styles.frequencyTextActive]}>
              {f}x
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
    frequencyContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    frequencyButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    frequencyButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    frequencyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    frequencyTextActive: {
      color: '#FFFFFF',
    },
  });
