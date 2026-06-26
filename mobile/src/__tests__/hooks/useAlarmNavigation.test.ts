import { renderHook, act } from '@testing-library/react-native';
import { useAlarmNavigation } from '../../hooks/useAlarmNavigation';

describe('useAlarmNavigation hook (Sprint 5)', () => {
  let mockOptions: {
    isNavigationReady: jest.Mock;
    isMedicineValid: jest.Mock;
    isAlarmAlreadyHandled: jest.Mock;
    navigateToAlarmScreen: jest.Mock;
    dismissNotification: jest.Mock;
    cancelMedicineNotifications: jest.Mock;
    setAlarmActive: jest.Mock;
    deactivateSnooze: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOptions = {
      isNavigationReady: jest.fn(() => true),
      isMedicineValid: jest.fn(() => true),
      isAlarmAlreadyHandled: jest.fn(() => false),
      navigateToAlarmScreen: jest.fn(),
      dismissNotification: jest.fn(),
      cancelMedicineNotifications: jest.fn(),
      setAlarmActive: jest.fn(),
      deactivateSnooze: jest.fn(),
    };
  });

  describe('handleIncomingAlarm', () => {
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
      expect(mockOptions.dismissNotification).toHaveBeenCalledWith('alarm-med-1-rt-1');
      expect(mockOptions.setAlarmActive).toHaveBeenCalled();
    });

    it('skips navigation when medicine is deleted', async () => {
      mockOptions.isMedicineValid.mockReturnValue(false);
      const { result } = renderHook(() => useAlarmNavigation(mockOptions));

      await act(async () => {
        await result.current.handleIncomingAlarm({
          medicineId: 'med-deleted',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-01-15T10:00:00Z',
        });
      });

      expect(mockOptions.navigateToAlarmScreen).not.toHaveBeenCalled();
      expect(mockOptions.dismissNotification).toHaveBeenCalledWith('alarm-med-deleted-rt-1');
      expect(mockOptions.cancelMedicineNotifications).toHaveBeenCalledWith('med-deleted');
    });

    it('skips navigation when alarm already handled (taken/skipped)', async () => {
      mockOptions.isAlarmAlreadyHandled.mockReturnValue(true);
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
      expect(mockOptions.dismissNotification).toHaveBeenCalledWith('alarm-med-1-rt-1');
      expect(mockOptions.deactivateSnooze).toHaveBeenCalledWith('sn-1');
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
    it('updates pending alarm state when navigation is not ready', () => {
      // Navigation ready=false olunca pending alarm set edilir ve
      // otomatik navigate etmez — bu sayede state test edilebilir.
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