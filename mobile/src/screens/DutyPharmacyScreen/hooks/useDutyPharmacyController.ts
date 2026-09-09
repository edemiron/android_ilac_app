/**
 * useDutyPharmacyController — DutyPharmacyScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * GPS konum tespiti, en yakından uzağa sıralı nöbetçi eczane sorguları,
 * harita yönlendirme, reçete yönetimi ve yenileme alarmlarını koordine eder.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMedicineStore } from '../../../stores/medicineStore';
import {
  getDutyPharmacies,
  callPharmacy,
  openPharmacyMap,
  getUserCurrentLocation,
  type DutyPharmacy,
  type UserCoordinates,
  POPULAR_CITIES,
} from '../../../services/pharmacyService';
import {
  getPrescriptions,
  savePrescription,
  updatePrescription,
  deletePrescription,
} from '../../../services/prescriptionService';
import type { Prescription, PrescriptionInput } from '../../../types/prescription';

export function useDutyPharmacyController() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const medicines = useMedicineStore(state => state.medicines);

  // Tab State: 'pharmacies' (Nöbetçi Eczaneler) | 'prescriptions' (Reçetelerim & Yenileme)
  const [activeTab, setActiveTab] = useState<'pharmacies' | 'prescriptions'>('pharmacies');

  // Eczane State
  const [selectedCity, setSelectedCity] = useState<string>('En Yakınlar');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pharmacies, setPharmacies] = useState<DutyPharmacy[]>([]);
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [locating, setLocating] = useState<boolean>(false);

  // Reçete State
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isPrescriptionModalVisible, setIsPrescriptionModalVisible] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

  // GPS Konumunu Al
  const fetchLocation = useCallback(async () => {
    setLocating(true);
    const coords = await getUserCurrentLocation();
    setUserLocation(coords);
    setLocating(false);
    return coords;
  }, []);

  // Reçeteleri Yükle
  const loadPrescriptions = useCallback(async () => {
    const data = await getPrescriptions();
    setPrescriptions(data);
  }, []);

  // İlk açılışta GPS iste, eczaneleri ve reçeteleri getir
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    loadPrescriptions();

    fetchLocation().then(coords => {
      if (!isMounted) return;
      getDutyPharmacies(selectedCity, searchQuery, coords).then(data => {
        if (isMounted) {
          setPharmacies(data);
          setLoading(false);
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [fetchLocation, loadPrescriptions]);

  // Filtreler veya arama değiştiğinde eczaneleri güncelle
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getDutyPharmacies(selectedCity, searchQuery, userLocation).then(data => {
      if (isMounted) {
        setPharmacies(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, searchQuery, userLocation]);

  const handleLocationRefresh = async () => {
    setSelectedCity('En Yakınlar');
    setLoading(true);
    const coords = await fetchLocation();
    const data = await getDutyPharmacies('En Yakınlar', searchQuery, coords);
    setPharmacies(data);
    setLoading(false);
  };

  // Reçete Kaydet / Güncelle
  const handleSavePrescription = async (data: PrescriptionInput, editingId?: string) => {
    if (editingId) {
      await updatePrescription(editingId, data);
    } else {
      await savePrescription(data);
    }
    await loadPrescriptions();
  };

  // Reçete Sil
  const handleDeletePrescription = async (id: string) => {
    await deletePrescription(id);
    await loadPrescriptions();
  };

  // Reçeteyi Düzenlemek için Aç
  const handleOpenEditPrescription = (item: Prescription) => {
    setEditingPrescription(item);
    setIsPrescriptionModalVisible(true);
  };

  // Yeni Reçete Modalını Aç
  const handleOpenNewPrescription = () => {
    setEditingPrescription(null);
    setIsPrescriptionModalVisible(true);
  };

  // Reçeteden En Yakın Eczaneyi Bulmaya Geç
  const handlePrescriptionFindPharmacy = (_prescription?: Prescription) => {
    setActiveTab('pharmacies');
    setSelectedCity('En Yakınlar');
    setSearchQuery('');
  };

  const detectedLocationName =
    userLocation?.formattedAddress ||
    (userLocation?.city
      ? `${userLocation.district ? userLocation.district + ', ' : ''}${userLocation.city}`
      : null);

  return {
    navigation,
    colors,
    isDark,
    isTr,
    language,
    activeTab,
    setActiveTab,
    selectedCity,
    setSelectedCity,
    searchQuery,
    setSearchQuery,
    pharmacies,
    userLocation,
    loading,
    locating,
    detectedLocationName,
    handleLocationRefresh,
    handleCallPharmacy: callPharmacy,
    handleOpenMap: openPharmacyMap,
    popularCities: POPULAR_CITIES,
    // Reçete Değerleri
    prescriptions,
    allMedicines: medicines,
    isPrescriptionModalVisible,
    setIsPrescriptionModalVisible,
    editingPrescription,
    handleOpenNewPrescription,
    handleOpenEditPrescription,
    handleSavePrescription,
    handleDeletePrescription,
    handlePrescriptionFindPharmacy,
  };
}
