import { renderHook } from '@testing-library/react-native';

// WidgetService NativeModules.WidgetDataModule'a erisim sagliyor; test ortaminda mock'la.
jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => ({
  WidgetDataModule: { updateData: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../services/widgetService', () => ({
  updateWidgetData: jest.fn().mockResolvedValue(undefined),
}));

// Firestore sync + Firebase chain mock (config/firebase.ts Firebase initialization yapıyor)
jest.mock('../../services/firestoreSync', () => ({
  uploadAllDataToCloud: jest.fn().mockResolvedValue(undefined),
  downloadAllDataFromCloud: jest.fn().mockResolvedValue(null),
  saveMedicineToCloud: jest.fn().mockResolvedValue({}),
  deleteMedicineFromCloud: jest.fn().mockResolvedValue(undefined),
  saveMedicineLogToCloud: jest.fn().mockResolvedValue(undefined),
  syncSettingsToCloud: jest.fn().mockResolvedValue(undefined),
  deleteAllUserData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../config/firebase', () => ({
  auth: { currentUser: null, onAuthStateChanged: jest.fn(() => () => {}) },
  db: {},
  app: {},
}));
jest.mock('../../services/localMedicineImage', () => ({
  isLocalMedicineImageUri: jest.fn().mockReturnValue(false),
}));
jest.mock('../../utils/notifications', () => ({
  cancelAllNotifications: jest.fn(),
  cancelMedicineNotifications: jest.fn(),
  scheduleMedicineNotification: jest.fn(),
  scheduleSnoozeNotification: jest.fn(),
  analyzeNotificationDrift: jest.fn().mockResolvedValue({ needsUpdate: false }),
  stopAlarmVibration: jest.fn(),
}));
jest.mock('../../utils/syncQueue', () => ({
  getSyncQueue: () => ({ enqueue: (fn: () => Promise<unknown>) => fn() }),
}));
jest.mock('../../utils/syncDataValidator', () => ({
  validateSyncData: jest.fn(data => ({ success: true, data })),
}));
jest.mock('../../utils/diagnosticTelemetry', () => ({
  recordDiagnosticEvent: jest.fn(),
}));

import {
  useActiveMedicines,
  useTodayReminders,
  useMedicineStore,
} from '../../stores/medicineStore';

// NOT: Bu test Sprint 4'te (medicineStore slice mimarisi) yeniden aktif
// edilecek. Su an medicineStore.ts test ortaminda expo-constants ve Firebase
// mock zinciri gerekli — Sprint 4'te mockFactory duzenlenecek.
describe('Performance: store selectors', () => {
  beforeEach(() => {
    useMedicineStore.setState({
      medicines: [],
      reminderTimes: [],
      medicineLogs: [],
      snoozes: [],
    });
  });

  describe('useActiveMedicines', () => {
    it('returns only active medicines', () => {
      useMedicineStore.setState({
        medicines: [
          {
            id: 'med-1',
            name: 'Aktif',
            dosage: '500mg',
            frequency: 1,
            color: '#FF0000',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'med-2',
            name: 'Pasif',
            dosage: '100mg',
            frequency: 1,
            color: '#00FF00',
            isActive: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const { result } = renderHook(() => useActiveMedicines());
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('med-1');
    });

    it('returns stable reference for unchanged data (memoization)', () => {
      useMedicineStore.setState({
        medicines: [
          {
            id: 'med-1',
            name: 'Test',
            dosage: '500mg',
            frequency: 1,
            color: '#FF0000',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const { result, rerender } = renderHook(() => useActiveMedicines());
      const firstRef = result.current;
      rerender(undefined);
      const secondRef = result.current;
      expect(firstRef).toBe(secondRef);
    });
  });

  describe('useTodayReminders', () => {
    it('returns empty array when no medicines', () => {
      const { result } = renderHook(() => useTodayReminders());
      expect(result.current).toEqual([]);
    });
  });
});
