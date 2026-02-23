import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useMedicineStore } from '../stores/medicineStore';
import { useAlert } from '../contexts/AlertContext';
import {
  searchByBarcode,
  SearchResult,
  SearchProgress,
  SearchSource,
} from '../services/medicineSearchOrchestrator';
import { GlobalMedicine, Medicine, RootStackParamList } from '../types';
import { SearchStatus, UseBarcodeScanner } from '../components/barcodeScanner/types';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('BarcodeScanner');

interface UseBarcodeHookOptions {
  onScan?: (medicine: { name: string; dosage: string; barcode: string }) => void;
  mode?: 'assign' | undefined;
}

type BarcodeScannerNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useBarcodeScanner(options: UseBarcodeHookOptions = {}): UseBarcodeScanner {
  const { onScan, mode } = options;
  const navigation = useNavigation<BarcodeScannerNavigationProp>();
  const { incrementBarcodeScanCount, isPremium } = useSubscription();
  const { medicines } = useMedicineStore();
  const { showAlert } = useAlert();

  const [scanned, setScanned] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [currentSearchStep, setCurrentSearchStep] = useState(0);
  const [totalSearchSteps, setTotalSearchSteps] = useState(4);
  const [foundMedicine, setFoundMedicine] = useState<Partial<GlobalMedicine> | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [showResultModal, setShowResultModal] = useState(false);
  const [searchSource, setSearchSource] = useState<SearchSource>('firebase');
  const [confidence, setConfidence] = useState<number>(0);

  const handleSearchProgress = useCallback((progress: SearchProgress) => {
    setCurrentSearchStep(progress.currentStep);
    setTotalSearchSteps(progress.totalSteps);
    setStatusMessage(progress.message);
  }, []);

  const showNotFoundAlert = useCallback(
    (barcode: string) => {
      showAlert({
        type: 'warning',
        title: 'Barkod Bulunamadı',
        message: `Barkod: ${barcode}\n\nBu ilaç tüm kaynaklarda aramasına rağmen bulunamadı.\n\nManuel olarak ekleyebilirsiniz.`,
        buttons: [
          {
            text: 'İptal',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
          {
            text: 'Manuel Ekle',
            onPress: () => navigation.navigate('AddMedicine', { barcode }),
            style: 'default',
          },
          {
            text: 'Tekrar Tara',
            onPress: () => setScanned(false),
            style: 'default',
          },
        ],
      });
    },
    [navigation, showAlert]
  );

  const handleBarCodeScanned = useCallback(
    async (result: { data: string }) => {
      if (scanned) return;

      setScanned(true);
      setScannedBarcode(result.data);
      setFoundMedicine(null);
      setSearchSource('firebase');
      setConfidence(0);
      setCurrentSearchStep(0);

      log.debug('Barkod tarandı', { barcode: result.data });

      if (mode === 'assign') {
        // Arama yapmadan sadece barkodu geri döndür
        navigation.navigate({
          name: 'AddMedicine',
          params: { barcode: result.data },
          merge: true,
        });
        return;
      }

      setSearchStatus('searching');
      setStatusMessage('Arama başlatılıyor...');

      try {
        const searchResult: SearchResult = await searchByBarcode(result.data, handleSearchProgress);

        if (searchResult.success && searchResult.medicine) {
          log.debug('İlaç bulundu', {
            name: searchResult.medicine.name,
            source: searchResult.source,
            confidence: searchResult.confidence,
          });

          setFoundMedicine(searchResult.medicine);
          setSearchSource(searchResult.source);
          setConfidence(searchResult.confidence);
          setSearchStatus('found');
          setStatusMessage('İlaç bulundu!');
          setShowResultModal(true);
        } else {
          log.debug('İlaç bulunamadı');
          setSearchStatus('not_found');
          setStatusMessage('İlaç bulunamadı');
          showNotFoundAlert(result.data);
        }
      } catch (error: unknown) {
        log.error('Arama hatası', error);
        const errorObj = error as { message?: string };
        setSearchStatus('error');
        setStatusMessage('Arama hatası oluştu');
        showAlert({
          type: 'error',
          title: 'Hata',
          message: errorObj.message || 'Arama sırasında bir hata oluştu.',
          buttons: [
            { text: 'Tekrar Dene', onPress: () => setScanned(false), style: 'default' },
            { text: 'Kapat', onPress: () => navigation.goBack(), style: 'cancel' },
          ],
        });
      }
    },
    [scanned, handleSearchProgress, showNotFoundAlert, navigation, showAlert]
  );

  const checkDuplicateBarcode = useCallback((): {
    exists: boolean;
    existingMedicine?: Medicine;
  } => {
    const existing = medicines.find(
      m => m.name === foundMedicine?.name || (scannedBarcode && m.name?.includes(scannedBarcode))
    );
    return { exists: !!existing, existingMedicine: existing };
  }, [medicines, foundMedicine?.name, scannedBarcode]);

  const proceedToAddMedicine = useCallback(async () => {
    setShowResultModal(false);

    if (!isPremium) {
      await incrementBarcodeScanCount();
    }

    if (onScan) {
      onScan({
        name: foundMedicine?.name || '',
        dosage: foundMedicine?.dosage || '',
        barcode: scannedBarcode,
      });
      navigation.goBack();
    } else {
      navigation.navigate({
        name: 'AddMedicine',
        params: {
          barcode: scannedBarcode,
          prefillName: foundMedicine?.name,
          prefillDosage: foundMedicine?.dosage,
          prefillManufacturer: foundMedicine?.manufacturer,
          prefillGenericName: foundMedicine?.genericName,
          prefillForm: foundMedicine?.form,
        },
        merge: true,
      });
    }
  }, [foundMedicine, scannedBarcode, onScan, navigation, isPremium, incrementBarcodeScanCount]);

  const handleConfirmMedicine = useCallback(async () => {
    if (!foundMedicine) return;

    const { exists, existingMedicine } = checkDuplicateBarcode();

    if (exists) {
      showAlert({
        type: 'warning',
        title: 'Bu İlaç Zaten Listenizde',
        message: `"${existingMedicine?.name || foundMedicine.name}" adlı ilaç zaten kayıtlı.\n\nYine de eklemek istiyor musunuz?`,
        buttons: [
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => {
              setShowResultModal(false);
              setScanned(false);
              setSearchStatus('idle');
            },
          },
          {
            text: 'Mevcut İlaca Git',
            style: 'default',
            onPress: () => {
              setShowResultModal(false);
              setScanned(false);
              setSearchStatus('idle');
              if (existingMedicine?.id) {
                navigation.navigate('AddMedicine', { medicineId: existingMedicine.id });
              } else {
                navigation.navigate('Main', { screen: 'Medicines' });
              }
            },
          },
          {
            text: 'Yine de Ekle',
            style: 'destructive',
            onPress: () => proceedToAddMedicine(),
          },
        ],
      });
      return;
    }

    proceedToAddMedicine();
  }, [foundMedicine, checkDuplicateBarcode, proceedToAddMedicine, navigation, showAlert]);

  const handleEditMedicine = useCallback(() => {
    setShowResultModal(false);
    navigation.navigate({
      name: 'AddMedicine',
      params: {
        barcode: scannedBarcode,
        prefillName: foundMedicine?.name,
        prefillDosage: foundMedicine?.dosage,
        prefillManufacturer: foundMedicine?.manufacturer,
        prefillGenericName: foundMedicine?.genericName,
      },
      merge: true,
    });
  }, [navigation, scannedBarcode, foundMedicine]);

  const resetScanner = useCallback(() => {
    setScanned(false);
    setSearchStatus('idle');
  }, []);

  const closeResultModal = useCallback(() => {
    setShowResultModal(false);
  }, []);

  return {
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
  };
}
