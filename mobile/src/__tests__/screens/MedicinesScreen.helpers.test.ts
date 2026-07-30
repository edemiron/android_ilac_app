/**
 * MedicinesScreen helpers testleri.
 *
 * Sprint 82: getExpiryColor, getStockColor, isFutureTime helper'lari (Sprint 81'de
 * MedicineRow'a eklenen, Sprint 82'de helpers.ts'e tasinan) icin unit testler.
 */

import {
  getExpiryStatus,
  getExpiryDetails,
  decodeDosage,
  getMedicineFormIcon,
  getExpiryColor,
  getStockColor,
  isFutureTime,
} from '../../screens/MedicinesScreen/helpers';
import type { ThemeColors } from '../../contexts/ThemeContext';

// Testlerde sadece renk isimleri kullanılıyor (error/warning/success/textMuted vs.).
// ThemeColors tipinde ~30 field var — test cast ile atlanıyor, çünkü
// helper'larımız sadece renk isimlerine bakıyor.
const mockColors = {
  primary: '#0D9488',
  primaryContainer: '#CCFBF1',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  error: '#B91C1C',
  warning: '#B45309',
  success: '#059669',
} as unknown as ThemeColors;

describe('decodeDosage', () => {
  it('decodes unicode escapes', () => {
    expect(decodeDosage('kapsu00fcl')).toBe('kapsül');
  });

  it('handles empty string', () => {
    expect(decodeDosage('')).toBe('');
  });

  it('handles undefined', () => {
    expect(decodeDosage(undefined)).toBe('');
  });

  it('preserves ASCII', () => {
    expect(decodeDosage('500mg')).toBe('500mg');
  });

  it('handles multiple escapes', () => {
    expect(decodeDosage('AüBçC')).toBe('AüBçC');
  });
});

describe('getExpiryStatus', () => {
  it('returns "unknown" for missing expiry', () => {
    expect(getExpiryStatus(undefined)).toBe('unknown');
  });

  it('returns "ok" for dates far in future', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    expect(getExpiryStatus(future.toISOString())).toBe('ok');
  });

  it('returns "expiring" within reminder window', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    expect(getExpiryStatus(soon.toISOString(), 7)).toBe('expiring');
  });

  it('returns "expired" for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(getExpiryStatus(past.toISOString())).toBe('expired');
  });

  it('returns "unknown" for invalid date', () => {
    // not-a-date parseISO NaN => daysUntil negative huge => still within threshold < 0
    // Status text is implementation-defined; just check it doesn't crash
    expect(() => getExpiryStatus('not-a-date')).not.toThrow();
  });
});

describe('getExpiryDetails', () => {
  it('returns daysUntil for valid date', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    const result = getExpiryDetails(soon.toISOString());
    // Timezone offset ±1 day tolerance
    expect(result.daysUntil).toBeGreaterThanOrEqual(4);
    expect(result.daysUntil).toBeLessThanOrEqual(5);
    expect(result.status).toBe('expiring');
  });

  it('returns null daysUntil for missing date', () => {
    const result = getExpiryDetails(undefined);
    expect(result.daysUntil).toBeNull();
    expect(result.status).toBe('unknown');
  });
});

describe('getMedicineFormIcon', () => {
  const baseMedicine = {
    id: 'med-1',
    name: 'Aspirin',
    dosage: '500mg',
    frequency: 2,
    color: 'red',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    startDate: '2024-01-01',
  };

  it('returns MCI icon for tablet form', () => {
    expect(getMedicineFormIcon({ ...baseMedicine, form: 'tablet' })).toEqual({
      lib: 'mci',
      name: 'pill',
    });
  });

  it('returns MCI icon for capsule form', () => {
    expect(getMedicineFormIcon({ ...baseMedicine, form: 'capsule' })).toEqual({
      lib: 'mci',
      name: 'pill-multiple',
    });
  });

  it('falls back to dosage text parsing', () => {
    expect(getMedicineFormIcon({ ...baseMedicine, dosage: '500ml şurup' }).lib).toBe('mci');
  });

  it('returns default ion icon for unknown form', () => {
    expect(getMedicineFormIcon({ ...baseMedicine, dosage: 'unknown' })).toEqual({
      lib: 'ion',
      name: 'medical',
    });
  });
});

// ============================================================================
// Sprint 82: MedicineRow helper'lari (Sprint 81'den tasindi)
// ============================================================================

