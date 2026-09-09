/**
 * useMedicineProspectusController — MedicineProspectusScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Veritabanı ve yapay zeka tabanlı prospektüs sorgulama, yenileme ve hata yönetimini izole eder.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { RootStackParamList, MedicineProspectus } from '../../../types';
import { getMedicineInfoAI } from '../../../services/aiMedicineService';
import { getMedicineById } from '../../../services/globalMedicineService';

type RouteProps = RouteProp<RootStackParamList, 'MedicineProspectus'>;

export function useMedicineProspectusController() {
  const route = useRoute<RouteProps>();
  const { medicineId, medicineName, dosage } = route.params;

  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [prospectus, setProspectus] = useState<MedicineProspectus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProspectus = useCallback(async () => {
    setError(null);

    try {
      if (medicineId) {
        const dbMedicine = await getMedicineById(medicineId);
        if (dbMedicine?.prospectus) {
          setProspectus(dbMedicine.prospectus);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      const result = await getMedicineInfoAI(medicineName, dosage);

      if (result.success && result.medicine?.prospectus) {
        setProspectus(result.medicine.prospectus);
      } else {
        setError(result.error || 'Prospektüs bilgisi alınamadı');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [medicineId, medicineName, dosage]);

  useEffect(() => {
    fetchProspectus();
  }, [fetchProspectus]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProspectus();
  };

  return {
    colors,
    isDark,
    language,
    t,
    medicineName,
    dosage,
    isLoading,
    isRefreshing,
    prospectus,
    error,
    handleRefresh,
  };
}
