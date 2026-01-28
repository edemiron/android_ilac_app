import React from 'react';
import { View, Text } from 'react-native';
import { scannerStyles } from './styles';
import { SearchProgress } from './SearchProgress';
import { ScanOverlayProps } from './types';

export function ScanOverlay({
  searchStatus,
  statusMessage,
  currentSearchStep,
  totalSearchSteps,
  instructionText,
}: ScanOverlayProps) {
  return (
    <View style={scannerStyles.overlay}>
      <View style={scannerStyles.overlaySection}>
        <Text style={scannerStyles.headerText}>Barkod Tarayıcı</Text>
        <Text style={scannerStyles.headerSubtext}>TİTCK Resmi İlaç Veritabanı</Text>
      </View>

      <View style={scannerStyles.middleSection}>
        <View style={scannerStyles.overlaySection} />
        <View style={scannerStyles.scanArea}>
          <View style={[scannerStyles.corner, scannerStyles.topLeft]} />
          <View style={[scannerStyles.corner, scannerStyles.topRight]} />
          <View style={[scannerStyles.corner, scannerStyles.bottomLeft]} />
          <View style={[scannerStyles.corner, scannerStyles.bottomRight]} />

          <SearchProgress
            searchStatus={searchStatus}
            statusMessage={statusMessage}
            currentSearchStep={currentSearchStep}
            totalSearchSteps={totalSearchSteps}
          />
        </View>
        <View style={scannerStyles.overlaySection} />
      </View>

      <View style={scannerStyles.overlaySection}>
        <Text style={scannerStyles.instructionText}>
          {searchStatus === 'idle' ? instructionText : ''}
        </Text>
      </View>
    </View>
  );
}
