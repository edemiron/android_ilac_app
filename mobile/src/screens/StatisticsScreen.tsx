import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LineChart } from 'react-native-chart-kit';
import { format, subDays, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMedicineStore } from '../stores/medicineStore';
import {
  generatePDFReport,
  sharePDFReport,
  prepareReportData,
  ReportOptions,
} from '../services/pdfReportService';
import { useAlert } from '../contexts/AlertContext';
import { createScopedLogger } from '../utils/logger';
import { withAlpha, ALPHA } from '../utils/colors'; // Sprint 103.3
import { CircularProgress } from '../components/common/CircularProgress'; // Sprint 87A: Ana Sayfa hero pattern tutarlılığı

// Sprint 6.1: StatisticsScreen.tsx (910 -> 849 satir) modularizasyonu.
// Component'ler ve helpers screens/StatisticsScreen/* altinda.
// Sprint 87: LinearGradient hero kaldirildi, Ana Sayfa CircularProgress pattern
// ile tutarli hale getirildi.
import { Section } from './StatisticsScreen/components/Section';
import type { Period } from './StatisticsScreen/helpers';
import { getAdherenceColor } from './StatisticsScreen/helpers';
import { findTopMissedTimes } from './StatisticsScreen/chartHelpers';

const screenWidth = Dimensions.get('window').width;
const log = createScopedLogger('StatisticsScreen');

