/**
 * StatisticsScreen — chart data helpers.
 *
 * Sprint 15.4: useMemo pure logic helpers modulu. I/O bagimliligi
 * olmadan unit test edilebilir.
 */

export type Period = 'weekly' | 'monthly';

export interface DailyStat {
  date: Date;
  adherenceRate: number;
  total: number;
}

export interface PieItem {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

/**
 * Chart data builder — period'a gore labels + adherence rates.
 * Weekly: her gun icin 'EEE' (Mon, Tue, ...).
 * Monthly: 5'er gun atlayarak 'd' (1, 6, 11, 16, ...).
 */
export function buildChartData(
  dailyStats: DailyStat[],
  selectedPeriod: Period,
  formatLabel: (date: Date) => string
): { labels: string[]; data: number[] } {
  const isWeekly = selectedPeriod === 'weekly';
  const filtered = isWeekly ? dailyStats : dailyStats.filter((_, i) => i % 5 === 0);

  return {
    labels: filtered.map(d => formatLabel(d.date)),
    data: filtered.map(d => d.adherenceRate),
  };
}

/**
 * Pie chart data builder — taken/skipped/missed dilimleri.
 * population > 0 olan dilimler filtrelenir.
 */
export function buildPieData(
  counts: { taken: number; skipped: number; missed: number },
  colors: { success: string; warning: string; error: string; text: string },
  labels: { taken: string; skipped: string; missed: string },
  legendFontSize = 12
): PieItem[] {
  const all: PieItem[] = [
    {
      name: labels.taken,
      population: counts.taken,
      color: colors.success,
      legendFontColor: colors.text,
      legendFontSize,
    },
    {
      name: labels.skipped,
      population: counts.skipped,
      color: colors.warning,
      legendFontColor: colors.text,
      legendFontSize,
    },
    {
      name: labels.missed,
      population: counts.missed,
      color: colors.error,
      legendFontColor: colors.text,
      legendFontSize,
    },
  ];
  return all.filter(item => item.population > 0);
}

/**
 * Suggestions builder — en sik missed zaman dilimlerini tespit eder.
 * maxSuggestions default 2.
 */
export function findTopMissedTimes(
  logs: Array<{ status: string; scheduledTime: string }>,
  maxSuggestions = 2
): Array<{ time: string; missedCount: number }> {
  const timeStats: Record<string, { missed: number; total: number }> = {};

  for (const log of logs) {
    const time = log.scheduledTime.split('T')[1]?.substring(0, 5) || '';
    if (!time) continue;
    if (!timeStats[time]) {
      timeStats[time] = { missed: 0, total: 0 };
    }
    timeStats[time].total++;
    if (log.status === 'missed' || log.status === 'skipped') {
      timeStats[time].missed++;
    }
  }

  return Object.entries(timeStats)
    .filter(([_, stats]) => stats.missed >= 2)
    .sort((a, b) => b[1].missed - a[1].missed)
    .slice(0, maxSuggestions)
    .map(([time, stats]) => ({ time, missedCount: stats.missed }));
}

/**
 * Bugun + YYYY-MM-DD validation helper.
 */
export function isValidYMD(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
