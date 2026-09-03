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
  getSettingsFromCloud,
  syncSettingsToCloud,
} from '../../services/firestoreSync';
import { Medicine, ReminderTime, MedicineLog, UserSettings } from '../../types';
import { DEVICE_LOCAL_SETTING_KEYS } from '../../domain/settingsScope';

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

/** `deleteField()` yerine kullanilan sentinel — bkz. mock icindeki aciklama. */
const DELETE_FIELD_SENTINEL = { __deleteField: true } as const;

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  // v1.7.9: `syncSettingsToCloud` cihaza ozel alanlari (PIN hash'i vb.)
  // ESKI dokumanlardan da temizliyor. Sentinel bir nesne donduruyoruz ki
  // testler yukte hangi alanin silinmek uzere isaretlendigini gorebilsin.
  deleteField: () => DELETE_FIELD_SENTINEL,
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

  /** Yukleme testleri icin minimal ayar nesnesi. */
  const mockSettingsForUpload = {
    wakeUpTime: '08:00',
    sleepTime: '23:00',
    language: 'tr',
    vibrationEnabled: true,
    alarmModeEnabled: true,
  } as UserSettings;

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

    /**
     * v1.7.1 — C4: ayar dokumani yoksa artik BOS nesne doner.
     *
     * Eskiden `DEFAULT_SETTINGS` donuyordu; birlestirmede bu varsayilanlar
     * kullanicinin YEREL ayarlarini eziyordu (ornegin ttsVolume 35 → 80).
     * Yerel ayarlarin korunmasi icin bulutta olmayan alan hic donmemeli.
     */
    it('bulutta ayar dokumani yoksa BOS ayar doner (yerel korunur)', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'med-1',
            ref: { id: 'med-1' },
            data: () => ({ id: 'med-1', name: 'X' }),
          },
        ],
        forEach: function (cb: (doc: unknown) => void) {
          cb({ id: 'med-1', ref: { id: 'med-1' }, data: () => ({ id: 'med-1', name: 'X' }) });
        },
      });

      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await downloadAllDataFromCloud(userId);

      expect(result).not.toBeNull();
      expect(result?.settings).toEqual({});
    });
  });

  /**
   * v1.7.1 — C4. `getSettingsFromCloud` alanlari TEK TEK sayiyordu ve
   * listede 13 ayar YOKTU (guvenlik, TTS, kalici bildirim): buluta
   * yukleniyor ama GERI INDIRILMIYORDU. Ayrica her alan `?? varsayilan`
   * ile donduruldugu icin bulut KOSULSUZ kaziniyordu.
   */
  describe('getSettingsFromCloud', () => {
    it('bulutta yazili TUM alanlari dondurur (TTS / guvenlik / kalici bildirim dahil)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          wakeUpTime: '06:30',
          ttsVolume: 35,
          ttsRepeatCount: 3,
          securityEnabled: true,
          securityType: 'pin',
          lockTimeout: 120,
          persistentNotificationEnabled: false,
          persistentNotificationDuration: 30,
          settingsUpdatedAt: '2026-05-02T09:00:00.000Z',
        }),
      });

      const settings = await getSettingsFromCloud(userId);

      expect(settings).toEqual({
        wakeUpTime: '06:30',
        ttsVolume: 35,
        ttsRepeatCount: 3,
        securityEnabled: true,
        securityType: 'pin',
        lockTimeout: 120,
        persistentNotificationEnabled: false,
        persistentNotificationDuration: 30,
        settingsUpdatedAt: '2026-05-02T09:00:00.000Z',
      });
    });

    it('dokumanda OLMAYAN alani VARSAYILANLA doldurmaz', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ wakeUpTime: '06:30' }),
      });

      const settings = await getSettingsFromCloud(userId);

      // Eskiden burada 15 alan + varsayilanlar donuyordu.
      expect(Object.keys(settings ?? {})).toEqual(['wakeUpTime']);
      expect(settings?.ttsVolume).toBeUndefined();
    });

    it('settingsUpdatedAt yoksa Firestore updatedAt damgasina duser', async () => {
      const date = new Date('2026-05-02T09:00:00.000Z');
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          wakeUpTime: '06:30',
          updatedAt: { toDate: () => date },
        }),
      });

      const settings = await getSettingsFromCloud(userId);

      expect(settings?.settingsUpdatedAt).toBe(date.toISOString());
      // `updatedAt` bir UserSettings alani DEGIL; sizdirilmamali.
      expect((settings as Record<string, unknown>)?.updatedAt).toBeUndefined();
    });

    it('dokuman yoksa null doner', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      await expect(getSettingsFromCloud(userId)).resolves.toBeNull();
    });
  });

  describe('syncSettingsToCloud', () => {
    it('son-yazan-kazanir damgasini buluta yazar', async () => {
      mockDoc.mockReturnValue({ id: 'settings' });

      await syncSettingsToCloud(userId, {
        ...mockSettingsForUpload,
        settingsUpdatedAt: '2026-05-02T09:00:00.000Z',
      });

      const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
      expect(written.settingsUpdatedAt).toBe('2026-05-02T09:00:00.000Z');
    });

    it('damga yoksa yukleme aninda uretir', async () => {
      mockDoc.mockReturnValue({ id: 'settings' });

      await syncSettingsToCloud(userId, mockSettingsForUpload);

      const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
      expect(typeof written.settingsUpdatedAt).toBe('string');
      expect(Number.isNaN(Date.parse(written.settingsUpdatedAt as string))).toBe(false);
    });

    /**
     * v1.7.2 — korlemesine tam dokuman yazimi kaldirildi.
     *
     * Indirme yalnizca uygulama acilisinda yapildigi icin bir cihaz gunlerce
     * bayat kalabiliyor. Eskiden o cihazda TEK bir ayar degistirmek
     * dokumanin TAMAMINI yaziyor ve diger cihazin yeni degerlerini buluttan
     * SILIYORDU. Bu kayip alan bazli damgayla cozulmez: bayat deger taze
     * damgayla yazilir. Bu yuzden yazim artik kismi + merge.
     */
    it('merge: true ile yazar (degismeyen alanlar dokumanda kalir)', async () => {
      mockDoc.mockReturnValue({ id: 'settings' });

      await syncSettingsToCloud(userId, { alarmVolume: 100 });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
    });

    it('YALNIZCA verilen alanlari yazar — digerlerine dokunmaz', async () => {
      mockDoc.mockReturnValue({ id: 'settings' });

      await syncSettingsToCloud(userId, { quietHoursEnabled: true });

      const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;

      // Yalnizca degisen alan + iki damga DEGER olarak yazilir. `alarmVolume`
      // GONDERILMEMELI: gonderilse bayat deger diger cihazin yeni degerini
      // ezerdi.
      const valueKeys = Object.keys(written)
        .filter(key => !DEVICE_LOCAL_SETTING_KEYS.includes(key as never))
        .sort();
      expect(valueKeys).toEqual(['quietHoursEnabled', 'settingsUpdatedAt', 'updatedAt'].sort());
      expect(written.alarmVolume).toBeUndefined();
      expect(written.wakeUpTime).toBeUndefined();
    });

    /**
     * ⚠️ v1.7.9 — PIN HASH'I BULUTA GITMEZ, ESKI DOKUMANDAN DA SILINIR.
     *
     * `updateSettings` degisen alanlari kosulsuz buraya veriyordu; guvenlik
     * alanlari da buluta ve oradan DIGER CIHAZA yaziliyordu (telefonda PIN
     * kuran kullanicinin tableti de ayni PIN ile kilitleniyordu).
     */
    it('cihaza ozel alanlar DEGER olarak YAZILMAZ', async () => {
      mockDoc.mockReturnValue({ id: 'settings' });

      await syncSettingsToCloud(userId, {
        wakeUpTime: '09:00',
        securityPin: 'sha256-gizli',
        securityType: 'pin',
        biometricsEnabled: true,
        lockTimeout: 5,
      } as never);

      const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
      expect(written.wakeUpTime).toBe('09:00');
      // Deger olarak DEGIL, silme isaretcisi olarak bulunmalilar.
      expect(written.securityPin).toEqual({ __deleteField: true });
      expect(written.securityType).toEqual({ __deleteField: true });
      expect(written.biometricsEnabled).toEqual({ __deleteField: true });
      expect(written.lockTimeout).toEqual({ __deleteField: true });
    });

    it('ESKI dokumanlardaki cihaza ozel alanlar acikca SILINIR', async () => {
      mockDoc.mockReturnValue({ id: 'settings' });

      await syncSettingsToCloud(userId, { wakeUpTime: '09:00' });

      const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
      for (const key of DEVICE_LOCAL_SETTING_KEYS) {
        expect(written[key]).toEqual({ __deleteField: true });
      }
    });

    it('tanimsiz alanlari atlar (Firestore undefined kabul etmez)', async () => {
      mockDoc.mockReturnValue({ id: 'settings' });

      await syncSettingsToCloud(userId, {
        alarmVolume: 90,
        quietHoursStart: undefined,
      });

      const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
      expect(written.alarmVolume).toBe(90);
      expect('quietHoursStart' in written).toBe(false);
    });

    it('ilk tam yukleme hala TUM alanlari yazar', async () => {
      mockDoc.mockReturnValue({ id: 'settings' });

      await syncSettingsToCloud(userId, mockSettingsForUpload);

      const written = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
      for (const key of Object.keys(mockSettingsForUpload)) {
        expect(written[key]).toBe(
          (mockSettingsForUpload as unknown as Record<string, unknown>)[key]
        );
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
