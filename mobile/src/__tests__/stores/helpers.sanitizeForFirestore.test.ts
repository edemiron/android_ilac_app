/**
 * sanitizeForFirestore + sanitizeString testleri.
 *
 * Sprint 7.2: firestoreSync pure helpers DRY (stores/helpers/sanitize.ts).
 */

import { sanitizeString, sanitizeForFirestore } from '../../stores/helpers/sanitize';

describe('sanitizeString (shared via stores/helpers)', () => {
  it('decodes unicode escape sequences', () => {
    // String literal: 'Parol' + '\\u00fc' + 'n' (TS handles \\u00fc as literal char in string)
    expect(sanitizeString('Parolü')).toBe('Parolü');
  });

  it('handles empty/null/undefined', () => {
    expect(sanitizeString('')).toBe('');
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });

  it('passes plain ASCII unchanged', () => {
    expect(sanitizeString('Aspirin')).toBe('Aspirin');
  });
});

describe('sanitizeForFirestore', () => {
  it('removes undefined fields', () => {
    const input = { a: 1, b: undefined, c: 'hello', d: undefined };
    const result = sanitizeForFirestore(input);
    expect(result).toEqual({ a: 1, c: 'hello' });
  });

  it('preserves null fields (only undefined is removed)', () => {
    const input = { a: null, b: 0, c: '', d: false };
    const result = sanitizeForFirestore(input);
    expect(result).toEqual({ a: null, b: 0, c: '', d: false });
  });

  it('returns empty object for empty input', () => {
    expect(sanitizeForFirestore({})).toEqual({});
  });

  it('handles complex medicine object', () => {
    const medicine = {
      id: 'med-1',
      name: 'Aspirin',
      dosage: undefined,
      description: null,
      frequency: 2,
      isActive: true,
    };
    const result = sanitizeForFirestore(medicine);
    expect(result).toEqual({
      id: 'med-1',
      name: 'Aspirin',
      description: null,
      frequency: 2,
      isActive: true,
    });
    expect(result).not.toHaveProperty('dosage');
  });

  it('preserves array values', () => {
    const input = { tags: ['painkiller', 'fever'], count: undefined };
    const result = sanitizeForFirestore(input);
    expect(result.tags).toEqual(['painkiller', 'fever']);
  });
});
