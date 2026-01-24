import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { format, subDays, startOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMedicineStore } from '../stores/medicineStore';

const screenWidth = Dimensions.get('window').width;

type Period = 'weekly' | 'monthly';

export default function StatisticsScreen() {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { medicineLogs, medicines, getAdherenceRate } = useMedicineStore();
  
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');
  
  const dateLocale = language === 'tr' ? tr : enUS;
  
  // Seçilen periyoda göre tarih aralığı
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = selectedPeriod === 'weekly' 
      ? subDays(end, 6) 
      : subDays(end, 29);
    return { start, end };
  }, [selectedPeriod]);
  
  // Günlük istatistikleri hesapla
  const dailyStats = useMemo(() => {
    const days = eachDayOfInterval(dateRange);
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = medicineLogs.filter(log => 
        log.scheduledTime.startsWith(dayStr)
      );
      
      const taken = dayLogs.filter(l => l.status === 'taken').length;
      const total = dayLogs.length || 1; // 0'a bölmekten kaçın
      
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
  
  // Genel istatistikler
  const overallStats = useMemo(() => {
    const logs = medicineLogs.filter(log => 
      isWithinInterval(new Date(log.scheduledTime), dateRange)
    );
    
    const taken = logs.filter(l => l.status === 'taken').length;
    const skipped = logs.filter(l => l.status === 'skipped').length;
    const missed = logs.filter(l => l.status === 'missed').length;
    const total = logs.length || 1;
    
    // Ardışık gün hesapla
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
  
  // Grafik verileri
  const chartData = useMemo(() => {
    const labels = selectedPeriod === 'weekly'
      ? dailyStats.map(d => format(d.date, 'EEE', { locale: dateLocale }))
      : dailyStats.filter((_, i) => i % 5 === 0).map(d => format(d.date, 'd', { locale: dateLocale }));
    
    const data = selectedPeriod === 'weekly'
      ? dailyStats.map(d => d.adherenceRate)
      : dailyStats.filter((_, i) => i % 5 === 0).map(d => d.adherenceRate);
    
    return { labels, data };
  }, [dailyStats, selectedPeriod, dateLocale]);
  
  // Pasta grafik verileri
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
    color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: () => colors.textSecondary,
    propsForLabels: {
      fontSize: 10,
    },
  };

  const styles = createStyles(colors, isDark);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Periyot Seçici */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'weekly' && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod('weekly')}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === 'weekly' && styles.periodButtonTextActive,
          ]}>
            {t('stats_weekly')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'monthly' && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod('monthly')}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === 'monthly' && styles.periodButtonTextActive,
          ]}>
            {t('stats_monthly')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Özet Kartları */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.adherenceCard]}>
          <Text style={styles.adherenceValue}>{overallStats.adherenceRate}%</Text>
          <Text style={styles.adherenceLabel}>{t('stats_adherence_rate')}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.smallCard]}>
            <Text style={[styles.smallCardValue, { color: colors.success }]}>
              {overallStats.taken}
            </Text>
            <Text style={styles.smallCardLabel}>{t('home_taken')}</Text>
          </View>
          <View style={[styles.summaryCard, styles.smallCard]}>
            <Text style={[styles.smallCardValue, { color: colors.error }]}>
              {overallStats.missed + overallStats.skipped}
            </Text>
            <Text style={styles.smallCardLabel}>{t('stats_total_missed')}</Text>
          </View>
        </View>
        
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.smallCard]}>
            <Text style={[styles.smallCardValue, { color: colors.primary }]}>
              {overallStats.currentStreak}
            </Text>
            <Text style={styles.smallCardLabel}>{t('stats_streak')}</Text>
          </View>
          <View style={[styles.summaryCard, styles.smallCard]}>
            <Text style={[styles.smallCardValue, { color: colors.accent }]}>
              {overallStats.bestStreak}
            </Text>
            <Text style={styles.smallCardLabel}>{t('stats_best_streak')}</Text>
          </View>
        </View>
      </View>
      
      {/* Uyum Oranı Grafiği */}
      {dailyStats.some(d => d.total > 0) ? (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{t('stats_adherence_rate')}</Text>
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [{ data: chartData.data.length > 0 ? chartData.data : [0] }],
            }}
            width={screenWidth - 40}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            yAxisSuffix="%"
            fromZero
            withInnerLines={false}
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>{t('stats_no_data')}</Text>
        </View>
      )}
      
      {/* Pasta Grafik */}
      {pieData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Dağılım</Text>
          <PieChart
            data={pieData}
            width={screenWidth - 40}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}
      
      {/* Geçmiş Listesi */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>{t('stats_history')}</Text>
        {dailyStats.slice().reverse().slice(0, 7).map((day, index) => (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyDate}>
              <Text style={styles.historyDay}>
                {format(day.date, 'EEEE', { locale: dateLocale })}
              </Text>
              <Text style={styles.historyDateText}>
                {format(day.date, 'd MMMM', { locale: dateLocale })}
              </Text>
            </View>
            <View style={styles.historyStats}>
              {day.total > 0 ? (
                <>
                  <View style={[styles.historyBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.historyBadgeText, { color: colors.success }]}>
                      ✓ {day.taken}
                    </Text>
                  </View>
                  {day.skipped > 0 && (
                    <View style={[styles.historyBadge, { backgroundColor: colors.warning + '20' }]}>
                      <Text style={[styles.historyBadgeText, { color: colors.warning }]}>
                        ⊘ {day.skipped}
                      </Text>
                    </View>
                  )}
                  {day.missed > 0 && (
                    <View style={[styles.historyBadge, { backgroundColor: colors.error + '20' }]}>
                      <Text style={[styles.historyBadgeText, { color: colors.error }]}>
                        ✗ {day.missed}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.historyNoData}>-</Text>
              )}
            </View>
            <Text style={[
              styles.historyRate,
              { color: day.adherenceRate >= 80 ? colors.success : day.adherenceRate >= 50 ? colors.warning : colors.error }
            ]}>
              {day.total > 0 ? `${day.adherenceRate}%` : '-'}
            </Text>
          </View>
        ))}
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    padding: 16,
    paddingTop: 0,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  adherenceCard: {
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  adherenceValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  adherenceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallCard: {
    flex: 1,
    alignItems: 'center',
  },
  smallCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  smallCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: colors.card,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    backgroundColor: colors.card,
    margin: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  historyContainer: {
    backgroundColor: colors.card,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  historyDate: {
    flex: 1,
  },
  historyDay: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  historyDateText: {
    fontSize: 12,
    color: colors.textSecondary,
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
    fontWeight: '500',
  },
  historyNoData: {
    fontSize: 14,
    color: colors.textMuted,
  },
  historyRate: {
    fontSize: 16,
    fontWeight: '600',
    width: 45,
    textAlign: 'right',
  },
});
