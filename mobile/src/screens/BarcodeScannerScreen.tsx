/**
 * BarcodeScannerScreen — İlaç Barkodu ve QR Okuyucu Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Kamera ve izin yönetimi, VisionCamera codeScanner dinleyicisi ve ilaç tanıma
 * `useBarcodeScannerController` Presenter Hook'una aktarılmıştır.
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Camera } from 'react-native-vision-camera';

import {
  ScanOverlay,
  MedicineResultModal,
  PermissionRequest,
  ScannerBottomButtons,
  scannerStyles,
} from '../components/barcodeScanner';

import { useBarcodeScannerController } from './BarcodeScannerScreen/hooks/useBarcodeScannerController';

interface BarcodeScannerScreenProps {
  onScan?: (medicine: { name: string; dosage: string; barcode: string }) => void;
}

export default function BarcodeScannerScreen({ onScan }: BarcodeScannerScreenProps) {
  const {
    t,
    hasPermission,
    isFocused,
    scanned,
    activeDevice,
    codeScanner,
    searchStatus,
    statusMessage,
    currentSearchStep,
    totalSearchSteps,
    foundMedicine,
    scannedBarcode,
    showResultModal,
    searchSource,
    confidence,
    shouldShowBottomButtons,
    handleConfirmMedicine,
    handleEditMedicine,
    handleRescan,
    handleGoHome,
    handleGoBack,
    handleRequestPermissionWithAlert,
    resetScanner,
    closeResultModal,
  } = useBarcodeScannerController({ onScan });

  // 1. İzin yükleniyor
  if (hasPermission === null) {
    return <PermissionRequest isLoading />;
  }

  // 2. İzin reddedildi
  if (!hasPermission) {
    return (
      <PermissionRequest
        onRequestPermission={handleRequestPermissionWithAlert}
        permissionText={t('barcode_camera_permission')}
      />
    );
  }

  // 3. Kamera henüz cihazda bulunamadı
  if (!activeDevice) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kamera başlatılıyor...</Text>
      </View>
    );
  }

  return (
    <View style={scannerStyles.container}>
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={activeDevice}
          isActive={isFocused && !scanned}
          codeScanner={codeScanner}
        />
      )}

      {/* Tarama Çerçevesi ve Durum Mesajı */}
      <ScanOverlay
        searchStatus={searchStatus}
        statusMessage={statusMessage}
        currentSearchStep={currentSearchStep}
        totalSearchSteps={totalSearchSteps}
        instructionText={t('barcode_align')}
      />

      {/* Kapat Butonu */}
      <TouchableOpacity style={scannerStyles.backButton} onPress={handleGoBack}>
        <Text style={scannerStyles.backButtonText}>X</Text>
      </TouchableOpacity>

      {/* Alt Butonlar (Tekrar Tara / Ana Sayfa) */}
      {shouldShowBottomButtons && (
        <ScannerBottomButtons scanned={scanned} onRescan={resetScanner} onGoHome={handleGoHome} />
      )}

      {/* Bulunan İlaç Onay Modalı */}
      <MedicineResultModal
        visible={showResultModal}
        foundMedicine={foundMedicine}
        scannedBarcode={scannedBarcode}
        searchSource={searchSource}
        confidence={confidence}
        onConfirm={handleConfirmMedicine}
        onEdit={handleEditMedicine}
        onRescan={handleRescan}
        onClose={closeResultModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
  },
});
