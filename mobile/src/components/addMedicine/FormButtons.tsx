import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  cancelText: string;
  saveText: string;
  updateText: string;
  colors: ThemeColors;
}

export function FormButtons({
  onSave,
  onCancel,
  isEditing,
  cancelText,
  saveText,
  updateText,
  colors,
}: Props) {
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom:
            Platform.OS === 'ios'
              ? Math.max(insets.bottom, 12) + 8
              : Math.max(insets.bottom, 8) + 12,
        },
      ]}
    >
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>{cancelText}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveButton} onPress={onSave}>
        <Text style={styles.saveButtonText}>{isEditing ? updateText : saveText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    footer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    saveButton: {
      flex: 2,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
