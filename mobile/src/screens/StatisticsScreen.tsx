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
import LinearGradient from 'react-native-linear-gradient';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { format, subDays, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMedicineStore } from '../stores/medicineStore';
import {
  generatePDFReport,
  sharePDFReport,
  prepareReportData,
  ReportOptions,
} from '../services/pdfReportService';
import { useAlert } from '../contexts/AlertContext';

const screenWidth = Dimensions.get('window').width;

type Period = 'weekly' | 'monthly';

interface SectionProps {
  icon: string;
  title: string;
  children: React.ReactNode;
  colors: ThemeColors;
  isDark: boolean;
}

const Section: React.FC<SectionProps> = ({ icon, title, children, colors, isDark }) => (
  <View
    style={[
      styles.section,
      {
        backgroundColor: colors.card,
        shadowOpacity: isDark ? 0 : 0.05,
        elevation: isDark ? 0 : 1,
      },
    ]}
  >
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
    </View>
    {children}
  </View>
);

interface StatRowProps {
  icon: string;
  iconBg: string;
  label: string;
  value: string | number;
  valueColor?: string;
  colors: ThemeColors;
  isFirst?: boolean;
}

const StatRow: React.FC<StatRowProps> = ({
  icon,
  iconBg,
  label,
  value,
  valueColor,
  colors,
  isFirst,
}) => (
  <View
    style={[
      styles.statRow,
      !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
    ]}
  >
    <View style={styles.statInfo}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Text style={styles.iconEmoji}>{icon}</Text>
      </View>
      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
    </View>
    <Text style={[styles.statValue, { color: valueColor || colors.primary }]}>{value}</Text>
  </View>
);

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
    const logs = medicineLogs.filter(
      log =>
        isWithinInterval(new Date(log.scheduledTime), dateRange) &&
        (log.status === 'missed' || log.status === 'skipped')
    );

    const timeStats: Record<string, { missed: number; total: number }> = {};

    logs.forEach(log => {
      const time = log.scheduledTime.split('T')[1]?.substring(0, 5) || '';
      if (!timeStats[time]) {
        timeStats[time] = { missed: 0, total: 0 };
      }
      timeStats[time].missed++;
      timeStats[time].total++;
    });

    const problematicTimes = Object.entries(timeStats)
      .filter(([_, stats]) => stats.missed >= 2)
      .sort((a, b) => b[1].missed - a[1].missed)
      .slice(0, 2);

    return problematicTimes.map(([time, stats]) => ({
      time,
      missedCount: stats.missed,
    }));
  }, [medicineLogs, dateRange]);

  const chartData = useMemo(() => {
    const labels =
      selectedPeriod === 'weekly'
        ? dailyStats.map(d => format(d.date, 'EEE', { locale: dateLocale }))
        : dailyStats
            .filter((_, i) => i % 5 === 0)
            .map(d => format(d.date, 'd', { locale: dateLocale }));

    const data =
      selectedPeriod === 'weekly'
        ? dailyStats.map(d => d.adherenceRate)
        : dailyStats.filter((_, i) => i % 5 === 0).map(d => d.adherenceRate);

    return { labels, data };
  }, [dailyStats, selectedPeriod, dateLocale]);

  const pieData = useMemo(() => {
    if (overallStats.total === 0) return [];

    return [
      {
        name: t('home_taken'),
        population: overallStats.taken,
        color: colors.success,
        legendFontColor: colors.text,
        legendFontSize: 12,
      },
      {
        name: t('home_skipped'),
        population: overallStats.skipped,
        color: colors.warning,
        legendFontColor: colors.text,
        legendFontSize: 12,
      },
      {
        name: t('home_missed'),
        population: overallStats.missed,
        color: colors.error,
        legendFontColor: colors.text,
        legendFontSize: 12,
      },
    ].filter(item => item.population > 0);
  }, [overallStats, colors, t]);

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
      fontSize: 10,
    },
  };

  const getAdherenceColor = (rate: number) => {
    if (rate >= 80) return colors.success;
    if (rate >= 50) return '#F59E0B';
    return '#EF4444';
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
      console.error('PDF error:', error);
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
      <LinearGradient
        colors={
          overallStats.adherenceRate >= 50
            ? [colors.primary, colors.gradientEnd || '#3B82F6']
            : ['#F59E0B', '#F97316']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.adherenceCard}
      >
        <View style={styles.adherenceContent}>
          <View style={styles.adherenceIconBox}>
            <Text style={styles.adherenceIconEmoji}>
              {overallStats.adherenceRate >= 80
                ? '🌟'
                : overallStats.adherenceRate >= 50
                  ? '📊'
                  : '💪'}
            </Text>
          </View>
          <View style={styles.adherenceTextContainer}>
            <Text style={styles.adherenceTitle}>
              {language === 'tr'
                ? `${overallStats.taken}/${overallStats.total || 0} tamamlandı`
                : `${overallStats.taken}/${overallStats.total || 0} completed`}
            </Text>
            <Text style={styles.adherenceSubtitle}>
              {overallStats.adherenceRate >= 80
                ? language === 'tr'
                  ? 'Harika gidiyorsun! 🎉'
                  : "You're doing great! 🎉"
                : overallStats.adherenceRate >= 50
                  ? language === 'tr'
                    ? 'İyi gidiyorsun, devam et!'
                    : 'Good progress, keep going!'
                  : overallStats.total === 0
                    ? language === 'tr'
                      ? 'Henüz veri yok'
                      : 'No data yet'
                    : language === 'tr'
                      ? 'Bugün başlayalım! 💪'
                      : "Let's start today! 💪"}
            </Text>
          </View>
        </View>
        <Text style={styles.adherenceValue}>%{overallStats.adherenceRate}</Text>
      </LinearGradient>

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
                  selectedPeriod === 'weekly' ? colors.primary + '15' : 'transparent',
              },
              selectedPeriod === 'weekly' && { borderColor: colors.primary, borderWidth: 1 },
            ]}
            onPress={() => setSelectedPeriod('weekly')}
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
                  selectedPeriod === 'monthly' ? colors.primary + '15' : 'transparent',
              },
              selectedPeriod === 'monthly' && { borderColor: colors.primary, borderWidth: 1 },
            ]}
            onPress={() => setSelectedPeriod('monthly')}
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

      <Section
        icon="📈"
        title={language === 'tr' ? 'ÖZET' : 'SUMMARY'}
        colors={colors}
        isDark={isDark}
      >
        <StatRow
          icon="✅"
          iconBg="#DCFCE7"
          label={t('home_taken')}
          value={overallStats.taken}
          valueColor={colors.success}
          colors={colors}
          isFirst
        />
        <StatRow
          icon="⏭️"
          iconBg="#FEF3C7"
          label={t('home_skipped')}
          value={overallStats.skipped}
          valueColor={colors.warning}
          colors={colors}
        />
        <StatRow
          icon="❌"
          iconBg="#FEE2E2"
          label={t('home_missed')}
          value={overallStats.missed}
          valueColor={colors.error}
          colors={colors}
        />
        <StatRow
          icon="🔥"
          iconBg="#FEF3C7"
          label={t('stats_streak')}
          value={`${overallStats.currentStreak} ${language === 'tr' ? 'gün' : 'days'}`}
          colors={colors}
        />
        <StatRow
          icon="🏆"
          iconBg="#DBEAFE"
          label={t('stats_best_streak')}
          value={`${overallStats.bestStreak} ${language === 'tr' ? 'gün' : 'days'}`}
          colors={colors}
        />
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

      {pieData.length > 0 && (
        <Section
          icon="🥧"
          title={language === 'tr' ? 'DAĞILIM' : 'DISTRIBUTION'}
          colors={colors}
          isDark={isDark}
        >
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              width={screenWidth - 64}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </Section>
      )}

      <Section icon="📜" title={t('stats_history')} colors={colors} isDark={isDark}>
        {dailyStats
          .slice()
          .reverse()
          .slice(0, 7)
          .map((day, index) => (
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
                <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <Text style={styles.iconEmoji}>📅</Text>
                </View>
                <View style={styles.historyTextContainer}>
                  <Text style={[styles.historyDay, { color: colors.text }]}>
                    {format(day.date, 'EEEE', { locale: dateLocale })}
                  </Text>
                  <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                    {format(day.date, 'd MMMM', { locale: dateLocale })}
                  </Text>
                </View>
              </View>
              <View style={styles.historyStats}>
                {day.total > 0 ? (
                  <>
                    <View style={[styles.historyBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.historyBadgeText, { color: colors.success }]}>
                        ✓{day.taken}
                      </Text>
                    </View>
                    {(day.skipped > 0 || day.missed > 0) && (
                      <View style={[styles.historyBadge, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.historyBadgeText, { color: colors.error }]}>
                          ✗{day.skipped + day.missed}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={[styles.historyNoData, { color: colors.textMuted }]}>-</Text>
                )}
              </View>
              <Text
                style={[
                  styles.historyRate,
                  {
                    color: day.total > 0 ? getAdherenceColor(day.adherenceRate) : colors.textMuted,
                  },
                ]}
              >
                {day.total > 0 ? `%${day.adherenceRate}` : '-'}
              </Text>
            </View>
          ))}
      </Section>

      {/* PDF Rapor Butonu */}
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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  adherenceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  adherenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  adherenceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adherenceIconEmoji: {
    fontSize: 24,
  },
  adherenceTextContainer: {
    flex: 1,
  },
  adherenceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  adherenceSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  adherenceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    minWidth: 70,
    textAlign: 'right',
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
  chartContainer: {
    padding: 16,
    paddingTop: 8,
    alignItems: 'center',
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
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 15,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 12,
    marginTop: 2,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 12,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyNoData: {
    fontSize: 14,
  },
  historyRate: {
    fontSize: 16,
    fontWeight: '700',
    width: 50,
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
