import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
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
  const haptics = useHaptics();
  const styles = createSettingsStyles(colors, isDark);

  // Sprint 66A: selection haptic on option choose
  const handleSelect = useCallback(
    (value: T) => {
      haptics.selection();
      onSelect(value);
    },
    [haptics, onSelect]
  );

  return (
    <View style={styles.pickerContainer}>
      {options.map(option => (
        <TouchableOpacity
          key={String(option)}
          style={[styles.pickerOption, selectedValue === option && styles.pickerOptionActive]}
          onPress={() => handleSelect(option)}
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
          {selectedValue === option && (
            <Ionicons name="checkmark" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