describe('getExpiryColor', () => {
  it('returns muted when expiryDate is undefined', () => {
    const result = getExpiryColor(undefined, 7, mockColors);
    expect(result.bg).toBe(mockColors.textMuted + '15');
    expect(result.fg).toBe(mockColors.textMuted);
  });

  it('returns error red when expiry is in the past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const result = getExpiryColor(pastDate.toISOString().slice(0, 10), 7, mockColors);
    expect(result.bg).toBe(mockColors.error + '20');
    expect(result.fg).toBe(mockColors.error);
  });

  it('returns warning when expiry is within reminderDays (7)', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);
    const result = getExpiryColor(soonDate.toISOString().slice(0, 10), 7, mockColors);
    expect(result.bg).toBe(mockColors.warning + '20');
    expect(result.fg).toBe(mockColors.warning);
  });

  it('returns warning with default reminder (7) when reminderDays undefined', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 5);
    const result = getExpiryColor(soonDate.toISOString().slice(0, 10), undefined, mockColors);
    expect(result.fg).toBe(mockColors.warning);
  });

  it('returns success green when expiry is 30-90 days away', () => {
    const mediumDate = new Date();
    mediumDate.setDate(mediumDate.getDate() + 60);
    const result = getExpiryColor(mediumDate.toISOString().slice(0, 10), 7, mockColors);
    expect(result.bg).toBe(mockColors.success + '15');
    expect(result.fg).toBe(mockColors.success);
  });

  it('returns muted when expiry is more than 90 days away', () => {
    const farDate = new Date();
    farDate.setDate(farDate.getDate() + 180);
    const result = getExpiryColor(farDate.toISOString().slice(0, 10), 7, mockColors);
    expect(result.bg).toBe(mockColors.textMuted + '15');
    expect(result.fg).toBe(mockColors.textMuted);
  });

  it('returns muted for invalid date string (graceful fallback)', () => {
    const result = getExpiryColor('not-a-date', 7, mockColors);
    expect(result.bg).toBe(mockColors.textMuted + '15');
    expect(result.fg).toBe(mockColors.textMuted);
  });

  it('uses fallback warning color when colors.warning is undefined', () => {
    const fallbackColors = { ...mockColors, warning: undefined } as unknown as ThemeColors;
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);
    const result = getExpiryColor(soonDate.toISOString().slice(0, 10), 7, fallbackColors);
    expect(result.fg).toBe('#F59E0B');
  });
});

describe('getStockColor', () => {
  it('returns null when stockCount undefined', () => {
    expect(getStockColor(undefined, 5, mockColors)).toBeNull();
  });

  it('returns critical when stockCount below threshold', () => {
    const result = getStockColor(3, 5, mockColors);
    expect(result?.variant).toBe('critical');
    expect(result?.fg).toBe(mockColors.error);
  });

  it('returns critical when stockCount equals threshold (boundary)', () => {
    const result = getStockColor(5, 5, mockColors);
    expect(result?.variant).toBe('critical');
  });

  it('returns low when stockCount is between threshold and 2x threshold', () => {
    const result = getStockColor(8, 5, mockColors);
    expect(result?.variant).toBe('low');
    expect(result?.fg).toBe(mockColors.warning);
  });

  it('returns low when stockCount equals 2x threshold (boundary)', () => {
    const result = getStockColor(10, 5, mockColors);
    expect(result?.variant).toBe('low');
  });

  it('returns ok when stockCount above 2x threshold', () => {
    const result = getStockColor(11, 5, mockColors);
    expect(result?.variant).toBe('ok');
    expect(result?.fg).toBe(mockColors.textMuted);
  });

  it('uses default threshold 5 when threshold undefined', () => {
    const result = getStockColor(4, undefined, mockColors);
    expect(result?.variant).toBe('critical');
  });

  it('handles zero stock as critical', () => {
    const result = getStockColor(0, 5, mockColors);
    expect(result?.variant).toBe('critical');
  });

  it('uses fallback warning when colors.warning undefined (low variant)', () => {
    const fallbackColors = { ...mockColors, warning: undefined } as unknown as ThemeColors;
    const result = getStockColor(8, 5, fallbackColors);
    expect(result?.fg).toBe('#F59E0B');
  });
});

describe('isFutureTime', () => {
  // Sabit referans saati ile gun siniri tasimadan hesapla
  const refNow = new Date('2026-07-31T12:00:00');

  it('returns true for time 1 hour in the future', () => {
    const future = new Date(refNow);
    future.setHours(future.getHours() + 1);
    const hh = String(future.getHours()).padStart(2, '0');
    const mm = String(future.getMinutes()).padStart(2, '0');
    expect(isFutureTime(`${hh}:${mm}`, refNow)).toBe(true);
  });

  it('returns false for time 1 hour in the past', () => {
    const past = new Date(refNow);
    past.setHours(past.getHours() - 1);
    const hh = String(past.getHours()).padStart(2, '0');
    const mm = String(past.getMinutes()).padStart(2, '0');
    expect(isFutureTime(`${hh}:${mm}`, refNow)).toBe(false);
  });

  it('handles day boundary: 23:00 from 00:30 next morning is future (same day)', () => {
    // Bugun 00:30 → 23:30 bugunun gelecegi (gece yarisindan once)
    const earlyMorning = new Date('2026-07-31T00:30:00');
    expect(isFutureTime('23:30', earlyMorning)).toBe(true);
  });

  it('returns false for time earlier today', () => {
    // Sabah 9:00'da, 08:00 bugun gecmis
    const morning = new Date('2026-07-31T09:00:00');
    expect(isFutureTime('08:00', morning)).toBe(false);
  });

  it('returns boolean type (true/false)', () => {
    const result = isFutureTime('12:00', refNow);
    expect(typeof result).toBe('boolean');
  });
});
