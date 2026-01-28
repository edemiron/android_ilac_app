import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { bottomButtonStyles } from './styles';
import { ScannerBottomButtonsProps } from './types';

export function ScannerBottomButtons({
  scanned,
  onRescan,
  onGoHome,
}: ScannerBottomButtonsProps) {
  return (
    <View style={bottomButtonStyles.container}>
      {scanned && (
        <TouchableOpacity style={bottomButtonStyles.button} onPress={onRescan}>
          <Text style={bottomButtonStyles.buttonText}>Tekrar Tara</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[bottomButtonStyles.button, bottomButtonStyles.homeButton]}
        onPress={onGoHome}
      >
        <Text style={bottomButtonStyles.buttonText}>Ana Sayfaya Git</Text>
      </TouchableOpacity>
    </View>
  );
}
