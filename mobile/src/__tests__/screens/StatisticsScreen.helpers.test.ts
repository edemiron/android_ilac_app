/**
 * StatisticsScreen helpers testleri.
 */

import {
  getAdherenceColor,
  getAdherenceLabel,
  calculateAdherenceRate,
  PERIOD_CONFIGS,
  ADHERENCE_LEGEND,
  STREAK_LABELS,
  DEFAULT_STATISTICS_DAYS,
} from '../../screens/StatisticsScreen/helpers';

const mockColors = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  textMuted: '#94A3B8',
};

describe('getAdherenceColor', () => {
  it('returns success for 80%+ rates', () => {
    expect(getAdherenceColor(100, mockColors)).toBe(mockColors.success);
    expect(getAdherenceColor(80, mockColors)).toBe(mockColors.success);
  });

  it('returns warning for 50-79% rates', () => {
    expect(getAdherenceColor(79, mockColors)).toBe(mockColors.warning);
    expect(getAdherenceColor(50, mockColors)).toBe(mockColors.warning);
  });

  it('returns error for 1-49% rates', () => {
    expect(getAdherenceColor(49, mockColors)).toBe(mockColors.error);
    expect(getAdherenceColor(1, mockColors)).toBe(mockColors.error);
  });

  it('returns textMuted for 0% rate', () => {
    expect(getAdherenceColor(0, mockColors)).toBe(mockColors.textMuted);
  });
});

describe('getAdherenceLabel', () => {
  it('returns Mükemmel/Excellent for high rates (TR)', () => {
    expect(getAdherenceLabel(95, 'tr')).toBe('Mükemmel');
  });

  it('returns İyi/Good for moderate rates', () => {
    expect(getAdherenceLabel(60, 'tr')).toBe('İyi');
    expect(getAdherenceLabel(60, 'en')).toBe('Good');
  });

  it('returns Düşük/Low for low rates', () => {
    expect(getAdherenceLabel(30, 'tr')).toBe('Düşük');
    expect(getAdherenceLabel(30, 'en')).toBe('Low');
  });

  it('returns Veri yok/No data for zero rate', () => {
    expect(getAdherenceLabel(0, 'tr')).toBe('Veri yok');
    expect(getAdherenceLabel(0, 'en')).toBe('No data');
  });
});

describe('calculateAdherenceRate', () => {
  it('returns ratio as percentage', () => {
    expect(calculateAdherenceRate(7, 10)).toBe(70);
    expect(calculateAdherenceRate(0, 10)).toBe(0);
    expect(calculateAdherenceRate(10, 10)).toBe(100);
  });

  it('handles zero total without divide-by-zero', () => {
    expect(calculateAdherenceRate(0, 0)).toBe(0);
    expect(calculateAdherenceRate(5, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculateAdherenceRate(2, 3)).toBe(67);
    expect(calculateAdherenceRate(1, 3)).toBe(33);
  });
});

describe('PERIOD_CONFIGS', () => {
  it('has weekly and monthly configs', () => {
    expect(PERIOD_CONFIGS.weekly.type).toBe('weekly');
    expect(PERIOD_CONFIGS.weekly.days).toBe(7);
    expect(PERIOD_CONFIGS.monthly.type).toBe('monthly');
    expect(PERIOD_CONFIGS.monthly.days).toBe(30);
  });

  it('has both TR + EN labels', () => {
    expect(PERIOD_CONFIGS.weekly.label_tr).toBe('Haftalık');
    expect(PERIOD_CONFIGS.weekly.label_en).toBe('Weekly');
    expect(PERIOD_CONFIGS.monthly.label_tr).toBe('Aylık');
    expect(PERIOD_CONFIGS.monthly.label_en).toBe('Monthly');
  });
});

describe('ADHERENCE_LEGEND', () => {
  it('has taken/skipped/missed labels', () => {
    expect(ADHERENCE_LEGEND.taken.tr).toBe('Alınan');
    expect(ADHERENCE_LEGEND.skipped.en).toBe('Skipped');
    expect(ADHERENCE_LEGEND.missed.tr).toBe('Kaçırılan');
  });
});

describe('STREAK_LABELS', () => {
  it('has day streak labels', () => {
    expect(STREAK_LABELS.days_tr).toBe('gün üst üste');
    expect(STREAK_LABELS.days_en).toBe('day streak');
    expect(STREAK_LABELS.title_tr).toBe('İlaç Serisi');
  });
});

describe('DEFAULT_STATISTICS_DAYS', () => {
  it('equals 7 (weekly default)', () => {
    expect(DEFAULT_STATISTICS_DAYS).toBe(7);
  });
});
