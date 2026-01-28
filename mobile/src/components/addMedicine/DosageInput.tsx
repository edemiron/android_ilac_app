import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  placeholder: string;
  colors: ThemeColors;
}

export function DosageInput({ value, onChangeText, label, placeholder, colors }: Props) {
  const styles = createStyles(colors);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label} *</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
      />
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
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
  });
