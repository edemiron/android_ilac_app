/**
 * AdherenceLineChart — LineChart ve boş veri fallback bileşeni
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { TranslationKey } from '../../../contexts/LanguageContext';
import type { DailyStatItem } from '../hooks/useStatisticsController';

const screenWidth = Dimensions.get('window').width;

interface AdherenceLineChartProps {
  dailyStats: DailyStatItem[];
  chartData: {
    labels: string[];
    data: number[];
  };
  chartConfig: any;
  colors: ThemeColors;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export function AdherenceLineChart({
  dailyStats,
  chartData,
  chartConfig,
  colors,
  t,
}: AdherenceLineChartProps) {
  const hasData = dailyStats.some(d => d.total > 0);

  if (!hasData) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataIcon}>📊</Text>
        <Text style={[styles.noDataText, { color: colors.textMuted }]}>{t('stats_no_data')}</Text>
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
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
});
