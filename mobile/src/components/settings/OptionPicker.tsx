import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSettingsStyles } from './styles';

interface OptionPickerProps<T extends string | number> {
  options: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  getLabel: (value: T) => string;
}

export function OptionPicker<T extends string | number>({
  options,
  selectedValue,
  onSelect,
  getLabel,
}: OptionPickerProps<T>): React.ReactElement {
  const { colors, isDark } = useTheme();
  const styles = createSettingsStyles(colors, isDark);

  return (
    <View style={styles.pickerContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={String(option)}
          style={[styles.pickerOption, selectedValue === option && styles.pickerOptionActive]}
          onPress={() => onSelect(option)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pickerOptionText,
              selectedValue === option && styles.pickerOptionTextActive,
            ]}
          >
            {getLabel(option)}
          </Text>
          {selectedValue === option && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}
