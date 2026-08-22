/**
 * useStatisticsController — StatisticsScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * İstatistik, grafik veri hesaplama, tarih aralıkları ve PDF rapor
 * yönetimini UI bileşeninden izole eder.
 */

import { useState, useMemo, useCallback } from 'react';
import { format, subDays, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMedicineStore } from '../../../stores/medicineStore';
import { useAlert } from '../../../contexts/AlertContext';
import {
  generatePDFReport,
  sharePDFReport,
  prepareReportData,
  ReportOptions,
} from '../../../services/pdfReportService';
import { createScopedLogger } from '../../../utils/logger';
import type { Period } from '../helpers';
import { findTopMissedTimes } from '../chartHelpers';

const log = createScopedLogger('StatisticsController');

export interface DailyStatItem {
  date: Date;
  taken: number;
  skipped: number;
  missed: number;
  total: number;
  adherenceRate: number;
}

export interface OverallStats {
  taken: number;
  skipped: number;
  missed: number;
  total: number;
  adherenceRate: number;
  currentStreak: number;
  bestStreak: number;
}

export function useStatisticsController() {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { showAlert, showError } = useAlert();

  const medicineLogs = useMedicineStore(state => state.medicineLogs);
  const medicines = useMedicineStore(state => state.medicines);
  const reminderTimes = useMedicineStore(state => state.reminderTimes);
  const settings = useMedicineStore(state => state.settings);
  const getAdherenceRate = useMedicineStore(state => state.getAdherenceRate);
  const getCurrentStreak = useMedicineStore(state => state.getCurrentStreak);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');
  const [activeStatsTab, setActiveStatsTab] = useState<'overview' | 'calendar'>('overview');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const dateLocale = language === 'tr' ? tr : enUS;

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = selectedPeriod === 'weekly' ? subDays(end, 6) : subDays(end, 29);
    return { start, end };
  }, [selectedPeriod]);

  const dailyStats: DailyStatItem[] = useMemo(() => {
    const days = eachDayOfInterval(dateRange);

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = medicineLogs.filter(l => l.scheduledTime.startsWith(dayStr));

      const taken = dayLogs.filter(l => l.status === 'taken').length;
      const total = dayLogs.length || 1;

      return {
        date: day,
        taken,
        skipped: dayLogs.filter(l => l.status === 'skipped').length,
        missed: dayLogs.filter(l => l.status === 'missed').length,
        total: dayLogs.length,
        adherenceRate: Math.round((taken / total) * 100),
      };
    });
  }, [dateRange, medicineLogs]);

  const overallStats: OverallStats = useMemo(() => {
    const logs = medicineLogs.filter(l => isWithinInterval(new Date(l.scheduledTime), dateRange));

    const taken = logs.filter(l => l.status === 'taken').length;
    const skipped = logs.filter(l => l.status === 'skipped').length;
    const missed = logs.filter(l => l.status === 'missed').length;
    const total = logs.length || 1;

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = dailyStats.length - 1; i >= 0; i--) {
      if (dailyStats[i].adherenceRate === 100 && dailyStats[i].total > 0) {
        tempStreak++;
        if (i === dailyStats.length - 1) {
          currentStreak = tempStreak;
        }
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    return {
      taken,
      skipped,
      missed,
      total: logs.length,
      adherenceRate: Math.round((taken / total) * 100),
      currentStreak,
      bestStreak,
    };
  }, [dateRange, medicineLogs, dailyStats]);

  const suggestions = useMemo(() => {
    const logs = medicineLogs.filter(l => isWithinInterval(new Date(l.scheduledTime), dateRange));
    return findTopMissedTimes(logs, 2);
  }, [medicineLogs, dateRange]);

  const chartData = useMemo(() => {
    const labels =
      selectedPeriod === 'weekly'
        ? dailyStats.map(d => format(d.date, 'EE', { locale: dateLocale }))
        : dailyStats
            .filter((_, i) => i % 5 === 0)
            .map(d => format(d.date, 'd', { locale: dateLocale }));

    const data =
      selectedPeriod === 'weekly'
        ? dailyStats.map(d => d.adherenceRate)
        : dailyStats.filter((_, i) => i % 5 === 0).map(d => d.adherenceRate);

    return { labels, data };
  }, [dailyStats, selectedPeriod, dateLocale]);

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.card,
      backgroundGradientTo: colors.card,
      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.5,
      useShadowColorFromDataset: false,
      decimalPlaces: 0,
      labelColor: () => colors.textSecondary,
      propsForLabels: {
        fontSize: 9,
      },
    }),
    [colors]
  );

  const handleGeneratePDF = useCallback(
    async (days: 7 | 30 | 90) => {
      try {
        setIsGeneratingPDF(true);

        const reportData = prepareReportData(
          medicines,
          medicineLogs,
          settings,
          getAdherenceRate(days),
          getCurrentStreak(),
          days
        );

        const options: ReportOptions = {
          days,
          includeDetails: true,
          language: language as 'tr' | 'en',
        };

        const filePath = await generatePDFReport(reportData, options);

        if (filePath) {
          await sharePDFReport(filePath);
        } else {
          showError(
            language === 'tr' ? 'Hata' : 'Error',
            language === 'tr' ? 'PDF oluşturulamadı' : 'Could not generate PDF'
          );
        }
      } catch (error) {
        log.error('PDF error', error);
        showError(
          language === 'tr' ? 'Hata' : 'Error',
          language === 'tr' ? 'PDF oluşturulurken bir hata oluştu' : 'Error generating PDF'
        );
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [medicines, medicineLogs, settings, getAdherenceRate, getCurrentStreak, language, showError]
  );

  const showPDFOptions = useCallback(() => {
    showAlert({
      type: 'info',
      title: language === 'tr' ? 'Rapor Oluştur' : 'Generate Report',
      message:
        language === 'tr'
          ? 'Hangi dönem için rapor oluşturmak istiyorsunuz?'
          : 'Which period do you want to report?',
      buttons: [
        {
          text: language === 'tr' ? 'Son 7 Gün' : 'Last 7 Days',
          onPress: () => handleGeneratePDF(7),
        },
        {
          text: language === 'tr' ? 'Son 30 Gün' : 'Last 30 Days',
          onPress: () => handleGeneratePDF(30),
        },
        {
          text: language === 'tr' ? 'Son 90 Gün' : 'Last 90 Days',
          onPress: () => handleGeneratePDF(90),
        },
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
      ],
    });
  }, [language, showAlert, handleGeneratePDF]);

  return {
    colors,
    isDark,
    t,
    language,
    dateLocale,
    selectedPeriod,
    setSelectedPeriod,
    activeStatsTab,
    setActiveStatsTab,
    isGeneratingPDF,
    dailyStats,
    overallStats,
    suggestions,
    chartData,
    chartConfig,
    medicines,
    reminderTimes,
    medicineLogs,
    handleGeneratePDF,
    showPDFOptions,
  };
}
