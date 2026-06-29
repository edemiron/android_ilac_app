import { renderHook, act } from '@testing-library/react-native';
import { format } from 'date-fns';
import { useAlarmNavigation } from '../../hooks/useAlarmNavigation';

// Mock the medicine store so the hook can read state via getState()
const mockGetState = jest.fn();

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: {
    getState: () => mockGetState(),
  },
}));

describe('useAlarmNavigation hook (Sprint 6 DRY)', () => {
  const mockMedicine = {
    id: 'med-1',
    name: 'Test Med',
    dosage: '500mg',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    isActive: true,
    color: '#FF6B6B',
  };

  const mockReminderTime = {
    id: 'rt-1',
    medicineId: 'med-1',
    time: '08:00',
    isEnabled: true,
  };

  let mockOptions: {
    isNavigationReady: jest.Mock;
    isAlarmAlreadyHandled: jest.Mock;
    navigateToAlarmScreen: jest.Mock;
    cancelMedicineNotifications: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      getMedicineById: jest.fn().mockReturnValue(mockMedicine),
      getReminderTimesForMedicine: jest.fn().mockReturnValue([mockReminderTime]),
      medicineLogs: [],
      snoozes: [],
      setAlarmActive: jest.fn(),
      deactivateSnooze: jest.fn(),
    });

    mockOptions = {
      isNavigationReady: jest.fn(() => true),
      isAlarmAlreadyHandled: jest.fn(() => false),
      navigateToAlarmScreen: jest.fn(),
      cancelMedicineNotifications: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('handleIncomingAlarm (delegates to pure function)', () => {
    it('navigates to alarm screen when medicine is valid and alarm is unhandled', async () => {
      const { result } = renderHook(() => useAlarmNavigation(mockOptions));

      await act(async () => {
        await result.current.handleIncomingAlarm({
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-01-15T10:00:00Z',
        });
      });

      expect(mockOptions.navigateToAlarmScreen).toHaveBeenCalledTimes(1);
      expect(mockOptions.isAlarmAlreadyHandled).toHaveBeenCalled();
    });

    it('skips navigation when medicine is deleted', async () => {
      // Mock: getMedicineById returns undefined → medicine missing → dismissed
      mockGetState.mockReturnValue({
        getMedicineById: jest.fn().mockReturnValue(undefined),
        getReminderTimesForMedicine: jest.fn().mockReturnValue([]),
        medicineLogs: [],
        snoozes: [],
        setAlarmActive: jest.fn(),
        deactivateSnooze: jest.fn(),
      });

      const { result } = renderHook(() => useAlarmNavigation(mockOptions));

      await act(async () => {
        await result.current.handleIncomingAlarm({
          medicineId: 'med-deleted',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-01-15T10:00:00Z',
        });
      });

      expect(mockOptions.navigateToAlarmScreen).not.toHaveBeenCalled();
      expect(mockOptions.cancelMedicineNotifications).toHaveBeenCalledWith('med-deleted');
    });

    it('skips navigation when alarm already handled (taken/skipped)', async () => {
      mockOptions.isAlarmAlreadyHandled.mockResolvedValue(true);

      const { result } = renderHook(() => useAlarmNavigation(mockOptions));

      await act(async () => {
        await result.current.handleIncomingAlarm({
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-01-15T10:00:00Z',
          isSnooze: 'true',
          snoozeId: 'sn-1',
        });
      });

      expect(mockOptions.navigateToAlarmScreen).not.toHaveBeenCalled();
      // NOTE: pure function returns 'handled' for already-handled alarms
      // WITHOUT calling deactivateSnooze (only 'dismissed' branch does).
      // This is a bug fix from Sprint 5's behavior — 'handled' means
      // alarm already resolved and no further action needed.
    });

    it('skips navigation when alarm already logged for today (bug fix)', async () => {
      // Bug fix: hook artık hasAlarmBeenLoggedToday kontrolünü pure
      // function üzerinden yapar (önce yapmıyordu). Test için scheduledTime
      // bugünün tarihini kullanmalı (hasAlarmBeenLoggedToday gün-precision kontrol eder).
      // date-fns format() local timezone kullanır — UTC değil.
      const todayLocal = format(new Date(), 'yyyy-MM-dd');
      const todayScheduled = `${todayLocal}T12:00:00Z`;
      mockGetState.mockReturnValue({
        getMedicineById: jest.fn().mockReturnValue(mockMedicine),
        getReminderTimesForMedicine: jest.fn().mockReturnValue([mockReminderTime]),
        medicineLogs: [
          {
            id: 'log-1',
            medicineId: 'med-1',
            reminderTimeId: 'rt-1',
            scheduledTime: todayScheduled,
            status: 'taken',
            takenAt: todayScheduled,
          },
        ],
        snoozes: [
          {
            id: 'sn-1',
            medicineId: 'med-1',
            reminderTimeId: 'rt-1',
            originalScheduledTime: todayScheduled,
            triggerTime: todayScheduled,
            isActive: true,
            createdAt: todayScheduled,
            notificationId: 'notif-1',
            snoozeCount: 1,
          },
        ],
        setAlarmActive: jest.fn(),
        deactivateSnooze: jest.fn(),
      });

      const { result } = renderHook(() => useAlarmNavigation(mockOptions));

      await act(async () => {
        await result.current.handleIncomingAlarm({
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: todayScheduled,
          isSnooze: 'true',
          snoozeId: 'sn-1',
        });
      });

      expect(mockOptions.navigateToAlarmScreen).not.toHaveBeenCalled();
      // Bug fix: bugün loglanmış snooze deactivate edilir
      const mockStore = mockGetState.mock.results[0].value;
      expect(mockStore.deactivateSnooze).toHaveBeenCalledWith('sn-1');
    });

    it('deduplicates within 60-second window', async () => {
      const { result } = renderHook(() => useAlarmNavigation(mockOptions));
      const alarmData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-01-15T10:00:00Z',
      };

      // Use fake timers
      jest.useFakeTimers();
      const fakeNow = new Date('2024-01-15T10:00:00Z');
      jest.setSystemTime(fakeNow);

      await act(async () => {
        await result.current.handleIncomingAlarm(alarmData);
      });
      expect(mockOptions.navigateToAlarmScreen).toHaveBeenCalledTimes(1);

      // Same alarm within window — should be skipped
      await act(async () => {
        await result.current.handleIncomingAlarm(alarmData);
      });
      expect(mockOptions.navigateToAlarmScreen).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('sets pending alarm when navigation not ready', async () => {
      mockOptions.isNavigationReady.mockReturnValue(false);

      const { result } = renderHook(() => useAlarmNavigation(mockOptions));

      await act(async () => {
        await result.current.handleIncomingAlarm({
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-01-15T10:00:00Z',
        });
      });

      expect(result.current.pendingAlarm).toEqual({
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-01-15T10:00:00Z',
      });
      expect(mockOptions.navigateToAlarmScreen).not.toHaveBeenCalled();
    });
  });

  describe('setPendingAlarm', () => {
    it('updates pending alarm state', () => {
      mockOptions.isNavigationReady.mockReturnValue(false);
      const { result } = renderHook(() => useAlarmNavigation(mockOptions));

      act(() => {
        result.current.setPendingAlarm({
          medicineId: 'med-2',
          reminderTimeId: 'rt-2',
          scheduledTime: '2024-01-15T11:00:00Z',
        });
      });

      expect(result.current.pendingAlarm?.medicineId).toBe('med-2');
    });
  });
});
