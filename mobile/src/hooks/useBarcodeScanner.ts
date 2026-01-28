import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useMedicineStore } from '../stores/medicineStore';
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
}

type BarcodeScannerNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useBarcodeScanner(options: UseBarcodeHookOptions = {}): UseBarcodeScanner {
  const { onScan } = options;
  const navigation = useNavigation<BarcodeScannerNavigationProp>();
  const { incrementBarcodeScanCount, isPremium } = useSubscription();
  const { medicines } = useMedicineStore();

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

  const showNotFoundAlert = useCallback((barcode: string) => {
    Alert.alert(
      'Barkod Bulunamadı',
      `Barkod: ${barcode}\n\nBu ilac tum kaynaklarda aramasina ragmen bulunamadi.\n\nManuel olarak ekleyebilirsiniz.`,
      [
        {
          text: 'Iptal',
          onPress: () => navigation.goBack(),
          style: 'cancel',
        },
        {
          text: 'Manuel Ekle',
          onPress: () => navigation.navigate('AddMedicine', { barcode }),
        },
        {
          text: 'Tekrar Tara',
          onPress: () => setScanned(false),
        },
      ]
    );
  }, [navigation]);

  const handleBarCodeScanned = useCallback(async (result: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setScannedBarcode(result.data);
    setFoundMedicine(null);
    setSearchSource('firebase');
    setConfidence(0);
    setCurrentSearchStep(0);

    log.debug('Barkod tarandi', { barcode: result.data });

    setSearchStatus('searching');
    setStatusMessage('Arama baslatiliyor...');

    try {
      const searchResult: SearchResult = await searchByBarcode(
        result.data,
        handleSearchProgress
      );

      if (searchResult.success && searchResult.medicine) {
        log.debug('Ilac bulundu', {
          name: searchResult.medicine.name,
          source: searchResult.source,
          confidence: searchResult.confidence,
        });

        setFoundMedicine(searchResult.medicine);
        setSearchSource(searchResult.source);
        setConfidence(searchResult.confidence);
        setSearchStatus('found');
        setStatusMessage('Ilac bulundu!');
        setShowResultModal(true);
      } else {
        log.debug('Ilac bulunamadi');
        setSearchStatus('not_found');
        setStatusMessage('Ilac bulunamadi');
        showNotFoundAlert(result.data);
      }
    } catch (error: unknown) {
      log.error('Arama hatasi', error);
      const errorObj = error as { message?: string };
      setSearchStatus('error');
      setStatusMessage('Arama hatasi olustu');
      Alert.alert(
        'Hata',
        errorObj.message || 'Arama sirasinda bir hata olustu.',
        [
          { text: 'Tekrar Dene', onPress: () => setScanned(false) },
          { text: 'Kapat', onPress: () => navigation.goBack() },
        ]
      );
    }
  }, [scanned, handleSearchProgress, showNotFoundAlert, navigation]);

  const checkDuplicateBarcode = useCallback((): { exists: boolean; existingMedicine?: Medicine } => {
    const existing = medicines.find(m =>
      m.name === foundMedicine?.name ||
      (scannedBarcode && m.name?.includes(scannedBarcode))
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
      navigation.navigate('AddMedicine', {
        barcode: scannedBarcode,
        prefillName: foundMedicine?.name,
        prefillDosage: foundMedicine?.dosage,
        prefillManufacturer: foundMedicine?.manufacturer,
        prefillGenericName: foundMedicine?.genericName,
        prefillForm: foundMedicine?.form,
      });
    }
  }, [foundMedicine, scannedBarcode, onScan, navigation, isPremium, incrementBarcodeScanCount]);

  const handleConfirmMedicine = useCallback(async () => {
    if (!foundMedicine) return;

    const { exists, existingMedicine } = checkDuplicateBarcode();

    if (exists) {
      Alert.alert(
        'Bu Ilac Zaten Listenizde',
        `"${existingMedicine?.name || foundMedicine.name}" adli ilac zaten kayitli.\n\nYine de eklemek istiyor musunuz?`,
        [
          {
            text: 'Iptal',
            style: 'cancel',
            onPress: () => {
              setShowResultModal(false);
              setScanned(false);
              setSearchStatus('idle');
            },
          },
          {
            text: 'Mevcut Ilaca Git',
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
        ]
      );
      return;
    }

    proceedToAddMedicine();
  }, [foundMedicine, checkDuplicateBarcode, proceedToAddMedicine, navigation]);

  const handleEditMedicine = useCallback(() => {
    setShowResultModal(false);
    navigation.navigate('AddMedicine', {
      barcode: scannedBarcode,
      prefillName: foundMedicine?.name,
      prefillDosage: foundMedicine?.dosage,
      prefillManufacturer: foundMedicine?.manufacturer,
      prefillGenericName: foundMedicine?.genericName,
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
