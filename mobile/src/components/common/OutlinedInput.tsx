/**
 * OutlinedInput — Sprint 102.7 (Clinical Clarity)
 *
 * CC spec: 1px border default, focus 2px primary teal, rounded-md (12px).
 * label üstte (label-md), error/helper altta.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface OutlinedInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  style?: StyleProp<ViewStyle>;
}

export function OutlinedInput({ label, error, helper, style, ...inputProps }: OutlinedInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}
      <TextInput
        {...inputProps}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error
              ? colors.error
              : focused
                ? colors.primary
                : colors.inputBorder,
            borderWidth: focused || error ? 2 : 1,
            color: colors.text,
          },
          inputProps.editable === false && styles.disabled,
        ]}
        placeholderTextColor={colors.placeholder}
        accessibilityLabel={label ?? inputProps.placeholder}
      />
      {(error || helper) && (
        <Text
          style={[
            styles.helper,
            { color: error ? colors.error : colors.textMuted },
          ]}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.1, // CC label-md spec
  },
  input: {
    borderRadius: 12, // CC radius.md
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 44,
  },
  helper: {
    fontSize: 12,
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
});