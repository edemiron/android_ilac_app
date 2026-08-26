/**
 * useDutyPharmacyController — DutyPharmacyScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * GPS konum tespiti, şehir ve ilçe bazlı nöbetçi eczane sorguları,
 * harita yönlendirme ve arama işlemlerini UI bileşeninden izole eder.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  getDutyPharmacies,
  callPharmacy,
  openPharmacyMap,
  getUserCurrentLocation,
  type DutyPharmacy,
  type UserCoordinates,
  POPULAR_CITIES,
} from '../../../services/pharmacyService';

export function useDutyPharmacyController() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [selectedCity, setSelectedCity] = useState<string>('En Yakınlar');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pharmacies, setPharmacies] = useState<DutyPharmacy[]>([]);
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [locating, setLocating] = useState<boolean>(false);

  // GPS Konumunu Al
  const fetchLocation = useCallback(async () => {
    setLocating(true);
    const coords = await getUserCurrentLocation();
    setUserLocation(coords);
    setLocating(false);
    return coords;
  }, []);

  // İlk açılışta GPS iste ve listeyi getir
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

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
  }, [fetchLocation]);

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
  };
}
