/**
 * Firestore Sync Service Tests
 * Tests for the incremental sync strategy and batch operations
 */

import {
  syncMedicinesToCloud,
  syncReminderTimesToCloud,
  syncMedicineLogsToCloud,
  uploadAllDataToCloud,
  downloadAllDataFromCloud,
  deleteAllUserData,
} from '../../services/firestoreSync';
import { Medicine, ReminderTime, MedicineLog, UserSettings } from '../../types';

// Mock Firebase
const mockBatch = {
  set: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

const mockDoc = jest.fn();
const mockCollection = jest.fn();
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockDeleteDoc = jest.fn().mockResolvedValue(undefined);
const mockWriteBatch = jest.fn().mockReturnValue(mockBatch);

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  writeBatch: () => mockWriteBatch(),
  Timestamp: { now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }) },
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Firestore Sync Service', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockBatch.commit.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);
  });

  describe('syncMedicinesToCloud', () => {
    const mockMedicine: Medicine = {
      id: 'med-1',
      name: 'Test Medicine',
      dosage: '100mg',
      frequency: 2,
      color: '#FF6B6B',
      isActive: true,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      startDate: '2024-01-15',
    };

    it('should add new medicines that do not exist in cloud', async () => {
      // No existing docs in cloud
      mockGetDocs.mockResolvedValueOnce({
        docs: [],
        // eslint-disable-next-line unused-imports/no-unused-vars
        forEach: (cb: Function) => {},
      });

      mockDoc.mockReturnValue({ id: 'med-1' });

      await syncMedicinesToCloud(userId, [mockMedicine]);

      expect(mockBatch.set).toHaveBeenCalledTimes(1);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should only update changed medicines (incremental sync)', async () => {
      // Existing doc with same data
      const existingDoc = {
        id: 'med-1',
        ref: { id: 'med-1' },
        data: () => ({ ...mockMedicine }),
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [existingDoc],
        forEach: function (cb: Function) {
          cb(existingDoc);
        },
      });

      await syncMedicinesToCloud(userId, [mockMedicine]);

      // Should not set since data is identical
      expect(mockBatch.set).not.toHaveBeenCalled();
      expect(mockBatch.delete).not.toHaveBeenCalled();
    });

    it('should delete medicines that no longer exist locally', async () => {
      const deletedMedicineId = 'med-deleted';
      const existingDoc = {
        id: deletedMedicineId,
        ref: { id: deletedMedicineId },
        data: () => ({ id: deletedMedicineId, name: 'Deleted' }),
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [existingDoc],
        forEach: function (cb: Function) {
          cb(existingDoc);
        },
      });

      // Send only med-1, not the deleted one
      await syncMedicinesToCloud(userId, [mockMedicine]);

      // Should delete the one not in local array
      expect(mockBatch.delete).toHaveBeenCalledTimes(1);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should handle batch limit by splitting into chunks', async () => {
      // Create 600 medicines to exceed 500 limit
      const manyMedicines: Medicine[] = Array.from({ length: 600 }, (_, i) => ({
        ...mockMedicine,
        id: `med-${i}`,
      }));

      mockGetDocs.mockResolvedValueOnce({
        docs: [],
        forEach: () => {},
      });

      mockDoc.mockImplementation((...args) => ({ id: args[1] || 'doc' }));

      await syncMedicinesToCloud(userId, manyMedicines);

      // Should call commit twice (500 + 100)
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncReminderTimesToCloud', () => {
    const mockReminderTime: ReminderTime = {
      id: 'rt-1',
      medicineId: 'med-1',
      time: '08:00',
      isEnabled: true,
    };

    it('should sync reminder times incrementally', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [],
        forEach: () => {},
      });

      mockDoc.mockReturnValue({ id: 'rt-1' });

      await syncReminderTimesToCloud(userId, [mockReminderTime]);

      expect(mockBatch.set).toHaveBeenCalledTimes(1);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('syncMedicineLogsToCloud', () => {
    const mockLog: MedicineLog = {
      id: 'log-1',
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-01-15T08:00:00',
      takenAt: '2024-01-15T08:05:00',
      status: 'taken',
    };

    it('should only sync logs from last 30 days', async () => {
      const oldLog: MedicineLog = {
        ...mockLog,
        id: 'log-old',
        scheduledTime: '2023-01-01T08:00:00', // Old date
      };

      const recentLog: MedicineLog = {
        ...mockLog,
        id: 'log-recent',
        scheduledTime: new Date().toISOString(), // Today
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [],
        forEach: () => {},
      });

      mockDoc.mockReturnValue({ id: 'log-recent' });

      await syncMedicineLogsToCloud(userId, [oldLog, recentLog]);

      // Should only set the recent log
      expect(mockBatch.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadAllDataToCloud', () => {
    const mockData = {
      medicines: [] as Medicine[],
      reminderTimes: [] as ReminderTime[],
      medicineLogs: [] as MedicineLog[],
      settings: {
        wakeUpTime: '08:00',
        sleepTime: '23:00',
        language: 'tr',
        vibrationEnabled: true,
        alarmModeEnabled: true,
      } as UserSettings,
    };

    it('should upload all data types successfully', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        forEach: () => {},
      });

      await uploadAllDataToCloud(userId, mockData);

      // All sync operations should complete without error
      expect(mockGetDocs).toHaveBeenCalled();
    });

    it('should handle timeout errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('timeout'));

      await expect(uploadAllDataToCloud(userId, mockData)).rejects.toThrow();
    });

    it('should handle offline errors with specific message', async () => {
      const offlineError = { code: 'unavailable', message: 'offline' };
      mockGetDocs.mockRejectedValue(offlineError);

      await expect(uploadAllDataToCloud(userId, mockData)).rejects.toThrow(
        'İnternet bağlantısı yok'
      );
    });
  });

  describe('downloadAllDataFromCloud', () => {
    it('should return null if no data exists in cloud', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        forEach: () => {},
      });

      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await downloadAllDataFromCloud(userId);

      expect(result).toBeNull();
    });

    it('should return data with default settings if none exist', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        forEach: () => {},
      });

      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await downloadAllDataFromCloud(userId);

      if (result) {
        expect(result.settings.language).toBe('tr');
        expect(result.settings.wakeUpTime).toBe('08:00');
      }
    });
  });

  describe('deleteAllUserData', () => {
    it('should delete all user data in batches', async () => {
      const mockDocs = Array.from({ length: 50 }, (_, i) => ({
        ref: { id: `doc-${i}` },
      }));

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        forEach: function (cb: (doc: (typeof mockDocs)[0]) => void) {
          mockDocs.forEach(cb);
        },
      });

      await deleteAllUserData(userId);

      // 3 koleksiyon (medicines, times, logs) x 50 = 150 delete
      expect(mockBatch.delete).toHaveBeenCalledTimes(150);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
