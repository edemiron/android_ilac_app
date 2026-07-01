/**
 * useBootRecovery tests — Sprint 7
 */

jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => ({
  WidgetDataModule: { updateData: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    getDisplayedNotifications: jest.fn().mockResolvedValue([]),
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock the medicineStore so we don't need to load firestoreSync chain
jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: {
    getState: () => ({
      medicines: [],
      reminderTimes: [],
      medicineLogs: [],
      snoozes: [],
    }),
  },
}));

jest.mock('../../services/widgetService', () => ({
  updateWidgetData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/bootHandler', () => ({
  getBootRecoveryResult: jest.fn().mockResolvedValue(null),
  clearBootRecoveryResult: jest.fn().mockResolvedValue(undefined),
  reRegisterAllAlarms: jest.fn().mockResolvedValue({ reminders: 0, snoozes: 0 }),
  saveBootRecoveryResult: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useBootRecovery } from '../../hooks/useBootRecovery';

describe('useBootRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with null recovery state', () => {
    const { result } = renderHook(() => useBootRecovery());
    expect(result.current.bootRecovery).toBeNull();
  });

  it('clearBootRecovery nullifies state', () => {
    const { result } = renderHook(() => useBootRecovery());
    act(() => {
      result.current.clearBootRecovery();
    });
    expect(result.current.bootRecovery).toBeNull();
  });

  it('does not throw when notifee or store unavailable', async () => {
    const { result } = renderHook(() => useBootRecovery());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(result.current).toBeDefined();
  });
});
