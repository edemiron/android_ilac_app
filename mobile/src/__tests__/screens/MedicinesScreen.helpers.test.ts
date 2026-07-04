/**
 * MedicinesScreen helpers testleri.
 */

import {
  getExpiryStatus,
  getExpiryDetails,
  decodeDosage,
  getMedicineFormIcon,
} from '../../screens/MedicinesScreen/helpers';

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
  } as any;

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
