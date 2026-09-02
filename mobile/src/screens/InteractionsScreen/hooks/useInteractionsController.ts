/**
 * useInteractionsController — InteractionsScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Aktif ilaçların çapraz ilaç etkileşimleri, gıda/alkol/yaşam tarzı kısıtlamaları
 * ve Gemini 3.6 Flash Klinik Kalkanı durum yönetimini UI bileşeninden izole eder.
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
import {
  checkFoodAndLifestyleInteractions,
  type MatchedFoodInteraction,
} from '../../../services/foodDrugInteractions';
import {
  analyzeClinicalAndFoodInteractionsWithAI,
  type ClinicalInteractionAIReport,
} from '../../../services/aiMedicineService';

export type InteractionTabType = 'drugs' | 'food' | 'ai';

export function useInteractionsController() {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { medicines } = useMedicineStore();

  const [activeTab, setActiveTab] = useState<InteractionTabType>('drugs');
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<InteractionCheckResult | null>(null);

  // Gıda & Yaşam Tarzı Sonuçları
  const [foodInteractions, setFoodInteractions] = useState<MatchedFoodInteraction[]>([]);

  // AI Klinik Raporu
  const [aiReport, setAiReport] = useState<ClinicalInteractionAIReport | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);

  const activeMedicines = useMemo(() => medicines.filter(m => m.isActive), [medicines]);

  const checkInteractions = useCallback(async () => {
    setIsLoading(true);

    const drugNames = activeMedicines.map(m => m.name);

    // 1. İlaç - İlaç Etkileşimleri (RxNav + Local)
    const checkResult = await checkMultipleInteractions(drugNames);
    setResult(checkResult);

    // 2. İlaç - Gıda & Alkol Etkileşimleri (TİTCK / FDA Local)
    const foodList = checkFoodAndLifestyleInteractions(drugNames, language === 'tr' ? 'tr' : 'en');
    setFoodInteractions(foodList);

    setIsLoading(false);
  }, [activeMedicines, language]);

  useEffect(() => {
    checkInteractions();
  }, [checkInteractions]);

  // Canlı AI Klinik Analizi Çalıştır
  const runAIAnalysis = useCallback(async () => {
    if (activeMedicines.length === 0) return;
    setIsAILoading(true);
    try {
      const report = await analyzeClinicalAndFoodInteractionsWithAI(
        activeMedicines,
        language === 'tr' ? 'tr' : 'en'
      );
      setAiReport(report);
    } catch (_) {
      // Fail-safe
    } finally {
      setIsAILoading(false);
    }
  }, [activeMedicines, language]);

  // AI sekmesine geçildiğinde daha önce analiz yapılmadıysa otomatik tetikle
  const handleTabChange = useCallback(
    (tab: InteractionTabType) => {
      setActiveTab(tab);
      if (tab === 'ai' && !aiReport && !isAILoading && activeMedicines.length > 0) {
        void runAIAnalysis();
      }
    },
    [aiReport, isAILoading, activeMedicines.length, runAIAnalysis]
  );

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
    activeTab,
    setActiveTab: handleTabChange,
    foodInteractions,
    aiReport,
    isAILoading,
    runAIAnalysis,
    checkInteractions,
    getSeverityText,
  };
}
