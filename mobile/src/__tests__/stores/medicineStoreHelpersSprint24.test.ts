/**
 * medicineStoreHelpers Sprint 24 ek helper testleri.
 *
 * Sprint 24.2 + 24.3: clearAllData storage keys + drift report helper'lari.
 */

import {
  MEDICINE_STORE_STORAGE_KEYS,
  getMedicineStoreStorageKeysForRemoval,
  buildSelfHealNoDriftResult,
  buildSelfHealRepairContext,
} from '../../stores/medicineStoreHelpers';

describe('MEDICINE_STORE_STORAGE_KEYS', () => {
  it('contains 3 expected keys', () => {
    expect(MEDICINE_STORE_STORAGE_KEYS).toHaveLength(3);
    expect(MEDICINE_STORE_STORAGE_KEYS).toContain('medicine-store');
    expect(MEDICINE_STORE_STORAGE_KEYS).toContain('medicine-store-sync-queue');
    expect(MEDICINE_STORE_STORAGE_KEYS).toContain('@medicine_storage');
  });

  it('is readonly tuple', () => {
    // as const donusumu sayesinde readonly tuple
    expect(typeof MEDICINE_STORE_STORAGE_KEYS[0]).toBe('string');
  });
});

describe('getMedicineStoreStorageKeysForRemoval', () => {
  it('returns the same readonly array', () => {
    const result = getMedicineStoreStorageKeysForRemoval();
    expect(result).toEqual(MEDICINE_STORE_STORAGE_KEYS);
  });

  it('returns 3 items', () => {
    expect(getMedicineStoreStorageKeysForRemoval()).toHaveLength(3);
  });
});

describe('buildSelfHealNoDriftResult', () => {
  it('returns driftReport + zero arrays when no repair', () => {
    const drift = { hasDrift: false, missingNotificationIds: [], configDriftIds: [] };
    const result = buildSelfHealNoDriftResult(drift, 0);
    expect(result.hasDrift).toBe(false);
    expect(result.cancelledNotificationIds).toEqual([]);
    expect(result.snoozeNotificationUpdates).toEqual([]);
    expect(result.repaired).toBe(false);
  });

  it('marks repaired=true when stale snoozes were cleaned', () => {
    const drift = { hasDrift: false, missingNotificationIds: [], configDriftIds: [] };
    const result = buildSelfHealNoDriftResult(drift, 5);
    expect(result.repaired).toBe(true);
  });

  it('preserves driftReport fields', () => {
    const drift = {
      hasDrift: false,
      missingNotificationIds: ['a'],
      configDriftIds: ['b'],
      customField: 'preserved',
    };
    const result = buildSelfHealNoDriftResult(drift, 0);
    expect(result.customField).toBe('preserved');
  });
});

describe('buildSelfHealRepairContext', () => {
  it('builds context with all counts', () => {
    const ctx = buildSelfHealRepairContext(
      ['m1', 'm2'],
      ['c1'],
      ['o1', 'o2', 'o3'],
      ['l1'],
      5,
      2,
      4
    );
    expect(ctx).toEqual({
      missingCount: 2,
      configDriftCount: 1,
      orphanCount: 3,
      legacySnoozeCount: 1,
      cancelledCount: 5,
      cleanedStaleSnoozeCount: 2,
      snoozeUpdateCount: 4,
    });
  });

  it('handles empty arrays', () => {
    const ctx = buildSelfHealRepairContext([], [], [], [], 0, 0, 0);
    expect(ctx).toEqual({
      missingCount: 0,
      configDriftCount: 0,
      orphanCount: 0,
      legacySnoozeCount: 0,
      cancelledCount: 0,
      cleanedStaleSnoozeCount: 0,
      snoozeUpdateCount: 0,
    });
  });
});
