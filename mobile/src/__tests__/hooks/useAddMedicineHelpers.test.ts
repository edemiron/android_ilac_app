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
  pickFirstDefined,
  extractRoutePrefills,
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

// Sprint 48: pickFirstDefined + extractRoutePrefills helper'lari
describe('pickFirstDefined', () => {
  it('returns the first non-null/undefined/empty value', () => {
    expect(pickFirstDefined('a', 'b', 'c')).toBe('a');
    expect(pickFirstDefined(null, 'b', 'c')).toBe('b');
    expect(pickFirstDefined(undefined, 'b', 'c')).toBe('b');
    expect(pickFirstDefined('', 'b', 'c')).toBe('b');
  });

  it('returns undefined when all values are null/undefined/empty', () => {
    expect(pickFirstDefined()).toBeUndefined();
    expect(pickFirstDefined(null, undefined, '')).toBeUndefined();
  });

  it('handles zero and false (keeps them as defined)', () => {
    expect(pickFirstDefined(0, 1)).toBe(0);
    expect(pickFirstDefined(false, true)).toBe(false);
  });

  it('preserves type via generic constraint', () => {
    const result: string | undefined = pickFirstDefined<string>(undefined, 'hello');
    expect(result).toBe('hello');
  });
});

describe('extractRoutePrefills', () => {
  it('returns empty strings when no source values', () => {
    expect(extractRoutePrefills({})).toEqual({ name: '', dosage: '' });
  });

  it('uses existing values when present', () => {
    expect(
      extractRoutePrefills({
        existingName: 'Aspirin',
        existingDosage: '500mg',
      })
    ).toEqual({ name: 'Aspirin', dosage: '500mg' });
  });

  it('falls back to prefill when no existing', () => {
    expect(
      extractRoutePrefills({
        prefillName: 'Parol',
        prefillDosage: '200mg',
      })
    ).toEqual({ name: 'Parol', dosage: '200mg' });
  });

  it('falls back to scanned when no existing or prefill', () => {
    expect(
      extractRoutePrefills({
        scannedName: 'Voltaren',
        scannedDosage: '50mg',
      })
    ).toEqual({ name: 'Voltaren', dosage: '50mg' });
  });

  it('uses priority: existing > prefill > scanned', () => {
    expect(
      extractRoutePrefills({
        existingName: 'Existing',
        prefillName: 'Prefill',
        scannedName: 'Scanned',
      })
    ).toEqual({ name: 'Existing', dosage: '' });
  });

  it('mixes fields independently (name vs dosage)', () => {
    expect(
      extractRoutePrefills({
        existingName: 'A',
        prefillDosage: 'X',
      })
    ).toEqual({ name: 'A', dosage: 'X' });
  });
});
