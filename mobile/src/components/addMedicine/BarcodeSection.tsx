import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  barcode?: string;
  onScanPress: () => void;
  isEditing: boolean;
  scanButtonText: string;
  colors: ThemeColors;
}

export function BarcodeSection({ barcode, onScanPress, isEditing, scanButtonText, colors }: Props) {
  const styles = createStyles(colors);

  if (isEditing) {
    return null;
  }

  return (
    <>
      <TouchableOpacity style={styles.barcodeButton} onPress={onScanPress}>
        <Text style={styles.barcodeIcon}>-</Text>
        <Text style={styles.barcodeText}>{scanButtonText}</Text>
      </TouchableOpacity>

      {barcode && (
        <View style={styles.barcodeInfo}>
          <Text style={styles.barcodeInfoLabel}>Barkod:</Text>
          <Text style={styles.barcodeInfoValue}>{barcode}</Text>
        </View>
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    barcodeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 16,
      marginTop: 20,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    barcodeIcon: {
      fontSize: 24,
      marginRight: 10,
    },
    barcodeText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    barcodeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
      backgroundColor: colors.card,
    },
    barcodeInfoLabel: {
      fontSize: 14,
      marginRight: 8,
      color: colors.textSecondary,
    },
    barcodeInfoValue: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: colors.text,
    },
  });