export default function StatisticsScreen() {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { showAlert, showError } = useAlert();
  const { medicineLogs, medicines, settings, getAdherenceRate, getCurrentStreak } =
    useMedicineStore();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const dateLocale = language === 'tr' ? tr : enUS;

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = selectedPeriod === 'weekly' ? subDays(end, 6) : subDays(end, 29);
    return { start, end };
  }, [selectedPeriod]);

  const dailyStats = useMemo(() => {
    const days = eachDayOfInterval(dateRange);

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = medicineLogs.filter(log => log.scheduledTime.startsWith(dayStr));

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

  const overallStats = useMemo(() => {
    const logs = medicineLogs.filter(log =>
      isWithinInterval(new Date(log.scheduledTime), dateRange)
    );

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
    const logs = medicineLogs.filter(log =>
      isWithinInterval(new Date(log.scheduledTime), dateRange)
    );
    return findTopMissedTimes(logs, 2);
  }, [medicineLogs, dateRange]);

  const chartData = useMemo(() => {
    // Sprint 89A: Weekly 7-gunu sikistirmak icin EEE -> EE (2 harf).
    // TR: "Pt Sa Ca Pe Cu Cm Pa" / EN: "Mo Tu We Th Fr Sa Su"
    // Monthly (30 gun) icin her 5. gun — zaten kisa 'd' formatinda.
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

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: () => colors.textSecondary,
    propsForLabels: {
      // Sprint 89A: x-axis etiket font 10 -> 9 (7 etiket sikismasi)
      fontSize: 9,
    },
  };

  const handleGeneratePDF = async (days: 7 | 30 | 90) => {
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
  };

  const showPDFOptions = () => {
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
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Sprint 87A: Hero — Ana Sayfa CircularProgress pattern tutarlılığı */}
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <CircularProgress
          percentage={overallStats.adherenceRate}
          size={72}
          strokeWidth={8}
          progressColor={getAdherenceColor(overallStats.adherenceRate, colors)}
        />
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {language === 'tr'
              ? `${overallStats.taken}/${overallStats.total || 0} doz tamamlandı`
              : `${overallStats.taken}/${overallStats.total || 0} doses completed`}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {selectedPeriod === 'weekly'
              ? language === 'tr'
                ? 'Son 7 günde'
                : 'Last 7 days'
              : language === 'tr'
                ? 'Son 30 günde'
                : 'Last 30 days'}
          </Text>
          <View style={styles.heroStatsRow}>
            {overallStats.currentStreak > 0 && (
              <View style={styles.heroStat}>
                <Ionicons name="flame" size={14} color={colors.primary} />
                <Text style={[styles.heroStatText, { color: colors.text }]}>
                  {overallStats.currentStreak} {language === 'tr' ? 'gün seri' : 'day streak'}
                </Text>
              </View>
            )}
            {/* Sprint 91: bestStreak 0 ise gizle (sadece current streak varsa) */}
            {overallStats.bestStreak > 0 && (
              <View style={styles.heroStat}>
                <Ionicons name="flame-outline" size={14} color={colors.warning} />
                <Text style={[styles.heroStatText, { color: colors.text }]}>
                  {overallStats.bestStreak} {language === 'tr' ? 'en iyi' : 'best'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* PDF Rapor Butonu - Üstte */}
      <TouchableOpacity
        style={[styles.pdfButton, { backgroundColor: colors.primary }]}
        onPress={showPDFOptions}
        disabled={isGeneratingPDF}
      >
        {isGeneratingPDF ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
            <Text style={styles.pdfButtonText}>
              {language === 'tr' ? 'PDF Rapor Oluştur' : 'Generate PDF Report'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {suggestions.length > 0 && (
        <Section
          icon="💡"
          title={language === 'tr' ? 'ÖNERİLER' : 'SUGGESTIONS'}
          colors={colors}
          isDark={isDark}
        >
          {suggestions.map((suggestion, index) => (
            <View
              key={suggestion.time}
              style={[
                styles.suggestionRow,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.divider,
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.iconEmoji}>⚠️</Text>
              </View>
              <View style={styles.suggestionContent}>
                <Text style={[styles.suggestionText, { color: colors.text }]}>
                  {language === 'tr'
                    ? `${suggestion.time} dozunu sık kaçırıyorsun`
                    : `You often miss the ${suggestion.time} dose`}
                </Text>
                <Text style={[styles.suggestionHint, { color: colors.textMuted }]}>
                  {language === 'tr'
                    ? `Son ${selectedPeriod === 'weekly' ? '7' : '30'} günde ${suggestion.missedCount} kez`
                    : `${suggestion.missedCount} times in the last ${selectedPeriod === 'weekly' ? '7' : '30'} days`}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      )}

      <Section
        icon="📅"
        title={language === 'tr' ? 'DÖNEM SEÇİMİ' : 'PERIOD'}
        colors={colors}
        isDark={isDark}
      >
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              {
                backgroundColor:
                  selectedPeriod === 'weekly' ? withAlpha(colors.primary, ALPHA.wash) : 'transparent',
              },
              selectedPeriod === 'weekly' && { borderColor: colors.primary, borderWidth: 1 },
            ]}
            onPress={() => setSelectedPeriod('weekly')}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPeriod === 'weekly' }}
            accessibilityLabel={t('stats_weekly')}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={selectedPeriod === 'weekly' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.periodButtonText,
                { color: selectedPeriod === 'weekly' ? colors.primary : colors.textSecondary },
              ]}
            >
              {t('stats_weekly')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              {
                backgroundColor:
                  selectedPeriod === 'monthly' ? withAlpha(colors.primary, ALPHA.wash) : 'transparent',
              },
              selectedPeriod === 'monthly' && { borderColor: colors.primary, borderWidth: 1 },
            ]}
            onPress={() => setSelectedPeriod('monthly')}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPeriod === 'monthly' }}
            accessibilityLabel={t('stats_monthly')}
          >
            <Ionicons
              name="calendar"
              size={18}
              color={selectedPeriod === 'monthly' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.periodButtonText,
                { color: selectedPeriod === 'monthly' ? colors.primary : colors.textSecondary },
              ]}
            >
              {t('stats_monthly')}
            </Text>
          </TouchableOpacity>
        </View>
      </Section>

      {/* Sprint 87B: Özet grid — Ana Sayfa stat tile pattern tutarlılığı */}
      <Section
        icon="📈"
        title={language === 'tr' ? 'ÖZET' : 'SUMMARY'}
        colors={colors}
        isDark={isDark}
      >
        <View style={styles.statGrid}>
          <View style={[styles.statTile, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={[styles.statTileIcon, { backgroundColor: withAlpha(colors.success, ALPHA.fill) }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
            <Text style={[styles.statTileValue, { color: colors.success }]}>
              {overallStats.taken}
            </Text>
            <Text style={[styles.statTileLabel, { color: colors.textSecondary }]}>
              {t('home_taken')}
            </Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={[styles.statTileIcon, { backgroundColor: withAlpha(colors.warning, ALPHA.fill) }]}>
              <Ionicons name="play-skip-forward" size={20} color={colors.warning} />
            </View>
            <Text style={[styles.statTileValue, { color: colors.warning }]}>
              {overallStats.skipped}
            </Text>
            <Text style={[styles.statTileLabel, { color: colors.textSecondary }]}>
              {t('home_skipped')}
            </Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={[styles.statTileIcon, { backgroundColor: withAlpha(colors.error, ALPHA.fill) }]}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </View>
            <Text style={[styles.statTileValue, { color: colors.error }]}>
              {overallStats.missed}
            </Text>
            <Text style={[styles.statTileLabel, { color: colors.textSecondary }]}>
              {t('home_missed')}
            </Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={[styles.statTileIcon, { backgroundColor: withAlpha(colors.primary, ALPHA.fill) }]}>
              <Ionicons name="medkit" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{overallStats.total}</Text>
            <Text style={[styles.statTileLabel, { color: colors.textSecondary }]}>
              {language === 'tr' ? 'Toplam' : 'Total'}
            </Text>
          </View>
        </View>
      </Section>

      {dailyStats.some(d => d.total > 0) ? (
        <Section
          icon="📉"
          title={language === 'tr' ? 'UYUM GRAFİĞİ' : 'ADHERENCE CHART'}
          colors={colors}
          isDark={isDark}
        >
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{ data: chartData.data.length > 0 ? chartData.data : [0] }],
              }}
              width={screenWidth - 64}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisSuffix="%"
              fromZero
              withInnerLines={false}
            />
          </View>
        </Section>
      ) : (
        <Section
          icon="📉"
          title={language === 'tr' ? 'UYUM GRAFİĞİ' : 'ADHERENCE CHART'}
          colors={colors}
          isDark={isDark}
        >
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataIcon}>📊</Text>
            <Text style={[styles.noDataText, { color: colors.textMuted }]}>
              {t('stats_no_data')}
            </Text>
          </View>
        </Section>
      )}

      {overallStats.total > 0 && (
        <Section
          icon="🥧"
          title={language === 'tr' ? 'DAĞILIM' : 'DISTRIBUTION'}
          colors={colors}
          isDark={isDark}
        >
          {/* Sprint 88C: PieChart yerine custom yatay bar — daha okunur, Ana Sayfa tutarlı */}
          <View style={styles.distributionContainer}>
            {[
              {
                key: 'taken',
                label: t('home_taken'),
                count: overallStats.taken,
                color: colors.success,
                icon: 'checkmark-circle' as const,
              },
              {
                key: 'skipped',
                label: t('home_skipped'),
                count: overallStats.skipped,
                color: colors.warning,
                icon: 'play-skip-forward' as const,
              },
              {
                key: 'missed',
                label: t('home_missed'),
                count: overallStats.missed,
                color: colors.error,
                icon: 'close-circle' as const,
              },
            ].map(item => {
              const pct =
                overallStats.total > 0 ? Math.round((item.count / overallStats.total) * 100) : 0;
              // Sprint 91B: 0 deger icin "—" goster, 100% icin "Hepsi"
              const displayValue =
                item.count === 0
                  ? '—'
                  : pct === 100
                    ? language === 'tr'
                      ? 'Hepsi'
                      : 'All'
                    : `${item.count} (${pct}%)`;
              return (
                <View key={item.key} style={styles.distributionRow}>
                  <View style={styles.distributionLabelRow}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                    <Text style={[styles.distributionLabel, { color: colors.text }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.distributionValue, { color: colors.textMuted }]}>
                      {displayValue}
                    </Text>
                  </View>
                  <View style={[styles.distributionBarBg, { backgroundColor: withAlpha(item.color, ALPHA.wash) }]}>
                    <View
                      style={[
                        styles.distributionBarFill,
                        {
                          backgroundColor: item.color,
                          width: `${pct}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Section>
      )}

      <Section icon="📜" title={t('stats_history')} colors={colors} isDark={isDark}>
        {dailyStats
          .slice()
          .reverse()
          .slice(0, 7)
          .map((day, index) => {
            // Sprint 88A: medkit ikonu (Ana Sayfa TimelineItem pattern)
            const dayHasData = day.total > 0;
            const accentColor = dayHasData
              ? getAdherenceColor(day.adherenceRate, colors)
              : colors.textMuted;
            return (
              <View
                key={index}
                style={[
                  styles.historyRow,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.divider,
                  },
                ]}
              >
                <View style={styles.historyInfo}>
                  {/* Sprint 88A: medkit ikonu + hafif renkli daire */}
                  <View style={[styles.iconContainer, { backgroundColor: withAlpha(accentColor, ALPHA.fill) }]}>
                    <Ionicons name="medical" size={18} color={accentColor} />
                  </View>
                  <View style={styles.historyTextContainer}>
                    <Text style={[styles.historyDay, { color: colors.text }]} numberOfLines={1}>
                      {format(day.date, 'EEE', { locale: dateLocale })}
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                      {format(day.date, 'd MMM', { locale: dateLocale })}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyStats}>
                  {dayHasData ? (
                    <>
                      {/* Sprint 88A: sadece taken > 0 ise ✓ badge */}
                      {day.taken > 0 && (
                        <View
                          style={[styles.historyBadge, { backgroundColor: withAlpha(colors.success, ALPHA.fill) }]}
                        >
                          <Ionicons name="checkmark" size={11} color={colors.success} />
                          <Text style={[styles.historyBadgeText, { color: colors.success }]}>
                            {day.taken}
                          </Text>
                        </View>
                      )}
                      {(day.skipped > 0 || day.missed > 0) && (
                        <View
                          style={[styles.historyBadge, { backgroundColor: withAlpha(colors.error, ALPHA.fill) }]}
                        >
                          <Ionicons name="close" size={11} color={colors.error} />
                          <Text style={[styles.historyBadgeText, { color: colors.error }]}>
                            {day.skipped + day.missed}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.historyNoData, { color: colors.textMuted }]}>—</Text>
                  )}
                </View>
                {/* Sprint 88A: yüzde değeri */}
                <Text style={[styles.historyRate, { color: accentColor }]}>
                  {dayHasData ? `%${day.adherenceRate}` : '—'}
                </Text>
              </View>
            );
          })}
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Sprint 87A: Ana Sayfa hero pattern'i — CircularProgress + metin + alt istatistikler
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroText: {
    flex: 1,
    marginLeft: 16,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  heroStatsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  // Sprint 87B: 2x2 stat grid (Alındı/Atlandı/Kaçırıldı/Toplam)
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 6,
  },
  statTile: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  statTileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statTileValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statTileLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  chartContainer: {
    padding: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  // Sprint 88C: Dağılım custom yatay bar (PieChart yerine)
  distributionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  distributionRow: {
    marginBottom: 12,
  },
  distributionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  distributionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  distributionValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  distributionBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: 8,
    borderRadius: 4,
  },
  chart: {
    borderRadius: 12,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noDataIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 15,
    textAlign: 'center',
  },
  // Sprint 88A: kompakt history kart (padding 12->10, badge'lerde ikon + sayi)
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyDay: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 1,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 10,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyNoData: {
    fontSize: 13,
  },
  historyRate: {
    fontSize: 15,
    fontWeight: '700',
    width: 48,
    textAlign: 'right',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  suggestionHint: {
    fontSize: 13,
    marginTop: 2,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
