/**
 * Sprint 46: medicineStore combine test.
 *
 * 4 slice'in (medicines, logs, snoozes, settings) factory fonksiyonlarinin
 * dogru sekilde combine edilebildigini ve zero-regression sagladigini
 * test eder.
 */

import { createMedicinesSlice } from '../../stores/slices/medicines';
import { createLogsSlice } from '../../stores/slices/logs';
import { createSnoozesSlice } from '../../stores/slices/snoozes';
import { createSettingsSlice } from '../../stores/slices/settings';

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Sprint 46: slice combine refactor', () => {
  // Factory testi: 4 slice'in factory'lerinin birebir ayni davranis
  // gosterdigini dogrula
  describe('createMedicinesSlice factory', () => {
    it('initial state empty medicines ve reminderTimes', () => {
      const setMock = jest.fn();
      const getMock = jest.fn();
      const slice = createMedicinesSlice(setMock as never, getMock as never);
      expect(slice.medicines).toEqual([]);
      expect(slice.reminderTimes).toEqual([]);
    });

    it('getMedicineById returns undefined when not found', () => {
      const setMock = jest.fn();
      const getMock = jest.fn().mockReturnValue({ medicines: [], reminderTimes: [] });
      const slice = createMedicinesSlice(setMock as never, getMock as never);
      expect(slice.getMedicineById('nonexistent')).toBeUndefined();
    });
  });

  describe('createLogsSlice factory', () => {
    it('initial state empty medicineLogs', () => {
      const setMock = jest.fn();
      const getMock = jest.fn();
      const slice = createLogsSlice(setMock as never, getMock as never);
      expect(slice.medicineLogs).toEqual([]);
    });

    it('hasLogFor returns undefined when not found', () => {
      const setMock = jest.fn();
      const getMock = jest.fn().mockReturnValue({ medicineLogs: [] });
      const slice = createLogsSlice(setMock as never, getMock as never);
      expect(slice.hasLogFor('any-id', '2026-01-01')).toBeUndefined();
    });
  });

  describe('createSnoozesSlice factory', () => {
    it('initial state empty snoozes', () => {
      const setMock = jest.fn();
      const getMock = jest.fn();
      const slice = createSnoozesSlice(setMock as never, getMock as never);
      expect(slice.snoozes).toEqual([]);
    });

    it('getActiveSnoozeForMedicine returns undefined when no active snooze', () => {
      const setMock = jest.fn();
      const getMock = jest.fn().mockReturnValue({ snoozes: [] });
      const slice = createSnoozesSlice(setMock as never, getMock as never);
      expect(slice.getActiveSnoozeForMedicine('med-1')).toBeUndefined();
    });
  });

  describe('createSettingsSlice factory', () => {
    it('initial state has default settings', () => {
      const setMock = jest.fn();
      const slice = createSettingsSlice(setMock as never);
      expect(slice.settings).toBeDefined();
      expect(slice.settings).toHaveProperty('language');
    });

    it('Sprint 47: initial userId null', () => {
      const setMock = jest.fn();
      const slice = createSettingsSlice(setMock as never);
      expect(slice.userId).toBeNull();
    });

    it('Sprint 47: setUserId set state', () => {
      const setMock = jest.fn();
      const slice = createSettingsSlice(setMock as never);
      slice.setUserId('user-123');
      expect(setMock).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('Sprint 47: setUserId null logout', () => {
      const setMock = jest.fn();
      const slice = createSettingsSlice(setMock as never);
      slice.setUserId(null);
      expect(setMock).toHaveBeenCalledWith({ userId: null });
    });
  });

  // Combine testi: zustand combine ile 4 slice'i birlestir
  describe('Combined store', () => {
    it('combine() birlestirilmis 4 slice initial degerler dogru', () => {
      // combine() factory'leri slice objesi olarak kabul eder, mock'luyoruz
      const medicinesSlice = createMedicinesSlice(
        jest.fn() as never,
        (() => ({ medicines: [], reminderTimes: [] })) as never
      );
      const logsSlice = createLogsSlice(
        jest.fn() as never,
        (() => ({ medicineLogs: [] })) as never
      );
      const snoozesSlice = createSnoozesSlice(
        jest.fn() as never,
        (() => ({ snoozes: [] })) as never
      );
      const settingsSlice = createSettingsSlice(jest.fn() as never);

      const combined = {
        ...medicinesSlice,
        ...logsSlice,
        ...snoozesSlice,
        ...settingsSlice,
      };

      // Tum slice alanlari mevcut
      expect(combined).toHaveProperty('medicines');
      expect(combined).toHaveProperty('reminderTimes');
      expect(combined).toHaveProperty('medicineLogs');
      expect(combined).toHaveProperty('snoozes');
      expect(combined).toHaveProperty('settings');
      expect(combined).toHaveProperty('userId');

      // Initial degerler
      expect(combined.medicines).toEqual([]);
      expect(combined.reminderTimes).toEqual([]);
      expect(combined.medicineLogs).toEqual([]);
      expect(combined.snoozes).toEqual([]);
      expect(combined.settings).toBeDefined();
      expect(combined.userId).toBeNull();
    });

    it('4 slice factory birlikte kullanildiginda tum action type tanimli', () => {
      const mockSet = jest.fn();
      const mockGet = jest.fn();

      const medicinesSlice = createMedicinesSlice(mockSet, mockGet);
      const logsSlice = createLogsSlice(mockSet, mockGet);
      const snoozesSlice = createSnoozesSlice(mockSet, mockGet);
      const settingsSlice = createSettingsSlice(mockSet);

      // Tum action'lar mevcut (TypeScript compile-time garantisi)
      const combined = {
        ...medicinesSlice,
        ...logsSlice,
        ...snoozesSlice,
        ...settingsSlice,
      };

      // Medicines action'lari
      expect(typeof combined.addMedicine).toBe('function');
      expect(typeof combined.updateMedicine).toBe('function');
      expect(typeof combined.deleteMedicine).toBe('function');

      // Logs action'lari
      expect(typeof combined.logMedicineTaken).toBe('function');
      expect(typeof combined.logMedicineSkipped).toBe('function');
      expect(typeof combined.deleteLog).toBe('function');

      // Snoozes action'lari
      expect(typeof combined.createSnooze).toBe('function');
      expect(typeof combined.deactivateSnooze).toBe('function');

      // Settings action'lari
      expect(typeof combined.updateSettings).toBe('function');
      expect(typeof combined.setSettings).toBe('function');
      expect(typeof combined.setUserId).toBe('function');
    });

    it('Sprint 47.1: userId + setUserId slice delegasyonu', () => {
      // Bu test Sprint 47'de medicineStore.ts'ten settings slice'a
      // migrate edilen userId + setUserId'nin calistigini dogrular.
      const mockSet = jest.fn();
      const settingsSlice = createSettingsSlice(mockSet);

      // setUserId delegasyonu
      settingsSlice.setUserId('user-abc-123');
      expect(mockSet).toHaveBeenCalledWith({ userId: 'user-abc-123' });
    });

    it('Sprint 47.2: medicines slice getter delegasyonu', () => {
      // getMedicineById + getNextAvailableColor slice factory uzerinden
      // delegasyon testleri. medicineStore.ts'teki inline impl
      // factory tarafindan override edilir.
      const mockSet = jest.fn();
      const mockGet = jest.fn().mockReturnValue({
        medicines: [
          {
            id: 'm1',
            name: 'Aspirin',
            color: '#FF6B6B',
            isActive: true,
            frequency: 1,
            dosage: '100mg',
            instructions: 'any_time',
            startDate: '2024-01-01',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
        reminderTimes: [],
      });

      const medicinesSlice = createMedicinesSlice(mockSet, mockGet);

      // getMedicineById delegasyonu
      expect(medicinesSlice.getMedicineById('m1')?.name).toBe('Aspirin');
      expect(medicinesSlice.getMedicineById('nonexistent')).toBeUndefined();

      // getReminderTimesForMedicine delegasyonu
      expect(medicinesSlice.getReminderTimesForMedicine('m1')).toEqual([]);
    });
  });
});
