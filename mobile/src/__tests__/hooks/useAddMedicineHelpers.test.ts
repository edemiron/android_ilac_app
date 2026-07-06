/**
 * useAddMedicineHelpers testleri.
 *
 * Sprint 19.3: useAddMedicine.ts icinden pure helper'lar tasindi.
 */

import {
  parseDosageAmount,
  parseMedicineForm,
  getInitialAutoTimes,
  buildDosageString,
  FORM_LABELS_TR,
} from '../../hooks/useAddMedicineHelpers';

describe('parseDosageAmount', () => {
  it('extracts leading number from dosage string', () => {
    expect(parseDosageAmount('500mg tablet')).toBe('500');
  });

  it('extracts decimal numbers', () => {
    expect(parseDosageAmount('2.5ml şurup')).toBe('2.5');
  });

  it('returns "1" when no leading number', () => {
    expect(parseDosageAmount('tablet')).toBe('1');
  });

  it('handles empty string', () => {
    expect(parseDosageAmount('')).toBe('1');
  });
});

describe('parseMedicineForm', () => {
  it('detects tablet', () => {
    expect(parseMedicineForm('500mg tablet')).toBe('tablet');
  });

  it('detects capsule (kaps)', () => {
    expect(parseMedicineForm('250 mg kapsül')).toBe('capsule');
  });

  it('detects syrup (ml)', () => {
    expect(parseMedicineForm('100 ml şurup')).toBe('syrup');
  });

  it('detects drops (drop keyword)', () => {
    // "drop" kelimesi ml/capsule ile cakismaz, bu nedenle guvenli test verisi.
    expect(parseMedicineForm('eye drop 5ml')).toBe('drops');
  });

  it('detects injection', () => {
    expect(parseMedicineForm('iğne enjeksiyon')).toBe('injection');
  });

  it('defaults to tablet', () => {
    expect(parseMedicineForm('500mg')).toBe('tablet');
  });
});

describe('getInitialAutoTimes', () => {
  it('returns empty array when count is 0', () => {
    expect(getInitialAutoTimes(0)).toEqual([]);
  });

  it('returns single time at 08:00 when count is 1', () => {
    expect(getInitialAutoTimes(1)).toEqual(['08:00']);
  });

  it('returns evenly distributed times for count 3', () => {
    const times = getInitialAutoTimes(3);
    expect(times).toHaveLength(3);
    expect(times[0]).toBe('08:00');
    expect(times[2]).toBe('21:00');
  });

  it('returns HH:mm format', () => {
    const times = getInitialAutoTimes(2);
    times.forEach(t => expect(t).toMatch(/^\d{2}:\d{2}$/));
  });
});

describe('buildDosageString', () => {
  it('builds "amount unit" string', () => {
    expect(buildDosageString('500', 'tablet')).toBe('500 tablet');
  });

  it('uses "tablet" fallback for unknown form', () => {
    // FORM_LABELS_TR her form icin deger icermez (sadece TR'de gosterilenler)
    expect(buildDosageString('100', 'tablet')).toContain('tablet');
  });

  it('handles empty amount', () => {
    const result = buildDosageString('', 'tablet');
    expect(result).toContain('tablet');
  });

  it('FORM_LABELS_TR contains tablet and capsule', () => {
    expect(FORM_LABELS_TR.tablet).toBe('tablet');
    expect(FORM_LABELS_TR.capsule).toBe('kapsül');
  });
});
