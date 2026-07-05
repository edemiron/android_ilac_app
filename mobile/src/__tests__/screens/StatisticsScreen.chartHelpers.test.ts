/**
 * chartHelpers testleri (Sprint 15.4).
 */

import {
  buildChartData,
  buildPieData,
  findTopMissedTimes,
  isValidYMD,
  type DailyStat,
} from '../../screens/StatisticsScreen/chartHelpers';

const sampleDaily: DailyStat[] = [
  { date: new Date('2026-07-01'), adherenceRate: 80, total: 5 },
  { date: new Date('2026-07-02'), adherenceRate: 100, total: 3 },
  { date: new Date('2026-07-03'), adherenceRate: 50, total: 2 },
];

describe('buildChartData', () => {
  it('returns all days for weekly', () => {
    const result = buildChartData(sampleDaily, 'weekly', d => 'L');
    expect(result.labels).toHaveLength(3);
    expect(result.data).toEqual([80, 100, 50]);
  });

  it('returns every 5th day for monthly (index % 5 === 0)', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2026, 6, i + 1),
      adherenceRate: i * 10,
      total: 1,
    }));
    const result = buildChartData(many, 'monthly', d => 'X');
    expect(result.labels).toHaveLength(2);
    expect(result.data).toEqual([0, 50]);
  });

  it('uses formatLabel for labels', () => {
    const result = buildChartData(sampleDaily, 'weekly', d => d.toISOString().split('T')[0]);
    expect(result.labels[0]).toBe('2026-07-01');
  });
});

describe('buildPieData', () => {
  it('returns empty when all counts zero', () => {
    const result = buildPieData(
      { taken: 0, skipped: 0, missed: 0 },
      { success: 'g', warning: 'y', error: 'r', text: 'b' },
      { taken: 'T', skipped: 'S', missed: 'M' }
    );
    expect(result).toEqual([]);
  });

  it('returns only items with population > 0', () => {
    const result = buildPieData(
      { taken: 5, skipped: 0, missed: 2 },
      { success: 'g', warning: 'y', error: 'r', text: 'b' },
      { taken: 'T', skipped: 'S', missed: 'M' }
    );
    expect(result).toHaveLength(2);
  });

  it('uses custom legend font size', () => {
    const result = buildPieData(
      { taken: 1, skipped: 0, missed: 0 },
      { success: 'g', warning: 'y', error: 'r', text: 'b' },
      { taken: 'T', skipped: 'S', missed: 'M' },
      20
    );
    expect(result[0].legendFontSize).toBe(20);
  });
});

describe('findTopMissedTimes', () => {
  const logs = [
    { status: 'missed', scheduledTime: '2026-07-01T08:00:00Z' },
    { status: 'missed', scheduledTime: '2026-07-01T08:00:00Z' },
    { status: 'missed', scheduledTime: '2026-07-01T08:00:00Z' },
    { status: 'skipped', scheduledTime: '2026-07-01T20:00:00Z' },
    { status: 'skipped', scheduledTime: '2026-07-01T20:00:00Z' },
    { status: 'taken', scheduledTime: '2026-07-01T12:00:00Z' },
  ];

  it('groups by time slot', () => {
    const result = findTopMissedTimes(logs, 5);
    expect(result.find(r => r.time === '08:00')?.missedCount).toBe(3);
    expect(result.find(r => r.time === '20:00')?.missedCount).toBe(2);
  });

  it('filters out times with missed < 2', () => {
    const result = findTopMissedTimes(logs, 5);
    expect(result.find(r => r.time === '12:00')).toBeUndefined();
  });

  it('respects maxSuggestions limit', () => {
    const result = findTopMissedTimes(logs, 1);
    expect(result).toHaveLength(1);
  });

  it('returns empty for no logs', () => {
    expect(findTopMissedTimes([], 5)).toEqual([]);
  });
});

describe('isValidYMD', () => {
  it('returns true for valid YYYY-MM-DD format', () => {
    expect(isValidYMD('2026-07-04')).toBe(true);
  });

  it('returns false for invalid formats', () => {
    expect(isValidYMD('2026-7-4')).toBe(false);
    expect(isValidYMD('07/04/2026')).toBe(false);
  });
});
