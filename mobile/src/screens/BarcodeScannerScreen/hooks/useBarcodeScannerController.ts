/**
 * useBarcodeScannerController — BarcodeScannerScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Kamera izinleri, VisionCamera codeScanner dinleyicisi, ilaç tanıma sonuçları
 * ve navigasyon aksiyonlarını UI katmanından izole eder.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { Linking } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  type Code,
} from 'react-native-vision-camera';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAlert } from '../../../contexts/AlertContext';
import { useBarcodeScanner } from '../../../hooks/useBarcodeScanner';

type BarcodeNav = NativeStackNavigationProp<RootStackParamList, 'BarcodeScanner'>;
type BarcodeRoute = RouteProp<RootStackParamList, 'BarcodeScanner'>;

interface UseBarcodeScannerControllerProps {
  onScan?: (medicine: { name: string; dosage: string; barcode: string }) => void;
}

export function useBarcodeScannerController({ onScan }: UseBarcodeScannerControllerProps = {}) {
  const navigation = useNavigation<BarcodeNav>();
  const route = useRoute<BarcodeRoute>();
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
    onCodeScanned,
  });

  const handleRescan = () => {
    resetScanner();
    closeResultModal();
  };

  const handleGoHome = () => {
    navigation.navigate('Main' as never);
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

  const activeDevice = device || fallbackDevice;
  const shouldShowBottomButtons = searchStatus !== 'searching' && !showResultModal;

  const handleRequestPermissionWithAlert = async () => {
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
  };

  return {
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
  };
}
