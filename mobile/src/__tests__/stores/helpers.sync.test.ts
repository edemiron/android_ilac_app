/**
 * stores/helpers/sync tests
 */

import {
  getSyncErrorMessage,
  applySavedMedicineCloudData,
  hasPendingMedicineImageBackfill,
  scheduleBackgroundSync,
} from '../../stores/helpers/sync';
import type { Medicine } from '../../types';

const baseMedicine: Medicine = {
  id: 'med-1',
  name: 'Aspirin',
  dosage: '500mg',
  frequency: 2,
  color: 'red',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  startDate: '2024-01-01',
  imageUri: 'file:///local/image.jpg',
  imageStoragePath: 'gs://bucket/path.jpg',
};

describe('getSyncErrorMessage', () => {
  it('returns error.message for Error instances', () => {
    expect(getSyncErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns Turkish fallback for non-Error values', () => {
    expect(getSyncErrorMessage('plain string')).toBe('Senkronizasyon hatasi');
    expect(getSyncErrorMessage({ code: 'x' })).toBe('Senkronizasyon hatasi');
    expect(getSyncErrorMessage(null)).toBe('Senkronizasyon hatasi');
  });
});

describe('applySavedMedicineCloudData', () => {
  it('returns original array when medicineId does not match', () => {
    const result = applySavedMedicineCloudData([baseMedicine], 'other-id', {});
    expect(result).toEqual([baseMedicine]);
  });

  it('updates updatedAt when provided', () => {
    const result = applySavedMedicineCloudData([baseMedicine], 'med-1', {
      updatedAt: '2025-01-01T00:00:00Z',
    });
    expect(result[0].updatedAt).toBe('2025-01-01T00:00:00Z');
  });

  it('clears local imageUri when clearLocalImage is true', () => {
    const result = applySavedMedicineCloudData([baseMedicine], 'med-1', {
      clearLocalImage: true,
    });
    expect(result[0].imageUri).toBeUndefined();
  });

  it('uses localImageUri when clearLocalImage is false', () => {
    const result = applySavedMedicineCloudData([baseMedicine], 'med-1', {
      localImageUri: 'file:///new.jpg',
    });
    expect(result[0].imageUri).toBe('file:///new.jpg');
  });

  it('preserves image metadata fields from cloud', () => {
    const result = applySavedMedicineCloudData([baseMedicine], 'med-1', {
      imageStoragePath: 'gs://new/path.jpg',
      imageMimeType: 'image/png',
      imageSize: 12345,
      imageUpdatedAt: '2025-06-01T00:00:00Z',
    });
    expect(result[0].imageStoragePath).toBe('gs://new/path.jpg');
    expect(result[0].imageMimeType).toBe('image/png');
    expect(result[0].imageSize).toBe(12345);
    expect(result[0].imageUpdatedAt).toBe('2025-06-01T00:00:00Z');
  });
});

describe('hasPendingMedicineImageBackfill', () => {
  it('returns true for local URI without storagePath', () => {
    const med: Medicine = {
      ...baseMedicine,
      imageUri: 'file:///local.jpg',
      imageStoragePath: undefined,
    };
    expect(hasPendingMedicineImageBackfill(med)).toBe(true);
  });

  it('returns false when storagePath already set', () => {
    expect(hasPendingMedicineImageBackfill(baseMedicine)).toBe(false);
  });

  it('returns false when no local URI', () => {
    const med: Medicine = {
      ...baseMedicine,
      imageUri: 'https://cdn.example.com/img.jpg',
      imageStoragePath: undefined,
    };
    expect(hasPendingMedicineImageBackfill(med)).toBe(false);
  });
});

describe('scheduleBackgroundSync', () => {
  it('runs the function and catches errors silently', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('async boom'));
    expect(() => scheduleBackgroundSync(fn)).not.toThrow();
    await new Promise(r => setTimeout(r, 10));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
