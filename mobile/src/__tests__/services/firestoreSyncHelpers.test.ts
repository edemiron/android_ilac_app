/**
 * firestoreSyncHelpers testleri.
 */

import {
  chunkArray,
  countBatchOperations,
  calculateBatchCount,
  FIRESTORE_BATCH_LIMIT,
  COLLECTIONS,
  FIRESTORE_PATHS,
  SETTINGS_DOCUMENT_ID,
  extractUserIdFromPath,
} from '../../services/firestoreSyncHelpers';

describe('FIRESTORE_BATCH_LIMIT', () => {
  it('equals 500 (Firestore hard limit)', () => {
    expect(FIRESTORE_BATCH_LIMIT).toBe(500);
  });
});

describe('COLLECTIONS', () => {
  it('has expected collection names', () => {
    expect(COLLECTIONS.USERS).toBe('users');
    expect(COLLECTIONS.MEDICINES).toBe('medicines');
    expect(COLLECTIONS.REMINDER_TIMES).toBe('reminderTimes');
    expect(COLLECTIONS.MEDICINE_LOGS).toBe('medicineLogs');
    expect(COLLECTIONS.SETTINGS).toBe('settings');
  });
});

describe('chunkArray', () => {
  it('chunks array into equal pieces', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const chunks = chunkArray(arr, 3);
    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('returns single chunk for small arrays', () => {
    expect(chunkArray([1, 2], 5)).toEqual([[1, 2]]);
  });

  it('returns empty array for empty input', () => {
    expect(chunkArray([], 3)).toEqual([]);
  });

  it('handles exact multiple', () => {
    const arr = [1, 2, 3, 4, 5, 6];
    expect(chunkArray(arr, 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it('throws for chunkSize <= 0', () => {
    expect(() => chunkArray([1, 2, 3], 0)).toThrow();
    expect(() => chunkArray([1, 2, 3], -1)).toThrow();
  });
});

describe('countBatchOperations', () => {
  it('counts set + delete operations', () => {
    const ops = [
      { type: 'set' as const, ref: 'r1' },
      { type: 'set' as const, ref: 'r2' },
      { type: 'delete' as const, ref: 'r3' },
    ];
    const result = countBatchOperations(ops);
    expect(result.set).toBe(2);
    expect(result.delete).toBe(1);
    expect(result.total).toBe(3);
  });

  it('handles empty array', () => {
    const result = countBatchOperations([]);
    expect(result.set).toBe(0);
    expect(result.delete).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('calculateBatchCount', () => {
  it('returns correct batch count for exact multiple', () => {
    expect(calculateBatchCount(1000, 500)).toBe(2);
  });

  it('rounds up for partial remainder', () => {
    expect(calculateBatchCount(501, 500)).toBe(2);
    expect(calculateBatchCount(750, 500)).toBe(2);
  });

  it('returns 0 for empty', () => {
    expect(calculateBatchCount(0, 500)).toBe(0);
    expect(calculateBatchCount(-5, 500)).toBe(0);
  });

  it('uses default limit when not provided', () => {
    expect(calculateBatchCount(501)).toBe(2); // 500 default
    expect(calculateBatchCount(1500)).toBe(3);
  });
});

describe('Sprint 9.1: FIRESTORE_PATHS', () => {
  it('builds user doc path', () => {
    expect(FIRESTORE_PATHS.USER_DOC('user-1')).toBe('users/user-1');
  });

  it('builds medicines collection path', () => {
    expect(FIRESTORE_PATHS.MEDICINES_COLLECTION('user-1')).toBe('users/user-1/medicines');
  });

  it('builds settings doc path with constant id', () => {
    expect(FIRESTORE_PATHS.SETTINGS_DOC('user-1')).toBe('users/user-1/settings/userSettings');
    expect(SETTINGS_DOCUMENT_ID).toBe('userSettings');
  });

  it('uses COLLECTIONS constants consistently', () => {
    expect(FIRESTORE_PATHS.REMINDER_TIMES_COLLECTION('abc')).toBe(
      `users/abc/${COLLECTIONS.REMINDER_TIMES}`
    );
  });
});

describe('Sprint 9.1: extractUserIdFromPath', () => {
  it('extracts userId from user doc path', () => {
    expect(extractUserIdFromPath('users/user-1/medicines')).toBe('user-1');
  });

  it('extracts userId from settings path', () => {
    expect(extractUserIdFromPath('users/abc-123/settings/userSettings')).toBe('abc-123');
  });

  it('returns null for too-short path', () => {
    expect(extractUserIdFromPath('users')).toBeNull();
    expect(extractUserIdFromPath('')).toBeNull();
  });
});
