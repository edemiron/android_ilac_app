import React, { useEffect, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Linking } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useAlert } from '../contexts/AlertContext';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import {
  ScanOverlay,
  MedicineResultModal,
  PermissionRequest,
  ScannerBottomButtons,
  scannerStyles,
} from '../components/barcodeScanner';

interface BarcodeScannerScreenProps {
  onScan?: (medicine: { name: string; dosage: string; barcode: string }) => void;
}

export default function BarcodeScannerScreen({ onScan }: BarcodeScannerScreenProps) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode = route.params?.mode;
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const isFocused = useIsFocused();

  const {
    scanned,
    searchStatus,
    statusMessage,
    currentSearchStep,
    totalSearchSteps,
    foundMedicine,
    scannedBarcode,
    showResultModal,
    searchSource,
    confidence,
    handleBarCodeScanned,
    handleConfirmMedicine,
    handleEditMedicine,
    resetScanner,
    closeResultModal,
  } = useBarcodeScanner({ onScan, mode });

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const onCodeScanned = useCallback(
    (codes: Code[]) => {
      if (scanned || codes.length === 0) return;

      const code = codes[0];
      if (code.value) {
        handleBarCodeScanned({ data: code.value });
      }
    },
    [scanned, handleBarCodeScanned]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39'],
    onCodeScanned: onCodeScanned,
  });

  const handleRescan = () => {
    resetScanner();
    closeResultModal();
  };

  const handleGoHome = () => {
    navigation.navigate('Main');
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const fallbackDevice = useMemo(
    () => Camera.getAvailableCameraDevices().find(d => d.position === 'back'),
    []
  );

  // İzin yükleniyor
  if (hasPermission === null) {
    return <PermissionRequest isLoading />;
  }

  // İzin reddedildi
  if (!hasPermission) {
    return (
      <PermissionRequest
        onRequestPermission={async () => {
          const granted = await requestPermission();
          if (!granted) {
            showAlert({
              type: 'warning',
              title: t('barcode_camera_permission'),
              message: t('barcode_camera_permission'),
              buttons: [
                { text: t('cancel'), style: 'cancel' },
                { text: t('settings_open_settings'), onPress: openSettings, style: 'default' },
              ],
            });
          }
        }}
        permissionText={t('barcode_camera_permission')}
      />
    );
  }

  const activeDevice = device || fallbackDevice;

  // Kamera henüz cihazda bulunamadı (yükleniyor)
  if (!activeDevice) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kamera başlatılıyor...</Text>
      </View>
    );
  }

  const shouldShowBottomButtons = searchStatus !== 'searching' && !showResultModal;

  return (
    <View style={scannerStyles.container}>
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={activeDevice!}
          isActive={isFocused && !scanned}
          codeScanner={codeScanner}
        />
      )}

      <ScanOverlay
        searchStatus={searchStatus}
        statusMessage={statusMessage}
        currentSearchStep={currentSearchStep}
        totalSearchSteps={totalSearchSteps}
        instructionText={t('barcode_align')}
      />

      <TouchableOpacity style={scannerStyles.backButton} onPress={handleGoBack}>
        <Text style={scannerStyles.backButtonText}>X</Text>
      </TouchableOpacity>

      {shouldShowBottomButtons && (
        <ScannerBottomButtons scanned={scanned} onRescan={resetScanner} onGoHome={handleGoHome} />
      )}

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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorSubText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  backButtonAlt: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
