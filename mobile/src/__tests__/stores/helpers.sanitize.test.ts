/**
 * stores/helpers/sanitize tests
 */

import { sanitizeString, sanitizeMedicineData } from '../../stores/helpers/sanitize';

describe('sanitizeString', () => {
  it('decodes \\uXXXX literal escape sequences', () => {
    expect(sanitizeString('Parol\\u00fc')).toBe('Parolü');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString('')).toBe('');
  });

  it('passes through plain ASCII unchanged', () => {
    expect(sanitizeString('Aspirin')).toBe('Aspirin');
  });

  it('passes through plain UTF-8 unchanged (already decoded)', () => {
    expect(sanitizeString('Parolü')).toBe('Parolü');
  });

  it('handles multiple escapes in one string', () => {
    expect(sanitizeString('\\u011e\\u00fczel')).toBe('Ğüzel');
  });

  it('handles invalid 4-char escape (skips it)', () => {
    expect(sanitizeString('test\\uXX00')).toBe('test\\uXX00');
  });
});

describe('sanitizeMedicineData', () => {
  it('sanitizes name and dosage', () => {
    const input = { name: 'Parol\\u00fc', dosage: '500mg\\u00b7' };
    const result = sanitizeMedicineData(input);
    expect(result.name).toBe('Parolü');
    expect(result.dosage).toBe('500mg·');
  });

  it('returns shallow copy preserving other fields', () => {
    const input = { id: 'med-1', name: 'Aspirin', dosage: '100mg', color: 'red' };
    const result = sanitizeMedicineData(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input); // new reference
  });

  it('skips non-string fields', () => {
    const input = { name: 42 as unknown, dosage: undefined };
    const result = sanitizeMedicineData(input);
    expect(result.name).toBe(42); // unchanged (not a string)
    expect(result.dosage).toBeUndefined();
  });

  it('returns input object unchanged if no string fields present', () => {
    const input = { id: 'med-1' } as unknown as { id: string; name?: string; dosage?: string };
    const result = sanitizeMedicineData(input);
    expect(result).toEqual(input);
  });
});
