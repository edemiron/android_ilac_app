import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useMedicineStore } from '../stores/medicineStore';
import { addMedicine } from '../services/globalMedicineService';
import { 
  searchByBarcode, 
  SearchResult, 
  SearchSource, 
  getSourceInfo,
  SearchProgress 
} from '../services/medicineSearchOrchestrator';
import { GlobalMedicine } from '../types';

interface BarcodeScannerScreenProps {
  onScan?: (medicine: { name: string; dosage: string; barcode: string }) => void;
}

type SearchStatus = 'idle' | 'searching' | 'found' | 'not_found' | 'error';

export default function BarcodeScannerScreen({ onScan }: BarcodeScannerScreenProps) {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { incrementBarcodeScanCount, isPremium } = useSubscription();
  const { medicines } = useMedicineStore();
  
  const [permission, requestPermission] = useCameraPermissions();
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

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleSearchProgress = (progress: SearchProgress) => {
    setCurrentSearchStep(progress.currentStep);
    setTotalSearchSteps(progress.totalSteps);
    setStatusMessage(progress.message);
  };

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    setScannedBarcode(result.data);
    setFoundMedicine(null);
    setSearchSource('firebase');
    setConfidence(0);
    setCurrentSearchStep(0);
    
    console.log('Barkod tarandı:', result.data);
    
    // Hibrit arama başlat
    setSearchStatus('searching');
    setStatusMessage('Arama başlatılıyor...');
    
    try {
      const searchResult: SearchResult = await searchByBarcode(
        result.data,
        handleSearchProgress
      );
      
      if (searchResult.success && searchResult.medicine) {
        // İlaç bulundu!
        console.log('İlaç bulundu:', searchResult.medicine.name);
        console.log('Kaynak:', searchResult.source);
        console.log('Güven:', searchResult.confidence);
        
        setFoundMedicine(searchResult.medicine);
        setSearchSource(searchResult.source);
        setConfidence(searchResult.confidence);
        setSearchStatus('found');
        setStatusMessage('İlaç bulundu!');
        setShowResultModal(true);
      } else {
        // Hiçbir yerde bulunamadı
        console.log('İlaç bulunamadı');
        setSearchStatus('not_found');
        setStatusMessage('İlaç bulunamadı');
        showNotFoundAlert(result.data);
      }
    } catch (error: any) {
      console.error('Arama hatası:', error);
      setSearchStatus('error');
      setStatusMessage('Arama hatası oluştu');
      Alert.alert(
        'Hata',
        error.message || 'Arama sırasında bir hata oluştu.',
        [
          { text: 'Tekrar Dene', onPress: () => setScanned(false) },
          { text: 'Kapat', onPress: () => navigation.goBack() },
        ]
      );
    }
  };

  const showNotFoundAlert = (barcode: string) => {
    Alert.alert(
      t('barcode_not_found'),
      `Barkod: ${barcode}\n\nBu ilaç tüm kaynaklarda aramasına rağmen bulunamadı.\n\nManuel olarak ekleyebilirsiniz.`,
      [
        {
          text: t('cancel'),
          onPress: () => navigation.goBack(),
          style: 'cancel',
        },
        {
          text: 'Manuel Ekle',
          onPress: () => {
            navigation.navigate('AddMedicine', { barcode });
          },
        },
        {
          text: 'Tekrar Tara',
          onPress: () => setScanned(false),
        },
      ]
    );
  };

  // Aynı barkodlu ilaç var mı kontrol et
  const checkDuplicateBarcode = (): { exists: boolean; existingMedicine?: any } => {
    // medicines listesinde name içinde barkod geçiyor mu kontrol et
    // veya barcode alanı varsa onu kontrol et
    const existing = medicines.find(m => 
      m.name === foundMedicine?.name || 
      (scannedBarcode && m.name?.includes(scannedBarcode))
    );
    return { exists: !!existing, existingMedicine: existing };
  };

  const handleConfirmMedicine = async () => {
    if (!foundMedicine) return;
    
    // Mükerrer barkod kontrolü
    const { exists, existingMedicine } = checkDuplicateBarcode();
    
    if (exists) {
      // Aynı ilaç zaten listede var - uyarı göster
      Alert.alert(
        'Bu İlaç Zaten Listenizde',
        `"${existingMedicine?.name || foundMedicine.name}" adlı ilaç zaten kayıtlı.\n\nYine de eklemek istiyor musunuz?`,
        [
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
            onPress: () => {
              setShowResultModal(false);
              setScanned(false);
              setSearchStatus('idle');
              if (existingMedicine?.id) {
                // AddMedicine ekranına medicineId ile git (düzenleme modu)
                navigation.navigate('AddMedicine', { medicineId: existingMedicine.id });
              } else {
                // İlaçlar listesine git
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
    
    // Mükerrer değilse direkt ekle
    proceedToAddMedicine();
  };
  
  const proceedToAddMedicine = async () => {
    setShowResultModal(false);
    
    // Free kullanıcılar için barkod tarama sayacını artır
    if (!isPremium) {
      await incrementBarcodeScanCount();
    }
    
    // Callback varsa çağır (başka ekrandan çağrıldıysa)
    if (onScan) {
      onScan({
        name: foundMedicine?.name || '',
        dosage: foundMedicine?.dosage || '',
        barcode: scannedBarcode,
      });
      navigation.goBack();
    } else {
      // AddMedicineScreen'e pre-filled bilgilerle git
      navigation.navigate('AddMedicine', {
        barcode: scannedBarcode,
        prefillName: foundMedicine?.name,
        prefillDosage: foundMedicine?.dosage,
        prefillManufacturer: foundMedicine?.manufacturer,
        prefillGenericName: foundMedicine?.genericName,
        prefillForm: foundMedicine?.form,
      });
    }
  };

  const handleEditMedicine = () => {
    setShowResultModal(false);
    // AddMedicineScreen'e pre-filled bilgilerle git
    navigation.navigate('AddMedicine', {
      barcode: scannedBarcode,
      prefillName: foundMedicine?.name,
      prefillDosage: foundMedicine?.dosage,
      prefillManufacturer: foundMedicine?.manufacturer,
      prefillGenericName: foundMedicine?.genericName,
    });
  };

  const getSourceBadgeColor = (source: SearchSource): string => {
    const info = getSourceInfo(source);
    return info.color;
  };

  const getSourceDisplayName = (source: SearchSource): string => {
    const info = getSourceInfo(source);
    return info.name;
  };

  const renderSourceBadge = () => {
    const info = getSourceInfo(searchSource);
    
    return (
      <View style={[styles.sourceBadge, { backgroundColor: info.color }]}>
        <Text style={styles.sourceBadgeText}>
          {info.name}
        </Text>
        <Text style={styles.confidenceText}>
          {confidence}% güven
        </Text>
      </View>
    );
  };

  const renderResultModal = () => (
    <Modal
      visible={showResultModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowResultModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            İlaç Bulundu!
          </Text>
          
          {renderSourceBadge()}
          
          {confidence < 70 && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningBannerText}>
                Güven skoru düşük. Bilgileri kontrol etmenizi öneririz.
              </Text>
            </View>
          )}
          
          <ScrollView style={styles.medicineInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>İlaç Adı:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {foundMedicine?.name || '-'}
              </Text>
            </View>
            
            {foundMedicine?.genericName && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Etken Madde:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {foundMedicine.genericName}
                </Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Doz:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {foundMedicine?.dosage || '-'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Form:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {foundMedicine?.form || '-'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Üretici:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {foundMedicine?.manufacturer || '-'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Barkod:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {scannedBarcode}
              </Text>
            </View>
          </ScrollView>
          
          {/* Kaynak bilgisi açıklaması */}
          <View style={[styles.sourceInfoBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.sourceInfoText, { color: colors.textSecondary }]}>
              {getSourceInfo(searchSource).description}
            </Text>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.editButton, { borderColor: colors.primary }]}
              onPress={handleEditMedicine}
            >
              <Text style={[styles.editButtonText, { color: colors.primary }]}>Düzenle</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={handleConfirmMedicine}
            >
              <Text style={styles.confirmButtonText}>Onayla</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.cancelLink}
            onPress={() => {
              setShowResultModal(false);
              setScanned(false);
            }}
          >
            <Text style={[styles.cancelLinkText, { color: colors.textSecondary }]}>
              Tekrar Tara
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderStatusIndicator = () => {
    if (searchStatus === 'idle') return null;
    
    return (
      <View style={styles.statusContainer}>
        {searchStatus === 'searching' && (
          <>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.statusText}>{statusMessage}</Text>
            
            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(currentSearchStep / totalSearchSteps) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentSearchStep}/{totalSearchSteps}
              </Text>
            </View>
          </>
        )}
        
        {searchStatus === 'error' && (
          <Text style={[styles.statusText, { color: '#FF6B6B' }]}>{statusMessage}</Text>
        )}
      </View>
    );
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.permissionText, { color: colors.text }]}>
          {t('barcode_camera_permission')}
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Üst kısım */}
          <View style={styles.overlaySection}>
            <Text style={styles.headerText}>Barkod Tarayıcı</Text>
            <Text style={styles.headerSubtext}>
              TİTCK Resmi İlaç Veritabanı
            </Text>
          </View>
          
          {/* Orta kısım - tarama alanı */}
          <View style={styles.middleSection}>
            <View style={styles.overlaySection} />
            <View style={styles.scanArea}>
              {/* Köşe çizgileri */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {renderStatusIndicator()}
            </View>
            <View style={styles.overlaySection} />
          </View>
          
          {/* Alt kısım */}
          <View style={styles.overlaySection}>
            <Text style={styles.instructionText}>
              {searchStatus === 'idle' ? t('barcode_align') : ''}
            </Text>
          </View>
        </View>
        
        {/* Geri butonu */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        
        {/* Alt butonlar - her zaman göster (arama sırasında ve modal açıkken hariç) */}
        {searchStatus !== 'searching' && !showResultModal && (
          <View style={styles.bottomButtonsContainer}>
            {/* Tekrar Tara butonu sadece tarama yapıldıysa */}
            {scanned && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => {
                  setScanned(false);
                  setSearchStatus('idle');
                }}
              >
                <Text style={styles.rescanButtonText}>Tekrar Tara</Text>
              </TouchableOpacity>
            )}
            
            {/* Ana Sayfaya Git butonu her zaman */}
            <TouchableOpacity
              style={[styles.rescanButton, styles.homeButton]}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={styles.rescanButtonText}>Ana Sayfaya Git</Text>
            </TouchableOpacity>
          </View>
        )}
      </CameraView>
      
      {renderResultModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleSection: {
    flexDirection: 'row',
    height: 250,
  },
  scanArea: {
    width: 280,
    height: 250,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4ECDC4',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtext: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  rescanButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 180,
    alignItems: 'center',
  },
  homeButton: {
    backgroundColor: '#607D8B',
  },
  rescanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 40,
    marginBottom: 20,
  },
  permissionButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Status indicator
  statusContainer: {
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  // Progress bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
    paddingHorizontal: 20,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 3,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  sourceBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  confidenceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningBannerText: {
    flex: 1,
    color: '#E65100',
    fontSize: 12,
  },
  medicineInfo: {
    maxHeight: 250,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  sourceInfoBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  sourceInfoText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {},
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 14,
  },
});
