/**
 * useInteractionsController — InteractionsScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Aktif ilaçların çapraz etkileşim analizi, ciddiyet seviyesi çözümleme ve
 * sonuç state yönetimini UI bileşeninden izole eder.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMedicineStore } from '../../../stores/medicineStore';
import {
  checkMultipleInteractions,
  type InteractionCheckResult,
  type DrugInteraction,
} from '../../../services/drugInteraction';

export function useInteractionsController() {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { medicines } = useMedicineStore();

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<InteractionCheckResult | null>(null);

  const activeMedicines = useMemo(() => medicines.filter(m => m.isActive), [medicines]);

  const checkInteractions = useCallback(async () => {
    setIsLoading(true);

    // Küçük bir gecikme ile UX iyileştirmesi
    await new Promise(resolve => setTimeout(resolve, 500));

    const drugNames = activeMedicines.map(m => m.name);
    const checkResult = await checkMultipleInteractions(drugNames);

    setResult(checkResult);
    setIsLoading(false);
  }, [activeMedicines]);

  useEffect(() => {
    checkInteractions();
  }, [checkInteractions]);

  const getSeverityText = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'high':
        return t('interaction_severity_high');
      case 'moderate':
        return t('interaction_severity_moderate');
      case 'low':
        return t('interaction_severity_low');
    }
  };

  return {
    colors,
    isDark,
    language,
    t,
    activeMedicines,
    isLoading,
    result,
    checkInteractions,
    getSeverityText,
  };
}
